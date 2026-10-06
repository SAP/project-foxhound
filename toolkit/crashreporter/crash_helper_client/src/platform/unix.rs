/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

use anyhow::{bail, Result};
use crash_helper_common::{
    ignore_eintr, BreakpadChar, BreakpadData, IPCChannel, IPCConnector, Pid,
};
use nix::{
    errno::Errno,
    libc::STDOUT_FILENO,
    spawn::{posix_spawn, PosixSpawnAttr, PosixSpawnFileActions},
    sys::wait::{waitpid, WaitStatus},
    unistd::{self, getpid, pipe},
};
use std::{
    env,
    ffi::{CStr, CString},
    os::{
        fd::{AsFd, AsRawFd},
        unix::ffi::OsStringExt,
    },
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

        let pid = CrashHelperClient::spawn_crash_helper(
            program,
            breakpad_data,
            minidump_path,
            server_endpoint,
        )?;

        let rendezvous = Self::prepare_for_minidump(Some(pid), /* id */ 0).unwrap();
        client_endpoint.send_message(rendezvous)?;

        Ok(CrashHelperClient {
            connector: client_endpoint,
            spawner_thread: None,
            pid,
        })
    }

    fn spawn_crash_helper(
        program: &CStr,
        breakpad_data: CString,
        minidump_path: &CStr,
        server_endpoint: IPCConnector,
    ) -> Result<Pid> {
        let parent_pid = getpid().to_string();
        let parent_pid_arg = unsafe { CString::from_vec_unchecked(parent_pid.into_bytes()) };
        let endpoint_arg = server_endpoint.serialize()?;

        let Ok((parent_endpoint, child_endpoint)) = pipe() else {
            bail!("Could not create pipe: {}", Errno::last());
        };

        let mut file_actions = PosixSpawnFileActions::init()?;
        file_actions.add_close(parent_endpoint.as_raw_fd())?;
        file_actions.add_dup2(child_endpoint.as_raw_fd(), STDOUT_FILENO)?;
        file_actions.add_close(child_endpoint.as_raw_fd())?;
        let attr = PosixSpawnAttr::init()?;

        let env: Vec<CString> = env::vars_os()
            .map(|(key, value)| {
                let mut s = key;
                s.push("=");
                s.push(value);
                s
            })
            .filter_map(|string| CString::new(string.into_vec()).ok())
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

        // Wait for the pid of the child's child
        let mut pid_buffer = [0u8; 4];
        let res = unistd::read(parent_endpoint.as_fd(), &mut pid_buffer)?;

        if res != 4 {
            bail!("We did not get the crash helper's pid");
        }

        let crash_helper_pid = i32::from_ne_bytes(pid_buffer);

        // The child should exit quickly after having forked off the
        // actual crash helper process, let's wait for it.
        let status = ignore_eintr!(waitpid(pid, None))?;

        if let WaitStatus::Exited(_, _) = status {
            Ok(crash_helper_pid)
        } else {
            bail!("The crash helper process failed to start and exited with status: {status:?}");
        }
    }
}
