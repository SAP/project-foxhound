/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use libc::c_float;

use nserror::{nsresult, NS_ERROR_INVALID_ARG, NS_OK};
use rsdparsa::attribute_type::*;
use rsdparsa::SdpSession;
use thin_vec::ThinVec;

use network::{RustAddress, RustExplicitlyTypedAddress};
use types::{RustSpan, StringView};

#[no_mangle]
pub unsafe extern "C" fn num_attributes(session: *const SdpSession) -> u32 {
    (*session).attribute.len() as u32
}

#[no_mangle]
pub unsafe extern "C" fn get_attribute_ptr(
    session: *const SdpSession,
    index: u32,
    ret: *mut *const SdpAttribute,
) -> nsresult {
    match (&(*session).attribute).get(index as usize) {
        Some(attribute) => {
            *ret = attribute as *const SdpAttribute;
            NS_OK
        }
        None => NS_ERROR_INVALID_ARG,
    }
}

fn argsearch(attributes: &[SdpAttribute], attribute_type: SdpAttributeType) -> Option<usize> {
    attributes
        .iter()
        .position(|attribute| SdpAttributeType::from(attribute) == attribute_type)
}

pub unsafe fn has_attribute(
    attributes: *const Vec<SdpAttribute>,
    attribute_type: SdpAttributeType,
) -> bool {
    argsearch((*attributes).as_slice(), attribute_type).is_some()
}

fn get_attribute(
    attributes: &[SdpAttribute],
    attribute_type: SdpAttributeType,
) -> Option<&SdpAttribute> {
    argsearch(attributes, attribute_type).map(|i| &attributes[i])
}

fn string_views(strings: &[String]) -> ThinVec<StringView> {
    strings
        .iter()
        .map(|s| StringView::from(s.as_str()))
        .collect()
}

