/// Opens macOS System Settings to the Full Disk Access pane.
/// No-op on non-macOS platforms.
#[tauri::command]
pub fn open_full_disk_access_settings() {
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles")
            .spawn();
    }
}

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
