/// Checks whether the app has Full Disk Access on macOS by probing a
/// protected directory. On non-macOS platforms this always returns true.
#[tauri::command]
pub fn check_full_disk_access() -> bool {
    #[cfg(target_os = "macos")]
    {
        // ~/Library/Safari requires Full Disk Access; a PermissionDenied error
        // means FDA has not been granted.
        if let Ok(home) = std::env::var("HOME") {
            let path = std::path::Path::new(&home).join("Library").join("Safari");
            match std::fs::read_dir(path) {
                Ok(_) => return true,
                Err(e) if e.kind() == std::io::ErrorKind::PermissionDenied => return false,
                // Any other error (e.g. path doesn't exist) — assume access OK.
                Err(_) => return true,
            }
        }
        true
    }
    #[cfg(not(target_os = "macos"))]
    {
        true
    }
}
