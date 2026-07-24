/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

//! The Glean DB can only be accessed by one process at a time, so this module offers a simple way
//! to negotiate this (allowing other processes to wait).
//!
//! TODO: Use std file locking when the MSRV is >=1.89.

use std::{
    fs::{File, OpenOptions},
    io::{Result, Write},
    path::Path,
    process,
};

pub struct SingleInstance {
    lockfile: File,
}

impl SingleInstance {
    pub fn acquire(path: &Path) -> Result<Self> {
        let mut lockfile = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .open(path)?;

        lock(&lockfile)?;
        write!(&mut lockfile, "{}", process::id())?;
        Ok(SingleInstance { lockfile })
    }

    pub fn retain_until_application_exit(self) {
        std::mem::forget(self);
    }
}

impl Drop for SingleInstance {
    fn drop(&mut self) {
        // Don't attempt to delete the file, as there are races that can't be avoided if we do.
        let _ = self.lockfile.set_len(0);
        if let Err(e) = unlock(&self.lockfile) {
            log::error!("failed to unlock lockfile: {e}");
        }
    }
}

#[cfg(unix)]
mod unix {
    use std::ffi::c_int;
    use std::fs::File;
    use std::io::{Error, Result};
    use std::os::fd::AsRawFd;

    const LOCK_EX: c_int = 2;
    const LOCK_UN: c_int = 8;

    extern "C" {
        fn flock(fd: c_int, operation: c_int) -> c_int;
    }

    pub fn lock(file: &File) -> Result<()> {
        let result = unsafe { flock(file.as_raw_fd(), LOCK_EX) };
        (result == 0).then_some(()).ok_or_else(Error::last_os_error)
    }

    pub fn unlock(file: &File) -> Result<()> {
        let result = unsafe { flock(file.as_raw_fd(), LOCK_UN) };
        (result == 0).then_some(()).ok_or_else(Error::last_os_error)
    }
}

#[cfg(unix)]
use unix::{lock, unlock};

#[cfg(windows)]
mod windows {
    use std::ffi::{c_int, c_void};
    use std::fs::File;
    use std::io::{Error, Result};
    use std::os::windows::io::AsRawHandle;

    type HANDLE = *mut c_void;
    type DWORD = u32;
    type BOOL = c_int;

    const LOCKFILE_EXCLUSIVE_LOCK: DWORD = 2;

    #[repr(C)]
    struct OVERLAPPED {
        internal: usize,
        internalhigh: usize,
        // Omit the union of the offset fields with the `PVOID Pointer` since we don't need it.
        offset: DWORD,
        offsethigh: DWORD,
        hevent: HANDLE,
    }

    impl Default for OVERLAPPED {
        fn default() -> Self {
            // # Safety
            // A zeroed OVERLAPPED is defined as valid.
            unsafe { std::mem::zeroed() }
        }
    }

    extern "system" {
        fn LockFileEx(
            hfile: HANDLE,
            dwflags: DWORD,
            dwreserved: DWORD,
            nnumberofbytestolocklow: DWORD,
            nnumberofbytestolockhigh: DWORD,
            lpoverlapped: *mut OVERLAPPED,
        ) -> BOOL;

        fn UnlockFileEx(
            hfile: HANDLE,
            dwreserved: DWORD,
            nnumberofbytestounlocklow: DWORD,
            nnumberofbytestounlockhigh: DWORD,
            lpoverlapped: *mut OVERLAPPED,
        ) -> BOOL;
    }

    pub fn lock(file: &File) -> Result<()> {
        let mut overlapped = OVERLAPPED::default();
        let result = unsafe {
            LockFileEx(
                file.as_raw_handle(),
                LOCKFILE_EXCLUSIVE_LOCK,
                0,
                u32::MAX,
                u32::MAX,
                &mut overlapped,
            )
        };
        (result != 0).then_some(()).ok_or_else(Error::last_os_error)
    }

    pub fn unlock(file: &File) -> Result<()> {
        let mut overlapped = OVERLAPPED::default();
        let result =
            unsafe { UnlockFileEx(file.as_raw_handle(), 0, u32::MAX, u32::MAX, &mut overlapped) };
        (result != 0).then_some(()).ok_or_else(Error::last_os_error)
    }
}

#[cfg(windows)]
use windows::{lock, unlock};
