/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2025 Shomy
*/

use crate::commands::validate_da_preloader_paths;
use crate::error::AppError;
use crate::services::antumbra::AntumbraExecutor;
use tauri::{AppHandle, Window};

#[tauri::command]
pub async fn erase_partition(
    app: AppHandle,
    da_path: String,
    partition: String,
    preloader_path: Option<String>,
    operation_id: String,
    _window: Window,
) -> Result<(), AppError> {
    log::info!("Erasing partition '{}' (operation_id: {})", partition, operation_id);

    validate_da_preloader_paths(&da_path, preloader_path.as_deref())?;

    let executor = AntumbraExecutor::new(&app)?;

    // Build command arguments: erase <partition> -d <da> [-p <pl>]
    let mut args = vec!["erase".to_string(), partition.clone(), "-d".to_string(), da_path];

    if let Some(pl) = preloader_path {
        args.push("-p".to_string());
        args.push(pl);
    }

    // Execute with streaming output using frontend-provided operation_id
    executor
        .execute_streaming(app, operation_id, args)
        .await
        .map_err(|e| AppError::Command(e.to_string()))?;

    Ok(())
}
