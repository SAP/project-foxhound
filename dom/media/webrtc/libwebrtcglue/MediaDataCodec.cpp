/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "MediaDataCodec.h"

#include "PDMFactorySupport.h"
#include "PEMFactory.h"
#include "WebrtcGmpVideoCodec.h"
#include "WebrtcMediaDataDecoderCodec.h"
#include "WebrtcMediaDataEncoderCodec.h"
#include "mozilla/StaticPrefs_media.h"

namespace mozilla {

/* static */
media::EncodeSupportSet MediaDataCodec::SupportsEncoderCodec(
    const webrtc::SdpVideoFormat& aFormat) {
  const auto codecType = webrtc::PayloadStringToCodecType(aFormat.name);
  auto support = WebrtcMediaDataEncoder::SupportsCodec(codecType);
  if (codecType == webrtc::VideoCodecType::kVideoCodecH264 &&
      !StaticPrefs::media_webrtc_hw_h264_enabled()) {
    support -= media::EncodeSupport::HardwareEncode;
  }
  return support;
}

/* static */
media::EncodeSupportSet MediaDataCodec::SupportsEncoderCodec(
    const EncoderConfig& aConfig) {
  // Mirror WebrtcMediaDataEncoder::SupportsCodec's gate; bug 1980201 tracks
  // adding the remaining codecs (AV1, HEVC) and will let both copies go.
  if (aConfig.mCodec != CodecType::H264 && aConfig.mCodec != CodecType::VP8 &&
      aConfig.mCodec != CodecType::VP9) {
    return {};
  }
  auto support = MakeRefPtr<PEMFactory>()->Supports(aConfig);
  if (aConfig.mCodec == CodecType::H264 &&
      !StaticPrefs::media_webrtc_hw_h264_enabled()) {
    support -= media::EncodeSupport::HardwareEncode;
  }
  return support;
}

/* static */
std::unique_ptr<WebrtcVideoEncoder> MediaDataCodec::CreateEncoder(
    const webrtc::SdpVideoFormat& aFormat) {
  if (SupportsEncoderCodec(aFormat).isEmpty()) {
    return nullptr;
  }
  return std::make_unique<WebrtcVideoEncoderProxy>(
      MakeRefPtr<WebrtcMediaDataEncoder>(aFormat));
}

static inline nsDependentCString MimeTypeFor(
    webrtc::VideoCodecType aCodecType) {
  switch (aCodecType) {
    case webrtc::VideoCodecType::kVideoCodecVP8:
      return nsDependentCString("video/vp8");
    case webrtc::VideoCodecType::kVideoCodecVP9:
      return nsDependentCString("video/vp9");
    case webrtc::VideoCodecType::kVideoCodecH264:
      return nsDependentCString("video/avc");
    case webrtc::VideoCodecType::kVideoCodecGeneric:
    case webrtc::VideoCodecType::kVideoCodecAV1:
    case webrtc::VideoCodecType::kVideoCodecH265:
      break;
  }
  return nsDependentCString("");
}

/* static */
media::DecodeSupportSet MediaDataCodec::SupportsDecoderCodec(
    webrtc::VideoCodecType aCodecType) {
  if (!WebrtcMediaDataDecoder::IsCodecEnabled(aCodecType)) {
    return {};
  }
  media::DecodeSupportSet support =
      PDMFactorySupport::IsTypeSupported(MimeTypeFor(aCodecType));
  if (aCodecType == webrtc::VideoCodecType::kVideoCodecH264 &&
      !StaticPrefs::media_webrtc_hw_h264_enabled()) {
    support -= media::DecodeSupport::HardwareDecode;
  }
  return support;
}

std::unique_ptr<WebrtcVideoDecoder> MediaDataCodec::CreateDecoder(
    webrtc::VideoCodecType aCodecType, TrackingId aTrackingId) {
  if (SupportsDecoderCodec(aCodecType).isEmpty()) {
    return nullptr;
  }
  nsDependentCString codec = MimeTypeFor(aCodecType);
  return std::make_unique<WebrtcMediaDataDecoder>(codec, aTrackingId);
}

}  // namespace mozilla
