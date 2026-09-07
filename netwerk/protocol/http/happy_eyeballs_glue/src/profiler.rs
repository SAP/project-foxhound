/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

//! Firefox Profiler integration for the Happy Eyeballs algorithm.

use gecko_profiler::schema::{Format, Location};
use gecko_profiler::{
    gecko_profiler_category, FlowId, MarkerOptions, MarkerSchema, MarkerTiming, ProfilerMarker,
    ProfilerTime,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fmt::Write;

const MARKER_NAME: &str = "Happy Eyeballs";

#[derive(Serialize, Deserialize, Debug, Clone, Copy)]
enum Outcome {
    Success,
    Failure,
    Cancelled,
}

impl Outcome {
    fn as_str(self) -> &'static str {
        match self {
            Outcome::Success => "success",
            Outcome::Failure => "failure",
            Outcome::Cancelled => "cancelled",
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, Copy)]
enum IpVersion {
    V4,
    V6,
}

impl IpVersion {
    fn as_str(self) -> &'static str {
        match self {
            IpVersion::V4 => "v4",
            IpVersion::V6 => "v6",
        }
    }
}

impl From<std::net::SocketAddr> for IpVersion {
    fn from(addr: std::net::SocketAddr) -> Self {
        match addr {
            std::net::SocketAddr::V4(_) => IpVersion::V4,
            std::net::SocketAddr::V6(_) => IpVersion::V6,
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
struct DnsMarker {
    flow: FlowId,
    origin: String,
    record_type: String,
    outcome: Outcome,
    response: String,
}

impl ProfilerMarker for DnsMarker {
    fn marker_type_name() -> &'static str {
        "HappyEyeballsDnsMarker"
    }

    fn marker_type_display() -> MarkerSchema {
        let mut schema = MarkerSchema::new(&[Location::MarkerChart, Location::MarkerTable]);
        schema.set_all_labels("DNS {marker.data.record_type} {marker.data.outcome}");
        schema.add_key_label_format("origin", "Origin", Format::SanitizedString);
        schema.add_key_label_format("record_type", "Record Type", Format::UniqueString);
        schema.add_key_label_format("outcome", "Outcome", Format::UniqueString);
        schema.add_key_label_format("response", "Response", Format::SanitizedString);
        schema.add_key_label_format("flow", "Flow", Format::Flow);
        schema
    }

    fn stream_json_marker_data(&self, json_writer: &mut gecko_profiler::JSONWriter) {
        json_writer.string_property("origin", &self.origin);
        json_writer.unique_string_property("record_type", &self.record_type);
        json_writer.unique_string_property("outcome", self.outcome.as_str());
        json_writer.string_property("response", &self.response);
        json_writer.unique_string_property("flow", unsafe {
            std::str::from_utf8_unchecked(&self.flow.to_hex())
        });
    }
}

#[derive(Serialize, Deserialize, Debug)]
struct ConnectionMarker {
    flow: FlowId,
    origin: String,
    outcome: Outcome,
    http_version: String,
    ip_version: IpVersion,
    has_ech: bool,
    address: String,
}

impl ProfilerMarker for ConnectionMarker {
    fn marker_type_name() -> &'static str {
        "HappyEyeballsConnectionMarker"
    }

    fn marker_type_display() -> MarkerSchema {
        let mut schema = MarkerSchema::new(&[Location::MarkerChart, Location::MarkerTable]);
        schema.set_all_labels("{marker.data.http_version} {marker.data.ip_version} ECH={marker.data.has_ech} {marker.data.outcome}");
        schema.add_key_label_format("origin", "Origin", Format::SanitizedString);
        schema.add_key_label_format("outcome", "Outcome", Format::UniqueString);
        schema.add_key_label_format("http_version", "HTTP Version", Format::UniqueString);
        schema.add_key_label_format("ip_version", "IP Version", Format::UniqueString);
        schema.add_key_label_format("address", "Address", Format::SanitizedString);
        schema.add_key_label_format("has_ech", "ECH", Format::String);
        schema.add_key_label_format("flow", "Flow", Format::Flow);
        schema
    }

    fn stream_json_marker_data(&self, json_writer: &mut gecko_profiler::JSONWriter) {
        json_writer.string_property("origin", &self.origin);
        json_writer.unique_string_property("outcome", self.outcome.as_str());
        json_writer.unique_string_property("http_version", &self.http_version);
        json_writer.unique_string_property("ip_version", self.ip_version.as_str());
        json_writer.string_property("address", &self.address);
        json_writer.bool_property("has_ech", self.has_ech);
        json_writer.unique_string_property("flow", unsafe {
            std::str::from_utf8_unchecked(&self.flow.to_hex())
        });
    }
}

#[derive(Serialize, Deserialize, Debug)]
struct LifetimeMarker {
    flow: FlowId,
    origin: String,
    ip_preference: String,
    alt_svc: String,
    http_versions: String,
    ech_enabled: bool,
}

impl ProfilerMarker for LifetimeMarker {
    fn marker_type_name() -> &'static str {
        "HappyEyeballsLifetimeMarker"
    }

