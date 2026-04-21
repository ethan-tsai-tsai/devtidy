use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

use chrono::{DateTime, Utc};
use jwalk::WalkDir;
use rayon::prelude::*;

use super::detector::{detect_env, find_project_root};
use super::sizer::dir_size;
use super::{EnvEntry, EnvType};

/// Configuration passed to [`scan`] to control scanner behaviour.
#[derive(Debug, Default)]
pub struct ScanConfig {
    /// Maximum directory depth (0 = unlimited).
    pub max_depth: u32,
    /// Additional directory names to skip (in addition to the built-in list).
    pub extra_excludes: Vec<String>,
}

/// Directories to skip during scanning (performance optimization).
const SKIP_DIRS: &[&str] = &[
    ".git",
    ".svn",
    ".hg",
    "__pycache__",
    ".cache",
    ".Trash",
    ".Spotlight-V100",
    ".fseventsd",
    "Library",
    "Applications",
    "$Recycle.Bin",
    "Windows",
    "Program Files",
    "Program Files (x86)",
];

/// Directories that are environments themselves — do not recurse into them.
const ENV_DIRS: &[&str] = &["node_modules", ".venv", "venv", "__pypackages__"];

/// Result of a scan operation.
pub struct ScanResult {
    pub entries: Vec<EnvEntry>,
    /// Directories skipped due to permission or I/O errors during the walk.
    pub skipped_count: u64,
}

/// Scans a root directory for virtual environments.
///
/// `on_progress` is called with the current directory path during the walk phase,
/// throttled to at most once per 100 ms to avoid IPC flooding.
///
/// Returns a [`ScanResult`] containing found environments and a count of
/// directories that could not be read (e.g., permission denied).
#[must_use]
pub fn scan(
    root: &Path,
    cancel: &AtomicBool,
    on_progress: impl Fn(&Path) + Send,
    config: &ScanConfig,
) -> ScanResult {
    use std::sync::atomic::AtomicU64;
    use std::sync::Arc;

    const PROGRESS_INTERVAL: Duration = Duration::from_millis(100);
    let mut last_progress = Instant::now() - PROGRESS_INTERVAL;
    let extra: Vec<String> = config.extra_excludes.clone();
    let skipped = Arc::new(AtomicU64::new(0));
    let skipped_walk = skipped.clone();

    // Phase 1: walk the tree, detect env type once per directory
    let mut walker = WalkDir::new(root)
        .skip_hidden(false)
        .follow_links(false)
        .sort(false);
    if config.max_depth > 0 {
        walker = walker.max_depth(config.max_depth as usize);
    }

    let detected: Vec<(PathBuf, EnvType)> = walker
        .process_read_dir(move |_depth, path, _state, children| {
            // If we are inside an environment directory, skip all children
            let parent_name = path
                .file_name()
                .map(|n| n.to_string_lossy())
                .unwrap_or_default();
            if ENV_DIRS.contains(&parent_name.as_ref()) {
                children.clear();
                return;
            }

            // Count entries that failed to read (permission errors, etc.)
            let errors = children.iter().filter(|e| e.is_err()).count() as u64;
            if errors > 0 {
                skipped_walk.fetch_add(errors, Ordering::Relaxed);
            }

            children.retain(|entry| {
                entry
                    .as_ref()
                    .map(|e| {
                        let ft = e.file_type();
                        if !ft.is_dir() {
                            return false;
                        }
                        let name = e.file_name().to_string_lossy();
                        !SKIP_DIRS.contains(&name.as_ref()) && !extra.iter().any(|ex| ex == name.as_ref())
                    })
                    .unwrap_or(false)
            });
        })
        .into_iter()
        .filter_map(|entry| {
            if cancel.load(Ordering::Acquire) {
                return None;
            }
            let entry = entry.ok()?;
            if !entry.file_type().is_dir() {
                return None;
            }
            let path = entry.path();
            let now = Instant::now();
            if now.duration_since(last_progress) >= PROGRESS_INTERVAL {
                last_progress = now;
                on_progress(&path);
            }
            detect_env(&path).map(|env_type| (path, env_type))
        })
        .collect();

    if cancel.load(Ordering::Acquire) {
        return ScanResult { entries: Vec::new(), skipped_count: 0 };
    }

    // Phase 2: enrich each detected env with size, metadata, project info (parallel)
    let entries = detected
        .par_iter()
        .filter_map(|(path, env_type)| {
            if cancel.load(Ordering::Acquire) {
                return None;
            }
            let size_bytes = dir_size(path);
            let last_modified = get_last_modified(path);
            let project_path = find_project_root(path);
            let has_project_file = project_path.is_some();

            Some(EnvEntry {
                path: path.clone(),
                env_type: env_type.clone(),
                size_bytes,
                last_modified,
                project_path,
                has_project_file,
            })
        })
        .collect();

    ScanResult {
        entries,
        skipped_count: skipped.load(Ordering::Relaxed),
    }
}

