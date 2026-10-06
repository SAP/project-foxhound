/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MEDIA_DATA_CODEC_H_
#define MEDIA_DATA_CODEC_H_

#include <memory>

#include "MediaCodecsSupport.h"
#include "PerformanceRecorder.h"
#include "api/video/video_codec_type.h"
#include "api/video_codecs/sdp_video_format.h"

namespace mozilla {

class EncoderConfig;
class WebrtcVideoDecoder;
class WebrtcVideoEncoder;
class MediaDataCodec {
 public:
  /**
   * Return whether the codec given by aFormat is supported for encoding.
   */
  static media::EncodeSupportSet SupportsEncoderCodec(
      const webrtc::SdpVideoFormat& aFormat);

  /**
   * Return whether the codec as described in the passed EncoderConfig
   * is supported for encoding. Uses PEMFactory::Supports().
   */
  static media::EncodeSupportSet SupportsEncoderCodec(
      const EncoderConfig& aConfig);

  /**
   * Create encoder object for codec format |aFormat|. Return |nullptr| when
   * failed.
   */
  static std::unique_ptr<WebrtcVideoEncoder> CreateEncoder(
      const webrtc::SdpVideoFormat& aFormat);

  /**
   * Mime-level support check. For the deeper check used by
   * MediaCapabilities, see WebrtcMediaDataDecoder::Supports.
   */
  static media::DecodeSupportSet SupportsDecoderCodec(
      webrtc::VideoCodecType aCodecType);

  /**
   * Create decoder object for codec type |aCodecType|. Return |nullptr| when
   * failed.
   */
  static std::unique_ptr<WebrtcVideoDecoder> CreateDecoder(
      webrtc::VideoCodecType aCodecType, TrackingId aTrackingId);
};
}  // namespace mozilla

#endif  // MEDIA_DATA_CODEC_H_
