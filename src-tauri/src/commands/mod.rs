/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2025 Shomy
*/

pub mod device;
pub mod diagnostics;
pub mod erase;
pub mod flash;
pub mod format;
pub mod read;
pub mod scatter;
pub mod settings;
pub mod tools;
pub mod updates;

use crate::error::AppError;
use crate::services::antumbra::{kill_current_process, AntumbraExecutor};
use std::fs::OpenOptions;
use std::path::Path;
use tauri::AppHandle;
use uuid::Uuid;

#[tauri::command]
pub async fn get_antumbra_version(app: AppHandle) -> Result<String, AppError> {
    let executor = AntumbraExecutor::new(&app)?;
    executor.get_version().map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn cancel_operation(app: AppHandle) -> Result<(), AppError> {
    let _ = AntumbraExecutor::new(&app)?;
    kill_current_process().map_err(|e| AppError::command(e.to_string()))?;
    Ok(())
}

pub(crate) fn validate_da_preloader_paths(
    da_path: &str,
    preloader_path: Option<&str>,
) -> Result<(), AppError> {
    validate_input_file(da_path, "DA file")?;
    if let Some(path) = preloader_path {
        validate_input_file(path, "Preloader file")?;
    }
    Ok(())
}

pub(crate) fn validate_input_file(path: &str, label: &str) -> Result<(), AppError> {
    let target = Path::new(path);
    if !target.is_file() {
        return Err(AppError::command(format!("{} not found: {}", label, path)));
    }
    validate_readable_file(target, label)?;
    Ok(())
}

pub(crate) fn validate_output_dir(path: &str, label: &str) -> Result<(), AppError> {
    let target = Path::new(path);
    if !target.is_dir() {
        return Err(AppError::command(format!("{} not found: {}", label, path)));
    }
    validate_writable_dir(target, label)?;
    Ok(())
}

pub(crate) fn validate_output_parent(path: &str, label: &str) -> Result<(), AppError> {
    let parent = Path::new(path)
        .parent()
        .ok_or_else(|| AppError::command(format!("{} has no parent: {}", label, path)))?;

    if !parent.is_dir() {
        return Err(AppError::command(format!(
            "{} parent directory not found: {}",
            label,
            parent.display()
        )));
    }

    validate_writable_dir(parent, label)?;

    Ok(())
}

fn validate_readable_file(path: &Path, label: &str) -> Result<(), AppError> {
    OpenOptions::new().read(true).open(path).map_err(|err| {
        AppError::command(format!("{} not readable: {} ({})", label, path.display(), err))
    })?;
    Ok(())
}

fn validate_writable_dir(path: &Path, label: &str) -> Result<(), AppError> {
    let temp_name = format!(".penumbra-write-test-{}", Uuid::new_v4());
    let temp_path = path.join(temp_name);

    let file = OpenOptions::new().write(true).create_new(true).open(&temp_path).map_err(|err| {
        AppError::command(format!("{} not writable: {} ({})", label, path.display(), err))
    })?;

    drop(file);
    let _ = std::fs::remove_file(&temp_path);
    Ok(())
}
