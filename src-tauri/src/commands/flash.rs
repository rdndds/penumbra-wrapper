/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2025 Shomy
*/

use crate::commands::{validate_da_preloader_paths, validate_input_file};
use crate::error::AppError;
use crate::services::antumbra::AntumbraExecutor;
use tauri::{AppHandle, Window};

#[tauri::command]
pub async fn flash_partition(
    app: AppHandle,
    da_path: String,
    partition: String,
    image_path: String,
    preloader_path: Option<String>,
    operation_id: String,
    _window: Window,
) -> Result<(), AppError> {
    validate_da_preloader_paths(&da_path, preloader_path.as_deref())?;
    validate_input_file(&image_path, "Image file")?;
    validate_da_preloader_paths(&da_path, preloader_path.as_deref())?;
    log::info!(
        "Flashing partition '{}' with image: {} (operation_id: {})",
        partition,
        image_path,
        operation_id
    );

    let executor = AntumbraExecutor::new(&app)?;

    // Build command arguments
    let mut args =
        vec!["download".to_string(), partition.clone(), image_path, "-d".to_string(), da_path];

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
