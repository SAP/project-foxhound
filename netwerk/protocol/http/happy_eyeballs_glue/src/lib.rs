/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

//! FFI glue layer between happy-eyeballs Rust crate and Firefox's C++ networking stack.

mod metrics;
mod profiler;

use nserror::{nsresult, NS_ERROR_INVALID_ARG, NS_ERROR_UNEXPECTED, NS_OK};
use nsstring::{nsACString, nsCString};
use std::net::{Ipv4Addr, Ipv6Addr};
use std::ptr;
use std::time::{Duration, Instant};
use thin_vec::ThinVec;
use xpcom::{AtomicRefcnt, RefCounted};

#[cfg(not(windows))]
use libc::{AF_INET, AF_INET6};
#[cfg(windows)]
use winapi::shared::ws2def::{AF_INET, AF_INET6};

#[repr(C)]
pub enum IpPreference {
    DualStackPreferV6 = 0,
    DualStackPreferV4 = 1,
    Ipv6Only = 2,
    Ipv4Only = 3,
}

impl From<IpPreference> for happy_eyeballs::IpPreference {
    fn from(v: IpPreference) -> Self {
        match v {
            IpPreference::DualStackPreferV6 => Self::DualStackPreferV6,
            IpPreference::DualStackPreferV4 => Self::DualStackPreferV4,
            IpPreference::Ipv6Only => Self::Ipv6Only,
            IpPreference::Ipv4Only => Self::Ipv4Only,
        }
    }
}

/// Which HTTP versions Firefox is willing to use, derived from prefs such as
/// `network.http.http2.enabled` and `network.http.http3.enable`. Mirrors
/// `happy_eyeballs::HttpVersions` across the FFI boundary.
#[repr(C)]
#[derive(Clone, Copy)]
pub struct HttpVersions {
    pub h1: bool,
    pub h2: bool,
    pub h3: bool,
}

