/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "sdp/RsdparsaSdpMediaSection.h"

#include <ostream>

#include "mozilla/Assertions.h"
#include "nsString.h"
#include "sdp/RsdparsaSdpGlue.h"
#include "sdp/RsdparsaSdpInc.h"
#include "sdp/SdpMediaSection.h"

#ifdef CRLF
#  undef CRLF
#endif
#define CRLF "\r\n"

namespace mozilla {

namespace ffi = mozilla::sdp::ffi;
using ffi::RustSdpConnection;
using ffi::RustSdpFormatType;
using ffi::RustSdpMediaValue;
using ffi::RustSdpProtocolValue;
using ffi::StringView;

auto RsdparsaSdpMediaSection::GetSection() const -> RustMediaSection* {
  auto* section = sdp_get_media_section(mSession.get(), GetLevel());
  MOZ_RELEASE_ASSERT(section);
  return section;
}

RsdparsaSdpMediaSection::RsdparsaSdpMediaSection(
    size_t level, RsdparsaSessionHandle session,
    const RsdparsaSdpAttributeList* sessionLevel)
    : SdpMediaSection(level), mSession(std::move(session)) {
  RustMediaSection* section = GetSection();
  switch (sdp_rust_get_media_type(section)) {
    case RustSdpMediaValue::Audio:
      mMediaType = kAudio;
      break;
    case RustSdpMediaValue::Video:
      mMediaType = kVideo;
      break;
    case RustSdpMediaValue::Application:
      mMediaType = kApplication;
      break;
  }

  RsdparsaSessionHandle attributeSession(sdp_new_reference(mSession.get()));
  mAttributeList.reset(new RsdparsaSdpAttributeList(std::move(attributeSession),
                                                    section, sessionLevel));

  LoadFormats();
  LoadConnection();
}

unsigned int RsdparsaSdpMediaSection::GetPort() const {
  return sdp_get_media_port(GetSection());
}

void RsdparsaSdpMediaSection::SetPort(const unsigned int port) {
  sdp_set_media_port(GetSection(), port);
}

unsigned int RsdparsaSdpMediaSection::GetPortCount() const {
  return sdp_get_media_port_count(GetSection());
}

SdpMediaSection::Protocol RsdparsaSdpMediaSection::GetProtocol() const {
  switch (sdp_get_media_protocol(GetSection())) {
    case RustSdpProtocolValue::RtpSavpf:
      return kRtpSavpf;
    case RustSdpProtocolValue::UdpTlsRtpSavp:
      return kUdpTlsRtpSavp;
    case RustSdpProtocolValue::TcpDtlsRtpSavp:
      return kTcpDtlsRtpSavp;
    case RustSdpProtocolValue::UdpTlsRtpSavpf:
      return kUdpTlsRtpSavpf;
    case RustSdpProtocolValue::TcpDtlsRtpSavpf:
      return kTcpDtlsRtpSavpf;
    case RustSdpProtocolValue::DtlsSctp:
      return kDtlsSctp;
    case RustSdpProtocolValue::UdpDtlsSctp:
      return kUdpDtlsSctp;
    case RustSdpProtocolValue::TcpDtlsSctp:
      return kTcpDtlsSctp;
    case RustSdpProtocolValue::RtpAvp:
      return kRtpAvp;
    case RustSdpProtocolValue::RtpAvpf:
      return kRtpAvpf;
    case RustSdpProtocolValue::RtpSavp:
      return kRtpSavp;
  }
  MOZ_CRASH("invalid media protocol");
}

const SdpConnection& RsdparsaSdpMediaSection::GetConnection() const {
  MOZ_ASSERT(mConnection);
  return *mConnection;
}

SdpConnection& RsdparsaSdpMediaSection::GetConnection() {
  MOZ_ASSERT(mConnection);
  return *mConnection;
}

uint32_t RsdparsaSdpMediaSection::GetBandwidth(const std::string& type) const {
  nsDependentCString bwType(type.data(), type.size());
  return sdp_get_media_bandwidth(GetSection(), &bwType);
}

const std::vector<std::string>& RsdparsaSdpMediaSection::GetFormats() const {
  return mFormats;
}

const SdpAttributeList& RsdparsaSdpMediaSection::GetAttributeList() const {
  return *mAttributeList;
}

SdpAttributeList& RsdparsaSdpMediaSection::GetAttributeList() {
  return *mAttributeList;
}

SdpDirectionAttribute RsdparsaSdpMediaSection::GetDirectionAttribute() const {
  return SdpDirectionAttribute(mAttributeList->GetDirection());
}

void RsdparsaSdpMediaSection::AddCodec(const std::string& pt,
                                       const std::string& name,
                                       const uint32_t clockrate,
                                       const uint16_t channels) {
  StringView rustName{reinterpret_cast<const uint8_t*>(name.data()),
                      name.size()};

  // call the rust interface
  auto nr = sdp_media_add_codec(GetSection(), std::stoul(pt), rustName,
                                clockrate, channels);

  if (NS_SUCCEEDED(nr)) {
    // If the rust call was successful, adjust the shadow C++ structures
    mFormats.push_back(pt);

    // Add a rtpmap in mAttributeList
    auto rtpmap = MakeUnique<SdpRtpmapAttributeList>();
    if (mAttributeList->HasAttribute(SdpAttribute::kRtpmapAttribute)) {
      const SdpRtpmapAttributeList& old = mAttributeList->GetRtpmap();
      for (auto it = old.mRtpmaps.begin(); it != old.mRtpmaps.end(); ++it) {
        rtpmap->mRtpmaps.push_back(*it);
      }
    }

    SdpRtpmapAttributeList::CodecType codec =
        SdpRtpmapAttributeList::kOtherCodec;
    if (name == "opus") {
      codec = SdpRtpmapAttributeList::kOpus;
    } else if (name == "VP8") {
      codec = SdpRtpmapAttributeList::kVP8;
    } else if (name == "VP9") {
      codec = SdpRtpmapAttributeList::kVP9;
    } else if (name == "H264") {
      codec = SdpRtpmapAttributeList::kH264;
    }

    rtpmap->PushEntry(pt, codec, name, clockrate, channels);
    mAttributeList->SetAttribute(std::move(rtpmap));
  }
}

void RsdparsaSdpMediaSection::ClearCodecs() {
  // Clear the codecs in rust
  sdp_media_clear_codecs(GetSection());

  mFormats.clear();
  mAttributeList->RemoveAttribute(SdpAttribute::kRtpmapAttribute);
  mAttributeList->RemoveAttribute(SdpAttribute::kFmtpAttribute);
  mAttributeList->RemoveAttribute(SdpAttribute::kSctpmapAttribute);
  mAttributeList->RemoveAttribute(SdpAttribute::kRtcpFbAttribute);
}

void RsdparsaSdpMediaSection::AddDataChannel(const std::string& name,
                                             const uint16_t port,
                                             const uint16_t streams,
                                             const uint32_t message_size) {
  StringView rustName{reinterpret_cast<const uint8_t*>(name.data()),
                      name.size()};
  auto nr = sdp_media_add_datachannel(GetSection(), rustName, port, streams,
                                      message_size);
  if (NS_SUCCEEDED(nr)) {
    // Update the formats
    mFormats.clear();
    LoadFormats();

    // Update the attribute list
    RsdparsaSessionHandle sessHandle(sdp_new_reference(mSession.get()));
    auto sessAttributes = mAttributeList->mSessionAttributes;
    mAttributeList.reset(new RsdparsaSdpAttributeList(
        std::move(sessHandle), GetSection(), sessAttributes));
  }
}

void RsdparsaSdpMediaSection::Serialize(std::ostream& os) const {
  os << "m=" << mMediaType << " " << GetPort();
  if (GetPortCount()) {
    os << "/" << GetPortCount();
  }
  os << " " << GetProtocol();
  for (auto i = mFormats.begin(); i != mFormats.end(); ++i) {
    os << " " << (*i);
  }
  os << CRLF;

  // We don't do i=

  if (mConnection) {
    os << *mConnection;
  }

  nsAutoCString bwString;
  sdp_serialize_bandwidth(sdp_get_media_bandwidth_vec(GetSection()), &bwString);
  os << bwString.get();

  // We don't do k= because they're evil

  os << *mAttributeList;
}

void RsdparsaSdpMediaSection::LoadFormats() {
  RustSdpFormatType formatType = sdp_get_format_type(GetSection());
  if (formatType == RustSdpFormatType::Integers) {
    for (uint32_t val : convertRustSpan(sdp_get_format_u32_vec(GetSection()))) {
      mFormats.push_back(std::to_string(val));
    }
  } else {
    AutoTArray<StringView, 8> formats;
    sdp_get_format_string_vec(GetSection(), &formats);
    for (const auto& view : formats) {
      mFormats.emplace_back(convertStringView(view));
    }
  }
}

UniquePtr<SdpConnection> convertRustConnection(const RustSdpConnection conn) {
  auto address = convertExplicitlyTypedAddress(conn.addr);
  return MakeUnique<SdpConnection>(address.first, address.second, conn.ttl,
                                   conn.amount);
}

void RsdparsaSdpMediaSection::LoadConnection() {
  RustSdpConnection conn;
  nsresult nr;
  if (sdp_media_has_connection(GetSection())) {
    nr = sdp_get_media_connection(GetSection(), &conn);
    if (NS_SUCCEEDED(nr)) {
      mConnection = convertRustConnection(conn);
    }
  } else if (sdp_session_has_connection(mSession.get())) {
    nr = sdp_get_session_connection(mSession.get(), &conn);
    if (NS_SUCCEEDED(nr)) {
      mConnection = convertRustConnection(conn);
    }
  }
}

}  // namespace mozilla
