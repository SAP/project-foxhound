/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "AOMDecoder.h"
#include "gtest/gtest.h"
#include "mozilla/gfx/Types.h"
#include "nsTArray.h"

using namespace mozilla;

// AV1 §6.7.4: primary_chromaticity is 0.16 fixed-point (2^16 = 65536).
static constexpr float kAV1PrimariesDivisor = 65536.0f;
// luminance_max is 24.8 fixed-point (2^8 = 256), luminance_min is 18.14 (2^14 =
// 16384).
static constexpr float kAV1MaxLumDivisor = 256.0f;
static constexpr float kAV1MinLumDivisor = 16384.0f;

static void AppendU16BE(nsTArray<uint8_t>& aDest, uint16_t aValue) {
  aDest.AppendElement(static_cast<uint8_t>(aValue >> 8));
  aDest.AppendElement(static_cast<uint8_t>(aValue & 0xff));
}

static void AppendU32BE(nsTArray<uint8_t>& aDest, uint32_t aValue) {
  aDest.AppendElement(static_cast<uint8_t>(aValue >> 24));
  aDest.AppendElement(static_cast<uint8_t>((aValue >> 16) & 0xff));
  aDest.AppendElement(static_cast<uint8_t>((aValue >> 8) & 0xff));
  aDest.AppendElement(static_cast<uint8_t>(aValue & 0xff));
}

// Build an AV1 Metadata OBU with the given metadata_type (leb128) and payload.
// Returns the full OBU byte sequence including the OBU header + size field.
static nsTArray<uint8_t> BuildMetadataOBU(uint64_t aMetadataType,
                                          const nsTArray<uint8_t>& aPayload) {
  nsTArray<uint8_t> buf;

  // OBU header: obu_forbidden_bit=0, obu_type=5 (Metadata), obu_extension=0,
  //             obu_has_size_field=1, obu_reserved_1bit=0
  // bit layout: 0 | 00101 | 0 | 1 | 0 = 0b00101010 = 0x2A
  buf.AppendElement(0x2A);

  // metadata_type as leb128 (values 1 and 2 each fit in one byte)
  nsTArray<uint8_t> content;
  content.AppendElement(static_cast<uint8_t>(aMetadataType));
  content.AppendElements(aPayload);

  // OBU size field as leb128 (content size fits in 1 byte for small payloads)
  size_t contentLen = content.Length();
  MOZ_ASSERT(contentLen < 128);
  buf.AppendElement(static_cast<uint8_t>(contentLen));

  buf.AppendElements(content);
  return buf;
}

static nsTArray<uint8_t> BuildMDCVPayload() {
  // METADATA_TYPE_HDR_MDCV (type 2): R/G/B primaries (u16 each, 0.16
  // fixed-point) + white point (u16x2) + max/min luminance (u32 each).
  // AV1 §6.7.4 primary order: R[0], G[1], B[2].
  // Values: R=(35000,17500), G=(50000,25000), B=(15000,7500),
  //         WP=(15635,16450), maxLum=10000000, minLum=100
  // Expected: R.x=35000/65536, maxLum=10000000/256, minLum=100/16384
  nsTArray<uint8_t> p;
  AppendU16BE(p, 35000);     // R x
  AppendU16BE(p, 17500);     // R y
  AppendU16BE(p, 50000);     // G x
  AppendU16BE(p, 25000);     // G y
  AppendU16BE(p, 15000);     // B x
  AppendU16BE(p, 7500);      // B y
  AppendU16BE(p, 15635);     // white point x
  AppendU16BE(p, 16450);     // white point y
  AppendU32BE(p, 10000000);  // max luminance (24.8 fixed-point)
  AppendU32BE(p, 100);       // min luminance (18.14 fixed-point)
  return p;
}

static nsTArray<uint8_t> BuildCLLPayload() {
  // METADATA_TYPE_HDR_CLL (type 1): maxCLL u16 + maxFALL u16
  nsTArray<uint8_t> p;
  AppendU16BE(p, 1000);  // maxCLL
  AppendU16BE(p, 400);   // maxFALL
  return p;
}

