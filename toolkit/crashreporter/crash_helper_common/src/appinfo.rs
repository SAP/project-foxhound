/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

use std::{
    env, fs, io,
    path::PathBuf,
    time::{SystemTimeError, UNIX_EPOCH},
};

use thiserror::Error;

#[cfg(not(target_os = "windows"))]
pub(crate) mod unix;

#[cfg(target_os = "windows")]
pub(crate) mod windows;

/*****************************************************************************
 * Error definitions                                                         *
 *****************************************************************************/

#[derive(Debug, Error)]
pub enum AppInfoError {
    #[error("Could not access the installation time information")]
    InstallationTimeAccess(#[from] io::Error),
    #[error("Could not calculate the installation time")]
    MissingInstallationTime(#[from] SystemTimeError),
}

/****************************************************************************
 * Application information                                                   *
 *****************************************************************************/

pub struct ApplicationInfo {}

impl ApplicationInfo {
    pub fn get_install_time(path: Option<PathBuf>) -> Result<u64, AppInfoError> {
        let exe_path = path.unwrap_or(env::current_exe()?);
        let metadata = fs::metadata(exe_path)?;
        let mod_time = metadata.modified()?;
        let install_time = mod_time.duration_since(UNIX_EPOCH)?;

        Ok(install_time
            .as_secs()
            .saturating_sub(Self::get_user_id().unwrap_or(0)))
    }
}
