mod commands;
pub mod scanner;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(commands::scan::ScanState::new())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::scan::scan_envs,
            commands::scan::cancel_scan,
            commands::delete::delete_env,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
