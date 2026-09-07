/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

use serde::{Deserialize, Serialize};

/// A flow ID for connecting profiler markers across time.
///
/// Analogous to the C++ `Flow` class in `mozglue/baseprofiler/public/Flow.h`.
#[derive(Serialize, Deserialize, Debug, Clone, Copy)]
pub struct FlowId(u64);

impl<T> From<*const T> for FlowId {
    fn from(ptr: *const T) -> Self {
        FlowId(ptr as usize as u64)
    }
}

impl<T> From<*mut T> for FlowId {
    fn from(ptr: *mut T) -> Self {
        FlowId(ptr as usize as u64)
    }
}

impl From<u64> for FlowId {
    fn from(id: u64) -> Self {
        FlowId(id)
    }
}

impl FlowId {
    /// Returns a 16-byte ASCII hex representation of this flow ID,
    /// suitable for writing as a profiler marker flow property.
    pub fn to_hex(self) -> [u8; 16] {
        let mut buf = [0; 16];
        let hex_digits = b"0123456789abcdef";
        for i in 0..16 {
            buf[i] = hex_digits[(self.0 >> (60 - i * 4)) as usize & 0xf];
        }
        buf
    }
}
