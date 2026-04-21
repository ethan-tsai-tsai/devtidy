use std::path::Path;

use log::{error, info};

/// Write text content to the given file path.
///
/// Used by the frontend to persist CSV/JSON export data after the user has
/// chosen a save location via the system save-file dialog.
#[tauri::command]
pub fn write_export_file(path: String, content: String) -> Result<(), String> {
    let target = Path::new(&path);

    if let Some(parent) = target.parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            error!("Export destination directory does not exist: {}", parent.display());
            return Err("Destination directory does not exist".to_string());
        }
    }

    std::fs::write(target, content.as_bytes()).map_err(|e| {
        error!("Failed to write export file '{}': {e}", target.display());
        format!("Failed to write file: {e}")
    })?;

    info!("Exported report to: {}", target.display());
    Ok(())
}
