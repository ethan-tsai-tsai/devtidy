use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Instant;

use chrono::Utc;
use log::{error, warn};
use serde::Serialize;
use tauri::ipc::Channel;
use tauri::State;

use crate::db::cache::ScanCache;
use crate::db::DbState;
use crate::scanner::walker::{self, ScanConfig};
use crate::scanner::EnvEntry;

/// Shared state for scan cancellation, managed per-invocation.
pub struct ScanState {
    cancel: Mutex<Arc<AtomicBool>>,
}

impl ScanState {
    pub fn new() -> Self {
        Self {
            cancel: Mutex::new(Arc::new(AtomicBool::new(false))),
        }
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "event", content = "data")]
pub enum ScanEvent {
    #[serde(rename_all = "camelCase")]
    Started { root: String },
    #[serde(rename_all = "camelCase")]
    Completed {
        results: Vec<EnvEntry>,
        duration_ms: u64,
    },
    #[serde(rename = "cancelled")]
    Cancelled,
    #[serde(rename_all = "camelCase")]
    Progress { current_path: String },
    #[serde(rename_all = "camelCase")]
    Error { message: String },
}

#[tauri::command]
pub async fn scan_envs(
    root: String,
    on_event: Channel<ScanEvent>,
    state: State<'_, ScanState>,
    db: State<'_, DbState>,
) -> Result<(), String> {
    let canonical = PathBuf::from(&root)
        .canonicalize()
        .map_err(|e| format!("Failed to resolve path: {e}"))?;

    if !canonical.is_dir() {
        let _ = on_event.send(ScanEvent::Error {
            message: format!("Path is not a directory: {root}"),
        });
        return Err(format!("Path is not a directory: {root}"));
    }

    if canonical.parent().is_none() {
        return Err("Refusing to scan filesystem root".to_string());
    }

    // Cancel any prior scan and create a fresh flag for this invocation.
    let flag = Arc::new(AtomicBool::new(false));
    {
        let mut guard = state
            .cancel
            .lock()
            .map_err(|e| format!("Lock poisoned: {e}"))?;
        guard.store(true, Ordering::Release);
        *guard = flag.clone();
    }

    on_event
        .send(ScanEvent::Started {
            root: canonical.to_string_lossy().into_owned(),
        })
        .map_err(|e| format!("Channel closed before scan started: {e}"))?;

    // Load scan config from settings.
    let scan_config = db
        .0
        .lock()
        .ok()
        .and_then(|conn| crate::db::settings::load(&conn).ok())
        .map(|s| ScanConfig {
            max_depth: s.scan_depth,
            extra_excludes: s.extra_excludes,
        })
        .unwrap_or_default();

    let scan_flag = flag.clone();
    let progress_channel = on_event.clone();
    let start = Instant::now();

    let results = tauri::async_runtime::spawn_blocking(move || {
        walker::scan(&canonical, &scan_flag, |path| {
            let _ = progress_channel.send(ScanEvent::Progress {
                current_path: path.to_string_lossy().into_owned(),
            });
        }, &scan_config)
    })
    .await
    .map_err(|e| format!("Scan task failed: {e}"))?;

    if flag.load(Ordering::Acquire) {
        if let Err(e) = on_event.send(ScanEvent::Cancelled) {
            warn!("Failed to send cancel event: {e}");
        }
        return Ok(());
    }

    let duration_ms = start.elapsed().as_millis() as u64;

    // Persist scan results to cache.
    let root_str = root.clone();
    let cache = ScanCache {
        root_path: root_str,
        scanned_at: Utc::now().to_rfc3339(),
        duration_ms: duration_ms as i64,
        results: results.clone(),
    };
    if let Ok(conn) = db.0.lock() {
        if let Err(e) = crate::db::cache::save(&conn, &cache) {
            error!("Failed to save scan cache: {e}");
        }
    }

    if let Err(e) = on_event.send(ScanEvent::Completed { results, duration_ms }) {
        warn!("Failed to send completed event: {e}");
    }

    Ok(())
}

#[tauri::command]
pub fn cancel_scan(state: State<'_, ScanState>) {
    if let Ok(guard) = state.cancel.lock() {
        guard.store(true, Ordering::Release);
    }
}
