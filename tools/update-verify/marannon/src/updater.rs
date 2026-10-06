/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

use std::fs::{File, OpenOptions};
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use tar::Archive;
use xz::read::XzDecoder;

use anyhow::{anyhow, bail, Result};
use log::info;

/// Represents a certificate in an updater binary that should be replaced
/// if present.
#[derive(Clone)]
pub(crate) struct CertOverride {
    pub(crate) orig: String,
    pub(crate) replacement: String,
}

impl std::str::FromStr for CertOverride {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let parts: Vec<&str> = s.splitn(2, '|').collect();
        if parts.len() != 2 {
            return Err(format!("expected 'orig|replacement', got: {s}"));
        }
        Ok(CertOverride {
            orig: parts[0].to_string(),
            replacement: parts[1].to_string(),
        })
    }
}

/// Prepare an updater `pkg` for usage by unpacking it and replacing any requested certs in the
/// updater binary inside.
pub(crate) fn prepare_updater(
    pkg: &Path,
    appname: &str,
    cert_dir: Option<&Path>,
    cert_overrides: &[CertOverride],
    output_dir: &Path,
) -> Result<PathBuf> {
    let updater = unpack_updater(pkg, appname, output_dir)?;
    if !cert_overrides.is_empty() {
        replace_certs(
            cert_dir.ok_or_else(|| anyhow!("cert_dir is required to override certs"))?,
            &updater,
            cert_overrides,
        )?;
    }
    return Ok(updater);
}

fn unpack_updater(pkg: &Path, appname: &str, output_dir: &Path) -> Result<PathBuf> {
    let compressed = File::open(pkg)?;
    let tar = XzDecoder::new(compressed);
    let mut archive = Archive::new(tar);
    archive.unpack(output_dir)?;
    let mut updater_binary = output_dir.to_path_buf();
    updater_binary.push(appname);
    updater_binary.push("updater");
    let updater_path = updater_binary
        .to_str()
        .ok_or_else(|| anyhow!("Couldn't parse updater binary path"))?;
    if !updater_binary.exists() {
        bail!("updater binary doesn't exist at {updater_path}");
    }
    return Ok(updater_binary);
}

fn replace_certs(cert_dir: &Path, updater: &Path, overrides: &[CertOverride]) -> Result<()> {
    // read the entire updater into memory; we need to do this to find cert
    // offsets further down
    let mut updater_bytes = Vec::new();
    let mut updater_file = OpenOptions::new().read(true).write(true).open(updater)?;
    updater_file.read_to_end(&mut updater_bytes)?;

    let updater_str = updater.to_str().unwrap_or("updater");

    for cert_pair in overrides {
        let before_bytes = read_cert(cert_dir, &cert_pair.orig)?;
        let after_bytes = read_cert(cert_dir, &cert_pair.replacement)?;

        // find the offset of the `orig` cert
        let offset = match updater_bytes
            .windows(before_bytes.len())
            .position(|w| w == before_bytes)
        {
            Some(o) => o,
            // If the `orig` cert isn't found there's simply nothing to do; this
            // is not a fatal error.
            None => continue,
        };

        // seek to the start of the `orig` cert and replace it with `replacement`
        // this relies on the fact that the certs are the same length, which is
        // checked at start-up.
        updater_file.seek(SeekFrom::Start(offset as u64))?;
        updater_file.write_all(&after_bytes)?;

        info!(
            "Replaced {} with {} in {}",
            cert_pair.orig, cert_pair.replacement, updater_str
        );
    }

    return Ok(());
}

