/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/******************************************************************************
 * Wrappers used to call into Breakpad code                                   *
 ******************************************************************************/

use crate::crash_generation::CrashGenerator;

#[cfg(any(target_os = "android", target_os = "linux"))]
use super::crash_generation::get_auxv_info;

use anyhow::{bail, Result};
use cfg_if::cfg_if;
use crash_helper_common::{BreakpadChar, BreakpadData, BreakpadString, ExtraCrashData, Pid};
#[cfg(any(target_os = "android", target_os = "linux"))]
use minidump_writer::minidump_writer::DirectAuxvDumpInfo;
#[cfg(any(target_os = "android", target_os = "linux"))]
use std::os::fd::{FromRawFd, OwnedFd};
use std::{
    ffi::{c_void, OsString},
    ptr::NonNull,
    sync::Mutex,
};

#[cfg(target_os = "windows")]
type BreakpadInitType = *const u16;
#[cfg(target_os = "windows")]
type NativeProcessId = windows_sys::Win32::Foundation::HANDLE;

#[cfg(target_os = "macos")]
type BreakpadInitType = *const crate::c_char;
#[cfg(target_os = "macos")]
type NativeProcessId = u32;

#[cfg(any(target_os = "linux", target_os = "android"))]
type BreakpadInitType = std::os::fd::RawFd;
#[cfg(any(target_os = "linux", target_os = "android"))]
type NativeProcessId = Pid;

#[repr(C)]
pub struct BreakpadProcessId {
    pub pid: Pid,
    #[cfg(target_os = "macos")]
    pub task: u32,
    #[cfg(target_os = "windows")]
    pub handle: windows_sys::Win32::Foundation::HANDLE,
}

impl BreakpadProcessId {
    pub fn get_native(&self) -> NativeProcessId {
        cfg_if! {
            if #[cfg(any(target_os = "linux", target_os = "android"))] {
                self.pid
            } else if #[cfg(target_os = "windows")] {
                self.handle
            } else if  #[cfg(target_os = "macos")] {
                self.task
            }
        }
    }
}

// Note that the `generator` field and function parameter should be of type
// `*const Mutex<CrashGenerator>` but that doesn't work because `Mutex<>` is
// not FFI-safe. We don't care about that because the C code only ever sees the
// pointer and all the manipulation is done in Rust, so we just morph the type
// when we need it to avoid the warning.
#[repr(C)]
pub struct BreakpadContext {
    callback: unsafe extern "C" fn(
        *const c_void,
        BreakpadProcessId,
        Option<&ExtraCrashData>,
        *const BreakpadChar,
    ),
    generator: *const Mutex<CrashGenerator>,
}

extern "C" {
    #[allow(improper_ctypes)]
    fn CrashGenerationServer_init(
        breakpad_data: BreakpadInitType,
        minidump_path: *const BreakpadChar,
        context: *mut BreakpadContext,
        #[cfg(any(target_os = "android", target_os = "linux"))] auxv_cb: extern "C" fn(
            crash_helper_common::Pid,
            *mut DirectAuxvDumpInfo,
        )
            -> bool,
    ) -> *mut c_void;
    fn CrashGenerationServer_shutdown(server: *mut c_void);
    fn CrashGenerationServer_set_path(server: *mut c_void, path: *const BreakpadChar);
}

pub(crate) struct BreakpadCrashGenerator {
    ptr: NonNull<c_void>,
    path: NonNull<BreakpadChar>,
    #[allow(
        unused,
        reason = "The context is used by Breakpad so we need to keep it alive"
    )]
    context: Box<BreakpadContext>,
    #[allow(
        unused,
        reason = "This socket is used by Breakpad so it must be closed on Drop() as we own it"
    )]
    #[cfg(any(target_os = "linux", target_os = "android"))]
    breakpad_socket: OwnedFd,
}

// Safety: We own the pointer to the Breakpad C++ CrashGeneration server object
// so we can safely transfer this object to another thread.
unsafe impl Send for BreakpadCrashGenerator {}

// Safety: All mutations to the pointer to the Breakpad C++ CrashGeneration
// server happen within this object meaning it's safe to read it from different
// threads.
unsafe impl Sync for BreakpadCrashGenerator {}

impl BreakpadCrashGenerator {
    pub(crate) fn new(
        breakpad_data: BreakpadData,
        path: OsString,
        generator: &'static Mutex<CrashGenerator>,
        finalize_callback: unsafe extern "C" fn(
            *const c_void,
            BreakpadProcessId,
            Option<&ExtraCrashData>,
            *const BreakpadChar,
        ),
    ) -> Result<BreakpadCrashGenerator> {
        let breakpad_raw_data = breakpad_data.into_raw();
        let path_ptr = path.into_raw();
        let mut context = Box::new(BreakpadContext {
            callback: finalize_callback,
            generator: generator as *const Mutex<CrashGenerator>,
        });

        // SAFETY: Calling into breakpad code with parameters that have been previously validated.
        let breakpad_server = unsafe {
            CrashGenerationServer_init(
                breakpad_raw_data,
                path_ptr,
                &mut *context,
                #[cfg(any(target_os = "android", target_os = "linux"))]
                get_auxv_info,
            )
        };

        // Retake ownership of the raw data & strings so we don't leak them.
        cfg_if! {
            if #[cfg(any(target_os = "macos", target_os = "windows"))] {
                // SAFETY: We've allocated this object within this same block.
                let _breakpad_data = unsafe { BreakpadData::new(breakpad_raw_data) };
            }
        }

        if breakpad_server.is_null() {
            bail!("Could not initialize Breakpad crash generator");
        }

        // SAFETY: We already verified that the pointers are non-null. On Linux
        // and Android the breakpad socket is also a valid file descriptor. We
        // store it in an owned file descriptor because we're taking ownership
        // of it and we want it closed when we shut down the crash generation
        // server.
        Ok(unsafe {
            BreakpadCrashGenerator {
                ptr: NonNull::new(breakpad_server).unwrap_unchecked(),
                path: NonNull::new(path_ptr).unwrap_unchecked(),
                context,
                #[cfg(any(target_os = "linux", target_os = "android"))]
                breakpad_socket: OwnedFd::from_raw_fd(breakpad_raw_data),
            }
        })
    }

    pub(crate) fn set_path(&self, path: OsString) {
        unsafe {
            let path = path.into_raw();
            CrashGenerationServer_set_path(self.ptr.as_ptr(), path);
        };
    }
}

impl Drop for BreakpadCrashGenerator {
    fn drop(&mut self) {
        // SAFETY: The pointers we're passing are guaranteed to be non-null and
        // valid since we created them ourselves during construction.
        unsafe {
            CrashGenerationServer_shutdown(self.ptr.as_ptr());
            let _path = <OsString as BreakpadString>::from_raw(self.path.as_ptr());
        }
    }
}
