use tauri::State;

use crate::db::settings::{load, save, AppSettings};
use crate::db::DbState;

/// Returns current application settings from the database.
#[tauri::command]
pub fn get_settings(db: State<'_, DbState>) -> Result<AppSettings, String> {
    let conn = db.0.lock().map_err(|e| format!("DB lock poisoned: {e}"))?;
    load(&conn).map_err(|e| format!("Failed to load settings: {e}"))
}

/// Persists updated application settings to the database.
#[tauri::command]
pub fn save_settings(db: State<'_, DbState>, settings: AppSettings) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| format!("DB lock poisoned: {e}"))?;
    save(&conn, &settings).map_err(|e| format!("Failed to save settings: {e}"))
}
