/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2025 Shomy
*/

use crate::services::antumbra::{get_antumbra_updatable_path, get_existing_antumbra_path};
use crate::services::config::{load_settings, save_settings};
use anyhow::{Context, Result};
use log::warn;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::io::Write as StdWrite;
use std::path::Path;
use std::time::{Duration, Instant};
use tauri::AppHandle;
use tauri::Emitter;
use tokio::fs::File;
use tokio::io::{AsyncWriteExt, BufWriter};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AntumbraUpdateInfo {
    pub installed_version: Option<String>,
    pub installed_path: Option<String>,
    pub latest_version: Option<String>,
    pub update_available: bool,
    pub supported: bool,
    pub asset_name: Option<String>,
    pub asset_url: Option<String>,
    pub checksum: Option<String>,
    pub message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AntumbraUpdateResult {
    pub version: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct DownloadProgress {
    pub bytes_downloaded: u64,
    pub total_bytes: u64,
    pub percentage: f32,
    pub status: String,
    pub attempt: u32,
    pub max_attempts: u32,
    pub message: String,
}

impl DownloadProgress {
    pub fn emit(&self, app: &AppHandle) {
        let _ = app.emit("antumbra-download-progress", self);
    }
}

#[derive(Debug, Deserialize, Clone)]
struct ReleaseAsset {
    name: String,
    browser_download_url: String,
}

#[derive(Debug, Deserialize)]
struct ReleaseInfo {
    tag_name: String,
    assets: Vec<ReleaseAsset>,
}

pub async fn check_for_updates(app: &AppHandle) -> Result<AntumbraUpdateInfo> {
    let installed_path = get_existing_antumbra_path(app)?;
    
    // Try to get version from config first
    let installed_version = match load_settings() {
        Ok(settings) => settings.antumbra_version,
        Err(_) => None,
    };
    
    // If no version in config but binary exists, run --version once and save it
    let installed_version = if installed_version.is_none() && installed_path.is_some() {
        match get_installed_version(app).await {
            Ok(version) => {
                // Try to save this version to config for future checks
                if let Ok(mut settings) = load_settings() {
                    settings.antumbra_version = Some(version.clone());
                    let _ = save_settings(&settings);
                }
                Some(version)
            }
            Err(_) => None,
        }
    } else {
        installed_version
    };
    
    let installed_checksum = match &installed_path {
        Some(path) => compute_file_checksum(path).ok(),
        None => None,
    };
    let latest = fetch_latest_release().await;

    match latest {
        Ok(release) => {
            let (asset_name, asset_url, checksum) = match find_asset_and_checksum(&release).await {
                Ok(info) => info,
                Err(err) => {
                    return Ok(AntumbraUpdateInfo {
                        installed_version,
                        installed_path: installed_path
                            .as_ref()
                            .map(|path| path.display().to_string()),
                        latest_version: Some(release.tag_name),
                        update_available: false,
                        supported: false,
                        asset_name: None,
                        asset_url: None,
                        checksum: None,
                        message: Some(err.to_string()),
                    });
                }
            };

            let latest_version = normalize_version(&release.tag_name);
            let update_available = match (&installed_path, &installed_version, &latest_version) {
                (None, _, _) => true,
                (Some(_), None, Some(latest)) => {
                    // Config version is None, but we have binary - try to detect version
                    if let Ok(detected_version) = get_installed_version(app).await {
                        normalize_version(&detected_version).as_deref() != Some(latest)
                    } else {
                        log::warn!("Binary exists but version detection failed, assuming update needed");
                        true
                    }
                }
                (Some(_), Some(installed), Some(latest)) => {
                    if let (Some(installed_checksum), Some(expected_checksum)) =
                        (installed_checksum.as_deref(), Some(checksum.as_str()))
                    {
                        installed_checksum != expected_checksum
                    } else if normalize_version(installed).as_deref() != Some(latest) {
                        true
                    } else {
                        false
                    }
                }
                (Some(_), Some(installed), None) => {
                    // We have an installed version but no normalized latest version
                    installed.trim() != release.tag_name.trim()
                }
                (Some(_), _, _) => {
                    // Default case - if we have binary but version detection fails, assume update needed
                    log::warn!("Version comparison failed, assuming update needed for safety");
                    true
                }
            };

            Ok(AntumbraUpdateInfo {
                installed_version,
                installed_path: installed_path.as_ref().map(|path| path.display().to_string()),
                latest_version: latest_version.or(Some(release.tag_name)),
                update_available,
                supported: true,
                asset_name: Some(asset_name),
                asset_url: Some(asset_url),
                checksum: Some(checksum),
                message: None,
            })
        }
        Err(err) => Ok(AntumbraUpdateInfo {
            installed_version,
            installed_path: installed_path.as_ref().map(|path| path.display().to_string()),
            latest_version: None,
            update_available: false,
            supported: false,
            asset_name: None,
            asset_url: None,
            checksum: None,
            message: Some(err.to_string()),
        }),
    }
}

pub async fn download_and_install(app: &AppHandle) -> Result<AntumbraUpdateResult> {
    download_and_install_with_progress(app).await
}

pub async fn download_and_install_with_progress(app: &AppHandle) -> Result<AntumbraUpdateResult> {
    // Fetch release info
    emit_progress(app, "fetching", 0, 0, 1, 3, "Fetching release information...");
    let release = fetch_latest_release().await?;
    let (asset_name, asset_url, checksum) = find_asset_and_checksum(&release).await?;
    
    let target_path = get_antumbra_updatable_path(app)?;
    if let Some(parent) = target_path.parent() {
        fs::create_dir_all(parent).context("Failed to create antumbra bin directory")?;
    }

    // Download directly to temp file with retry logic and progress
    let temp_path = target_path.with_extension("download");
    download_file_with_retry_and_progress(app, &asset_url, &temp_path, &checksum).await?;

    // Replace the old binary with the new one
    emit_progress(app, "replacing", 0, 0, 1, 3, "Replacing binary...");
    safe_replace_binary(&target_path, &temp_path).await?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(&target_path)?.permissions();
        perms.set_mode(0o755);
        fs::set_permissions(&target_path, perms)?;
    }

    // Save the new version to config
    if let Ok(mut settings) = load_settings() {
        settings.antumbra_version = Some(release.tag_name.clone());
        if let Err(e) = save_settings(&settings) {
            warn!("Failed to save antumbra version to config: {}", e);
        }
    }

    emit_progress(app, "completed", 0, 0, 1, 3, "Update completed successfully!");
    Ok(AntumbraUpdateResult { version: release.tag_name, path: target_path.display().to_string() })
}

fn emit_progress(app: &AppHandle, status: &str, bytes: u64, total: u64, attempt: u32, max: u32, message: &str) {
    let percentage = if total > 0 {
        (bytes as f32 / total as f32) * 100.0
    } else {
        0.0
    };
    
    DownloadProgress {
        bytes_downloaded: bytes,
        total_bytes: total,
        percentage,
        status: status.to_string(),
        attempt,
        max_attempts: max,
        message: message.to_string(),
    }.emit(app);
}

async fn download_file_with_retry_and_progress(
    app: &AppHandle,
    url: &str,
    temp_path: &Path,
    expected_checksum: &str,
) -> Result<()> {
    const MAX_RETRIES: u32 = 3;
    
    for attempt in 1..=MAX_RETRIES {
        emit_progress(app, "downloading", 0, 0, attempt, MAX_RETRIES, 
            &format!("Download attempt {}/{}...", attempt, MAX_RETRIES));
        
        // Clean temp file before attempt
        if temp_path.exists() {
            let _ = fs::remove_file(temp_path);
        }
        
        // Try async streaming first (primary method)
        log::info!("Download attempt {}/{}: Trying async streaming method...", attempt, MAX_RETRIES);
        match try_download_async_streaming(app, url, temp_path).await {
            Ok(total_bytes) => {
                emit_progress(app, "verifying", total_bytes, total_bytes, attempt, MAX_RETRIES, 
                    "Verifying download checksum...");
                
                if verify_file_checksum(temp_path, expected_checksum)? {
                    emit_progress(app, "completed", total_bytes, total_bytes, attempt, MAX_RETRIES, 
                        "Download successful and verified!");
                    return Ok(());
                } else {
                    log::warn!("Checksum mismatch on attempt {}", attempt);
                    cleanup_temp_file(temp_path);
                    
                    if attempt < MAX_RETRIES {
                        let delay = attempt as u64 * 1000;
                        emit_progress(app, "retrying", 0, 0, attempt, MAX_RETRIES, 
                            &format!("Checksum mismatch. Retrying in {}s...", delay / 1000));
                        tokio::time::sleep(Duration::from_millis(delay)).await;
                        continue;
                    }
                }
            }
            Err(e) => {
                log::error!("Async download failed: {}", e);
                cleanup_temp_file(temp_path);
                
                // Fallback 1: Try blocking reqwest
                if attempt == MAX_RETRIES {
                    log::info!("Attempting blocking download fallback...");
                    emit_progress(app, "fallback_blocking", 0, 0, attempt, MAX_RETRIES, 
                        "Trying alternative download method...");
                    
                    match try_download_blocking(url, temp_path) {
                        Ok(()) => {
                            if verify_file_checksum(temp_path, expected_checksum)? {
                                emit_progress(app, "completed", 0, 0, attempt, MAX_RETRIES, 
                                    "Download successful!");
                                return Ok(());
                            }
                        }
                        Err(e) => {
                            log::error!("Blocking download failed: {}", e);
                            cleanup_temp_file(temp_path);
                            
                            // Fallback 2: Try system commands
                            #[cfg(unix)]
                            {
                                log::info!("Attempting curl fallback...");
                                emit_progress(app, "fallback_curl", 0, 0, attempt, MAX_RETRIES, 
                                    "Trying system download...");
                                
                                if try_download_curl(url, temp_path).is_ok() 
                                    && verify_file_checksum(temp_path, expected_checksum)? 
                                {
                                    emit_progress(app, "completed", 0, 0, attempt, MAX_RETRIES, 
                                        "Download successful!");
                                    return Ok(());
                                }
                            }
                            
                            #[cfg(windows)]
                            {
                                log::info!("Attempting PowerShell fallback...");
                                emit_progress(app, "fallback_powershell", 0, 0, attempt, MAX_RETRIES, 
                                    "Trying system download...");
                                
                                if try_download_powershell(url, temp_path).is_ok()
                                    && verify_file_checksum(temp_path, expected_checksum)?
                                {
                                    emit_progress(app, "completed", 0, 0, attempt, MAX_RETRIES, 
                                        "Download successful!");
                                    return Ok(());
                                }
                            }
                        }
                    }
                }
                
                if attempt < MAX_RETRIES {
                    let delay = attempt as u64 * 2000; // 2s, 4s
                    emit_progress(app, "retrying", 0, 0, attempt, MAX_RETRIES, 
                        &format!("Download failed. Retrying in {}s...", delay / 1000));
                    tokio::time::sleep(Duration::from_millis(delay)).await;
                }
            }
        }
    }
    
    Err(anyhow::anyhow!("Failed to download after {} attempts and all fallbacks", MAX_RETRIES))
}

async fn try_download_async_streaming(app: &AppHandle, url: &str, temp_path: &Path) -> Result<u64> {
    use futures_util::StreamExt;
    
    // Client with proper configuration for streaming
    let client = reqwest::Client::builder()
        .read_timeout(Duration::from_secs(30))        // Per-read timeout (CRITICAL!)
        .connect_timeout(Duration::from_secs(10))     // Connection timeout
        .redirect(reqwest::redirect::Policy::limited(10)) // Follow redirects
        .build()
        .context("Failed to create HTTP client")?;
    
    log::info!("Starting async download from: {}", url);
    
    let response = client
        .get(url)
        .header("User-Agent", "penumbra-wrapper/1.0")
        .header("Accept", "application/octet-stream")   // Required for GitHub
        .send()
        .await
        .context("Failed to send download request")?;
    
    let status = response.status();
    if !status.is_success() {
        return Err(anyhow::anyhow!("HTTP error {}: {}", status, status.canonical_reason().unwrap_or("Unknown")));
    }
    
    let total_bytes = response.content_length().unwrap_or(0);
    log::info!("Content-Length: {} bytes ({:.2} MB)", total_bytes, total_bytes as f64 / 1_048_576.0);
    
    // Create file with 64KB buffer (optimal for 1-2MB files on Windows)
    let file = File::create(temp_path)
        .await
        .context("Failed to create temp file")?;
    let mut writer = BufWriter::with_capacity(64 * 1024, file);
    
    let mut stream = response.bytes_stream();
    let mut downloaded: u64 = 0;
    let mut last_progress_emit = Instant::now();
    
    loop {
        // CRITICAL: Per-chunk timeout to detect hangs
        match tokio::time::timeout(Duration::from_secs(30), stream.next()).await {
            Ok(Some(Ok(chunk))) => {
                writer.write_all(&chunk).await.context("Failed to write chunk")?;
                downloaded += chunk.len() as u64;
                
                // Emit progress every 100ms or every 256KB
                let now = Instant::now();
                if now.duration_since(last_progress_emit).as_millis() > 100 
                    || downloaded % 262_144 == 0 
                {
                    let percentage = if total_bytes > 0 {
                        (downloaded as f32 / total_bytes as f32) * 100.0
                    } else {
                        0.0
                    };
                    
                    emit_progress(app, "downloading", downloaded, total_bytes, 1, 3, 
                        &format!("Downloading... {:.1}%", percentage));
                    last_progress_emit = now;
                }
            }
            Ok(Some(Err(e))) => {
                return Err(anyhow::anyhow!("Stream error: {}", e));
            }
            Ok(None) => {
                log::info!("Download stream completed");
                break;
            }
            Err(_) => {
                return Err(anyhow::anyhow!("Download stalled - no data received for 30 seconds"));
            }
        }
    }
    
    // Final flush to ensure all data is written
    writer.flush().await.context("Failed to flush file")?;
    drop(writer);
    
    log::info!("Downloaded {} bytes successfully", downloaded);
    Ok(downloaded)
}

fn try_download_blocking(url: &str, temp_path: &Path) -> Result<()> {
    log::info!("Using blocking reqwest for download");
    
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(60))  // Total timeout for small files
        .connect_timeout(Duration::from_secs(10))
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()?;
    
    let mut response = client
        .get(url)
        .header("User-Agent", "penumbra-wrapper/1.0")
        .header("Accept", "application/octet-stream")
        .send()?;
    
    if !response.status().is_success() {
        return Err(anyhow::anyhow!("HTTP error: {}", response.status()));
    }
    
    // Use BufWriter for efficient I/O
    let file = std::fs::File::create(temp_path)?;
    let mut writer = std::io::BufWriter::with_capacity(64 * 1024, file);
    
    std::io::copy(&mut response, &mut writer)?;
    writer.flush()?;
    
    log::info!("Blocking download completed");
    Ok(())
}

