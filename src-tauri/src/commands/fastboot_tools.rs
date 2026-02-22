/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2025 Shomy
*/

use crate::error::AppError;
use crate::models::{OperationCompleteEvent, OperationOutputEvent};
use chrono::Utc;
use fastboot_protocol::nusb::{self as fastboot_nusb, NusbFastBoot, NusbFastBootOpenError};
use fastboot_protocol::protocol::FastBootResponse;
use nusb;
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::path::Path;
use tauri::{AppHandle, Emitter};

const SPARSE_MAGIC: u32 = 0xed26ff3a;
const FLASH_CHUNK_SIZE: usize = 1024 * 1024;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FastbootDevice {
    pub id: String,
    pub vendor_id: u16,
    pub product_id: u16,
    pub manufacturer: Option<String>,
    pub product: Option<String>,
    pub serial_number: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FastbootRebootMode {
    Normal,
    Bootloader,
    Recovery,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FastbootSlot {
    A,
    B,
}

#[tauri::command]
pub async fn fastboot_list_devices() -> Result<Vec<FastbootDevice>, AppError> {
    let devices = fastboot_nusb::devices()
        .map_err(|err| AppError::command(format!("Failed to list fastboot devices: {err}")))?;

    let mut results = Vec::new();
    for info in devices {
        results.push(FastbootDevice {
            id: fastboot_device_id(&info),
            vendor_id: info.vendor_id(),
            product_id: info.product_id(),
            manufacturer: info.manufacturer_string().map(|value| value.to_string()),
            product: info.product_string().map(|value| value.to_string()),
            serial_number: info.serial_number().map(|value| value.to_string()),
        });
    }

    Ok(results)
}

#[tauri::command]
pub async fn fastboot_getvar_all(
    app: AppHandle,
    device_id: String,
    operation_id: String,
) -> Result<Vec<String>, AppError> {
    emit_operation_output(&app, &operation_id, "Fetching fastboot variables...", false);

    let info = match find_device_info(&device_id) {
        Ok(info) => info,
        Err(err) => {
            emit_operation_output(&app, &operation_id, &err.message(), true);
            emit_operation_complete(&app, &operation_id, false, Some(err.message()));
            return Err(err);
        }
    };
    let mut fastboot = match open_fastboot(&info) {
        Ok(fastboot) => fastboot,
        Err(err) => {
            emit_operation_output(&app, &operation_id, &err.message(), true);
            emit_operation_complete(&app, &operation_id, false, Some(err.message()));
            return Err(err);
        }
    };

    let vars = fastboot
        .get_all_vars()
        .await
        .map_err(|err| AppError::command(format!("fastboot getvar all failed: {err}")));
    let vars = match vars {
        Ok(vars) => vars,
        Err(err) => {
            emit_operation_output(&app, &operation_id, &err.message(), true);
            emit_operation_complete(&app, &operation_id, false, Some(err.message()));
            return Err(err);
        }
    };

    let mut keys: Vec<_> = vars.keys().cloned().collect();
    keys.sort();

    let mut lines = Vec::new();
    for key in keys {
        if let Some(value) = vars.get(&key) {
            let line = format!("{key}: {value}");
            emit_operation_output(&app, &operation_id, &line, false);
            lines.push(line);
        }
    }

    emit_operation_complete(&app, &operation_id, true, None);
    Ok(lines)
}

#[tauri::command]
pub async fn fastboot_getvar(
    app: AppHandle,
    device_id: String,
    name: String,
    operation_id: String,
) -> Result<String, AppError> {
    emit_operation_output(
        &app,
        &operation_id,
        &format!("Fetching fastboot variable: {name}..."),
        false,
    );

    let info = match find_device_info(&device_id) {
        Ok(info) => info,
        Err(err) => {
            emit_operation_output(&app, &operation_id, &err.message(), true);
            emit_operation_complete(&app, &operation_id, false, Some(err.message()));
            return Err(err);
        }
    };
    let mut fastboot = match open_fastboot(&info) {
        Ok(fastboot) => fastboot,
        Err(err) => {
            emit_operation_output(&app, &operation_id, &err.message(), true);
            emit_operation_complete(&app, &operation_id, false, Some(err.message()));
            return Err(err);
        }
    };

    let value = fastboot
        .get_var(&name)
        .await
        .map_err(|err| AppError::command(format!("fastboot getvar failed: {err}")));
    let value = match value {
        Ok(value) => value,
        Err(err) => {
            emit_operation_output(&app, &operation_id, &err.message(), true);
            emit_operation_complete(&app, &operation_id, false, Some(err.message()));
            return Err(err);
        }
    };

    emit_operation_output(&app, &operation_id, &format!("{name}: {value}"), false);
    emit_operation_complete(&app, &operation_id, true, None);
    Ok(value)
}

#[tauri::command]
pub async fn fastboot_flash(
    app: AppHandle,
    device_id: String,
    partition: String,
    image_path: String,
    operation_id: String,
) -> Result<(), AppError> {
    let image_path_ref = Path::new(&image_path);
    if !image_path_ref.is_file() {
        let message = format!("Image file not found: {image_path}");
        emit_operation_output(&app, &operation_id, &message, true);
        emit_operation_complete(&app, &operation_id, false, Some(message.clone()));
        return Err(AppError::command(message));
    }

    let info = match find_device_info(&device_id) {
        Ok(info) => info,
        Err(err) => {
            emit_operation_output(&app, &operation_id, &err.message(), true);
            emit_operation_complete(&app, &operation_id, false, Some(err.message()));
            return Err(err);
        }
    };
    let mut fastboot = match open_fastboot(&info) {
        Ok(fastboot) => fastboot,
        Err(err) => {
            emit_operation_output(&app, &operation_id, &err.message(), true);
            emit_operation_complete(&app, &operation_id, false, Some(err.message()));
            return Err(err);
        }
    };

    let metadata = tokio::fs::metadata(image_path_ref)
        .await
        .map_err(|err| AppError::command(format!("Failed to read image metadata: {err}")));
    let metadata = match metadata {
        Ok(metadata) => metadata,
        Err(err) => {
            emit_operation_output(&app, &operation_id, &err.message(), true);
            emit_operation_complete(&app, &operation_id, false, Some(err.message()));
            return Err(err);
        }
    };
    let file_size = metadata.len();
    let size = u32::try_from(file_size)
        .map_err(|_| AppError::command("Image file is too large for fastboot"));
    let size = match size {
        Ok(size) => size,
        Err(err) => {
            emit_operation_output(&app, &operation_id, &err.message(), true);
            emit_operation_complete(&app, &operation_id, false, Some(err.message()));
            return Err(err);
        }
    };

    if is_sparse_image(image_path_ref).await? {
        emit_operation_output(
            &app,
            &operation_id,
            "Detected sparse image; sending in sparse format.",
            false,
        );
    }

    emit_operation_output(
        &app,
        &operation_id,
        &format!("Downloading {file_size} bytes..."),
        false,
    );

    let download = fastboot
        .download(size)
        .await
        .map_err(|err| AppError::command(format!("Fastboot download failed: {err}")));
    let mut download = match download {
        Ok(download) => download,
        Err(err) => {
            emit_operation_output(&app, &operation_id, &err.message(), true);
            emit_operation_complete(&app, &operation_id, false, Some(err.message()));
            return Err(err);
        }
    };

    let file = tokio::fs::File::open(image_path_ref)
        .await
        .map_err(|err| AppError::command(format!("Failed to open image file: {err}")));
    let mut file = match file {
        Ok(file) => file,
        Err(err) => {
            emit_operation_output(&app, &operation_id, &err.message(), true);
            emit_operation_complete(&app, &operation_id, false, Some(err.message()));
            return Err(err);
        }
    };
    let mut buffer = vec![0u8; FLASH_CHUNK_SIZE];
    loop {
        let bytes = tokio::io::AsyncReadExt::read(&mut file, &mut buffer)
            .await
            .map_err(|err| AppError::command(format!("Failed to read image file: {err}")));
        let bytes = match bytes {
            Ok(bytes) => bytes,
            Err(err) => {
                emit_operation_output(&app, &operation_id, &err.message(), true);
                emit_operation_complete(&app, &operation_id, false, Some(err.message()));
                return Err(err);
            }
        };
        if bytes == 0 {
            break;
        }
        let chunk_result = download
            .extend_from_slice(&buffer[..bytes])
            .await
            .map_err(|err| AppError::command(format!("Fastboot download failed: {err}")));
        if let Err(err) = chunk_result {
            emit_operation_output(&app, &operation_id, &err.message(), true);
            emit_operation_complete(&app, &operation_id, false, Some(err.message()));
            return Err(err);
        }
    }

    let finish_result = download
        .finish()
        .await
        .map_err(|err| AppError::command(format!("Fastboot download failed: {err}")));
    if let Err(err) = finish_result {
        emit_operation_output(&app, &operation_id, &err.message(), true);
        emit_operation_complete(&app, &operation_id, false, Some(err.message()));
        return Err(err);
    }

    emit_operation_output(
        &app,
        &operation_id,
        &format!("Flashing partition: {partition}"),
        false,
    );

    let flash_result = fastboot
        .flash(&partition)
        .await
        .map_err(|err| AppError::command(format!("Fastboot flash failed: {err}")));
    if let Err(err) = flash_result {
        emit_operation_output(&app, &operation_id, &err.message(), true);
        emit_operation_complete(&app, &operation_id, false, Some(err.message()));
        return Err(err);
    }

    emit_operation_complete(&app, &operation_id, true, None);
    Ok(())
}

#[tauri::command]
pub async fn fastboot_erase(
    app: AppHandle,
    device_id: String,
    partition: String,
    operation_id: String,
) -> Result<(), AppError> {
    let info = match find_device_info(&device_id) {
        Ok(info) => info,
        Err(err) => {
            emit_operation_output(&app, &operation_id, &err.message(), true);
            emit_operation_complete(&app, &operation_id, false, Some(err.message()));
            return Err(err);
        }
    };
    let mut fastboot = match open_fastboot(&info) {
        Ok(fastboot) => fastboot,
        Err(err) => {
            emit_operation_output(&app, &operation_id, &err.message(), true);
            emit_operation_complete(&app, &operation_id, false, Some(err.message()));
            return Err(err);
        }
    };

    emit_operation_output(
        &app,
        &operation_id,
        &format!("Erasing partition: {partition}"),
        false,
    );

    let result = fastboot
        .erase(&partition)
        .await
        .map_err(|err| AppError::command(format!("Fastboot erase failed: {err}")));
    if let Err(err) = result {
        emit_operation_output(&app, &operation_id, &err.message(), true);
        emit_operation_complete(&app, &operation_id, false, Some(err.message()));
        return Err(err);
    }

    emit_operation_complete(&app, &operation_id, true, None);
    Ok(())
}

#[tauri::command]
pub async fn fastboot_reboot(
    app: AppHandle,
    device_id: String,
    mode: FastbootRebootMode,
    operation_id: String,
) -> Result<(), AppError> {
    let info = match find_device_info(&device_id) {
        Ok(info) => info,
        Err(err) => {
            emit_operation_output(&app, &operation_id, &err.message(), true);
            emit_operation_complete(&app, &operation_id, false, Some(err.message()));
            return Err(err);
        }
    };

    emit_operation_output(
        &app,
        &operation_id,
        &format!("Rebooting to {mode:?}..."),
        false,
    );

    match mode {
        FastbootRebootMode::Normal => {
            let mut fastboot = match open_fastboot(&info) {
                Ok(fastboot) => fastboot,
                Err(err) => {
                    emit_operation_output(&app, &operation_id, &err.message(), true);
                    emit_operation_complete(&app, &operation_id, false, Some(err.message()));
                    return Err(err);
                }
            };
            let reboot_result = fastboot
                .reboot()
                .await
                .map_err(|err| AppError::command(format!("Fastboot reboot failed: {err}")));
            if let Err(err) = reboot_result {
                emit_operation_output(&app, &operation_id, &err.message(), true);
                emit_operation_complete(&app, &operation_id, false, Some(err.message()));
                return Err(err);
            }
        }
        FastbootRebootMode::Bootloader => {
            let mut fastboot = match open_fastboot(&info) {
                Ok(fastboot) => fastboot,
                Err(err) => {
                    emit_operation_output(&app, &operation_id, &err.message(), true);
                    emit_operation_complete(&app, &operation_id, false, Some(err.message()));
                    return Err(err);
                }
            };
            let reboot_result = fastboot
                .reboot_bootloader()
                .await
                .map_err(|err| AppError::command(format!("Fastboot reboot failed: {err}")));
            if let Err(err) = reboot_result {
                emit_operation_output(&app, &operation_id, &err.message(), true);
                emit_operation_complete(&app, &operation_id, false, Some(err.message()));
                return Err(err);
            }
        }
        FastbootRebootMode::Recovery => {
            let mut client = match open_raw_fastboot(&info) {
                Ok(client) => client,
                Err(err) => {
                    emit_operation_output(&app, &operation_id, &err.message(), true);
                    emit_operation_complete(&app, &operation_id, false, Some(err.message()));
                    return Err(err);
                }
            };
            let reboot_result = send_raw_command(&mut client, "reboot-recovery")
                .await
                .map_err(|err| AppError::command(format!("Fastboot reboot failed: {err}")));
            if let Err(err) = reboot_result {
                emit_operation_output(&app, &operation_id, &err.message(), true);
                emit_operation_complete(&app, &operation_id, false, Some(err.message()));
                return Err(err);
            }
        }
    }

    emit_operation_complete(&app, &operation_id, true, None);
    Ok(())
}

#[tauri::command]
pub async fn fastboot_set_active_slot(
    app: AppHandle,
    device_id: String,
    slot: FastbootSlot,
    operation_id: String,
) -> Result<(), AppError> {
    let info = match find_device_info(&device_id) {
        Ok(info) => info,
        Err(err) => {
            emit_operation_output(&app, &operation_id, &err.message(), true);
            emit_operation_complete(&app, &operation_id, false, Some(err.message()));
            return Err(err);
        }
    };

    let mut client = match open_raw_fastboot(&info) {
        Ok(client) => client,
        Err(err) => {
            emit_operation_output(&app, &operation_id, &err.message(), true);
            emit_operation_complete(&app, &operation_id, false, Some(err.message()));
            return Err(err);
        }
    };

    let slot_value = match slot {
        FastbootSlot::A => "a",
        FastbootSlot::B => "b",
    };

    emit_operation_output(
        &app,
        &operation_id,
        &format!("Setting active slot to {slot_value}..."),
        false,
    );

    let command = format!("set_active:{slot_value}");
    let result = send_raw_command(&mut client, &command)
        .await
        .map_err(|err| AppError::command(format!("Fastboot set_active failed: {err}")));
    if let Err(err) = result {
        emit_operation_output(&app, &operation_id, &err.message(), true);
        emit_operation_complete(&app, &operation_id, false, Some(err.message()));
        return Err(err);
    }

    emit_operation_complete(&app, &operation_id, true, None);
    Ok(())
}

#[tauri::command]
pub async fn fastboot_reboot_fastbootd(
    app: AppHandle,
    device_id: String,
    operation_id: String,
) -> Result<(), AppError> {
    let info = match find_device_info(&device_id) {
        Ok(info) => info,
        Err(err) => {
            emit_operation_output(&app, &operation_id, &err.message(), true);
            emit_operation_complete(&app, &operation_id, false, Some(err.message()));
            return Err(err);
        }
    };

    let mut client = match open_raw_fastboot(&info) {
        Ok(client) => client,
        Err(err) => {
            emit_operation_output(&app, &operation_id, &err.message(), true);
            emit_operation_complete(&app, &operation_id, false, Some(err.message()));
            return Err(err);
        }
    };

    emit_operation_output(
        &app,
        &operation_id,
        "Rebooting to fastbootd...",
        false,
    );

    let result = send_raw_command(&mut client, "reboot-fastboot")
        .await
        .map_err(map_fastbootd_error);
    if let Err(err) = result {
        emit_operation_output(&app, &operation_id, &err.message(), true);
        emit_operation_complete(&app, &operation_id, false, Some(err.message()));
        return Err(err);
    }

    emit_operation_complete(&app, &operation_id, true, None);
    Ok(())
}

fn fastboot_device_id(info: &nusb::DeviceInfo) -> String {
    format!("{:?}", info.id())
}

fn find_device_info(device_identifier: &str) -> Result<nusb::DeviceInfo, AppError> {
    let devices = fastboot_nusb::devices()
        .map_err(|err| AppError::command(format!("Failed to list fastboot devices: {err}")))?;
    for info in devices {
        if fastboot_device_id(&info) == device_identifier {
            return Ok(info);
        }
    }
    Err(AppError::command("Fastboot device not found"))
}

fn open_fastboot(info: &nusb::DeviceInfo) -> Result<NusbFastBoot, AppError> {
    NusbFastBoot::from_info(info).map_err(map_open_error)
}

fn map_open_error(err: NusbFastBootOpenError) -> AppError {
    AppError::command(format!("Failed to open fastboot device: {err}"))
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

async fn is_sparse_image(path: &Path) -> Result<bool, AppError> {
    let mut file = tokio::fs::File::open(path)
        .await
        .map_err(|err| AppError::command(format!("Failed to open image file: {err}")))?;
    let mut header = [0u8; 4];
    let bytes = tokio::io::AsyncReadExt::read(&mut file, &mut header)
        .await
        .map_err(|err| AppError::command(format!("Failed to read image file: {err}")))?;
    if bytes < 4 {
        return Ok(false);
    }
    Ok(u32::from_le_bytes(header) == SPARSE_MAGIC)
}

struct RawFastbootClient {
    interface: nusb::Interface,
    ep_out: u8,
    ep_in: u8,
    max_in: usize,
}

fn open_raw_fastboot(info: &nusb::DeviceInfo) -> Result<RawFastbootClient, AppError> {
    let interface_number = NusbFastBoot::find_fastboot_interface(info)
        .ok_or_else(|| AppError::command("Failed to find fastboot interface"))?;
    let device = info
        .open()
        .map_err(|err| AppError::command(format!("Failed to open device: {err}")))?;
    let interface = device
        .claim_interface(interface_number)
        .map_err(|err| AppError::command(format!("Failed to claim interface: {err}")))?;

    let mut ep_out = None;
    let mut ep_in = None;
    for alt in interface.descriptors() {
        let out = alt.endpoints().find_map(|end| {
            if end.transfer_type() == nusb::transfer::EndpointType::Bulk
                && end.direction() == nusb::transfer::Direction::Out
            {
                Some((end.address(), end.max_packet_size()))
            } else {
                None
            }
        });
        let inn = alt.endpoints().find_map(|end| {
            if end.transfer_type() == nusb::transfer::EndpointType::Bulk
                && end.direction() == nusb::transfer::Direction::In
            {
                Some((end.address(), end.max_packet_size()))
            } else {
                None
            }
        });
        if let (Some(out), Some(inn)) = (out, inn) {
            ep_out = Some(out);
            ep_in = Some(inn);
            break;
        }
    }

    let (ep_out, _max_out) = ep_out.ok_or_else(|| {
        AppError::command("Failed to find fastboot bulk OUT endpoint")
    })?;
    let (ep_in, max_in) =
        ep_in.ok_or_else(|| AppError::command("Failed to find fastboot bulk IN endpoint"))?;

    Ok(RawFastbootClient {
        interface,
        ep_out,
        ep_in,
        max_in,
    })
}

async fn send_raw_command(client: &mut RawFastbootClient, command: &str) -> Result<(), String> {
    let mut out = vec![];
    out.write_fmt(format_args!("{command}"))
        .map_err(|err| err.to_string())?;

    client
        .interface
        .bulk_out(client.ep_out, out)
        .await
        .status
        .map_err(|err| err.to_string())?;

    loop {
        let req = nusb::transfer::RequestBuffer::new(client.max_in);
        let resp = client.interface.bulk_in(client.ep_in, req).await;
        resp.status.map_err(|err| err.to_string())?;
        match FastBootResponse::from_bytes(&resp.data) {
            Ok(FastBootResponse::Okay(_)) => return Ok(()),
            Ok(FastBootResponse::Fail(fail)) => return Err(fail),
            Ok(FastBootResponse::Info(_)) | Ok(FastBootResponse::Text(_)) => continue,
            Ok(FastBootResponse::Data(_)) => return Err("Unexpected DATA response".to_string()),
            Err(err) => return Err(err.to_string()),
        }
    }
}

fn map_fastbootd_error(err: String) -> AppError {
    let lower = err.to_lowercase();
    if lower.contains("unknown command")
        || lower.contains("not supported")
        || lower.contains("unsupported")
        || lower.contains("invalid command")
    {
        return AppError::command("Fastbootd reboot is not supported on this device");
    }
    AppError::command(format!("Fastboot reboot failed: {err}"))
}
