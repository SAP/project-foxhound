// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

use std::fmt::Write as _;
use std::fs;
use std::io;
use std::path::Path;

use crate::common::{self, FileResult, LintIssue};

pub fn run(files: &[String], fix: bool, linter: &str, root: &str) {
    let licenses_path = Path::new(root).join("tools/lint/license/valid-licenses.txt");
    let licenses = match load_valid_licenses(licenses_path.to_str().unwrap_or("")) {
        Ok(l) => l,
        Err(e) => {
            eprintln!("Warning: could not load valid-licenses.txt: {e}");
            return;
        }
    };

    let license_html_path = Path::new(root).join("toolkit/content/license.html");
    let license_html_str = match license_html_path.to_str() {
        Some(s) => s.to_string(),
        None => {
            eprintln!(
                "Warning: license.html path is not valid UTF-8: {}",
                license_html_path.display()
            );
            return;
        }
    };

    common::par_map_lint_results(files, |path| check_license(path, &licenses, fix, linter));

    if files.iter().any(|p| p == &license_html_str) {
        check_license_html(&license_html_str, linter, root);
    }
}

/// Load the list of license patterns.
fn load_valid_licenses(path: &str) -> io::Result<Vec<String>> {
    let content = fs::read_to_string(path)?;
    Ok(content
        .lines()
        .map(|l| l.trim().to_lowercase())
        .filter(|l| !l.is_empty())
        .collect())
}

fn check_license(path: &str, licenses: &[String], fix: bool, linter: &str) -> Vec<FileResult> {
    let mut results = Vec::new();

    if !is_valid_license(path, licenses) {
        if fix {
            if fix_file(path) {
                results.push(FileResult::Fixed);
            } else {
                results.push(FileResult::Issue(LintIssue::error(
                    path,
                    None,
                    "No matching license strings found in tools/lint/license/valid-licenses.txt"
                        .to_string(),
                    linter,
                )));
            }
        } else {
            results.push(FileResult::Issue(LintIssue::error(
                path,
                None,
                "No matching license strings found in tools/lint/license/valid-licenses.txt"
                    .to_string(),
                linter,
            )));
        }
    }

    results
}

fn check_license_html(path: &str, linter: &str, root: &str) {
    let issues: Vec<LintIssue> = lint_license_html(path, root)
        .into_iter()
        .map(|(invalid_path, lineno)| {
            LintIssue::error(
                path,
                Some(lineno),
                format!("references unknown path {invalid_path}"),
                linter,
            )
        })
        .collect();
    for issue in &issues {
        let json = serde_json::to_string(issue).expect("LintIssue should always serialize");
        println!("{json}");
    }
}

/// From a given file, check if we can find the license patterns
/// in the first lines of the file.
fn is_valid_license(path: &str, licenses: &[String]) -> bool {
    let Ok(content) = fs::read_to_string(path) else {
        eprintln!("Warning: could not read {path} for license check");
        return true;
    };

    // Empty files don't need a license.
    if content.is_empty() {
        return true;
    }

    let lower = content.to_lowercase();
    licenses.iter().any(|l| lower.contains(l.as_str()))
}

const TEST_PATHS: &[&str] = &[
    "/tests/",
    "/test/",
    "/test_",
    "/gtest",
    "/crashtest",
    "/mochitest",
    "/reftest",
    "/imptest",
    "/androidTest",
    "/jit-test/",
    "jsapi-tests/",
];

/// Is the file a test or not?
fn is_test(path: &str) -> bool {
    // For the unit tests
    if path.contains("lint/test/") || path.contains("lint_license_test_tmp_file.js") {
        return false;
    }
    TEST_PATHS.iter().any(|p| path.contains(p))
}

// Official source: https://www.mozilla.org/en-US/MPL/headers/
const MPL2_TEMPLATE: &[&str] = &[
    "This Source Code Form is subject to the terms of the Mozilla Public",
    "License, v. 2.0. If a copy of the MPL was not distributed with this",
    "file, You can obtain one at https://mozilla.org/MPL/2.0/.",
];

const PUBLIC_DOMAIN_TEMPLATE: &[&str] = &[
    "Any copyright is dedicated to the public domain.",
    "https://creativecommons.org/publicdomain/zero/1.0/",
];

/// Add the copyright notice to the top of the file.
fn fix_file(path: &str) -> bool {
    let ext = Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");

    let template = if is_test(path) {
        PUBLIC_DOMAIN_TEMPLATE
    } else {
        MPL2_TEMPLATE
    };

    let header = match ext {
        "cpp" | "c" | "cc" | "h" | "m" | "mm" | "rs" | "java" | "kt" | "js" | "jsx" | "mjs"
        | "css" | "idl" | "webidl" => build_c_style_header(template),
        "py" | "ftl" | "properties" => build_hash_header(template),
        "xml" | "html" | "xhtml" | "dtd" | "svg" => build_xml_header(template, ext, is_test(path)),
        _ => return false,
    };

    let Ok(content) = fs::read_to_string(path) else {
        return false;
    };

    let lines: Vec<&str> = content.lines().collect();
    let insert_at = if lines.is_empty() {
        0
    } else if lines[0].starts_with("#!") || lines[0].starts_with("<?xml ") {
        1
    } else if lines[0].starts_with("/* -*- Mode") {
        2
    } else {
        0
    };

    let header_lines: Vec<&str> = header.lines().collect();

    // Build the new content: prefix lines, header, empty separator line, body.
    let mut parts: Vec<&str> = Vec::new();
    parts.extend_from_slice(&lines[..insert_at]);
    parts.extend(header_lines);
    parts.push("");
    parts.extend_from_slice(&lines[insert_at..]);

    let mut new_content = parts.join("\n");
    if content.ends_with('\n') || !content.contains('\n') {
        new_content.push('\n');
    }

    fs::write(path, new_content).is_ok()
}

