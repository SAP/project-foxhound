// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

use std::fs;
use std::io::{self, BufRead};

use rayon::prelude::*;
use serde::Serialize;

pub enum FileResult {
    Issue(LintIssue),
    Fixed,
}

#[derive(Serialize)]
pub struct LintIssue {
    pub(crate) path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) lineno: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) column: Option<usize>,
    pub(crate) message: String,
    pub(crate) level: String,
    pub(crate) linter: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) rule: Option<String>,
}

impl LintIssue {
    pub(crate) fn error(path: &str, lineno: Option<usize>, message: String, linter: &str) -> Self {
        Self {
            path: path.to_string(),
            lineno,
            column: None,
            message,
            level: "error".to_string(),
            linter: linter.to_string(),
            rule: None,
        }
    }
}

#[derive(Serialize)]
struct FixSummary {
    fixed: usize,
}

fn emit(issue: &LintIssue) {
    let json = serde_json::to_string(issue).expect("LintIssue should always serialize");
    println!("{json}");
}

pub fn emit_fix_summary(fixed: usize) {
    let json =
        serde_json::to_string(&FixSummary { fixed }).expect("FixSummary should always serialize");
    println!("{json}");
}

fn emit_issues(issues: &[LintIssue]) {
    for issue in issues {
        emit(issue);
    }
}

pub fn read_file_bytes(path: &str) -> Option<Vec<u8>> {
    match fs::read(path) {
        Ok(c) => Some(c),
        Err(e) => {
            eprintln!("Warning: could not read {path}: {e}");
            None
        }
    }
}

pub fn read_paths_from_stdin() -> Vec<String> {
    io::stdin()
        .lock()
        .lines()
        .map_while(Result::ok)
        .filter(|l| !l.is_empty())
        .collect()
}

pub fn par_map_lint(files: &[String], check: impl Fn(&str) -> Vec<LintIssue> + Sync) {
    let issues: Vec<LintIssue> = files.par_iter().flat_map(|p| check(p)).collect();
    emit_issues(&issues);
}

pub fn par_map_lint_results(files: &[String], check: impl Fn(&str) -> Vec<FileResult> + Sync) {
    let results: Vec<FileResult> = files.par_iter().flat_map(|p| check(p)).collect();
    emit_results(&results);
}

fn emit_results(results: &[FileResult]) {
    let mut fixed = 0usize;
    for r in results {
        match r {
            FileResult::Issue(issue) => emit(issue),
            FileResult::Fixed => fixed += 1,
        }
    }
    emit_fix_summary(fixed);
}