TEST(AOMDecoder, ReadMetadataOBUHDR_MDCVOnly)
{
  auto mdcvPayload = BuildMDCVPayload();
  auto obu = BuildMetadataOBU(2, mdcvPayload);  // MDCV = type 2
  auto span = Span<const uint8_t>(obu.Elements(), obu.Length());
  auto result = AOMDecoder::ReadMetadataOBUHDR(span);
  ASSERT_TRUE(result.isSome());
  const auto& hdr = result.value();

  ASSERT_TRUE(hdr.mSmpte2086.isSome());
  const auto& s = hdr.mSmpte2086.value();
  // AV1 primary order is R[0], G[1], B[2] — direct mapping to struct fields
  EXPECT_FLOAT_EQ(s.displayPrimaryRed.x, 35000.0f / kAV1PrimariesDivisor);
  EXPECT_FLOAT_EQ(s.displayPrimaryRed.y, 17500.0f / kAV1PrimariesDivisor);
  EXPECT_FLOAT_EQ(s.displayPrimaryGreen.x, 50000.0f / kAV1PrimariesDivisor);
  EXPECT_FLOAT_EQ(s.displayPrimaryGreen.y, 25000.0f / kAV1PrimariesDivisor);
  EXPECT_FLOAT_EQ(s.displayPrimaryBlue.x, 15000.0f / kAV1PrimariesDivisor);
  EXPECT_FLOAT_EQ(s.displayPrimaryBlue.y, 7500.0f / kAV1PrimariesDivisor);
  EXPECT_FLOAT_EQ(s.whitePoint.x, 15635.0f / kAV1PrimariesDivisor);
  EXPECT_FLOAT_EQ(s.whitePoint.y, 16450.0f / kAV1PrimariesDivisor);
  EXPECT_FLOAT_EQ(s.maxLuminance, 10000000.0f / kAV1MaxLumDivisor);
  EXPECT_FLOAT_EQ(s.minLuminance, 100.0f / kAV1MinLumDivisor);
  EXPECT_TRUE(hdr.mContentLightLevel.isNothing());
}

TEST(AOMDecoder, ReadMetadataOBUHDR_CLLOnly)
{
  auto cllPayload = BuildCLLPayload();
  auto obu = BuildMetadataOBU(1, cllPayload);  // CLL = type 1
  auto span = Span<const uint8_t>(obu.Elements(), obu.Length());
  auto result = AOMDecoder::ReadMetadataOBUHDR(span);
  ASSERT_TRUE(result.isSome());
  const auto& hdr = result.value();

  EXPECT_TRUE(hdr.mSmpte2086.isNothing());
  ASSERT_TRUE(hdr.mContentLightLevel.isSome());
  EXPECT_EQ(hdr.mContentLightLevel->maxContentLightLevel, 1000u);
  EXPECT_EQ(hdr.mContentLightLevel->maxFrameAverageLightLevel, 400u);
}

TEST(AOMDecoder, ReadMetadataOBUHDR_MDCVAndCLL)
{
  nsTArray<uint8_t> sample;
  auto mdcvPayload = BuildMDCVPayload();
  auto mdcvOBU = BuildMetadataOBU(2, mdcvPayload);  // MDCV = type 2
  auto cllPayload = BuildCLLPayload();
  auto cllOBU = BuildMetadataOBU(1, cllPayload);  // CLL = type 1
  sample.AppendElements(mdcvOBU);
  sample.AppendElements(cllOBU);

  auto span = Span<const uint8_t>(sample.Elements(), sample.Length());
  auto result = AOMDecoder::ReadMetadataOBUHDR(span);
  ASSERT_TRUE(result.isSome());
  const auto& hdr = result.value();

  EXPECT_TRUE(hdr.mSmpte2086.isSome());
  EXPECT_TRUE(hdr.mContentLightLevel.isSome());
}

TEST(AOMDecoder, ReadMetadataOBUHDR_NoHDROBU)
{
  // A temporal delimiter OBU (type 2) — no Metadata OBU present
  nsTArray<uint8_t> sample;
  sample.AppendElement(0x12);  // obu_type=2 (TemporalDelimiter), has_size=1
  sample.AppendElement(0x00);  // size=0
  auto span = Span<const uint8_t>(sample.Elements(), sample.Length());
  auto result = AOMDecoder::ReadMetadataOBUHDR(span);
  EXPECT_TRUE(result.isNothing());
}

TEST(AOMDecoder, ReadMetadataOBUHDR_WrongMDCVSize)
{
  // MDCV OBU with payload too small (< 24 bytes) — should be skipped.
  nsTArray<uint8_t> shortPayload;
  for (int i = 0; i < 10; i++) {
    shortPayload.AppendElement(0x00);
  }
  auto obu = BuildMetadataOBU(2, shortPayload);  // MDCV = type 2
  auto span = Span<const uint8_t>(obu.Elements(), obu.Length());
  auto result = AOMDecoder::ReadMetadataOBUHDR(span);
  EXPECT_TRUE(result.isNothing());
}

TEST(AOMDecoder, ReadMetadataOBUHDR_WrongCLLSize)
{
  // CLL OBU with payload too small (< 4 bytes) — should be skipped.
  nsTArray<uint8_t> shortPayload;
  shortPayload.AppendElement(0x00);
  shortPayload.AppendElement(0x01);
  auto obu = BuildMetadataOBU(1, shortPayload);  // CLL = type 1
  auto span = Span<const uint8_t>(obu.Elements(), obu.Length());
  auto result = AOMDecoder::ReadMetadataOBUHDR(span);
  EXPECT_TRUE(result.isNothing());
}
