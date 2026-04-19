use std::path::PathBuf;

use log::{error, info};

const MIN_PATH_DEPTH: usize = 3;

/// Moves a virtual environment directory to the system trash.
///
/// Validates the path before deletion:
/// - Must exist and be a directory
/// - Must not be a filesystem root
/// - Must have at least MIN_PATH_DEPTH components (prevents deleting top-level dirs)
/// - Path is canonicalized to prevent traversal attacks
#[tauri::command]
pub async fn delete_env(path: String) -> Result<String, String> {
    let target = PathBuf::from(&path)
        .canonicalize()
        .map_err(|e| {
            error!("Failed to resolve path '{}': {e}", path);
            "Path not found or inaccessible".to_string()
        })?;

    if !target.is_dir() {
        error!("Path is not a directory: {}", target.display());
        return Err("Path is not a directory".to_string());
    }

    if target.parent().is_none() {
        return Err("Refusing to delete filesystem root".to_string());
    }

    let depth = target.components().count();
    if depth < MIN_PATH_DEPTH {
        error!(
            "Path depth too shallow ({depth} < {MIN_PATH_DEPTH}): {}",
            target.display()
        );
        return Err("Cannot delete top-level directories".to_string());
    }

    let display_path = target.to_string_lossy().into_owned();

    tauri::async_runtime::spawn_blocking(move || trash::delete(&target))
        .await
        .map_err(|e| {
            error!("Delete task panicked for '{}': {e}", display_path);
            "Delete operation failed unexpectedly".to_string()
        })?
        .map_err(|e| {
            error!("Failed to move '{}' to trash: {e}", display_path);
            "Failed to move to trash".to_string()
        })?;

    info!("Moved to trash: {display_path}");

    Ok(display_path)
}
