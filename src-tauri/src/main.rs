/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2025 Shomy
*/

// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod error;
mod models;
mod services;

fn init_logging() {
    let log_dir = dirs::config_dir()
        .map(|dir| dir.join("penumbra-wrapper"))
        .unwrap_or_else(|| std::env::temp_dir().join("penumbra-wrapper"));

    let _ = std::fs::create_dir_all(&log_dir);
    let log_file = log_dir.join("penumbra-wrapper.log");

    let log_file = match fern::log_file(log_file) {
        Ok(file) => file,
        Err(err) => {
            eprintln!("Failed to open log file: {}", err);
            return env_logger::init();
        }
    };

    let file_dispatch = fern::Dispatch::new()
        .format(|out, message, record| {
            out.finish(format_args!(
                "{} [{}] {}",
                chrono::Utc::now().to_rfc3339(),
                record.level(),
                message
            ))
        })
        .level(log::LevelFilter::Debug)
        .chain(log_file);

    let stdout_dispatch = fern::Dispatch::new()
        .format(|out, message, record| {
            out.finish(format_args!(
                "{} [{}] {}",
                chrono::Utc::now().to_rfc3339(),
                record.level(),
                message
            ))
        })
        .level(log::LevelFilter::Info)
        .chain(std::io::stdout());

    let logger = fern::Dispatch::new()
        .level(log::LevelFilter::Debug)
        .chain(stdout_dispatch)
        .chain(file_dispatch);

    if logger.apply().is_err() {
        env_logger::init();
    }
}

#[tokio::main]
async fn main() {
    init_logging();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_antumbra_version,
            commands::cancel_operation,
            commands::device::list_partitions,
            commands::device::reboot_device,
            commands::device::shutdown_device,
            commands::flash::flash_partition,
            commands::read::read_partition,
            commands::format::format_partition,
            commands::erase::erase_partition,
            commands::tools::read_all_partitions,
            commands::tools::seccfg_operation,
            commands::scatter::parse_scatter_file,
            commands::scatter::detect_image_files,
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::updates::get_antumbra_updatable_path,
            commands::updates::check_antumbra_update,
            commands::updates::download_antumbra_update,
            commands::diagnostics::get_wrapper_log_path,
            commands::diagnostics::read_wrapper_log,
            commands::diagnostics::read_antumbra_log,
            commands::diagnostics::get_last_antumbra_command,
        ])
        .setup(|_app| {
            // Initialize services on startup
            log::info!("PenumbraWrapper starting...");
            Ok(())
        })
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let _ = services::antumbra::kill_current_process();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