fn build_c_style_header(template: &[&str]) -> String {
    let mut result = String::new();
    for (i, line) in template.iter().enumerate() {
        let start = if i == 0 { "/" } else { " " };
        let end = if i == template.len() - 1 { " */" } else { "" };
        let _ = writeln!(result, "{}* {}{}", start, line, end);
    }
    result
}

fn build_hash_header(template: &[&str]) -> String {
    let mut result = String::new();
    for line in template {
        let _ = writeln!(result, "# {}", line);
    }
    result
}

fn build_xml_header(template: &[&str], ext: &str, is_test: bool) -> String {
    let mut result = String::new();
    let last_idx = if is_test { 1 } else { 2 };
    for (i, line) in template.iter().enumerate() {
        let start = if i == 0 { "<!-- " } else { "   - " };
        let end = if i == last_idx { " -->" } else { "" };
        let _ = write!(result, "{}{}{}", start, line, end);
        // When dealing with an svg, we should not have a space between
        // the license and the content
        if ext != "svg" || end.is_empty() {
            result.push('\n');
        }
    }
    result
}

fn lint_license_html(path: &str, root: &str) -> Vec<(String, usize)> {
    let Ok(content) = fs::read_to_string(path) else {
        return Vec::new();
    };

    let dom = tl::parse(&content, tl::ParserOptions::default()).expect("HTML should parse");
    let parser = dom.parser();
    let mut results = Vec::new();

    let Some(handles) = dom.query_selector("code") else {
        return results;
    };

    for handle in handles {
        let Some(node) = handle.get(parser) else {
            continue;
        };
        let code_text = node.inner_text(parser);
        let code_text = code_text.trim();
        if code_text.is_empty() {
            continue;
        }
        let abs = Path::new(root).join(code_text);
        if !abs.exists()
            && glob::glob(abs.to_str().unwrap_or(""))
                .map(|mut g| g.next().is_none())
                .unwrap_or(true)
        {
            let lineno = content
                .find(code_text)
                .map_or(0, |pos| content[..pos].lines().count());
            results.push((code_text.to_string(), lineno));
        }
    }

    results
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn test_valid_license_mpl2() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("test.rs");
        std::fs::write(
            &file_path,
            "// file, You can obtain one at https://mozilla.org/MPL/2.0/.\nfn main() {}\n",
        )
        .unwrap();

        let licenses = vec!["mozilla.org/mpl/".to_string()];
        assert!(is_valid_license(file_path.to_str().unwrap(), &licenses));
    }

    #[test]
    fn test_missing_license() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("test.rs");
        std::fs::write(&file_path, "fn main() {}\n").unwrap();

        let licenses = vec!["mozilla.org/mpl/".to_string()];
        assert!(!is_valid_license(file_path.to_str().unwrap(), &licenses));
    }

    #[test]
    fn test_empty_file_is_valid() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("empty.py");
        std::fs::write(&file_path, "").unwrap();

        let licenses = vec!["mozilla.org/mpl/".to_string()];
        assert!(is_valid_license(file_path.to_str().unwrap(), &licenses));
    }

    #[test]
    fn test_is_test() {
        assert!(is_test("/repo/dom/base/tests/foo.js"));
        assert!(is_test("/repo/layout/crashtest/foo.html"));
        assert!(!is_test("/repo/dom/base/Document.cpp"));
        assert!(!is_test("/repo/tools/lint/test/test_license.py"));
    }

    #[test]
    fn test_fix_c_style() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("test.js");
        std::fs::write(&file_path, "var x = 1;\n").unwrap();

        assert!(fix_file(file_path.to_str().unwrap()));

        let content = std::fs::read_to_string(&file_path).unwrap();
        assert!(content.contains("Mozilla Public"));
        assert!(content.contains("var x = 1;"));
    }

    #[test]
    fn test_fix_python_style() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("test.py");
        std::fs::write(&file_path, "x = 1\n").unwrap();

        assert!(fix_file(file_path.to_str().unwrap()));

        let content = std::fs::read_to_string(&file_path).unwrap();
        assert!(content.starts_with("# This Source Code Form"));
        assert!(content.contains("x = 1"));
    }

    #[test]
    fn test_fix_preserves_shebang() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("script.py");
        std::fs::write(&file_path, "#!/usr/bin/env python3\nx = 1\n").unwrap();

        assert!(fix_file(file_path.to_str().unwrap()));

        let content = std::fs::read_to_string(&file_path).unwrap();
        assert!(content.starts_with("#!/usr/bin/env python3\n"));
        assert!(content.contains("# This Source Code Form"));
    }

    #[test]
    fn test_load_valid_licenses() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("licenses.txt");
        {
            let mut f = std::fs::File::create(&file_path).unwrap();
            writeln!(f, "mozilla.org/MPL/").unwrap();
            writeln!(f).unwrap();
            writeln!(f, "Apache License").unwrap();
        }

        let licenses = load_valid_licenses(file_path.to_str().unwrap()).unwrap();
        assert_eq!(licenses.len(), 2);
        assert_eq!(licenses[0], "mozilla.org/mpl/");
        assert_eq!(licenses[1], "apache license");
    }
}
