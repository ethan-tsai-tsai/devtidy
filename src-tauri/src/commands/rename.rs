use std::path::PathBuf;

use log::{error, info};

/// Renames a virtual environment directory.
///
/// Validates before renaming:
/// - `new_name` must be a plain name (no path separators)
/// - The destination must not already exist
/// - Source must exist and be a directory
///
/// Returns the new absolute path on success.
/// Note: renaming Python venvs breaks internal symlinks — the caller is
/// responsible for warning the user before invoking this command.
#[tauri::command]
pub async fn rename_env(old_path: String, new_name: String) -> Result<String, String> {
    let new_name = new_name.trim().to_string();

    if new_name.is_empty() {
        return Err("Name cannot be empty".to_string());
    }
    if new_name.contains('/') || new_name.contains('\\') {
        return Err("Name cannot contain path separators".to_string());
    }

    let source = PathBuf::from(&old_path)
        .canonicalize()
        .map_err(|e| {
            error!("Failed to resolve rename source '{}': {e}", old_path);
            "Source path not found or inaccessible".to_string()
        })?;

    if !source.is_dir() {
        return Err("Source is not a directory".to_string());
    }

    let parent = source
        .parent()
        .ok_or_else(|| "Source has no parent directory".to_string())?;

    let dest = parent.join(&new_name);

    if dest.exists() {
        return Err(format!("A file or directory named '{new_name}' already exists"));
    }

    std::fs::rename(&source, &dest).map_err(|e| {
        error!("Failed to rename '{}' to '{}': {e}", source.display(), dest.display());
        format!("Rename failed: {e}")
    })?;

    let new_path = dest.to_string_lossy().into_owned();
    info!("Renamed '{}' → '{}'", source.display(), new_path);
    Ok(new_path)
}
