/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2025 Shomy
*/

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScatterPartition {
    pub index: String,             // "SYS0"
    pub partition_name: String,    // "preloader"
    pub file_name: Option<String>, // "preloader.bin" or None
    pub is_download: bool,         // true/false
    #[serde(rename = "type")]
    pub partition_type: String, // "SV5_BL_BIN", "NORMAL_ROM", "EXT4_IMG"
    pub linear_start_addr: String, // "0x0" (kept as string for hex)
    pub physical_start_addr: String, // "0x0"
    pub partition_size: String,    // "0x80000"
    pub region: String,            // "EMMC_BOOT1", "EMMC_USER", "UFS_LU2"
    pub storage: String,           // "HW_STORAGE_EMMC", "HW_STORAGE_UFS"
    pub operation_type: String,    // "UPDATE", "BOOTLOADERS", "INVISIBLE"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScatterFile {
    pub platform: String,     // "MT6781"
    pub project: String,      // "x670_h814"
    pub storage_type: String, // "EMMC" or "UFS"
    pub partitions: Vec<ScatterPartition>,
    pub file_path: String,
}

impl ScatterFile {
    /// Get only partitions with is_download = true
    #[allow(dead_code)]
    pub fn get_download_partitions(&self) -> Vec<&ScatterPartition> {
        self.partitions.iter().filter(|p| p.is_download).collect()
    }

    /// Parse hex string to u64
    #[allow(dead_code)]
    pub fn parse_hex(hex_str: &str) -> Result<u64, std::num::ParseIntError> {
        let cleaned = hex_str.trim_start_matches("0x").trim_start_matches("0X");
        u64::from_str_radix(cleaned, 16)
    }
}
