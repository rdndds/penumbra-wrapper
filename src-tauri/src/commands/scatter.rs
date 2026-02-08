/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2025 Shomy
*/

use crate::error::AppError;
use crate::models::scatter::{ScatterFile, ScatterPartition};
use crate::services::scatter_parser::ScatterParser;
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[tauri::command]
pub async fn parse_scatter_file(file_path: String) -> Result<ScatterFile, AppError> {
    // Parse scatter file (auto-detects XML vs TXT format)
    ScatterParser::parse(&file_path)
}

#[tauri::command]
pub async fn detect_image_files(
    scatter_path: String,
    partitions: Vec<ScatterPartition>,
) -> Result<HashMap<String, String>, AppError> {
    // Extract directory from scatter path
    let scatter_path_obj = Path::new(&scatter_path);
    let scatter_dir = scatter_path_obj
        .parent()
        .ok_or_else(|| AppError::Parse("Invalid scatter path".to_string()))?;

    log::info!("[ImageDetect] Scanning directory: {}", scatter_dir.display());

    // Collect all files from scatter directory
    let mut all_files: Vec<String> = Vec::new();

    // Read files in scatter directory (root level)
    if let Ok(entries) = fs::read_dir(scatter_dir) {
        for entry in entries.filter_map(Result::ok) {
            if let Ok(file_type) = entry.file_type() {
                if file_type.is_file() {
                    if let Ok(file_name) = entry.file_name().into_string() {
                        all_files.push(file_name);
                    }
                }
            }
        }
    }

    log::info!("[ImageDetect] Found {} files in root", all_files.len());

    // Also check images/ subdirectory
    let images_dir = scatter_dir.join("images");
    if images_dir.exists() && images_dir.is_dir() {
        if let Ok(entries) = fs::read_dir(&images_dir) {
            for entry in entries.filter_map(Result::ok) {
                if let Ok(file_type) = entry.file_type() {
                    if file_type.is_file() {
                        if let Ok(file_name) = entry.file_name().into_string() {
                            all_files.push(format!("images/{}", file_name));
                        }
                    }
                }
            }
        }
        log::info!("[ImageDetect] Checked images/ subdirectory");
    }

    log::info!("[ImageDetect] Total files found: {}", all_files.len());
    log::debug!("[ImageDetect] Files: {:?}", all_files);

    // Match partitions to image files
    let mut image_map: HashMap<String, String> = HashMap::new();
    let downloadable_partitions: Vec<&ScatterPartition> =
        partitions.iter().filter(|p| p.is_download).collect();

    log::info!(
        "[ImageDetect] Processing {} downloadable partitions",
        downloadable_partitions.len()
    );

    for partition in downloadable_partitions {
        let partition_name_lower = partition.partition_name.to_lowercase();

        // Get scatter file_name (if specified and not "NONE")
        let scatter_file_name = partition
            .file_name
            .as_ref()
            .filter(|f| !f.is_empty() && *f != "NONE")
            .map(|f| f.to_lowercase());

        log::debug!(
            "[ImageDetect] Checking partition: {}, file_name: {:?}",
            partition.partition_name,
            scatter_file_name
        );

        // Find matching file (case-insensitive)
        let matching_file = all_files.iter().find(|file| {
            let file_lower = file.to_lowercase();

            // Priority 1: Check scatter file_name
            if let Some(ref sf_name) = scatter_file_name {
                // Check exact match or match in subdirectory
                if file_lower == *sf_name || file_lower.ends_with(&format!("/{}", sf_name)) {
                    log::debug!(
                        "[ImageDetect] ✓ Matched by file_name: {} → {}",
                        partition.partition_name,
                        file
                    );
                    return true;
                }
            }

            // Priority 2: Check partition name with .img extension
            if file_lower == format!("{}.img", partition_name_lower)
                || file_lower.ends_with(&format!("/{}.img", partition_name_lower))
            {
                log::debug!(
                    "[ImageDetect] ✓ Matched by .img: {} → {}",
                    partition.partition_name,
                    file
                );
                return true;
            }

            // Priority 3: Check partition name with .bin extension
            if file_lower == format!("{}.bin", partition_name_lower)
                || file_lower.ends_with(&format!("/{}.bin", partition_name_lower))
            {
                log::debug!(
                    "[ImageDetect] ✓ Matched by .bin: {} → {}",
                    partition.partition_name,
                    file
                );
                return true;
            }

            false
        });

        // If matched, add to map with full absolute path
        if let Some(matched_file) = matching_file {
            let full_path = scatter_dir.join(matched_file);
            let full_path_str = full_path
                .to_str()
                .ok_or_else(|| AppError::Parse("Invalid file path".to_string()))?
                .to_string();

            image_map.insert(partition.partition_name.clone(), full_path_str);
            log::info!("[ImageDetect] Added: {} → {}", partition.partition_name, matched_file);
        } else {
            log::debug!("[ImageDetect] ✗ No match for: {}", partition.partition_name);
        }
    }

    log::info!("[ImageDetect] Successfully detected {} images", image_map.len());

    Ok(image_map)
}
