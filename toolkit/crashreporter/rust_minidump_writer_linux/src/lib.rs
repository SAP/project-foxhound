// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at http://mozilla.org/MPL/2.0/.

//! C FFI interface to the rust-minidump crate

use {
    anyhow::Context,
    crash_helper_common::{crash_annotations::CrashAnnotation, ExtraCrashData},
    libc::{pid_t, SI_TKILL, SI_USER},
    minidump_writer::{
        crash_context::CrashContext,
        minidump_writer::{DirectAuxvDumpInfo as InternalDumpInfo, MinidumpWriterConfig},
    },
    mozannotation_server::{AnnotationData, CAnnotation},
    std::{
        convert::TryInto,
        ffi::{c_char, CStr, CString},
        fs::File,
    },
};

#[allow(non_camel_case_types)]
#[cfg(not(target_arch = "arm"))]
type fpregset_t = crash_context::fpregset_t;

// This structure is absent on ARM.
// (We use u8 because it has no alignment requirements and zero-sized types are not FFI-safe)
#[allow(non_camel_case_types)]
#[cfg(target_arch = "arm")]
type fpregset_t = u8;

/// Context gatherer for [`MinidumpWriter`]
///
/// Creates the target minidump file and gathers any context needed for the minidump generation.
pub struct MinidumpWriterContext {
    dump_file: File,
    writer_config: MinidumpWriterConfig,
    // These two fields are not accessible in `MinidumpWriterConfig` right now, so we have to store
    // them separate to create the CrashContext.
    process_id: pid_t,
    blamed_thread: pid_t,
    // Also not available in `MinidumpWriterConfig`, but needed to compute extra annotations
    siginfo: Option<libc::signalfd_siginfo>,
}

/// Gather any extra crash data that the minidump writer doesn't support natively.
fn gather_extra_annotations(
    siginfo: &Option<libc::signalfd_siginfo>,
    crashed_pid: pid_t,
    annotations: &mut Vec<CAnnotation>,
) -> anyhow::Result<()> {
    let Some(siginfo) = siginfo else {
        return Ok(());
    };

    // Only user/tkill codes have relevant ssi_pid, and we only care if it's not our own process.
    if ![SI_USER, SI_TKILL].contains(&siginfo.ssi_code) || siginfo.ssi_pid == crashed_pid as u32 {
        return Ok(());
    }

    let path = format!("/proc/{}/comm", siginfo.ssi_pid);
    let comm = match std::fs::read_to_string(path) {
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            // The process doesn't exist, most likely reaped before we could read the comm.
            // This isn't really an error for our purposes, just return without data.
            return Ok(());
        }
        Err(e) => return Err(e).context("failed to read comm for extra crash data"),
        Ok(comm) => comm,
    };
    let trimmed = comm.trim();
    annotations.push(CAnnotation {
        id: CrashAnnotation::SignalOrigin as u32,
        data: AnnotationData::String(CString::new(trimmed)?),
    });
    Ok(())
}

/// Mirror of [minidump_writer::DirectAuxvDumpInfo][InternalDumpInfo] (`cbindgen` workaround)
///
/// The internal type can't be properly processed by `cbindgen` due to usage of the `cfg_if!()`
/// macro, so we repeat it here for external usage.
#[repr(C)]
#[derive(Debug)]
pub struct DirectAuxvDumpInfo {
    pub program_header_count: usize,
    pub program_header_address: usize,
    pub linux_gate_address: usize,
    pub entry_address: usize,
}

/// Create the [`MinidumpWriterContext`] object through FFI
///
/// The [`MinidumpWriterContext`] will create the target file specified by
/// `dump_path` and gather context needed for [`MinidumpWriter`] to write the
/// dump.
///
/// Additional context can be added to the dump using functions like
/// [`minidump_writer_set_crash_context()`].
///
/// When ready to dump, [`minidump_writer_dump()`] should be called on the
/// returned object. Failure to do so will result in a memory leak.
///
/// # Return value
///
/// Remember that `Option<Box<T>>` has the same ABI as a `T*` in C, so this
/// function will return a valid `MinidumpWriterContext*` on success, and
/// `nullptr` on failure.
///
/// An optional `ExtraCrashData*` can be passed via the `extra_data` parameter
/// to receive any extra data generated on failure. If requested, It *must* be freed with
/// [`free_minidump_extra_data()`].
///
/// On success, the caller code owns the object, and [`minidump_writer_dump()`]
/// must eventually be called with the returned pointer to avoid a memory leak.
///
/// # Safety
///
/// `dump_path` must be a valid null-terminated C string. `extra_data` must be
/// either a valid pointer or null.
#[no_mangle]
pub unsafe extern "C" fn minidump_writer_create(
    dump_path: *const c_char,
    child: pid_t,
    child_blamed_thread: pid_t,
    extra_data: *mut Option<Box<ExtraCrashData>>,
) -> Option<Box<MinidumpWriterContext>> {
    let mut data = ExtraCrashData::default();
    let writer = err_to_error_msg(Some(&mut data), || {
        let dump_path = CStr::from_ptr(dump_path)
            .to_str()
            .context("path not valid UTF-8")?;
        let dump_file = std::fs::OpenOptions::new()
            .create(true) // Create file if it doesn't exist
            .truncate(true) // Truncate file
            .write(true)
            .open(dump_path)
            .context("failed to open minidump file")?;

        let writer_config = MinidumpWriterConfig::new(child, child_blamed_thread);

        Ok(Box::new(MinidumpWriterContext {
            dump_file,
            writer_config,
            process_id: child,
            blamed_thread: child_blamed_thread,
            siginfo: None,
        }))
    });
    if !extra_data.is_null() {
        *extra_data = Some(Box::new(data));
    }
    writer
}

