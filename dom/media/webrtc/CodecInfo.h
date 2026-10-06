/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#ifndef DOM_MEDIA_WEBRTC_WEBRTCCODECINFO_H_
#define DOM_MEDIA_WEBRTC_WEBRTCCODECINFO_H_

#include <memory>

#include "MediaCodecsSupport.h"

namespace mozilla {
class EncoderConfig;
class MediaExtendedMIMEType;
struct SupportDecoderParams;

// Query the webrtc decoder factory whether the SupportDecoderParams are
// supported in SW and/or HW.
[[nodiscard]] media::DecodeSupportSet SupportsVideoDecodeForWebrtc(
    const MediaExtendedMIMEType& aMime, const SupportDecoderParams& aParams);
// Query the webrtc encoder factory whether the EncoderConfig is supported in SW
// and/or HW.
[[nodiscard]] media::EncodeSupportSet SupportsVideoEncodeForWebrtc(
    const EncoderConfig& aConfig);

// Interface for querying WebRTC codec support and hardware acceleration.
//
// Thread-safe class that samples (static) preferences and gfxVars on creation,
// then makes them available immutably.
//
// The instance caches codec lists based on prefs and hardware flags at
// construction time.
class WebrtcCodecInfo {
 public:
  virtual ~WebrtcCodecInfo() = default;

  // Factory method. Samples preferences and gfxVars.
  [[nodiscard]] static std::unique_ptr<WebrtcCodecInfo> Create();

  // Query the cache if specific MIME type is supported for encoding/decoding.
  [[nodiscard]] virtual bool CheckEncodeType(
      const MediaExtendedMIMEType& aMime) const = 0;
  [[nodiscard]] virtual bool CheckDecodeType(
      const MediaExtendedMIMEType& aMime) const = 0;
};

}  // namespace mozilla
#endif  // DOM_MEDIA_WEBRTC_WEBRTCCODECINFO_H_
