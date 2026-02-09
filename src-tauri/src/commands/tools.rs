/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2025 Shomy
*/

use crate::commands::{validate_da_preloader_paths, validate_output_dir};
use crate::error::AppError;
use crate::services::antumbra::AntumbraExecutor;
use tauri::{AppHandle, Window};

#[tauri::command]
pub async fn read_all_partitions(
    app: AppHandle,
    da_path: String,
    output_dir: String,
    skip_partitions: Vec<String>,
    preloader_path: Option<String>,
    operation_id: String,
    _window: Window,
) -> Result<(), AppError> {
    log::info!(
        "Reading all partitions to directory: {} (operation_id: {}, skip: {:?})",
        output_dir,
        operation_id,
        skip_partitions
    );

    validate_da_preloader_paths(&da_path, preloader_path.as_deref())?;
    validate_output_dir(&output_dir, "Output directory")?;

    let executor = AntumbraExecutor::new(&app)?;

    // Build command arguments: read-all <output_dir> -d <da> [-p <pl>] [--skip partition1,partition2,...]
    let mut args = vec!["read-all".to_string(), output_dir, "-d".to_string(), da_path];

    if let Some(pl) = preloader_path {
        args.push("-p".to_string());
        args.push(pl);
    }

    // Add skip partitions if provided
    if !skip_partitions.is_empty() {
        for partition in skip_partitions {
            args.push("--skip".to_string());
            args.push(partition);
        }
    }

    // Execute with streaming output using frontend-provided operation_id
    executor
        .execute_streaming(app, operation_id, args)
        .await
        .map_err(|e| AppError::command(e.to_string()))?;

    Ok(())
}

#[tauri::command]
pub async fn seccfg_operation(
    app: AppHandle,
    da_path: String,
    action: String, // "unlock" or "lock"
    preloader_path: Option<String>,
    operation_id: String,
    _window: Window,
) -> Result<(), AppError> {
    log::info!("Seccfg operation '{}' (operation_id: {})", action, operation_id);

    validate_da_preloader_paths(&da_path, preloader_path.as_deref())?;

    let executor = AntumbraExecutor::new(&app)?;

    // Build command arguments: seccfg <action> -d <da> [-p <pl>]
    let mut args = vec!["seccfg".to_string(), action.clone(), "-d".to_string(), da_path];

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
