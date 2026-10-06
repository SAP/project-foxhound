// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

//! Path utilities for expanding file lists with exclusion and extension filtering.
//!
//! This module resolves a mixed list of files and directories into a flat list
//! of files, applying glob-based exclusions and extension filters. It is used
//! by the batch runner to turn mozlint's input paths into the concrete set of
//! files each checker should process.

use std::path::Path;

use globset::{Glob, GlobSet, GlobSetBuilder};
use ignore::overrides::OverrideBuilder;
use ignore::types::TypesBuilder;
use ignore::WalkBuilder;

/// Expands a list of files and directories into individual file paths,
/// filtering by `extensions` and removing entries matching `exclude` patterns.
///
/// Paths are resolved relative to `root`. When `find_dotfiles` is true,
/// hidden files and directories (starting with `.`) are included.
pub fn expand_exclusions(
    paths: &[String],
    extensions: &[String],
    exclude: &[String],
    root: &str,
    find_dotfiles: bool,
) -> Vec<String> {
    let root_path = Path::new(root);
    let excludes: Vec<String> = exclude.iter().map(|e| normalize(e, root_path)).collect();
    let glob_excludes = build_glob_excludes(&excludes);

    let mut result = Vec::new();
    for path in paths {
        let p = Path::new(path);
        if p.is_file() {
            if is_excluded(path, &excludes, &glob_excludes) {
                continue;
            }
            result.push(path.clone());
        } else if p.is_dir() {
            walk_directory(path, extensions, &excludes, find_dotfiles, &mut result);
        }
    }
    result
}

/// Converts a relative path to absolute by joining it with `root`.
fn normalize(path: &str, root: &Path) -> String {
    if Path::new(path).is_absolute() {
        path.to_string()
    } else {
        root.join(path).to_string_lossy().to_string()
    }
}

/// Builds a [`GlobSet`] from exclude patterns that contain wildcards.
fn build_glob_excludes(excludes: &[String]) -> GlobSet {
    let mut builder = GlobSetBuilder::new();
    for pattern in excludes.iter().filter(|e| e.contains('*')) {
        if let Ok(glob) = Glob::new(pattern) {
            builder.add(glob);
        }
    }
    builder
        .build()
        .unwrap_or_else(|_| GlobSetBuilder::new().build().unwrap())
}

/// Returns `true` if `path` matches any literal prefix or glob in the exclude list.
fn is_excluded(path: &str, excludes: &[String], glob_excludes: &GlobSet) -> bool {
    let p = Path::new(path);
    excludes
        .iter()
        .any(|e| !e.contains('*') && p.starts_with(e))
        || glob_excludes.is_match(p)
}

