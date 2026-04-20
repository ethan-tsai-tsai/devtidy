use rusqlite::{Connection, Result as SqlResult};
use serde::{Deserialize, Serialize};

use crate::scanner::EnvEntry;

#[derive(Debug, Serialize, Deserialize)]
pub struct ScanCache {
    pub root_path: String,
    pub scanned_at: String,
    pub duration_ms: i64,
    pub results: Vec<EnvEntry>,
}

/// Saves a completed scan result to the database, keeping only the latest entry.
pub fn save(conn: &Connection, cache: &ScanCache) -> SqlResult<()> {
    let results_json = serde_json::to_string(&cache.results)
        .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

    // Keep only the most recent scan to avoid unbounded growth.
    conn.execute("DELETE FROM scan_cache", [])?;

    conn.execute(
        "INSERT INTO scan_cache (root_path, scanned_at, duration_ms, results_json)
         VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![cache.root_path, cache.scanned_at, cache.duration_ms, results_json],
    )?;

    Ok(())
}

/// Loads the most recent cached scan result, if any.
pub fn load_last(conn: &Connection) -> SqlResult<Option<ScanCache>> {
    let result = conn.query_row(
        "SELECT root_path, scanned_at, duration_ms, results_json
         FROM scan_cache
         ORDER BY id DESC
         LIMIT 1",
        [],
        |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, String>(3)?,
            ))
        },
    );

    match result {
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
        Ok((root_path, scanned_at, duration_ms, results_json)) => {
            let results: Vec<EnvEntry> = serde_json::from_str(&results_json)
                .map_err(|e| rusqlite::Error::FromSqlConversionFailure(
                    3,
                    rusqlite::types::Type::Text,
                    Box::new(e),
                ))?;
            Ok(Some(ScanCache { root_path, scanned_at, duration_ms, results }))
        }
    }
}
