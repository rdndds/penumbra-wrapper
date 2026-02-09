/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2025 Shomy
*/

use crate::commands::{validate_da_preloader_paths, validate_output_parent};
use crate::error::AppError;
use crate::services::antumbra::AntumbraExecutor;
use tauri::{AppHandle, Window};

#[tauri::command]
pub async fn read_partition(
    app: AppHandle,
    da_path: String,
    partition: String,
    output_path: String,
    preloader_path: Option<String>,
    operation_id: String,
    _window: Window,
) -> Result<(), AppError> {
    validate_da_preloader_paths(&da_path, preloader_path.as_deref())?;
    validate_output_parent(&output_path, "Output file")?;
    log::info!(
        "Reading partition '{}' to file: {} (operation_id: {})",
        partition,
        output_path,
        operation_id
    );

    let executor = AntumbraExecutor::new(&app)?;

    // Build command arguments: upload <partition> <output_file> -d <da> [-p <pl>]
    let mut args =
        vec!["upload".to_string(), partition.clone(), output_path, "-d".to_string(), da_path];

    if let Some(pl) = preloader_path {
        args.push("-p".to_string());
        args.push(pl);
    }

    // Execute with streaming output using frontend-provided operation_id
    executor
        .execute_streaming(app, operation_id, args)
        .await
        .map_err(|e| AppError::command(e.to_string()))?;

    Ok(())
}
