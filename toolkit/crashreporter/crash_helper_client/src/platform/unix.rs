/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

use anyhow::{bail, Result};
use crash_helper_common::{ignore_eintr, BreakpadChar, BreakpadData, IPCChannel, IPCConnector};
use nix::{
    spawn::{posix_spawn, PosixSpawnAttr, PosixSpawnFileActions},
    sys::wait::{waitpid, WaitStatus},
    unistd::getpid,
};
use std::{
    env,
    ffi::{CStr, CString},
};

use crate::CrashHelperClient;

impl CrashHelperClient {
    pub(crate) fn new(
        program: *const BreakpadChar,
        breakpad_data: BreakpadData,
        minidump_path: *const BreakpadChar,
    ) -> Result<CrashHelperClient> {
        let channel = IPCChannel::new()?;
        let (_listener, server_endpoint, client_endpoint) = channel.deconstruct();
        // SAFETY: `program` is guaranteed to point to a valid nul-terminated
        // string by the caller.
        let program = unsafe { CStr::from_ptr(program) };
        // SAFETY: `breakpad_data` is guaranteed to point to a valid
        // nul-terminated string by the caller.
        let breakpad_data =
            unsafe { CString::from_vec_unchecked(breakpad_data.to_string().into_bytes()) };
        // SAFETY: `minidump_path` is guaranteed to point to a valid
        // nul-terminated string by the caller.
        let minidump_path = unsafe { CStr::from_ptr(minidump_path) };

        CrashHelperClient::spawn_crash_helper(
            program,
            breakpad_data,
            minidump_path,
            server_endpoint,
        )?;

        Ok(CrashHelperClient {
            connector: client_endpoint,
            spawner_thread: None,
        })
    }

    fn spawn_crash_helper(
        program: &CStr,
        breakpad_data: CString,
        minidump_path: &CStr,
        server_endpoint: IPCConnector,
    ) -> Result<()> {
        let parent_pid = getpid().to_string();
        let parent_pid_arg = unsafe { CString::from_vec_unchecked(parent_pid.into_bytes()) };
        let endpoint_arg = server_endpoint.serialize()?;

        let file_actions = PosixSpawnFileActions::init()?;
        let attr = PosixSpawnAttr::init()?;

        let env: Vec<CString> = env::vars()
            .map(|(key, value)| format!("{key}={value}"))
            .map(|string| CString::new(string).unwrap())
            .collect();

        let pid = posix_spawn(
            program,
            &file_actions,
            &attr,
            &[
                program,
                &parent_pid_arg,
                &breakpad_data,
                minidump_path,
                &endpoint_arg,
            ],
            env.as_slice(),
        )?;

        // The child should exit quickly after having forked off the
        // actual crash helper process, let's wait for it.
        let status = ignore_eintr!(waitpid(pid, None))?;

        if let WaitStatus::Exited(_, _) = status {
            Ok(())
        } else {
            bail!("The crash helper process failed to start and exited with status: {status:?}");
        }
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    pub(crate) fn prepare_for_minidump(_pid: crash_helper_common::Pid) -> bool {
        // This is a no-op on platforms that don't need it
        true
    }
}
