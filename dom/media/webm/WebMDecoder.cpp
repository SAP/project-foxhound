/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "WebMDecoder.h"

#include <utility>

#include "AOMDecoder.h"
#include "MediaContainerType.h"
#include "PDMFactorySupport.h"
#include "PlatformDecoderModule.h"
#include "VPXDecoder.h"
#include "VideoUtils.h"
#include "mozilla/Preferences.h"
#include "mozilla/StaticPrefs_media.h"

namespace mozilla {

/* static */
nsTArray<UniquePtr<TrackInfo>> WebMDecoder::GetTracksInfo(
    const MediaContainerType& aType, MediaResult& aError) {
  nsTArray<UniquePtr<TrackInfo>> tracks;
  const bool isVideo = aType.Type() == MEDIAMIMETYPE("video/webm");

  if (aType.Type() != MEDIAMIMETYPE("audio/webm") && !isVideo) {
    aError = MediaResult(
        NS_ERROR_DOM_MEDIA_FATAL_ERR,
        RESULT_DETAIL("Invalid type:%s", aType.Type().AsString().get()));
    return tracks;
  }

  aError = NS_OK;

  const MediaCodecs& codecs = aType.ExtendedType().Codecs();
  if (codecs.IsEmpty()) {
    return tracks;
  }

  for (const auto& codec : codecs.Range()) {
    if (codec.EqualsLiteral("opus") || codec.EqualsLiteral("vorbis")) {
      tracks.AppendElement(
          CreateTrackInfoWithMIMETypeAndContainerTypeExtraParameters(
              "audio/"_ns + NS_ConvertUTF16toUTF8(codec), aType));
      continue;
    }
    if (isVideo) {
      UniquePtr<TrackInfo> trackInfo;
      if (IsVP9CodecString(codec)) {
        trackInfo = CreateTrackInfoWithMIMETypeAndContainerTypeExtraParameters(
            "video/vp9"_ns, aType);
      } else if (IsVP8CodecString(codec)) {
        trackInfo = CreateTrackInfoWithMIMETypeAndContainerTypeExtraParameters(
            "video/vp8"_ns, aType);
      }
      if (trackInfo) {
        VPXDecoder::SetVideoInfo(trackInfo->GetAsVideoInfo(), codec);
        tracks.AppendElement(std::move(trackInfo));
        continue;
      }
    }
    if (StaticPrefs::media_av1_enabled() && IsAV1CodecString(codec)) {
      auto trackInfo =
          CreateTrackInfoWithMIMETypeAndContainerTypeExtraParameters(
              "video/av1"_ns, aType);
      AOMDecoder::SetVideoInfo(trackInfo->GetAsVideoInfo(), codec);
      tracks.AppendElement(std::move(trackInfo));
      continue;
    }
    // Unknown codec
    aError = MediaResult(
        NS_ERROR_DOM_MEDIA_FATAL_ERR,
        RESULT_DETAIL("Unknown codec:%s", NS_ConvertUTF16toUTF8(codec).get()));
  }
  return tracks;
}

/* static */
bool WebMDecoder::IsSupportedType(const MediaContainerType& aContainerType) {
  if (!StaticPrefs::media_webm_enabled()) {
    return false;
  }

  MediaResult rv = NS_OK;
  auto tracks = GetTracksInfo(aContainerType, rv);

  if (NS_FAILED(rv)) {
    return false;
  }

  if (tracks.IsEmpty()) {
    // WebM guarantees that the only codecs it contained are vp8, vp9, opus or
    // vorbis.
    return true;
  }

  // Verify that we have a PDM that supports the whitelisted types, include
  // color depth
  for (const auto& track : tracks) {
    if (!track || PDMFactorySupport::IsSupported(SupportDecoderParams(*track),
                                                 nullptr /* diagnostic */)
                      .isEmpty()) {
      return false;
    }
  }

  return true;
}

/* static */
nsTArray<UniquePtr<TrackInfo>> WebMDecoder::GetTracksInfo(
    const MediaContainerType& aType) {
  MediaResult rv = NS_OK;
  return GetTracksInfo(aType, rv);
}

}  // namespace mozilla
