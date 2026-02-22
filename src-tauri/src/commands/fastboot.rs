/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2025 Shomy
*/

use crate::error::AppError;
use crate::models::{OperationCompleteEvent, OperationOutputEvent};
use chrono::Utc;
use serde::Serialize;
use std::io::Write;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

const VENDOR_ID: u16 = 0x0E8D;
const BOOT_MODE_CMD: &[u8] = b"FASTBOOT";
const KEYWORDS: [&str; 3] = ["MediaTek", "PreLoader", "MTK"];
const BAUDS: [u32; 3] = [115_200, 921_600, 57_600];
const SCAN_WINDOW_SECS: f32 = 60.0;
const PORT_ATTEMPT_SECS: f32 = 2.5;
const POLL_INTERVAL_SECS: f32 = 0.2;
const READ_TIMEOUT_SECS: f32 = 0.0;
const WRITE_TIMEOUT_SECS: f32 = 0.3;
const FLOOD_INTERVAL_SECS: f32 = 0.03;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum FastbootStatus {
    Start,
    Success,
    NoDevice,
    OpenError,
    NoAck,
    Error,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FastbootStatusEvent {
    status: FastbootStatus,
    message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FastbootResult {
    status: FastbootStatus,
    message: String,
}

#[tauri::command]
pub async fn force_fastboot(app: AppHandle) -> Result<FastbootResult, AppError> {
    let app_handle = app.clone();
    let result = tokio::task::spawn_blocking(move || force_fastboot_blocking(app_handle))
        .await
        .map_err(|err| AppError::command(err.to_string()))?;

    Ok(result)
}

fn force_fastboot_blocking(app: AppHandle) -> FastbootResult {
    let operation_id = Uuid::new_v4().to_string();
    emit_status(
        &app,
        FastbootStatus::Start,
        "Attempting to switch device to Fastboot...",
    );
    emit_operation_output(
        &app,
        &operation_id,
        "Starting MTK fastboot attempt...",
        false,
    );

    let expected_ack = build_expected_ack();
    let scan_deadline = Instant::now() + Duration::from_secs_f32(SCAN_WINDOW_SECS);
    let mut saw_device = false;
    let mut saw_no_ack = false;
    let mut saw_open_error = false;
    let mut last_attempt: std::collections::HashMap<String, Instant> =
        std::collections::HashMap::new();

    while Instant::now() < scan_deadline {
        let ports = match serialport::available_ports() {
            Ok(ports) => ports,
            Err(err) => {
                let message = format!("Failed to enumerate ports: {}", err);
                emit_status(&app, FastbootStatus::Error, &message);
                emit_operation_output(&app, &operation_id, &message, true);
                emit_operation_complete(&app, &operation_id, false, Some(message.clone()));
                return FastbootResult {
                    status: FastbootStatus::Error,
                    message,
                };
            }
        };

        let ranked_ports = rank_ports(ports, VENDOR_ID, &KEYWORDS);

        if ranked_ports.is_empty() {
            std::thread::sleep(Duration::from_secs_f32(POLL_INTERVAL_SECS));
            continue;
        }

        for port in ranked_ports {
            let now = Instant::now();
            if let Some(last) = last_attempt.get(&port.port_name) {
                if now.duration_since(*last) < Duration::from_millis(500) {
                    continue;
                }
            }
            last_attempt.insert(port.port_name.clone(), now);

            saw_device = true;
            let port_message = format!(
                "Detected candidate MTK port: {} ({:?})",
                port.port_name, port.port_type
            );
            log::info!("{}", port_message);
            emit_operation_output(&app, &operation_id, &port_message, false);

            for baud in BAUDS {
                let attempt = attempt_fastboot(
                    &port.port_name,
                    baud,
                    Duration::from_secs_f32(READ_TIMEOUT_SECS),
                    Duration::from_secs_f32(WRITE_TIMEOUT_SECS),
                    Duration::from_secs_f32(PORT_ATTEMPT_SECS),
                    Duration::from_secs_f32(FLOOD_INTERVAL_SECS),
                    &expected_ack,
                );

                match attempt {
                    AttemptResult::Success => {
                        let message = "Handshake successful. Device should be in Fastboot.";
                        emit_status(&app, FastbootStatus::Success, message);
                        emit_operation_output(&app, &operation_id, message, false);
                        emit_operation_complete(&app, &operation_id, true, None);
                        return FastbootResult {
                            status: FastbootStatus::Success,
                            message: message.to_string(),
                        };
                    }
                    AttemptResult::OpenError(err) => {
                        saw_open_error = true;
                        let error_message = format!(
                            "Failed to open port {} at {} baud: {}",
                            port.port_name, baud, err
                        );
                        log::warn!("{}", error_message);
                        emit_operation_output(&app, &operation_id, &error_message, true);
                    }
                    AttemptResult::NoAck => {
                        saw_no_ack = true;
                    }
                }
            }
        }

        std::thread::sleep(Duration::from_secs_f32(POLL_INTERVAL_SECS));
    }

    if !saw_device {
        let message = "No MTK preloader device detected.".to_string();
        emit_status(&app, FastbootStatus::NoDevice, &message);
        emit_operation_output(&app, &operation_id, &message, true);
        emit_operation_complete(&app, &operation_id, false, Some(message.clone()));
        return FastbootResult {
            status: FastbootStatus::NoDevice,
            message,
        };
    }

    if saw_open_error && !saw_no_ack {
        let message = if cfg!(target_os = "linux") {
            "Ports detected but could not be opened. Check udev permissions for VID 0e8d.".to_string()
        } else {
            "Ports detected but could not be opened. Check driver permissions.".to_string()
        };
        emit_status(&app, FastbootStatus::OpenError, &message);
        emit_operation_output(&app, &operation_id, &message, true);
        emit_operation_complete(&app, &operation_id, false, Some(message.clone()));
        return FastbootResult {
            status: FastbootStatus::OpenError,
            message,
        };
    }

    let message = "Device detected but no ACK received from preloader.".to_string();
    emit_status(&app, FastbootStatus::NoAck, &message);
    emit_operation_output(&app, &operation_id, &message, true);
    emit_operation_complete(&app, &operation_id, false, Some(message.clone()));
    FastbootResult {
        status: FastbootStatus::NoAck,
        message,
    }
}

fn emit_status(app: &AppHandle, status: FastbootStatus, message: &str) {
    let payload = FastbootStatusEvent {
        status,
        message: message.to_string(),
    };
    let _ = app.emit("fastboot:status", payload);
}

fn emit_operation_output(app: &AppHandle, operation_id: &str, line: &str, is_stderr: bool) {
    let event = OperationOutputEvent {
        operation_id: operation_id.to_string(),
        line: line.to_string(),
        timestamp: Utc::now().to_rfc3339(),
        is_stderr,
    };
    let _ = app.emit("operation:output", event);
}

fn emit_operation_complete(
    app: &AppHandle,
    operation_id: &str,
    success: bool,
    error: Option<String>,
) {
    let event = OperationCompleteEvent {
        operation_id: operation_id.to_string(),
        success,
        error,
    };
    let _ = app.emit("operation:complete", event);
}

#[derive(Debug)]
enum AttemptResult {
    Success,
    OpenError(String),
    NoAck,
}

fn attempt_fastboot(
    port_name: &str,
    baud: u32,
    timeout: Duration,
    _write_timeout: Duration,
    attempt_window: Duration,
    flood_interval: Duration,
    expected_ack: &[u8],
) -> AttemptResult {
    let mut port: Box<dyn serialport::SerialPort> = match serialport::new(port_name, baud)
        .timeout(timeout)
        .open()
    {
        Ok(port) => port,
        Err(err) => return AttemptResult::OpenError(err.to_string()),
    };


    let start = Instant::now();
    let flood_duration = attempt_window.mul_f32(0.6).min(Duration::from_secs_f32(1.5));
    let probe_duration = attempt_window
        .checked_sub(flood_duration)
        .unwrap_or(Duration::from_secs_f32(0.2))
        .max(Duration::from_secs_f32(0.2));

    while Instant::now().duration_since(start) < flood_duration {
        if let Err(err) = port.write_all(BOOT_MODE_CMD) {
            return AttemptResult::OpenError(err.to_string());
        }

        if let Some(resp) = read_response(port.as_mut(), 32) {
            if resp.windows(expected_ack.len()).any(|w| w == expected_ack)
                || resp.windows(5).any(|w| w == b"READY")
            {
                return AttemptResult::Success;
            }
        }

        std::thread::sleep(flood_interval);
    }

    let mut last_write = Instant::now();
    let probe_start = Instant::now();
    while Instant::now().duration_since(probe_start) < probe_duration {
        if let Some(resp) = read_response(port.as_mut(), 64) {
            if resp.windows(expected_ack.len()).any(|w| w == expected_ack)
                || resp.windows(5).any(|w| w == b"READY")
            {
                return AttemptResult::Success;
            }
        }

        if last_write.elapsed() >= Duration::from_millis(200) {
            let _ = port.write_all(BOOT_MODE_CMD);
            last_write = Instant::now();
        }
        std::thread::sleep(Duration::from_millis(50));
    }

    AttemptResult::NoAck
}

fn read_response(port: &mut dyn serialport::SerialPort, size: usize) -> Option<Vec<u8>> {
    let mut buf = vec![0u8; size];
    match port.read(buf.as_mut_slice()) {
        Ok(count) if count > 0 => {
            buf.truncate(count);
            Some(buf)
        }
        Ok(_) => None,
        Err(err) => match err.kind() {
            std::io::ErrorKind::TimedOut | std::io::ErrorKind::WouldBlock => None,
            _ => None,
        },
    }
}

fn rank_ports(
    ports: Vec<serialport::SerialPortInfo>,
    vid: u16,
    keywords: &[&str],
) -> Vec<serialport::SerialPortInfo> {
    let mut candidates: Vec<(i32, serialport::SerialPortInfo)> = Vec::new();

    for port in ports {
        let mut score = 0;
        let mut desc = String::new();

        if let serialport::SerialPortType::UsbPort(info) = &port.port_type {
            if info.vid == vid {
                score += 100;
            }

            if let Some(product) = &info.product {
                desc.push_str(product);
                desc.push(' ');
            }
            if let Some(manufacturer) = &info.manufacturer {
                desc.push_str(manufacturer);
                desc.push(' ');
            }
        }

        let lower_desc = desc.to_lowercase();
        for keyword in keywords {
            if lower_desc.contains(&keyword.to_lowercase()) {
                score += 10;
            }
        }

        if score > 0 {
            candidates.push((score, port));
        }
    }

    candidates.sort_by(|a, b| b.0.cmp(&a.0).then_with(|| a.1.port_name.cmp(&b.1.port_name)));
    candidates.into_iter().map(|(_, port)| port).collect()
}

fn build_expected_ack() -> Vec<u8> {
    let tail: Vec<u8> = BOOT_MODE_CMD
        .iter()
        .rev()
        .take(3)
        .cloned()
        .collect();
    let mut ack = b"READY".to_vec();
    ack.extend(tail);
    ack
}
