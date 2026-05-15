/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

use crate::proto::opentelemetry::proto::collector::trace::v1::ExportTraceServiceRequest;

use nserror::nsresult;
use xpcom::interfaces::{nsIObserverService, nsISupports};
use xpcom::{xpcom, RefPtr};

use std::ffi::{c_char, CStr};
use std::sync::Mutex;

use prost::Message;

#[xpcom(implement(nsIObserver), atomic)]
pub struct TraceCollector {
    config: TraceCollectorConfig,
    state: Mutex<CollectorState>,
}

impl TraceCollector {
    pub fn new(config: TraceCollectorConfig) -> RefPtr<Self> {
        let new_collector = Self::allocate(InitTraceCollector {
            config,
            state: Mutex::new(CollectorState {
                collected_traces: CollectedTraces::new(),
                shutdown: false,
            }),
        });

        let collector = RefPtr::clone(&new_collector);
        let add_observer = move || {
            if let Some(observer_service) =
                xpcom::get_service::<nsIObserverService>(c"@mozilla.org/observer-service;1")
            {
                unsafe {
                    observer_service.AddObserver(
                        collector.coerce(),
                        c"xpcom-will-shutdown".as_ptr(),
                        false,
                    )
                };
            }
        };

        if !moz_task::is_main_thread() {
            if let Ok(main_thread) = moz_task::get_main_thread() {
                let _ = moz_task::dispatch_onto(
                    "gecko_trace::collector::TraceCollector::new::add_observer",
                    main_thread.coerce(),
                    add_observer,
                );
            }
        } else {
            add_observer();
        };

        new_collector
    }

    pub fn process_export_request(&self, protobuf_encoded_req: &[u8]) -> anyhow::Result<()> {
        let mut state_lock = self.state.lock().expect("TraceCollector should not panic!");

        if state_lock.shutdown {
            anyhow::bail!("collector already shutdown")
        }

        let req = ExportTraceServiceRequest::decode(protobuf_encoded_req)?;

        state_lock
            .collected_traces
            .traces
            .resource_spans
            .extend(req.resource_spans);
        state_lock.collected_traces.bytes_ingested += protobuf_encoded_req.len();

        if state_lock.collected_traces.bytes_ingested > self.config.immediate_report_threshold {
            let traces = state_lock.collected_traces.take();
            drop(state_lock);
            report_in_glean(traces, "buffer_full");
        }

        Ok(())
    }

    pub fn shutdown(&self, report: bool) {
        let mut state_lock = self.state.lock().expect("TraceCollector should not panic!");

        if state_lock.shutdown {
            return;
        }

        if let Some(idle_service) =
            xpcom::get_service::<nsIObserverService>(c"@mozilla.org/observer-service;1")
        {
            unsafe {
                idle_service.RemoveObserver(self.coerce(), c"xpcom-will-shutdown".as_ptr());
            }
        }

        if report {
            let traces = state_lock.collected_traces.take();
            report_in_glean(traces, "shutdown");
        }

        state_lock.shutdown = true;
    }

    #[allow(non_snake_case, unused)]
    fn Observe(
        &self,
        _subject: *const nsISupports,
        raw_topic: *const c_char,
        _data: *const u16,
    ) -> nsresult {
        let topic = unsafe { CStr::from_ptr(raw_topic) };

        match topic.to_str() {
            Ok("xpcom-will-shutdown") => {
                self.shutdown(/* report */ true);
            }
            _ => {}
        }

        nserror::NS_OK
    }
}

impl Drop for TraceCollector {
    fn drop(&mut self) {
        // We don't need to wait for the lock here
        if self
            .state
            .get_mut()
            .expect("TraceCollector should not panic!")
            .shutdown
        {
            return;
        }

        self.shutdown(false)
    }
}

fn report_in_glean(traces: ExportTraceServiceRequest, reason: &str) {
    firefox_on_glean::metrics::gecko_trace::traces_data.set(traces.into());
    firefox_on_glean::pings::gecko_trace.submit(Some(reason));
}

pub struct TraceCollectorConfig {
    pub immediate_report_threshold: usize,
}

impl Default for TraceCollectorConfig {
    fn default() -> Self {
        TraceCollectorConfig {
            immediate_report_threshold: 524_288, // 500 kilobyte
        }
    }
}

struct CollectorState {
    collected_traces: CollectedTraces,
    shutdown: bool,
}

pub struct CollectedTraces {
    pub traces: ExportTraceServiceRequest,
    pub bytes_ingested: usize,
}

impl CollectedTraces {
    fn new() -> Self {
        Self {
            traces: ExportTraceServiceRequest {
                resource_spans: vec![],
            },
            bytes_ingested: 0,
        }
    }

    fn take(&mut self) -> ExportTraceServiceRequest {
        std::mem::replace(self, CollectedTraces::new()).traces
    }
}
