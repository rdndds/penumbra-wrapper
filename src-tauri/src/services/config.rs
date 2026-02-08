/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2025 Shomy
*/

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    #[serde(default)]
    pub da_path: Option<String>,
    #[serde(default)]
    pub preloader_path: Option<String>,
    #[serde(default)]
    pub default_output_path: Option<String>,
    #[serde(default)]
    pub auto_check_updates: bool,
    #[serde(default)]
    pub antumbra_version: Option<String>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            da_path: None,
            preloader_path: None,
            default_output_path: None,
            auto_check_updates: true,
            antumbra_version: None,
        }
    }
}

pub fn load_settings() -> Result<AppSettings> {
    let config_path = get_config_path()?;

    if !config_path.exists() {
        return Ok(AppSettings::default());
    }

    let contents = std::fs::read_to_string(&config_path)?;
    let settings: AppSettings = serde_json::from_str(&contents)?;
    Ok(settings)
}

pub fn save_settings(settings: &AppSettings) -> Result<()> {
    let config_path = get_config_path()?;

    if let Some(parent) = config_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let contents = serde_json::to_string_pretty(settings)?;
    std::fs::write(&config_path, contents)?;
    Ok(())
}

pub fn get_config_path() -> Result<PathBuf> {
    let config_dir = dirs::config_dir()
        .ok_or_else(|| anyhow::anyhow!("Could not determine config directory"))?;

    Ok(config_dir.join("penumbra-wrapper").join("config.json"))
}

/// Get the configuration directory (reserved for future features)
#[allow(dead_code)]
pub fn get_config_dir() -> Result<PathBuf> {
    let config_dir = dirs::config_dir()
        .ok_or_else(|| anyhow::anyhow!("Could not determine config directory"))?;

    Ok(config_dir.join("penumbra-wrapper"))
}
