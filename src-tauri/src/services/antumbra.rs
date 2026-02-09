/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2025 Shomy
*/

use crate::models::{OperationCompleteEvent, OperationOutputEvent};
use anyhow::{Context, Result};
use chrono::Utc;
use std::collections::HashSet;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::AsyncReadExt;
use tokio::process::Command as TokioCommand;

pub struct AntumbraExecutor {
    binary_path: PathBuf,
    working_dir: PathBuf,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct AntumbraCommandInfo {
    pub command: String,
    pub args: Vec<String>,
    pub working_dir: String,
    pub started_at: String,
}

static LAST_COMMAND: OnceLock<Mutex<Option<AntumbraCommandInfo>>> = OnceLock::new();
static CURRENT_PID: OnceLock<Mutex<Option<u32>>> = OnceLock::new();

fn binary_name() -> &'static str {
    if cfg!(windows) { "antumbra.exe" } else { "antumbra" }
}

/// Read from a stream and emit lines split by either '\n' or '\r'
/// This handles progress bars that use carriage returns to update in place
async fn stream_lines<R>(
    mut reader: R,
    app: AppHandle,
    operation_id: String,
    is_stderr: bool,
    lines_storage: Arc<Mutex<Vec<String>>>,
    seen_lines: Arc<Mutex<HashSet<String>>>,
    last_output: Arc<AtomicU64>,
) where
    R: AsyncReadExt + Unpin,
{
    let mut buffer = Vec::new();
    let mut byte = [0u8; 1];

    loop {
        match reader.read_exact(&mut byte).await {
            Ok(_) => {
                last_output.store(now_millis(), Ordering::Relaxed);
                if byte[0] == b'\n' || byte[0] == b'\r' {
                    // Emit line if buffer is not empty
                    if !buffer.is_empty() {
                        if let Ok(line) = String::from_utf8(buffer.clone()) {
                            let line = line.trim().to_string();
                            if !line.is_empty() {
                                // Check if we've already emitted this exact line recently
                                let should_emit = match seen_lines.lock() {
                                    Ok(mut seen) => {
                                        if seen.contains(&line) {
                                            false
                                        } else {
                                            seen.insert(line.clone());
                                            true
                                        }
                                    }
                                    Err(_) => {
                                        log::warn!("Failed to lock seen lines; emitting anyway");
                                        true
                                    }
                                };

                                if should_emit {
                                    // Store for return value
                                    if let Ok(mut storage) = lines_storage.lock() {
                                        storage.push(line.clone());
                                    } else {
                                        log::warn!("Failed to lock output storage");
                                    }

                                    // Emit event
                                    let timestamp = Utc::now().to_rfc3339();
                                    let event = OperationOutputEvent {
                                        operation_id: operation_id.clone(),
                                        line,
                                        timestamp,
                                        is_stderr,
                                    };
                                    let _ = app.emit("operation:output", event);
                                }
                            }
                        }
                        buffer.clear();
                    }
                } else {
                    buffer.push(byte[0]);
                }
            }
            Err(_) => break, // EOF or error
        }
    }

    // Emit remaining buffer if any
    if !buffer.is_empty() {
        if let Ok(line) = String::from_utf8(buffer) {
            let line = line.trim().to_string();
            if !line.is_empty() {
                let should_emit = match seen_lines.lock() {
                    Ok(mut seen) => {
                        if seen.contains(&line) {
                            false
                        } else {
                            seen.insert(line.clone());
                            true
                        }
                    }
                    Err(_) => {
                        log::warn!("Failed to lock seen lines; emitting anyway");
                        true
                    }
                };

                if should_emit {
                    if let Ok(mut storage) = lines_storage.lock() {
                        storage.push(line.clone());
                    } else {
                        log::warn!("Failed to lock output storage");
                    }
                    let timestamp = Utc::now().to_rfc3339();
                    let event = OperationOutputEvent {
                        operation_id: operation_id.clone(),
                        line,
                        timestamp,
                        is_stderr,
                    };
                    let _ = app.emit("operation:output", event);
                }
            }
        }
    }
}

