/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use std::ptr;

use nserror::{nsresult, NS_ERROR_INVALID_ARG, NS_OK};
use nsstring::nsACString;
use rsdparsa::attribute_type::{SdpAttribute, SdpAttributeRtpmap};
use rsdparsa::media_type::{SdpFormatList, SdpMedia, SdpMediaValue, SdpProtocolValue};
use rsdparsa::{SdpBandwidth, SdpSession};
use thin_vec::ThinVec;

use network::{get_bandwidth, RustSdpConnection};
use types::{RustSpan, StringView};

#[no_mangle]
pub unsafe extern "C" fn sdp_get_media_section(
    session: &mut SdpSession,
    index: usize,
) -> *mut SdpMedia {
    match session.media.get_mut(index) {
        Some(m) => m,
        None => ptr::null_mut(),
    }
}

#[repr(C)]
#[derive(Clone, Copy)]
pub enum RustSdpMediaValue {
    Audio,
    Video,
    Application,
}

impl<'a> From<&'a SdpMediaValue> for RustSdpMediaValue {
    fn from(val: &SdpMediaValue) -> Self {
        match *val {
            SdpMediaValue::Audio => RustSdpMediaValue::Audio,
            SdpMediaValue::Video => RustSdpMediaValue::Video,
            SdpMediaValue::Application => RustSdpMediaValue::Application,
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn sdp_rust_get_media_type(sdp_media: *const SdpMedia) -> RustSdpMediaValue {
    RustSdpMediaValue::from((*sdp_media).get_type())
}

#[repr(C)]
#[derive(Clone, Copy)]
pub enum RustSdpProtocolValue {
    RtpSavpf,
    UdpTlsRtpSavp,
    TcpDtlsRtpSavp,
    UdpTlsRtpSavpf,
    TcpDtlsRtpSavpf,
    DtlsSctp,
    UdpDtlsSctp,
    TcpDtlsSctp,
    RtpAvp,
    RtpAvpf,
    RtpSavp,
}

impl<'a> From<&'a SdpProtocolValue> for RustSdpProtocolValue {
    fn from(val: &SdpProtocolValue) -> Self {
        match *val {
            SdpProtocolValue::RtpSavpf => RustSdpProtocolValue::RtpSavpf,
            SdpProtocolValue::UdpTlsRtpSavp => RustSdpProtocolValue::UdpTlsRtpSavp,
            SdpProtocolValue::TcpDtlsRtpSavp => RustSdpProtocolValue::TcpDtlsRtpSavp,
            SdpProtocolValue::UdpTlsRtpSavpf => RustSdpProtocolValue::UdpTlsRtpSavpf,
            SdpProtocolValue::TcpDtlsRtpSavpf => RustSdpProtocolValue::TcpDtlsRtpSavpf,
            SdpProtocolValue::DtlsSctp => RustSdpProtocolValue::DtlsSctp,
            SdpProtocolValue::UdpDtlsSctp => RustSdpProtocolValue::UdpDtlsSctp,
            SdpProtocolValue::TcpDtlsSctp => RustSdpProtocolValue::TcpDtlsSctp,
            SdpProtocolValue::RtpAvp => RustSdpProtocolValue::RtpAvp,
            SdpProtocolValue::RtpAvpf => RustSdpProtocolValue::RtpAvpf,
            SdpProtocolValue::RtpSavp => RustSdpProtocolValue::RtpSavp,
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn sdp_get_media_protocol(
    sdp_media: *const SdpMedia,
) -> RustSdpProtocolValue {
    RustSdpProtocolValue::from((*sdp_media).get_proto())
}

#[repr(C)]
#[derive(Clone, Copy)]
pub enum RustSdpFormatType {
    Integers,
    Strings,
}

#[no_mangle]
pub unsafe extern "C" fn sdp_get_format_type(sdp_media: *const SdpMedia) -> RustSdpFormatType {
    match *(*sdp_media).get_formats() {
        SdpFormatList::Integers(_) => RustSdpFormatType::Integers,
        SdpFormatList::Strings(_) => RustSdpFormatType::Strings,
    }
}

#[no_mangle]
pub extern "C" fn sdp_get_format_string_vec(sdp_media: &SdpMedia, ret: &mut ThinVec<StringView>) {
    if let SdpFormatList::Strings(ref formats) = *sdp_media.get_formats() {
        ret.extend(formats.iter().map(|s| StringView::from(s.as_str())));
    }
}

#[no_mangle]
pub extern "C" fn sdp_get_format_u32_vec(sdp_media: &SdpMedia) -> RustSpan<u32> {
    if let SdpFormatList::Integers(ref formats) = *sdp_media.get_formats() {
        RustSpan::from_slice(formats.as_slice())
    } else {
        RustSpan::empty()
    }
}

#[no_mangle]
pub unsafe extern "C" fn sdp_set_media_port(sdp_media: *mut SdpMedia, port: u32) {
    (*sdp_media).set_port(port);
}

#[no_mangle]
pub unsafe extern "C" fn sdp_get_media_port(sdp_media: *const SdpMedia) -> u32 {
    (*sdp_media).get_port()
}

#[no_mangle]
pub unsafe extern "C" fn sdp_get_media_port_count(sdp_media: *const SdpMedia) -> u32 {
    (*sdp_media).get_port_count()
}

#[no_mangle]
pub extern "C" fn sdp_get_media_bandwidth(
    sdp_media: &SdpMedia,
    bandwidth_type: &nsACString,
) -> u32 {
    get_bandwidth(sdp_media.get_bandwidth(), bandwidth_type)
}

#[no_mangle]
pub extern "C" fn sdp_get_media_bandwidth_vec(sdp_media: &SdpMedia) -> *const Vec<SdpBandwidth> {
    sdp_media.get_bandwidth()
}

#[no_mangle]
pub extern "C" fn sdp_media_has_connection(sdp_media: &SdpMedia) -> bool {
    sdp_media.get_connection().is_some()
}

#[no_mangle]
pub unsafe extern "C" fn sdp_get_media_connection(
    sdp_media: &SdpMedia,
    ret: *mut RustSdpConnection,
) -> nsresult {
    if let &Some(ref connection) = sdp_media.get_connection() {
        *ret = RustSdpConnection::from(connection);
        return NS_OK;
    }
    NS_ERROR_INVALID_ARG
}

#[no_mangle]
pub unsafe extern "C" fn sdp_get_media_attribute_list(
    sdp_media: &SdpMedia,
) -> *const Vec<SdpAttribute> {
    sdp_media.get_attributes()
}

#[no_mangle]
pub unsafe extern "C" fn sdp_media_clear_codecs(sdp_media: &mut SdpMedia) {
    sdp_media.remove_codecs()
}

#[no_mangle]
pub unsafe extern "C" fn sdp_media_add_codec(
    sdp_media: &mut SdpMedia,
    pt: u8,
    codec_name: StringView,
    clockrate: u32,
    channels: u16,
) -> nsresult {
    let rtpmap = SdpAttributeRtpmap {
        payload_type: pt,
        codec_name: match std::str::from_utf8(codec_name.as_slice()) {
            Ok(x) => x.to_owned(),
            Err(e) => {
                error!("Error while parsing string, description: {}", e);
                return NS_ERROR_INVALID_ARG;
            }
        },
        frequency: clockrate,
        channels: Some(channels as u32),
    };

    match sdp_media.add_codec(rtpmap) {
        Ok(_) => NS_OK,
        Err(_) => NS_ERROR_INVALID_ARG,
    }
}

#[no_mangle]
pub extern "C" fn sdp_media_add_datachannel(
    sdp_media: &mut SdpMedia,
    name: StringView,
    port: u16,
    streams: u16,
    message_size: u32,
) -> nsresult {
    let name_str = match std::str::from_utf8(name.as_slice()) {
        Ok(x) => x.to_owned(),
        Err(_) => return NS_ERROR_INVALID_ARG,
    };
    match sdp_media.add_datachannel(name_str, port, streams, message_size) {
        Ok(_) => NS_OK,
        Err(_) => NS_ERROR_INVALID_ARG,
    }
}
