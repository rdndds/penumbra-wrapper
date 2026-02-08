/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2025 Shomy
*/

pub mod scatter;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Partition {
    pub name: String,
    pub start: String,
    pub size: String, // Hex value (e.g., "0x80000")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display_size: Option<String>, // Human readable (e.g., "512 KiB")
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PartitionListResult {
    pub partitions: Vec<Partition>,
    pub operation_id: String,
}

// Reserved for future progress tracking features
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlashProgress {
    pub current: u64,
    pub total: u64,
    pub percentage: f32,
    pub partition_name: String,
    pub operation: String, // "read" or "write"
}

// Reserved for future structured logging features
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEvent {
    pub timestamp: String,
    pub level: String,
    pub message: String,
    pub partition_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationOutputEvent {
    pub operation_id: String,
    pub line: String,
    pub timestamp: String,
    pub is_stderr: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationCompleteEvent {
    pub operation_id: String,
    pub success: bool,
    pub error: Option<String>,
}
