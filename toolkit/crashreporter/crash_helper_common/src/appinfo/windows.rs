/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

use std::{ffi::c_void, ptr::null_mut};

use windows_sys::Win32::{
    Foundation::{FALSE, HANDLE, INVALID_HANDLE_VALUE},
    Security::{GetTokenInformation, TokenUser, TOKEN_QUERY},
    System::Threading::{GetCurrentProcess, OpenProcessToken},
};

use super::ApplicationInfo;

impl ApplicationInfo {
    pub fn get_user_id() -> Option<u64> {
        let mut token_handle: HANDLE = INVALID_HANDLE_VALUE;
        // SAFETY: The `token_handle` pointer is valid as valid because it
        // points to a stack-allocated object.
        let res =
            unsafe { OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token_handle as _) };

        if res == FALSE {
            return None;
        }

        let mut length: u32 = 0;
        // SAFETY: We have verified that `token_handle` is a valid handle and
        // the pointer to `length` is valid as it points to a stack-allocated
        // object.
        let res = unsafe {
            GetTokenInformation(token_handle, TokenUser, null_mut(), 0, &mut length as _)
        };

        if (res != FALSE) || (length == 0) {
            // This shouldn't really be happening but better safe than sorry.
            return None;
        }

        let mut buffer = Vec::<u8>::with_capacity(length as usize);
        // SAFETY: We have verified that `token_handle` is a valid handle, the
        // pointer to `length` is valid as it points to a stack-allocated
        // object and the pointer to the buffer is valid and guaranteed to be
        // of the right size.
        let res = unsafe {
            GetTokenInformation(
                token_handle,
                TokenUser,
                buffer.as_mut_ptr() as *mut c_void,
                length,
                &mut length as _,
            )
        };

        if res == FALSE {
            return None;
        }

        // SAFETY: We have verified that the `GetTokenInformation()` call has
        // populated `length` bytes of this array.
        unsafe { buffer.set_len(length as usize) };
        let pseudo_user_id = buffer.iter().fold(0u64, |id, &byte| id + byte as u64);
        Some(pseudo_user_id)
    }
}
