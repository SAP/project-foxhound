/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

use ini::Ini;
use libc::time;
use process_reader::ProcessReader;
use serde::Serialize;
use serde_json::ser::to_writer;
use std::convert::TryInto;
use std::ffi::{c_void, OsString};
use std::fs::{read_to_string, DirBuilder, File};
use std::io::{BufRead, BufReader, Write};
use std::mem::{size_of, transmute, zeroed};
use std::os::windows::ffi::{OsStrExt, OsStringExt};
use std::os::windows::io::{AsRawHandle, FromRawHandle, OwnedHandle, RawHandle};
use std::path::{Path, PathBuf};
use std::ptr::{addr_of, null, null_mut};
use std::slice::from_raw_parts;
use uuid::Uuid;
use windows_sys::core::{HRESULT, PWSTR};
use windows_sys::Wdk::System::Threading::{NtQueryInformationProcess, ProcessBasicInformation};
use windows_sys::Win32::{
    Foundation::{
        CloseHandle, GetLastError, SetLastError, BOOL, ERROR_INSUFFICIENT_BUFFER, ERROR_SUCCESS,
        EXCEPTION_BREAKPOINT, E_UNEXPECTED, FALSE, FILETIME, HANDLE, HWND, LPARAM, MAX_PATH,
        STATUS_SUCCESS, S_OK, TRUE, WAIT_OBJECT_0,
    },
    Security::{
        GetSidSubAuthority, GetSidSubAuthorityCount, GetTokenInformation, IsTokenRestricted,
        TokenIntegrityLevel, TOKEN_MANDATORY_LABEL, TOKEN_QUERY,
    },
    System::Com::CoTaskMemFree,
    System::Diagnostics::Debug::{
        GetThreadContext, MiniDumpWithFullMemoryInfo, MiniDumpWithIndirectlyReferencedMemory,
        MiniDumpWithProcessThreadData, MiniDumpWithUnloadedModules, MiniDumpWriteDump,
        WriteProcessMemory, EXCEPTION_POINTERS, MINIDUMP_EXCEPTION_INFORMATION, MINIDUMP_TYPE,
    },
    System::ErrorReporting::WER_RUNTIME_EXCEPTION_INFORMATION,
    System::Memory::{
        VirtualAllocEx, VirtualFreeEx, MEM_COMMIT, MEM_RELEASE, MEM_RESERVE, PAGE_READWRITE,
    },
    System::ProcessStatus::K32GetModuleFileNameExW,
    System::SystemInformation::{
        VerSetConditionMask, VerifyVersionInfoW, OSVERSIONINFOEXW, VER_MAJORVERSION,
        VER_MINORVERSION, VER_SERVICEPACKMAJOR, VER_SERVICEPACKMINOR,
    },
    System::SystemServices::{SECURITY_MANDATORY_MEDIUM_RID, VER_GREATER_EQUAL},
    System::Threading::{
        CreateProcessW, CreateRemoteThread, GetProcessId, GetProcessTimes, GetThreadId,
        OpenProcess, OpenProcessToken, OpenThread, TerminateProcess, WaitForSingleObject,
        CREATE_NO_WINDOW, CREATE_UNICODE_ENVIRONMENT, LPTHREAD_START_ROUTINE,
        NORMAL_PRIORITY_CLASS, PROCESS_ALL_ACCESS, PROCESS_BASIC_INFORMATION, PROCESS_INFORMATION,
        STARTUPINFOW, THREAD_GET_CONTEXT,
    },
    UI::Shell::{FOLDERID_RoamingAppData, SHGetKnownFolderPath},
    UI::WindowsAndMessaging::{EnumWindows, GetWindowThreadProcessId, IsHungAppWindow},
};

type DWORD = u32;
type ULONG = u32;
type DWORDLONG = u64;
type LPVOID = *mut c_void;
type PVOID = LPVOID;
type PBOOL = *mut BOOL;
type PDWORD = *mut DWORD;
#[allow(non_camel_case_types)]
type PWER_RUNTIME_EXCEPTION_INFORMATION = *mut WER_RUNTIME_EXCEPTION_INFORMATION;

/* The following struct must be kept in sync with the identically named one in
 * nsExceptionHandler.h. WER will use it to communicate with the main process
 * when a child process is encountered. */
