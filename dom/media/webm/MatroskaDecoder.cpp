/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "MatroskaDecoder.h"

#ifdef MOZ_AV1
#  include "AOMDecoder.h"
#endif
#include "MediaContainerType.h"
#include "PDMFactory.h"
#include "PlatformDecoderModule.h"
#include "VideoUtils.h"
#include "mozilla/StaticPrefs_media.h"
#include "nsMimeTypes.h"

namespace mozilla {

/* static */
bool MatroskaDecoder::IsMatroskaType(const MediaContainerType& aType) {
  const auto& mimeType = aType.Type();
  return mimeType == MEDIAMIMETYPE(VIDEO_MATROSKA) ||
         mimeType == MEDIAMIMETYPE(VIDEO_MATROSKA_LEGACY) ||
         mimeType == MEDIAMIMETYPE(AUDIO_MATROSKA) ||
         mimeType == MEDIAMIMETYPE(AUDIO_MATROSKA_LEGACY);
}

/* static */
nsTArray<UniquePtr<TrackInfo>> MatroskaDecoder::GetTracksInfo(
    const MediaContainerType& aType, MediaResult& aError) {
  nsTArray<UniquePtr<TrackInfo>> tracks;

  aError = NS_OK;

  const MediaCodecs& codecs = aType.ExtendedType().Codecs();
  if (codecs.IsEmpty()) {
    return tracks;
  }

  // TODO : add more codec support.
  for (const auto& codec : codecs.Range()) {
    // Audio codecs
    if (IsAACCodecString(codec)) {
      tracks.AppendElement(
          CreateTrackInfoWithMIMETypeAndContainerTypeExtraParameters(
              "audio/mp4a-latm"_ns, aType));
      continue;
    }
    if (codec.EqualsLiteral("opus")) {
      tracks.AppendElement(
          CreateTrackInfoWithMIMETypeAndContainerTypeExtraParameters(
              "audio/opus"_ns, aType));
      continue;
    }
    if (codec.EqualsLiteral("vorbis")) {
      tracks.AppendElement(
          CreateTrackInfoWithMIMETypeAndContainerTypeExtraParameters(
              "audio/vorbis"_ns, aType));
      continue;
    }
    // Video codecs
    if (IsAllowedH264Codec(codec)) {
      auto trackInfo =
          CreateTrackInfoWithMIMETypeAndContainerTypeExtraParameters(
              "video/avc"_ns, aType);
      uint8_t profile = 0, constraint = 0;
      H264_LEVEL level;
      MOZ_ALWAYS_TRUE(
          ExtractH264CodecDetails(codec, profile, constraint, level,
                                  H264CodecStringStrictness::Lenient));
      uint32_t width = aType.ExtendedType().GetWidth().refOr(1280);
      uint32_t height = aType.ExtendedType().GetHeight().refOr(720);
      trackInfo->GetAsVideoInfo()->mExtraData =
          H264::CreateExtraData(profile, constraint, level, {width, height});
      tracks.AppendElement(std::move(trackInfo));
      continue;
    }
    if (StaticPrefs::media_hevc_enabled() && IsH265CodecString(codec)) {
      auto trackInfo =
          CreateTrackInfoWithMIMETypeAndContainerTypeExtraParameters(
              "video/hevc"_ns, aType);
      tracks.AppendElement(std::move(trackInfo));
      continue;
    }
    if (IsVP9CodecString(codec)) {
      auto trackInfo =
          CreateTrackInfoWithMIMETypeAndContainerTypeExtraParameters(
              "video/vp9"_ns, aType);
      tracks.AppendElement(std::move(trackInfo));
      continue;
    }
    if (IsVP8CodecString(codec)) {
      auto trackInfo =
          CreateTrackInfoWithMIMETypeAndContainerTypeExtraParameters(
              "video/vp8"_ns, aType);
      tracks.AppendElement(std::move(trackInfo));
      continue;
    }
#ifdef MOZ_AV1
    if (StaticPrefs::media_av1_enabled() && IsAV1CodecString(codec)) {
      auto trackInfo =
          CreateTrackInfoWithMIMETypeAndContainerTypeExtraParameters(
              "video/av1"_ns, aType);
      AOMDecoder::SetVideoInfo(trackInfo->GetAsVideoInfo(), codec);
      tracks.AppendElement(std::move(trackInfo));
      continue;
    }
#endif
    aError = MediaResult(
        NS_ERROR_DOM_MEDIA_FATAL_ERR,
        RESULT_DETAIL("Unknown codec:%s", NS_ConvertUTF16toUTF8(codec).get()));
  }
  return tracks;
}

/* static */
bool MatroskaDecoder::IsSupportedType(const MediaContainerType& aContainerType,
                                      DecoderDoctorDiagnostics* aDiagnostics) {
  if (!StaticPrefs::media_mkv_enabled() || !IsMatroskaType(aContainerType)) {
    return false;
  }

  MediaResult rv = NS_OK;
  auto tracks = GetTracksInfo(aContainerType, rv);
  if (NS_FAILED(rv)) {
    return false;
  }

  if (!tracks.IsEmpty()) {
    // Look for exact match as we know the codecs used.
    RefPtr<PDMFactory> platform = new PDMFactory();
    for (const auto& track : tracks) {
      if (!track ||
          platform->Supports(SupportDecoderParams(*track), aDiagnostics)
              .isEmpty()) {
        return false;
      }
    }
    return true;
  }

  // The container doesn't specify codecs, so we guess the content type.
  // TODO : add more codec support.
  if (aContainerType.Type() == MEDIAMIMETYPE(AUDIO_MATROSKA)) {
    tracks.AppendElement(
        CreateTrackInfoWithMIMETypeAndContainerTypeExtraParameters(
            "audio/mp4a-latm"_ns, aContainerType));
    tracks.AppendElement(
        CreateTrackInfoWithMIMETypeAndContainerTypeExtraParameters(
            "audio/opus"_ns, aContainerType));
    tracks.AppendElement(
        CreateTrackInfoWithMIMETypeAndContainerTypeExtraParameters(
            "audio/vorbis"_ns, aContainerType));
  } else {
    tracks.AppendElement(
        CreateTrackInfoWithMIMETypeAndContainerTypeExtraParameters(
            "video/avc"_ns, aContainerType));
    if (StaticPrefs::media_hevc_enabled()) {
      tracks.AppendElement(
          CreateTrackInfoWithMIMETypeAndContainerTypeExtraParameters(
              "video/hevc"_ns, aContainerType));
    }
    tracks.AppendElement(
        CreateTrackInfoWithMIMETypeAndContainerTypeExtraParameters(
            "video/vp8"_ns, aContainerType));
    tracks.AppendElement(
        CreateTrackInfoWithMIMETypeAndContainerTypeExtraParameters(
            "video/vp9"_ns, aContainerType));
#ifdef MOZ_AV1
    if (StaticPrefs::media_av1_enabled()) {
      tracks.AppendElement(
          CreateTrackInfoWithMIMETypeAndContainerTypeExtraParameters(
              "video/av1"_ns, aContainerType));
    }
#endif
  }

  // Check that something is supported at least.
  RefPtr<PDMFactory> platform = new PDMFactory();
  for (const auto& track : tracks) {
    if (track && !platform->Supports(SupportDecoderParams(*track), aDiagnostics)
                      .isEmpty()) {
      return true;
    }
  }
  return false;
}

/* static */
nsTArray<UniquePtr<TrackInfo>> MatroskaDecoder::GetTracksInfo(
    const MediaContainerType& aType) {
  MediaResult rv = NS_OK;
  return GetTracksInfo(aType, rv);
}

}  // namespace mozilla