#[cfg(windows)]
fn try_download_powershell(url: &str, temp_path: &Path) -> Result<()> {
    log::info!("Using PowerShell for download");
    
    let output = std::process::Command::new("powershell")
        .args(&[
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            &format!(
                "Invoke-WebRequest -Uri '{}' -OutFile '{}' -UseBasicParsing",
                url,
                temp_path.display()
            ),
        ])
        .output()?;
    
    if output.status.success() {
        Ok(())
    } else {
        Err(anyhow::anyhow!("PowerShell download failed: {}", String::from_utf8_lossy(&output.stderr)))
    }
}

#[cfg(unix)]
fn try_download_curl(url: &str, temp_path: &Path) -> Result<()> {
    log::info!("Using curl for download");
    
    let output = std::process::Command::new("curl")
        .args(&[
            "-L",  // Follow redirects
            "-o", temp_path.to_str().unwrap(),
            "--max-time", "60",
            "--retry", "2",
            url,
        ])
        .output()?;
    
    if output.status.success() {
        Ok(())
    } else {
        Err(anyhow::anyhow!("curl download failed: {}", String::from_utf8_lossy(&output.stderr)))
    }
}

fn cleanup_temp_file(temp_path: &Path) {
    if temp_path.exists() {
        if let Err(e) = fs::remove_file(temp_path) {
            log::warn!("Failed to remove temp file {:?}: {}", temp_path, e);
        }
    }
}

