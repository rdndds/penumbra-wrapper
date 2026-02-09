/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 Shomy
*/

use crate::error::AppError;
use crate::services::antumbra::{self, AntumbraCommandInfo, get_last_command_info, AntumbraExecutor};
use crate::services::config;
use serde::{Deserialize, Serialize};

use tauri::{AppHandle, Manager};

#[tauri::command]
pub async fn get_wrapper_log_path() -> Result<String, AppError> {
    let log_dir = dirs::config_dir()
        .map(|dir| dir.join("penumbra-wrapper"))
        .unwrap_or_else(|| std::env::temp_dir().join("penumbra-wrapper"));

    Ok(log_dir.join("penumbra-wrapper.log").display().to_string())
}

#[tauri::command]
pub async fn read_wrapper_log() -> Result<String, AppError> {
    let log_dir = dirs::config_dir()
        .map(|dir| dir.join("penumbra-wrapper"))
        .unwrap_or_else(|| std::env::temp_dir().join("penumbra-wrapper"));
    let log_path = log_dir.join("penumbra-wrapper.log");
    let contents = std::fs::read_to_string(&log_path).unwrap_or_default();
    Ok(contents)
}

#[tauri::command]
pub async fn read_antumbra_log(app: AppHandle) -> Result<String, AppError> {
    let config_dir = app.path().app_config_dir().map_err(|e| AppError::other(e.to_string()))?;
    let log_path = config_dir.join("antumbra.log");
    let contents = std::fs::read_to_string(&log_path).unwrap_or_default();
    Ok(contents)
}

#[tauri::command]
pub async fn get_last_antumbra_command() -> Result<Option<AntumbraCommandInfo>, AppError> {
    Ok(get_last_command_info())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WindowsDiagnostics {
    pub os_info: String,
    pub binary_location: Option<String>,
    pub binary_version: Option<String>,
    pub config_location: String,
    pub config_exists: bool,
    pub config_contents: Option<String>,
    pub disk_space_gb: Option<f64>,
    pub running_antumbra_processes: Vec<String>,
    pub permissions_ok: bool,
    pub network_connectivity: bool,
    pub recommendations: Vec<String>,
}

#[tauri::command]
pub async fn check_windows_environment(app: AppHandle) -> Result<WindowsDiagnostics, AppError> {
    log::info!("Starting Windows environment diagnostics");
    
    let mut diagnostics = WindowsDiagnostics {
        os_info: get_os_info(),
        binary_location: None,
        binary_version: None,
        config_location: String::new(),
        config_exists: false,
        config_contents: None,
        disk_space_gb: None,
        running_antumbra_processes: Vec::new(),
        permissions_ok: false,
        network_connectivity: false,
        recommendations: Vec::new(),
    };

    // Check binary location and version
    if let Ok(Some(binary_path)) = antumbra::get_existing_antumbra_path(&app) {
        diagnostics.binary_location = Some(binary_path.display().to_string());
        
        if let Ok(version) = AntumbraExecutor::new(&app)
            .and_then(|executor| executor.get_version()) 
        {
            diagnostics.binary_version = Some(version);
        }
    } else {
        diagnostics.recommendations.push(
            "antumbra.exe not found in expected locations. Please ensure it's installed."
                .to_string(),
        );
    }

    // Check configuration
    if let Ok(config_path) = config::get_config_path() {
        diagnostics.config_location = config_path.display().to_string();
        diagnostics.config_exists = config_path.exists();
        
        if diagnostics.config_exists {
            if let Ok(contents) = tokio::fs::read_to_string(&config_path).await {
                diagnostics.config_contents = Some(contents);
            }
        }
        
        // Check if we can write to config directory
        if let Some(parent) = config_path.parent() {
            let test_file = parent.join(".penumbra-write-test");
            match tokio::fs::write(&test_file, "test").await {
                Ok(_) => {
                    let _ = tokio::fs::remove_file(&test_file).await;
                    diagnostics.permissions_ok = true;
                }
                Err(e) => {
                    diagnostics.permissions_ok = false;
                    diagnostics.recommendations.push(
                        format!("Cannot write to config directory: {}. Check permissions.", e)
                    );
                }
            }
        }
    }

    // Check for running antumbra processes
    #[cfg(windows)]
    {
        diagnostics.running_antumbra_processes = check_running_antumbra();
        if !diagnostics.running_antumbra_processes.is_empty() {
            diagnostics.recommendations.push(
                "antumbra.exe is currently running. This may prevent updates. Close it first."
                    .to_string(),
            );
        }
    }

    // Check network connectivity to GitHub
    diagnostics.network_connectivity = check_github_connectivity();
    if !diagnostics.network_connectivity {
        diagnostics.recommendations.push(
            "Cannot connect to GitHub API. Check your internet connection or firewall."
                .to_string(),
        );
    }

    // General recommendations based on findings
    if diagnostics.binary_version.is_some() && diagnostics.config_exists {
        if let Ok(config_settings) = config::load_settings() {
            if config_settings.antumbra_version.is_none() {
                diagnostics.recommendations.push(
                    "Config version is null. The app will auto-sync this when it detects the binary."
                        .to_string(),
                );
            }
        }
    }

    log::info!("Windows diagnostics completed: {:?}", diagnostics);
    Ok(diagnostics)
}

#[cfg(windows)]
fn get_os_info() -> String {
    use std::process::Command;
    
    match Command::new("cmd")
        .args(&["/C", "ver"])
        .output()
    {
        Ok(output) => String::from_utf8_lossy(&output.stdout).trim().to_string(),
        Err(_) => "Windows (version detection failed)".to_string(),
    }
}

#[cfg(not(windows))]
fn get_os_info() -> String {
    format!("{} (Windows diagnostics not applicable)", std::env::consts::OS)
}

#[cfg(windows)]
fn check_running_antumbra() -> Vec<String> {
    use std::process::Command;
    
    match Command::new("tasklist")
        .args(&["/FO", "CSV", "/NH", "/FI", "IMAGENAME eq antumbra.exe"])
        .output()
    {
        Ok(output) => {
            let output = String::from_utf8_lossy(&output.stdout);
            output
                .lines()
                .filter(|line| line.contains("antumbra.exe"))
                .map(|line| {
                    // Extract PID from CSV format
                    line.split(',').next().unwrap_or("unknown").to_string()
                })
                .collect()
        }
        Err(_) => Vec::new(),
    }
}

#[cfg(not(windows))]
fn check_running_antumbra() -> Vec<String> {
    Vec::new()
}

fn check_github_connectivity() -> bool {
    use std::thread;
    use std::time::Duration;
    
    let (sender, receiver) = std::sync::mpsc::channel();
    
    thread::spawn(move || {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let result = rt.block_on(async {
            reqwest::get("https://api.github.com/repos/rdndds/penumbra").await
                .map(|response| response.status().is_success())
                .unwrap_or(false)
        });
        let _ = sender.send(result);
    });
    
    // Wait up to 5 seconds for the check
    receiver.recv_timeout(Duration::from_secs(5)).unwrap_or(false)
}
