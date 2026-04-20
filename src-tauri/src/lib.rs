mod commands;
mod db;
pub mod scanner;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .manage(commands::scan::ScanState::new())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let db_path = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir")
                .join("devtidy.db");

            let conn = db::init(&db_path).expect("failed to initialise database");
            app.handle().manage(db::DbState(std::sync::Mutex::new(conn)));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::scan::scan_envs,
            commands::scan::cancel_scan,
            commands::delete::delete_env,
            commands::delete::delete_envs,
            commands::cache::load_scan_cache,
            commands::settings::get_settings,
            commands::settings::save_settings,
            commands::permissions::check_full_disk_access,
            commands::permissions::open_full_disk_access_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
