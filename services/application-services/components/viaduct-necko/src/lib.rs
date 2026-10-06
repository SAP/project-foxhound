/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use error_support::{info, warn};
use futures_channel::oneshot;
use std::{ffi::{CStr, c_char}, ptr, slice, sync::Arc};
use url::Url;
use viaduct::{
    init_backend, Backend, ClientSettings, Method, Request, Response, Result, ViaductError,
};

const NULL: char = '\0';

/// Request for the C++ backend
#[repr(C)]
pub struct FfiRequest {
    pub timeout: u32,
    pub redirect_limit: u32,
    pub method: Method,
    pub url: *mut u8,
    pub headers: *mut FfiHeader,
    pub header_count: usize,
    pub body: *mut u8,
    pub body_len: usize,
}

#[repr(C)]
pub struct FfiHeader {
    pub key: *mut u8,
    pub value: *mut u8,
}

/// Result from the backend
///
/// This is built-up piece by piece using the extern "C" API.
pub struct FfiResult {
    // oneshot sender that the Rust code is awaiting.  If `Ok(())` is sent, then the Rust code
    // should return the response.  If an error is sent, then that should be returned instead.
    sender: Option<oneshot::Sender<Result<Response>>>,
    response: Response,
    // Owned values stored in the [FfiRequest].  These are copied from the request.  By storing
    // them in the result, we ensure they stay alive while the C code may access them.
    pub url: String,
    pub headers: Vec<(String, String)>,
    pub body: Option<Vec<u8>>,
    // The request struct that we pass to C++.  This must be kept alive as long as the C++ code is
    // using it.
    pub request: FfiRequest,
    pub ffi_headers: Vec<FfiHeader>,
}

// Functions that the C++ library exports for us
extern "C" {
    fn viaduct_necko_backend_init();

    #[allow(improper_ctypes)]
    fn viaduct_necko_backend_send_request(request: *const FfiRequest, result: *mut FfiResult);
}

// Functions that we provide to the C++ library

/// Set the URL for a result
///
/// # Safety
///
/// - `result` must be valid.
/// - `url` and `length` must refer to a valid byte string.
///
/// Note: URLs are expected to be ASCII. Non-ASCII URLs will be logged and skipped.
#[no_mangle]
pub unsafe extern "C" fn viaduct_necko_result_set_url(
    result: *mut FfiResult,
    url: *const u8,
    length: usize,
) {
    let result = unsafe { &mut *result };

    // Safety: Creating a slice from raw parts is safe if the backend passes valid pointers and lengths
    let url_bytes = unsafe { slice::from_raw_parts(url, length) };

    // Validate that the URL is ASCII before converting to String
    if !url_bytes.is_ascii() {
        warn!(
            "Non-ASCII URL received - length: {} - skipping URL update",
            length
        );
        return;
    }

    // Safety: We just verified the bytes are ASCII, which is valid UTF-8
    let url_str = unsafe { std::str::from_utf8_unchecked(url_bytes) };

    match Url::parse(url_str) {
        Ok(url) => {
            result.response.url = url;
        }
        Err(e) => {
            warn!("Error parsing URL from C backend: {e}")
        }
    }
}

/// Set the status code for a result
///
/// # Safety
///
/// `result` must be valid.
#[no_mangle]
pub unsafe extern "C" fn viaduct_necko_result_set_status_code(result: *mut FfiResult, code: u16) {
    let result = unsafe { &mut *result };
    result.response.status = code;
}

/// Set a header for a result
///
/// # Safety
///
/// - `result` must be valid.
/// - `key` and `key_length` must refer to a valid byte string.
/// - `value` and `value_length` must refer to a valid byte string.
///
/// Note: HTTP headers are expected to be ASCII. Non-ASCII headers will be logged and skipped.
#[no_mangle]
pub unsafe extern "C" fn viaduct_necko_result_add_header(
    result: *mut FfiResult,
    key: *const u8,
    key_length: usize,
    value: *const u8,
    value_length: usize,
) {
    let result = unsafe { &mut *result };

    // Safety: Creating slices from raw parts is safe if the backend passes valid pointers and lengths
    let key_bytes = unsafe { slice::from_raw_parts(key, key_length) };
    let value_bytes = unsafe { slice::from_raw_parts(value, value_length) };

    // Validate that headers are ASCII before converting to String
    // HTTP headers should be ASCII per best practices, though the spec technically allows other encodings
    if !key_bytes.is_ascii() || !value_bytes.is_ascii() {
        warn!(
            "Non-ASCII HTTP header received - key_len: {}, value_len: {} - skipping header",
            key_length, value_length
        );
        return;
    }

    // Safety: We just verified the bytes are ASCII, which is valid UTF-8
    let (key, value) = unsafe {
        (
            String::from_utf8_unchecked(key_bytes.to_vec()),
            String::from_utf8_unchecked(value_bytes.to_vec()),
        )
    };

    let _ = result.response.headers.insert(key, value);
}

/// Append data to a result body
///
/// This method can be called multiple times to build up the body in chunks.
///
/// # Safety
///
/// - `result` must be valid.
/// - `data` and `length` must refer to a binary string.
#[no_mangle]
pub unsafe extern "C" fn viaduct_necko_result_extend_body(
    result: *mut FfiResult,
    data: *const u8,
    length: usize,
) {
    let result = unsafe { &mut *result };
    // Safety: this is safe as long as the backend passes us valid data
    result
        .response
        .body
        .extend_from_slice(unsafe { slice::from_raw_parts(data, length) });
}

