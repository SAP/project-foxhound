/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#ifndef DOM_MEDIA_WEBRTC_H264FMTPPARSER_H_
#define DOM_MEDIA_WEBRTC_H264FMTPPARSER_H_

#include "H264.h"
#include "mozilla/Assertions.h"
#include "mozilla/Result.h"
#include "mozilla/ResultVariant.h"
#include "nsStringFwd.h"

namespace mozilla {

enum class H264FmtpParseError { NotPresent, Invalid };

struct H264ProfileLevel {
  H264_PROFILE mProfile;
  H264_LEVEL mLevel;
};

struct H264FmtpParams {
  Result<H264ProfileLevel, H264FmtpParseError> mProfileLevel =
      Err(H264FmtpParseError::NotPresent);
  Result<uint32_t, H264FmtpParseError> mPacketizationMode =
      Err(H264FmtpParseError::NotPresent);
};

#ifdef MOZ_WEBRTC
// Parse profile-level-id and packetization-mode from a video/H264 MIME content
// type. Missing parameters return Err(NotPresent), present but unparseable or
// unsupported values return Err(Invalid).
H264FmtpParams ParseH264Fmtp(const nsACString& aMimeString);

// Whether the given resolution and framerate fit aLevel's H.264 Annex A
// macroblocks-per-frame and macroblocks-per-second caps. False for unknown
// levels.
[[nodiscard]] bool H264LevelFits(H264_LEVEL aLevel, uint32_t aWidth,
                                 uint32_t aHeight, double aFramerate);
#else
inline H264FmtpParams ParseH264Fmtp(const nsACString&) {
  MOZ_ASSERT_UNREACHABLE("ParseH264Fmtp called in non-MOZ_WEBRTC build");
  return {};
}
inline bool H264LevelFits(H264_LEVEL, uint32_t, uint32_t, double) {
  MOZ_ASSERT_UNREACHABLE("H264LevelFits called in non-MOZ_WEBRTC build");
  return false;
}
#endif

}  // namespace mozilla

#endif  // DOM_MEDIA_WEBRTC_H264FMTPPARSER_H_