#[repr(C)]
struct WindowsErrorReportingData {
    child_pid: DWORD,
    minidump_name: [u8; 40],
}

// This value comes from GeckoProcessTypes.h
static MAIN_PROCESS_TYPE: u32 = 0;

#[no_mangle]
pub extern "C" fn OutOfProcessExceptionEventCallback(
    context: PVOID,
    exception_information: PWER_RUNTIME_EXCEPTION_INFORMATION,
    b_ownership_claimed: PBOOL,
    _wsz_event_name: PWSTR,
    _pch_size: PDWORD,
    _dw_signature_count: PDWORD,
) -> HRESULT {
    let result = out_of_process_exception_event_callback(context, exception_information);

    match result {
        Ok(_) => {
            unsafe {
                // Inform WER that we claim ownership of this crash
                *b_ownership_claimed = TRUE;
                // Make sure that the process shuts down
                TerminateProcess((*exception_information).hProcess, 1);
            }
            S_OK
        }
        Err(_) => E_UNEXPECTED,
    }
}

#[no_mangle]
pub extern "C" fn OutOfProcessExceptionEventSignatureCallback(
    _context: PVOID,
    _exception_information: PWER_RUNTIME_EXCEPTION_INFORMATION,
    _w_index: DWORD,
    _wsz_name: PWSTR,
    _ch_name: PDWORD,
    _wsz_value: PWSTR,
    _ch_value: PDWORD,
) -> HRESULT {
    S_OK
}

#[no_mangle]
pub extern "C" fn OutOfProcessExceptionEventDebuggerLaunchCallback(
    _context: PVOID,
    _exception_information: PWER_RUNTIME_EXCEPTION_INFORMATION,
    b_is_custom_debugger: PBOOL,
    _wsz_debugger_launch: PWSTR,
    _ch_debugger_launch: PDWORD,
    _b_is_debugger_autolaunch: PBOOL,
) -> HRESULT {
    unsafe {
        *b_is_custom_debugger = FALSE;
    }

    S_OK
}

type Result<T> = std::result::Result<T, ()>;

fn out_of_process_exception_event_callback(
    context: PVOID,
    exception_information: PWER_RUNTIME_EXCEPTION_INFORMATION,
) -> Result<()> {
    let exception_information = unsafe { &mut *exception_information };
    let is_fatal = exception_information.bIsFatal.to_bool();
    let mut is_ui_hang = false;
    if !is_fatal {
        'hang: {
            // Check whether this error is a hang. A hang always results in an EXCEPTION_BREAKPOINT.
            // Hangs may have an hThread/context that is unrelated to the hanging thread, so we get
            // it by searching for process windows that are hung.
            if exception_information.exceptionRecord.ExceptionCode == EXCEPTION_BREAKPOINT {
                if let Ok(thread_id) = find_hung_window_thread(exception_information.hProcess) {
                    // In the case of a hang, change the crashing thread to be the one that created
                    // the hung window.
                    //
                    // This is all best-effort, so don't return errors (just fall through to the
                    // Ok return).
                    let thread_handle = unsafe { OpenThread(THREAD_GET_CONTEXT, FALSE, thread_id) };
                    if thread_handle != 0
                        && unsafe {
                            GetThreadContext(thread_handle, &mut exception_information.context)
                        }
                        .to_bool()
                    {
                        exception_information.hThread = thread_handle;
                        break 'hang;
                    }
                }
            }

            // A non-fatal but non-hang exception should not do anything else.
            return Ok(());
        }
        is_ui_hang = true;
    }

    let process = exception_information.hProcess;
    let application_info = ApplicationInformation::from_process(process)?;
    let process_type: u32 = (context as usize).try_into().map_err(|_| ())?;
    let startup_time = get_startup_time(process)?;
    let crash_report = CrashReport::new(&application_info, startup_time, is_ui_hang);
    crash_report.write_minidump(exception_information)?;
    if process_type == MAIN_PROCESS_TYPE {
        match is_sandboxed_process(process) {
            Ok(false) => handle_main_process_crash(crash_report, &application_info),
            _ => {
                // The parent process should never be sandboxed, bail out so the
                // process which is impersonating it gets killed right away. Also
                // bail out if is_sandboxed_process() failed while checking.
                Ok(())
            }
        }
    } else {
        handle_child_process_crash(crash_report, process)
    }
}