fn get_last_modified(path: &Path) -> DateTime<Utc> {
    std::fs::metadata(path)
        .and_then(|m| m.modified())
        .map(DateTime::<Utc>::from)
        .unwrap_or(DateTime::UNIX_EPOCH)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn setup_test_tree() -> TempDir {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();

        // Python venv project
        let proj = root.join("my-project");
        fs::create_dir_all(proj.join(".venv")).unwrap();
        fs::write(proj.join(".venv/pyvenv.cfg"), "home = /usr/bin\n").unwrap();
        fs::write(proj.join("requirements.txt"), "flask\n").unwrap();

        // node_modules project
        let node_proj = root.join("web-app");
        fs::create_dir_all(node_proj.join("node_modules")).unwrap();
        fs::write(node_proj.join("package.json"), "{}\n").unwrap();

        // Orphan venv (no project files)
        let orphan = root.join("old-stuff/.venv");
        fs::create_dir_all(&orphan).unwrap();
        fs::write(orphan.join("pyvenv.cfg"), "home = /usr/bin\n").unwrap();

        tmp
    }

    #[test]
    fn finds_all_environments() {
        let tmp = setup_test_tree();
        let cancel = AtomicBool::new(false);

        let result = scan(tmp.path(), &cancel, |_| {}, &ScanConfig::default());

        assert_eq!(result.entries.len(), 3);
    }

    #[test]
    fn identifies_orphan_environments() {
        let tmp = setup_test_tree();
        let cancel = AtomicBool::new(false);

        let result = scan(tmp.path(), &cancel, |_| {}, &ScanConfig::default());
        let orphans: Vec<_> = result.entries.iter().filter(|e| !e.has_project_file).collect();

        assert_eq!(orphans.len(), 1);
        assert!(orphans[0].path.to_string_lossy().contains("old-stuff"));
    }

    #[test]
    fn respects_cancellation() {
        let tmp = setup_test_tree();
        let cancel = AtomicBool::new(true);

        let result = scan(tmp.path(), &cancel, |_| {}, &ScanConfig::default());

        assert!(result.entries.is_empty());
    }

    #[test]
    fn skips_nested_node_modules() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();

        // Top-level node_modules with nested .pnpm structure
        let proj = root.join("web-app");
        fs::create_dir_all(proj.join("node_modules/.pnpm/some-pkg/node_modules")).unwrap();
        fs::write(proj.join("package.json"), "{}\n").unwrap();

        let cancel = AtomicBool::new(false);
        let result = scan(root, &cancel, |_| {}, &ScanConfig::default());

        // Should only find the top-level node_modules, not the nested one
        let nm_results: Vec<_> = result.entries
            .iter()
            .filter(|e| e.env_type == EnvType::NodeModules)
            .collect();
        assert_eq!(nm_results.len(), 1);
        assert!(nm_results[0].path.ends_with("node_modules"));
        assert!(!nm_results[0].path.to_string_lossy().contains(".pnpm"));
    }

    #[test]
    fn reports_progress_during_scan() {
        let tmp = setup_test_tree();
        let cancel = AtomicBool::new(false);
        let count = std::sync::atomic::AtomicUsize::new(0);

        let _ = scan(tmp.path(), &cancel, |_| {
            count.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        }, &ScanConfig::default());

        // Progress should fire at least once for a non-trivial tree.
        // Exact count is throttled, but with a fresh timer it fires on first dir.
        assert!(count.load(std::sync::atomic::Ordering::Relaxed) > 0);
    }

    #[test]
    fn skips_git_directories() {
        let tmp = TempDir::new().unwrap();
        let git_nm = tmp.path().join(".git/node_modules");
        fs::create_dir_all(&git_nm).unwrap();

        let cancel = AtomicBool::new(false);
        let result = scan(tmp.path(), &cancel, |_| {}, &ScanConfig::default());

        assert!(result.entries.is_empty());
    }
}