    fn marker_type_display() -> MarkerSchema {
        let mut schema = MarkerSchema::new(&[Location::MarkerChart, Location::MarkerTable]);
        schema.set_all_labels("Happy Eyeballs: {marker.data.origin}");
        schema.add_key_label_format("origin", "Origin", Format::SanitizedString);
        schema.add_key_label_format("ip_preference", "IP Preference", Format::UniqueString);
        schema.add_key_label_format("alt_svc", "Alt-Svc", Format::UniqueString);
        schema.add_key_label_format("http_versions", "HTTP Versions", Format::UniqueString);
        schema.add_key_label_format("ech_enabled", "ECH Enabled", Format::String);
        schema.add_key_label_format("flow", "Flow", Format::Flow);
        schema
    }

    fn stream_json_marker_data(&self, json_writer: &mut gecko_profiler::JSONWriter) {
        json_writer.string_property("origin", &self.origin);
        json_writer.unique_string_property("ip_preference", &self.ip_preference);
        json_writer.unique_string_property("alt_svc", &self.alt_svc);
        json_writer.unique_string_property("http_versions", &self.http_versions);
        json_writer.bool_property("ech_enabled", self.ech_enabled);
        json_writer.unique_string_property("flow", unsafe {
            std::str::from_utf8_unchecked(&self.flow.to_hex())
        });
    }
}

struct DnsInfo {
    start: ProfilerTime,
    record_type: happy_eyeballs::DnsRecordType,
}

struct ConnInfo {
    start: ProfilerTime,
    http_version: happy_eyeballs::ConnectionAttemptHttpVersions,
    ip_version: IpVersion,
    has_ech: bool,
    address: String,
}

pub(crate) struct Profiler {
    flow_id: FlowId,
    origin: String,
    start: Option<ProfilerTime>,
    ip_preference: String,
    alt_svc: String,
    http_versions: String,
    ech_enabled: bool,
    dns_infos: HashMap<happy_eyeballs::Id, DnsInfo>,
    conn_infos: HashMap<happy_eyeballs::Id, ConnInfo>,
}

