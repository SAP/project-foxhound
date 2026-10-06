// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

use std::fs;
use std::io::Read;
use std::os::unix::fs::PermissionsExt;

use crate::common::{self, FileResult, LintIssue};

pub fn run(allow_shebang: bool, fix: bool, linter: &str) {
    let paths = common::read_paths_from_stdin();
    common::par_map_lint_results(&paths, |path| {
        check_file(path, allow_shebang, fix, linter)
            .into_iter()
            .collect()
    });
}

pub fn check_file(path: &str, allow_shebang: bool, fix: bool, linter: &str) -> Option<FileResult> {
    let metadata = match fs::metadata(path) {
        Ok(m) => m,
        Err(e) => {
            eprintln!("Warning: could not stat {path}: {e}");
            return None;
        }
    };

    let mode = metadata.permissions().mode();
    // not executable
    if mode & 0o111 == 0 {
        return None;
    }

    if allow_shebang && has_shebang(path) {
        return None;
    }

    if fix {
        if let Err(e) = fs::set_permissions(path, fs::Permissions::from_mode(0o644)) {
            eprintln!("Warning: could not chmod {path}: {e}");
            return None;
        }
        return Some(FileResult::Fixed);
    }

    Some(FileResult::Issue(LintIssue::error(
        path,
        None,
        "Execution permissions on a source file".to_string(),
        linter,
    )))
}

fn has_shebang(path: &str) -> bool {
    let Ok(mut file) = fs::File::open(path) else {
        return false;
    };
    let mut buf = [0u8; 2];
    match file.read_exact(&mut buf) {
        Ok(()) => buf == *b"#!",
        Err(_) => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use std::os::unix::fs::PermissionsExt;

    #[test]
    fn test_non_executable_ignored() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("normal.txt");
        std::fs::write(&file_path, "hello\n").unwrap();
        std::fs::set_permissions(&file_path, std::fs::Permissions::from_mode(0o644)).unwrap();

        let result = check_file(file_path.to_str().unwrap(), false, false, "file-perm");
        assert!(result.is_none());
    }

    #[test]
    fn test_executable_flagged() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("bad.txt");
        std::fs::write(&file_path, "hello\n").unwrap();
        std::fs::set_permissions(&file_path, std::fs::Permissions::from_mode(0o755)).unwrap();

        let result = check_file(file_path.to_str().unwrap(), false, false, "file-perm");
        assert!(matches!(result, Some(FileResult::Issue(_))));
    }

    #[test]
    fn test_executable_with_shebang_allowed() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("script.sh");
        {
            let mut f = std::fs::File::create(&file_path).unwrap();
            writeln!(f, "#!/bin/bash").unwrap();
            writeln!(f, "echo hello").unwrap();
        }
        std::fs::set_permissions(&file_path, std::fs::Permissions::from_mode(0o755)).unwrap();

        let result = check_file(file_path.to_str().unwrap(), true, false, "file-perm");
        assert!(result.is_none());
    }

    #[test]
    fn test_executable_without_shebang_flagged_even_with_allow() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("noheader.py");
        std::fs::write(&file_path, "print('hi')\n").unwrap();
        std::fs::set_permissions(&file_path, std::fs::Permissions::from_mode(0o755)).unwrap();

        let result = check_file(file_path.to_str().unwrap(), true, false, "file-perm");
        assert!(matches!(result, Some(FileResult::Issue(_))));
    }

    #[test]
    fn test_fix_mode() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("fixme.txt");
        std::fs::write(&file_path, "hello\n").unwrap();
        std::fs::set_permissions(&file_path, std::fs::Permissions::from_mode(0o755)).unwrap();

        let result = check_file(file_path.to_str().unwrap(), false, true, "file-perm");
        assert!(matches!(result, Some(FileResult::Fixed)));

        let mode = std::fs::metadata(&file_path).unwrap().permissions().mode();
        assert_eq!(mode & 0o777, 0o644);
    }
}
