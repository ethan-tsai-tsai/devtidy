use std::path::Path;

use jwalk::WalkDir;

/// Calculates total size of a directory by summing all file sizes.
/// Uses jwalk for parallel traversal of large directories.
pub fn dir_size(path: &Path) -> u64 {
    WalkDir::new(path)
        .skip_hidden(false)
        .into_iter()
        .filter_map(|entry| entry.ok())
        .filter_map(|entry| entry.metadata().ok())
        .filter(|meta| meta.is_file())
        .map(|meta| meta.len())
        .sum()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn calculates_size_of_files() {
        let tmp = TempDir::new().unwrap();
        fs::write(tmp.path().join("a.txt"), "hello").unwrap();
        fs::write(tmp.path().join("b.txt"), "world!").unwrap();

        let size = dir_size(tmp.path());
        assert_eq!(size, 11); // 5 + 6
    }

    #[test]
    fn includes_nested_files() {
        let tmp = TempDir::new().unwrap();
        let sub = tmp.path().join("sub");
        fs::create_dir(&sub).unwrap();
        fs::write(sub.join("file.txt"), "abc").unwrap();

        let size = dir_size(tmp.path());
        assert_eq!(size, 3);
    }

    #[test]
    fn returns_zero_for_empty_dir() {
        let tmp = TempDir::new().unwrap();
        assert_eq!(dir_size(tmp.path()), 0);
    }

    #[test]
    fn returns_zero_for_nonexistent_path() {
        let path = Path::new("/tmp/definitely-does-not-exist-devtidy-test");
        assert_eq!(dir_size(path), 0);
    }
}
