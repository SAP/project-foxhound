/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "MatroskaDemuxer.h"

#include "AOMDecoder.h"
#include "H264.h"
#include "H265.h"
#include "VPXDecoder.h"
#include "XiphExtradata.h"
#include "mozilla/glean/DomMediaMetrics.h"

namespace mozilla {

extern LazyLogModule gMediaDemuxerLog;
#define MKV_DEBUG(msg, ...) \
  MOZ_LOG_FMT(gMediaDemuxerLog, LogLevel::Debug, msg, ##__VA_ARGS__)

static void ReportCodecUsage(int aCodec) {
  MKV_DEBUG("ReportCodecUsage, codec: {}", aCodec);
  switch (aCodec) {
    case NESTEGG_CODEC_AV1:
      mozilla::glean::media::mkv_codec_type
          .EnumGet(mozilla::glean::media::MkvCodecTypeLabel::eVideoav1)
          .Add();
      break;
    case NESTEGG_CODEC_AVC:
      mozilla::glean::media::mkv_codec_type
          .EnumGet(mozilla::glean::media::MkvCodecTypeLabel::eVideoavc)
          .Add();
      break;
    case NESTEGG_CODEC_HEVC:
      mozilla::glean::media::mkv_codec_type
          .EnumGet(mozilla::glean::media::MkvCodecTypeLabel::eVideohevc)
          .Add();
      break;
    case NESTEGG_CODEC_VP8:
      mozilla::glean::media::mkv_codec_type
          .EnumGet(mozilla::glean::media::MkvCodecTypeLabel::eVideovp8)
          .Add();
      break;
    case NESTEGG_CODEC_VP9:
      mozilla::glean::media::mkv_codec_type
          .EnumGet(mozilla::glean::media::MkvCodecTypeLabel::eVideovp9)
          .Add();
      break;
    case NESTEGG_CODEC_AAC:
      mozilla::glean::media::mkv_codec_type
          .EnumGet(mozilla::glean::media::MkvCodecTypeLabel::eAudioaac)
          .Add();
      break;
    case NESTEGG_CODEC_MP3:
      mozilla::glean::media::mkv_codec_type
          .EnumGet(mozilla::glean::media::MkvCodecTypeLabel::eAudiomp3)
          .Add();
      break;
    case NESTEGG_CODEC_OPUS:
      mozilla::glean::media::mkv_codec_type
          .EnumGet(mozilla::glean::media::MkvCodecTypeLabel::eAudioopus)
          .Add();
      break;
    case NESTEGG_CODEC_VORBIS:
      mozilla::glean::media::mkv_codec_type
          .EnumGet(mozilla::glean::media::MkvCodecTypeLabel::eAudiovorbis)
          .Add();
      break;
    case NESTEGG_CODEC_FLAC:
      mozilla::glean::media::mkv_codec_type
          .EnumGet(mozilla::glean::media::MkvCodecTypeLabel::eAudioflac)
          .Add();
      break;
    case NESTEGG_CODEC_PCM:
      mozilla::glean::media::mkv_codec_type
          .EnumGet(mozilla::glean::media::MkvCodecTypeLabel::eAudiopcm)
          .Add();
      break;
    default:
      mozilla::glean::media::mkv_codec_type
          .EnumGet(mozilla::glean::media::MkvCodecTypeLabel::eNocodecspecified)
          .Add();
      break;
  }
}

MatroskaDemuxer::MatroskaDemuxer(MediaResource* aResource)
    : WebMDemuxer(aResource) {}

nsresult MatroskaDemuxer::SetVideoCodecInfo(nestegg* aContext, int aTrackId) {
  mVideoCodec = nestegg_track_codec_id(aContext, aTrackId);
  ReportCodecUsage(mVideoCodec);
  // TODO : support more codecs
  switch (mVideoCodec) {
    case NESTEGG_CODEC_AVC: {
      mInfo.mVideo.mMimeType = "video/avc";
      nsresult rv = SetCodecPrivateToVideoExtraData(aContext, aTrackId);
      if (NS_FAILED(rv)) {
        MKV_DEBUG("Failed to set extradata for avc");
        return rv;
      }
      break;
    }
    case NESTEGG_CODEC_HEVC: {
      mInfo.mVideo.mMimeType = "video/hevc";
      nsresult rv = SetCodecPrivateToVideoExtraData(aContext, aTrackId);
      if (NS_FAILED(rv)) {
        MKV_DEBUG("Failed to set extradata for hevc");
        return rv;
      }
      break;
    }
    case NESTEGG_CODEC_VP8:
      mInfo.mVideo.mMimeType = "video/vp8";
      break;
    case NESTEGG_CODEC_VP9:
      mInfo.mVideo.mMimeType = "video/vp9";
      break;
    case NESTEGG_CODEC_AV1:
      mInfo.mVideo.mMimeType = "video/av1";
      break;
    default:
      NS_WARNING("Unknown Matroska video codec");
      return NS_ERROR_FAILURE;
  }
  return NS_OK;
}

nsresult MatroskaDemuxer::SetCodecPrivateToVideoExtraData(nestegg* aContext,
                                                          int aTrackId) {
  nsTArray<const unsigned char*> headers;
  nsTArray<size_t> headerLens;
  nsresult rv = GetCodecPrivateData(aContext, aTrackId, &headers, &headerLens);
  if (NS_FAILED(rv)) {
    MKV_DEBUG("GetCodecPrivateData error");
    return rv;
  }
  mInfo.mVideo.mExtraData->AppendElements(headers[0], headerLens[0]);
  return NS_OK;
}

nsresult MatroskaDemuxer::SetContainerAudioCodecInfo(
    nestegg* aContext, const nestegg_audio_params& aParams) {
  ReportCodecUsage(mAudioCodec);

  static const uint64_t NSECS_PER_USEC = 1000;
  static const uint64_t USECS_PER_S = 1e6;

  // TODO : support more codecs
  switch (mAudioCodec) {
    case NESTEGG_CODEC_AAC: {
      mInfo.mAudio.mMimeType = "audio/mp4a-latm";
      const uint32_t AAC_SAMPLES_PER_FRAME = 1024;
      AacCodecSpecificData aacCodecSpecificData{};
      uint64_t codecDelayUs = aParams.codec_delay / NSECS_PER_USEC;
      if (codecDelayUs > 0) {
        aacCodecSpecificData.mEncoderDelayFrames = static_cast<uint32_t>(
            std::lround(static_cast<double>(codecDelayUs) * aParams.rate /
                        (USECS_PER_S * AAC_SAMPLES_PER_FRAME)));
        MKV_DEBUG("AAC stream in MKV container, {} frames of encoder delay.",
                  aacCodecSpecificData.mEncoderDelayFrames);
      } else {
        aacCodecSpecificData.mEncoderDelayFrames = 0;
      }

      uint64_t frameCount;
      int r = nestegg_read_total_frames_count(aContext, &frameCount);
      if (r == -1) {
        return NS_ERROR_FAILURE;
      }
      aacCodecSpecificData.mMediaFrameCount = frameCount;
      MKV_DEBUG(
          "AAC stream in MKV container, media frames: {}, delay frames : {}",
          frameCount, aacCodecSpecificData.mEncoderDelayFrames);
      mInfo.mAudio.mCodecSpecificConfig =
          AudioCodecSpecificVariant{std::move(aacCodecSpecificData)};
      break;
    }
    default:
      return WebMDemuxer::SetContainerAudioCodecInfo(aContext, aParams);
  }
  return NS_OK;
}

bool MatroskaDemuxer::CheckKeyFrameByExamineByteStream(
    const MediaRawData* aSample) {
  // TODO : support more codecs
  switch (mVideoCodec) {
    case NESTEGG_CODEC_AVC: {
      auto frameType = H264::GetFrameType(aSample);
      return frameType == H264::FrameType::I_FRAME_IDR ||
             frameType == H264::FrameType::I_FRAME_OTHER;
    }
    case NESTEGG_CODEC_HEVC: {
      auto isKeyFrame = H265::IsKeyFrame(aSample);
      return isKeyFrame.isOk() ? isKeyFrame.unwrap() : false;
    }
    case NESTEGG_CODEC_VP8:
      return VPXDecoder::IsKeyframe(*aSample, VPXDecoder::Codec::VP8);
    case NESTEGG_CODEC_VP9:
      return VPXDecoder::IsKeyframe(*aSample, VPXDecoder::Codec::VP9);
    case NESTEGG_CODEC_AV1:
      return AOMDecoder::IsKeyframe(*aSample);
    default:
      MOZ_ASSERT_UNREACHABLE(
          "Cannot detect keyframes in unknown Matroska video codec");
      return false;
  }
}

}  // namespace mozilla

#undef MKV_DEBUG