/// Complete a result
///
/// # Safety
///
/// `result` must be valid.  After calling this function it must not be used again.
#[no_mangle]
pub unsafe extern "C" fn viaduct_necko_result_complete(result: *mut FfiResult) {
    let mut result = unsafe { Box::from_raw(result) };
    match result.sender.take() {
        Some(sender) => {
            // Ignore any errors when sending the result.  This happens when the receiver is
            // closed, which happens when a future is cancelled.
            let _ = sender.send(Ok(result.response));
        }
        None => warn!("viaduct-necko: result completed twice"),
    }
}

/// Complete a result with an error message
///
/// # Safety
///
/// - `result` must be valid.  After calling this function it must not be used again.
/// - `message` and `length` must refer to a valid UTF-8 string.
#[no_mangle]
pub unsafe extern "C" fn viaduct_necko_result_complete_error(
    result: *mut FfiResult,
    error_code: u32,
    message: *const u8,
) {
    let mut result = unsafe { Box::from_raw(result) };
    // Safety: this is safe as long as the backend passes us valid data
    let msg_str = unsafe {
        CStr::from_ptr(message as *const c_char)
            .to_string_lossy()
            .into_owned()
    };
    let msg = format!("{} (0x{:08x})", msg_str, error_code);
    match result.sender.take() {
        Some(sender) => {
            // Ignore any errors when sending the result.  This happens when the receiver is
            // closed, which happens when a future is cancelled.
            let _ = sender.send(Err(ViaductError::BackendError(msg)));
        }
        None => warn!("viaduct-necko: result completed twice"),
    }
}

// The Necko backend is a zero-sized type, since all the backend functionality is statically linked
struct NeckoBackend;

/// Initialize the Necko backend
///
/// This should be called once at startup before any HTTP requests are made.
pub fn init_necko_backend() -> Result<()> {
    info!("Initializing viaduct Necko backend");
    // Safety: this is safe as long as the C++ code is correct.
    unsafe { viaduct_necko_backend_init() };
    init_backend(Arc::new(NeckoBackend))
}

#[async_trait::async_trait]
impl Backend for NeckoBackend {
    async fn send_request(&self, request: Request, settings: ClientSettings) -> Result<Response> {
        // Convert the request for the backend
        let mut url = request.url.to_string();
        url.push(NULL);

        // Convert headers to null-terminated strings for C++
        // Note: Headers iterates over Header objects, not tuples
        let header_strings: Vec<(String, String)> = request
            .headers
            .iter()
            .map(|h| {
                let mut key_str = h.name().to_string();
                key_str.push(NULL);
                let mut value_str = h.value().to_string();
                value_str.push(NULL);
                (key_str, value_str)
            })
            .collect();

        // Prepare an FfiResult with an empty response
        let (sender, receiver) = oneshot::channel();
        let mut result = Box::new(FfiResult {
            sender: Some(sender),
            response: Response {
                request_method: request.method,
                url: request.url.clone(),
                status: 0,
                headers: viaduct::Headers::new(),
                body: Vec::default(),
            },
            url,
            headers: header_strings,
            body: request.body,
            request: FfiRequest {
                timeout: settings.timeout,
                redirect_limit: settings.redirect_limit,
                method: request.method,
                url: ptr::null_mut(),
                headers: ptr::null_mut(),
                header_count: 0,
                body: ptr::null_mut(),
                body_len: 0,
            },
            ffi_headers: Vec::new(),
        });

        // Now that we have the result box, we can set up the pointers in the request.
        // By doing this after creating the box, we minimize the chance that a value moves after a pointer is created.
        result.ffi_headers = result
            .headers
            .iter_mut()
            .map(|(key, value)| FfiHeader {
                key: key.as_mut_ptr(),
                value: value.as_mut_ptr(),
            })
            .collect();

        let (body_ptr, body_len) = match &result.body {
            Some(body) => (body.as_ptr() as *mut u8, body.len()),
            None => (ptr::null_mut(), 0),
        };

        result.request.url = result.url.as_mut_ptr();
        result.request.headers = result.ffi_headers.as_mut_ptr();
        result.request.header_count = result.ffi_headers.len();
        result.request.body = body_ptr;
        result.request.body_len = body_len;

        let request_ptr = &result.request as *const FfiRequest;

        // Safety: this is safe if the C backend implements the API correctly.
        unsafe {
            viaduct_necko_backend_send_request(request_ptr, Box::into_raw(result));
        };

        receiver.await.unwrap_or_else(|_| {
            Err(ViaductError::BackendError(
                "Error receiving result from C++ backend".to_string(),
            ))
        })
    }
}

// Mark FFI types as Send to allow them to be used across an await point.  This is safe as long as
// the backend code uses them correctly.
unsafe impl Send for FfiRequest {}
unsafe impl Send for FfiResult {}
unsafe impl Send for FfiHeader {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_method_layout() {
        // Assert that the viaduct::Method enum matches the layout expected by the C++ backend.
        // See ViaductMethod in backend.h
        assert_eq!(Method::Get as u8, 0);
        assert_eq!(Method::Head as u8, 1);
        assert_eq!(Method::Post as u8, 2);
        assert_eq!(Method::Put as u8, 3);
        assert_eq!(Method::Delete as u8, 4);
        assert_eq!(Method::Connect as u8, 5);
        assert_eq!(Method::Options as u8, 6);
        assert_eq!(Method::Trace as u8, 7);
        assert_eq!(Method::Patch as u8, 8);
    }
}