fn verify_file_checksum(path: &Path, expected: &str) -> Result<bool> {
    let actual = compute_file_checksum(path)?;
    let matches = actual.to_lowercase() == expected.trim().to_lowercase();
    
    if !matches {
        log::error!("Checksum mismatch: expected {}, got {}", expected, actual);
    }
    
    Ok(matches)
}

/// Safely replace binary with Windows-specific handling for file locks and atomic operations
async fn safe_replace_binary(target_path: &Path, temp_path: &Path) -> Result<()> {
    log::info!("Starting safe binary replacement: {:?} -> {:?}", temp_path, target_path);

    // Atomic replacement with Windows-specific retry logic
    #[cfg(windows)]
    {
        replace_binary_with_retry(temp_path, target_path).await?;
    }
    #[cfg(not(windows))]
    {
        fs::rename(temp_path, target_path)
            .context("Failed to replace antumbra binary")?;
    }

    log::info!("Successfully replaced antumbra binary");
    Ok(())
}

#[cfg(windows)]
async fn replace_binary_with_retry(temp_path: &Path, target_path: &Path) -> Result<()> {
    use tokio::time::sleep;
    
    for attempt in 0..5 {
        match fs::rename(temp_path, target_path) {
            Ok(_) => {
                return Ok(());
            }
            Err(e) => {
                // Check if it's a file sharing violation (ERROR_SHARING_VIOLATION = 32)
                if let Some(raw_error) = e.raw_os_error() {
                    if raw_error == 32 && attempt < 4 {
                        log::warn!("File locked (attempt {}/5), retrying in 2 seconds...", attempt + 1);
                        
                        // Try to kill any running antumbra process
                        if let Err(kill_err) = crate::services::antumbra::kill_current_process() {
                            log::warn!("Failed to kill antumbra process: {}", kill_err);
                        }
                        
                        // Properly await the sleep
                        sleep(Duration::from_secs(2)).await;
                        continue;
                    } else if raw_error == 5 {
                        // ERROR_ACCESS_DENIED
                        return Err(anyhow::anyhow!("Access denied when replacing antumbra binary. Please run as Administrator or check antivirus software."));
                    }
                }
                
                // Log the error with Windows-specific context
                log::error!("Failed to replace binary (attempt {}/5): {}", attempt + 1, e);
                
                if attempt < 4 {
                    // Properly await the sleep
                    sleep(Duration::from_millis(1000)).await;
                    continue;
                } else {
                    return Err(anyhow::anyhow!("Failed to replace antumbra binary after 5 attempts: {}. Is antumbra.exe currently running?", e));
                }
            }
        }
    }
    unreachable!()
}

