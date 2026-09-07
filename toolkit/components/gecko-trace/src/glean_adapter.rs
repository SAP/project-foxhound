/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * This file explicitly uses Rust's structs destructuring feature to highlight what values from the
 * opentelemetry proto definitions we are using and which we are ignoring for now. The purpose of
 * this is to be aware of the current inefficiencies of the proto definition and what we might want to
 * remove / add to telemetry.
 *
 * Please note that despite the struct having unused fields it is very likely that those were not
 * sent over IPC since protobuf uses a field tag serialization schema which allows skipping over
 * empty fields. */

use crate::proto::opentelemetry::proto::collector::trace::v1::ExportTraceServiceRequest;
use crate::proto::opentelemetry::proto::common::v1::any_value::Value;
use crate::proto::opentelemetry::proto::common::v1::{AnyValue, InstrumentationScope, KeyValue};
use crate::proto::opentelemetry::proto::resource::v1::Resource;
use crate::proto::opentelemetry::proto::trace::v1::{span, ResourceSpans, ScopeSpans, Span};

mod fog_object {
    pub use firefox_on_glean::metrics::gecko_trace::{
        TracesDataObject as TracesData, TracesDataObjectItemResourceSpansItem as ResourceSpans,
        TracesDataObjectItemResourceSpansItemItemResourceObject as Resource,
        TracesDataObjectItemResourceSpansItemItemResourceObjectItemAttributesObject as ResourceAttributes,
        TracesDataObjectItemResourceSpansItemItemScopeSpansItem as ScopeSpans,
        TracesDataObjectItemResourceSpansItemItemScopeSpansItemItemScopeObject as InstrumentationScope,
        TracesDataObjectItemResourceSpansItemItemScopeSpansItemItemSpansItem as Span,
        TracesDataObjectItemResourceSpansItemItemScopeSpansItemItemSpansItemItemEventsItem as SpanEvent,
    };
}

use hex::ToHex;

include!(mozbuild::objdir_path!(
    "toolkit/components/gecko-trace/src/generated/glean_adapter.rs"
));

impl From<ExportTraceServiceRequest> for fog_object::TracesData {
    fn from(value: ExportTraceServiceRequest) -> Self {
        let ExportTraceServiceRequest { resource_spans } = value;

        Self {
            // Version identifier used by the ETL backend to determine data compatibility.
            // The backend will drop traces with unknown or outdated versions to prevent
            // parsing errors from schema changes.
            version: Some("0.1".to_owned()),
            resource_spans: resource_spans
                .into_iter()
                .map(fog_object::ResourceSpans::from)
                .collect(),
        }
    }
}

impl From<ResourceSpans> for fog_object::ResourceSpans {
    fn from(value: ResourceSpans) -> Self {
        let ResourceSpans {
            resource,
            scope_spans,
            schema_url: _,
        } = value;

        Self {
            resource: resource.map(fog_object::Resource::from),
            scope_spans: scope_spans
                .into_iter()
                .map(fog_object::ScopeSpans::from)
                .collect(),
        }
    }
}

