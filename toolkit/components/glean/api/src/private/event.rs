// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

use std::collections::HashMap;

use inherent::inherent;

use super::{CommonMetricData, MetricId, RecordedEvent};

use crate::ipc::{need_ipc, with_ipc_payload};

use glean::traits::Event;
pub use glean::traits::{EventRecordingError, ExtraKeys, NoExtraKeys};

#[cfg(feature = "with_gecko")]
use super::profiler_utils::{lookup_canonical_metric_name, LookupError};

#[cfg(feature = "with_gecko")]
use gecko_profiler::gecko_profiler_category;

#[cfg(feature = "with_gecko")]
#[derive(serde::Serialize, serde::Deserialize, Debug)]
struct EventMetricMarker {
    id: MetricId,
    extra: HashMap<String, String>,
}

#[cfg(feature = "with_gecko")]
impl gecko_profiler::ProfilerMarker for EventMetricMarker {
    fn marker_type_name() -> &'static str {
        "Event"
    }

    fn marker_type_display() -> gecko_profiler::MarkerSchema {
        use gecko_profiler::schema::*;
        let mut schema = MarkerSchema::new(&[Location::MarkerChart, Location::MarkerTable]);
        schema.set_tooltip_label("{marker.data.id}");
        schema.set_table_label("{marker.name} - {marker.data.id}: {marker.data.extra}");
        schema.add_key_label_format_searchable(
            "id",
            "Metric",
            Format::String,
            Searchable::Searchable,
        );
        schema.add_key_label_format("extra", "Extra", Format::String);
        schema
    }

    fn stream_json_marker_data(&self, json_writer: &mut gecko_profiler::JSONWriter) {
        json_writer.string_property(
            "id",
            lookup_canonical_metric_name(&self.id).unwrap_or_else(LookupError::as_str),
        );

        // Only write our "extra" field if it contains values.
        if !self.extra.is_empty() {
            // replace with iter intersperse once it's stabilised (see #79524)
            let kvps = format!(
                "{{{}}}",
                self.extra
                    .iter()
                    .map(|(k, v)| format!("{}: \"{}\"", k, v))
                    .collect::<Vec<_>>()
                    .join(", ")
            );
            json_writer.string_property("extra", kvps.as_str());
        }
    }
}

/// An event metric.
///
/// Events allow recording of e.g. individual occurences of user actions, say
/// every time a view was open and from where. Each time you record an event, it
/// records a timestamp, the event's name and a set of custom values.
pub enum EventMetric<K> {
    Parent {
        /// The metric's ID.
        ///
        /// **TEST-ONLY** - Do not use unless gated with `#[cfg(test)]`.
        id: MetricId,
        inner: glean::private::EventMetric<K>,
    },
    Child(EventMetricIpc),
}

#[derive(Debug)]
pub struct EventMetricIpc(MetricId);

impl<K: 'static + ExtraKeys + Send + Sync + Clone> EventMetric<K> {
    /// Create a new event metric.
    pub fn new(id: MetricId, meta: CommonMetricData) -> Self {
        if need_ipc() {
            EventMetric::Child(EventMetricIpc(id))
        } else {
            let inner = glean::private::EventMetric::new(meta);
            EventMetric::Parent { id, inner }
        }
    }

    pub fn with_runtime_extra_keys(
        id: MetricId,
        meta: CommonMetricData,
        allowed_extra_keys: Vec<String>,
    ) -> Self {
        if need_ipc() {
            EventMetric::Child(EventMetricIpc(id))
        } else {
            let inner =
                glean::private::EventMetric::with_runtime_extra_keys(meta, allowed_extra_keys);
            EventMetric::Parent { id, inner }
        }
    }

    #[cfg(test)]
    pub(crate) fn child_metric(&self) -> Self {
        match self {
            EventMetric::Parent { id, .. } => EventMetric::Child(EventMetricIpc(*id)),
            EventMetric::Child(_) => panic!("Can't get a child metric from a child metric"),
        }
    }

    /// Record a new event with the raw `extra key ID -> String` map.
    ///
    /// Should only be used when taking in data over FFI, where extra keys only exists as IDs.
    pub(crate) fn record_raw(&self, extra: HashMap<String, String>) {
        let now = glean::get_timestamp_ms();
        self.record_with_time(now, extra);
    }

    /// Record a new event with the given timestamp and the raw `extra key ID -> String` map.
    ///
    /// Should only be used when applying previously recorded events, e.g. from IPC.
    pub(crate) fn record_with_time(&self, timestamp: u64, extra: HashMap<String, String>) {
        match self {
            #[allow(unused)]
            EventMetric::Parent { id, inner } => {
                #[cfg(feature = "with_gecko")]
                gecko_profiler::add_marker(
                    "Event::record",
                    gecko_profiler_category!(Telemetry),
                    Default::default(),
                    EventMetricMarker {
                        id: *id,
                        extra: extra.clone(),
                    },
                );
                inner.record_with_time(timestamp, extra);
            }
            EventMetric::Child(c) => {
                #[cfg(feature = "with_gecko")]
                gecko_profiler::add_marker(
                    "Event::record",
                    gecko_profiler_category!(Telemetry),
                    Default::default(),
                    EventMetricMarker {
                        id: c.0,
                        extra: extra.clone(),
                    },
                );
                with_ipc_payload(move |payload| {
                    if let Some(v) = payload.events.get_mut(&c.0) {
                        v.push((timestamp, extra));
                    } else {
                        let v = vec![(timestamp, extra)];
                        payload.events.insert(c.0, v);
                    }
                });
            }
        }
    }
}

