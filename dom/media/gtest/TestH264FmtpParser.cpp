/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "MediaMIMETypes.h"
#include "gtest/gtest.h"
#include "mozilla/media/webrtc/H264FmtpParser.h"

using namespace mozilla;

static H264FmtpParams Parse(const char* aType) {
  Maybe<MediaExtendedMIMEType> mime = MakeMediaExtendedMIMEType(aType);
  if (mime.isNothing()) {
    ADD_FAILURE() << "MIME failed to parse: " << aType;
    return {};
  }
  return ParseH264Fmtp(mime->OriginalString());
}

TEST(H264FmtpParser, NoParameters)
{
  H264FmtpParams p = Parse("video/H264");
  ASSERT_TRUE(p.mProfileLevel.isErr());
  EXPECT_EQ(p.mProfileLevel.inspectErr(), H264FmtpParseError::NotPresent);
  ASSERT_TRUE(p.mPacketizationMode.isErr());
  EXPECT_EQ(p.mPacketizationMode.inspectErr(), H264FmtpParseError::NotPresent);
}

TEST(H264FmtpParser, ConstrainedBaselineLevel31)
{
  // 0x42e01f -- constrained baseline, level 3.1 (WebRTC default).
  H264FmtpParams p = Parse("video/H264; profile-level-id=42e01f");
  ASSERT_TRUE(p.mProfileLevel.isOk());
  EXPECT_EQ(p.mProfileLevel.inspect().mProfile,
            H264_PROFILE::H264_PROFILE_BASE);
  EXPECT_EQ(p.mProfileLevel.inspect().mLevel, H264_LEVEL::H264_LEVEL_3_1);
  ASSERT_TRUE(p.mPacketizationMode.isErr());
  EXPECT_EQ(p.mPacketizationMode.inspectErr(), H264FmtpParseError::NotPresent);
}

TEST(H264FmtpParser, ConstrainedBaselineLevel31UpperCase)
{
  H264FmtpParams p = Parse("video/H264; profile-level-id=42E01F");
  ASSERT_TRUE(p.mProfileLevel.isOk());
  EXPECT_EQ(p.mProfileLevel.inspect().mProfile,
            H264_PROFILE::H264_PROFILE_BASE);
  EXPECT_EQ(p.mProfileLevel.inspect().mLevel, H264_LEVEL::H264_LEVEL_3_1);
}

TEST(H264FmtpParser, ConstrainedBaselineViaMainLevel31)
{
  H264FmtpParams p = Parse("video/H264; profile-level-id=4d801f");
  ASSERT_TRUE(p.mProfileLevel.isOk());
  EXPECT_EQ(p.mProfileLevel.inspect().mProfile,
            H264_PROFILE::H264_PROFILE_BASE);
  EXPECT_EQ(p.mProfileLevel.inspect().mLevel, H264_LEVEL::H264_LEVEL_3_1);
}

TEST(H264FmtpParser, ConstrainedBaselineViaExtendedLevel31)
{
  H264FmtpParams p = Parse("video/H264; profile-level-id=58c01f");
  ASSERT_TRUE(p.mProfileLevel.isOk());
  EXPECT_EQ(p.mProfileLevel.inspect().mProfile,
            H264_PROFILE::H264_PROFILE_BASE);
  EXPECT_EQ(p.mProfileLevel.inspect().mLevel, H264_LEVEL::H264_LEVEL_3_1);
}

TEST(H264FmtpParser, BaselineLevel31)
{
  // 0x42001f -- baseline, level 3.1.
  H264FmtpParams p = Parse("video/H264; profile-level-id=42001f");
  ASSERT_TRUE(p.mProfileLevel.isOk());
  EXPECT_EQ(p.mProfileLevel.inspect().mProfile,
            H264_PROFILE::H264_PROFILE_BASE);
  EXPECT_EQ(p.mProfileLevel.inspect().mLevel, H264_LEVEL::H264_LEVEL_3_1);
}

TEST(H264FmtpParser, BaselineViaExtendedLevel31)
{
  // 0x58801f -- Extended profile_idc with constraint_set0_flag set is
  // baseline per RFC 6184 (58 (E) 10xx0000).
  H264FmtpParams p = Parse("video/H264; profile-level-id=58801f");
  ASSERT_TRUE(p.mProfileLevel.isOk());
  EXPECT_EQ(p.mProfileLevel.inspect().mProfile,
            H264_PROFILE::H264_PROFILE_BASE);
  EXPECT_EQ(p.mProfileLevel.inspect().mLevel, H264_LEVEL::H264_LEVEL_3_1);
}