/// Find whether the given process has a hung window, and return the thread id related to the
/// window.
fn find_hung_window_thread(process: HANDLE) -> Result<DWORD> {
    let process_id = get_process_id(process)?;

    struct WindowSearch {
        process_id: DWORD,
        ui_thread_id: Option<DWORD>,
    }

    let mut search = WindowSearch {
        process_id,
        ui_thread_id: None,
    };

    unsafe extern "system" fn enum_window_callback(wnd: HWND, data: LPARAM) -> BOOL {
        let data = &mut *(data as *mut WindowSearch);
        let mut window_proc_id = DWORD::default();
        let thread_id = GetWindowThreadProcessId(wnd, &mut window_proc_id);
        if thread_id != 0 && window_proc_id == data.process_id && IsHungAppWindow(wnd).to_bool() {
            data.ui_thread_id = Some(thread_id);
            FALSE
        } else {
            TRUE
        }
    }

    // Disregard the return value, we are trying for best-effort service (it's okay if ui_thread_id
    // is never set).
    unsafe { EnumWindows(Some(enum_window_callback), &mut search as *mut _ as LPARAM) };

    search.ui_thread_id.ok_or(())
}

fn get_parent_process(process: HANDLE) -> Result<HANDLE> {
    let pbi = get_process_basic_information(process)?;
    get_process_handle(pbi.InheritedFromUniqueProcessId as u32)
}

fn handle_main_process_crash(
    crash_report: CrashReport,
    application_information: &ApplicationInformation,
) -> Result<()> {
    crash_report.write_extra_file()?;
    crash_report.write_event_file()?;

    launch_crash_reporter_client(&application_information.install_path, &crash_report);

    Ok(())
}

fn handle_child_process_crash(crash_report: CrashReport, child_process: HANDLE) -> Result<()> {
    let parent_process = get_parent_process(child_process)?;
    let process_reader = ProcessReader::new(parent_process).map_err(|_e| ())?;
    let wer_notify_proc = process_reader
        .find_section("xul.dll", "mozwerpt")
        .map_err(|_e| ())?;
    let wer_notify_proc = unsafe { transmute::<_, LPTHREAD_START_ROUTINE>(wer_notify_proc) };

    let wer_data = WindowsErrorReportingData {
        child_pid: get_process_id(child_process)?,
        minidump_name: crash_report.get_minidump_name(),
    };
    let address = copy_object_into_process(parent_process, wer_data)?;
    notify_main_process(parent_process, wer_notify_proc, address)
}

fn copy_object_into_process<T>(process: HANDLE, data: T) -> Result<*mut T> {
    let address = unsafe {
        VirtualAllocEx(
            process,
            null(),
            size_of::<T>(),
            MEM_RESERVE | MEM_COMMIT,
            PAGE_READWRITE,
        )
    };

    if address.is_null() {
        return Err(());
    }

    let res = unsafe {
        WriteProcessMemory(
            process,
            address,
            addr_of!(data) as *const _,
            size_of::<T>(),
            null_mut(),
        )
    };

    if res == 0 {
        unsafe { VirtualFreeEx(process, address as *mut _, 0, MEM_RELEASE) };
        Err(())
    } else {
        Ok(address as *mut T)
    }
}

fn notify_main_process(
    process: HANDLE,
    wer_notify_proc: LPTHREAD_START_ROUTINE,
    address: *mut WindowsErrorReportingData,
) -> Result<()> {
    let thread = unsafe {
        CreateRemoteThread(
            process,
            null_mut(),
            0,
            wer_notify_proc,
            address as LPVOID,
            0,
            null_mut(),
        )
    };

    if thread == 0 {
        unsafe { VirtualFreeEx(process, address as *mut _, 0, MEM_RELEASE) };
        return Err(());
    }

    // From this point on the memory pointed to by address is owned by the
    // thread we've created in the main process, so we don't free it.

    let thread = unsafe { OwnedHandle::from_raw_handle(thread as RawHandle) };

    // Don't wait forever as we want the process to get killed eventually
    let res = unsafe { WaitForSingleObject(thread.as_raw_handle() as HANDLE, 5000) };
    if res != WAIT_OBJECT_0 {
        return Err(());
    }

    Ok(())
}