impl AntumbraExecutor {
    pub fn new(app: &AppHandle) -> Result<Self> {
        let binary_path = get_antumbra_path(app)?;
        let working_dir = get_antumbra_working_dir(app, &binary_path)?;
        log::info!("Antumbra binary path: {:?}", binary_path);
        log::info!("Antumbra working dir: {:?}", working_dir);
        log::info!("Antumbra binary exists: {}", binary_path.exists());
        if let Ok(metadata) = std::fs::metadata(&binary_path) {
            log::info!("Antumbra binary size: {} bytes", metadata.len());
        }

        // Ensure binary is executable
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = std::fs::metadata(&binary_path)?.permissions();
            perms.set_mode(0o755);
            std::fs::set_permissions(&binary_path, perms)?;
        }

        Ok(Self { binary_path, working_dir })
    }

    /// Execute antumbra without streaming (legacy/fallback method)
    #[allow(dead_code)]
    pub async fn execute(&self, args: Vec<String>) -> Result<String> {
        store_last_command(&self.binary_path, &self.working_dir, &args);
        log::info!("Executing antumbra with args: {:?} (cwd: {:?})", args, self.working_dir);

        let output = create_hidden_command(&self.binary_path, &args)
            .current_dir(&self.working_dir)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .context("Failed to execute antumbra")?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            anyhow::bail!("Antumbra failed: {}", stderr);
        }

        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    }

    /// Execute antumbra with real-time streaming output
    pub async fn execute_streaming(
        &self,
        app: AppHandle,
        operation_id: String,
        args: Vec<String>,
    ) -> Result<String> {
        store_last_command(&self.binary_path, &self.working_dir, &args);
        log::info!(
            "Executing antumbra (streaming) with args: {:?} (cwd: {:?})",
            args,
            self.working_dir
        );

        let mut child = {
        #[cfg(windows)]
        {
            let mut cmd = TokioCommand::new(&self.binary_path);
            cmd.args(&args)
                .current_dir(&self.working_dir)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());
            // CREATE_NO_WINDOW flag to hide console window
            cmd.creation_flags(0x08000000);
            cmd
        }
        #[cfg(not(windows))]
        {
            TokioCommand::new(&self.binary_path)
                .args(&args)
                .current_dir(&self.working_dir)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
        }
    }
    .spawn()
    .context("Failed to spawn antumbra process")?;

        set_current_pid(child.id());

        let stdout = child.stdout.take().context("Failed to take stdout")?;
        let stderr = child.stderr.take().context("Failed to take stderr")?;

        // Collect all output for return value
        let stdout_lines = Arc::new(Mutex::new(Vec::new()));
        let stderr_lines = Arc::new(Mutex::new(Vec::new()));
        let last_output = Arc::new(AtomicU64::new(now_millis()));

        // Shared deduplication cache across both stdout and stderr
        let seen_lines = Arc::new(Mutex::new(HashSet::new()));

        let app_clone1 = app.clone();
        let op_id_clone1 = operation_id.clone();
        let stdout_lines_clone = stdout_lines.clone();
        let seen_clone1 = seen_lines.clone();
        let last_output_clone1 = last_output.clone();
        let stdout_task = tokio::spawn(async move {
            stream_lines(
                stdout,
                app_clone1,
                op_id_clone1,
                false,
                stdout_lines_clone,
                seen_clone1,
                last_output_clone1,
            )
            .await;
        });

        let app_clone2 = app.clone();
        let op_id_clone2 = operation_id.clone();
        let stderr_lines_clone = stderr_lines.clone();
        let seen_clone2 = seen_lines.clone();
        let last_output_clone2 = last_output.clone();
        let stderr_task = tokio::spawn(async move {
            stream_lines(
                stderr,
                app_clone2,
                op_id_clone2,
                true,
                stderr_lines_clone,
                seen_clone2,
                last_output_clone2,
            )
            .await;
        });

        // Wait for process to complete or timeout due to inactivity
        let timeout_secs = 30u64;
        let mut interval = tokio::time::interval(Duration::from_secs(1));
        let status = loop {
            tokio::select! {
                status = child.wait() => break status.context("Failed to wait for process")?,
                _ = interval.tick() => {
                    let last = last_output.load(Ordering::Relaxed);
                    if now_millis().saturating_sub(last) > timeout_secs * 1000 {
                        let _ = child.kill().await;
                        clear_current_pid();
                        let error_msg = format!(
                            "Antumbra process timed out after {}s without output",
                            timeout_secs
                        );
                        let complete_event = OperationCompleteEvent {
                            operation_id: operation_id.clone(),
                            success: false,
                            error: Some(error_msg.clone()),
                        };
                        let _ = app.emit("operation:complete", complete_event);
                        anyhow::bail!(error_msg);
                    }
                }
            }
        };

        // Wait for streaming tasks to complete
        let _ = tokio::join!(stdout_task, stderr_task);

        // Collect all output
        let stdout_output = match stdout_lines.lock() {
            Ok(lines) => lines.join("\n"),
            Err(_) => {
                log::warn!("Failed to lock stdout storage for join");
                String::new()
            }
        };
        let stderr_output = match stderr_lines.lock() {
            Ok(lines) => lines.join("\n"),
            Err(_) => {
                log::warn!("Failed to lock stderr storage for join");
                String::new()
            }
        };

        clear_current_pid();

        // Emit completion event
        let complete_event = OperationCompleteEvent {
            operation_id: operation_id.clone(),
            success: status.success(),
            error: if status.success() { None } else { Some(stderr_output.clone()) },
        };

        app.emit("operation:complete", complete_event)
            .context("Failed to emit completion event")?;

        if !status.success() {
            anyhow::bail!("Antumbra process failed: {}", stderr_output);
        }

        Ok(stdout_output)
    }

    pub fn get_version(&self) -> Result<String> {
        store_last_command(&self.binary_path, &self.working_dir, &["--version".to_string()]);
        let output = create_hidden_command(&self.binary_path, &["--version".to_string()])
            .current_dir(&self.working_dir)
            .stdout(Stdio::piped())
            .output()
            .context("Failed to get antumbra version")?;

        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    }

    #[allow(dead_code)]
    pub fn get_binary_path(&self) -> &PathBuf {
        &self.binary_path
    }

}

