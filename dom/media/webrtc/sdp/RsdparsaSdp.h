/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_MEDIA_WEBRTC_SDP_RSDPARSASDP_H_
#define DOM_MEDIA_WEBRTC_SDP_RSDPARSASDP_H_

#include "mozilla/UniquePtr.h"
#include "sdp/RsdparsaSdpAttributeList.h"
#include "sdp/RsdparsaSdpGlue.h"
#include "sdp/RsdparsaSdpInc.h"
#include "sdp/RsdparsaSdpMediaSection.h"
#include "sdp/Sdp.h"

namespace mozilla {

class RsdparsaSdpParser;
class SdpParser;

class RsdparsaSdp final : public Sdp {
  friend class RsdparsaSdpParser;

 public:
  explicit RsdparsaSdp(RsdparsaSessionHandle session, const SdpOrigin& origin);

  UniquePtr<Sdp> Clone() const override;

  const SdpOrigin& GetOrigin() const override;

  // Note: connection information is always retrieved from media sections
  uint32_t GetBandwidth(const std::string& type) const override;

  size_t GetMediaSectionCount() const override {
    return sdp_media_section_count(mSession.get());
  }

  const SdpAttributeList& GetAttributeList() const override {
    return *mAttributeList;
  }

  SdpAttributeList& GetAttributeList() override { return *mAttributeList; }

  const SdpMediaSection& GetMediaSection(size_t level) const override;

  SdpMediaSection& GetMediaSection(size_t level) override;

  SdpMediaSection& AddMediaSection(const SdpMediaSection::MediaType media,
                                   const SdpDirectionAttribute::Direction dir,
                                   const uint16_t port,
                                   const SdpMediaSection::Protocol proto,
                                   const sdp::AddrType addrType,
                                   const std::string& addr) override;

  void Serialize(std::ostream&) const override;

 private:
  RsdparsaSdp() : mOrigin("", 0, 0, sdp::kIPv4, "") {}
  RsdparsaSdp(const RsdparsaSdp& aOrig);

  RsdparsaSessionHandle mSession;
  SdpOrigin mOrigin;
  UniquePtr<RsdparsaSdpAttributeList> mAttributeList;
  std::vector<UniquePtr<RsdparsaSdpMediaSection>> mMediaSections;
};

}  // namespace mozilla

#endif
