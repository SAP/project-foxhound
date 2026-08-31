/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

use std::fs::{exists, File};
use std::io::copy;
use std::os::unix::fs::symlink;
use std::path::Path;

use anyhow::Result;
use log::info;
use ureq;

/// A simple trait to facilitate unit testing of functions that download files.
pub(crate) trait FileDownloader {
    fn fetch(&self, url: &str, dest: &Path, cache_dir: &Path) -> Result<()>;
}

pub(crate) struct UreqDownloader;

impl FileDownloader for UreqDownloader {
    fn fetch(&self, url: &str, dest: &Path, cache_dir: &Path) -> Result<()> {
        let mut cached_path = cache_dir.to_path_buf();
        cached_path.push(url_to_filename(url));

        if exists(&cached_path)? {
            info!(
                "{} already exists, not downloading {}",
                cached_path.display(),
                url
            );
        } else {
            info!("Downloading {} to {}", url, cached_path.display());
            let mut response = ureq::get(url).call()?.into_body().into_reader();
            let mut dest_file = File::create(&cached_path)?;
            copy(&mut response, &mut dest_file)?;
        }

        // The file we want is now at `cached_path`; now we can symlink it to
        // the desired location.
        symlink(cached_path, dest)?;

        return Ok(());
    }
}

fn url_to_filename(url: &str) -> String {
    return url.replace(":", "_").replace("/", "_");
}