fn set_current_pid(pid: Option<u32>) {
    let store = CURRENT_PID.get_or_init(|| Mutex::new(None));
    if let Ok(mut guard) = store.lock() {
        *guard = pid;
    }
}

fn clear_current_pid() {
    set_current_pid(None);
}

pub fn kill_current_process() -> Result<()> {
    let store = CURRENT_PID.get_or_init(|| Mutex::new(None));
    let pid = store.lock().ok().and_then(|guard| *guard);

    if let Some(pid) = pid {
        log::info!("Cancelling antumbra process (pid: {})", pid);
        #[cfg(unix)]
        unsafe {
            let result = libc::kill(pid as i32, libc::SIGKILL);
            if result != 0 {
                return Err(anyhow::anyhow!("Failed to kill process pid {}", pid));
            }
        }
        #[cfg(windows)]
        {
            kill_windows_process(pid)?;
        }
        #[cfg(not(any(unix, windows)))]
        {
            return Err(anyhow::anyhow!("Process cancellation not supported on this platform"));
        }
    }

    clear_current_pid();
    Ok(())
}

#[cfg(windows)]
fn kill_windows_process(pid: u32) -> Result<()> {
    use winapi::um::processthreadsapi::{OpenProcess, TerminateProcess};
    use winapi::um::handleapi::CloseHandle;
    use winapi::um::winnt::{PROCESS_TERMINATE, HANDLE};
    use winapi::um::errhandlingapi::GetLastError;

    unsafe {
        let handle = OpenProcess(PROCESS_TERMINATE, 0, pid);
        if handle.is_null() {
            let error = GetLastError();
            return Err(anyhow::anyhow!("Failed to open process {}: Error code {}", pid, error));
        }

        let result = TerminateProcess(handle as HANDLE, 1);
        if result == 0 {
            let error = GetLastError();
            return Err(anyhow::anyhow!("Failed to terminate process {}: Error code {}", pid, error));
        }

        CloseHandle(handle);
        log::info!("Successfully terminated antumbra process {}", pid);
        Ok(())
    }
}

