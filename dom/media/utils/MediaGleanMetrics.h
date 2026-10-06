/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_MEDIA_UTILS_MEDIAGLEANMETRICS_H_
#define DOM_MEDIA_UTILS_MEDIAGLEANMETRICS_H_

#include "nsString.h"

namespace mozilla {

inline nsCString MimeTypeToUnencryptedLabel(const nsACString& aMimeType) {
  if (aMimeType.EqualsLiteral("video/avc")) {
    return "video_avc"_ns;
  }
  if (aMimeType.EqualsLiteral("video/av1")) {
    return "video_av1"_ns;
  }
  if (aMimeType.EqualsLiteral("video/vp9")) {
    return "video_vp9"_ns;
  }
  if (aMimeType.EqualsLiteral("video/vp8")) {
    return "video_vp8"_ns;
  }
  if (aMimeType.EqualsLiteral("video/hevc")) {
    return "video_hevc"_ns;
  }
  if (aMimeType.EqualsLiteral("video/theora")) {
    return "video_theora"_ns;
  }
  if (aMimeType.EqualsLiteral("audio/mpeg")) {
    return "audio_mpeg"_ns;
  }
  if (aMimeType.EqualsLiteral("audio/opus")) {
    return "audio_opus"_ns;
  }
  if (aMimeType.EqualsLiteral("audio/flac")) {
    return "audio_flac"_ns;
  }
  if (aMimeType.EqualsLiteral("audio/vorbis")) {
    return "audio_vorbis"_ns;
  }
  if (aMimeType.EqualsLiteral("audio/wave")) {
    return "audio_wave"_ns;
  }
  if (StringBeginsWith(aMimeType, "audio/"_ns)) {
    return "audio_other"_ns;
  }
  return "video_other"_ns;
}

inline nsCString MimeTypeToEncryptedLabel(const nsACString& aMimeType) {
  if (aMimeType.EqualsLiteral("video/avc")) {
    return "video_avc"_ns;
  }
  if (aMimeType.EqualsLiteral("video/av1")) {
    return "video_av1"_ns;
  }
  if (aMimeType.EqualsLiteral("video/vp9")) {
    return "video_vp9"_ns;
  }
  if (aMimeType.EqualsLiteral("video/hevc")) {
    return "video_hevc"_ns;
  }
  if (aMimeType.EqualsLiteral("audio/mp4a-latm")) {
    return "audio_aac"_ns;
  }
  if (StringBeginsWith(aMimeType, "audio/"_ns)) {
    return "audio_other"_ns;
  }
  return "video_other"_ns;
}

// Returns true for errors that are not real decode failures: end-of-stream is
// a normal stream termination, and canceled means the decode was aborted by
// the caller. Neither warrants tracking as a decode error.
inline bool IsNotRealDecodeError(const nsACString& aErrorName) {
  return aErrorName.EqualsLiteral("NS_ERROR_DOM_MEDIA_END_OF_STREAM") ||
         aErrorName.EqualsLiteral("NS_ERROR_DOM_MEDIA_CANCELED");
}

inline nsCString ErrorNameToLabel(const nsACString& aErrorName) {
  if (aErrorName.EqualsLiteral("NS_ERROR_DOM_MEDIA_DECODE_ERR")) {
    return "decode_err"_ns;
  }
  if (aErrorName.EqualsLiteral("NS_ERROR_DOM_MEDIA_FATAL_ERR")) {
    return "fatal_err"_ns;
  }
  if (aErrorName.EqualsLiteral("NS_ERROR_DOM_MEDIA_METADATA_ERR")) {
    return "metadata_err"_ns;
  }
  if (aErrorName.EqualsLiteral("NS_ERROR_DOM_MEDIA_DEMUXER_ERR")) {
    return "demuxer_err"_ns;
  }
  if (aErrorName.EqualsLiteral(
          "NS_ERROR_DOM_MEDIA_REMOTE_CRASHED_RDD_OR_GPU_ERR") ||
      aErrorName.EqualsLiteral(
          "NS_ERROR_DOM_MEDIA_REMOTE_CRASHED_UTILITY_ERR") ||
      aErrorName.EqualsLiteral(
          "NS_ERROR_DOM_MEDIA_REMOTE_CRASHED_MF_CDM_ERR")) {
    return "crash"_ns;
  }
  if (aErrorName.EqualsLiteral("NS_ERROR_UNEXPECTED")) {
    return "unexpected_err"_ns;
  }
  if (aErrorName.EqualsLiteral("NS_ERROR_OUT_OF_MEMORY")) {
    return "oom_err"_ns;
  }
  return "other"_ns;
}

inline nsCString KeySystemToLabel(const nsAString& aKeySystem) {
  if (StringBeginsWith(aKeySystem, u"com.widevine"_ns)) {
    return "widevine"_ns;
  }
  if (StringBeginsWith(aKeySystem, u"com.microsoft.playready"_ns)) {
    return "playready"_ns;
  }
  if (aKeySystem.EqualsLiteral("org.w3.clearkey")) {
    return "clearkey"_ns;
  }
  return "other"_ns;
}

}  // namespace mozilla

#endif  // DOM_MEDIA_UTILS_MEDIAGLEANMETRICS_H_