#[inherent]
impl<K: 'static + ExtraKeys + Send + Sync + Clone> Event for EventMetric<K> {
    type Extra = K;

    pub fn record<M: Into<Option<K>>>(&self, extra: M) {
        let now = glean::get_timestamp_ms();
        match self {
            #[allow(unused)]
            EventMetric::Parent { id, inner } => {
                let extra = extra.into();
                #[cfg(feature = "with_gecko")]
                if gecko_profiler::can_accept_markers() {
                    gecko_profiler::add_marker(
                        "Event::record",
                        gecko_profiler_category!(Telemetry),
                        Default::default(),
                        EventMetricMarker {
                            id: *id,
                            extra: extra
                                .clone()
                                .map_or(HashMap::new(), |extra| extra.into_ffi_extra()),
                        },
                    );
                }
                inner.record(extra);
            }
            EventMetric::Child(_) => {
                // No need to add a marker here, as we dispatch to `record_with_time` above.
                let extra = extra.into().map(|extra| extra.into_ffi_extra());
                let extra = extra.unwrap_or_else(HashMap::new);
                self.record_with_time(now, extra);
            }
        }
    }

    pub fn test_get_value<'a, S: Into<Option<&'a str>>>(
        &self,
        ping_name: S,
    ) -> Option<Vec<RecordedEvent>> {
        match self {
            EventMetric::Parent { inner, .. } => inner.test_get_value(ping_name),
            EventMetric::Child(_) => {
                panic!("Cannot get test value for event metric in non-main process!",)
            }
        }
    }

    pub fn test_get_num_recorded_errors(&self, error: glean::ErrorType) -> i32 {
        match self {
            EventMetric::Parent { inner, .. } => inner.test_get_num_recorded_errors(error),
            EventMetric::Child(c) => panic!(
                "Cannot get the number of recorded errors for {:?} in non-main process!",
                c.0
            ),
        }
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::{common_test::*, ipc, metrics};

    #[test]
    fn smoke_test_event() {
        let _lock = lock_test();

        let metric = EventMetric::<NoExtraKeys>::new(
            0.into(),
            CommonMetricData {
                name: "event_metric".into(),
                category: "telemetry".into(),
                send_in_pings: vec!["store1".into()],
                disabled: false,
                ..Default::default()
            },
        );

        // No extra keys
        metric.record(None);

        let recorded = metric.test_get_value("store1").unwrap();

        assert!(recorded.iter().any(|e| e.name == "event_metric"));
    }

    #[test]
    fn event_ipc() {
        use metrics::test_only_ipc::AnEventExtra;

        let _lock = lock_test();

        let parent_metric = &metrics::test_only_ipc::an_event;

        // No extra keys
        parent_metric.record(None);

        {
            let child_metric = parent_metric.child_metric();

            // scope for need_ipc RAII.
            let _raii = ipc::test_set_need_ipc(true);

            child_metric.record(None);

            let extra = AnEventExtra {
                extra1: Some("a-child-value".into()),
                ..Default::default()
            };
            child_metric.record(extra);
        }

        // Record in the parent after the child.
        let extra = AnEventExtra {
            extra1: Some("a-valid-value".into()),
            ..Default::default()
        };
        parent_metric.record(extra);

        assert!(ipc::replay_from_buf(&ipc::take_buf().unwrap()).is_ok());

        let events = parent_metric.test_get_value("store1").unwrap();
        assert_eq!(events.len(), 4);

        // Events from the child process are last, they might get sorted later by Glean.
        assert_eq!(events[0].extra, None);
        assert!(events[1].extra.as_ref().unwrap().get("extra1").unwrap() == "a-valid-value");
        assert_eq!(events[2].extra, None);
        assert!(events[3].extra.as_ref().unwrap().get("extra1").unwrap() == "a-child-value");
    }

    #[test]
    fn events_with_typed_extras() {
        use metrics::test_only_ipc::EventWithExtraExtra;
        let _lock = lock_test();

        let event = &metrics::test_only_ipc::event_with_extra;
        // Record in the parent after the child.
        let extra = EventWithExtraExtra {
            extra1: Some("a-valid-value".into()),
            extra2: Some(37),
            extra3_longer_name: Some(false),
            extra4CamelCase: Some(true),
        };
        event.record(extra);

        let recorded = event.test_get_value("store1").unwrap();

        assert_eq!(recorded.len(), 1);
        assert!(recorded[0].extra.as_ref().unwrap().get("extra1").unwrap() == "a-valid-value");
        assert!(recorded[0].extra.as_ref().unwrap().get("extra2").unwrap() == "37");
        assert!(
            recorded[0]
                .extra
                .as_ref()
                .unwrap()
                .get("extra3_longer_name")
                .unwrap()
                == "false"
        );
        assert_eq!(
            "true",
            recorded[0]
                .extra
                .as_ref()
                .unwrap()
                .get("extra4CamelCase")
                .unwrap()
        );
    }
}