fn create_hidden_command(binary_path: &std::path::Path, args: &[String]) -> std::process::Command {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let mut cmd = std::process::Command::new(binary_path);
        cmd.args(args);
        // CREATE_NO_WINDOW flag to hide console window
        cmd.creation_flags(0x08000000);
        cmd
    }
    #[cfg(not(windows))]
    {
        let mut cmd = std::process::Command::new(binary_path);
        cmd.args(args);
        cmd
    }
}

pub fn get_antumbra_updatable_path(app: &AppHandle) -> Result<PathBuf> {
    let config_dir = app.path().app_config_dir().context("Failed to get config directory")?;
    let bin_dir = config_dir.join("bin");
    std::fs::create_dir_all(&bin_dir).context("Failed to create antumbra bin directory")?;
    Ok(bin_dir.join(binary_name()))
}

pub fn get_last_command_info() -> Option<AntumbraCommandInfo> {
    LAST_COMMAND.get_or_init(|| Mutex::new(None)).lock().ok().and_then(|guard| guard.clone())
}

/// Sync detected antumbra version to configuration if config version is null
pub fn sync_detected_version_to_config(app: &AppHandle, detected_version: &str) -> Result<()> {
    use crate::services::config::{load_settings, save_settings};
    
    // Load current settings
    let mut settings = load_settings()
        .context("Failed to load settings for version sync")?;
    
    // Only update if version is None or different
    if settings.antumbra_version.is_none() || 
       settings.antumbra_version.as_ref() != Some(&detected_version.to_string()) {
        settings.antumbra_version = Some(detected_version.to_string());
        save_settings(&settings)
            .context("Failed to save synced version to config")?;
        log::info!("Synced detected antumbra version '{}' to configuration", detected_version);
    } else {
        log::debug!("Configuration already contains version {}, no sync needed", detected_version);
    }
    
    Ok(())
}

fn get_antumbra_working_dir(app: &AppHandle, binary_path: &PathBuf) -> Result<PathBuf> {
    if let Some(parent) = binary_path.parent() {
        if parent.is_dir() {
            if is_dir_writable(parent) {
                return Ok(parent.to_path_buf());
            } else {
                log::warn!(
                    "Antumbra binary directory is not writable: {}",
                    parent.display()
                );
            }
        }
    }

    let config_dir = app.path().app_config_dir().context("Failed to get config directory")?;
    std::fs::create_dir_all(&config_dir).context("Failed to create antumbra working directory")?;
    Ok(config_dir)
}

fn is_dir_writable(path: &std::path::Path) -> bool {
    let test_name = format!(".antumbra-write-test-{}", uuid::Uuid::new_v4());
    let test_path = path.join(test_name);
    if let Ok(file) = std::fs::OpenOptions::new().write(true).create_new(true).open(&test_path) {
        drop(file);
        let _ = std::fs::remove_file(&test_path);
        return true;
    }
    false
}

fn store_last_command(binary_path: &PathBuf, working_dir: &PathBuf, args: &[String]) {
    let info = AntumbraCommandInfo {
        command: binary_path.display().to_string(),
        args: args.to_vec(),
        working_dir: working_dir.display().to_string(),
        started_at: chrono::Utc::now().to_rfc3339(),
    };

    let store = LAST_COMMAND.get_or_init(|| Mutex::new(None));
    if let Ok(mut guard) = store.lock() {
        *guard = Some(info);
    }
}

fn now_millis() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as u64
}

pub fn get_existing_antumbra_path(app: &AppHandle) -> Result<Option<PathBuf>> {
    let updatable_path = get_antumbra_updatable_path(app)?;
    if updatable_path.exists() {
        return Ok(Some(updatable_path));
    }

    let resource_path = app.path().resource_dir().context("Failed to get resource directory")?;
    let resource_binary = resource_path.join(binary_name());
    if resource_binary.exists() {
        return Ok(Some(resource_binary));
    }

    Ok(None)
}

fn get_antumbra_path(app: &AppHandle) -> Result<PathBuf> {
    // Get resource directory
    if let Some(existing_path) = get_existing_antumbra_path(app)? {
        return Ok(existing_path);
    }

    let resource_path = app.path().resource_dir().context("Failed to get resource directory")?;
    let fallback_path = resource_path.join(binary_name());

    anyhow::bail!("Antumbra binary not found at {:?}", fallback_path)
}