fn get_startup_time(process: HANDLE) -> Result<u64> {
    const ZERO_FILETIME: FILETIME = FILETIME {
        dwLowDateTime: 0,
        dwHighDateTime: 0,
    };
    let mut create_time: FILETIME = ZERO_FILETIME;
    let mut exit_time: FILETIME = ZERO_FILETIME;
    let mut kernel_time: FILETIME = ZERO_FILETIME;
    let mut user_time: FILETIME = ZERO_FILETIME;
    unsafe {
        if GetProcessTimes(
            process,
            &mut create_time as *mut _,
            &mut exit_time as *mut _,
            &mut kernel_time as *mut _,
            &mut user_time as *mut _,
        ) == 0
        {
            return Err(());
        }
    }
    let start_time_in_ticks =
        ((create_time.dwHighDateTime as u64) << 32) + create_time.dwLowDateTime as u64;
    let windows_tick: u64 = 10000000;
    let sec_to_unix_epoch = 11644473600;
    Ok((start_time_in_ticks / windows_tick) - sec_to_unix_epoch)
}

fn get_process_id(process: HANDLE) -> Result<DWORD> {
    match unsafe { GetProcessId(process) } {
        0 => Err(()),
        pid => Ok(pid),
    }
}

fn get_process_handle(pid: DWORD) -> Result<HANDLE> {
    let handle = unsafe { OpenProcess(PROCESS_ALL_ACCESS, FALSE, pid) };
    if handle != 0 {
        Ok(handle)
    } else {
        Err(())
    }
}

fn launch_crash_reporter_client(install_path: &Path, crash_report: &CrashReport) {
    // Prepare the command line
    let client_path = install_path.join("crashreporter.exe");

    let mut cmd_line = OsString::from("\"");
    cmd_line.push(client_path);
    cmd_line.push("\" \"");
    cmd_line.push(crash_report.get_minidump_path());
    cmd_line.push("\"\0");
    let mut cmd_line: Vec<u16> = cmd_line.encode_wide().collect();

    let mut pi = unsafe { zeroed::<PROCESS_INFORMATION>() };
    let mut si = STARTUPINFOW {
        cb: size_of::<STARTUPINFOW>().try_into().unwrap(),
        ..unsafe { zeroed() }
    };

    unsafe {
        if CreateProcessW(
            null_mut(),
            cmd_line.as_mut_ptr(),
            null_mut(),
            null_mut(),
            FALSE,
            NORMAL_PRIORITY_CLASS | CREATE_NO_WINDOW | CREATE_UNICODE_ENVIRONMENT,
            null_mut(),
            null_mut(),
            &mut si,
            &mut pi,
        ) != 0
        {
            CloseHandle(pi.hProcess);
            CloseHandle(pi.hThread);
        }
    }
}

#[derive(Debug)]
struct ApplicationData {
    vendor: Option<String>,
    name: String,
    version: String,
    build_id: String,
    product_id: String,
    server_url: String,
}

impl ApplicationData {
    fn load_from_disk(install_path: &Path) -> Result<ApplicationData> {
        let ini_path = ApplicationData::get_path(install_path);
        let conf = Ini::load_from_file(ini_path).map_err(|_e| ())?;

        // Parse the "App" section
        let app_section = conf.section(Some("App")).ok_or(())?;
        let vendor = app_section.get("Vendor").map(|s| s.to_owned());
        let name = app_section.get("Name").ok_or(())?.to_owned();
        let version = app_section.get("Version").ok_or(())?.to_owned();
        let build_id = app_section.get("BuildID").ok_or(())?.to_owned();
        let product_id = app_section.get("ID").ok_or(())?.to_owned();

        // Parse the "Crash Reporter" section
        let crash_reporter_section = conf.section(Some("Crash Reporter")).ok_or(())?;
        let server_url = crash_reporter_section
            .get("ServerURL")
            .ok_or(())?
            .to_owned();

        // InstallTime<build_id>

        Ok(ApplicationData {
            vendor,
            name,
            version,
            build_id,
            product_id,
            server_url,
        })
    }

    fn get_path(install_path: &Path) -> PathBuf {
        install_path.join("application.ini")
    }
}

