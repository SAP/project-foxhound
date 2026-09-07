/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use std::{slice, str};

#[repr(C)]
#[derive(Clone, Copy)]
pub struct RustSpan<T> {
    buffer: *const T,
    len: usize,
}

impl<T> RustSpan<T> {
    pub fn as_slice(&self) -> &[T] {
        unsafe {
            if self.len == 0 {
                return &[];
            }
            slice::from_raw_parts(self.buffer, self.len)
        }
    }

    pub const fn from_slice(slice: &[T]) -> RustSpan<T> {
        RustSpan {
            buffer: slice.as_ptr(),
            len: slice.len(),
        }
    }

    pub const fn empty() -> RustSpan<T> {
        RustSpan {
            buffer: std::ptr::dangling(),
            len: 0,
        }
    }
}

pub type StringView = RustSpan<u8>;
impl<'a> From<&'a str> for StringView {
    fn from(input: &str) -> StringView {
        RustSpan::from_slice(input.as_bytes())
    }
}

impl<'a> From<&'a Option<String>> for StringView {
    fn from(input: &Option<String>) -> StringView {
        match input {
            Some(ref s) => StringView::from(&**s),
            None => StringView::empty(),
        }
    }
}
