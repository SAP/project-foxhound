/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#include "H264FmtpParser.h"

#include "api/video_codecs/h264_profile_level_id.h"
#include "mozilla/CheckedInt.h"
#include "nsContentTypeParser.h"

namespace mozilla {

static Maybe<H264_PROFILE> MapWebrtcProfile(webrtc::H264Profile aProfile) {
  switch (aProfile) {
    case webrtc::H264Profile::kProfileConstrainedBaseline:
    case webrtc::H264Profile::kProfileBaseline:
      // Constrained Baseline to Baseline here (bug 2040726).
      return Some(H264_PROFILE::H264_PROFILE_BASE);
    case webrtc::H264Profile::kProfileMain:
      return Some(H264_PROFILE::H264_PROFILE_MAIN);
    case webrtc::H264Profile::kProfileConstrainedHigh:
    case webrtc::H264Profile::kProfileHigh:
      return Some(H264_PROFILE::H264_PROFILE_HIGH);
    case webrtc::H264Profile::kProfilePredictiveHigh444:
      return Nothing();
  }
  return Nothing();
}

static Maybe<H264_LEVEL> MapWebrtcLevel(webrtc::H264Level aLevel) {
  switch (aLevel) {
    case webrtc::H264Level::kLevel1_b:
      return Some(H264_LEVEL::H264_LEVEL_1_b);
    case webrtc::H264Level::kLevel1:
      return Some(H264_LEVEL::H264_LEVEL_1);
    case webrtc::H264Level::kLevel1_1:
      return Some(H264_LEVEL::H264_LEVEL_1_1);
    case webrtc::H264Level::kLevel1_2:
      return Some(H264_LEVEL::H264_LEVEL_1_2);
    case webrtc::H264Level::kLevel1_3:
      return Some(H264_LEVEL::H264_LEVEL_1_3);
    case webrtc::H264Level::kLevel2:
      return Some(H264_LEVEL::H264_LEVEL_2);
    case webrtc::H264Level::kLevel2_1:
      return Some(H264_LEVEL::H264_LEVEL_2_1);
    case webrtc::H264Level::kLevel2_2:
      return Some(H264_LEVEL::H264_LEVEL_2_2);
    case webrtc::H264Level::kLevel3:
      return Some(H264_LEVEL::H264_LEVEL_3);
    case webrtc::H264Level::kLevel3_1:
      return Some(H264_LEVEL::H264_LEVEL_3_1);
    case webrtc::H264Level::kLevel3_2:
      return Some(H264_LEVEL::H264_LEVEL_3_2);
    case webrtc::H264Level::kLevel4:
      return Some(H264_LEVEL::H264_LEVEL_4);
    case webrtc::H264Level::kLevel4_1:
      return Some(H264_LEVEL::H264_LEVEL_4_1);
    case webrtc::H264Level::kLevel4_2:
      return Some(H264_LEVEL::H264_LEVEL_4_2);
    case webrtc::H264Level::kLevel5:
      return Some(H264_LEVEL::H264_LEVEL_5);
    case webrtc::H264Level::kLevel5_1:
      return Some(H264_LEVEL::H264_LEVEL_5_1);
    case webrtc::H264Level::kLevel5_2:
      return Some(H264_LEVEL::H264_LEVEL_5_2);
  }
  return Nothing();
}

H264FmtpParams ParseH264Fmtp(const nsACString& aMimeString) {
  H264FmtpParams out;
  nsContentTypeParser parser((NS_ConvertUTF8toUTF16(aMimeString)));

  nsAutoString profileLevelId;
  if (NS_SUCCEEDED(parser.GetParameter("profile-level-id", profileLevelId))) {
    NS_ConvertUTF16toUTF8 narrow(profileLevelId);
    auto parsed = webrtc::ParseH264ProfileLevelId(narrow.get());
    Maybe<H264_PROFILE> profile;
    Maybe<H264_LEVEL> level;
    if (parsed) {
      profile = MapWebrtcProfile(parsed->profile);
      level = MapWebrtcLevel(parsed->level);
    }
    if (profile && level) {
      out.mProfileLevel = H264ProfileLevel{*profile, *level};
    } else {
      out.mProfileLevel = Err(H264FmtpParseError::Invalid);
    }
  }

  nsAutoString packetizationMode;
  if (NS_SUCCEEDED(
          parser.GetParameter("packetization-mode", packetizationMode))) {
    nsresult rv;
    int32_t mode = packetizationMode.ToInteger(&rv);
    if (NS_SUCCEEDED(rv) && mode >= 0 && mode <= 2) {
      out.mPacketizationMode = static_cast<uint32_t>(mode);
    } else {
      out.mPacketizationMode = Err(H264FmtpParseError::Invalid);
    }
  }

  return out;
}

bool H264LevelFits(H264_LEVEL aLevel, uint32_t aWidth, uint32_t aHeight,
                   double aFramerate) {
  struct H264LevelConstraint {
    H264_LEVEL mLevel;
    uint32_t mMaxMacroblocksPerFrame;
    uint32_t mMaxMacroblocksPerSecond;
  };
  // H.264 Annex A Table A-1. Mirrors libwebrtc's kLevelConstraints.
  static constexpr H264LevelConstraint kH264LevelConstraints[] = {
      {H264_LEVEL::H264_LEVEL_1, 99, 1485},
      {H264_LEVEL::H264_LEVEL_1_b, 99, 1485},
      {H264_LEVEL::H264_LEVEL_1_1, 396, 3000},
      {H264_LEVEL::H264_LEVEL_1_2, 396, 6000},
      {H264_LEVEL::H264_LEVEL_1_3, 396, 11880},
      {H264_LEVEL::H264_LEVEL_2, 396, 11880},
      {H264_LEVEL::H264_LEVEL_2_1, 792, 19800},
      {H264_LEVEL::H264_LEVEL_2_2, 1620, 20250},
      {H264_LEVEL::H264_LEVEL_3, 1620, 40500},
      {H264_LEVEL::H264_LEVEL_3_1, 3600, 108000},
      {H264_LEVEL::H264_LEVEL_3_2, 5120, 216000},
      {H264_LEVEL::H264_LEVEL_4, 8192, 245760},
      {H264_LEVEL::H264_LEVEL_4_1, 8192, 245760},
      {H264_LEVEL::H264_LEVEL_4_2, 8704, 522240},
      {H264_LEVEL::H264_LEVEL_5, 22080, 589824},
      {H264_LEVEL::H264_LEVEL_5_1, 36864, 983040},
      {H264_LEVEL::H264_LEVEL_5_2, 36864, 2073600},
  };
  for (const auto& c : kH264LevelConstraints) {
    if (c.mLevel != aLevel) {
      continue;
    }
    // Calculate macroblocks per frame
    const CheckedInt<uint32_t> mbs =
        ((CheckedInt<uint32_t>(aWidth) + 15) / 16) *
        ((CheckedInt<uint32_t>(aHeight) + 15) / 16);
    if (!mbs.isValid() || mbs.value() > c.mMaxMacroblocksPerFrame) {
      return false;
    }
    if (static_cast<double>(mbs.value()) * aFramerate >
        static_cast<double>(c.mMaxMacroblocksPerSecond)) {
      return false;
    }
    return true;
  }
  return false;
}

}  // namespace mozilla
