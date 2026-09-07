// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

use crate::common::{self, LintIssue};
use unicode_categories::UnicodeCategories;

pub fn run(linter: &str) {
    let paths = common::read_paths_from_stdin();
    common::par_map_lint(&paths, |path| check_file(path, linter));
}

pub fn check_file(path: &str, linter: &str) -> Vec<LintIssue> {
    let Some(content) = common::read_file_bytes(path) else {
        return Vec::new();
    };

    let Ok(text) = String::from_utf8(content) else {
        return vec![LintIssue::error(
            path,
            None,
            "Could not open file as utf-8 - maybe an encoding error".to_string(),
            linter,
        )];
    };

    let mut issues = Vec::new();
    for (lineno, line) in text.lines().enumerate() {
        let disallowed: Vec<char> = line.chars().filter(|c| c.is_other_format()).collect();
        if !disallowed.is_empty() {
            issues.push(LintIssue::error(
                path,
                Some(lineno + 1),
                format!("disallowed characters: {disallowed:?}"),
                linter,
            ));
        }
    }
    issues
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clean_file() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("clean.c");
        std::fs::write(&file_path, "int main() { return 0; }\n").unwrap();

        let issues = check_file(file_path.to_str().unwrap(), "trojan-source");
        assert!(issues.is_empty());
    }

    #[test]
    fn test_file_with_bidi_override() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("bad.c");
        // U+202E is RIGHT-TO-LEFT OVERRIDE
        std::fs::write(&file_path, "int main() { \u{202E}return 0; }\n").unwrap();

        let issues = check_file(file_path.to_str().unwrap(), "trojan-source");
        assert_eq!(issues.len(), 1);
        assert!(issues[0].message.contains("disallowed characters"));
        assert_eq!(issues[0].lineno, Some(1));
    }

    #[test]
    fn test_file_with_zero_width_space() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("zwsp.py");
        std::fs::write(&file_path, "x = 1\u{200B}\n").unwrap();

        let issues = check_file(file_path.to_str().unwrap(), "trojan-source");
        assert_eq!(issues.len(), 1);
    }

    #[test]
    fn test_non_utf8_file() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("bad_encoding.c");
        std::fs::write(&file_path, b"\xff\xfe invalid utf8").unwrap();

        let issues = check_file(file_path.to_str().unwrap(), "trojan-source");
        assert_eq!(issues.len(), 1);
        assert!(issues[0].message.contains("utf-8"));
    }
}
