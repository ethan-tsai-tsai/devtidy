use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};

use chrono::{DateTime, Utc};
use jwalk::WalkDir;
use rayon::prelude::*;

use super::detector::{detect_env, find_project_root};
use super::sizer::dir_size;
use super::{EnvEntry, EnvType};

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

/// Scans a root directory for virtual environments.
#[must_use]
pub fn scan(root: &Path, cancel: &AtomicBool) -> Vec<EnvEntry> {
    // Phase 1: walk the tree, detect env type once per directory
    let detected: Vec<(PathBuf, EnvType)> = WalkDir::new(root)
        .skip_hidden(false)
        .follow_links(false)
        .sort(false)
        .process_read_dir(|_depth, path, _state, children| {
            // If we are inside an environment directory, skip all children
            let parent_name = path
                .file_name()
                .map(|n| n.to_string_lossy())
                .unwrap_or_default();
            if ENV_DIRS.contains(&parent_name.as_ref()) {
                children.clear();
                return;
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
                        !SKIP_DIRS.contains(&name.as_ref())
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
            detect_env(&path).map(|env_type| (path, env_type))
        })
        .collect();

    if cancel.load(Ordering::Acquire) {
        return Vec::new();
    }

    // Phase 2: enrich each detected env with size, metadata, project info (parallel)
    detected
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
        .collect()
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
    fn skips_nested_node_modules() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();

        // Top-level node_modules with nested .pnpm structure
        let proj = root.join("web-app");
        fs::create_dir_all(proj.join("node_modules/.pnpm/some-pkg/node_modules")).unwrap();
        fs::write(proj.join("package.json"), "{}\n").unwrap();

        let cancel = AtomicBool::new(false);
        let results = scan(root, &cancel);

        // Should only find the top-level node_modules, not the nested one
        let nm_results: Vec<_> = results
            .iter()
            .filter(|e| e.env_type == EnvType::NodeModules)
            .collect();
        assert_eq!(nm_results.len(), 1);
        assert!(nm_results[0].path.ends_with("node_modules"));
        assert!(!nm_results[0].path.to_string_lossy().contains(".pnpm"));
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