impl Profiler {
    pub(crate) fn new(
        flow_id: FlowId,
        origin: &str,
        network_config: &happy_eyeballs::NetworkConfig,
    ) -> Self {
        if !gecko_profiler::is_active() {
            return Self {
                flow_id,
                origin: String::new(),
                start: None,
                ip_preference: String::new(),
                alt_svc: String::new(),
                http_versions: String::new(),
                ech_enabled: false,
                dns_infos: HashMap::new(),
                conn_infos: HashMap::new(),
            };
        }

        let ip_preference = format!("{:?}", network_config.ip);

        let alt_svc = if network_config.alt_svc.is_empty() {
            String::new()
        } else {
            let mut s = String::new();
            for (i, a) in network_config.alt_svc.iter().enumerate() {
                if i > 0 {
                    s.push_str(", ");
                }
                let _ = write!(s, "{:?}", a.http_version);
                if let Some(ref host) = a.host {
                    let _ = write!(s, " {}", host);
                }
                if let Some(port) = a.port {
                    let _ = write!(s, ":{}", port);
                }
            }
            s
        };

        let mut http_versions = String::new();
        if network_config.http_versions.h1 {
            http_versions.push_str("H1");
        }
        if network_config.http_versions.h2 {
            if !http_versions.is_empty() {
                http_versions.push_str(", ");
            }
            http_versions.push_str("H2");
        }
        if network_config.http_versions.h3 {
            if !http_versions.is_empty() {
                http_versions.push_str(", ");
            }
            http_versions.push_str("H3");
        }

        Self {
            flow_id,
            origin: origin.to_string(),
            start: Some(ProfilerTime::now()),
            ip_preference,
            alt_svc,
            http_versions,
            ech_enabled: network_config.ech,
            dns_infos: HashMap::new(),
            conn_infos: HashMap::new(),
        }
    }

    pub(crate) fn set_flow_id(&mut self, flow_id: FlowId) {
        self.flow_id = flow_id;
    }

    pub(crate) fn dns_query_started(
        &mut self,
        id: happy_eyeballs::Id,
        record_type: happy_eyeballs::DnsRecordType,
    ) {
        if !gecko_profiler::is_active() {
            return;
        }
        self.dns_infos.insert(
            id,
            DnsInfo {
                start: ProfilerTime::now(),
                record_type,
            },
        );
    }

    pub(crate) fn dns_response(
        &mut self,
        id: happy_eyeballs::Id,
        addrs: &[impl std::fmt::Display],
    ) {
        let Some(info) = self.dns_infos.remove(&id) else {
            return;
        };
        let response: Vec<_> = addrs.iter().map(|a| a.to_string()).collect();
        gecko_profiler::add_marker(
            MARKER_NAME,
            gecko_profiler_category!(Network),
            MarkerOptions {
                timing: MarkerTiming::interval_until_now_from(info.start),
                ..Default::default()
            },
            DnsMarker {
                flow: self.flow_id,
                origin: self.origin.clone(),
                record_type: format!("{:?}", info.record_type),
                outcome: Outcome::Success,
                response: response.join(", "),
            },
        );
    }

    pub(crate) fn dns_response_https(
        &mut self,
        id: happy_eyeballs::Id,
        infos: &[happy_eyeballs::ServiceInfo],
    ) {
        let Some(dns_info) = self.dns_infos.remove(&id) else {
            return;
        };
        let response: Vec<_> = infos
            .iter()
            .map(|si| {
                let mut s = format!("priority={} target={:?}", si.priority, si.target_name);
                if !si.alpn_http_versions.is_empty() {
                    let mut alpn: Vec<_> = si
                        .alpn_http_versions
                        .iter()
                        .map(|v| format!("{v:?}"))
                        .collect();
                    alpn.sort();
                    let _ = write!(s, " alpn=[{}]", alpn.join(","));
                }
                if si.ech_config.is_some() {
                    s.push_str(" ech=yes");
                }
                if let Some(port) = si.port {
                    let _ = write!(s, " port={}", port);
                }
                if !si.ipv4_hints.is_empty() {
                    let ips: Vec<_> = si.ipv4_hints.iter().map(|ip| ip.to_string()).collect();
                    let _ = write!(s, " ipv4hints=[{}]", ips.join(","));
                }
                if !si.ipv6_hints.is_empty() {
                    let ips: Vec<_> = si.ipv6_hints.iter().map(|ip| ip.to_string()).collect();
                    let _ = write!(s, " ipv6hints=[{}]", ips.join(","));
                }
                s
            })
            .collect();
        gecko_profiler::add_marker(
            MARKER_NAME,
            gecko_profiler_category!(Network),
            MarkerOptions {
                timing: MarkerTiming::interval_until_now_from(dns_info.start),
                ..Default::default()
            },
            DnsMarker {
                flow: self.flow_id,
                origin: self.origin.clone(),
                record_type: format!("{:?}", dns_info.record_type),
                outcome: Outcome::Success,
                response: response.join("; "),
            },
        );
    }