/// Set the "Crash Context" in the given `writer`
///
/// Adds the `ucontext`, `float_state` (on non-ARM), and `siginfo` (optional)  to the context
/// information for the crash.
///
/// # Panics
///
/// On non-ARM systems, will panic if `float_state` is null. On ARM, will panic if it is non-NULL.
#[no_mangle]
pub extern "C" fn minidump_writer_set_crash_context(
    context: &mut MinidumpWriterContext,
    ucontext: &crash_context::ucontext_t,
    float_state: Option<&fpregset_t>,
    siginfo: Option<&libc::signalfd_siginfo>,
) {
    #[cfg(not(target_arch = "arm"))]
    let float_state = float_state.unwrap().clone();

    #[cfg(target_arch = "arm")]
    assert!(float_state.is_none());

    context.siginfo = siginfo.cloned();
    context.writer_config.set_crash_context(CrashContext {
        inner: crash_context::CrashContext {
            context: ucontext.clone(),
            #[cfg(not(target_arch = "arm"))]
            float_state,
            siginfo: siginfo
                .cloned()
                .unwrap_or_else(|| unsafe { std::mem::zeroed() }),
            pid: context.process_id,
            tid: context.blamed_thread,
        },
    });
}

/// Set the Auxv information for the target process
///
/// During crash report generation, "/proc/{pid}/auxv" may be inaccessible. To improve robustness,
/// that information can be obtained by the target process ahead-of-time using whatever means it
/// has available (preferrably the Linux `getauxval()` call) and passed to the minidump writer
/// here.
#[no_mangle]
pub extern "C" fn minidump_writer_set_direct_auxv_dump_info(
    context: &mut MinidumpWriterContext,
    direct_auxv_dump_info: &DirectAuxvDumpInfo,
) {
    context
        .writer_config
        .set_direct_auxv_dump_info(InternalDumpInfo {
            program_header_count: direct_auxv_dump_info
                .program_header_count
                .try_into()
                .unwrap(),
            program_header_address: direct_auxv_dump_info
                .program_header_address
                .try_into()
                .unwrap(),
            linux_gate_address: direct_auxv_dump_info.linux_gate_address.try_into().unwrap(),
            entry_address: direct_auxv_dump_info.entry_address.try_into().unwrap(),
        });
}

/// Write the minidump to the file
///
/// Generates the minidump and writes it out to the file specified when the object was created.
///
/// Consumes the given `writer`, so that same object should never be used again after calling this
/// function.
///
/// `extra_data` can be used to receive any additional data generated during the dump writing. This
/// data structure is owned by the caller, and is normally allocated by `minidump_writer_create`.
///
/// Returns a boolean indicating success. Any relevant error message is stored in `extra_data`
///
/// # Safety
///
/// `extra_data` must be either a valid pointer or null.
#[no_mangle]
pub unsafe extern "C" fn minidump_writer_dump(
    mut context: Box<MinidumpWriterContext>,
    mut extra_data: Option<&mut ExtraCrashData>,
) -> bool {
    if let Some(ref mut extra_data) = extra_data {
        if let Err(e) = gather_extra_annotations(
            &context.siginfo,
            context.process_id,
            &mut extra_data.annotations,
        ) {
            extra_data.error = Some(CString::new(format!("{e:#?}")).unwrap());
        }
    }
    err_to_error_msg(extra_data, || {
        context
            .writer_config
            .write(&mut context.dump_file)
            .context("failed to write dump file")
    })
    .is_some()
}

/// Free the extra crash data created by [`minidump_writer_create()`].
///
/// Failing to call this function on a returned extra_data object will cause
/// a memory leak.
///
/// # Safety
///
/// `extra_data` must be a valid pointer that was previously returned as the `extra_data` of a call.
/// After calling this function, the caller must not use the pointer again.
#[no_mangle]
pub unsafe extern "C" fn free_minidump_extra_data(extra_data: *mut ExtraCrashData) {
    if !extra_data.is_null() {
        // SAFETY: The pointer must have been created by `minidump_writer_dump` and not yet freed.
        let _extra_data = Box::from_raw(extra_data);
    }
}

/// Runs a closure and converts any error into a C string stored in the data payload.
///
/// Wraps any closure that returns an `anyhow::Result<T>` and converts the error result into a C
/// string. Will return `None` if an error occurred and `Some<T>` on success.
unsafe fn err_to_error_msg<F, T>(extra_data: Option<&mut ExtraCrashData>, f: F) -> Option<T>
where
    F: FnOnce() -> anyhow::Result<T>,
{
    match f() {
        Ok(t) => Some(t),
        Err(e) => {
            if let Some(extra_data) = extra_data {
                extra_data.error = Some(CString::new(format!("{e:#?}")).unwrap());
            }
            None
        }
    }
}