#[derive(Serialize)]
#[allow(non_snake_case)]
struct Annotations {
    BuildID: String,
    CrashTime: String,
    InstallTime: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    Hang: Option<String>,
    ProductID: String,
    ProductName: String,
    ReleaseChannel: String,
    ServerURL: String,
    StartupTime: String,
    UptimeTS: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    Vendor: Option<String>,
    Version: String,
    WindowsErrorReporting: String,
}

impl Annotations {
    fn from_application_data(
        application_data: &ApplicationData,
        release_channel: String,
        install_time: String,
        crash_time: u64,
        startup_time: u64,
        ui_hang: bool,
    ) -> Annotations {
        Annotations {
            BuildID: application_data.build_id.clone(),
            CrashTime: crash_time.to_string(),
            InstallTime: install_time,
            Hang: ui_hang.then(|| "ui".to_string()),
            ProductID: application_data.product_id.clone(),
            ProductName: application_data.name.clone(),
            ReleaseChannel: release_channel,
            ServerURL: application_data.server_url.clone(),
            StartupTime: startup_time.to_string(),
            UptimeTS: (crash_time - startup_time).to_string() + ".0",
            Vendor: application_data.vendor.clone(),
            Version: application_data.version.clone(),
            WindowsErrorReporting: "1".to_string(),
        }
    }
}

/// Encapsulates the information about the application that crashed. This includes the install path as well as version information
struct ApplicationInformation {
    install_path: PathBuf,
    application_data: ApplicationData,
    release_channel: String,
    crash_reports_dir: PathBuf,
    install_time: String,
}

impl ApplicationInformation {
    fn from_process(process: HANDLE) -> Result<ApplicationInformation> {
        let mut install_path = ApplicationInformation::get_application_path(process)?;
        install_path.pop();
        let application_data = ApplicationData::load_from_disk(install_path.as_ref())?;
        let release_channel = ApplicationInformation::get_release_channel(install_path.as_ref())?;
        let crash_reports_dir = ApplicationInformation::get_crash_reports_dir(&application_data)?;
        let install_time = ApplicationInformation::get_install_time(
            &crash_reports_dir,
            &application_data.build_id,
        )
        .unwrap_or("0".to_string());

        Ok(ApplicationInformation {
            install_path,
            application_data,
            release_channel,
            crash_reports_dir,
            install_time,
        })
    }

    fn get_application_path(process: HANDLE) -> Result<PathBuf> {
        let mut path: [u16; MAX_PATH as usize + 1] = [0; MAX_PATH as usize + 1];
        unsafe {
            let res = K32GetModuleFileNameExW(
                process,
                0,
                (&mut path).as_mut_ptr(),
                (MAX_PATH + 1) as DWORD,
            );

            if res == 0 {
                return Err(());
            }

            let application_path = PathBuf::from(OsString::from_wide(&path[0..res as usize]));
            Ok(application_path)
        }
    }

    fn get_release_channel(install_path: &Path) -> Result<String> {
        let channel_prefs =
            File::open(install_path.join("defaults/pref/channel-prefs.js")).map_err(|_e| ())?;
        let lines = BufReader::new(channel_prefs).lines();
        let line = lines
            .filter_map(std::result::Result::ok)
            .find(|line| line.contains("app.update.channel"))
            .ok_or(())?;
        line.split("\"").nth(3).map(|s| s.to_string()).ok_or(())
    }

    fn get_crash_reports_dir(application_data: &ApplicationData) -> Result<PathBuf> {
        let mut psz_path: PWSTR = null_mut();
        unsafe {
            let res = SHGetKnownFolderPath(
                &FOLDERID_RoamingAppData as *const _,
                0,
                0,
                &mut psz_path as *mut _,
            );

            if res == S_OK {
                let mut len = 0;
                while psz_path.offset(len).read() != 0 {
                    len += 1;
                }
                let str = OsString::from_wide(from_raw_parts(psz_path, len as usize));
                CoTaskMemFree(psz_path as _);
                let mut path = PathBuf::from(str);
                if let Some(vendor) = &application_data.vendor {
                    path.push(vendor);
                }
                path.push(&application_data.name);
                path.push("Crash Reports");
                Ok(path)
            } else {
                Err(())
            }
        }
    }

    fn get_install_time(crash_reports_path: &Path, build_id: &str) -> Result<String> {
        let file_name = "InstallTime".to_owned() + build_id;
        let file_path = crash_reports_path.join(file_name);
        read_to_string(file_path).map_err(|_e| ())
    }
}