async fn fetch_latest_release() -> Result<ReleaseInfo> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://api.github.com/repos/rdndds/penumbra/releases/latest")
        .header("User-Agent", "penumbra-wrapper")
        .send()
        .await
        .context("Failed to fetch latest release")?;

    let release = response
        .error_for_status()
        .context("GitHub API returned an error status")?
        .json::<ReleaseInfo>()
        .await
        .context("Failed to parse release JSON")?;

    Ok(release)
}

async fn find_asset_and_checksum(release: &ReleaseInfo) -> Result<(String, String, String)> {
    let asset_name = select_asset_name()?;
    let asset = release.assets.iter().find(|asset| asset.name == asset_name).cloned();

    let asset = asset.context("Matching antumbra release asset not found")?;

    let checksum_asset = release
        .assets
        .iter()
        .find(|asset| asset.name == "checksums.txt")
        .cloned()
        .context("checksums.txt asset not found")?;

    let checksum_text = download_bytes(&checksum_asset.browser_download_url).await?;
    let checksum_str =
        String::from_utf8(checksum_text).context("checksums.txt was not valid UTF-8")?;
    
    log::debug!("Checksums.txt content:\n{}", checksum_str);
    
    let checksum = parse_checksum(&checksum_str, &asset_name)
        .context("Checksum for release asset not found")?;
    
    log::info!("Found checksum for {}: {}", asset_name, checksum);

    Ok((asset.name, asset.browser_download_url, checksum))
}

