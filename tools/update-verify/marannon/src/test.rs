/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
use std::collections::HashMap;
use std::ffi::OsStr;
use std::fmt::{Display, Error, Formatter};
use std::fs::{create_dir, File};
use std::io::Write;
use std::os::unix::fs::symlink;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::thread;

use anyhow::{anyhow, Result};
use log::{error, info};

use crate::runner::CommandRunner;
use crate::updater::{prepare_updater, CertOverride};

pub struct Test {
    /// A human readable identifier for the `from` build under test. Eg: a buildid
    /// or app version.
    pub id: String,
    /// The `from` installer to use as a starting point for the test
    pub from_installer: PathBuf,
    /// The locale of the `from` installer (needed to fully unpack it)
    pub locale: String,
    /// The MAR file to apply to the unpacked `from` installer
    pub mar: PathBuf,
    /// The package containing the updater to use when applying the MAR
    pub updater_package: PathBuf,
}

impl Display for Test {
    fn fmt(&self, f: &mut Formatter<'_>) -> Result<(), Error> {
        write!(f, "{}", self.full_id())?;
        return Ok(());
    }
}

impl Test {
    fn full_id(&self) -> String {
        let mar_filename = self
            .mar
            .file_name()
            .unwrap_or(OsStr::new("unknown_mar_name"))
            .to_str()
            .unwrap_or("unknown_mar_name");
        return format!("{}-{}-{}", self.id, self.locale, mar_filename);
    }
}

pub(crate) struct TestOutcome {
    pub(crate) label: String,
    pub(crate) result: TestResult,
    pub(crate) output: String,
}

#[derive(Debug, PartialEq)]
pub enum TestResult {
    Pass,
    /// Updater did not run succesfully.
    UpdateStatusErr,
    /// UpdateSettings.framework is missing in the updated build (mac only)
    UpdateSettingsMissingErr,
    /// ChannelPrefs.framework is missing in the updated build (mac only)
    ChannelPrefsMissingErr,
    /// Unacceptable differences found between the MAR and installer
    DifferencesFoundErr,
    /// Error running `diff`
    DiffErr,
    /// Novel error occurred - such things may benefit from distinct results
    /// or to be converted to SetupErr when encountered!
    UnknownErr,
    /// Setup problems are not results in the same way that specific failure
    /// modes are; we group them all together and allow for additional
    /// information to be included in them for this reason.
    SetupErr(String),
}

