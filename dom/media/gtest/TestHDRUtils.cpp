/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "HDRUtils.h"
#include "gtest/gtest.h"
#include "mozilla/gfx/Types.h"

using namespace mozilla;
using namespace mozilla::gfx;

// BT.2020 primaries + D65 white point (ITU-R BT.2020-2 Table 2).
// G: (0.170, 0.797)  B: (0.131, 0.046)  R: (0.708, 0.292)
// White: (0.3127, 0.3290)
static Smpte2086Metadata MakeBT2020_1000nit() {
  Smpte2086Metadata m;
  m.displayPrimaryRed = {0.708f, 0.292f};
  m.displayPrimaryGreen = {0.170f, 0.797f};
  m.displayPrimaryBlue = {0.131f, 0.046f};
  m.whitePoint = {0.3127f, 0.3290f};
  m.maxLuminance = 1000.0f;
  m.minLuminance = 0.005f;
  return m;
}

// ITU-T H.265 §D.3.28 suggests c=0 green, c=1 blue, c=2 red on the wire,
// regardless of the R/G/B storage order in Smpte2086Metadata.
TEST(HDRUtils, EncodeSmpte2086_PrimaryOrder)
{
  nsTArray<uint8_t> buf;
  ASSERT_TRUE(EncodeSmpte2086Payload(MakeBT2020_1000nit(), buf));
  ASSERT_EQ(buf.Length(), 24u);

  // Green X = round(0.170 * 50000) = 8500 = 0x2134
  EXPECT_EQ(buf[0], 0x21u);
  EXPECT_EQ(buf[1], 0x34u);
  // Green Y = round(0.797 * 50000) = 39850 = 0x9BAA
  EXPECT_EQ(buf[2], 0x9Bu);
  EXPECT_EQ(buf[3], 0xAAu);
  // Blue X = round(0.131 * 50000) = 6550 = 0x1996
  EXPECT_EQ(buf[4], 0x19u);
  EXPECT_EQ(buf[5], 0x96u);
  // Blue Y = round(0.046 * 50000) = 2300 = 0x08FC
  EXPECT_EQ(buf[6], 0x08u);
  EXPECT_EQ(buf[7], 0xFCu);
  // Red X = round(0.708 * 50000) = 35400 = 0x8A48
  EXPECT_EQ(buf[8], 0x8Au);
  EXPECT_EQ(buf[9], 0x48u);
  // Red Y = round(0.292 * 50000) = 14600 = 0x3908
  EXPECT_EQ(buf[10], 0x39u);
  EXPECT_EQ(buf[11], 0x08u);
}

// Verify white point and luminance fields.
TEST(HDRUtils, EncodeSmpte2086_WhitePointAndLuminance)
{
  nsTArray<uint8_t> buf;
  ASSERT_TRUE(EncodeSmpte2086Payload(MakeBT2020_1000nit(), buf));
  ASSERT_EQ(buf.Length(), 24u);

  // White X = round(0.3127 * 50000) = 15635 = 0x3D13
  EXPECT_EQ(buf[12], 0x3Du);
  EXPECT_EQ(buf[13], 0x13u);
  // White Y = round(0.3290 * 50000) = 16450 = 0x4042
  EXPECT_EQ(buf[14], 0x40u);
  EXPECT_EQ(buf[15], 0x42u);
  // maxLuminance = round(1000.0 * 10000) = 10000000 = 0x00989680
  EXPECT_EQ(buf[16], 0x00u);
  EXPECT_EQ(buf[17], 0x98u);
  EXPECT_EQ(buf[18], 0x96u);
  EXPECT_EQ(buf[19], 0x80u);
  // minLuminance = round(0.005 * 10000) = 50 = 0x00000032
  EXPECT_EQ(buf[20], 0x00u);
  EXPECT_EQ(buf[21], 0x00u);
  EXPECT_EQ(buf[22], 0x00u);
  EXPECT_EQ(buf[23], 0x32u);
}

// Negative luminance must clamp to zero, not produce UB.
TEST(HDRUtils, EncodeSmpte2086_ClampNegative)
{
  Smpte2086Metadata m = MakeBT2020_1000nit();
  m.minLuminance = -1.0f;
  nsTArray<uint8_t> buf;
  ASSERT_TRUE(EncodeSmpte2086Payload(m, buf));
  ASSERT_EQ(buf.Length(), 24u);
  EXPECT_EQ(buf[20], 0x00u);
  EXPECT_EQ(buf[21], 0x00u);
  EXPECT_EQ(buf[22], 0x00u);
  EXPECT_EQ(buf[23], 0x00u);
}

// Chromaticity > 1.0 must clamp to uint16 max, not wrap.
TEST(HDRUtils, EncodeSmpte2086_ClampChromaticityOverflow)
{
  Smpte2086Metadata m = MakeBT2020_1000nit();
  m.displayPrimaryRed.x = 2.0f;  // 2.0 * 50000 = 100000 > 65535
  nsTArray<uint8_t> buf;
  ASSERT_TRUE(EncodeSmpte2086Payload(m, buf));
  ASSERT_EQ(buf.Length(), 24u);
  // Red X at offsets 8-9 must be 0xFFFF
  EXPECT_EQ(buf[8], 0xFFu);
  EXPECT_EQ(buf[9], 0xFFu);
}

TEST(HDRUtils, EncodeContentLightLevel_Basic)
{
  ContentLightLevel cll{1000, 400};
  nsTArray<uint8_t> buf;
  ASSERT_TRUE(EncodeContentLightLevelPayload(cll, buf));
  ASSERT_EQ(buf.Length(), 4u);
  // MaxCLL = 1000 = 0x03E8
  EXPECT_EQ(buf[0], 0x03u);
  EXPECT_EQ(buf[1], 0xE8u);
  // MaxFALL = 400 = 0x0190
  EXPECT_EQ(buf[2], 0x01u);
  EXPECT_EQ(buf[3], 0x90u);
}

TEST(HDRUtils, EncodeContentLightLevel_Zero)
{
  ContentLightLevel cll{0, 0};
  nsTArray<uint8_t> buf;
  ASSERT_TRUE(EncodeContentLightLevelPayload(cll, buf));
  ASSERT_EQ(buf.Length(), 4u);
  EXPECT_EQ(buf[0], 0x00u);
  EXPECT_EQ(buf[1], 0x00u);
  EXPECT_EQ(buf[2], 0x00u);
  EXPECT_EQ(buf[3], 0x00u);
}

TEST(HDRUtils, EncodeContentLightLevel_MaxValues)
{
  ContentLightLevel cll{65535, 65535};
  nsTArray<uint8_t> buf;
  ASSERT_TRUE(EncodeContentLightLevelPayload(cll, buf));
  ASSERT_EQ(buf.Length(), 4u);
  EXPECT_EQ(buf[0], 0xFFu);
  EXPECT_EQ(buf[1], 0xFFu);
  EXPECT_EQ(buf[2], 0xFFu);
  EXPECT_EQ(buf[3], 0xFFu);
}