#[repr(C)]
#[derive(Clone, Copy)]
pub enum RustSdpAttributeDtlsMessageRole {
    Client,
    Server,
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct RustSdpAttributeDtlsMessage {
    pub role: RustSdpAttributeDtlsMessageRole,
    pub value: StringView,
}

impl<'a> From<&'a SdpAttributeDtlsMessage> for RustSdpAttributeDtlsMessage {
    fn from(other: &SdpAttributeDtlsMessage) -> Self {
        match other {
            &SdpAttributeDtlsMessage::Client(ref x) => RustSdpAttributeDtlsMessage {
                role: RustSdpAttributeDtlsMessageRole::Client,
                value: StringView::from(x.as_str()),
            },
            &SdpAttributeDtlsMessage::Server(ref x) => RustSdpAttributeDtlsMessage {
                role: RustSdpAttributeDtlsMessageRole::Server,
                value: StringView::from(x.as_str()),
            },
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn sdp_get_dtls_message(
    attributes: &Vec<SdpAttribute>,
    ret: &mut RustSdpAttributeDtlsMessage,
) -> nsresult {
    if let Some(&SdpAttribute::DtlsMessage(ref dtls_message)) =
        get_attribute(attributes.as_slice(), SdpAttributeType::DtlsMessage)
    {
        *ret = RustSdpAttributeDtlsMessage::from(dtls_message);
        return NS_OK;
    }
    NS_ERROR_INVALID_ARG
}

#[no_mangle]
pub unsafe extern "C" fn sdp_get_iceufrag(
    attributes: &Vec<SdpAttribute>,
    ret: &mut StringView,
) -> nsresult {
    if let Some(&SdpAttribute::IceUfrag(ref string)) =
        get_attribute(attributes.as_slice(), SdpAttributeType::IceUfrag)
    {
        *ret = StringView::from(string.as_str());
        return NS_OK;
    }
    NS_ERROR_INVALID_ARG
}

#[no_mangle]
pub unsafe extern "C" fn sdp_get_icepwd(
    attributes: &Vec<SdpAttribute>,
    ret: &mut StringView,
) -> nsresult {
    if let Some(&SdpAttribute::IcePwd(ref string)) =
        get_attribute(attributes.as_slice(), SdpAttributeType::IcePwd)
    {
        *ret = StringView::from(string.as_str());
        return NS_OK;
    }
    NS_ERROR_INVALID_ARG
}

#[no_mangle]
pub unsafe extern "C" fn sdp_get_identity(
    attributes: &Vec<SdpAttribute>,
    ret: &mut StringView,
) -> nsresult {
    if let Some(&SdpAttribute::Identity(ref string)) =
        get_attribute(attributes.as_slice(), SdpAttributeType::Identity)
    {
        *ret = StringView::from(string.as_str());
        return NS_OK;
    }
    NS_ERROR_INVALID_ARG
}

#[no_mangle]
pub unsafe extern "C" fn sdp_get_iceoptions(
    attributes: &Vec<SdpAttribute>,
    ret: &mut ThinVec<StringView>,
) -> nsresult {
    if let Some(&SdpAttribute::IceOptions(ref options)) =
        get_attribute(attributes.as_slice(), SdpAttributeType::IceOptions)
    {
        ret.extend(options.iter().map(|x| StringView::from(x.as_str())));
        return NS_OK;
    }
    NS_ERROR_INVALID_ARG
}

#[no_mangle]
pub unsafe extern "C" fn sdp_get_maxptime(
    attributes: &Vec<SdpAttribute>,
    ret: &mut u64,
) -> nsresult {
    if let Some(&SdpAttribute::MaxPtime(ref max_ptime)) =
        get_attribute(attributes.as_slice(), SdpAttributeType::MaxPtime)
    {
        *ret = *max_ptime;
        return NS_OK;
    }
    NS_ERROR_INVALID_ARG
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct RustSdpAttributeFingerprint {
    hash_algorithm: RustSdpAttributeFingerprintHashAlgorithm,
    fingerprint: RustSpan<u8>,
}

#[repr(C)]
#[derive(Clone, Copy)]
pub enum RustSdpAttributeFingerprintHashAlgorithm {
    Sha1,
    Sha224,
    Sha256,
    Sha384,
    Sha512,
}

impl From<SdpAttributeFingerprintHashType> for RustSdpAttributeFingerprintHashAlgorithm {
    fn from(other: SdpAttributeFingerprintHashType) -> Self {
        match other {
            SdpAttributeFingerprintHashType::Sha1 => Self::Sha1,
            SdpAttributeFingerprintHashType::Sha224 => Self::Sha224,
            SdpAttributeFingerprintHashType::Sha256 => Self::Sha256,
            SdpAttributeFingerprintHashType::Sha384 => Self::Sha384,
            SdpAttributeFingerprintHashType::Sha512 => Self::Sha512,
        }
    }
}

impl<'a> From<&'a SdpAttributeFingerprint> for RustSdpAttributeFingerprint {
    fn from(other: &SdpAttributeFingerprint) -> Self {
        RustSdpAttributeFingerprint {
            hash_algorithm: other.hash_algorithm.into(),
            fingerprint: RustSpan::from_slice(other.fingerprint.as_slice()),
        }
    }
}

#[no_mangle]
pub extern "C" fn sdp_get_fingerprints(
    attributes: &Vec<SdpAttribute>,
    ret_fingerprints: &mut ThinVec<RustSdpAttributeFingerprint>,
) {
    for attribute in attributes.iter() {
        if let SdpAttribute::Fingerprint(ref data) = *attribute {
            ret_fingerprints.push(RustSdpAttributeFingerprint::from(data));
        }
    }
}

#[repr(C)]
#[derive(Clone)]
pub enum RustSdpAttributeSetup {
    Active,
    Actpass,
    Holdconn,
    Passive,
}

impl<'a> From<&'a SdpAttributeSetup> for RustSdpAttributeSetup {
    fn from(other: &SdpAttributeSetup) -> Self {
        match *other {
            SdpAttributeSetup::Active => RustSdpAttributeSetup::Active,
            SdpAttributeSetup::Actpass => RustSdpAttributeSetup::Actpass,
            SdpAttributeSetup::Holdconn => RustSdpAttributeSetup::Holdconn,
            SdpAttributeSetup::Passive => RustSdpAttributeSetup::Passive,
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn sdp_get_setup(
    attributes: &Vec<SdpAttribute>,
    ret: &mut RustSdpAttributeSetup,
) -> nsresult {
    if let Some(&SdpAttribute::Setup(ref setup)) =
        get_attribute(attributes.as_slice(), SdpAttributeType::Setup)
    {
        *ret = RustSdpAttributeSetup::from(setup);
        return NS_OK;
    }
    NS_ERROR_INVALID_ARG
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct RustSdpAttributeSsrc {
    pub id: u32,
    pub attribute: StringView,
    pub value: StringView,
}

impl<'a> From<&'a SdpAttributeSsrc> for RustSdpAttributeSsrc {
    fn from(other: &SdpAttributeSsrc) -> Self {
        RustSdpAttributeSsrc {
            id: other.id,
            attribute: StringView::from(&other.attribute),
            value: StringView::from(&other.value),
        }
    }
}

#[no_mangle]
pub extern "C" fn sdp_get_ssrcs(
    attributes: &Vec<SdpAttribute>,
    ret: &mut ThinVec<RustSdpAttributeSsrc>,
) {
    for attribute in attributes.iter() {
        if let SdpAttribute::Ssrc(ref data) = *attribute {
            ret.push(RustSdpAttributeSsrc::from(data));
        }
    }
}

#[repr(C)]
#[derive(Clone, Copy)]
pub enum RustSdpSsrcGroupSemantic {
    Duplication,
    FlowIdentification,
    ForwardErrorCorrection,
    ForwardErrorCorrectionFr,
    SIM,
}

impl<'a> From<&'a SdpSsrcGroupSemantic> for RustSdpSsrcGroupSemantic {
    fn from(other: &SdpSsrcGroupSemantic) -> Self {
        match *other {
            SdpSsrcGroupSemantic::Duplication => RustSdpSsrcGroupSemantic::Duplication,
            SdpSsrcGroupSemantic::FlowIdentification => {
                RustSdpSsrcGroupSemantic::FlowIdentification
            }
            SdpSsrcGroupSemantic::ForwardErrorCorrection => {
                RustSdpSsrcGroupSemantic::ForwardErrorCorrection
            }
            SdpSsrcGroupSemantic::ForwardErrorCorrectionFr => {
                RustSdpSsrcGroupSemantic::ForwardErrorCorrectionFr
            }
            SdpSsrcGroupSemantic::Sim => RustSdpSsrcGroupSemantic::SIM,
        }
    }
}

#[repr(C)]
pub struct RustSdpSsrcGroup {
    pub semantic: RustSdpSsrcGroupSemantic,
    pub ssrcs: ThinVec<u32>,
}

#[no_mangle]
pub extern "C" fn sdp_get_ssrc_groups(
    attributes: &Vec<SdpAttribute>,
    ret: &mut ThinVec<RustSdpSsrcGroup>,
) {
    for attribute in attributes.iter() {
        if let SdpAttribute::SsrcGroup(ref semantic, ref ssrcs) = *attribute {
            ret.push(RustSdpSsrcGroup {
                semantic: RustSdpSsrcGroupSemantic::from(semantic),
                ssrcs: ssrcs.iter().map(|ssrc| ssrc.id).collect(),
            });
        }
    }
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct RustSdpAttributeRtpmap {
    pub payload_type: u8,
    pub codec_name: StringView,
    pub frequency: u32,
    pub channels: u32,
}

impl<'a> From<&'a SdpAttributeRtpmap> for RustSdpAttributeRtpmap {
    fn from(other: &SdpAttributeRtpmap) -> Self {
        RustSdpAttributeRtpmap {
            payload_type: other.payload_type as u8,
            codec_name: StringView::from(other.codec_name.as_str()),
            frequency: other.frequency as u32,
            channels: other.channels.unwrap_or(0),
        }
    }
}

#[no_mangle]
pub extern "C" fn sdp_get_rtpmaps(
    attributes: &Vec<SdpAttribute>,
    ret: &mut ThinVec<RustSdpAttributeRtpmap>,
) {
    for attribute in attributes.iter() {
        if let SdpAttribute::Rtpmap(ref data) = *attribute {
            ret.push(RustSdpAttributeRtpmap::from(data));
        }
    }
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct RustRtxFmtpParameters {
    pub apt: u8,
    pub has_rtx_time: bool,
    pub rtx_time: u32,
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct RustAv1FmtpParameters {
    pub profile: u8,
    pub has_profile: bool,
    pub level_idx: u8,
    pub has_level_idx: bool,
    pub tier: u8,
    pub has_tier: bool,
}

#[repr(C)]
pub struct RustSdpAttributeFmtpParameters {
    // H264
    pub packetization_mode: u32,
    pub level_asymmetry_allowed: bool,
    pub profile_level_id: u32,
    pub max_fs: u32,
    pub max_cpb: u32,
    pub max_dpb: u32,
    pub max_br: u32,
    pub max_mbps: u32,

    // VP8 and VP9
    // max_fs, already defined in H264
    pub max_fr: u32,

    // Opus
    pub maxplaybackrate: u32,
    pub maxaveragebitrate: u32,
    pub usedtx: bool,
    pub stereo: bool,
    pub useinbandfec: bool,
    pub cbr: bool,
    pub ptime: u32,
    pub minptime: u32,
    pub maxptime: u32,

    // telephone-event
    pub dtmf_tones: StringView,

    // AV1
    pub av1: RustAv1FmtpParameters,

    // RTX
    pub rtx: RustRtxFmtpParameters,

    // Red
    pub encodings: RustSpan<u8>,

    // Unknown
    pub unknown_tokens: ThinVec<StringView>,
}

impl<'a> From<&'a SdpAttributeFmtpParameters> for RustSdpAttributeFmtpParameters {
    fn from(other: &SdpAttributeFmtpParameters) -> Self {
        let rtx = if let Some(rtx) = other.rtx {
            RustRtxFmtpParameters {
                apt: rtx.apt,
                has_rtx_time: rtx.rtx_time.is_some(),
                rtx_time: rtx.rtx_time.unwrap_or(0),
            }
        } else {
            RustRtxFmtpParameters {
                apt: 0,
                has_rtx_time: false,
                rtx_time: 0,
            }
        };
        let av1 = RustAv1FmtpParameters {
            profile: other.profile.unwrap_or(0),
            has_profile: other.profile.is_some(),
            level_idx: other.level_idx.unwrap_or(0),
            has_level_idx: other.level_idx.is_some(),
            tier: other.tier.unwrap_or(0),
            has_tier: other.tier.is_some(),
        };

        RustSdpAttributeFmtpParameters {
            packetization_mode: other.packetization_mode,
            level_asymmetry_allowed: other.level_asymmetry_allowed,
            profile_level_id: other.profile_level_id,
            max_fs: other.max_fs,
            max_cpb: other.max_cpb,
            max_dpb: other.max_dpb,
            max_br: other.max_br,
            max_mbps: other.max_mbps,
            usedtx: other.usedtx,
            stereo: other.stereo,
            useinbandfec: other.useinbandfec,
            cbr: other.cbr,
            max_fr: other.max_fr,
            maxplaybackrate: other.maxplaybackrate,
            maxaveragebitrate: other.maxaveragebitrate,
            ptime: other.ptime,
            minptime: other.minptime,
            maxptime: other.maxptime,
            dtmf_tones: StringView::from(other.dtmf_tones.as_str()),
            av1,
            rtx,
            encodings: RustSpan::from_slice(other.encodings.as_slice()),
            unknown_tokens: string_views(&other.unknown_tokens),
        }
    }
}

#[repr(C)]
pub struct RustSdpAttributeFmtp {
    pub payload_type: u8,
    pub codec_name: StringView,
    pub parameters: RustSdpAttributeFmtpParameters,
}

fn find_payload_type(attributes: &[SdpAttribute], payload_type: u8) -> Option<&SdpAttributeRtpmap> {
    attributes
        .iter()
        .filter_map(|x| {
            if let SdpAttribute::Rtpmap(ref data) = *x {
                if data.payload_type == payload_type {
                    Some(data)
                } else {
                    None
                }
            } else {
                None
            }
        })
        .next()
}

#[no_mangle]
pub extern "C" fn sdp_get_fmtp(
    attributes: &Vec<SdpAttribute>,
    ret: &mut ThinVec<RustSdpAttributeFmtp>,
) {
    for attribute in attributes.iter() {
        if let SdpAttribute::Fmtp(ref fmtp) = *attribute {
            if let Some(rtpmap) = find_payload_type(attributes.as_slice(), fmtp.payload_type) {
                ret.push(RustSdpAttributeFmtp {
                    payload_type: fmtp.payload_type as u8,
                    codec_name: StringView::from(rtpmap.codec_name.as_str()),
                    parameters: RustSdpAttributeFmtpParameters::from(&fmtp.parameters),
                });
            }
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn sdp_get_ptime(attributes: &Vec<SdpAttribute>) -> i64 {
    for attribute in attributes.iter() {
        if let SdpAttribute::Ptime(time) = *attribute {
            return time as i64;
        }
    }
    -1
}

#[no_mangle]
pub unsafe extern "C" fn sdp_get_max_msg_size(attributes: &Vec<SdpAttribute>) -> i64 {
    for attribute in attributes.iter() {
        if let SdpAttribute::MaxMessageSize(max_msg_size) = *attribute {
            return max_msg_size as i64;
        }
    }
    -1
}

#[no_mangle]
pub unsafe extern "C" fn sdp_get_sctp_port(attributes: &Vec<SdpAttribute>) -> i64 {
    for attribute in attributes.iter() {
        if let SdpAttribute::SctpPort(port) = *attribute {
            return port as i64;
        }
    }
    -1
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct RustSdpAttributeFlags {
    pub ice_lite: bool,
    pub rtcp_mux: bool,
    pub rtcp_rsize: bool,
    pub bundle_only: bool,
    pub end_of_candidates: bool,
    pub extmap_allow_mixed: bool,
}

#[no_mangle]
pub extern "C" fn sdp_get_attribute_flags(attributes: &Vec<SdpAttribute>) -> RustSdpAttributeFlags {
    let mut ret = RustSdpAttributeFlags {
        ice_lite: false,
        rtcp_mux: false,
        rtcp_rsize: false,
        bundle_only: false,
        end_of_candidates: false,
        extmap_allow_mixed: false,
    };
    for attribute in attributes.iter() {
        match *attribute {
            SdpAttribute::IceLite => ret.ice_lite = true,
            SdpAttribute::RtcpMux => ret.rtcp_mux = true,
            SdpAttribute::RtcpRsize => ret.rtcp_rsize = true,
            SdpAttribute::BundleOnly => ret.bundle_only = true,
            SdpAttribute::EndOfCandidates => ret.end_of_candidates = true,
            SdpAttribute::ExtmapAllowMixed => ret.extmap_allow_mixed = true,
            _ => (),
        }
    }
    ret
}

#[no_mangle]
pub extern "C" fn sdp_get_mid(attributes: &Vec<SdpAttribute>, ret: &mut StringView) -> nsresult {
    for attribute in attributes.iter() {
        if let SdpAttribute::Mid(ref data) = *attribute {
            *ret = StringView::from(data.as_str());
            return NS_OK;
        }
    }
    NS_ERROR_INVALID_ARG
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct RustSdpAttributeMsid {
    id: StringView,
    appdata: StringView,
}

impl<'a> From<&'a SdpAttributeMsid> for RustSdpAttributeMsid {
    fn from(other: &SdpAttributeMsid) -> Self {
        RustSdpAttributeMsid {
            id: StringView::from(other.id.as_str()),
            appdata: StringView::from(&other.appdata),
        }
    }
}

#[no_mangle]
pub extern "C" fn sdp_get_msids(
    attributes: &Vec<SdpAttribute>,
    ret: &mut ThinVec<RustSdpAttributeMsid>,
) {
    for attribute in attributes.iter() {
        if let SdpAttribute::Msid(ref data) = *attribute {
            ret.push(RustSdpAttributeMsid::from(data));
        }
    }
}

#[repr(C)]
pub struct RustSdpAttributeMsidSemantic {
    pub semantic: StringView,
    pub msids: ThinVec<StringView>,
}

impl<'a> From<&'a SdpAttributeMsidSemantic> for RustSdpAttributeMsidSemantic {
    fn from(other: &SdpAttributeMsidSemantic) -> Self {
        RustSdpAttributeMsidSemantic {
            semantic: StringView::from(other.semantic.as_str()),
            msids: string_views(&other.msids),
        }
    }
}

#[no_mangle]
pub extern "C" fn sdp_get_msid_semantics(
    attributes: &Vec<SdpAttribute>,
    ret: &mut ThinVec<RustSdpAttributeMsidSemantic>,
) {
    for attribute in attributes.iter() {
        if let SdpAttribute::MsidSemantic(ref data) = *attribute {
            ret.push(RustSdpAttributeMsidSemantic::from(data));
        }
    }
}

#[repr(C)]
#[derive(Clone, Copy)]
pub enum RustSdpAttributeGroupSemantic {
    LipSynchronization,
    FlowIdentification,
    SingleReservationFlow,
    AlternateNetworkAddressType,
    ForwardErrorCorrection,
    DecodingDependency,
    Bundle,
}

impl<'a> From<&'a SdpAttributeGroupSemantic> for RustSdpAttributeGroupSemantic {
    fn from(other: &SdpAttributeGroupSemantic) -> Self {
        match *other {
            SdpAttributeGroupSemantic::LipSynchronization => {
                RustSdpAttributeGroupSemantic::LipSynchronization
            }
            SdpAttributeGroupSemantic::FlowIdentification => {
                RustSdpAttributeGroupSemantic::FlowIdentification
            }
            SdpAttributeGroupSemantic::SingleReservationFlow => {
                RustSdpAttributeGroupSemantic::SingleReservationFlow
            }
            SdpAttributeGroupSemantic::AlternateNetworkAddressType => {
                RustSdpAttributeGroupSemantic::AlternateNetworkAddressType
            }
            SdpAttributeGroupSemantic::ForwardErrorCorrection => {
                RustSdpAttributeGroupSemantic::ForwardErrorCorrection
            }
            SdpAttributeGroupSemantic::DecodingDependency => {
                RustSdpAttributeGroupSemantic::DecodingDependency
            }
            SdpAttributeGroupSemantic::Bundle => RustSdpAttributeGroupSemantic::Bundle,
        }
    }
}

#[repr(C)]
pub struct RustSdpAttributeGroup {
    pub semantic: RustSdpAttributeGroupSemantic,
    pub tags: ThinVec<StringView>,
}

impl<'a> From<&'a SdpAttributeGroup> for RustSdpAttributeGroup {
    fn from(other: &SdpAttributeGroup) -> Self {
        RustSdpAttributeGroup {
            semantic: RustSdpAttributeGroupSemantic::from(&other.semantics),
            tags: string_views(&other.tags),
        }
    }
}

#[no_mangle]
pub extern "C" fn sdp_get_groups(
    attributes: &Vec<SdpAttribute>,
    ret: &mut ThinVec<RustSdpAttributeGroup>,
) {
    for attribute in attributes.iter() {
        if let SdpAttribute::Group(ref data) = *attribute {
            ret.push(RustSdpAttributeGroup::from(data));
        }
    }
}

#[repr(C)]
pub struct RustSdpAttributeRtcp {
    pub port: u32,
    pub unicast_addr: RustExplicitlyTypedAddress,
    pub has_address: bool,
}

impl<'a> From<&'a SdpAttributeRtcp> for RustSdpAttributeRtcp {
    fn from(other: &SdpAttributeRtcp) -> Self {
        match other.unicast_addr {
            Some(ref address) => RustSdpAttributeRtcp {
                port: other.port as u32,
                unicast_addr: address.into(),
                has_address: true,
            },
            None => RustSdpAttributeRtcp {
                port: other.port as u32,
                unicast_addr: RustExplicitlyTypedAddress::default(),
                has_address: false,
            },
        }
    }
}

#[no_mangle]
pub extern "C" fn sdp_get_rtcp(
    attributes: &Vec<SdpAttribute>,
    ret: &mut RustSdpAttributeRtcp,
) -> nsresult {
    if let Some(&SdpAttribute::Rtcp(ref data)) =
        get_attribute(attributes.as_slice(), SdpAttributeType::Rtcp)
    {
        *ret = RustSdpAttributeRtcp::from(data);
        return NS_OK;
    }
    NS_ERROR_INVALID_ARG
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct RustSdpAttributeRtcpFb {
    pub payload_type: u32,
    pub feedback_type: u32,
    pub parameter: StringView,
    pub extra: StringView,
}

impl<'a> From<&'a SdpAttributeRtcpFb> for RustSdpAttributeRtcpFb {
    fn from(other: &SdpAttributeRtcpFb) -> Self {
        RustSdpAttributeRtcpFb {
            payload_type: match other.payload_type {
                SdpAttributePayloadType::Wildcard => u32::max_value(),
                SdpAttributePayloadType::PayloadType(x) => x as u32,
            },
            feedback_type: other.feedback_type.clone() as u32,
            parameter: StringView::from(other.parameter.as_str()),
            extra: StringView::from(other.extra.as_str()),
        }
    }
}

#[no_mangle]
pub extern "C" fn sdp_get_rtcpfbs(
    attributes: &Vec<SdpAttribute>,
    ret: &mut ThinVec<RustSdpAttributeRtcpFb>,
) {
    for attribute in attributes.iter() {
        if let SdpAttribute::Rtcpfb(ref data) = *attribute {
            ret.push(RustSdpAttributeRtcpFb::from(data));
        }
    }
}

#[repr(C)]
pub struct RustSdpAttributeImageAttrXyRange {
    // range
    pub min: u32,
    pub max: u32,
    pub step: u32,

    // discrete values
    pub discrete_values: RustSpan<u32>,
}

impl<'a> From<&'a SdpAttributeImageAttrXyRange> for RustSdpAttributeImageAttrXyRange {
    fn from(other: &SdpAttributeImageAttrXyRange) -> Self {
        match other {
            &SdpAttributeImageAttrXyRange::Range(min, max, step) => {
                RustSdpAttributeImageAttrXyRange {
                    min,
                    max,
                    step: step.unwrap_or(1),
                    discrete_values: RustSpan::empty(),
                }
            }
            &SdpAttributeImageAttrXyRange::DiscreteValues(ref discrete_values) => {
                RustSdpAttributeImageAttrXyRange {
                    min: 0,
                    max: 1,
                    step: 1,
                    discrete_values: RustSpan::from_slice(discrete_values.as_slice()),
                }
            }
        }
    }
}

#[repr(C)]
pub struct RustSdpAttributeImageAttrSRange {
    // range
    pub min: c_float,
    pub max: c_float,

    // discrete values
    pub discrete_values: RustSpan<c_float>,
}

impl<'a> From<&'a SdpAttributeImageAttrSRange> for RustSdpAttributeImageAttrSRange {
    fn from(other: &SdpAttributeImageAttrSRange) -> Self {
        match other {
            &SdpAttributeImageAttrSRange::Range(min, max) => RustSdpAttributeImageAttrSRange {
                min,
                max,
                discrete_values: RustSpan::empty(),
            },
            &SdpAttributeImageAttrSRange::DiscreteValues(ref discrete_values) => {
                RustSdpAttributeImageAttrSRange {
                    min: 0.0,
                    max: 1.0,
                    discrete_values: RustSpan::from_slice(discrete_values.as_slice()),
                }
            }
        }
    }
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct RustSdpAttributeImageAttrPRange {
    pub min: c_float,
    pub max: c_float,
}

impl<'a> From<&'a SdpAttributeImageAttrPRange> for RustSdpAttributeImageAttrPRange {
    fn from(other: &SdpAttributeImageAttrPRange) -> Self {
        RustSdpAttributeImageAttrPRange {
            min: other.min,
            max: other.max,
        }
    }
}

#[repr(C)]
pub struct RustSdpAttributeImageAttrSet {
    pub x: RustSdpAttributeImageAttrXyRange,
    pub y: RustSdpAttributeImageAttrXyRange,

    pub has_sar: bool,
    pub sar: RustSdpAttributeImageAttrSRange,

    pub has_par: bool,
    pub par: RustSdpAttributeImageAttrPRange,

    pub q: c_float,
}

impl<'a> From<&'a SdpAttributeImageAttrSet> for RustSdpAttributeImageAttrSet {
    fn from(other: &SdpAttributeImageAttrSet) -> Self {
        RustSdpAttributeImageAttrSet {
            x: RustSdpAttributeImageAttrXyRange::from(&other.x),
            y: RustSdpAttributeImageAttrXyRange::from(&other.y),

            has_sar: other.sar.is_some(),
            sar: match other.sar {
                Some(ref x) => RustSdpAttributeImageAttrSRange::from(x),
                None => RustSdpAttributeImageAttrSRange {
                    min: 0.0,
                    max: 1.0,
                    discrete_values: RustSpan::empty(),
                },
            },

            has_par: other.par.is_some(),
            par: match other.par {
                Some(ref x) => RustSdpAttributeImageAttrPRange::from(x),
                None => RustSdpAttributeImageAttrPRange { min: 0.0, max: 1.0 },
            },

            q: other.q.unwrap_or(0.5),
        }
    }
}

#[repr(C)]
pub struct RustSdpAttributeImageAttrSetList {
    pub is_wildcard: bool,
    pub sets: ThinVec<RustSdpAttributeImageAttrSet>,
}

impl<'a> From<&'a SdpAttributeImageAttrSetList> for RustSdpAttributeImageAttrSetList {
    fn from(other: &SdpAttributeImageAttrSetList) -> Self {
        match other {
            &SdpAttributeImageAttrSetList::Wildcard => RustSdpAttributeImageAttrSetList {
                is_wildcard: true,
                sets: ThinVec::new(),
            },
            &SdpAttributeImageAttrSetList::Sets(ref sets) => RustSdpAttributeImageAttrSetList {
                is_wildcard: false,
                sets: sets
                    .iter()
                    .map(RustSdpAttributeImageAttrSet::from)
                    .collect(),
            },
        }
    }
}

#[repr(C)]
pub struct RustSdpAttributeImageAttr {
    pub pt: u32,
    pub send: RustSdpAttributeImageAttrSetList,
    pub recv: RustSdpAttributeImageAttrSetList,
}

impl<'a> From<&'a SdpAttributeImageAttr> for RustSdpAttributeImageAttr {
    fn from(other: &SdpAttributeImageAttr) -> Self {
        RustSdpAttributeImageAttr {
            pt: match other.pt {
                SdpAttributePayloadType::Wildcard => u32::max_value(),
                SdpAttributePayloadType::PayloadType(x) => x as u32,
            },
            send: RustSdpAttributeImageAttrSetList::from(&other.send),
            recv: RustSdpAttributeImageAttrSetList::from(&other.recv),
        }
    }
}

#[no_mangle]
pub extern "C" fn sdp_get_imageattrs(
    attributes: &Vec<SdpAttribute>,
    ret: &mut ThinVec<RustSdpAttributeImageAttr>,
) {
    for attribute in attributes.iter() {
        if let SdpAttribute::ImageAttr(ref data) = *attribute {
            ret.push(RustSdpAttributeImageAttr::from(data));
        }
    }
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct RustSdpAttributeSctpmap {
    pub port: u32,
    pub channels: u32,
}

impl<'a> From<&'a SdpAttributeSctpmap> for RustSdpAttributeSctpmap {
    fn from(other: &SdpAttributeSctpmap) -> Self {
        RustSdpAttributeSctpmap {
            port: other.port as u32,
            channels: other.channels,
        }
    }
}

#[no_mangle]
pub extern "C" fn sdp_get_sctpmaps(
    attributes: &Vec<SdpAttribute>,
    ret: &mut ThinVec<RustSdpAttributeSctpmap>,
) {
    for attribute in attributes.iter() {
        if let SdpAttribute::Sctpmap(ref data) = *attribute {
            ret.push(RustSdpAttributeSctpmap::from(data));
        }
    }
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct RustSdpAttributeSimulcastId {
    pub id: StringView,
    pub paused: bool,
}

impl<'a> From<&'a SdpAttributeSimulcastId> for RustSdpAttributeSimulcastId {
    fn from(other: &SdpAttributeSimulcastId) -> Self {
        RustSdpAttributeSimulcastId {
            id: StringView::from(other.id.as_str()),
            paused: other.paused,
        }
    }
}

#[repr(C)]
pub struct RustSdpAttributeSimulcastVersion {
    pub ids: ThinVec<RustSdpAttributeSimulcastId>,
}

impl<'a> From<&'a SdpAttributeSimulcastVersion> for RustSdpAttributeSimulcastVersion {
    fn from(other: &SdpAttributeSimulcastVersion) -> Self {
        RustSdpAttributeSimulcastVersion {
            ids: other
                .ids
                .iter()
                .map(RustSdpAttributeSimulcastId::from)
                .collect(),
        }
    }
}

#[repr(C)]
pub struct RustSdpAttributeSimulcast {
    pub send: ThinVec<RustSdpAttributeSimulcastVersion>,
    pub receive: ThinVec<RustSdpAttributeSimulcastVersion>,
}

impl<'a> From<&'a SdpAttributeSimulcast> for RustSdpAttributeSimulcast {
    fn from(other: &SdpAttributeSimulcast) -> Self {
        RustSdpAttributeSimulcast {
            send: other
                .send
                .iter()
                .map(RustSdpAttributeSimulcastVersion::from)
                .collect(),
            receive: other
                .receive
                .iter()
                .map(RustSdpAttributeSimulcastVersion::from)
                .collect(),
        }
    }
}

#[no_mangle]
pub extern "C" fn sdp_get_simulcast(
    attributes: &Vec<SdpAttribute>,
    ret: &mut RustSdpAttributeSimulcast,
) -> nsresult {
    if let Some(&SdpAttribute::Simulcast(ref data)) =
        get_attribute(attributes.as_slice(), SdpAttributeType::Simulcast)
    {
        *ret = RustSdpAttributeSimulcast::from(data);
        return NS_OK;
    }
    NS_ERROR_INVALID_ARG
}

#[repr(C)]
#[derive(Clone, Copy)]
pub enum RustDirection {
    Recvonly,
    Sendonly,
    Sendrecv,
    Inactive,
}

impl<'a> From<&'a Option<SdpAttributeDirection>> for RustDirection {
    fn from(other: &Option<SdpAttributeDirection>) -> Self {
        match *other {
            Some(ref direction) => match *direction {
                SdpAttributeDirection::Recvonly => RustDirection::Recvonly,
                SdpAttributeDirection::Sendonly => RustDirection::Sendonly,
                SdpAttributeDirection::Sendrecv => RustDirection::Sendrecv,
            },
            None => RustDirection::Inactive,
        }
    }
}

#[no_mangle]
pub extern "C" fn sdp_get_direction(attributes: &Vec<SdpAttribute>) -> RustDirection {
    for attribute in attributes.iter() {
        match *attribute {
            SdpAttribute::Recvonly => return RustDirection::Recvonly,
            SdpAttribute::Sendonly => return RustDirection::Sendonly,
            SdpAttribute::Sendrecv => return RustDirection::Sendrecv,
            SdpAttribute::Inactive => return RustDirection::Inactive,
            _ => (),
        }
    }
    RustDirection::Sendrecv
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct RustSdpAttributeRemoteCandidate {
    pub component: u32,
    pub address: RustAddress,
    pub port: u32,
}

impl<'a> From<&'a SdpAttributeRemoteCandidate> for RustSdpAttributeRemoteCandidate {
    fn from(other: &SdpAttributeRemoteCandidate) -> Self {
        RustSdpAttributeRemoteCandidate {
            component: other.component,
            address: RustAddress::from(&other.address),
            port: other.port,
        }
    }
}

#[no_mangle]
pub extern "C" fn sdp_get_remote_candidates(
    attributes: &Vec<SdpAttribute>,
    ret: &mut ThinVec<RustSdpAttributeRemoteCandidate>,
) {
    for attribute in attributes.iter() {
        if let SdpAttribute::RemoteCandidate(ref data) = *attribute {
            ret.push(RustSdpAttributeRemoteCandidate::from(data));
        }
    }
}

#[no_mangle]
pub extern "C" fn sdp_get_candidates(
    attributes: &Vec<SdpAttribute>,
    ret: &mut ThinVec<nsstring::nsCString>,
) {
    for attribute in attributes.iter() {
        if let SdpAttribute::Candidate(ref attr) = *attribute {
            ret.push(nsstring::nsCString::from(attr.to_string()));
        }
    }
}

#[repr(C)]
pub struct RustSdpAttributeRidParameters {
    pub max_width: u32,
    pub max_height: u32,
    pub max_fps: u32,
    pub max_fs: u32,
    pub max_br: u32,
    pub max_pps: u32,
    pub unknown: ThinVec<StringView>,
}

impl<'a> From<&'a SdpAttributeRidParameters> for RustSdpAttributeRidParameters {
    fn from(other: &SdpAttributeRidParameters) -> Self {
        RustSdpAttributeRidParameters {
            max_width: other.max_width,
            max_height: other.max_height,
            max_fps: other.max_fps,
            max_fs: other.max_fs,
            max_br: other.max_br,
            max_pps: other.max_pps,
            unknown: string_views(&other.unknown),
        }
    }
}

#[repr(C)]
pub struct RustSdpAttributeRid {
    pub id: StringView,
    pub direction: u32,
    pub formats: RustSpan<u16>,
    pub params: RustSdpAttributeRidParameters,
    pub depends: ThinVec<StringView>,
}

impl<'a> From<&'a SdpAttributeRid> for RustSdpAttributeRid {
    fn from(other: &SdpAttributeRid) -> Self {
        RustSdpAttributeRid {
            id: StringView::from(other.id.as_str()),
            direction: other.direction.clone() as u32,
            formats: RustSpan::from_slice(other.formats.as_slice()),
            params: RustSdpAttributeRidParameters::from(&other.params),
            depends: string_views(&other.depends),
        }
    }
}

#[no_mangle]
pub extern "C" fn sdp_get_rids(
    attributes: &Vec<SdpAttribute>,
    ret: &mut ThinVec<RustSdpAttributeRid>,
) {
    for attribute in attributes.iter() {
        if let SdpAttribute::Rid(ref data) = *attribute {
            ret.push(RustSdpAttributeRid::from(data));
        }
    }
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct RustSdpAttributeExtmap {
    pub id: u16,
    pub direction_specified: bool,
    pub direction: RustDirection,
    pub url: StringView,
    pub extension_attributes: StringView,
}

impl<'a> From<&'a SdpAttributeExtmap> for RustSdpAttributeExtmap {
    fn from(other: &SdpAttributeExtmap) -> Self {
        let dir = if other.direction.is_some() {
            RustDirection::from(&other.direction)
        } else {
            RustDirection::from(&Some(SdpAttributeDirection::Sendrecv))
        };
        RustSdpAttributeExtmap {
            id: other.id as u16,
            direction_specified: other.direction.is_some(),
            direction: dir,
            url: StringView::from(other.url.as_str()),
            extension_attributes: StringView::from(&other.extension_attributes),
        }
    }
}

#[no_mangle]
pub extern "C" fn sdp_get_extmaps(
    attributes: &Vec<SdpAttribute>,
    ret: &mut ThinVec<RustSdpAttributeExtmap>,
) {
    for attribute in attributes.iter() {
        if let SdpAttribute::Extmap(ref data) = *attribute {
            ret.push(RustSdpAttributeExtmap::from(data));
        }
    }
}
