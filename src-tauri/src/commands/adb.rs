/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2025 Shomy
*/

use crate::commands::validate_output_dir;
use crate::error::AppError;
use crate::models::{FlashProgress, OperationCompleteEvent, OperationOutputEvent};
use crate::services::config::load_settings;
use adb_client::usb::{find_all_connected_adb_devices, ADBDeviceInfo, ADBUSBDevice};
use adb_client::{ADBDeviceExt, ADBListItem, ADBListItemType, RebootType, RustADBError};
use base64::{engine::general_purpose::STANDARD, Engine};
use chrono::Utc;
use num_bigint_dig::{BigUint, ModInverse};
use num_traits::{FromPrimitive, ToPrimitive};
use rsa::pkcs8::{EncodePrivateKey, LineEnding};
use rsa::traits::PublicKeyParts;
use rsa::RsaPrivateKey;
use serde::{Deserialize, Serialize};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Once;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdbUsbDevice {
    pub id: String,
    pub vendor_id: u16,
    pub product_id: u16,
    pub description: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdbListEntry {
    pub name: String,
    pub entry_type: String,
    pub size: u32,
    pub permissions: u32,
    pub modified_time: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdbStatResult {
    pub file_perm: u32,
    pub file_size: u32,
    pub mod_time: u32,
    pub source: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AdbRebootMode {
    Normal,
    Bootloader,
    Recovery,
    Fastboot,
}

static TRANSFER_ACTIVE: AtomicBool = AtomicBool::new(false);
static ADB_KEY_LOGGED: Once = Once::new();
const ADB_PRIVATE_KEY_SIZE: usize = 2048;
const ANDROID_PUBKEY_MODULUS_SIZE_WORDS: u32 = 64;

#[tauri::command]
pub async fn adb_list_devices() -> Result<Vec<AdbUsbDevice>, AppError> {
    let devices = find_all_connected_adb_devices()
        .map_err(|err| AppError::command(format!("Failed to list ADB devices: {err}")))?;

    Ok(devices
        .into_iter()
        .map(|device| AdbUsbDevice {
            id: adb_device_id(&device),
            vendor_id: device.vendor_id,
            product_id: device.product_id,
            description: device.device_description,
        })
        .collect())
}

#[tauri::command]
pub async fn adb_shell_command(
    app: AppHandle,
    device_id: String,
    command: String,
    operation_id: String,
) -> Result<(), AppError> {
    emit_operation_output(&app, &operation_id, &format!("$ {command}"), false);

    let mut device = open_device(&device_id)?;
    let mut stdout = Vec::new();
    let mut stderr = Vec::new();
    let exit_code = device
        .shell_command(&command, Some(&mut stdout), Some(&mut stderr))
        .map_err(|err| map_adb_error(err, "ADB shell failed"));

    match exit_code {
        Ok(code) => {
            emit_output_bytes(&app, &operation_id, &stdout, false);
            emit_output_bytes(&app, &operation_id, &stderr, true);
            if let Some(code) = code {
                if code != 0 {
                    let message = format!("Shell exited with code {code}");
                    emit_operation_output(&app, &operation_id, &message, true);
                    emit_operation_complete(&app, &operation_id, false, Some(message.clone()));
                    return Err(AppError::command(message));
                }
            }
            emit_operation_complete(&app, &operation_id, true, None);
            Ok(())
        }
        Err(err) => {
            emit_operation_output(&app, &operation_id, &err.message(), true);
            emit_operation_complete(&app, &operation_id, false, Some(err.message()));
            Err(err)
        }
    }
}

#[tauri::command]
pub async fn adb_list(
    app: AppHandle,
    device_id: String,
    path: String,
    operation_id: String,
) -> Result<Vec<AdbListEntry>, AppError> {
    emit_operation_output(&app, &operation_id, &format!("Listing: {path}"), false);
    let mut device = open_device(&device_id)?;
    let entries = device
        .list(&path)
        .map_err(|err| map_adb_error(err, "ADB list failed"));

    match entries {
        Ok(entries) => {
            let mapped: Vec<AdbListEntry> = entries
                .into_iter()
                .map(map_list_entry)
                .collect();
            emit_operation_complete(&app, &operation_id, true, None);
            Ok(mapped)
        }
        Err(err) => {
            emit_operation_output(&app, &operation_id, &err.message(), true);
            emit_operation_complete(&app, &operation_id, false, Some(err.message()));
            Err(err)
        }
    }
}

#[tauri::command]
pub async fn adb_stat(
    app: AppHandle,
    device_id: String,
    path: String,
    operation_id: String,
) -> Result<AdbStatResult, AppError> {
    emit_operation_output(&app, &operation_id, &format!("Stat: {path}"), false);
    let mut device = open_device(&device_id)?;
    let result = device
        .stat(&path)
        .map_err(|err| map_adb_error(err, "ADB stat failed"));

    match result {
        Ok(stat) => {
            if stat.file_perm == 0 && stat.file_size == 0 && stat.mod_time == 0 {
                if let Ok(shell_stat) = shell_stat_fallback(&mut device, &path) {
                    emit_operation_complete(&app, &operation_id, true, None);
                    return Ok(shell_stat);
                }
            }

            emit_operation_complete(&app, &operation_id, true, None);
            Ok(AdbStatResult {
                file_perm: stat.file_perm,
                file_size: stat.file_size,
                mod_time: stat.mod_time,
                source: "adb".to_string(),
            })
        }
        Err(err) => {
            emit_operation_output(&app, &operation_id, &err.message(), true);
            emit_operation_complete(&app, &operation_id, false, Some(err.message()));
            Err(err)
        }
    }
}

#[tauri::command]
pub async fn adb_push(
    app: AppHandle,
    device_id: String,
    local_path: String,
    remote_path: String,
    operation_id: String,
) -> Result<(), AppError> {
    let _guard = acquire_transfer_guard(&app, &operation_id)?;
    emit_operation_output(
        &app,
        &operation_id,
        &format!("Pushing {local_path} -> {remote_path}"),
        false,
    );

    let local_path_ref = Path::new(&local_path);
    if !local_path_ref.is_file() {
        let message = format!("File not found: {local_path}");
        emit_operation_output(&app, &operation_id, &message, true);
        emit_operation_complete(&app, &operation_id, false, Some(message.clone()));
        return Err(AppError::command(message));
    }

    let metadata = std::fs::metadata(local_path_ref)
        .map_err(|err| AppError::command(format!("Failed to read file: {err}")))?;
    let total = metadata.len();

    let mut device = open_device(&device_id)?;
    let file = std::fs::File::open(local_path_ref)
        .map_err(|err| AppError::command(format!("Failed to open file: {err}")))?;
    let emitter = ProgressEmitter::new(app.clone(), total, "write".into());
    let mut reader = ProgressRead::new(file, total, emitter);

    let result = device
        .push(&mut reader, &remote_path)
        .map_err(|err| map_adb_error(err, "ADB push failed"));

    match result {
        Ok(()) => {
            emit_operation_complete(&app, &operation_id, true, None);
            Ok(())
        }
        Err(err) => {
            emit_operation_output(&app, &operation_id, &err.message(), true);
            emit_operation_complete(&app, &operation_id, false, Some(err.message()));
            Err(err)
        }
    }
}

#[tauri::command]
pub async fn adb_pull(
    app: AppHandle,
    device_id: String,
    remote_path: String,
    local_path: String,
    operation_id: String,
) -> Result<(), AppError> {
    let _guard = acquire_transfer_guard(&app, &operation_id)?;
    emit_operation_output(
        &app,
        &operation_id,
        &format!("Pulling {remote_path} -> {local_path}"),
        false,
    );

    let mut device = open_device(&device_id)?;
    let stat = device
        .stat(&remote_path)
        .map_err(|err| map_adb_error(err, "ADB stat failed"));
    let stat = match stat {
        Ok(stat) => stat,
        Err(err) => {
            emit_operation_output(&app, &operation_id, &err.message(), true);
            emit_operation_complete(&app, &operation_id, false, Some(err.message()));
            return Err(err);
        }
    };

    let local_path_ref = Path::new(&local_path);
    let parent = local_path_ref.parent().ok_or_else(|| {
        AppError::command(format!("Invalid output path: {local_path}"))
    })?;
    std::fs::create_dir_all(parent)
        .map_err(|err| AppError::command(format!("Failed to create output dir: {err}")))?;

    let file = std::fs::File::create(local_path_ref)
        .map_err(|err| AppError::command(format!("Failed to create file: {err}")))?;
    let total = stat.file_size as u64;
    let emitter = ProgressEmitter::new(app.clone(), total, "read".into());
    let mut writer = ProgressWrite::new(file, total, emitter);

    let result = device
        .pull(&remote_path, &mut writer)
        .map_err(|err| map_adb_error(err, "ADB pull failed"));

    match result {
        Ok(()) => {
            emit_operation_complete(&app, &operation_id, true, None);
            Ok(())
        }
        Err(err) => {
            emit_operation_output(&app, &operation_id, &err.message(), true);
            emit_operation_complete(&app, &operation_id, false, Some(err.message()));
            Err(err)
        }
    }
}

#[tauri::command]
pub async fn adb_auth_check(
    app: AppHandle,
    device_id: String,
    operation_id: String,
) -> Result<(), AppError> {
    emit_operation_output(
        &app,
        &operation_id,
        "Checking ADB authorization...",
        false,
    );

    let mut device = open_device(&device_id)?;
    let mut stdout = Vec::new();
    let mut stderr = Vec::new();
    let result = device
        .shell_command(&"echo ok", Some(&mut stdout), Some(&mut stderr))
        .map_err(|err| map_adb_error(err, "ADB authorization check failed"));

    match result {
        Ok(_) => {
            emit_output_bytes(&app, &operation_id, &stdout, false);
            emit_output_bytes(&app, &operation_id, &stderr, true);
            emit_operation_complete(&app, &operation_id, true, None);
            Ok(())
        }
        Err(err) => {
            emit_operation_output(&app, &operation_id, &err.message(), true);
            emit_operation_complete(&app, &operation_id, false, Some(err.message()));
            Err(err)
        }
    }
}

#[tauri::command]
pub async fn adb_install(
    app: AppHandle,
    device_id: String,
    apk_path: String,
    operation_id: String,
) -> Result<(), AppError> {
    let apk_path_ref = Path::new(&apk_path);
    if !apk_path_ref.is_file() {
        let message = format!("APK not found: {apk_path}");
        emit_operation_output(&app, &operation_id, &message, true);
        emit_operation_complete(&app, &operation_id, false, Some(message.clone()));
        return Err(AppError::command(message));
    }

    emit_operation_output(
        &app,
        &operation_id,
        &format!("Installing {apk_path} (push + pm install)"),
        false,
    );
    fallback_pm_install(&app, &device_id, &apk_path, &operation_id)
}

#[tauri::command]
pub async fn adb_uninstall(
    app: AppHandle,
    device_id: String,
    package_name: String,
    operation_id: String,
) -> Result<(), AppError> {
    emit_operation_output(
        &app,
        &operation_id,
        &format!("Uninstalling {package_name}"),
        false,
    );
    let mut device = open_device(&device_id)?;
    let result = device
        .uninstall(&package_name, None)
        .map_err(|err| map_adb_error(err, "ADB uninstall failed"));

    match result {
        Ok(()) => {
            emit_operation_complete(&app, &operation_id, true, None);
            Ok(())
        }
        Err(err) => {
            emit_operation_output(&app, &operation_id, &err.message(), true);
            emit_operation_complete(&app, &operation_id, false, Some(err.message()));
            Err(err)
        }
    }
}

#[tauri::command]
pub async fn adb_system_action(
    app: AppHandle,
    device_id: String,
    action: String,
    operation_id: String,
) -> Result<(), AppError> {
    emit_operation_output(&app, &operation_id, &format!("ADB {action}"), false);
    let mut device = open_device(&device_id)?;

    let result = match action.as_str() {
        "root" => device
            .root()
            .map_err(|err| map_adb_error(err, "ADB root failed")),
        "remount" => device
            .remount()
            .map_err(|err| map_adb_error(err, "ADB remount failed"))
            .map(|_| ()),
        "enable-verity" => device
            .enable_verity()
            .map_err(|err| map_adb_error(err, "ADB enable verity failed")),
        "disable-verity" => device
            .disable_verity()
            .map_err(|err| map_adb_error(err, "ADB disable verity failed")),
        _ => Err(AppError::command(format!("Unknown action: {action}"))),
    };

    match result {
        Ok(()) => {
            emit_operation_complete(&app, &operation_id, true, None);
            Ok(())
        }
        Err(err) => {
            emit_operation_output(&app, &operation_id, &err.message(), true);
            emit_operation_complete(&app, &operation_id, false, Some(err.message()));
            Err(err)
        }
    }
}

#[tauri::command]
pub async fn adb_reboot(
    app: AppHandle,
    device_id: String,
    mode: AdbRebootMode,
    operation_id: String,
) -> Result<(), AppError> {
    emit_operation_output(&app, &operation_id, &format!("Rebooting: {mode:?}"), false);
    let mut device = open_device(&device_id)?;
    let reboot_type = match mode {
        AdbRebootMode::Normal => RebootType::System,
        AdbRebootMode::Bootloader => RebootType::Bootloader,
        AdbRebootMode::Recovery => RebootType::Recovery,
        AdbRebootMode::Fastboot => RebootType::Fastboot,
    };
    let result = device
        .reboot(reboot_type)
        .map_err(|err| map_adb_error(err, "ADB reboot failed"));

    match result {
        Ok(()) => {
            emit_operation_complete(&app, &operation_id, true, None);
            Ok(())
        }
        Err(err) => {
            emit_operation_output(&app, &operation_id, &err.message(), true);
            emit_operation_complete(&app, &operation_id, false, Some(err.message()));
            Err(err)
        }
    }
}

#[tauri::command]
pub async fn adb_framebuffer_save(
    app: AppHandle,
    device_id: String,
    operation_id: String,
) -> Result<String, AppError> {
    let settings = load_settings().map_err(|err| AppError::command(err.to_string()))?;
    let output_dir = settings
        .default_output_path
        .ok_or_else(|| AppError::command("Default output path not configured"))?;
    validate_output_dir(&output_dir, "Output directory")?;

    let filename = format!("adb_screenshot_{}.png", Utc::now().format("%Y%m%d_%H%M%S"));
    let output_path = PathBuf::from(output_dir).join(filename);

    emit_operation_output(
        &app,
        &operation_id,
        &format!("Saving framebuffer to {}", output_path.display()),
        false,
    );

    let mut device = open_device(&device_id)?;
    let result = device
        .framebuffer(&output_path)
        .map_err(|err| map_adb_error(err, "ADB framebuffer failed"));

    match result {
        Ok(()) => {
            emit_operation_complete(&app, &operation_id, true, None);
            Ok(output_path.to_string_lossy().to_string())
        }
        Err(err) => {
            emit_operation_output(&app, &operation_id, &err.message(), true);
            emit_operation_complete(&app, &operation_id, false, Some(err.message()));
            Err(err)
        }
    }
}

fn adb_device_id(info: &ADBDeviceInfo) -> String {
    format!(
        "{:04x}:{:04x}:{}",
        info.vendor_id,
        info.product_id,
        info.device_description.replace(' ', "_")
    )
}

fn find_device_info(device_id: &str) -> Result<ADBDeviceInfo, AppError> {
    let devices = find_all_connected_adb_devices()
        .map_err(|err| AppError::command(format!("Failed to list ADB devices: {err}")))?;
    for device in devices {
        if adb_device_id(&device) == device_id {
            return Ok(device);
        }
    }
    Err(AppError::command("ADB device not found"))
}

fn open_device(device_id: &str) -> Result<ADBUSBDevice, AppError> {
    let info = find_device_info(device_id)?;
    let key_path = ensure_adb_key_path()?;
    ADBUSBDevice::new_with_custom_private_key(info.vendor_id, info.product_id, key_path)
        .map_err(|err| map_adb_error(err, "Failed to open ADB device"))
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

fn emit_operation_progress(app: &AppHandle, current: u64, total: u64, operation: &str) {
    if total == 0 {
        return;
    }
    let percentage = (current as f64 / total as f64 * 100.0) as f32;
    let event = FlashProgress {
        current,
        total,
        percentage,
        partition_name: "adb-transfer".to_string(),
        operation: operation.to_string(),
    };
    let _ = app.emit("operation:progress", event);
}

fn emit_output_bytes(app: &AppHandle, operation_id: &str, data: &[u8], is_stderr: bool) {
    if data.is_empty() {
        return;
    }
    let text = String::from_utf8_lossy(data);
    for line in text.lines() {
        if !line.trim().is_empty() {
            emit_operation_output(app, operation_id, line, is_stderr);
        }
    }
}

fn shell_stat_fallback(device: &mut ADBUSBDevice, path: &str) -> Result<AdbStatResult, AppError> {
    let mut stdout = Vec::new();
    let mut stderr = Vec::new();
    let command = format!("stat {path}");
    device
        .shell_command(&command, Some(&mut stdout), Some(&mut stderr))
        .map_err(|err| map_adb_error(err, "ADB shell stat failed"))?;

    let output = String::from_utf8_lossy(&stdout);
    parse_shell_stat(&output).ok_or_else(|| AppError::command("Failed to parse shell stat"))
}

fn parse_shell_stat(output: &str) -> Option<AdbStatResult> {
    let mut size: Option<u32> = None;
    let mut perm: Option<u32> = None;
    let mut mod_time: Option<u32> = None;

    for line in output.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("Size:") {
            let parts: Vec<&str> = trimmed.split_whitespace().collect();
            if parts.len() > 1 {
                size = parts[1].parse::<u32>().ok();
            }
        }

        if trimmed.starts_with("Access:") {
            if let Some(start) = trimmed.find('(') {
                if let Some(end) = trimmed[start + 1..].find('/') {
                    let mode = &trimmed[start + 1..start + 1 + end];
                    if let Ok(value) = u32::from_str_radix(mode, 8) {
                        perm = Some(value);
                    }
                }
            }
        }

        if trimmed.starts_with("Modify:") {
            let value = trimmed.trim_start_matches("Modify:").trim();
            if let Ok(parsed) = chrono::DateTime::parse_from_str(value, "%Y-%m-%d %H:%M:%S%.f %z") {
                if let Ok(timestamp) = u32::try_from(parsed.timestamp()) {
                    mod_time = Some(timestamp);
                }
            }
        }
    }

    Some(AdbStatResult {
        file_perm: perm.unwrap_or(0),
        file_size: size.unwrap_or(0),
        mod_time: mod_time.unwrap_or(0),
        source: "shell".to_string(),
    })
}

fn map_list_entry(entry: ADBListItemType) -> AdbListEntry {
    match entry {
        ADBListItemType::File(item) => map_list_item(item, "file"),
        ADBListItemType::Directory(item) => map_list_item(item, "directory"),
        ADBListItemType::Symlink(item) => map_list_item(item, "symlink"),
    }
}

fn map_list_item(item: ADBListItem, entry_type: &str) -> AdbListEntry {
    AdbListEntry {
        name: item.name,
        entry_type: entry_type.to_string(),
        size: item.size,
        permissions: item.permissions,
        modified_time: item.time,
    }
}

fn acquire_transfer_guard(app: &AppHandle, operation_id: &str) -> Result<TransferGuard, AppError> {
    if TRANSFER_ACTIVE
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_err()
    {
        let message = "A file transfer is already active".to_string();
        emit_operation_output(app, operation_id, &message, true);
        emit_operation_complete(app, operation_id, false, Some(message.clone()));
        return Err(AppError::command(message));
    }
    Ok(TransferGuard)
}

struct TransferGuard;

impl Drop for TransferGuard {
    fn drop(&mut self) {
        TRANSFER_ACTIVE.store(false, Ordering::SeqCst);
    }
}

struct ProgressEmitter {
    app: AppHandle,
    total: u64,
    operation: String,
    last_emitted: u64,
}

impl ProgressEmitter {
    fn new(app: AppHandle, total: u64, operation: String) -> Self {
        Self {
            app,
            total,
            operation,
            last_emitted: 0,
        }
    }

    fn emit(&mut self, current: u64) {
        if current == self.last_emitted {
            return;
        }
        if current - self.last_emitted < 1024 * 64 && current < self.total {
            return;
        }
        self.last_emitted = current;
        emit_operation_progress(&self.app, current, self.total, &self.operation);
    }
}

struct ProgressRead<R: Read> {
    inner: R,
    current: u64,
    total: u64,
    emitter: ProgressEmitter,
}

impl<R: Read> ProgressRead<R> {
    fn new(inner: R, total: u64, emitter: ProgressEmitter) -> Self {
        Self {
            inner,
            current: 0,
            total,
            emitter,
        }
    }
}

impl<R: Read> Read for ProgressRead<R> {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        let size = self.inner.read(buf)?;
        if size > 0 {
            self.current += size as u64;
            self.emitter.emit(self.current.min(self.total));
        }
        Ok(size)
    }
}

struct ProgressWrite<W: Write> {
    inner: W,
    current: u64,
    total: u64,
    emitter: ProgressEmitter,
}

impl<W: Write> ProgressWrite<W> {
    fn new(inner: W, total: u64, emitter: ProgressEmitter) -> Self {
        Self {
            inner,
            current: 0,
            total,
            emitter,
        }
    }
}

impl<W: Write> Write for ProgressWrite<W> {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        let size = self.inner.write(buf)?;
        if size > 0 {
            self.current += size as u64;
            self.emitter.emit(self.current.min(self.total));
        }
        Ok(size)
    }

    fn flush(&mut self) -> std::io::Result<()> {
        self.inner.flush()
    }
}

fn ensure_adb_key_path() -> Result<PathBuf, AppError> {
    let (key_path, source) = resolve_adb_key_path()?;
    ADB_KEY_LOGGED.call_once(|| {
        log::info!("ADB key path ({source}): {}", key_path.display());
    });
    if key_path.exists() {
        return Ok(key_path);
    }

    let parent = key_path
        .parent()
        .ok_or_else(|| AppError::command("Invalid adb key path"))?;
    std::fs::create_dir_all(parent)
        .map_err(|err| AppError::command(format!("Failed to create adb key dir: {err}")))?;

    let private_key = RsaPrivateKey::new(&mut rsa::rand_core::OsRng, ADB_PRIVATE_KEY_SIZE)
        .map_err(|err| AppError::command(format!("Failed to generate adb key: {err}")))?;
    let pem = private_key
        .to_pkcs8_pem(LineEnding::LF)
        .map_err(|err| AppError::command(format!("Failed to encode adb key: {err}")))?;
    std::fs::write(&key_path, pem.as_bytes())
        .map_err(|err| AppError::command(format!("Failed to write adb key: {err}")))?;

    let pub_key = encode_android_pubkey(&private_key)?;
    let pub_path = key_path.with_extension("pub");
    std::fs::write(&pub_path, pub_key.as_bytes())
        .map_err(|err| AppError::command(format!("Failed to write adb pub key: {err}")))?;

    Ok(key_path)
}

fn resolve_adb_key_path() -> Result<(PathBuf, &'static str), AppError> {
    if let Ok(override_path) = std::env::var("ANTUMBRA_ADB_KEY_PATH") {
        if !override_path.trim().is_empty() {
            return Ok((PathBuf::from(override_path), "env"));
        }
    }
    let android_user_home = std::env::var("ANDROID_USER_HOME")
        .ok()
        .map(|path| PathBuf::from(path).join("android"));
    let home_dir = dirs::home_dir().map(|home| home.join(".android"));
    let base = android_user_home
        .or(home_dir)
        .ok_or_else(|| AppError::command("Failed to resolve home directory"))?;
    Ok((base.join("adbkey"), "default"))
}

fn encode_android_pubkey(private_key: &RsaPrivateKey) -> Result<String, AppError> {
    let exponent = private_key
        .e()
        .to_u32()
        .ok_or_else(|| AppError::command("Failed to encode adb public key"))?;
    let modulus = private_key.n();
    let r32 = BigUint::from_u64(1u64 << 32)
        .ok_or_else(|| AppError::command("Failed to encode adb public key"))?;
    let r = BigUint::from(1u32) << ADB_PRIVATE_KEY_SIZE;
    let rr = r.modpow(&BigUint::from(2u32), modulus);
    let rem = modulus % &r32;
    let n0inv = rem
        .mod_inverse(&r32)
        .and_then(|v| v.to_biguint())
        .ok_or_else(|| AppError::command("Failed to encode adb public key"))?;
    let n0inv = (r32 - n0inv)
        .to_u32()
        .ok_or_else(|| AppError::command("Failed to encode adb public key"))?;

    let mut bytes: Vec<u8> = Vec::new();
    bytes.extend_from_slice(&ANDROID_PUBKEY_MODULUS_SIZE_WORDS.to_le_bytes());
    bytes.extend_from_slice(&n0inv.to_le_bytes());
    bytes.extend_from_slice(&modulus.to_bytes_le());
    bytes.extend_from_slice(&rr.to_bytes_le());
    bytes.extend_from_slice(&exponent.to_le_bytes());

    let mut encoded = STANDARD.encode(bytes);
    encoded.push(' ');
    encoded.push_str(&format!("{}@{}", env!("CARGO_PKG_NAME"), env!("CARGO_PKG_VERSION")));
    Ok(encoded)
}

fn map_adb_error(err: RustADBError, context: &str) -> AppError {
    let message = err.to_string();
    if message.contains("Expected CNXN")
        || message.contains("Expected CLSE")
        || message.contains("Expected STLS")
    {
        return AppError::command(format!(
            "ADB transport error. Device reset or handshake failed. Details: {message}"
        ));
    }
    if message.contains("Authentication required")
        || (message.contains("AUTH") && !message.contains("Expected CNXN"))
    {
        return AppError::command(format!(
            "ADB authorization failed. Enable USB debugging and accept the prompt on the device. Details: {message}"
        ));
    }
    if message.contains("Wrong response command received: WRTE")
        || message.contains("WRTE. Expected OKAY")
    {
        return AppError::command(format!(
            "ADB transfer failed. Check the remote path and device permissions. Details: {message}"
        ));
    }
    AppError::command(format!("{context}: {message}"))
}

fn open_device_with_retry(
    app: &AppHandle,
    operation_id: &str,
    device_id: &str,
    attempts: usize,
    delay: Duration,
) -> Result<ADBUSBDevice, AppError> {
    let mut last_error: Option<AppError> = None;
    for attempt in 1..=attempts {
        match open_device(device_id) {
            Ok(mut device) => {
                let mut stdout = Vec::new();
                let mut stderr = Vec::new();
                let result = device
                    .shell_command(&"echo ok", Some(&mut stdout), Some(&mut stderr))
                    .map_err(|err| map_adb_error(err, "ADB handshake failed"));
                if result.is_ok() {
                    emit_output_bytes(app, operation_id, &stdout, false);
                    emit_output_bytes(app, operation_id, &stderr, true);
                    return Ok(device);
                }
                last_error = result.err();
            }
            Err(err) => {
                last_error = Some(err);
            }
        }

        if attempt < attempts {
            emit_operation_output(
                app,
                operation_id,
                &format!("ADB connection failed; retrying ({attempt}/{attempts})..."),
                false,
            );
            std::thread::sleep(delay);
        }
    }

    Err(last_error.unwrap_or_else(|| AppError::command("Failed to open ADB device")))
}

fn fallback_pm_install(
    app: &AppHandle,
    device_id: &str,
    apk_path: &str,
    operation_id: &str,
) -> Result<(), AppError> {
    let _guard = acquire_transfer_guard(app, operation_id)?;
    let file_name = Path::new(apk_path)
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| AppError::command("Failed to resolve APK filename"))?;
    let remote_path = format!("/data/local/tmp/{file_name}");
    emit_operation_output(
        app,
        operation_id,
        &format!("Pushing APK to {remote_path}"),
        false,
    );

    let local_path_ref = Path::new(apk_path);
    let metadata = std::fs::metadata(local_path_ref)
        .map_err(|err| AppError::command(format!("Failed to read APK: {err}")))?;
    let total = metadata.len();
    let file = std::fs::File::open(local_path_ref)
        .map_err(|err| AppError::command(format!("Failed to open APK: {err}")))?;

    let mut device = match open_device_with_retry(
        app,
        operation_id,
        device_id,
        3,
        Duration::from_millis(400),
    ) {
        Ok(device) => device,
        Err(err) => {
            emit_operation_output(app, operation_id, &err.message(), true);
            emit_operation_complete(app, operation_id, false, Some(err.message()));
            return Err(err);
        }
    };
    let emitter = ProgressEmitter::new(app.clone(), total, "write".into());
    let mut reader = ProgressRead::new(file, total, emitter);
    let push_result = device
        .push(&mut reader, &remote_path)
        .map_err(|err| map_adb_error(err, "ADB push failed"));
    if let Err(err) = push_result {
        emit_operation_output(app, operation_id, &err.message(), true);
        emit_operation_complete(app, operation_id, false, Some(err.message()));
        return Err(err);
    }

    emit_operation_output(app, operation_id, "Running pm install", false);
    let mut stdout = Vec::new();
    let mut stderr = Vec::new();
    let command = format!("pm install {remote_path}");
    let result = device
        .shell_command(&command, Some(&mut stdout), Some(&mut stderr))
        .map_err(|err| map_adb_error(err, "ADB pm install failed"));

    emit_output_bytes(app, operation_id, &stdout, false);
    emit_output_bytes(app, operation_id, &stderr, true);

    let install_output = String::from_utf8_lossy(&stdout);
    let install_error = String::from_utf8_lossy(&stderr);

    let cleanup_command = format!("rm -f {remote_path}");
    let _ = device.shell_command(&cleanup_command, None, None);

    match result {
        Ok(code) => {
            if let Some(exit_code) = code {
                if exit_code != 0 {
                    let message = format!("pm install failed with code {exit_code}");
                    emit_operation_complete(app, operation_id, false, Some(message.clone()));
                    return Err(AppError::command(message));
                }
            }

            if install_output.contains("Success") {
                emit_operation_complete(app, operation_id, true, None);
                return Ok(());
            }

            if install_output.contains("Failure") || install_error.contains("Failure") {
                let message = format!(
                    "pm install failed: {}{}",
                    install_output.trim(),
                    if install_error.trim().is_empty() {
                        ""
                    } else {
                        " (see stderr)"
                    }
                );
                emit_operation_complete(app, operation_id, false, Some(message.clone()));
                return Err(AppError::command(message));
            }

            emit_operation_complete(app, operation_id, true, None);
            Ok(())
        }
        Err(err) => {
            emit_operation_output(app, operation_id, &err.message(), true);
            emit_operation_complete(app, operation_id, false, Some(err.message()));
            Err(err)
        }
    }
}
