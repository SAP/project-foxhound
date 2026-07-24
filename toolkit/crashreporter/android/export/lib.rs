/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

use crashping::{self, net};
use minidump_analyzer::MinidumpAnalyzer;

#[derive(Debug)]
#[repr(C)]
pub struct Utf16String {
    chars: *const u16,
    len: usize,
}

impl Utf16String {
    pub fn empty() -> Self {
        Utf16String {
            chars: std::ptr::null(),
            len: 0,
        }
    }

    pub fn as_string_lossy(&self) -> String {
        if self.chars.is_null() {
            String::default()
        } else {
            String::from_utf16_lossy(unsafe { std::slice::from_raw_parts(self.chars, self.len) })
        }
    }
}

impl std::fmt::Display for Utf16String {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.as_string_lossy())
    }
}

impl Drop for Utf16String {
    fn drop(&mut self) {
        if !self.chars.is_null() {
            // # Safety
            // We only own Utf16Strings which are created in Rust code, so when dropping, the
            // memory is that which we allocated (and thus is safe to deallocate).
            unsafe {
                std::alloc::dealloc(
                    self.chars as *mut u8,
                    // unwrap() because the memory must have been a size that doesn't overflow when
                    // it was originally allocated.
                    std::alloc::Layout::array::<u16>(self.len).unwrap(),
                )
            };
        }
    }
}

impl Default for Utf16String {
    fn default() -> Self {
        Self::empty()
    }
}

impl From<String> for Utf16String {
    fn from(value: String) -> Self {
        let utf16: Box<[u16]> = value.encode_utf16().collect();
        let utf16 = Box::leak(utf16);
        Utf16String {
            chars: utf16.as_mut_ptr(),
            len: utf16.len(),
        }
    }
}

#[no_mangle]
pub extern "C" fn crashtools_init() {
    android_logger::init_once(
        android_logger::Config::default().with_max_level(log::LevelFilter::Debug),
    );
    log::debug!("loaded crashtools library");
}

// Returns the value to be returned by the upload callback.
#[no_mangle]
pub extern "C" fn crashtools_upload_exception(non_fatal: bool, message: &Utf16String) -> i32 {
    log::log!(
        if non_fatal {
            log::Level::Warn
        } else {
            log::Level::Error
        },
        "failed to upload crash ping: {message}"
    );

    if non_fatal {
        UPLOAD_NON_FATAL_ERROR
    } else {
        UPLOAD_FATAL_ERROR
    }
}

#[no_mangle]
pub static CRASHTOOLS_UPLOAD_FATAL_ERROR: i32 = UPLOAD_FATAL_ERROR;

#[no_mangle]
pub extern "C" fn crashtools_analyze_minidump(
    minidump_path: &Utf16String,
    extras_path: &Utf16String,
    all_threads: bool,
) -> Utf16String {
    let minidump_path = minidump_path.as_string_lossy();
    let extras_path = extras_path.as_string_lossy();
    MinidumpAnalyzer::new(minidump_path.as_ref())
        .extras_file(extras_path.as_ref())
        .all_threads(all_threads)
        .analyze()
        .err()
        .map(|e| e.to_string().into())
        .unwrap_or_default()
}

#[no_mangle]
pub extern "C" fn crashtools_free_string(result: Utf16String) {
    // This will happen anyway, but we're explicit about it for clarity.
    drop(result);
}

type UploadFn = extern "C" fn(
    url: &Utf16String,
    body: *const u8,
    body_len: usize,
    headers: *const [Utf16String; 2],
    headers_len: usize,
) -> i32;