impl From<Resource> for fog_object::Resource {
    fn from(value: Resource) -> Self {
        let Resource {
            attributes,
            dropped_attributes_count: _,
            entity_refs: _,
        } = value;

        let mut resource_obj = Self { attributes: None };

        let mut resource_attributes = fog_object::ResourceAttributes {
            gecko_process_internal_id: None,
            gecko_process_type: None,
            service_name: None,
            telemetry_sdk_language: None,
            telemetry_sdk_name: None,
            telemetry_sdk_version: None,
        };

        for KeyValue {
            key: attr_name,
            value: attr_value,
        } in attributes
        {
            match (attr_name.as_ref(), attr_value) {
                (
                    "gecko.process.internal_id",
                    Some(AnyValue {
                        value: Some(Value::IntValue(gecko_process_internal_id)),
                    }),
                ) => {
                    resource_attributes.gecko_process_internal_id = Some(gecko_process_internal_id)
                }
                (
                    "gecko.process.type",
                    Some(AnyValue {
                        value: Some(Value::StringValue(gecko_process_type)),
                    }),
                ) => resource_attributes.gecko_process_type = Some(gecko_process_type),
                (
                    "service.name",
                    Some(AnyValue {
                        value: Some(Value::StringValue(service_name)),
                    }),
                ) => resource_attributes.service_name = Some(service_name),
                (
                    "telemetry.sdk.language",
                    Some(AnyValue {
                        value: Some(Value::StringValue(telemetry_sdk_language)),
                    }),
                ) => resource_attributes.telemetry_sdk_language = Some(telemetry_sdk_language),
                (
                    "telemetry.sdk.name",
                    Some(AnyValue {
                        value: Some(Value::StringValue(telemetry_sdk_name)),
                    }),
                ) => resource_attributes.telemetry_sdk_name = Some(telemetry_sdk_name),
                (
                    "telemetry.sdk.version",
                    Some(AnyValue {
                        value: Some(Value::StringValue(telemetry_sdk_version)),
                    }),
                ) => resource_attributes.telemetry_sdk_version = Some(telemetry_sdk_version),
                (attr_name, attr_value) => {
                    log::error!(
                        "Unsupported resource attribute '{attr_name}' of type {}",
                        std::any::type_name_of_val(&attr_value),
                    );
                }
            }
        }

        resource_obj.attributes = Some(resource_attributes);
        resource_obj
    }
}

impl From<ScopeSpans> for fog_object::ScopeSpans {
    fn from(value: ScopeSpans) -> Self {
        let ScopeSpans {
            scope,
            spans,
            schema_url: _,
        } = value;

        Self {
            scope: scope.map(fog_object::InstrumentationScope::from),
            spans: spans.into_iter().map(fog_object::Span::from).collect(),
        }
    }
}

impl From<InstrumentationScope> for fog_object::InstrumentationScope {
    fn from(value: InstrumentationScope) -> Self {
        let InstrumentationScope {
            name,
            version: _,
            attributes: _,
            dropped_attributes_count: _,
        } = value;

        Self {
            name: if !name.is_empty() { Some(name) } else { None },
        }
    }
}

impl From<Span> for fog_object::Span {
    fn from(value: Span) -> Self {
        let Span {
            trace_id,
            span_id,
            trace_state: _,
            parent_span_id,
            flags: _,
            name,
            kind: _,
            start_time_unix_nano,
            end_time_unix_nano,
            attributes: _,
            dropped_attributes_count: _,
            events,
            dropped_events_count: _,
            links: _,
            dropped_links_count: _,
            status: _,
        } = value;

        Self {
            trace_id: Some(trace_id.encode_hex()),
            span_id: Some(span_id.encode_hex()),
            parent_span_id: if !parent_span_id.is_empty() {
                Some(parent_span_id.encode_hex())
            } else {
                None
            },
            start_time_unix_nano: start_time_unix_nano
                .try_into()
                .map_err(|err| {
                    log::error!(
                        "Failed to convert start_time_unix_nano ({}) for span '{}': {:?}",
                        start_time_unix_nano,
                        name,
                        err
                    );
                    err
                })
                .ok(),
            end_time_unix_nano: end_time_unix_nano
                .try_into()
                .map_err(|err| {
                    log::error!(
                        "Failed to convert end_time_unix_nano ({}) for span '{}': {:?}",
                        end_time_unix_nano,
                        name,
                        err
                    );
                    err
                })
                .ok(),
            name: Some(name),
            events: events
                .into_iter()
                .map(fog_object::SpanEvent::from)
                .collect(),
        }
    }
}

impl From<span::Event> for fog_object::SpanEvent {
    fn from(value: span::Event) -> Self {
        let span::Event {
            time_unix_nano,
            name,
            attributes,
            dropped_attributes_count: _,
        } = value;

        generated::inject_event_attributes(
            Self {
                time_unix_nano: time_unix_nano
                    .try_into()
                    .map_err(|err| {
                        log::error!(
                            "Failed to convert time_unix_nano ({}) for event '{}': {:?}",
                            time_unix_nano,
                            name,
                            err
                        );
                        err
                    })
                    .ok(),
                name: Some(name),
                attributes: None,
            },
            attributes,
        )
    }
}