fn select_asset_name() -> Result<String> {
    if cfg!(target_os = "linux") && cfg!(target_arch = "x86_64") {
        Ok("antumbra-linux-x86_64".to_string())
    } else if cfg!(target_os = "windows") && cfg!(target_arch = "x86_64") {
        Ok("antumbra.exe".to_string())
    } else if cfg!(target_os = "macos") {
        anyhow::bail!("Antumbra updates are not available for macOS yet")
    } else {
        anyhow::bail!("Antumbra updates are not available for this platform")
    }
}

async fn download_bytes(url: &str) -> Result<Vec<u8>> {
    let client = reqwest::Client::new();
    let response = client
        .get(url)
        .header("User-Agent", "penumbra-wrapper")
        .send()
        .await
        .context("Failed to download update asset")?;

    let bytes = response
        .error_for_status()
        .context("Failed to download update asset")?
        .bytes()
        .await
        .context("Failed to read update response")?;

    Ok(bytes.to_vec())
}

fn compute_file_checksum(path: &Path) -> Result<String> {
    let data = fs::read(path).context("Failed to read antumbra binary for checksum")?;
    let mut hasher = Sha256::new();
    hasher.update(&data);
    let digest = hasher.finalize();
    Ok(hex::encode(digest))
}

fn parse_checksum(contents: &str, asset_name: &str) -> Option<String> {
    log::debug!("Parsing checksums.txt for asset: {}", asset_name);
    
    for (line_num, line) in contents.lines().enumerate() {
        let trimmed = line.trim();
        
        // Phase 1: Skip empty lines and comments (lines starting with #)
        if trimmed.is_empty() || trimmed.starts_with('#') {
            log::trace!("Line {}: Skipping empty/comment line", line_num + 1);
            continue;
        }
        
        log::trace!("Line {}: Checking: {}", line_num + 1, trimmed);
        
        // Try to extract hash and filename
        let (hash, name) = if let Some(result) = try_parse_bsd_format(trimmed) {
            // Phase 3: BSD-style format: SHA256(filename)= hash
            log::trace!("Line {}: Parsed as BSD format", line_num + 1);
            result
        } else if let Some(result) = try_parse_standard_format(trimmed) {
            // Standard format: HASH  FILENAME
            log::trace!("Line {}: Parsed as standard format", line_num + 1);
            result
        } else {
            log::trace!("Line {}: Could not parse line format", line_num + 1);
            continue;
        };
        
        // Phase 4: Validate checksum format (must be 64 hex characters for SHA256)
        if !is_valid_sha256(&hash) {
            log::warn!("Line {}: Invalid SHA256 hash format: {}", line_num + 1, hash);
            continue;
        }
        
        if name == asset_name {
            log::debug!("Found matching checksum for {}: {}", asset_name, hash);
            return Some(hash);
        }
    }
    
    log::warn!("No checksum found for asset: {}", asset_name);
    None
}

