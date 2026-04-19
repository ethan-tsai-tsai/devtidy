use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};

use chrono::{DateTime, Utc};
use jwalk::WalkDir;
use rayon::prelude::*;

use super::detector::{detect_env, find_project_root, has_project_files};
use super::sizer::dir_size;
use super::EnvEntry;

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

/// Scans a root directory for virtual environments.
pub fn scan(root: &Path, cancel: &AtomicBool) -> Vec<EnvEntry> {
    let detected: Vec<std::path::PathBuf> = WalkDir::new(root)
        .skip_hidden(false)
        .sort(false)
        .process_read_dir(|_depth, _path, _state, children| {
            children.retain(|entry| {
                entry
                    .as_ref()
                    .map(|e| {
                        let ft = e.file_type();
                        if !ft.is_dir() {
                            return false;
                        }
                        let name = e.file_name().to_string_lossy();
                        !SKIP_DIRS.contains(&name.as_ref())
                    })
                    .unwrap_or(false)
            });
        })
        .into_iter()
        .filter_map(|entry| {
            if cancel.load(Ordering::Relaxed) {
                return None;
            }
            let entry = entry.ok()?;
            if !entry.file_type().is_dir() {
                return None;
            }
            let path = entry.path();
            detect_env(&path).map(|_| path)
        })
        .collect();

    if cancel.load(Ordering::Relaxed) {
        return Vec::new();
    }

    detected
        .par_iter()
        .filter_map(|path| {
            if cancel.load(Ordering::Relaxed) {
                return None;
            }
            let env_type = detect_env(path)?;
            let size_bytes = dir_size(path);
            let last_modified = get_last_modified(path);
            let project_path = find_project_root(path);
            let has_project_file = project_path
                .as_ref()
                .map(|p| has_project_files(p))
                .unwrap_or(false);

            Some(EnvEntry {
                path: path.clone(),
                env_type,
                size_bytes,
                last_modified,
                project_path,
                has_project_file,
            })
        })
        .collect()
}

fn get_last_modified(path: &Path) -> DateTime<Utc> {
    std::fs::metadata(path)
        .and_then(|m| m.modified())
        .map(DateTime::<Utc>::from)
        .unwrap_or_else(|_| Utc::now())
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

        let results = scan(tmp.path(), &cancel);

        assert_eq!(results.len(), 3);
    }

    #[test]
    fn identifies_orphan_environments() {
        let tmp = setup_test_tree();
        let cancel = AtomicBool::new(false);

        let results = scan(tmp.path(), &cancel);
        let orphans: Vec<_> = results.iter().filter(|e| !e.has_project_file).collect();

        assert_eq!(orphans.len(), 1);
        assert!(orphans[0].path.to_string_lossy().contains("old-stuff"));
    }

    #[test]
    fn respects_cancellation() {
        let tmp = setup_test_tree();
        let cancel = AtomicBool::new(true);

        let results = scan(tmp.path(), &cancel);

        assert!(results.is_empty());
    }

    #[test]
    fn skips_git_directories() {
        let tmp = TempDir::new().unwrap();
        let git_nm = tmp.path().join(".git/node_modules");
        fs::create_dir_all(&git_nm).unwrap();

        let cancel = AtomicBool::new(false);
        let results = scan(tmp.path(), &cancel);

        assert!(results.is_empty());
    }
}
