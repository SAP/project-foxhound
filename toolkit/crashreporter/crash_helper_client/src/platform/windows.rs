/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

use anyhow::{bail, Result};
use crash_helper_common::{
    messages::ProcessRendezVous, BreakpadChar, BreakpadData, BreakpadString, GeckoChildId,
    IPCChannel, IPCConnector, IPCListener, Pid, ProcessHandle,
};
use std::{
    ffi::{OsStr, OsString},
    mem::{size_of, zeroed},
    os::windows::{
        ffi::{OsStrExt, OsStringExt},
        io::{FromRawHandle, OwnedHandle, RawHandle},
    },
    ptr::{null, null_mut},
};
use windows_sys::Win32::{
    Foundation::{
        CloseHandle, DuplicateHandle, DUPLICATE_SAME_ACCESS, FALSE, HANDLE, INVALID_HANDLE_VALUE,
        TRUE,
    },
    System::Threading::{
        CreateProcessW, GetCurrentProcess, GetCurrentProcessId, CREATE_UNICODE_ENVIRONMENT,
        DETACHED_PROCESS, PROCESS_INFORMATION, STARTUPINFOW,
    },
};

use crate::CrashHelperClient;

impl CrashHelperClient {
    pub(crate) fn new(
        program: *const BreakpadChar,
        breakpad_data: BreakpadData,
        minidump_path: *const BreakpadChar,
    ) -> Result<CrashHelperClient> {
        // SAFETY: `program` points to a valid string passed in by Firefox
        let program = unsafe { <OsString as BreakpadString>::from_ptr(program) };
        // SAFETY: `minidump_path` points to a valid string passed in by Firefox
        let minidump_path = unsafe { <OsString as BreakpadString>::from_ptr(minidump_path) };

        let channel = IPCChannel::new()?;
        let (listener, server_endpoint, client_endpoint) = channel.deconstruct();

        let spawner_thread = std::thread::spawn(move || {
            CrashHelperClient::spawn_crash_helper(
                program,
                breakpad_data,
                minidump_path,
                server_endpoint,
                listener,
            )
        });

        Ok(CrashHelperClient {
            connector: client_endpoint,
            spawner_thread: Some(spawner_thread),
            pid: 0, // Unused on Windows
        })
    }

    fn spawn_crash_helper(
        program: OsString,
        breakpad_data: BreakpadData,
        minidump_path: OsString,
        endpoint: IPCConnector,
        listener: IPCListener,
    ) -> Result<ProcessHandle> {
        // SAFETY: `GetCurrentProcessId()` takes no arguments and should always work
        let pid = OsString::from(unsafe { GetCurrentProcessId() }.to_string());
        let handle = clone_current_process_handle()?;

        let mut cmd_line = escape_cmd_line_arg(&program);
        cmd_line.push(" ");
        cmd_line.push(escape_cmd_line_arg(&pid));
        cmd_line.push(" ");
        cmd_line.push(escape_cmd_line_arg(breakpad_data.as_ref()));
        cmd_line.push(" ");
        cmd_line.push(escape_cmd_line_arg(&minidump_path));
        cmd_line.push(" ");
        cmd_line.push(escape_cmd_line_arg(&endpoint.serialize()?));
        cmd_line.push(" ");
        cmd_line.push(escape_cmd_line_arg(&listener.serialize()?));
        cmd_line.push(" ");
        cmd_line.push(escape_cmd_line_arg(&handle.serialize()?));
        cmd_line.push("\0");
        let mut cmd_line: Vec<u16> = cmd_line.encode_wide().collect();

        let mut pi = unsafe { zeroed::<PROCESS_INFORMATION>() };
        let si = STARTUPINFOW {
            cb: size_of::<STARTUPINFOW>().try_into().unwrap(),
            ..unsafe { zeroed() }
        };

        let res = unsafe {
            CreateProcessW(
                /* lpApplicationName */ null(),
                cmd_line.as_mut_ptr(),
                /* lpProcessAttributes */ null_mut(),
                /* lpThreadAttributes */ null_mut(),
                /* bInheritHandles */ TRUE,
                CREATE_UNICODE_ENVIRONMENT | DETACHED_PROCESS,
                /* lpEnvironment */ null_mut(),
                /* lpCurrentDirectory */ null_mut(),
                &si,
                &mut pi,
            )
        };

        if res == FALSE {
            bail!("Could not create the crash helper process");
        }

        // SAFETY: We've verified that this value had been properly populated
        // in the lines above.
        unsafe {
            CloseHandle(pi.hThread);
        }

        // SAFETY: We've already checked that `pi.hProcess` contains a
        // valid process handle.
        Ok(ProcessHandle(unsafe {
            OwnedHandle::from_raw_handle(pi.hProcess as RawHandle)
        }))
    }

    pub(crate) fn prepare_for_minidump(
        _crash_helper_pid: Option<Pid>,
        _id: GeckoChildId,
    ) -> Option<ProcessRendezVous> {
        None
    }
}

// Clone the handle to the current process into an inheritable handle
fn clone_current_process_handle() -> Result<ProcessHandle> {
    let mut handle: HANDLE = INVALID_HANDLE_VALUE;
    let res = unsafe {
        DuplicateHandle(
            GetCurrentProcess(),
            GetCurrentProcess(),
            GetCurrentProcess(),
            &mut handle,
            /* dwDesiredAccess */ 0,
            /* bInheritHandle */ TRUE,
            DUPLICATE_SAME_ACCESS,
        )
    };

    if res == 0 {
        bail!("Could not clone the process handle");
    }

    Ok(ProcessHandle(unsafe {
        OwnedHandle::from_raw_handle(handle as RawHandle)
    }))
}

/// Escape an argument so that it is suitable for use in the command line
/// parameter of a CreateProcess() call. This involves escaping all inner
/// double-quote characters as well as trailing backslashes. The algorithm
/// used is described in this article:
/// https://learn.microsoft.com/it-it/archive/blogs/twistylittlepassagesallalike/everyone-quotes-command-line-arguments-the-wrong-way
fn escape_cmd_line_arg(arg: &OsStr) -> OsString {
    const DOUBLE_QUOTES: u16 = '"' as u16;
    const BACKSLASH: u16 = '\\' as u16;

    let encoded_arg: Vec<u16> = arg.encode_wide().collect();
    let mut escaped_arg = Vec::<u16>::new();
    escaped_arg.push(DOUBLE_QUOTES);

    let mut it = encoded_arg.iter().peekable();
    loop {
        let mut backslash_num = 0;

        while let Some(&&_c @ BACKSLASH) = it.peek() {
            it.next();
            backslash_num += 1;
        }

        match it.peek() {
            None => {
                for _ in 0..backslash_num {
                    escaped_arg.extend([BACKSLASH, BACKSLASH]);
                }
                break;
            }
            Some(&&_c @ DOUBLE_QUOTES) => {
                for _ in 0..backslash_num {
                    escaped_arg.extend([BACKSLASH, BACKSLASH]);
                }
                escaped_arg.extend([BACKSLASH, DOUBLE_QUOTES]);
            }
            Some(&&c) => {
                escaped_arg.extend(std::iter::repeat_n(BACKSLASH, backslash_num));
                escaped_arg.push(c)
            }
        }

        it.next();
    }

    escaped_arg.push(DOUBLE_QUOTES);
    OsString::from_wide(&escaped_arg)
}
