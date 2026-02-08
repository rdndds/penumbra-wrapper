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
                (Some(_), _, _) => {
                    if let (Some(installed_checksum), Some(expected_checksum)) =
                        (installed_checksum.as_deref(), Some(checksum.as_str()))
                    {
                        installed_checksum != expected_checksum
                    } else if let (Some(installed), Some(latest_version)) =
                        (installed_version.as_deref(), latest_version.as_deref())
                    {
                        normalize_version(installed).as_deref() != Some(latest_version)
                    } else if let Some(installed) = installed_version.as_deref() {
                        installed.trim() != release.tag_name.trim()
                    } else {
                        true
                    }
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

    if target_path.exists() {
        fs::remove_file(&target_path).context("Failed to remove existing antumbra binary")?;
    }

    fs::write(&target_path, &binary_bytes).context("Failed to write antumbra binary")?;

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

async fn get_installed_version(app: &AppHandle) -> Result<String> {
    if let Some(path) = get_existing_antumbra_path(app)? {
        let output = std::process::Command::new(path)
            .arg("--version")
            .output()
            .context("Failed to execute antumbra for version check")?;

        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if stdout.is_empty() {
            anyhow::bail!("Antumbra returned an empty version string")
        }
        return Ok(stdout);
    }

    anyhow::bail!("Antumbra binary not found")
}

fn normalize_version(version: &str) -> Option<String> {
    let token = version.split_whitespace().find(|part| part.chars().any(|c| c.is_ascii_digit()))?;
    Some(token.trim_start_matches('v').to_string())
}