fn read_cert(cert_dir: &Path, cert_name: &str) -> Result<Vec<u8>> {
    let cert_path = cert_dir.join(cert_name);
    let mut cert_bytes = Vec::new();
    File::open(cert_path)?.read_to_end(&mut cert_bytes)?;
    return Ok(cert_bytes);
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{io::Read, str::FromStr};
    use tempfile::TempDir;

    fn fixture_dir() -> PathBuf {
        return Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures");
    }

    fn fixture(item: &Path) -> PathBuf {
        return fixture_dir().join(item);
    }

    fn make_tar_xz(appname: &str, output: &std::path::Path) {
        use tar::Header;
        use xz::write::XzEncoder;

        let file = File::create(output).unwrap();
        let enc = XzEncoder::new(file, 6);
        let mut builder = tar::Builder::new(enc);

        let content = b"#!/bin/sh\n";
        let mut header = Header::new_gnu();
        header.set_path(format!("{appname}/updater")).unwrap();
        header.set_size(content.len() as u64);
        header.set_mode(0o755);
        header.set_cksum();
        builder.append(&header, &content[..]).unwrap();

        let enc = builder.into_inner().unwrap();
        enc.finish().unwrap();
    }

    #[test]
    fn cert_override_valid() {
        let c = CertOverride::from_str("a.der|b.der").unwrap();
        assert_eq!(c.orig, "a.der");
        assert_eq!(c.replacement, "b.der");
    }

    #[test]
    fn cert_override_missing_pipe() {
        assert!(CertOverride::from_str("nodivider").is_err());
    }

    #[test]
    fn cert_override_extra_pipes_preserved_in_replacement() {
        let c = CertOverride::from_str("a.der|b.der|extra").unwrap();
        assert_eq!(c.orig, "a.der");
        assert_eq!(c.replacement, "b.der|extra");
    }

    #[test]
    fn unpack_updater_success() {
        let tmpdir = TempDir::with_prefix("marannon_updater_test").unwrap();
        let archive = tmpdir.path().join("test.tar.xz");
        let output_dir = tmpdir.path().join("output");
        std::fs::create_dir(&output_dir).unwrap();

        make_tar_xz("firefox", &archive);

        let result = unpack_updater(&archive, "firefox", &output_dir);
        assert!(result.is_ok());
        assert!(std::path::Path::new(&result.unwrap()).exists());
    }

    #[test]
    fn unpack_updater_missing_binary() {
        use xz::write::XzEncoder;

        let tmpdir = TempDir::with_prefix("marannon_updater_test").unwrap();
        let archive = tmpdir.path().join("empty.tar.xz");
        let output_dir = tmpdir.path().join("output");
        std::fs::create_dir(&output_dir).unwrap();

        let file = File::create(&archive).unwrap();
        let enc = XzEncoder::new(file, 6);
        let builder = tar::Builder::new(enc);
        let enc = builder.into_inner().unwrap();
        enc.finish().unwrap();

        let result = unpack_updater(&archive, "firefox", &output_dir);
        assert!(result.is_err());
    }

    #[test]
    fn replace_certs_success() -> Result<()> {
        let tmpdir = TempDir::with_prefix("marannon_replace_certs_test").unwrap();
        let dir = fixture_dir();
        let updater = tmpdir.path().join("updater");
        std::fs::copy(fixture(Path::new("updater")), &updater).unwrap();
        replace_certs(
            &dir,
            &updater,
            &vec![
                CertOverride {
                    orig: "release_primary.der".to_string(),
                    replacement: "dep1.der".to_string(),
                },
                CertOverride {
                    orig: "release_secondary.der".to_string(),
                    replacement: "dep2.der".to_string(),
                },
            ],
        )?;

        // ensure the new data is in the updater
        let mut updater_bytes = Vec::new();
        File::open(updater)?.read_to_end(&mut updater_bytes)?;

        let mut cert_bytes = Vec::new();
        File::open(dir.join("dep1.der"))?.read_to_end(&mut cert_bytes)?;
        assert!(
            updater_bytes
                .windows(cert_bytes.len())
                .any(|w| w == cert_bytes),
            "dep1.der not found in updater!"
        );

        cert_bytes.clear();
        File::open(dir.join("dep2.der"))?.read_to_end(&mut cert_bytes)?;
        assert!(
            updater_bytes
                .windows(cert_bytes.len())
                .any(|w| w == cert_bytes),
            "dep2.der not found in updater!"
        );

        return Ok(());
    }

    #[test]
    fn replace_certs_file_doesnt_exist() {
        let result = replace_certs(
            &fixture_dir(),
            &fixture(Path::new("updater")),
            &vec![CertOverride {
                orig: "fake.der".to_string(),
                replacement: "fake2.der".to_string(),
            }],
        );
        assert!(result.is_err());
    }
}
