/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2025 Shomy
*/

use serde::{Deserialize, Serialize};

/// Error categories for better error classification and user guidance
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ErrorCategory {
    Network,
    Permission,
    FileSystem,
    Validation,
    Command,
    Update,
    Unknown,
}

impl ErrorCategory {
    /// Default category for serde
    pub fn unknown() -> Self {
        ErrorCategory::Unknown
    }
}

/// Comprehensive error type for all application errors
/// Provides structured error information with categories and suggestions
#[derive(Debug, thiserror::Error, Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum AppError {
    #[error("IO error: {message}")]
    #[serde(rename = "io")]
    Io { 
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<i32>,
    },

    #[error("Command execution failed: {message}")]
    #[serde(rename = "command")]
    Command { 
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        output: Option<String>,
    },

    #[error("Device not connected")]
    #[serde(rename = "device_not_connected")]
    DeviceNotConnected,

    #[error("Operation cancelled")]
    #[serde(rename = "cancelled")]
    Cancelled,

    #[error("Invalid partition: {0}")]
    #[serde(rename = "invalid_partition")]
    InvalidPartition(String),

    #[error("Parse error: {0}")]
    #[serde(rename = "parse")]
    Parse(String),

    #[error("Update error: {message}")]
    #[serde(rename = "update")]
    Update { 
        message: String, 
        category: ErrorCategory,
        #[serde(skip_serializing_if = "Option::is_none")]
        suggestion: Option<String>,
    },

    #[error("{message}")]
    #[serde(rename = "other")]
    Other { 
        message: String,
        #[serde(default = "ErrorCategory::unknown")]
        category: ErrorCategory,
    },
}

#[allow(dead_code)]
impl AppError {
    /// Create a new IO error
    pub fn io(message: impl Into<String>) -> Self {
        AppError::Io {
            message: message.into(),
            code: None,
        }
    }

    /// Create a new IO error with code
    pub fn io_with_code(message: impl Into<String>, code: i32) -> Self {
        AppError::Io {
            message: message.into(),
            code: Some(code),
        }
    }

    /// Create a new Command error
    pub fn command(message: impl Into<String>) -> Self {
        AppError::Command {
            message: message.into(),
            output: None,
        }
    }

    /// Create a new Command error with output
    pub fn command_with_output(message: impl Into<String>, output: impl Into<String>) -> Self {
        AppError::Command {
            message: message.into(),
            output: Some(output.into()),
        }
    }

    /// Create a new InvalidPartition error
    pub fn invalid_partition(message: impl Into<String>) -> Self {
        AppError::InvalidPartition(message.into())
    }

    /// Create a new Parse error
    pub fn parse(message: impl Into<String>) -> Self {
        AppError::Parse(message.into())
    }

    /// Create a new Other error
    pub fn other(message: impl Into<String>) -> Self {
        AppError::Other {
            message: message.into(),
            category: ErrorCategory::Unknown,
        }
    }

    /// Create a new Other error with category
    pub fn other_with_category(message: impl Into<String>, category: ErrorCategory) -> Self {
        AppError::Other {
            message: message.into(),
            category,
        }
    }

    /// Get the error category for classification
    pub fn category(&self) -> ErrorCategory {
        match self {
            AppError::Io { .. } => ErrorCategory::FileSystem,
            AppError::Command { .. } => ErrorCategory::Command,
            AppError::DeviceNotConnected => ErrorCategory::Validation,
            AppError::Cancelled => ErrorCategory::Unknown,
            AppError::InvalidPartition(_) => ErrorCategory::Validation,
            AppError::Parse(_) => ErrorCategory::Validation,
            AppError::Update { category, .. } => category.clone(),
            AppError::Other { category, .. } => category.clone(),
        }
    }

