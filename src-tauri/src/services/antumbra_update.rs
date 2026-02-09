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
use std::path::Path;
use tauri::AppHandle;

#[derive(Debug, Serialize, Deserialize)]
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
    let release = fetch_latest_release().await?;
    let (_asset_name, asset_url, checksum) = find_asset_and_checksum(&release).await?;

    let binary_bytes = download_bytes(&asset_url).await?;
    verify_checksum(&binary_bytes, &checksum)?;

    let target_path = get_antumbra_updatable_path(app)?;
    if let Some(parent) = target_path.parent() {
        fs::create_dir_all(parent).context("Failed to create antumbra bin directory")?;
    }

    safe_replace_binary(&target_path, &binary_bytes, &checksum).await?;

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

    Ok(AntumbraUpdateResult { version: release.tag_name, path: target_path.display().to_string() })
}

/// Safely replace binary with Windows-specific handling for file locks and atomic operations
async fn safe_replace_binary(target_path: &Path, new_binary: &[u8], expected_checksum: &str) -> Result<()> {
    let temp_path = target_path.with_extension("tmp");
    
    log::info!("Starting safe binary replacement: {:?} -> {:?}", temp_path, target_path);
    
    // Clean up any existing temporary file
    if temp_path.exists() {
        if let Err(e) = fs::remove_file(&temp_path) {
            log::warn!("Failed to remove existing temp file {:?}: {}", temp_path, e);
        }
    }

    // Write new binary to temporary file first
    fs::write(&temp_path, new_binary)
        .context("Failed to write antumbra binary to temporary file")?;
    
    // Verify checksum of temporary file
    let temp_checksum = compute_file_checksum(&temp_path)?;
    if temp_checksum.to_lowercase() != expected_checksum.trim().to_lowercase() {
        fs::remove_file(&temp_path)?;
        anyhow::bail!("Checksum verification failed for temporary binary");
    }

    // Atomic replacement with Windows-specific retry logic
    #[cfg(windows)]
    {
        replace_binary_with_retry(&temp_path, target_path)?;
    }
    #[cfg(not(windows))]
    {
        fs::rename(&temp_path, target_path)
            .context("Failed to replace antumbra binary")?;
    }

    log::info!("Successfully replaced antumbra binary");
    Ok(())
}

#[cfg(windows)]
fn replace_binary_with_retry(temp_path: &Path, target_path: &Path) -> Result<()> {
    use std::time::Duration;
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
                        
                        tokio::spawn(async {
                            sleep(Duration::from_secs(2)).await;
                        });
                        continue;
                    } else if raw_error == 5 {
                        // ERROR_ACCESS_DENIED
                        return Err(anyhow::anyhow!("Access denied when replacing antumbra binary. Please run as Administrator or check antivirus software."));
                    }
                }
                
                // Log the error with Windows-specific context
                log::error!("Failed to replace binary (attempt {}/5): {}", attempt + 1, e);
                
                if attempt < 4 {
                    tokio::spawn(async {
                        sleep(Duration::from_millis(1000)).await;
                    });
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
    let checksum = parse_checksum(&checksum_str, &asset_name)
        .context("Checksum for release asset not found")?;

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

fn verify_checksum(bytes: &[u8], expected: &str) -> Result<()> {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let digest = hasher.finalize();
    let actual = hex::encode(digest);

    if actual.to_lowercase() != expected.trim().to_lowercase() {
        anyhow::bail!("Checksum mismatch (expected {}, got {})", expected, actual)
    }

    Ok(())
}

fn compute_file_checksum(path: &Path) -> Result<String> {
    let data = fs::read(path).context("Failed to read antumbra binary for checksum")?;
    let mut hasher = Sha256::new();
    hasher.update(&data);
    let digest = hasher.finalize();
    Ok(hex::encode(digest))
}

fn parse_checksum(contents: &str, asset_name: &str) -> Option<String> {
    for line in contents.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        if trimmed.contains('=') && trimmed.contains('(') && trimmed.contains(')') {
            let name_start = trimmed.find('(')? + 1;
            let name_end = trimmed.find(')')?;
            let name = trimmed.get(name_start..name_end)?;
            let hash = trimmed.split('=').last()?.trim();
            if name == asset_name {
                return Some(hash.to_string());
            }
        } else {
            let mut parts = trimmed.split_whitespace();
            let hash = parts.next()?;
            let name = parts.next()?;
            if name == asset_name {
                return Some(hash.to_string());
            }
        }
    }

    None
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
