/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "GmpVideoCodec.h"

#include "WebrtcGmpVideoCodec.h"

namespace mozilla {

std::unique_ptr<WebrtcVideoEncoder> GmpVideoCodec::CreateEncoder(
    const webrtc::SdpVideoFormat& aFormat, std::string aPCHandle) {
  return std::make_unique<WebrtcVideoEncoderProxy>(
      MakeRefPtr<WebrtcGmpVideoEncoder>(aFormat, std::move(aPCHandle)));
}

std::unique_ptr<WebrtcVideoDecoder> GmpVideoCodec::CreateDecoder(
    std::string aPCHandle, TrackingId aTrackingId) {
  return std::make_unique<WebrtcVideoDecoderProxy>(std::move(aPCHandle),
                                                   std::move(aTrackingId));
}

}  // namespace mozilla