pub(crate) fn run_tests(
    check_updates: &Path,
    target_platform: &str,
    to_installer: &Path,
    channel: &str,
    appname: &str,
    cert_dir: Option<&Path>,
    cert_overrides: &Vec<CertOverride>,
    tests: Vec<Test>,
    tmpdir: &Path,
    artifact_dir: &Path,
    runner: &(dyn CommandRunner + Sync),
    parallelism: usize,
) -> Result<Vec<TestResult>> {
    let mut updater_binaries: HashMap<PathBuf, PathBuf> = HashMap::new();

    // Prepare updater packages
    // Find distinct updater packages (so we don't process repeated ones
    // more than once).
    let mut distinct_updater_packages: Vec<PathBuf> =
        tests.iter().map(|t| t.updater_package.clone()).collect();
    distinct_updater_packages.sort();
    distinct_updater_packages.dedup();

    // Decide on locations for them.
    let updater_locations: HashMap<PathBuf, PathBuf> = distinct_updater_packages
        .iter()
        .map(|updater_package| -> Result<(PathBuf, PathBuf)> {
            let unpack_dir = tempfile::Builder::new()
                .prefix("updater_")
                .tempdir_in(tmpdir)?
                .keep();
            return Ok((updater_package.clone(), unpack_dir));
        })
        .collect::<Result<HashMap<_, _>>>()?;

    // Unpack into the desired locations.
    let updater_items: Vec<_> = updater_locations.iter().collect();
    let chunk_size = updater_items.len().div_ceil(parallelism).max(1);
    let updater_results: Vec<_> = thread::scope(|s| -> Result<Vec<_>> {
        let handles: Vec<_> = updater_items
            // Return `chunk_size` updater packages at a time
            .chunks(chunk_size)
            // For each chunk...
            .map(|chunk| {
                // Spawn a thread...
                s.spawn(move || {
                    chunk
                        .iter()
                        // For each updater package in the chunk...
                        .map(|(updater_package, unpack_dir)| {
                            // Unpack it...
                            let result = prepare_updater(
                                updater_package,
                                appname,
                                cert_dir,
                                cert_overrides,
                                unpack_dir,
                            );

                            // And return the package along with the
                            // Result (whose Ok value is the path to the
                            // containing updater binary on disk).
                            return (*updater_package, result);
                        })
                        .collect::<Vec<_>>()
                })
            })
            .collect();

        let mut results = Vec::with_capacity(updater_items.len());
        for h in handles {
            let chunk_result = h
                .join()
                // Handle errors that come up when joining the thread
                .map_err(|_| anyhow::anyhow!("prepare updater thread panicked"))?;
            results.extend(chunk_result);
        }
        Ok(results)
    })?;

    for (package, result) in updater_results {
        match result {
            Ok(updater) => {
                updater_binaries.insert(package.clone(), updater);
            }
            // Handle errors that came up when preparing an updater
            Err(e) => return Err(e),
        }
    }

    // Creating a named reference to `updater_binaries` allows it to be moved
    // into the thread scope multiple times (because references can be copied).
    // Without this, the thread scope tries to move the owned `updater_binaries`
    // which fails because HashMaps are not copyable.
    let updater_binaries_ref = &updater_binaries;
    let chunk_size = tests.len().div_ceil(parallelism).max(1);
    let outcomes: Vec<TestOutcome> = thread::scope(|s| -> Result<Vec<TestOutcome>> {
        let handles: Vec<_> = tests
            .chunks(chunk_size)
            .map(|chunk| {
                s.spawn(move || {
                    chunk
                        .iter()
                        .map(|test| {
                            let updater = updater_binaries_ref[&test.updater_package].clone();
                            match run_test(
                                test,
                                &updater,
                                check_updates,
                                target_platform,
                                to_installer,
                                channel,
                                appname,
                                tmpdir,
                                artifact_dir,
                                runner,
                            ) {
                                Ok(o) => o,
                                // Any errors coming from `run_test` constitute
                                // a test failure. Unlike other errors (eg: when
                                // unpacking updaters above), these do not
                                // constitute an overall error with the program
                                // that we need to exit for -- they are simply
                                // converted to a TestResult indicating the
                                // error.
                                Err(e) => TestOutcome {
                                    label: test.to_string(),
                                    result: TestResult::SetupErr(e.to_string()),
                                    output: String::new(),
                                },
                            }
                        })
                        .collect::<Vec<_>>()
                })
            })
            .collect();

        let mut outcomes = vec![];
        for h in handles {
            let chunk_result = h
                .join()
                .map_err(|_| anyhow::anyhow!("test thread panicked"))?;
            outcomes.extend(chunk_result);
        }
        Ok(outcomes)
    })?;

    let mut results = Vec::with_capacity(tests.len());
    for outcome in outcomes {
        if outcome.result == TestResult::Pass {
            info!("TEST-PASS: {}", outcome.label);
        } else {
            error!("{}", outcome.output);
            info!("TEST-UNEXPECTED-FAIL: {}", outcome.label);
        }
        results.push(outcome.result);
    }
    return Ok(results);
}

