/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2025 Shomy
*/

use crate::commands::validate_da_preloader_paths;
use crate::error::AppError;
use crate::models::{Partition, PartitionListResult};
use crate::services::antumbra::AntumbraExecutor;
use tauri::{AppHandle, Window};
use uuid::Uuid;

#[tauri::command]
pub async fn reboot_device(
    app: AppHandle,
    da_path: String,
    mode: String,
    preloader_path: Option<String>,
) -> Result<(), AppError> {
    log::info!("Rebooting device to {} mode with DA: {}", mode, da_path);

    validate_da_preloader_paths(&da_path, preloader_path.as_deref())?;

    let executor = AntumbraExecutor::new(&app)?;
    let operation_id = Uuid::new_v4().to_string();

    let mut args = vec!["reboot".to_string(), mode, "-d".to_string(), da_path];

    if let Some(pl) = preloader_path {
        args.push("-p".to_string());
        args.push(pl);
    }

    // Execute reboot command with streaming
    executor
        .execute_streaming(app, operation_id, args)
        .await
        .map_err(|e| AppError::Command(e.to_string()))?;

    Ok(())
}

#[tauri::command]
pub async fn shutdown_device(
    app: AppHandle,
    da_path: String,
    preloader_path: Option<String>,
) -> Result<(), AppError> {
    log::info!("Shutting down device with DA: {}", da_path);

    validate_da_preloader_paths(&da_path, preloader_path.as_deref())?;

    let executor = AntumbraExecutor::new(&app)?;
    let operation_id = Uuid::new_v4().to_string();

    let mut args = vec!["shutdown".to_string(), "-d".to_string(), da_path];

    if let Some(pl) = preloader_path {
        args.push("-p".to_string());
        args.push(pl);
    }

    // Execute shutdown command with streaming
    executor
        .execute_streaming(app, operation_id, args)
        .await
        .map_err(|e| AppError::Command(e.to_string()))?;

    Ok(())
}

#[tauri::command]
pub async fn list_partitions(
    app: AppHandle,
    da_path: String,
    preloader_path: Option<String>,
    _window: Window,
) -> Result<PartitionListResult, AppError> {
    log::info!("Listing partitions with DA: {}", da_path);

    validate_da_preloader_paths(&da_path, preloader_path.as_deref())?;

    let executor = AntumbraExecutor::new(&app)?;
    let operation_id = Uuid::new_v4().to_string();

    let mut args = vec!["pgpt".to_string(), "-d".to_string(), da_path];

    if let Some(pl) = preloader_path {
        args.push("-p".to_string());
        args.push(pl);
    }

    // Execute with streaming (output events are emitted in real-time)
    let output = executor
        .execute_streaming(app, operation_id.clone(), args)
        .await
        .map_err(|e| AppError::Command(e.to_string()))?;

    // Parse the output into partitions
    let partitions = parse_pgpt_output(&output)?;

    // Return both partitions and operation_id
    Ok(PartitionListResult { partitions, operation_id })
}

fn parse_pgpt_output(output: &str) -> Result<Vec<Partition>, AppError> {
    let mut partitions = Vec::new();

    // Actual antumbra output format:
    // Antumbra ✦  Name: preloader              Addr: 0x00000000        Size: 0x00400000 (4 MiB)

    for line in output.lines() {
        let line = line.trim();

        // Look for lines containing "Name:"
        if !line.contains("Name:") {
            continue;
        }

        // Parse the format: Name: <name> Addr: <addr> Size: <size> (<human_readable>)
        let parts: Vec<&str> = line.split_whitespace().collect();

        // Find indices of key fields
        let name_idx = parts.iter().position(|&s| s == "Name:");
        let addr_idx = parts.iter().position(|&s| s == "Addr:");
        let size_idx = parts.iter().position(|&s| s == "Size:");

        if let (Some(name_i), Some(addr_i), Some(size_i)) = (name_idx, addr_idx, size_idx) {
            // Name is the token after "Name:"
            let name = parts.get(name_i + 1).map(|s| s.to_string()).unwrap_or_default();

            // Address is the token after "Addr:"
            let start = parts.get(addr_i + 1).map(|s| s.to_string()).unwrap_or_default();

            // Size hex is the token after "Size:"
            let size_hex = parts.get(size_i + 1).map(|s| s.to_string()).unwrap_or_default();

            // Human readable size is in parentheses, e.g., "(4 MiB)"
            let mut size_human = String::new();
            let mut in_parens = false;
            for part in parts.iter().skip(size_i + 2) {
                if part.starts_with('(') {
                    in_parens = true;
                    size_human.push_str(&part[1..]); // Remove leading (
                } else if part.ends_with(')') {
                    size_human.push(' ');
                    size_human.push_str(&part[..part.len() - 1]); // Remove trailing )
                    break;
                } else if in_parens {
                    size_human.push(' ');
                    size_human.push_str(part);
                }
            }

            if !name.is_empty() && !start.is_empty() {
                partitions.push(Partition {
                    name,
                    start,
                    size: size_hex, // Always store hex value for comparisons
                    display_size: if size_human.is_empty() { None } else { Some(size_human) },
                });
            }
        }
    }

    if partitions.is_empty() {
        return Err(AppError::Parse("No partitions found in output".to_string()));
    }

    Ok(partitions)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_pgpt_output() {
        let output = r#"
Antumbra ✦  Waiting for MTK device...
Antumbra ✦  Found MTK port: USB 0E8D:2000
Antumbra ✦  Partition Table:
Antumbra ✦  Name: preloader              Addr: 0x00000000        Size: 0x00400000 (4 MiB)
Antumbra ✦  Name: boot_para              Addr: 0x00008000        Size: 0x01A00000 (26 MiB)
Antumbra ✦  Name: boot_a                 Addr: 0x25100000        Size: 0x02000000 (32 MiB)
Antumbra ✦  Name: super                  Addr: 0x43800000        Size: 0x1FA120000 (7.9 GiB)
Antumbra ✦  Name: userdata               Addr: 0x250800000       Size: 0x39447FB000 (229.1 GiB)
"#;

        let partitions = parse_pgpt_output(output).unwrap();
        assert_eq!(partitions.len(), 5);
        assert_eq!(partitions[0].name, "preloader");
        assert_eq!(partitions[0].start, "0x00000000");
        assert_eq!(partitions[0].size, "0x00400000");
        assert_eq!(partitions[0].display_size.as_deref(), Some("4 MiB"));
        assert_eq!(partitions[1].name, "boot_para");
        assert_eq!(partitions[2].name, "boot_a");
        assert_eq!(partitions[3].name, "super");
        assert_eq!(partitions[3].size, "0x1FA120000");
        assert_eq!(partitions[3].display_size.as_deref(), Some("7.9 GiB"));
        assert_eq!(partitions[4].name, "userdata");
    }
}
