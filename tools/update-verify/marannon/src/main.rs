/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
mod cli;
mod downloader;
mod runner;
mod test;
mod updater;

use std::collections::HashMap;
use std::fs::{create_dir, exists};
use std::path::{Path, PathBuf};
use std::process::exit;
use std::thread;
use tempfile::TempDir;

use anyhow::{anyhow, Result};
use env_logger::{Builder, Env};
use log::info;

use crate::cli::Args;
use crate::downloader::{FileDownloader, UreqDownloader};
use crate::runner::RealRunner;
use crate::test::{run_tests, Test, TestResult};

/// Returns what we consider to be the file extension. In most cases this is
/// simply everything after the last `.`.
fn get_extension(filename: &str) -> Option<&str> {
    if filename.ends_with(".tar.xz") {
        return Some("tar.xz");
    }
    return Path::new(filename).extension()?.to_str();
}

fn main() -> Result<()> {
    Builder::from_env(Env::default().default_filter_or("info")).init();
    let args = Args::parse_and_validate();
    // Using `keep()` prevents the temporary directory from being cleaned up.
    // This is on purpose. When running in CI any necessary cleanup is handled
    // by CI (eg: making sure artifacts from an earlier task are removed before
    // a new task begins). When running locally it's preferable to keep artifacts
    // around for debugging.
    let tmpdir = TempDir::with_prefix("update-verify")?.keep();
    let tmppath = tmpdir
        .to_str()
        .ok_or_else(|| anyhow!("Couldn't parse tmpdir"))?;
    info!("Using tmpdir: {tmppath}");

    let mut cache_dir = tmpdir.clone();
    cache_dir.push("download_cache");
    create_dir(&cache_dir)?;

    let downloader = UreqDownloader;
    let runner = RealRunner;
    let parallelism = match args.parallelism {
        Some(j) => j,
        None => thread::available_parallelism()
            .map(|n| n.get())
            .unwrap_or(1),
    };
    info!("parallelism set to: {parallelism}");

    let mut tests = Vec::new();
    let mut download_dir = tmpdir.clone();
    download_dir.push("from_builds");
    create_dir(download_dir.as_path())?;

    if !exists(&args.artifact_dir)? {
        create_dir(&args.artifact_dir)?;
    }

    // Associate URLs of files we'll be downloading with an on-disk location.
    // Doing this before doing any downloads ensures that there will be no
    // conflicts in on-disk locations, and thus no need to do any locking
    // to download them in parallel.
    let mut package_dest_paths: HashMap<String, PathBuf> = HashMap::new();
    for (i, entry) in args.from.iter().enumerate() {
        let mut installer_dest_path = download_dir.clone();
        let ext = get_extension(&entry.installer)
            .ok_or_else(|| anyhow!("Couldn't find from installer extension!"))?;
        installer_dest_path.push(format!("{i}.{ext}"));
        package_dest_paths
            .entry(entry.installer.clone())
            .or_insert(installer_dest_path);
        let mut updater_dest_path = download_dir.clone();
        updater_dest_path.push(format!("{i}.updater.tar.xz"));
        // In some cases, the updater package will be the same as the installer,
        // in which case this is a no-op.
        package_dest_paths
            .entry(entry.updater_package.clone())
            .or_insert(updater_dest_path);
    }

    // Download the packages.
    // In order to chunk, we need a Vec version of `package_dest_paths`.
    let entries: Vec<_> = package_dest_paths.iter().collect();
    let chunk_size = package_dest_paths.len().div_ceil(parallelism).max(1);
    thread::scope(|s| -> Result<()> {
        let handles: Vec<_> = entries
            .chunks(chunk_size)
            .map(|chunk| {
                // Create local references that can be moved into the thread.
                let cache_dir_ref = &cache_dir;
                let downloader_ref = &downloader;

                return s.spawn(move || {
                    return chunk
                        .iter()
                        .map(|(from_package, dest_path)| {
                            return downloader_ref.fetch(from_package, dest_path, cache_dir_ref);
                        })
                        .collect::<Vec<_>>();
                });
            })
            .collect();

        // Join the threads, check for errors
        for h in handles {
            h.join()
                // Handle errors that come up when joining the thread
                .map_err(|_| anyhow::anyhow!("download thread panicked"))?;
        }

        return Ok(());
    })?;

    // Iterate over `from` builds given, download them, and create Test objects for each.
    // All `from` builds given will be tested against the complete MAR. Entries that also
    // contained a partial MAR will be additionally tested against that.
    for entry in args.from {
        tests.push(Test {
            id: entry.id.clone(),
            mar: args.complete_mar.to_path_buf(),
            from_installer: package_dest_paths[&entry.installer].clone(),
            locale: args.locale.clone(),
            updater_package: package_dest_paths[&entry.updater_package].clone(),
        });
        if let Some(partial_mar) = &entry.partial_mar {
            let mut partial_path = args.partial_mar_dir.to_path_buf();
            partial_path.push(partial_mar);
            tests.push(Test {
                id: entry.id.clone(),
                mar: partial_path,
                from_installer: package_dest_paths[&entry.installer].clone(),
                locale: args.locale.clone(),
                updater_package: package_dest_paths[&entry.updater_package].clone(),
            });
        }
    }
    let results = run_tests(
        &args.check_updates_script,
        &args.target_platform,
        &args.to_installer,
        &args.channel,
        &args.appname,
        args.cert_dir.as_deref(),
        &args.cert_override,
        tests,
        &tmpdir,
        &args.artifact_dir,
        &runner,
        parallelism,
    )?;
    let passes = results.iter().filter(|r| **r == TestResult::Pass).count();
    let fails = results.len() - passes;
    info!("Summary of results: {} PASS, {} FAIL", passes, fails);
    if fails > 0 {
        exit(1);
    }

    return Ok(());
}

#[cfg(test)]
mod tests {
    use super::get_extension;

    #[test]
    fn tar_xz() {
        assert_eq!(get_extension("foo.tar.xz"), Some("tar.xz"));
    }

    #[test]
    fn exe() {
        assert_eq!(get_extension("foo.exe"), Some("exe"));
    }

    #[test]
    fn no_ext() {
        assert_eq!(get_extension("foo"), None);
    }
}
