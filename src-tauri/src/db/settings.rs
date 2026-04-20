use rusqlite::{Connection, Result as SqlResult};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    /// Maximum recursion depth for the directory walker (0 = unlimited).
    pub scan_depth: u32,
    /// Additional directory names to skip during scanning.
    pub extra_excludes: Vec<String>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            scan_depth: 0,
            extra_excludes: Vec::new(),
        }
    }
}

/// Loads all settings from the database, falling back to defaults for missing keys.
pub fn load(conn: &Connection) -> SqlResult<AppSettings> {
    let depth: u32 = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'scan_depth'",
            [],
            |row| row.get::<_, String>(0),
        )
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(0);

    let excludes: Vec<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'extra_excludes'",
            [],
            |row| row.get::<_, String>(0),
        )
        .ok()
        .map(|v| {
            if v.is_empty() {
                Vec::new()
            } else {
                v.split(',').map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect()
            }
        })
        .unwrap_or_default();

    Ok(AppSettings { scan_depth: depth, extra_excludes: excludes })
}

/// Persists all settings to the database.
pub fn save(conn: &Connection, settings: &AppSettings) -> SqlResult<()> {
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('scan_depth', ?1)",
        [settings.scan_depth.to_string()],
    )?;

    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('extra_excludes', ?1)",
        [settings.extra_excludes.join(",")],
    )?;

    Ok(())
}