TEST(H264FmtpParser, MainLevel32)
{
  // 0x4d0020 -- main, level 3.2.
  H264FmtpParams p = Parse("video/H264; profile-level-id=4d0020");
  ASSERT_TRUE(p.mProfileLevel.isOk());
  EXPECT_EQ(p.mProfileLevel.inspect().mProfile,
            H264_PROFILE::H264_PROFILE_MAIN);
  EXPECT_EQ(p.mProfileLevel.inspect().mLevel, H264_LEVEL::H264_LEVEL_3_2);
}

TEST(H264FmtpParser, HighLevel52)
{
  // 0x640034 -- high, level 5.2 (OpenH264 ceiling per OpenH264 docs).
  H264FmtpParams p = Parse("video/H264; profile-level-id=640034");
  ASSERT_TRUE(p.mProfileLevel.isOk());
  EXPECT_EQ(p.mProfileLevel.inspect().mProfile,
            H264_PROFILE::H264_PROFILE_HIGH);
  EXPECT_EQ(p.mProfileLevel.inspect().mLevel, H264_LEVEL::H264_LEVEL_5_2);
}

TEST(H264FmtpParser, PacketizationModeOne)
{
  H264FmtpParams p = Parse(
      "video/H264; profile-level-id=42e01f;level-asymmetry-allowed=1;"
      "packetization-mode=1");
  ASSERT_TRUE(p.mPacketizationMode.isOk());
  EXPECT_EQ(p.mPacketizationMode.inspect(), 1u);
}

TEST(H264FmtpParser, PacketizationModeZero)
{
  H264FmtpParams p = Parse("video/H264; packetization-mode=0");
  ASSERT_TRUE(p.mPacketizationMode.isOk());
  EXPECT_EQ(p.mPacketizationMode.inspect(), 0u);
}

TEST(H264FmtpParser, PacketizationModeOutOfRange)
{
  H264FmtpParams p = Parse("video/H264; packetization-mode=3");
  ASSERT_TRUE(p.mPacketizationMode.isErr());
  EXPECT_EQ(p.mPacketizationMode.inspectErr(), H264FmtpParseError::Invalid);
}

TEST(H264FmtpParser, PacketizationModeNonNumeric)
{
  H264FmtpParams p = Parse("video/H264; packetization-mode=banana");
  ASSERT_TRUE(p.mPacketizationMode.isErr());
  EXPECT_EQ(p.mPacketizationMode.inspectErr(), H264FmtpParseError::Invalid);
}

TEST(H264FmtpParser, MalformedProfileByte)
{
  // Invalid hex in the profile_idc byte.
  H264FmtpParams p = Parse("video/H264; profile-level-id=zze01f");
  ASSERT_TRUE(p.mProfileLevel.isErr());
  EXPECT_EQ(p.mProfileLevel.inspectErr(), H264FmtpParseError::Invalid);
}

TEST(H264FmtpParser, MalformedLevelByte)
{
  // Invalid hex in the level_idc byte.
  H264FmtpParams p = Parse("video/H264; profile-level-id=42e0zz");
  ASSERT_TRUE(p.mProfileLevel.isErr());
  EXPECT_EQ(p.mProfileLevel.inspectErr(), H264FmtpParseError::Invalid);
}

TEST(H264FmtpParser, UnrecognizedProfileIop)
{
  // 0x42011f -- valid hex, but profile_iop=0x01 (low reserved bit set) does
  // not match any kProfilePatterns entry for profile_idc=0x42.
  H264FmtpParams p = Parse("video/H264; profile-level-id=42011f");
  ASSERT_TRUE(p.mProfileLevel.isErr());
  EXPECT_EQ(p.mProfileLevel.inspectErr(), H264FmtpParseError::Invalid);
}

TEST(H264FmtpParser, ShortProfileLevelId)
{
  H264FmtpParams p = Parse("video/H264; profile-level-id=42e0");
  ASSERT_TRUE(p.mProfileLevel.isErr());
  EXPECT_EQ(p.mProfileLevel.inspectErr(), H264FmtpParseError::Invalid);
}
