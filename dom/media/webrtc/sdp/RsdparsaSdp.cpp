/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "sdp/RsdparsaSdp.h"

#include "mozilla/Assertions.h"
#include "nsError.h"
#include "nsString.h"
#include "sdp/RsdparsaSdpInc.h"
#include "sdp/RsdparsaSdpMediaSection.h"

#ifdef CRLF
#  undef CRLF
#endif
#define CRLF "\r\n"

namespace mozilla {

namespace ffi = mozilla::sdp::ffi;

RsdparsaSdp::RsdparsaSdp(RsdparsaSessionHandle session, const SdpOrigin& origin)
    : mSession(std::move(session)), mOrigin(origin) {
  RsdparsaSessionHandle attributeSession(sdp_new_reference(mSession.get()));
  mAttributeList.reset(
      new RsdparsaSdpAttributeList(std::move(attributeSession)));

  size_t section_count = sdp_media_section_count(mSession.get());
  for (size_t level = 0; level < section_count; level++) {
    RsdparsaSessionHandle newSession(sdp_new_reference(mSession.get()));
    auto* sdpMediaSection = new RsdparsaSdpMediaSection(
        level, std::move(newSession), mAttributeList.get());
    mMediaSections.emplace_back(sdpMediaSection);
  }
}

RsdparsaSdp::RsdparsaSdp(const RsdparsaSdp& aOrig)
    : RsdparsaSdp(RsdparsaSessionHandle(create_sdp_clone(aOrig.mSession.get())),
                  aOrig.mOrigin) {}

UniquePtr<Sdp> RsdparsaSdp::Clone() const {
  return WrapUnique(new RsdparsaSdp(*this));
}

const SdpOrigin& RsdparsaSdp::GetOrigin() const { return mOrigin; }

uint32_t RsdparsaSdp::GetBandwidth(const std::string& type) const {
  nsDependentCString bwType(type.data(), type.size());
  return get_sdp_bandwidth(mSession.get(), &bwType);
}

const SdpMediaSection& RsdparsaSdp::GetMediaSection(size_t level) const {
  MOZ_RELEASE_ASSERT(mMediaSections.size() > level);
  return *mMediaSections[level];
}

SdpMediaSection& RsdparsaSdp::GetMediaSection(size_t level) {
  MOZ_RELEASE_ASSERT(mMediaSections.size() > level);
  return *mMediaSections[level];
}

SdpMediaSection& RsdparsaSdp::AddMediaSection(
    const SdpMediaSection::MediaType mediaType,
    const SdpDirectionAttribute::Direction dir, const uint16_t port,
    const SdpMediaSection::Protocol protocol, const sdp::AddrType addrType,
    const std::string& addr) {
  sdp::ffi::StringView rustAddr{reinterpret_cast<const uint8_t*>(addr.c_str()),
                                addr.size()};
  auto nr = sdp_add_media_section(mSession.get(), mediaType, dir, port,
                                  protocol, addrType, rustAddr);

  if (NS_SUCCEEDED(nr)) {
    size_t level = mMediaSections.size();
    RsdparsaSessionHandle newSessHandle(sdp_new_reference(mSession.get()));

    auto* mediaSection = new RsdparsaSdpMediaSection(
        level, std::move(newSessHandle), mAttributeList.get());
    mMediaSections.emplace_back(mediaSection);

    return *mediaSection;
  } else {
    // Return the last media section if the construction of this one fails
    return GetMediaSection(mMediaSections.size() - 1);
  }
}

void RsdparsaSdp::Serialize(std::ostream& os) const {
  os << "v=0" << CRLF << mOrigin << "s=-" << CRLF;

  // We don't support creating i=, u=, e=, p=
  // We don't generate c= at the session level (only in media)

  nsAutoCString bwString;
  sdp_serialize_bandwidth(sdp_get_session_bandwidth_vec(mSession.get()),
                          &bwString);
  os << bwString.get();

  os << "t=0 0" << CRLF;

  // We don't support r= or z=

  // attributes
  os << *mAttributeList;

  // media sections
  for (const auto& msection : mMediaSections) {
    os << *msection;
  }
}

}  // namespace mozilla