    /// Get user-friendly suggestion for resolving the error
    pub fn suggestion(&self) -> Option<String> {
        match self {
            AppError::Update { suggestion, .. } => suggestion.clone(),
            AppError::Io { message, .. } => {
                let msg_lower = message.to_lowercase();
                if msg_lower.contains("permission") || msg_lower.contains("access denied") {
                    Some("Run as Administrator or check folder permissions".to_string())
                } else if msg_lower.contains("not found") || msg_lower.contains("does not exist") {
                    Some("Check that the file or directory exists".to_string())
                } else {
                    None
                }
            }
            AppError::Command { message, .. } => {
                if message.contains("antumbra") {
                    Some("Ensure antumbra binary is installed and accessible".to_string())
                } else {
                    None
                }
            }
            AppError::DeviceNotConnected => {
                Some("Connect your device and ensure it's in the correct mode (BROM/preloader)".to_string())
            }
            _ => None,
        }
    }

    /// Get the error message
    pub fn message(&self) -> String {
        match self {
            AppError::Io { message, .. } => message.clone(),
            AppError::Command { message, .. } => message.clone(),
            AppError::DeviceNotConnected => "Device not connected".to_string(),
            AppError::Cancelled => "Operation cancelled".to_string(),
            AppError::InvalidPartition(msg) => msg.clone(),
            AppError::Parse(msg) => msg.clone(),
            AppError::Update { message, .. } => message.clone(),
            AppError::Other { message, .. } => message.clone(),
        }
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        let code = err.raw_os_error();
        AppError::Io {
            message: err.to_string(),
            code,
        }
    }
}

impl From<anyhow::Error> for AppError {
    fn from(err: anyhow::Error) -> Self {
        let err_str = err.to_string();
        let err_lower = err_str.to_lowercase();
        
        // Categorize common errors for better user experience
        if err_lower.contains("sharing violation") 
            || err_lower.contains("error code 32")
            || err_lower.contains("being used by another process") {
            return AppError::Update {
                message: err_str,
                category: ErrorCategory::Permission,
                suggestion: Some("Close antumbra.exe and try again".to_string()),
            };
        }
        
        if err_lower.contains("access denied") 
            || err_lower.contains("error code 5")
            || err_lower.contains("permission denied") {
            return AppError::Update {
                message: err_str,
                category: ErrorCategory::Permission,
                suggestion: Some("Run as Administrator or check antivirus settings".to_string()),
            };
        }
        
        if err_lower.contains("network") 
            || err_lower.contains("github") 
            || err_lower.contains("download")
            || err_lower.contains("connection")
            || err_lower.contains("timeout")
            || err_lower.contains("dns") {
            return AppError::Update {
                message: err_str,
                category: ErrorCategory::Network,
                suggestion: Some("Check your internet connection and try again".to_string()),
            };
        }
        
        if err_lower.contains("checksum") 
            || err_lower.contains("hash")
            || err_lower.contains("verification failed") {
            return AppError::Update {
                message: err_str,
                category: ErrorCategory::Validation,
                suggestion: Some("Download may be corrupted. Try downloading again".to_string()),
            };
        }
        
        if err_lower.contains("disk full") 
            || err_lower.contains("insufficient disk space")
            || err_lower.contains("no space left") {
            return AppError::Update {
                message: err_str,
                category: ErrorCategory::FileSystem,
                suggestion: Some("Free up disk space and try again".to_string()),
            };
        }
        
        // Default to generic error with unknown category
        AppError::Other {
            message: err_str,
            category: ErrorCategory::Unknown,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_categorization() {
        let io_err = AppError::Io { message: "test".to_string(), code: None };
        assert_eq!(io_err.category(), ErrorCategory::FileSystem);
        
        let update_err = AppError::Update {
            message: "test".to_string(),
            category: ErrorCategory::Network,
            suggestion: None,
        };
        assert_eq!(update_err.category(), ErrorCategory::Network);
    }

    #[test]
    fn test_suggestion_for_permission_error() {
        let io_err = AppError::Io { 
            message: "Access denied".to_string(), 
            code: Some(5) 
        };
        assert!(io_err.suggestion().is_some());
        assert!(io_err.suggestion().unwrap().contains("Administrator"));
    }
}
