use tauri::State;

use crate::db::cache::ScanCache;
use crate::db::DbState;

/// Returns the most recent cached scan result, or null if none exists.
#[tauri::command]
pub fn load_scan_cache(db: State<'_, DbState>) -> Result<Option<ScanCache>, String> {
    let conn = db.0.lock().map_err(|e| format!("DB lock poisoned: {e}"))?;
    crate::db::cache::load_last(&conn).map_err(|e| format!("Failed to load scan cache: {e}"))
}
