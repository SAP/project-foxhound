/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

use std::path::{absolute, PathBuf};

use clap::{CommandFactory, Parser};

use crate::updater::CertOverride;

/// Represents a build that we want to test updating from
#[derive(Clone)]
pub struct FromBuild {
    pub id: String,
    pub installer: String,
    pub updater_package: String,
    pub partial_mar: Option<PathBuf>,
}

impl std::str::FromStr for FromBuild {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let parts: Vec<&str> = s.splitn(4, '|').collect();
        if parts.len() < 3 {
            return Err(format!(
                "expected 'id|installer|updater_package|partial', got: {s}"
            ));
        }
        Ok(FromBuild {
            id: parts[0].to_string(),
            installer: parts[1].to_string(),
            updater_package: parts[2].to_string(),
            partial_mar: parts.get(3).map(|s| PathBuf::from(s)),
        })
    }
}

#[derive(Parser)]
pub struct Args {
    /// Path to check_updates.sh. May be relative or absolute.
    pub check_updates_script: PathBuf,
    /// Platform of the updates under test.
    pub target_platform: String,
    /// Path to the installer of the `to` build. Updated `from` builds are compared against this to
    /// look for differences.
    pub to_installer: PathBuf,
    /// Complete MAR to test against each `from` build.
    pub complete_mar: PathBuf,
    /// Directory containing any partials referenced in a `--from` argument
    pub partial_mar_dir: PathBuf,
    /// Locale of the updates under test. Needed to fully unpack `from` and `to` builds.
    pub locale: String,
    /// Channel of the updates under test. Needed to fully unpack `from` and `to` builds.
    pub channel: String,
    /// Product of the updates under test. Needed to accurately assess acceptable differences
    /// found.
    pub appname: String,
    /// Directory to put artifacts, eg: diffs
    pub artifact_dir: PathBuf,
    /// Information about a `from` build to test, separated by a `|`:
    /// - A human readable identifier (buildid, app version, anything you want)
    /// - An URL where the installer can be retrieved
    /// - An URL where a .tar.xz package containing the `updater` to use when applying the MAR.
    /// - A filename of a partial MAR, relative to `--partial-mar-dir`, of a
    ///   partial MAR that applies to this build. Optional.
    #[arg(long, required = true)]
    pub from: Vec<FromBuild>,
    /// Replace first cert with second cert in the updater binary, eg:
    /// release_primary.der|dep1.der. May be passed multiple times. If passed,
    /// `--cert-replace-script` and `--cert-dir` must also be passed.
    #[arg(long)]
    pub cert_override: Vec<CertOverride>,
    /// Path to directory that contains mar certs. Required when --cert-override is given.
    #[arg(long)]
    pub cert_dir: Option<PathBuf>,
    #[arg(short = 'j', long)]
    pub parallelism: Option<usize>,
}

impl Args {
    pub fn parse_and_validate() -> Self {
        let mut args = Self::parse();
        if !args.cert_override.is_empty() {
            if args.cert_dir.is_none() {
                Self::command()
                    .error(
                        clap::error::ErrorKind::MissingRequiredArgument,
                        "--cert-dir is required when --cert-override is given",
                    )
                    .exit();
            }

            let cert_dir = args.cert_dir.as_ref().unwrap();
            for cert_pair in &args.cert_override {
                let orig_len = std::fs::metadata(cert_dir.join(&cert_pair.orig))
                    .unwrap_or_else(|e| {
                        Self::command()
                            .error(
                                clap::error::ErrorKind::InvalidValue,
                                format!("Failed to stat cert '{}': {e}", cert_pair.orig),
                            )
                            .exit()
                    })
                    .len();
                let replacement_len = std::fs::metadata(cert_dir.join(&cert_pair.replacement))
                    .unwrap_or_else(|e| {
                        Self::command()
                            .error(
                                clap::error::ErrorKind::InvalidValue,
                                format!("Failed to stat cert '{}': {e}", cert_pair.replacement),
                            )
                            .exit()
                    })
                    .len();
                if orig_len != replacement_len {
                    Self::command()
                        .error(
                            clap::error::ErrorKind::InvalidValue,
                            format!(
                                "certs '{}' and '{}' must be the same length, but are {} and {} bytes respectively",
                                cert_pair.orig, cert_pair.replacement, orig_len, replacement_len
                            ),
                        )
                        .exit();
                }
            }
        }
        args.check_updates_script = absolute(args.check_updates_script)
            .expect("Failed to convert check updates script into an absolute path!");
        return args;
    }
}