fn run_test(
    test: &Test,
    updater: &Path,
    check_updates: &Path,
    target_platform: &str,
    to_installer: &Path,
    channel: &str,
    appname: &str,
    tmpdir: &Path,
    artifact_dir: &Path,
    runner: &dyn CommandRunner,
) -> Result<TestOutcome> {
    info!("TEST-START: {}", test.full_id());

    let test_dir = setup_test_dir(&test.mar, tmpdir)?;
    let mut diff_file = artifact_dir.to_path_buf();
    diff_file.push(format!("{}.summary.log", test.full_id()));

    let mut cmd = Command::new("/bin/bash");
    cmd.arg(check_updates)
        .arg(target_platform)
        .arg(&test.from_installer)
        .arg(to_installer)
        .arg(&test.locale)
        .arg(updater)
        .arg(diff_file.to_str().unwrap())
        .arg(channel)
        // check_updates.sh requires positional args that we don't use
        .arg("")
        .arg("")
        // mac-only option that tells `check_updates.sh` where to find
        // a usable `update-settings.ini` file that the updater requires
        // this file is always located in the same dir as the `updater`
        // binary. `check_updates.sh` ignores this option on other platforms.
        .arg(
            updater
                .parent()
                .ok_or_else(|| anyhow!("Couldn't determine update-settings.ini dir!"))?,
        )
        .arg(appname)
        .current_dir(test_dir);
    let command_result = runner.run(cmd)?;
    let result = match command_result.exit_code {
        0 => TestResult::Pass,
        1 => TestResult::SetupErr("Failed to unpack from or to build".to_string()),
        2 => TestResult::SetupErr("Failed to cd into from build application directory".to_string()),
        3 => TestResult::SetupErr("from build application directory does not exist".to_string()),
        4 => TestResult::UpdateStatusErr,
        5 => TestResult::UpdateSettingsMissingErr,
        6 => TestResult::ChannelPrefsMissingErr,
        7 => TestResult::DifferencesFoundErr,
        8 => TestResult::DiffErr,
        _ => TestResult::UnknownErr,
    };

    // save the output to an artifact
    let mut output_file = artifact_dir.to_path_buf();
    output_file.push(format!("{}.output.log", test.full_id()));
    let mut f = File::create(output_file)?;
    f.write_all(command_result.output.as_bytes())?;

    return Ok(TestOutcome {
        label: test.full_id(),
        result: result,
        output: command_result.output,
    });
}

/// Setup the test directory in a way that is compatible with the expectations
/// of `check_updates.sh`: create a fresh directory with an `update` directory
/// inside of it, containing the MAR to be applied in `update.mar`.
/// When we get rid of `check_updates.sh` we can consider changing or getting
/// rid of this.
fn setup_test_dir(mar: &Path, tmpdir: &Path) -> Result<PathBuf> {
    let test_dir = tempfile::Builder::new()
        .prefix("work_")
        .tempdir_in(tmpdir)?
        .keep();
    let mut update_dir = test_dir.clone();
    update_dir.push("update");
    create_dir(update_dir.as_path())?;
    let mut mar_path = update_dir.clone();
    mar_path.push("update.mar");
    symlink(mar, mar_path.as_path())?;
    return Ok(test_dir);
}

#[cfg(test)]
mod tests {
    use crate::runner::CommandResult;

    use super::*;
    use tempfile::TempDir;

    struct FakeRunner(i32);
    impl CommandRunner for FakeRunner {
        fn run(&self, _: Command) -> Result<CommandResult> {
            Ok(CommandResult {
                exit_code: self.0,
                output: String::new(),
            })
        }
    }

    #[test]
    fn setup_test_dir_creates_expected_layout() {
        let tmpdir = TempDir::with_prefix("marannon_setup_test").unwrap();
        let tmp = tmpdir.path().to_path_buf();

        let mar = tmp.join("test.mar");
        std::fs::write(&mar, b"fake").unwrap();

        let test_dir = setup_test_dir(&mar, &tmp).unwrap();

        assert!(test_dir.exists());
        assert!(test_dir.join("update").exists());
        assert!(test_dir.join("update").join("update.mar").exists());
    }

    #[test]
    fn run_tests_setup_err_on_bad_installer() {
        let tmpdir = TempDir::with_prefix("marannon_run_tests").unwrap();
        let tmp = tmpdir.path();
        let artifact_dir = TempDir::with_prefix("marannon_artifacts").unwrap();
        let artifacts = artifact_dir.path();

        let test = Test {
            id: "from".to_string(),
            mar: tmp.join("test.mar"),
            from_installer: PathBuf::from("/nonexistent/installer.tar.xz"),
            updater_package: PathBuf::from("/nonexistent/installer.tar.xz"),
            locale: "en-US".to_string(),
        };

        let result = run_tests(
            &PathBuf::from("/fake/check_updates.sh"),
            "linux",
            &PathBuf::from("/fake/to_installer"),
            "release",
            "firefox",
            None,
            &vec![],
            vec![test],
            &tmp.to_path_buf(),
            &artifacts.to_path_buf(),
            &FakeRunner(0),
            1,
        );
        assert!(result.is_err());
        let e = result.unwrap_err();
        assert!(e.to_string().contains("No such file or directory"));
    }
}