/// Parse standard format: "HASH  FILENAME"
fn try_parse_standard_format(line: &str) -> Option<(String, String)> {
    let mut parts = line.split_whitespace();
    let hash = parts.next()?.to_string();
    let name = parts.next()?.to_string();
    
    // Ensure no more parts (hash should not contain spaces)
    if parts.next().is_some() {
        return None;
    }
    
    Some((hash, name))
}

/// Parse BSD-style format: "SHA256(filename)= hash"
fn try_parse_bsd_format(line: &str) -> Option<(String, String)> {
    // Format: ALGORITHM(filename)= hash
    if !line.contains('=') || !line.contains('(') || !line.contains(')') {
        return None;
    }
    
    let name_start = line.find('(')? + 1;
    let name_end = line.find(')')?;
    let name = line.get(name_start..name_end)?.to_string();
    
    // Extract hash after '='
    let hash = line.split('=').last()?.trim().to_string();
    
    Some((hash, name))
}

/// Phase 4: Validate SHA256 hash format (64 hex characters)
fn is_valid_sha256(hash: &str) -> bool {
    hash.len() == 64 && hash.chars().all(|c| c.is_ascii_hexdigit())
}

pub async fn get_installed_version(app: &AppHandle) -> Result<String> {
    if let Some(path) = get_existing_antumbra_path(app)? {
        log::info!("Getting version from antumbra binary at: {:?}", path);
        
        let output = std::process::Command::new(path)
            .arg("--version")
            .output()
            .context("Failed to execute antumbra for version check")?;

        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if stdout.is_empty() {
            anyhow::bail!("Antumbra returned an empty version string")
        }
        
        log::info!("Detected antumbra version: {}", stdout);
        
        // Also sync this version to config if needed
        if let Err(sync_err) = crate::services::antumbra::sync_detected_version_to_config(app, &stdout) {
            log::warn!("Failed to sync detected version to config: {}", sync_err);
        }
        
        return Ok(stdout);
    }

    anyhow::bail!("Antumbra binary not found")
}

fn normalize_version(version: &str) -> Option<String> {
    let token = version.split_whitespace().find(|part| part.chars().any(|c| c.is_ascii_digit()))?;
    Some(token.trim_start_matches('v').to_string())
}
