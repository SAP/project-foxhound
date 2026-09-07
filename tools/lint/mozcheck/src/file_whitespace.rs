// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

use std::fs;

use crate::common::{self, FileResult, LintIssue};

pub fn run(fix: bool, linter: &str) {
    let paths = common::read_paths_from_stdin();
    common::par_map_lint_results(&paths, |path| check_file(path, fix, linter));
}

pub fn check_file(path: &str, fix: bool, linter: &str) -> Vec<FileResult> {
    let Some(content) = common::read_file_bytes(path) else {
        return Vec::new();
    };

    let mut results = Vec::new();
    let mut needs_write = false;

    // Check for CRLF by scanning raw bytes.
    let has_crlf = content.windows(2).any(|w| w == b"\r\n");
    let content = if has_crlf {
        if fix {
            needs_write = true;
            results.push(FileResult::Fixed);
        } else {
            results.push(FileResult::Issue(LintIssue::error(
                path,
                None,
                "Windows line return".to_string(),
                linter,
            )));
        }
        // Strip \r bytes to normalize to LF.
        content.iter().copied().filter(|&b| b != b'\r').collect()
    } else {
        content
    };

    // Split on \n. Remove the trailing empty element produced by a final \n,
    // since it doesn't represent an actual line in the file.
    let mut lines: Vec<&[u8]> = content.split(|&b| b == b'\n').collect();
    if content.ends_with(b"\n") {
        lines.pop();
    }
    if lines.is_empty() {
        return results;
    }

    let mut fixed_lines: Vec<&[u8]> = Vec::new();

    // Check for trailing whitespace
    for (i, line) in lines.iter().enumerate() {
        let trimmed_len = line
            .iter()
            .rposition(|&b| b != b' ' && b != b'\t')
            .map(|p| p + 1)
            .unwrap_or(0);
        if trimmed_len < line.len() {
            if fix {
                fixed_lines.push(&line[..trimmed_len]);
                needs_write = true;
                results.push(FileResult::Fixed);
            } else {
                results.push(FileResult::Issue(LintIssue::error(
                    path,
                    Some(i + 1),
                    "Trailing whitespace".to_string(),
                    linter,
                )));
            }
        } else if fix {
            fixed_lines.push(line);
        }
    }

    // Check for empty lines at end of file
    let trailing_ws = content
        .iter()
        .rev()
        .take_while(|&&b| matches!(b, b'\n' | b' ' | b'\t'))
        .count();
    let has_empty_end = trailing_ws > 1;
    let missing_final_newline = !content.is_empty() && !content.ends_with(b"\n");

    if has_empty_end {
        if fix {
            while fixed_lines
                .last()
                .is_some_and(|l| l.is_empty() || l.iter().all(|&b| matches!(b, b' ' | b'\t')))
            {
                fixed_lines.pop();
            }
            needs_write = true;
            results.push(FileResult::Fixed);
        } else {
            results.push(FileResult::Issue(LintIssue::error(
                path,
                Some(lines.len()),
                "Empty Lines at end of file".to_string(),
                linter,
            )));
        }
    } else if missing_final_newline {
        if fix {
            needs_write = true;
            results.push(FileResult::Fixed);
        } else {
            results.push(FileResult::Issue(LintIssue::error(
                path,
                Some(lines.len()),
                "File does not end with newline character".to_string(),
                linter,
            )));
        }
    }

    if needs_write {
        let mut output = fixed_lines.join(&b'\n');
        output.push(b'\n');
        if let Err(e) = fs::write(path, &output) {
            eprintln!("Warning: could not write {path}: {e}");
        }
    }

    results
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_trailing_whitespace_detected() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("test.txt");
        std::fs::write(&file_path, "hello \nworld\n").unwrap();

        let results = check_file(file_path.to_str().unwrap(), false, "file-whitespace");
        let count = results
            .iter()
            .filter(|r| matches!(r, FileResult::Issue(i) if i.message == "Trailing whitespace"))
            .count();
        assert_eq!(count, 1);
    }

    #[test]
    fn test_trailing_whitespace_fixed() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("test.txt");
        std::fs::write(&file_path, "hello \nworld\n").unwrap();

        let results = check_file(file_path.to_str().unwrap(), true, "file-whitespace");
        assert!(results.iter().any(|r| matches!(r, FileResult::Fixed)));
        let content = std::fs::read_to_string(&file_path).unwrap();
        assert_eq!(content, "hello\nworld\n");
    }

    #[test]
    fn test_missing_final_newline_detected() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("test.txt");
        std::fs::write(&file_path, "hello\nworld").unwrap();

        let results = check_file(file_path.to_str().unwrap(), false, "file-whitespace");
        let count = results
            .iter()
            .filter(|r| {
                matches!(r, FileResult::Issue(i) if i.message == "File does not end with newline character")
            })
            .count();
        assert_eq!(count, 1);
    }

    #[test]
    fn test_missing_final_newline_fixed() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("test.txt");
        std::fs::write(&file_path, "hello\nworld").unwrap();

        check_file(file_path.to_str().unwrap(), true, "file-whitespace");
        let content = std::fs::read_to_string(&file_path).unwrap();
        assert_eq!(content, "hello\nworld\n");
    }

    #[test]
    fn test_empty_lines_at_end_detected() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("test.txt");
        std::fs::write(&file_path, "hello\nworld\n\n\n").unwrap();

        let results = check_file(file_path.to_str().unwrap(), false, "file-whitespace");
        let count = results
            .iter()
            .filter(
                |r| matches!(r, FileResult::Issue(i) if i.message == "Empty Lines at end of file"),
            )
            .count();
        assert_eq!(count, 1);
    }

    #[test]
    fn test_empty_lines_at_end_fixed() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("test.txt");
        std::fs::write(&file_path, "hello\nworld\n\n\n").unwrap();

        check_file(file_path.to_str().unwrap(), true, "file-whitespace");
        let content = std::fs::read_to_string(&file_path).unwrap();
        assert_eq!(content, "hello\nworld\n");
    }

    #[test]
    fn test_windows_line_endings_detected() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("test.txt");
        std::fs::write(&file_path, "hello\r\nworld\r\n").unwrap();

        let results = check_file(file_path.to_str().unwrap(), false, "file-whitespace");
        let count = results
            .iter()
            .filter(|r| matches!(r, FileResult::Issue(i) if i.message == "Windows line return"))
            .count();
        assert_eq!(count, 1);
    }

    #[test]
    fn test_windows_line_endings_fixed() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("test.txt");
        std::fs::write(&file_path, "hello\r\nworld\r\n").unwrap();

        check_file(file_path.to_str().unwrap(), true, "file-whitespace");
        let content = std::fs::read_to_string(&file_path).unwrap();
        assert_eq!(content, "hello\nworld\n");
    }

    #[test]
    fn test_crlf_with_other_issues_fix_count() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("test.txt");
        // CRLF + trailing whitespace + empty lines at end
        std::fs::write(&file_path, "hello  \r\nworld\r\n\r\n").unwrap();

        let results = check_file(file_path.to_str().unwrap(), true, "file-whitespace");
        let fixed_count = results
            .iter()
            .filter(|r| matches!(r, FileResult::Fixed))
            .count();
        // CRLF fix + trailing whitespace fix + empty-lines-at-end fix
        assert_eq!(fixed_count, 3);
        let content = std::fs::read_to_string(&file_path).unwrap();
        assert_eq!(content, "hello\nworld\n");
    }

    #[test]
    fn test_crlf_only_fix_count() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("test.txt");
        // Only CRLF, no other issues
        std::fs::write(&file_path, "hello\r\nworld\r\n").unwrap();

        let results = check_file(file_path.to_str().unwrap(), true, "file-whitespace");
        let fixed_count = results
            .iter()
            .filter(|r| matches!(r, FileResult::Fixed))
            .count();
        // CRLF-only fix should count as exactly 1 fix
        assert_eq!(fixed_count, 1);
        let content = std::fs::read_to_string(&file_path).unwrap();
        assert_eq!(content, "hello\nworld\n");
    }

    #[test]
    fn test_clean_file_no_issues() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("test.txt");
        std::fs::write(&file_path, "hello\nworld\n").unwrap();

        let results = check_file(file_path.to_str().unwrap(), false, "file-whitespace");
        assert!(results.is_empty());
    }
}