struct CrashReport {
    uuid: String,
    crash_reports_path: PathBuf,
    release_channel: String,
    annotations: Annotations,
    crash_time: u64,
}

impl CrashReport {
    fn new(
        application_information: &ApplicationInformation,
        startup_time: u64,
        ui_hang: bool,
    ) -> CrashReport {
        let uuid = Uuid::new_v4()
            .as_hyphenated()
            .encode_lower(&mut Uuid::encode_buffer())
            .to_owned();
        let crash_reports_path = application_information.crash_reports_dir.clone();
        let crash_time: u64 = unsafe { time(null_mut()) as u64 };
        let annotations = Annotations::from_application_data(
            &application_information.application_data,
            application_information.release_channel.clone(),
            application_information.install_time.clone(),
            crash_time,
            startup_time,
            ui_hang,
        );
        CrashReport {
            uuid,
            crash_reports_path,
            release_channel: application_information.release_channel.clone(),
            annotations,
            crash_time,
        }
    }

    fn is_nightly(&self) -> bool {
        self.release_channel == "nightly" || self.release_channel == "default"
    }

    fn get_minidump_type(&self) -> MINIDUMP_TYPE {
        let mut minidump_type = MiniDumpWithFullMemoryInfo | MiniDumpWithUnloadedModules;
        if self.is_nightly() {
            // This is Nightly only because this doubles the size of minidumps based
            // on the experimental data.
            minidump_type = minidump_type | MiniDumpWithProcessThreadData;

            // dbghelp.dll on Win7 can't handle overlapping memory regions so we only
            // enable this feature on Win8 or later.
            if is_windows8_or_later() {
                // This allows us to examine heap objects referenced from stack objects
                // at the cost of further doubling the size of minidumps.
                minidump_type = minidump_type | MiniDumpWithIndirectlyReferencedMemory
            }
        }
        minidump_type
    }

    fn get_pending_path(&self) -> PathBuf {
        self.crash_reports_path.join("pending")
    }

    fn get_events_path(&self) -> PathBuf {
        self.crash_reports_path.join("events")
    }

    fn get_minidump_path(&self) -> PathBuf {
        self.get_pending_path().join(self.uuid.to_string() + ".dmp")
    }

    fn get_minidump_name(&self) -> [u8; 40] {
        let bytes = (self.uuid.to_string() + ".dmp").into_bytes();
        bytes[0..40].try_into().unwrap()
    }

    fn get_extra_file_path(&self) -> PathBuf {
        self.get_pending_path()
            .join(self.uuid.to_string() + ".extra")
    }

    fn get_event_file_path(&self) -> PathBuf {
        self.get_events_path().join(self.uuid.to_string())
    }

    fn write_minidump(
        &self,
        exception_information: PWER_RUNTIME_EXCEPTION_INFORMATION,
    ) -> Result<()> {
        // Make sure that the target directory is present
        DirBuilder::new()
            .recursive(true)
            .create(self.get_pending_path())
            .map_err(|_e| ())?;

        let minidump_path = self.get_minidump_path();
        let minidump_file = File::create(minidump_path).map_err(|_e| ())?;
        let minidump_type: MINIDUMP_TYPE = self.get_minidump_type();

        unsafe {
            let mut exception_pointers = EXCEPTION_POINTERS {
                ExceptionRecord: &mut ((*exception_information).exceptionRecord),
                ContextRecord: &mut ((*exception_information).context),
            };

            let mut exception = MINIDUMP_EXCEPTION_INFORMATION {
                ThreadId: GetThreadId((*exception_information).hThread),
                ExceptionPointers: &mut exception_pointers,
                ClientPointers: FALSE,
            };

            MiniDumpWriteDump(
                (*exception_information).hProcess,
                get_process_id((*exception_information).hProcess)?,
                minidump_file.as_raw_handle() as _,
                minidump_type,
                &mut exception,
                /* userStream */ null(),
                /* callback */ null(),
            )
            .success()
        }
    }

    fn write_extra_file(&self) -> Result<()> {
        let extra_file = File::create(self.get_extra_file_path()).map_err(|_e| ())?;
        to_writer(extra_file, &self.annotations).map_err(|_e| ())
    }