/// Recursively walks `dir`, collecting files that match `extensions` while
/// skipping paths in `excludes`. Uses the `ignore` crate for efficient
/// directory traversal with override-based filtering.
fn walk_directory(
    dir: &str,
    extensions: &[String],
    excludes: &[String],
    find_dotfiles: bool,
    result: &mut Vec<String>,
) {
    if extensions.is_empty() {
        return;
    }

    let mut builder = WalkBuilder::new(dir);
    builder
        .hidden(!find_dotfiles)
        .ignore(false)
        .git_ignore(false)
        .git_global(false)
        .git_exclude(false);

    // Use TypesBuilder for extension filtering.
    let mut types = TypesBuilder::new();
    for ext in extensions {
        let _ = types.add("lint", &format!("*.{ext}"));
    }
    types.select("lint");
    if let Ok(t) = types.build() {
        builder.types(t);
    }

    // Use overrides for exclusion patterns (both literal paths and globs).
    let mut ob = OverrideBuilder::new("/");
    if !find_dotfiles {
        let _ = ob.add("!.*");
        let _ = ob.add("!.*/**");
    }
    for pattern in excludes {
        let _ = ob.add(&format!("!{pattern}"));
        if !pattern.contains('*') {
            let _ = ob.add(&format!("!{pattern}/**"));
        }
    }
    if let Ok(overrides) = ob.build() {
        builder.overrides(overrides);
    }

    for entry in builder.build().flatten() {
        let Some(ft) = entry.file_type() else {
            continue;
        };
        if ft.is_file() {
            result.push(entry.path().to_string_lossy().to_string());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_expand_exclusions_files() {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path().to_str().unwrap().to_string();

        let f1 = dir.path().join("foo.js");
        let f2 = dir.path().join("bar.js");
        let f3 = dir.path().join("excluded.js");
        fs::write(&f1, "").unwrap();
        fs::write(&f2, "").unwrap();
        fs::write(&f3, "").unwrap();

        let paths = vec![
            f1.to_str().unwrap().to_string(),
            f2.to_str().unwrap().to_string(),
            f3.to_str().unwrap().to_string(),
        ];
        let exclude = vec![f3.to_str().unwrap().to_string()];

        let result = expand_exclusions(&paths, &["js".to_string()], &exclude, &root, false);
        assert_eq!(result.len(), 2);
        assert!(result.contains(&f1.to_str().unwrap().to_string()));
        assert!(result.contains(&f2.to_str().unwrap().to_string()));
    }

    #[test]
    fn test_expand_exclusions_directory() {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path().to_str().unwrap().to_string();

        let sub = dir.path().join("src");
        fs::create_dir(&sub).unwrap();
        fs::write(sub.join("a.js"), "").unwrap();
        fs::write(sub.join("b.py"), "").unwrap();
        fs::write(sub.join("c.js"), "").unwrap();

        let paths = vec![sub.to_str().unwrap().to_string()];
        let result = expand_exclusions(&paths, &["js".to_string()], &[], &root, false);

        assert_eq!(result.len(), 2);
        assert!(result.iter().all(|p| Path::new(p)
            .extension()
            .is_some_and(|ext| ext.eq_ignore_ascii_case("js"))));
    }

    #[test]
    fn test_expand_exclusions_glob_exclude() {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path().to_str().unwrap().to_string();

        let sub = dir.path().join("src");
        fs::create_dir(&sub).unwrap();
        let test_dir = sub.join("test");
        fs::create_dir(&test_dir).unwrap();
        fs::write(sub.join("main.js"), "").unwrap();
        fs::write(test_dir.join("test.js"), "").unwrap();

        let paths = vec![sub.to_str().unwrap().to_string()];
        let exclude = vec![format!("{}/**/test/**", root)];
        let result = expand_exclusions(&paths, &["js".to_string()], &exclude, &root, false);

        assert_eq!(result.len(), 1);
        assert!(result[0].ends_with("main.js"));
    }

    #[test]
    fn test_expand_exclusions_no_extensions_skips_dirs() {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path().to_str().unwrap().to_string();

        let sub = dir.path().join("src");
        fs::create_dir(&sub).unwrap();
        fs::write(sub.join("a.js"), "").unwrap();

        let paths = vec![sub.to_str().unwrap().to_string()];
        let result = expand_exclusions(&paths, &[], &[], &root, false);
        assert!(result.is_empty());
    }

    #[test]
    fn test_expand_exclusions_relative_exclude() {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path().to_str().unwrap().to_string();

        let f1 = dir.path().join("keep.js");
        let sub = dir.path().join("skip");
        fs::create_dir(&sub).unwrap();
        let f2 = sub.join("bad.js");
        fs::write(&f1, "").unwrap();
        fs::write(&f2, "").unwrap();

        let paths = vec![
            f1.to_str().unwrap().to_string(),
            f2.to_str().unwrap().to_string(),
        ];
        let exclude = vec!["skip".to_string()];

        let result = expand_exclusions(&paths, &["js".to_string()], &exclude, &root, false);
        assert_eq!(result.len(), 1);
        assert!(result[0].ends_with("keep.js"));
    }

    #[test]
    fn test_expand_exclusions_skips_dotfiles() {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path().to_str().unwrap().to_string();

        let sub = dir.path().join("src");
        fs::create_dir(&sub).unwrap();
        fs::write(sub.join("visible.js"), "").unwrap();
        fs::write(sub.join(".hidden.js"), "").unwrap();
        let dotdir = sub.join(".dotdir");
        fs::create_dir(&dotdir).unwrap();
        fs::write(dotdir.join("inside.js"), "").unwrap();

        let paths = vec![sub.to_str().unwrap().to_string()];
        let result = expand_exclusions(&paths, &["js".to_string()], &[], &root, false);

        assert_eq!(result.len(), 1);
        assert!(result[0].ends_with("visible.js"));
    }

    #[test]
    fn test_exclude_uses_path_components_not_string_prefix() {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path().to_str().unwrap().to_string();

        let sub = dir.path().join("src");
        fs::create_dir(&sub).unwrap();
        let test_dir = sub.join("test");
        fs::create_dir(&test_dir).unwrap();
        let testing_dir = sub.join("testing");
        fs::create_dir(&testing_dir).unwrap();
        fs::write(test_dir.join("a.js"), "").unwrap();
        fs::write(testing_dir.join("b.js"), "").unwrap();

        let paths = vec![sub.to_str().unwrap().to_string()];
        let exclude = vec![test_dir.to_str().unwrap().to_string()];
        let result = expand_exclusions(&paths, &["js".to_string()], &exclude, &root, false);

        // "testing/b.js" must NOT be excluded by the "test" exclude
        assert_eq!(result.len(), 1);
        assert!(result[0].ends_with("testing/b.js"));
    }

    #[test]
    fn test_exclude_specific_file_during_directory_walk() {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path().to_str().unwrap().to_string();

        let sub = dir.path().join("src");
        fs::create_dir(&sub).unwrap();
        fs::write(sub.join("keep.js"), "").unwrap();
        fs::write(sub.join("skip.js"), "").unwrap();

        let paths = vec![sub.to_str().unwrap().to_string()];
        let exclude = vec![sub.join("skip.js").to_str().unwrap().to_string()];
        let result = expand_exclusions(&paths, &["js".to_string()], &exclude, &root, false);

        assert_eq!(result.len(), 1);
        assert!(result[0].ends_with("keep.js"));
    }

    #[test]
    fn test_exclude_prunes_directory_walk() {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path().to_str().unwrap().to_string();

        let sub = dir.path().join("src");
        fs::create_dir(&sub).unwrap();
        let excluded_dir = sub.join("vendor");
        fs::create_dir(&excluded_dir).unwrap();
        let deep = excluded_dir.join("deep");
        fs::create_dir(&deep).unwrap();
        fs::write(sub.join("main.js"), "").unwrap();
        fs::write(excluded_dir.join("lib.js"), "").unwrap();
        fs::write(deep.join("nested.js"), "").unwrap();

        let paths = vec![sub.to_str().unwrap().to_string()];
        let exclude = vec![excluded_dir.to_str().unwrap().to_string()];
        let result = expand_exclusions(&paths, &["js".to_string()], &exclude, &root, false);

        assert_eq!(result.len(), 1);
        assert!(result[0].ends_with("main.js"));
    }

    #[test]
    fn test_glob_exclude_on_individual_files() {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path().to_str().unwrap().to_string();

        let f1 = dir.path().join("keep.js");
        let f2 = dir.path().join("skip.test.js");
        fs::write(&f1, "").unwrap();
        fs::write(&f2, "").unwrap();

        let paths = vec![
            f1.to_str().unwrap().to_string(),
            f2.to_str().unwrap().to_string(),
        ];
        let exclude = vec![format!("{}/*.test.js", root)];

        let result = expand_exclusions(&paths, &["js".to_string()], &exclude, &root, false);
        assert_eq!(result.len(), 1);
        assert!(result[0].ends_with("keep.js"));
    }
}
