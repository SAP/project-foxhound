// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

use std::collections::HashMap;
use std::io::{self, Read};

use regex::RegexBuilder;
use serde::Deserialize;

use crate::common;
#[cfg(unix)]
use crate::file_perm;
use crate::{file_whitespace, license, pathutil, rejected_words, trojan_source};

#[derive(Deserialize)]
struct BatchInput {
    root: String,
    #[serde(default)]
    fix: bool,
    linters: Vec<LinterEntry>,
}

#[derive(Deserialize)]
struct LinterEntry {
    name: String,
    check: String,
    paths: Vec<String>,
    #[serde(default)]
    extensions: Vec<String>,
    #[serde(default)]
    exclude: Vec<String>,
    #[serde(default)]
    find_dotfiles: bool,
    #[serde(default)]
    config: HashMap<String, serde_json::Value>,
}

pub fn run() -> Result<(), String> {
    let mut input = String::new();
    io::stdin()
        .read_to_string(&mut input)
        .map_err(|e| format!("Failed to read stdin: {e}"))?;

    let batch: BatchInput =
        serde_json::from_str(&input).map_err(|e| format!("Failed to parse batch JSON: {e}"))?;

    for linter in &batch.linters {
        run_linter(linter, &batch.root, batch.fix);
    }
    Ok(())
}

fn run_linter(linter: &LinterEntry, root: &str, fix: bool) {
    let files = pathutil::expand_exclusions(
        &linter.paths,
        &linter.extensions,
        &linter.exclude,
        root,
        linter.find_dotfiles,
    );

    if files.is_empty() {
        common::emit_fix_summary(0);
        return;
    }

    match linter.check.as_str() {
        "rejected-words" => run_rejected_words(&files, linter),
        #[cfg(unix)]
        "file-perm" => run_file_perm(&files, linter, fix),
        #[cfg(not(unix))]
        "file-perm" => {
            common::emit_fix_summary(0);
        }
        "file-whitespace" => {
            common::par_map_lint_results(&files, |path| {
                file_whitespace::check_file(path, fix, &linter.name)
            });
        }
        "trojan-source" => {
            common::par_map_lint(&files, |path| trojan_source::check_file(path, &linter.name));
        }
        "license" => license::run(&files, fix, &linter.name, root),
        _ => {
            eprintln!("Unknown check: {}", linter.check);
        }
    }
}

fn run_rejected_words(files: &[String], linter: &LinterEntry) {
    let pattern = linter
        .config
        .get("regex-pattern")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let ignore_case = linter
        .config
        .get("ignore-case")
        .and_then(serde_json::Value::as_bool)
        .unwrap_or(false);
    let message = linter
        .config
        .get("message")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let default_rule = linter.name.clone();
    let rule = linter
        .config
        .get("rule")
        .and_then(|v| v.as_str())
        .unwrap_or(&default_rule);

    let re = match RegexBuilder::new(pattern)
        .case_insensitive(ignore_case)
        .build()
    {
        Ok(re) => re,
        Err(e) => {
            eprintln!("Invalid regex pattern '{pattern}': {e}");
            return;
        }
    };

    common::par_map_lint(files, |path| {
        rejected_words::check_reject_words(path, &re, &linter.name, message, rule)
    });
}

#[cfg(unix)]
fn run_file_perm(files: &[String], linter: &LinterEntry, fix: bool) {
    let allow_shebang = linter
        .config
        .get("allow-shebang")
        .and_then(serde_json::Value::as_bool)
        .unwrap_or(false);

    common::par_map_lint_results(files, |path| {
        file_perm::check_file(path, allow_shebang, fix, &linter.name)
            .into_iter()
            .collect()
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn test_parse_batch_input() {
        let json = r#"{
            "root": "/repo",
            "fix": false,
            "linters": [{
                "name": "test-linter",
                "check": "rejected-words",
                "paths": ["/repo/src"],
                "extensions": ["js"],
                "exclude": [],
                "config": {
                    "regex-pattern": "blacklist",
                    "ignore-case": true,
                    "message": "bad word",
                    "rule": "test-rule"
                }
            }]
        }"#;

        let batch: BatchInput = serde_json::from_str(json).unwrap();
        assert_eq!(batch.root, "/repo");
        assert!(!batch.fix);
        assert_eq!(batch.linters.len(), 1);
        assert_eq!(batch.linters[0].check, "rejected-words");
    }

    #[test]
    fn test_run_rejected_words_via_batch() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("test.js");
        {
            let mut f = std::fs::File::create(&file_path).unwrap();
            writeln!(f, "// this has a blacklist word").unwrap();
        }

        let linter = LinterEntry {
            name: "test-linter".to_string(),
            check: "rejected-words".to_string(),
            paths: vec![file_path.to_str().unwrap().to_string()],
            extensions: vec!["js".to_string()],
            exclude: vec![],
            find_dotfiles: false,
            config: {
                let mut m = HashMap::new();
                m.insert(
                    "regex-pattern".to_string(),
                    serde_json::Value::String("blacklist".to_string()),
                );
                m.insert("ignore-case".to_string(), serde_json::Value::Bool(true));
                m.insert(
                    "message".to_string(),
                    serde_json::Value::String("bad word".to_string()),
                );
                m.insert(
                    "rule".to_string(),
                    serde_json::Value::String("test-rule".to_string()),
                );
                m
            },
        };

        run_linter(&linter, dir.path().to_str().unwrap(), false);
    }

    #[test]
    fn test_run_file_whitespace_via_batch() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("test.js");
        std::fs::write(&file_path, "hello \nworld\n").unwrap();

        let linter = LinterEntry {
            name: "file-whitespace".to_string(),
            check: "file-whitespace".to_string(),
            paths: vec![file_path.to_str().unwrap().to_string()],
            extensions: vec!["js".to_string()],
            exclude: vec![],
            find_dotfiles: false,
            config: HashMap::new(),
        };

        run_linter(&linter, dir.path().to_str().unwrap(), false);
    }

    #[test]
    fn test_run_trojan_source_via_batch() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("test.c");
        std::fs::write(&file_path, "int main() { return 0; }\n").unwrap();

        let linter = LinterEntry {
            name: "trojan-source".to_string(),
            check: "trojan-source".to_string(),
            paths: vec![file_path.to_str().unwrap().to_string()],
            extensions: vec!["c".to_string()],
            exclude: vec![],
            find_dotfiles: false,
            config: HashMap::new(),
        };

        run_linter(&linter, dir.path().to_str().unwrap(), false);
    }
}