    fn write_event_file(&self) -> Result<()> {
        // Make that the target directory is present
        DirBuilder::new()
            .recursive(true)
            .create(self.get_events_path())
            .map_err(|_e| ())?;

        let mut event_file = File::create(self.get_event_file_path()).map_err(|_e| ())?;
        writeln!(event_file, "crash.main.3").map_err(|_e| ())?;
        writeln!(event_file, "{}", self.crash_time).map_err(|_e| ())?;
        writeln!(event_file, "{}", self.uuid).map_err(|_e| ())?;
        to_writer(event_file, &self.annotations).map_err(|_e| ())
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
        let mut mask: DWORDLONG = 0;
        let ge: u8 = VER_GREATER_EQUAL.try_into().unwrap();
        mask = VerSetConditionMask(mask, VER_MAJORVERSION, ge);
        mask = VerSetConditionMask(mask, VER_MINORVERSION, ge);
        mask = VerSetConditionMask(mask, VER_SERVICEPACKMAJOR, ge);
        mask = VerSetConditionMask(mask, VER_SERVICEPACKMINOR, ge);

        VerifyVersionInfoW(
            &mut info,
            VER_MAJORVERSION | VER_MINORVERSION | VER_SERVICEPACKMAJOR | VER_SERVICEPACKMINOR,
            mask,
        )
        .to_bool()
    }
}

trait WinBool: Sized {
    fn to_bool(self) -> bool;
    fn if_true<T>(self, value: T) -> Result<T> {
        if self.to_bool() {
            Ok(value)
        } else {
            Err(())
        }
    }
    fn success(self) -> Result<()> {
        self.if_true(())
    }
}

impl WinBool for BOOL {
    fn to_bool(self) -> bool {
        match self {
            FALSE => false,
            _ => true,
        }
    }
}

fn get_process_basic_information(process: HANDLE) -> Result<PROCESS_BASIC_INFORMATION> {
    let mut pbi: PROCESS_BASIC_INFORMATION = unsafe { zeroed() };
    let mut length: ULONG = 0;
    let result = unsafe {
        NtQueryInformationProcess(
            process,
            ProcessBasicInformation,
            &mut pbi as *mut _ as _,
            size_of::<PROCESS_BASIC_INFORMATION>().try_into().unwrap(),
            &mut length,
        )
    };

    if result != STATUS_SUCCESS {
        return Err(());
    }

    Ok(pbi)
}

fn is_sandboxed_process(process: HANDLE) -> Result<bool> {
    let mut token: HANDLE = 0;
    let res = unsafe { OpenProcessToken(process, TOKEN_QUERY, &mut token as *mut _) };

    if res != TRUE {
        return Err(());
    }

    let is_restricted = unsafe { IsTokenRestricted(token) } != FALSE;

    unsafe { SetLastError(ERROR_SUCCESS) };
    let mut buffer_size: DWORD = 0;
    let res = unsafe {
        GetTokenInformation(
            token,
            TokenIntegrityLevel,
            null_mut(),
            0,
            &mut buffer_size as *mut _,
        )
    };

    if (res != FALSE) || (unsafe { GetLastError() } != ERROR_INSUFFICIENT_BUFFER) {
        return Err(());
    }

    let mut buffer: Vec<u8> = vec![Default::default(); buffer_size as usize];
    let res = unsafe {
        GetTokenInformation(
            token,
            TokenIntegrityLevel,
            buffer.as_mut_ptr() as *mut _,
            buffer_size,
            &mut buffer_size as *mut _,
        )
    };

    if res != TRUE {
        return Err(());
    }

    let token_mandatory_label = &unsafe { *(buffer.as_ptr() as *const TOKEN_MANDATORY_LABEL) };
    let sid = token_mandatory_label.Label.Sid;
    // We're not checking for errors in the following two calls because these
    // functions can only fail if provided with an invalid SID and we know the
    // one we obtained from `GetTokenInformation()` is valid.
    let sid_subauthority_count = unsafe { *GetSidSubAuthorityCount(sid) - 1u8 };
    let integrity_level = unsafe { *GetSidSubAuthority(sid, sid_subauthority_count.into()) };

    Ok((integrity_level < SECURITY_MANDATORY_MEDIUM_RID as u32) || is_restricted)
}
