use std::path::Path;
use std::sync::Mutex;

use rusqlite::{Connection, Result as SqlResult};

pub mod cache;
pub mod settings;

/// Shared DB state managed by Tauri.
pub struct DbState(pub Mutex<Connection>);

/// Initialises the SQLite database, creating tables if they do not exist.
pub fn init(db_path: &Path) -> SqlResult<Connection> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).ok();
    }

    let conn = Connection::open(db_path)?;

    conn.execute_batch(
        "
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS scan_cache (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            root_path    TEXT    NOT NULL,
            scanned_at   TEXT    NOT NULL,
            duration_ms  INTEGER NOT NULL,
            results_json TEXT    NOT NULL
        );
        ",
    )?;

    Ok(conn)
}
