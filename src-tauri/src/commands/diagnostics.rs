/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 Shomy
*/

use crate::error::AppError;
use crate::services::antumbra::{AntumbraCommandInfo, get_last_command_info};
use tauri::{AppHandle, Manager};

#[tauri::command]
pub async fn get_wrapper_log_path() -> Result<String, AppError> {
    let log_dir = dirs::config_dir()
        .map(|dir| dir.join("penumbra-wrapper"))
        .unwrap_or_else(|| std::env::temp_dir().join("penumbra-wrapper"));

    Ok(log_dir.join("penumbra-wrapper.log").display().to_string())
}

#[tauri::command]
pub async fn read_wrapper_log() -> Result<String, AppError> {
    let log_dir = dirs::config_dir()
        .map(|dir| dir.join("penumbra-wrapper"))
        .unwrap_or_else(|| std::env::temp_dir().join("penumbra-wrapper"));
    let log_path = log_dir.join("penumbra-wrapper.log");
    let contents = std::fs::read_to_string(&log_path).unwrap_or_default();
    Ok(contents)
}

#[tauri::command]
pub async fn read_antumbra_log(app: AppHandle) -> Result<String, AppError> {
    let config_dir = app.path().app_config_dir().map_err(|e| AppError::Other(e.to_string()))?;
    let log_path = config_dir.join("antumbra.log");
    let contents = std::fs::read_to_string(&log_path).unwrap_or_default();
    Ok(contents)
}

#[tauri::command]
pub async fn get_last_antumbra_command() -> Result<Option<AntumbraCommandInfo>, AppError> {
    Ok(get_last_command_info())
}