#[no_mangle]
pub extern "C" fn crashtools_crashping_init(
    data_dir: &Utf16String,
    app_id: &Utf16String,
    build_id: Option<&Utf16String>,
    display_version: Option<&Utf16String>,
    upload_fn: UploadFn,
) -> Utf16String {
    let data_dir = data_dir.as_string_lossy();
    let app_id = app_id.as_string_lossy();
    let mut init_glean = crashping::InitGlean::new(
        data_dir.into(),
        &app_id,
        crashping::ClientInfoMetrics {
            app_build: build_id
                .map(|b| b.as_string_lossy())
                .unwrap_or_else(|| "Unknown".to_string()),
            app_display_version: display_version
                .map(|v| v.as_string_lossy())
                .unwrap_or_else(|| "Unknown".to_string()),
            channel: None,
            locale: None,
        },
    );
    init_glean.configuration.uploader = Some(Box::new(Uploader(upload_fn)));
    match init_glean.initialize() {
        Ok(glean_handle) => {
            glean_handle.application_lifetime();
            Default::default()
        }
        Err(e) => format!("failed to acquire Glean store: {e}").into(),
    }
}

#[no_mangle]
pub extern "C" fn crashtools_send_ping(extras: &Utf16String) {
    log::debug!("sending crash ping");
    let extras = extras.as_string_lossy();
    let extras: serde_json::Value = match serde_json::from_str(&extras) {
        Ok(v) => v,
        Err(e) => {
            log::error!("failed to read extras: {e}");
            return;
        }
    };
    if let Err(e) = crashping::send(&extras, Some("crash")) {
        log::error!("failed to send ping: {e:#}");
    } else {
        log::info!("sent crash ping");
    }
}

/// # Safety
/// `callback` and `drop` must be safe to call from arbitrary threads.
#[no_mangle]
pub extern "C" fn crashtools_test_metric_values_before_next_send(
    callback: extern "C" fn(*const (), &Utf16String),
    drop: extern "C" fn(*const ()),
    data: *const (),
) {
    log::debug!("registering callback to get metric values before next send");
    let closure = ExternFnClosure {
        data,
        drop,
        call: callback,
    };
    crashping::test_before_next_send(move |_| {
        let arg = crashping::test_get_metric_values().to_string().into();
        log::debug!("invoking registered callback");
        closure.call(&arg)
    });
}

struct ExternFnClosure<T> {
    data: *const (),
    drop: extern "C" fn(*const ()),
    call: extern "C" fn(*const (), &T),
}

impl<T> ExternFnClosure<T> {
    fn call(&self, value: &T) {
        (self.call)(self.data, value)
    }
}

impl<T> Drop for ExternFnClosure<T> {
    fn drop(&mut self) {
        (self.drop)(self.data);
    }
}

// # Safety
// It is safe to Send ExternFnClosure as long as the callback and drop functions provided may be
// called from arbitrary threads.
unsafe impl<T> Send for ExternFnClosure<T> {}

struct Uploader(UploadFn);

impl std::fmt::Debug for Uploader {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct(std::any::type_name::<Self>())
            .finish_non_exhaustive()
    }
}

const UPLOAD_NON_FATAL_ERROR: i32 = -1;
const UPLOAD_FATAL_ERROR: i32 = -2;

impl net::PingUploader for Uploader {
    fn upload(&self, upload_request: net::CapablePingUploadRequest) -> net::UploadResult {
        let Some(request) = upload_request.capable(|c| c.is_empty()) else {
            return net::UploadResult::incapable();
        };
        let url = Utf16String::from(request.url);
        let headers: Vec<[Utf16String; 2]> = request
            .headers
            .into_iter()
            .map(|(k, v)| [Utf16String::from(k), Utf16String::from(v)])
            .collect();
        let ret_code = (self.0)(
            &url,
            request.body.as_ptr(),
            request.body.len(),
            headers.as_ptr(),
            headers.len(),
        );
        if ret_code == UPLOAD_NON_FATAL_ERROR {
            net::UploadResult::recoverable_failure()
        } else if ret_code == UPLOAD_FATAL_ERROR {
            net::UploadResult::unrecoverable_failure()
        } else {
            net::UploadResult::http_status(ret_code)
        }
    }
}
