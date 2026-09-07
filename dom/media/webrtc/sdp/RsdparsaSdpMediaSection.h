/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_MEDIA_WEBRTC_SDP_RSDPARSASDPMEDIASECTION_H_
#define DOM_MEDIA_WEBRTC_SDP_RSDPARSASDPMEDIASECTION_H_

#include "mozilla/UniquePtr.h"
#include "sdp/RsdparsaSdpAttributeList.h"
#include "sdp/RsdparsaSdpGlue.h"
#include "sdp/RsdparsaSdpInc.h"
#include "sdp/SdpMediaSection.h"

namespace mozilla {

class RsdparsaSdp;
class SdpParser;

class RsdparsaSdpMediaSection final : public SdpMediaSection {
  friend class RsdparsaSdp;

 public:
  ~RsdparsaSdpMediaSection() = default;

  MediaType GetMediaType() const override { return mMediaType; }

  unsigned int GetPort() const override;
  void SetPort(const unsigned int port) override;
  unsigned int GetPortCount() const override;
  Protocol GetProtocol() const override;
  const SdpConnection& GetConnection() const override;
  SdpConnection& GetConnection() override;
  uint32_t GetBandwidth(const std::string& type) const override;
  const std::vector<std::string>& GetFormats() const override;

  const SdpAttributeList& GetAttributeList() const override;
  SdpAttributeList& GetAttributeList() override;
  SdpDirectionAttribute GetDirectionAttribute() const override;

  void AddCodec(const std::string& pt, const std::string& name,
                const uint32_t clockrate, const uint16_t channels) override;
  void ClearCodecs() override;

  void AddDataChannel(const std::string& name, const uint16_t port,
                      const uint16_t streams,
                      const uint32_t message_size) override;

  void Serialize(std::ostream&) const override;

 private:
  RsdparsaSdpMediaSection(size_t level, RsdparsaSessionHandle session,
                          const RsdparsaSdpAttributeList* sessionLevel);

  using RustMediaSection = sdp::ffi::SdpMedia;
  RustMediaSection* GetSection() const;

  void LoadFormats();
  void LoadConnection();

  RsdparsaSessionHandle mSession;

  MediaType mMediaType;
  std::vector<std::string> mFormats;

  UniquePtr<SdpConnection> mConnection;

  UniquePtr<RsdparsaSdpAttributeList> mAttributeList;
};
}  // namespace mozilla

#endif
