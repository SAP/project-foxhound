/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

//! Glean metrics for the Happy Eyeballs algorithm.

use firefox_on_glean::metrics::netwerk as glean;
use std::collections::HashMap;
use std::time::{Duration, Instant};

struct DnsInfo {
    start: Instant,
    record_type: happy_eyeballs::DnsRecordType,
}

struct ConnInfo {
    index: u32,
}

enum Outcome {
    Succeeded { info: ConnInfo, elapsed: Duration },
    Failed { elapsed: Duration },
}

pub(crate) struct Metrics {
    start: Instant,
    first_attempt_dispatched: bool,
    dns_infos: HashMap<happy_eyeballs::Id, DnsInfo>,
    conn_infos: HashMap<happy_eyeballs::Id, ConnInfo>,
    attempt_count: u32,
    cancelled_count: u32,
    alt_svc_h3: bool,
    https_record_received: bool,
    https_rr_h3: bool,
    https_rr_ech: bool,
    https_rr_ipv4hint: bool,
    https_rr_ipv6hint: bool,
    outcome: Option<Outcome>,
}

impl Metrics {
    pub(crate) fn new(alt_svc: &[happy_eyeballs::AltSvc]) -> Self {
        let alt_svc_h3 = alt_svc
            .iter()
            .any(|a| matches!(a.http_version, happy_eyeballs::HttpVersion::H3));
        Self {
            start: Instant::now(),
            first_attempt_dispatched: false,
            dns_infos: HashMap::new(),
            conn_infos: HashMap::new(),
            attempt_count: 0,
            cancelled_count: 0,
            alt_svc_h3,
            https_record_received: false,
            https_rr_h3: false,
            https_rr_ech: false,
            https_rr_ipv4hint: false,
            https_rr_ipv6hint: false,
            outcome: None,
        }
    }

    pub(crate) fn dns_query_started(
        &mut self,
        id: happy_eyeballs::Id,
        record_type: happy_eyeballs::DnsRecordType,
    ) {
        self.dns_infos.insert(
            id,
            DnsInfo {
                start: Instant::now(),
                record_type,
            },
        );
    }

    pub(crate) fn dns_response(&mut self, id: happy_eyeballs::Id) {
        let Some(info) = self.dns_infos.remove(&id) else {
            return;
        };
        let elapsed_ms = info.start.elapsed().as_millis() as i64;
        let label = dns_record_type_label(info.record_type);
        glean::happy_eyeballs_dns_resolution_time
            .get(label)
            .accumulate_single_sample_signed(elapsed_ms);
    }

    pub(crate) fn dns_response_https(
        &mut self,
        id: happy_eyeballs::Id,
        infos: &[happy_eyeballs::ServiceInfo],
    ) {
        self.https_record_received |= !infos.is_empty();
        self.https_rr_h3 |= infos.iter().any(|i| {
            i.alpn_http_versions
                .contains(&happy_eyeballs::HttpVersion::H3)
        });
        self.https_rr_ech |= infos
            .iter()
            .any(|i| i.ech_config.as_ref().is_some_and(|e| !e.as_ref().is_empty()));
        self.https_rr_ipv4hint |= infos.iter().any(|i| !i.ipv4_hints.is_empty());
        self.https_rr_ipv6hint |= infos.iter().any(|i| !i.ipv6_hints.is_empty());
        self.dns_response(id);
    }

    pub(crate) fn connection_attempt_started(&mut self, id: happy_eyeballs::Id) {
        self.attempt_count += 1;

        if !self.first_attempt_dispatched {
            self.first_attempt_dispatched = true;
            let elapsed_ms = self.start.elapsed().as_millis() as i64;
            glean::happy_eyeballs_time_to_first_attempt.accumulate_single_sample_signed(elapsed_ms);
        }

        self.conn_infos.insert(
            id,
            ConnInfo {
                index: self.attempt_count,
            },
        );
    }

    pub(crate) fn connection_cancelled(&mut self, id: happy_eyeballs::Id) {
        if self.conn_infos.remove(&id).is_some() {
            self.cancelled_count += 1;
        }
    }

    pub(crate) fn connection_succeeded(&mut self, id: happy_eyeballs::Id) {
        if let Some(info) = self.conn_infos.remove(&id) {
            self.outcome = Some(Outcome::Succeeded {
                info,
                elapsed: self.start.elapsed(),
            });
        }
    }

    pub(crate) fn failed(&mut self) {
        self.outcome = Some(Outcome::Failed {
            elapsed: self.start.elapsed(),
        });
    }
}

impl Drop for Metrics {
    fn drop(&mut self) {
        let Some(ref outcome) = self.outcome else {
            return;
        };

        let outcome_label = match outcome {
            Outcome::Succeeded { .. } => "succeeded",
            Outcome::Failed { .. } => "failed",
        };

        let elapsed = match outcome {
            Outcome::Succeeded { elapsed, .. } | Outcome::Failed { elapsed } => *elapsed,
        };
        let elapsed_ms = elapsed.as_millis() as i64;
        glean::happy_eyeballs_connection_establishment_time
            .get(outcome_label)
            .accumulate_single_sample_signed(elapsed_ms);

        glean::happy_eyeballs_connection_attempt_count
            .get(outcome_label)
            .accumulate_single_sample_signed(self.attempt_count.into());

        glean::happy_eyeballs_cancelled_attempt_count
            .accumulate_single_sample_signed(self.cancelled_count.into());

        if let Outcome::Succeeded { info, .. } = outcome {
            glean::happy_eyeballs_winning_attempt_index
                .accumulate_single_sample_signed(info.index.into());
        }

        let h3_discovery_label = match (self.alt_svc_h3, self.https_rr_h3) {
            (false, false) => "none",
            (true, false) => "altsvc_only",
            (false, true) => "https_rr_only",
            (true, true) => "both",
        };
        glean::happy_eyeballs_h3_discovery
            .get(h3_discovery_label)
            .add(1);

        if self.https_record_received {
            glean::happy_eyeballs_https_rr_features.get("total").add(1);
            if self.https_rr_h3 {
                glean::happy_eyeballs_https_rr_features
                    .get("h3_alpn")
                    .add(1);
            }
            if self.https_rr_ech {
                glean::happy_eyeballs_https_rr_features.get("ech").add(1);
            }
            if self.https_rr_ipv4hint {
                glean::happy_eyeballs_https_rr_features
                    .get("ipv4hint")
                    .add(1);
            }
            if self.https_rr_ipv6hint {
                glean::happy_eyeballs_https_rr_features
                    .get("ipv6hint")
                    .add(1);
            }
        }
    }
}

fn dns_record_type_label(rt: happy_eyeballs::DnsRecordType) -> &'static str {
    match rt {
        happy_eyeballs::DnsRecordType::A => "a",
        happy_eyeballs::DnsRecordType::Aaaa => "aaaa",
        happy_eyeballs::DnsRecordType::Https => "https",
    }
}
