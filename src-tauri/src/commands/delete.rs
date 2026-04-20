use std::path::PathBuf;

use log::{error, info};

const MIN_PATH_DEPTH: usize = 3;

fn validate_and_canonicalize(path: &str) -> Result<PathBuf, String> {
    let target = PathBuf::from(path)
        .canonicalize()
        .map_err(|e| {
            error!("Failed to resolve path '{path}': {e}");
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

    Ok(target)
}

/// Moves a virtual environment directory to the system trash.
#[tauri::command]
pub async fn delete_env(path: String) -> Result<String, String> {
    let target = validate_and_canonicalize(&path)?;
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

/// Moves multiple virtual environment directories to the system trash.
///
/// Processes each path independently. Returns the list of successfully deleted paths.
/// If any path fails validation or deletion, it is skipped and logged; the rest continue.
#[tauri::command]
pub async fn delete_envs(paths: Vec<String>) -> Result<Vec<String>, String> {
    let mut deleted = Vec::with_capacity(paths.len());

    for path in paths {
        match validate_and_canonicalize(&path) {
            Err(e) => {
                error!("Skipping invalid path '{}': {e}", path);
            }
            Ok(target) => {
                let display_path = target.to_string_lossy().into_owned();
                match tauri::async_runtime::spawn_blocking(move || trash::delete(&target)).await {
                    Ok(Ok(())) => {
                        info!("Moved to trash: {display_path}");
                        deleted.push(display_path);
                    }
                    Ok(Err(e)) => {
                        error!("Failed to move '{}' to trash: {e}", display_path);
                    }
                    Err(e) => {
                        error!("Delete task panicked for '{}': {e}", display_path);
                    }
                }
            }
        }
    }

    Ok(deleted)
}