    pub(crate) fn connection_attempt_started(
        &mut self,
        id: happy_eyeballs::Id,
        endpoint: &happy_eyeballs::Endpoint,
    ) {
        if !gecko_profiler::is_active() {
            return;
        }
        self.conn_infos.insert(
            id,
            ConnInfo {
                start: ProfilerTime::now(),
                http_version: endpoint.http_version,
                ip_version: endpoint.address.into(),
                has_ech: endpoint.ech_config.is_some(),
                address: endpoint.address.to_string(),
            },
        );
    }

    pub(crate) fn connection_cancelled(&mut self, id: happy_eyeballs::Id) {
        self.emit_connection_marker(id, Outcome::Cancelled);
    }

    pub(crate) fn connection_result(&mut self, id: happy_eyeballs::Id, succeeded: bool) {
        let outcome = if succeeded {
            Outcome::Success
        } else {
            Outcome::Failure
        };
        self.emit_connection_marker(id, outcome);
    }

    fn emit_connection_marker(&mut self, id: happy_eyeballs::Id, outcome: Outcome) {
        let Some(info) = self.conn_infos.remove(&id) else {
            return;
        };
        gecko_profiler::add_marker(
            MARKER_NAME,
            gecko_profiler_category!(Network),
            MarkerOptions {
                timing: MarkerTiming::interval_until_now_from(info.start),
                ..Default::default()
            },
            ConnectionMarker {
                flow: self.flow_id,
                origin: self.origin.clone(),
                outcome,
                http_version: format!("{:?}", info.http_version),
                ip_version: info.ip_version,
                has_ech: info.has_ech,
                address: info.address,
            },
        );
    }
}

impl Drop for Profiler {
    fn drop(&mut self) {
        let Some(start) = self.start.take() else {
            return;
        };

        for (_id, info) in self.dns_infos.drain() {
            gecko_profiler::add_marker(
                MARKER_NAME,
                gecko_profiler_category!(Network),
                MarkerOptions {
                    timing: MarkerTiming::interval_until_now_from(info.start),
                    ..Default::default()
                },
                DnsMarker {
                    flow: self.flow_id,
                    origin: self.origin.clone(),
                    record_type: format!("{:?}", info.record_type),
                    outcome: Outcome::Cancelled,
                    response: String::new(),
                },
            );
        }

        for (_id, info) in self.conn_infos.drain() {
            gecko_profiler::add_marker(
                MARKER_NAME,
                gecko_profiler_category!(Network),
                MarkerOptions {
                    timing: MarkerTiming::interval_until_now_from(info.start),
                    ..Default::default()
                },
                ConnectionMarker {
                    flow: self.flow_id,
                    origin: self.origin.clone(),
                    outcome: Outcome::Cancelled,
                    http_version: format!("{:?}", info.http_version),
                    ip_version: info.ip_version,
                    has_ech: info.has_ech,
                    address: info.address,
                },
            );
        }

        gecko_profiler::add_marker(
            MARKER_NAME,
            gecko_profiler_category!(Network),
            MarkerOptions {
                timing: MarkerTiming::interval_until_now_from(start),
                ..Default::default()
            },
            LifetimeMarker {
                flow: self.flow_id,
                origin: std::mem::take(&mut self.origin),
                ip_preference: std::mem::take(&mut self.ip_preference),
                alt_svc: std::mem::take(&mut self.alt_svc),
                http_versions: std::mem::take(&mut self.http_versions),
                ech_enabled: self.ech_enabled,
            },
        );
    }
}