impl From<HttpVersions> for happy_eyeballs::HttpVersions {
    fn from(v: HttpVersions) -> Self {
        happy_eyeballs::HttpVersions {
            h1: v.h1,
            h2: v.h2,
            h3: v.h3,
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn happy_eyeballs_create(
    result: &mut *const HappyEyeballs,
    origin: *const nsACString,
    port: u16,
    alt_svc: *const ThinVec<AltSvc>,
    ip_preference: IpPreference,
    http_versions: HttpVersions,
    resolution_delay_ms: u32,
    connection_attempt_delay_ms: u32,
) -> nsresult {
    *result = ptr::null_mut();

    let Some(origin) = (unsafe { origin.as_ref() }) else {
        debug_assert!(false, "unexpected null origin pointer");
        return NS_ERROR_INVALID_ARG;
    };

    let Some(alt_svc) = (unsafe { alt_svc.as_ref() }) else {
        debug_assert!(false, "unexpected null alt_svc pointer");
        return NS_ERROR_INVALID_ARG;
    };

    let origin_str = origin.to_utf8().to_string();

    let alt_svc_vec: Vec<_> = alt_svc
        .iter()
        .map(|a| happy_eyeballs::AltSvc {
            host: None,
            port: if a.port != 0 { Some(a.port) } else { None },
            http_version: a.http_version.into(),
        })
        .collect();

    let metrics = metrics::Metrics::new(&alt_svc_vec);

    let network_config = happy_eyeballs::NetworkConfig {
        alt_svc: alt_svc_vec,
        ip: ip_preference.into(),
        http_versions: http_versions.into(),
        resolution_delay: Duration::from_millis(resolution_delay_ms as u64),
        connection_attempt_delay: Duration::from_millis(connection_attempt_delay_ms as u64),
        ..Default::default()
    };

    let profiler = profiler::Profiler::new(0u64.into(), &origin_str, &network_config);

    let raw_ptr = match happy_eyeballs::HappyEyeballs::new_with_network_config(
        origin_str.as_str(),
        port,
        network_config,
    ) {
        Ok(he) => {
            let mut boxed = Box::new(HappyEyeballs {
                refcnt: unsafe { AtomicRefcnt::new() },
                inner: he,
                profiler,
                metrics,
            });
            boxed
                .profiler
                .set_flow_id(std::ptr::from_ref(&boxed.refcnt).into());
            Box::into_raw(boxed)
        }
        Err(_) => return NS_ERROR_UNEXPECTED,
    };

    unsafe { happy_eyeballs_addref(raw_ptr as *const _) };
    *result = raw_ptr;
    NS_OK
}

#[no_mangle]
pub unsafe extern "C" fn happy_eyeballs_process_dns_response_a(
    he: *mut HappyEyeballs,
    id: u64,
    addrs: *const ThinVec<NetAddr>,
) -> nsresult {
    let Some(he) = (unsafe { he.as_mut() }) else {
        debug_assert!(false, "unexpected null he pointer");
        return NS_ERROR_INVALID_ARG;
    };

    let Some(addrs) = (unsafe { addrs.as_ref() }) else {
        debug_assert!(false, "unexpected null addrs pointer");
        return NS_ERROR_INVALID_ARG;
    };

    he.process_dns_response_a(id, addrs)
}

#[no_mangle]
pub unsafe extern "C" fn happy_eyeballs_process_dns_response_aaaa(
    he: *mut HappyEyeballs,
    id: u64,
    addrs: *const ThinVec<NetAddr>,
) -> nsresult {
    let Some(he) = (unsafe { he.as_mut() }) else {
        debug_assert!(false, "unexpected null he pointer");
        return NS_ERROR_INVALID_ARG;
    };

    let Some(addrs) = (unsafe { addrs.as_ref() }) else {
        debug_assert!(false, "unexpected null addrs pointer");
        return NS_ERROR_INVALID_ARG;
    };

    he.process_dns_response_aaaa(id, addrs)
}

#[no_mangle]
pub unsafe extern "C" fn happy_eyeballs_process_dns_response_https(
    he: *mut HappyEyeballs,
    id: u64,
    service_infos: *const ThinVec<ServiceInfo>,
) -> nsresult {
    let Some(he) = (unsafe { he.as_mut() }) else {
        debug_assert!(false, "unexpected null he pointer");
        return NS_ERROR_INVALID_ARG;
    };

    let Some(service_infos) = (unsafe { service_infos.as_ref() }) else {
        debug_assert!(false, "unexpected null service_infos pointer");
        return NS_ERROR_INVALID_ARG;
    };

    he.process_dns_response_https(id, service_infos)
}

#[no_mangle]
pub unsafe extern "C" fn happy_eyeballs_process_connection_result(
    he: *mut HappyEyeballs,
    id: u64,
    status: nsresult,
) -> nsresult {
    let Some(he) = (unsafe { he.as_mut() }) else {
        debug_assert!(false, "unexpected null he pointer");
        return NS_ERROR_INVALID_ARG;
    };

    he.process_connection_result(id, status)
}

#[no_mangle]
pub unsafe extern "C" fn happy_eyeballs_process_ech_retry(
    he: *mut HappyEyeballs,
    id: u64,
    ech_config: *const ThinVec<u8>,
) -> nsresult {
    let Some(he) = (unsafe { he.as_mut() }) else {
        debug_assert!(false, "unexpected null he pointer");
        return NS_ERROR_INVALID_ARG;
    };

    let Some(ech_config) = (unsafe { ech_config.as_ref() }) else {
        debug_assert!(false, "unexpected null ech_config pointer");
        return NS_ERROR_INVALID_ARG;
    };

    he.process_ech_retry(id, ech_config)
}

#[no_mangle]
pub unsafe extern "C" fn happy_eyeballs_process_output(
    he: *mut HappyEyeballs,
    ret_event: *mut Output,
    ech_config: *mut ThinVec<u8>,
    dns_hostname: *mut nsACString,
) -> nsresult {
    let Some(he) = (unsafe { he.as_mut() }) else {
        debug_assert!(false, "unexpected null he pointer");
        return NS_ERROR_INVALID_ARG;
    };

    let Some(ret_event) = (unsafe { ret_event.as_mut() }) else {
        debug_assert!(false, "unexpected null ret_event pointer");
        return NS_ERROR_INVALID_ARG;
    };

    let Some(ech_config) = (unsafe { ech_config.as_mut() }) else {
        debug_assert!(false, "unexpected null ech_config pointer");
        return NS_ERROR_INVALID_ARG;
    };

    let Some(dns_hostname) = (unsafe { dns_hostname.as_mut() }) else {
        debug_assert!(false, "unexpected null dns_hostname pointer");
        return NS_ERROR_INVALID_ARG;
    };

    he.process_output(ret_event, ech_config, dns_hostname)
}

#[repr(C)]
pub struct HappyEyeballs {
    refcnt: AtomicRefcnt,
    inner: happy_eyeballs::HappyEyeballs,
    profiler: profiler::Profiler,
    metrics: metrics::Metrics,
}

impl HappyEyeballs {
    fn process_dns_response_a(&mut self, id: u64, net_addrs: &ThinVec<NetAddr>) -> nsresult {
        let id: happy_eyeballs::Id = id.into();
        let mut addrs = Vec::with_capacity(net_addrs.len());
        for na in net_addrs.iter() {
            let family =
                i32::from(unsafe { moz_netaddr_get_family((na as *const NetAddr).cast()) });
            if family != AF_INET {
                debug_assert!(false, "got {} instead of AF_INET in A record", family);
                return NS_ERROR_UNEXPECTED;
            }
            let ip_be = unsafe { moz_netaddr_get_network_order_ip((na as *const NetAddr).cast()) };
            let ipv4 = Ipv4Addr::from(u32::from_be(ip_be));
            addrs.push(ipv4);
        }

        self.profiler.dns_response(id, &addrs);
        self.metrics.dns_response(id);

        let result = happy_eyeballs::DnsResult::A(Ok(addrs));
        let input = happy_eyeballs::Input::DnsResult { id, result };
        self.inner.process_input(input, Instant::now());

        NS_OK
    }

    fn process_dns_response_aaaa(&mut self, id: u64, net_addrs: &ThinVec<NetAddr>) -> nsresult {
        let id: happy_eyeballs::Id = id.into();
        let mut addrs = Vec::with_capacity(net_addrs.len());
        for na in net_addrs.iter() {
            let family =
                i32::from(unsafe { moz_netaddr_get_family((na as *const NetAddr).cast()) });
            if family != AF_INET6 {
                debug_assert!(false, "got {} instead of AF_INET6 in AAAA record", family);
                return NS_ERROR_UNEXPECTED;
            }
            let p = unsafe { moz_netaddr_get_ipv6((na as *const NetAddr).cast()) };
            let octs: [u8; 16] = unsafe { std::slice::from_raw_parts(p, 16).try_into().unwrap() };
            let ipv6 = Ipv6Addr::from(octs);
            addrs.push(ipv6);
        }

        self.profiler.dns_response(id, &addrs);
        self.metrics.dns_response(id);

        let result = happy_eyeballs::DnsResult::Aaaa(Ok(addrs));
        let input = happy_eyeballs::Input::DnsResult { id, result };
        self.inner.process_input(input, Instant::now());

        NS_OK
    }

    fn process_dns_response_https(
        &mut self,
        id: u64,
        service_infos: &ThinVec<ServiceInfo>,
    ) -> nsresult {
        let id: happy_eyeballs::Id = id.into();
        let mut infos = Vec::new();

        for svc_info in service_infos {
            let target_str = svc_info.target_name.to_utf8();
            let target = if target_str.is_empty() {
                todo!()
            } else {
                happy_eyeballs::TargetName::from(target_str.as_ref())
            };

            let mut alpn_set = std::collections::HashSet::new();
            for http_version in &svc_info.alpn_http_versions {
                alpn_set.insert((*http_version).into());
            }

            let ech = if svc_info.ech_config.is_empty() {
                None
            } else {
                Some(happy_eyeballs::EchConfig::new(svc_info.ech_config.to_vec()))
            };

            let mut ipv4_vec = Vec::new();
            for na in &svc_info.ipv4_hints {
                let family =
                    i32::from(unsafe { moz_netaddr_get_family((na as *const NetAddr).cast()) });
                debug_assert_eq!(family, AF_INET, "Expected IPv4 address in IPv4 hints");
                if family != AF_INET {
                    return NS_ERROR_UNEXPECTED;
                }
                let ip_be =
                    unsafe { moz_netaddr_get_network_order_ip((na as *const NetAddr).cast()) };
                let ipv4 = Ipv4Addr::from(u32::from_be(ip_be));
                ipv4_vec.push(ipv4);
            }

            let mut ipv6_vec = Vec::new();
            for na in &svc_info.ipv6_hints {
                let family =
                    i32::from(unsafe { moz_netaddr_get_family((na as *const NetAddr).cast()) });
                debug_assert_eq!(family, AF_INET6, "Expected IPv6 address in IPv6 hints");
                if family != AF_INET6 {
                    return NS_ERROR_UNEXPECTED;
                }
                let p = unsafe { moz_netaddr_get_ipv6((na as *const NetAddr).cast()) };
                let octs: [u8; 16] =
                    unsafe { std::slice::from_raw_parts(p, 16).try_into().unwrap() };
                let ipv6 = Ipv6Addr::from(octs);
                ipv6_vec.push(ipv6);
            }

            let port = if svc_info.port == 0 {
                None
            } else {
                Some(svc_info.port)
            };

            infos.push(happy_eyeballs::ServiceInfo {
                priority: svc_info.priority,
                target_name: target,
                alpn_http_versions: alpn_set,
                ech_config: ech,
                ipv4_hints: ipv4_vec,
                ipv6_hints: ipv6_vec,
                port,
            });
        }

        self.profiler.dns_response_https(id, &infos);
        self.metrics.dns_response_https(id, &infos);

        let result = happy_eyeballs::DnsResult::Https(Ok(infos));
        let input = happy_eyeballs::Input::DnsResult { id, result };
        self.inner.process_input(input, Instant::now());

        NS_OK
    }

    fn process_connection_result(&mut self, id: u64, status: nsresult) -> nsresult {
        let id: happy_eyeballs::Id = id.into();
        self.profiler.connection_result(id, status == NS_OK);
        if status == NS_OK {
            self.metrics.connection_succeeded(id);
        }

        let result = if status == NS_OK {
            happy_eyeballs::ConnectionResult::Success
        } else {
            happy_eyeballs::ConnectionResult::Failure(format!(
                "connection failed: 0x{:08x}",
                status.0
            ))
        };

        let input = happy_eyeballs::Input::ConnectionResult { id, result };
        self.inner.process_input(input, Instant::now());

        NS_OK
    }

    fn process_ech_retry(&mut self, id: u64, ech_config: &ThinVec<u8>) -> nsresult {
        let id: happy_eyeballs::Id = id.into();
        self.profiler.connection_result(id, false);

        let result = happy_eyeballs::ConnectionResult::EchRetry(happy_eyeballs::EchConfig::new(
            ech_config.to_vec(),
        ));

        let input = happy_eyeballs::Input::ConnectionResult { id, result };
        self.inner.process_input(input, Instant::now());

        NS_OK
    }

    fn process_output(
        &mut self,
        ret_event: &mut Output,
        ech_config: &mut ThinVec<u8>,
        dns_hostname: &mut nsACString,
    ) -> nsresult {
        let out = self.inner.process_output(std::time::Instant::now());
        ech_config.clear();
        dns_hostname.truncate();
        match out {
            Some(happy_eyeballs::Output::SendDnsQuery {
                id,
                hostname,
                record_type,
            }) => {
                self.profiler.dns_query_started(id, record_type);
                self.metrics.dns_query_started(id, record_type);
                let hostname: String = hostname.into();
                dns_hostname.assign(hostname.as_bytes());
                *ret_event = Output::SendDnsQuery {
                    id: id.into(),
                    record_type: record_type.into(),
                };
            }
            Some(happy_eyeballs::Output::Timer { duration, .. }) => {
                let duration_ms = match duration.as_millis() {
                    0 => 1,
                    ms => ms.try_into().unwrap_or_else(|_| {
                        debug_assert!(false, "duration > u64::MAX");
                        u64::MAX
                    }),
                };
                *ret_event = Output::Timer { duration_ms };
            }
            Some(happy_eyeballs::Output::AttemptConnection {
                id,
                endpoint,
                is_ech_retry,
            }) => {
                self.profiler.connection_attempt_started(id, &endpoint);
                self.metrics.connection_attempt_started(id);
                if let Some(ref ech) = endpoint.ech_config {
                    ech_config.extend_from_slice(ech.as_ref());
                }
                *ret_event = Output::AttemptConnection {
                    id: id.into(),
                    http_version: endpoint.http_version.into(),
                    addr: endpoint.address.ip().into(),
                    port: endpoint.address.port(),
                    is_ech_retry,
                };
            }
            Some(happy_eyeballs::Output::CancelConnection { id }) => {
                self.profiler.connection_cancelled(id);
                self.metrics.connection_cancelled(id);
                *ret_event = Output::CancelConnection { id: id.into() };
            }
            Some(happy_eyeballs::Output::Succeeded) => {
                *ret_event = Output::Succeeded;
            }
            Some(happy_eyeballs::Output::Failed(reason)) => {
                self.metrics.failed();
                *ret_event = Output::Failed {
                    reason: reason.into(),
                };
            }
            None => {
                *ret_event = Output::None;
            }
        }

        NS_OK
    }
}

// TODO: Expose host.
#[repr(C)]
pub struct AltSvc {
    pub http_version: HttpVersion,
    pub port: u16,
}

#[repr(C)]
pub enum DnsRecordType {
    Https = 0,
    Aaaa = 1,
    A = 2,
}

#[repr(C)]
#[derive(Clone, Copy)]
pub enum HttpVersion {
    H3 = 0,
    H2 = 1,
    H1 = 2,
}

#[repr(C)]
pub enum ConnectionAttemptHttpVersions {
    H3 = 0,
    H2OrH1 = 1,
    H2 = 2,
    H1 = 3,
}

impl From<HttpVersion> for happy_eyeballs::HttpVersion {
    fn from(v: HttpVersion) -> Self {
        match v {
            HttpVersion::H3 => Self::H3,
            HttpVersion::H2 => Self::H2,
            HttpVersion::H1 => Self::H1,
        }
    }
}

impl From<happy_eyeballs::HttpVersion> for HttpVersion {
    fn from(v: happy_eyeballs::HttpVersion) -> Self {
        match v {
            happy_eyeballs::HttpVersion::H3 => Self::H3,
            happy_eyeballs::HttpVersion::H2 => Self::H2,
            happy_eyeballs::HttpVersion::H1 => Self::H1,
        }
    }
}

impl From<happy_eyeballs::DnsRecordType> for DnsRecordType {
    fn from(v: happy_eyeballs::DnsRecordType) -> Self {
        match v {
            happy_eyeballs::DnsRecordType::Https => Self::Https,
            happy_eyeballs::DnsRecordType::Aaaa => Self::Aaaa,
            happy_eyeballs::DnsRecordType::A => Self::A,
        }
    }
}

impl From<happy_eyeballs::ConnectionAttemptHttpVersions> for ConnectionAttemptHttpVersions {
    fn from(v: happy_eyeballs::ConnectionAttemptHttpVersions) -> Self {
        match v {
            happy_eyeballs::ConnectionAttemptHttpVersions::H3 => Self::H3,
            happy_eyeballs::ConnectionAttemptHttpVersions::H2OrH1 => Self::H2OrH1,
            happy_eyeballs::ConnectionAttemptHttpVersions::H2 => Self::H2,
            happy_eyeballs::ConnectionAttemptHttpVersions::H1 => Self::H1,
        }
    }
}

impl From<ConnectionAttemptHttpVersions> for happy_eyeballs::ConnectionAttemptHttpVersions {
    fn from(v: ConnectionAttemptHttpVersions) -> Self {
        match v {
            ConnectionAttemptHttpVersions::H3 => Self::H3,
            ConnectionAttemptHttpVersions::H2OrH1 => Self::H2OrH1,
            ConnectionAttemptHttpVersions::H2 => Self::H2,
            ConnectionAttemptHttpVersions::H1 => Self::H1,
        }
    }
}

impl From<happy_eyeballs::HttpVersion> for ConnectionAttemptHttpVersions {
    fn from(v: happy_eyeballs::HttpVersion) -> Self {
        match v {
            happy_eyeballs::HttpVersion::H3 => Self::H3,
            happy_eyeballs::HttpVersion::H2 => Self::H2,
            happy_eyeballs::HttpVersion::H1 => Self::H1,
        }
    }
}

impl From<happy_eyeballs::FailureReason> for FailureReason {
    fn from(v: happy_eyeballs::FailureReason) -> Self {
        match v {
            happy_eyeballs::FailureReason::DnsResolution => Self::DnsResolution,
            happy_eyeballs::FailureReason::Connection => Self::Connection,
        }
    }
}

#[repr(C)]
pub struct ServiceInfo {
    pub priority: u16,
    pub port: u16,
    pub target_name: nsCString,
    pub alpn_http_versions: ThinVec<HttpVersion>,
    pub ech_config: ThinVec<u8>,
    pub ipv4_hints: ThinVec<NetAddr>,
    pub ipv6_hints: ThinVec<NetAddr>,
}

#[repr(C)]
pub enum IpAddr {
    V4([u8; 4]),
    V6([u8; 16]),
}

impl From<std::net::IpAddr> for IpAddr {
    fn from(ip: std::net::IpAddr) -> Self {
        match ip {
            std::net::IpAddr::V4(ipv4) => IpAddr::V4(ipv4.octets()),
            std::net::IpAddr::V6(ipv6) => IpAddr::V6(ipv6.octets()),
        }
    }
}

#[repr(C)]
pub enum FailureReason {
    DnsResolution = 0,
    Connection = 1,
}

#[repr(C)]
pub enum Output {
    SendDnsQuery {
        id: u64,
        record_type: DnsRecordType,
    },
    Timer {
        duration_ms: u64,
    },
    AttemptConnection {
        id: u64,
        http_version: ConnectionAttemptHttpVersions,
        addr: IpAddr,
        port: u16,
        is_ech_retry: bool,
    },
    CancelConnection {
        id: u64,
    },
    Succeeded,
    Failed {
        reason: FailureReason,
    },
    None,
}

#[no_mangle]
pub unsafe extern "C" fn happy_eyeballs_release(happy_eyeballs: *const HappyEyeballs) {
    let Some(happy_eyeballs) = (unsafe { happy_eyeballs.as_ref() }) else {
        debug_assert!(false, "unexpected null happy_eyeballs pointer");
        return;
    };

    let rc = happy_eyeballs.refcnt.dec();
    if rc == 0 {
        drop(Box::from_raw(ptr::from_ref(happy_eyeballs).cast_mut()));
    }
}

#[no_mangle]
pub unsafe extern "C" fn happy_eyeballs_addref(happy_eyeballs: *const HappyEyeballs) {
    let Some(happy_eyeballs) = (unsafe { happy_eyeballs.as_ref() }) else {
        debug_assert!(false, "unexpected null happy_eyeballs pointer");
        return;
    };

    happy_eyeballs.refcnt.inc();
}

// xpcom::RefPtr support
unsafe impl RefCounted for HappyEyeballs {
    unsafe fn addref(&self) {
        happy_eyeballs_addref(self);
    }
    unsafe fn release(&self) {
        happy_eyeballs_release(self);
    }
}

// Opaque interface to mozilla::net::NetAddr defined in DNS.h
#[repr(C)]
pub union NetAddr {
    _private: [u8; 0],
}

extern "C" {
    fn moz_netaddr_get_family(arg: *const NetAddr) -> u16;
    fn moz_netaddr_get_network_order_ip(arg: *const NetAddr) -> u32;
    fn moz_netaddr_get_ipv6(arg: *const NetAddr) -> *const u8;
}
