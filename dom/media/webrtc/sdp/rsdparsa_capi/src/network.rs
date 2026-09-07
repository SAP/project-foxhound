/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use std::fmt::Write;
use std::net::IpAddr;

use nsstring::nsACString;
use rsdparsa::address::{Address, AddressType, AddressTyped, ExplicitlyTypedAddress};
use rsdparsa::{SdpBandwidth, SdpConnection, SdpOrigin};
use std::convert::TryFrom;
use types::StringView;

#[repr(C)]
#[derive(Clone, Copy, PartialEq)]
pub enum RustAddressType {
    IP4,
    IP6,
}

impl TryFrom<u32> for RustAddressType {
    type Error = nserror::nsresult;
    fn try_from(address_type: u32) -> Result<Self, Self::Error> {
        match address_type {
            1 => Ok(RustAddressType::IP4),
            2 => Ok(RustAddressType::IP6),
            _ => Err(nserror::NS_ERROR_INVALID_ARG),
        }
    }
}

impl From<AddressType> for RustAddressType {
    fn from(address_type: AddressType) -> Self {
        match address_type {
            AddressType::IpV4 => RustAddressType::IP4,
            AddressType::IpV6 => RustAddressType::IP6,
        }
    }
}

impl Into<AddressType> for RustAddressType {
    fn into(self) -> AddressType {
        match self {
            RustAddressType::IP4 => AddressType::IpV4,
            RustAddressType::IP6 => AddressType::IpV6,
        }
    }
}

impl<'a> From<&'a IpAddr> for RustAddressType {
    fn from(addr: &IpAddr) -> RustAddressType {
        addr.address_type().into()
    }
}

pub fn get_octets(addr: &IpAddr) -> [u8; 16] {
    let mut octets = [0; 16];
    match *addr {
        IpAddr::V4(v4_addr) => {
            let v4_octets = v4_addr.octets();
            (&mut octets[0..4]).copy_from_slice(&v4_octets);
        }
        IpAddr::V6(v6_addr) => {
            let v6_octets = v6_addr.octets();
            octets.copy_from_slice(&v6_octets);
        }
    }
    octets
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct RustAddress {
    ip_address: [u8; 50],
    fqdn: StringView,
    is_fqdn: bool,
}

impl<'a> From<&'a Address> for RustAddress {
    fn from(address: &Address) -> Self {
        match address {
            Address::Ip(ip) => Self::from(ip),
            Address::Fqdn(fqdn) => Self {
                ip_address: [0; 50],
                fqdn: fqdn.as_str().into(),
                is_fqdn: true,
            },
        }
    }
}

impl<'a> From<&'a IpAddr> for RustAddress {
    fn from(addr: &IpAddr) -> Self {
        let mut c_addr = [0; 50];
        let str_addr = format!("{}", addr);
        let str_bytes = str_addr.as_bytes();
        if str_bytes.len() < 50 {
            c_addr[..str_bytes.len()].copy_from_slice(&str_bytes);
        }
        Self {
            ip_address: c_addr,
            fqdn: StringView::empty(),
            is_fqdn: false,
        }
    }
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct RustExplicitlyTypedAddress {
    address_type: RustAddressType,
    address: RustAddress,
}

impl Default for RustExplicitlyTypedAddress {
    fn default() -> Self {
        Self {
            address_type: RustAddressType::IP4,
            address: RustAddress {
                ip_address: [0; 50],
                fqdn: StringView::empty(),
                is_fqdn: false,
            },
        }
    }
}

impl<'a> From<&'a ExplicitlyTypedAddress> for RustExplicitlyTypedAddress {
    fn from(address: &ExplicitlyTypedAddress) -> Self {
        match address {
            ExplicitlyTypedAddress::Fqdn { domain, .. } => Self {
                address_type: address.address_type().into(),
                address: RustAddress {
                    ip_address: [0; 50],
                    fqdn: StringView::from(domain.as_str()),
                    is_fqdn: true,
                },
            },
            ExplicitlyTypedAddress::Ip(ip_address) => Self {
                address_type: ip_address.address_type().into(),
                address: ip_address.into(),
            },
        }
    }
}

// TODO @@NG remove
impl<'a> From<&'a Option<IpAddr>> for RustExplicitlyTypedAddress {
    fn from(addr: &Option<IpAddr>) -> Self {
        match *addr {
            Some(ref x) => Self {
                address_type: RustAddressType::from(x.address_type()),
                address: RustAddress::from(x),
            },
            None => Self::default(),
        }
    }
}

#[repr(C)]
pub struct RustSdpConnection {
    pub addr: RustExplicitlyTypedAddress,
    pub ttl: u8,
    pub amount: u64,
}

impl<'a> From<&'a SdpConnection> for RustSdpConnection {
    fn from(sdp_connection: &SdpConnection) -> Self {
        let ttl = match sdp_connection.ttl {
            Some(x) => x as u8,
            None => 0,
        };
        let amount = match sdp_connection.amount {
            Some(x) => x as u64,
            None => 0,
        };
        RustSdpConnection {
            addr: RustExplicitlyTypedAddress::from(&sdp_connection.address),
            ttl: ttl,
            amount: amount,
        }
    }
}

#[repr(C)]
pub struct RustSdpOrigin {
    username: StringView,
    session_id: u64,
    session_version: u64,
    addr: RustExplicitlyTypedAddress,
}

fn bandwidth_match(str_bw: &str, enum_bw: &SdpBandwidth) -> bool {
    match *enum_bw {
        SdpBandwidth::As(_) => str_bw == "AS",
        SdpBandwidth::Ct(_) => str_bw == "CT",
        SdpBandwidth::Tias(_) => str_bw == "TIAS",
        SdpBandwidth::Unknown(ref type_name, _) => str_bw == type_name,
    }
}

fn bandwidth_value(bandwidth: &SdpBandwidth) -> u32 {
    match *bandwidth {
        SdpBandwidth::As(x) | SdpBandwidth::Ct(x) | SdpBandwidth::Tias(x) => x,
        SdpBandwidth::Unknown(_, _) => 0,
    }
}

pub fn get_bandwidth(bandwidths: &Vec<SdpBandwidth>, bandwidth_type: &nsACString) -> u32 {
    let bw_type = bandwidth_type.to_utf8();
    for bandwidth in bandwidths.iter() {
        if bandwidth_match(&bw_type, bandwidth) {
            return bandwidth_value(bandwidth);
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn sdp_serialize_bandwidth(bw: &Vec<SdpBandwidth>, out: &mut nsACString) {
    for bandwidth in bw.iter() {
        match *bandwidth {
            SdpBandwidth::As(val) => write!(out, "b=AS:{}\r\n", val),
            SdpBandwidth::Ct(val) => write!(out, "b=CT:{}\r\n", val),
            SdpBandwidth::Tias(val) => write!(out, "b=TIAS:{}\r\n", val),
            SdpBandwidth::Unknown(ref name, val) => write!(out, "b={}:{}\r\n", name, val),
        }
        .unwrap()
    }
}

pub fn origin_view_helper(origin: &SdpOrigin) -> RustSdpOrigin {
    RustSdpOrigin {
        username: StringView::from(origin.username.as_str()),
        session_id: origin.session_id,
        session_version: origin.session_version,
        addr: RustExplicitlyTypedAddress::from(&origin.unicast_addr),
    }
}
