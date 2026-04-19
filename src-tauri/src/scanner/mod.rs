pub mod detector;
pub mod sizer;
pub mod walker;

use chrono::{DateTime, Utc};
use serde::Serialize;
use std::path::PathBuf;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub enum EnvType {
    PythonVenv,
    PythonVirtualenv,
    Conda,
    Uv,
    Poetry,
    Pipenv,
    Pyenv,
    NodeModules,
}

impl EnvType {
    pub fn label(&self) -> &'static str {
        match self {
            Self::PythonVenv => "Python venv",
            Self::PythonVirtualenv => "Python virtualenv",
            Self::Conda => "Conda",
            Self::Uv => "uv",
            Self::Poetry => "Poetry",
            Self::Pipenv => "Pipenv",
            Self::Pyenv => "pyenv",
            Self::NodeModules => "node_modules",
        }
    }

    pub fn category(&self) -> &'static str {
        match self {
            Self::NodeModules => "Node.js",
            _ => "Python",
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct EnvEntry {
    pub path: PathBuf,
    pub env_type: EnvType,
    pub size_bytes: u64,
    pub last_modified: DateTime<Utc>,
    pub project_path: Option<PathBuf>,
    pub has_project_file: bool,
}
