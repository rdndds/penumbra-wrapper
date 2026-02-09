/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2025 Shomy
*/

use crate::error::AppError;
use crate::services::config::{AppSettings, load_settings, save_settings};
use tauri::AppHandle;

#[tauri::command]
pub async fn get_settings(_app: AppHandle) -> Result<AppSettings, AppError> {
    load_settings().map_err(|e| AppError::other(e.to_string()))
}

#[tauri::command]
pub async fn update_settings(_app: AppHandle, settings: AppSettings) -> Result<(), AppError> {
    save_settings(&settings).map_err(|e| AppError::other(e.to_string()))
}
