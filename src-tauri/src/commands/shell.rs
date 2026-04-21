use std::path::PathBuf;

use log::error;

/// Open the given directory path in the system's default terminal.
///
/// macOS: launches Terminal.app via `open -a Terminal <path>`
/// Linux: tries common terminal emulators in order
/// Windows: launches Windows Terminal or cmd
#[tauri::command]
pub fn open_in_terminal(path: String) -> Result<(), String> {
    let target = PathBuf::from(&path)
        .canonicalize()
        .map_err(|e| {
            error!("Failed to resolve path '{path}': {e}");
            "Path not found or inaccessible".to_string()
        })?;

    if !target.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let path_str = target.to_string_lossy().into_owned();

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-a", "Terminal", &path_str])
            .spawn()
            .map_err(|e| {
                error!("Failed to open Terminal for '{path_str}': {e}");
                format!("Failed to open Terminal: {e}")
            })?;
    }

    #[cfg(target_os = "linux")]
    {
        let terminals = ["gnome-terminal", "xterm", "konsole", "xfce4-terminal", "tilix"];
        let mut launched = false;
        for term in terminals {
            let result = std::process::Command::new(term)
                .arg("--working-directory")
                .arg(&path_str)
                .spawn();
            if result.is_ok() {
                launched = true;
                break;
            }
        }
        if !launched {
            error!("No supported terminal emulator found for '{path_str}'");
            return Err("No supported terminal emulator found".to_string());
        }
    }

    #[cfg(target_os = "windows")]
    {
        let result = std::process::Command::new("wt")
            .args(["-d", &path_str])
            .spawn();
        if result.is_err() {
            std::process::Command::new("cmd")
                .args(["/c", "start", "cmd", "/k", &format!("cd /d \"{}\"", path_str)])
                .spawn()
                .map_err(|e| {
                    error!("Failed to open terminal for '{path_str}': {e}");
                    format!("Failed to open terminal: {e}")
                })?;
        }
    }

    Ok(())
}
