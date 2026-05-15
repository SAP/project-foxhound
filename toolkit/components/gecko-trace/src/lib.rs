/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

pub mod collector;

mod glean_adapter;
mod proto;

pub use crate::collector::{TraceCollector, TraceCollectorConfig};

use once_cell::sync::Lazy;
use xpcom::RefPtr;

static GLOBAL_TRACE_COLLECTOR: Lazy<RefPtr<TraceCollector>> =
    once_cell::sync::Lazy::new(|| TraceCollector::new(TraceCollectorConfig::default()));

#[no_mangle]
pub extern "C" fn recv_gecko_trace_export(data: *const u8, len: usize) {
    let buf = unsafe {
        if data.is_null() {
            log::error!(
                target: "recv_gecko_trace_export",
                "Received null data pointer, rejecting request"
            );
            return;
        }
        std::slice::from_raw_parts(data, len)
    };

    if let Err(err) = GLOBAL_TRACE_COLLECTOR.process_export_request(buf) {
        log::error!(
            target: "recv_gecko_trace_export",
            "Failed to process trace export request ({} bytes): {:?}",
            len,
            err
        );
    }
}
