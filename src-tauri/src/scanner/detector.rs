use std::path::Path;

use super::EnvType;

/// Checks if a directory is a virtual environment and returns its type.
pub fn detect_env(path: &Path) -> Option<EnvType> {
    let name = path.file_name()?.to_str()?;

    if name == "node_modules" {
        return Some(EnvType::NodeModules);
    }

    detect_python_env(path)
}

fn detect_python_env(path: &Path) -> Option<EnvType> {
    if !path.is_dir() {
        return None;
    }

    // conda: has conda-meta/ directory
    if path.join("conda-meta").is_dir() {
        return Some(EnvType::Conda);
    }

    // uv: has pyvenv.cfg with "uv = " line
    if has_pyvenv_cfg_with(path, "uv = ") {
        return Some(EnvType::Uv);
    }

    // Standard venv: has pyvenv.cfg (Python 3.3+ venv module)
    if path.join("pyvenv.cfg").is_file() {
        return Some(EnvType::PythonVenv);
    }

    // virtualenv (legacy): has lib/pythonX.Y/site-packages but no pyvenv.cfg
    if has_site_packages(path) {
        return Some(EnvType::PythonVirtualenv);
    }

    None
}

/// Checks whether a directory has project files indicating an active project.
pub fn has_project_files(dir: &Path) -> bool {
    const PROJECT_FILES: &[&str] = &[
        "requirements.txt",
        "pyproject.toml",
        "setup.py",
        "setup.cfg",
        "Pipfile",
        "Pipfile.lock",
        "poetry.lock",
        "uv.lock",
        "package.json",
        "package-lock.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        "bun.lock",
    ];

    PROJECT_FILES.iter().any(|f| dir.join(f).is_file())
}

/// Finds the likely project root for a given environment directory.
pub fn find_project_root(env_path: &Path) -> Option<std::path::PathBuf> {
    let parent = env_path.parent()?;
    if has_project_files(parent) {
        return Some(parent.to_path_buf());
    }
    None
}

fn has_pyvenv_cfg_with(path: &Path, marker: &str) -> bool {
    let cfg_path = path.join("pyvenv.cfg");
    std::fs::read_to_string(cfg_path)
        .map(|content| content.lines().any(|line| line.starts_with(marker)))
        .unwrap_or(false)
}

fn has_site_packages(path: &Path) -> bool {
    let lib_dir = path.join("lib");
    if !lib_dir.is_dir() {
        return false;
    }

    std::fs::read_dir(&lib_dir)
        .ok()
        .into_iter()
        .flatten()
        .filter_map(|e| e.ok())
        .any(|entry| {
            let name = entry.file_name();
            let name_str = name.to_string_lossy();
            name_str.starts_with("python")
                && entry.path().join("site-packages").is_dir()
        })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn create_dir(base: &Path, rel: &str) {
        fs::create_dir_all(base.join(rel)).unwrap();
    }

    fn create_file(base: &Path, rel: &str, content: &str) {
        let p = base.join(rel);
        if let Some(parent) = p.parent() {
            fs::create_dir_all(parent).unwrap();
        }
        fs::write(p, content).unwrap();
    }

    #[test]
    fn detects_node_modules() {
        let tmp = TempDir::new().unwrap();
        let nm = tmp.path().join("node_modules");
        fs::create_dir(&nm).unwrap();

        assert_eq!(detect_env(&nm), Some(EnvType::NodeModules));
    }

    #[test]
    fn detects_python_venv() {
        let tmp = TempDir::new().unwrap();
        let venv = tmp.path().join(".venv");
        create_dir(&venv, "");
        create_file(&venv, "pyvenv.cfg", "home = /usr/bin\n");

        assert_eq!(detect_env(&venv), Some(EnvType::PythonVenv));
    }

    #[test]
    fn detects_conda_env() {
        let tmp = TempDir::new().unwrap();
        let env = tmp.path().join("myenv");
        create_dir(&env, "conda-meta");

        assert_eq!(detect_env(&env), Some(EnvType::Conda));
    }

    #[test]
    fn detects_uv_env() {
        let tmp = TempDir::new().unwrap();
        let env = tmp.path().join(".venv");
        create_dir(&env, "");
        create_file(
            &env,
            "pyvenv.cfg",
            "home = /usr/bin\nuv = 0.5.1\n",
        );

        assert_eq!(detect_env(&env), Some(EnvType::Uv));
    }

    #[test]
    fn detects_virtualenv_legacy() {
        let tmp = TempDir::new().unwrap();
        let env = tmp.path().join("env");
        create_dir(&env, "lib/python3.11/site-packages");

        assert_eq!(detect_env(&env), Some(EnvType::PythonVirtualenv));
    }

    #[test]
    fn returns_none_for_regular_dir() {
        let tmp = TempDir::new().unwrap();
        assert_eq!(detect_env(tmp.path()), None);
    }

    #[test]
    fn finds_project_root_with_requirements_txt() {
        let tmp = TempDir::new().unwrap();
        create_file(tmp.path(), "requirements.txt", "flask\n");
        let venv = tmp.path().join(".venv");
        create_dir(&venv, "");

        assert_eq!(find_project_root(&venv), Some(tmp.path().to_path_buf()));
    }

    #[test]
    fn finds_project_root_with_package_json() {
        let tmp = TempDir::new().unwrap();
        create_file(tmp.path(), "package.json", "{}\n");
        let nm = tmp.path().join("node_modules");
        create_dir(&nm, "");

        assert_eq!(find_project_root(&nm), Some(tmp.path().to_path_buf()));
    }

    #[test]
    fn no_project_root_when_no_project_files() {
        let tmp = TempDir::new().unwrap();
        let venv = tmp.path().join(".venv");
        create_dir(&venv, "");

        assert_eq!(find_project_root(&venv), None);
    }

    #[test]
    fn has_project_files_detects_pyproject_toml() {
        let tmp = TempDir::new().unwrap();
        create_file(tmp.path(), "pyproject.toml", "[project]\n");

        assert!(has_project_files(tmp.path()));
    }

    #[test]
    fn has_project_files_returns_false_for_empty_dir() {
        let tmp = TempDir::new().unwrap();
        assert!(!has_project_files(tmp.path()));
    }
}
