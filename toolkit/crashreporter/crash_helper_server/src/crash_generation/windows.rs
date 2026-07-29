/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

use super::{BreakpadProcessId, CrashGenerator};

use crash_helper_common::messages;
use std::{
    convert::TryInto,
    fs::{create_dir_all, File},
    mem::{size_of, zeroed},
    os::windows::io::{AsHandle, AsRawHandle, BorrowedHandle},
    path::PathBuf,
    ptr::{null, null_mut},
};
use uuid::Uuid;
use windows_sys::Win32::{
    Foundation::{FALSE, HANDLE},
    System::{
        Diagnostics::Debug::{
            MiniDumpWithFullMemoryInfo, MiniDumpWithIndirectlyReferencedMemory,
            MiniDumpWithProcessThreadData, MiniDumpWithUnloadedModules, MiniDumpWriteDump,
            EXCEPTION_POINTERS, EXCEPTION_RECORD, MINIDUMP_EXCEPTION_INFORMATION, MINIDUMP_TYPE,
        },
        SystemInformation::{
            VerSetConditionMask, VerifyVersionInfoW, OSVERSIONINFOEXW, VER_MAJORVERSION,
            VER_MINORVERSION, VER_SERVICEPACKMAJOR, VER_SERVICEPACKMINOR,
        },
        SystemServices::VER_GREATER_EQUAL,
        Threading::{GetProcessId, GetThreadId},
    },
};

impl CrashGenerator {
    pub(crate) fn generate_wer_minidump(
        &mut self,
        message: messages::WindowsErrorReportingMinidump,
    ) -> Result<(), ()> {
        let (minidump_file, path) = self.create_minidump_file()?;

        let minidump_type: MINIDUMP_TYPE = self.get_minidump_type();
        let mut context = message.context;
        let mut exception_records = message.exception_records;
        let exception_records_ptr = link_exception_records(&mut exception_records);

        let handle = message.process.as_raw_handle() as HANDLE;
        let pid = get_process_id(message.process.as_handle())?;
        let mut exception_pointers = EXCEPTION_POINTERS {
            ExceptionRecord: exception_records_ptr,
            ContextRecord: &mut context as *mut _,
        };

        let exception = MINIDUMP_EXCEPTION_INFORMATION {
            ThreadId: get_thread_id(message.thread.as_handle())?,
            ExceptionPointers: &mut exception_pointers,
            ClientPointers: FALSE,
        };

        // SAFETY: `handle` is guaranteed to be a valid handle and so is
        // `minidump_file`. The remaining pointers going into this function are
        // taken from objects allocated on the stack.
        let res = unsafe {
            MiniDumpWriteDump(
                handle,
                pid,
                minidump_file.as_raw_handle() as _,
                minidump_type,
                &exception,
                /* UserStreamParam */ null(),
                /* CallbackParam */ null(),
            )
        };

        if res != FALSE {
            let process_id = BreakpadProcessId { pid, handle };

            self.finalize_crash_report(
                process_id,
                None,
                &path,
                super::MinidumpOrigin::WindowsErrorReporting,
            );
        }

        Ok(())
    }

    fn get_minidump_type(&self) -> MINIDUMP_TYPE {
        let mut minidump_type = MiniDumpWithFullMemoryInfo | MiniDumpWithUnloadedModules;
        if mozbuild::config::NIGHTLY_BUILD {
            // This is Nightly only because this doubles the size of minidumps based
            // on the experimental data.
            minidump_type |= MiniDumpWithProcessThreadData;

            // dbghelp.dll on Win7 can't handle overlapping memory regions so we only
            // enable this feature on Win8 or later.
            if is_windows8_or_later() {
                // This allows us to examine heap objects referenced from stack objects
                // at the cost of further doubling the size of minidumps.
                minidump_type |= MiniDumpWithIndirectlyReferencedMemory;
            }
        }
        minidump_type
    }

    fn create_minidump_file(&self) -> Result<(File, PathBuf), ()> {
        // Make sure that the target directory is present
        create_dir_all(&self.minidump_path).map_err(|_| ())?;

        let uuid = Uuid::new_v4()
            .as_hyphenated()
            .encode_lower(&mut Uuid::encode_buffer())
            .to_string();
        let path = PathBuf::from(self.minidump_path.clone()).join(uuid + ".dmp");
        let file = File::create(&path).map_err(|_| ())?;
        Ok((file, path))
    }
}

fn link_exception_records(exception_records: &mut Vec<EXCEPTION_RECORD>) -> *mut EXCEPTION_RECORD {
    let mut iter = exception_records.iter_mut().peekable();
    while let Some(exception_record) = iter.next() {
        exception_record.ExceptionRecord = null_mut();

        if let Some(next) = iter.peek_mut() {
            exception_record.ExceptionRecord = *next as *mut _;
        }
    }

    if exception_records.is_empty() {
        null_mut()
    } else {
        exception_records.as_mut_ptr()
    }
}

fn is_windows8_or_later() -> bool {
    let mut info = OSVERSIONINFOEXW {
        dwOSVersionInfoSize: size_of::<OSVERSIONINFOEXW>().try_into().unwrap(),
        dwMajorVersion: 6,
        dwMinorVersion: 2,
        ..unsafe { zeroed() }
    };

    unsafe {
        let mut mask: u64 = 0;
        let ge: u8 = VER_GREATER_EQUAL.try_into().unwrap();
        mask = VerSetConditionMask(mask, VER_MAJORVERSION, ge);
        mask = VerSetConditionMask(mask, VER_MINORVERSION, ge);
        mask = VerSetConditionMask(mask, VER_SERVICEPACKMAJOR, ge);
        mask = VerSetConditionMask(mask, VER_SERVICEPACKMINOR, ge);

        VerifyVersionInfoW(
            &mut info,
            VER_MAJORVERSION | VER_MINORVERSION | VER_SERVICEPACKMAJOR | VER_SERVICEPACKMINOR,
            mask,
        ) != 0
    }
}

fn get_process_id(handle: BorrowedHandle) -> Result<u32, ()> {
    // SAFETY: No pointers involved, worst case we get an error
    match unsafe { GetProcessId(handle.as_raw_handle() as HANDLE) } {
        0 => Err(()),
        pid => Ok(pid),
    }
}

fn get_thread_id(handle: BorrowedHandle) -> Result<u32, ()> {
    // SAFETY: No pointers involved, worst case we get an error
    match unsafe { GetThreadId(handle.as_raw_handle() as HANDLE) } {
        0 => Err(()),
        tid => Ok(tid),
    }
}
