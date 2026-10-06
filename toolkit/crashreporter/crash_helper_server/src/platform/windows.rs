/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

use anyhow::Result;
use crash_helper_common::ProcessHandle;
use std::ffi::CStr;

pub(crate) const PROXY_RENDEZ_VOUS: bool = true;

// This is just a no-op, the crash helper process is spawned as a detached
// process in the first place.
pub(crate) unsafe fn daemonize() {}

pub(crate) fn get_client_handle(handle: &CStr) -> Result<Option<ProcessHandle>> {
    let handle = ProcessHandle::deserialize(handle)?;
    Ok(Some(handle))
}
