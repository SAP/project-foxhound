/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"

#include <cmath>

#include "Common.h"
#include "Decoder.h"
#include "DecoderFactory.h"
#include "IDecodingTask.h"
#include "imgIEncoder.h"
#include "mozilla/gfx/2D.h"
#include "nsComponentManagerUtils.h"
#include "nsCOMPtr.h"
#include "nsStreamUtils.h"
#include "nsString.h"
#include "SourceBuffer.h"

using namespace mozilla;
using namespace mozilla::gfx;
using namespace mozilla::image;

static const int32_t kWidth = 5;
static const int32_t kHeight = 4;

static int32_t StrideForFormat(uint32_t aFormat) {
  if (aFormat == imgIEncoder::INPUT_FORMAT_R10G10B10A2) {
    return kWidth * 4;
  }
  return kWidth * 8;
}

// 5x4 test image with 10 distinct colors and mixed alpha:
// Row 0 (opaque):     red,   green,  blue,   orange,  purple
// Row 1 (opaque):     white, gray,   cyan,   yellow,  lime
// Row 2 (alpha ~1/3): same as row 0
// Row 3 (alpha ~2/3): same as row 1
//
// RGB as fractions: red(1,0,0) green(0,1,0) blue(0,0,1) orange(1,.5,0)
//   purple(.5,0,.5) white(1,1,1) gray(.5,.5,.5) cyan(0,1,1)
//   yellow(1,1,0) lime(.5,1,0)

struct ColorRGB {
  float r, g, b;
};

static const ColorRGB kRow0Colors[] = {
    {1, 0, 0}, {0, 1, 0}, {0, 0, 1}, {1, 0.5f, 0}, {0.5f, 0, 0.5f},
};
static const ColorRGB kRow1Colors[] = {
    {1, 1, 1}, {0.5f, 0.5f, 0.5f}, {0, 1, 1}, {1, 1, 0}, {0.5f, 1, 0},
};

static uint16_t Scale(float aFrac, uint16_t aMax) {
  return static_cast<uint16_t>(std::lround(static_cast<double>(aFrac) * aMax));
}

static void FillU16Row(uint16_t* aDst, const ColorRGB* aColors, uint16_t aAlpha,
                       uint16_t aMax) {
  for (int i = 0; i < kWidth; i++) {
    aDst[i * 4 + 0] = Scale(aColors[i].r, aMax);
    aDst[i * 4 + 1] = Scale(aColors[i].g, aMax);
    aDst[i * 4 + 2] = Scale(aColors[i].b, aMax);
    aDst[i * 4 + 3] = aAlpha;
  }
}

static void FillU16TestPixels(uint16_t* p) {
  FillU16Row(p + 0 * kWidth * 4, kRow0Colors, 65535, 65535);
  FillU16Row(p + 1 * kWidth * 4, kRow1Colors, 65535, 65535);
  FillU16Row(p + 2 * kWidth * 4, kRow0Colors, 21845, 65535);  // ~1/3
  FillU16Row(p + 3 * kWidth * 4, kRow1Colors, 43690, 65535);  // ~2/3
}

static void FillU10TestPixels(uint16_t* p) {
  FillU16Row(p + 0 * kWidth * 4, kRow0Colors, 1023, 1023);
  FillU16Row(p + 1 * kWidth * 4, kRow1Colors, 1023, 1023);
  FillU16Row(p + 2 * kWidth * 4, kRow0Colors, 341, 1023);
  FillU16Row(p + 3 * kWidth * 4, kRow1Colors, 682, 1023);
}

static void FillU12TestPixels(uint16_t* p) {
  FillU16Row(p + 0 * kWidth * 4, kRow0Colors, 4095, 4095);
  FillU16Row(p + 1 * kWidth * 4, kRow1Colors, 4095, 4095);
  FillU16Row(p + 2 * kWidth * 4, kRow0Colors, 1365, 4095);
  FillU16Row(p + 3 * kWidth * 4, kRow1Colors, 2730, 4095);
}

static uint32_t PackR10G10B10A2(uint32_t r, uint32_t g, uint32_t b,
                                uint32_t a) {
  return (b & 0x3FF) | ((g & 0x3FF) << 10) | ((r & 0x3FF) << 20) |
         ((a & 0x3) << 30);
}

static void FillR10G10B10A2Row(uint32_t* aDst, const ColorRGB* aColors,
                               uint32_t aAlpha) {
  for (int i = 0; i < kWidth; i++) {
    aDst[i] =
        PackR10G10B10A2(Scale(aColors[i].r, 1023), Scale(aColors[i].g, 1023),
                        Scale(aColors[i].b, 1023), aAlpha);
  }
}

static void FillR10G10B10A2TestPixels(uint32_t* p) {
  FillR10G10B10A2Row(p + 0 * kWidth, kRow0Colors, 3);
  FillR10G10B10A2Row(p + 1 * kWidth, kRow1Colors, 3);
  FillR10G10B10A2Row(p + 2 * kWidth, kRow0Colors, 1);
  FillR10G10B10A2Row(p + 3 * kWidth, kRow1Colors, 2);
}

// float16 constants
static const uint16_t kF16_0 = 0x0000;
static const uint16_t kF16_Half = 0x3800;
static const uint16_t kF16_1 = 0x3C00;
static const uint16_t kF16_Third = 0x3555;      // ~1/3
static const uint16_t kF16_TwoThirds = 0x3955;  // ~2/3

static uint16_t FracToF16(float aFrac) {
  if (aFrac <= 0.0f) return kF16_0;
  if (aFrac >= 1.0f) return kF16_1;
  return kF16_Half;  // only other color fraction we use is 0.5
}

static void FillF16Row(uint16_t* aDst, const ColorRGB* aColors,
                       uint16_t aAlphaF16) {
  for (int i = 0; i < kWidth; i++) {
    aDst[i * 4 + 0] = FracToF16(aColors[i].r);
    aDst[i * 4 + 1] = FracToF16(aColors[i].g);
    aDst[i * 4 + 2] = FracToF16(aColors[i].b);
    aDst[i * 4 + 3] = aAlphaF16;
  }
}

static void FillF16TestPixels(uint16_t* p) {
  FillF16Row(p + 0 * kWidth * 4, kRow0Colors, kF16_1);
  FillF16Row(p + 1 * kWidth * 4, kRow1Colors, kF16_1);
  FillF16Row(p + 2 * kWidth * 4, kRow0Colors, kF16_Third);
  FillF16Row(p + 3 * kWidth * 4, kRow1Colors, kF16_TwoThirds);
}

// Encode pixels using nsPNGEncoder, returning the encoded PNG as a byte buffer.
static nsTArray<uint8_t> EncodeHDRPNG(const uint8_t* aData, uint32_t aLength,
                                      uint32_t aFormat) {
  nsCOMPtr<imgIEncoder> encoder =
      do_CreateInstance("@mozilla.org/image/encoder;2?type=image/png");
  EXPECT_TRUE(encoder != nullptr);

  nsresult rv = encoder->InitFromData(aData, aLength, kWidth, kHeight,
                                      StrideForFormat(aFormat), aFormat, u""_ns,
                                      VoidCString());
  EXPECT_NS_SUCCEEDED(rv);

  nsCOMPtr<nsIInputStream> stream(encoder);
  EXPECT_TRUE(stream != nullptr);

  uint64_t available;
  rv = stream->Available(&available);
  EXPECT_NS_SUCCEEDED(rv);

  nsTArray<uint8_t> result;
  result.SetLength(available);
  uint32_t bytesRead;
  rv = stream->Read(reinterpret_cast<char*>(result.Elements()), available,
                    &bytesRead);
  EXPECT_NS_SUCCEEDED(rv);
  result.SetLength(bytesRead);
  return result;
}

// Decode a PNG byte buffer and return the decoded SourceSurface.
static RefPtr<SourceSurface> DecodePNG(const nsTArray<uint8_t>& aPNGData) {
  auto sourceBuffer = MakeNotNull<RefPtr<SourceBuffer>>();
  sourceBuffer->ExpectLength(aPNGData.Length());
  nsresult rv = sourceBuffer->Append(
      reinterpret_cast<const char*>(aPNGData.Elements()), aPNGData.Length());
  EXPECT_NS_SUCCEEDED(rv);
  sourceBuffer->Complete(NS_OK);

  DecoderType decoderType = DecoderFactory::GetDecoderType("image/png");
  RefPtr<Decoder> decoder = DecoderFactory::CreateAnonymousDecoder(
      decoderType, sourceBuffer, Nothing(), DecoderFlags::FIRST_FRAME_ONLY,
      DefaultSurfaceFlags());
  EXPECT_TRUE(decoder != nullptr);

  auto task = MakeRefPtr<AnonymousDecodingTask>(WrapNotNull(decoder),
                                                /* aResumable */ false);
  task->Run();

  EXPECT_TRUE(decoder->GetDecodeDone());
  EXPECT_FALSE(decoder->HasError());

  OrientedIntSize size = decoder->Size();
  EXPECT_EQ(kWidth, size.width);
  EXPECT_EQ(kHeight, size.height);

  RawAccessFrameRef currentFrame = decoder->GetCurrentFrameRef();
  RefPtr<SourceSurface> surface = currentFrame->GetSourceSurface();
  EXPECT_TRUE(surface != nullptr);

  return surface;
}

// Build expected 8-bit BGRAColor row from color fractions and alpha.
// The decoded surface is premultiplied, so we premultiply expected values.
static std::vector<BGRAColor> MakeExpectedRow(const ColorRGB* aColors,
                                              uint8_t aAlpha) {
  std::vector<BGRAColor> row;
  for (int i = 0; i < kWidth; i++) {
    uint8_t r = static_cast<uint8_t>(std::lround(aColors[i].r * 255));
    uint8_t g = static_cast<uint8_t>(std::lround(aColors[i].g * 255));
    uint8_t b = static_cast<uint8_t>(std::lround(aColors[i].b * 255));
    row.push_back(BGRAColor(b, g, r, aAlpha).Premultiply());
  }
  return row;
}

static void VerifyPixels(SourceSurface* aSurface) {
  const ColorRGB* rowColors[] = {kRow0Colors, kRow1Colors, kRow0Colors,
                                 kRow1Colors};
  const uint8_t rowAlphas[] = {255, 255, 85, 170};

  for (int row = 0; row < kHeight; row++) {
    auto expected = MakeExpectedRow(rowColors[row], rowAlphas[row]);
    for (int col = 0; col < kWidth; col++) {
      // Allow fuzz for rounding differences in premultiplication and
      // bit-depth scaling.
      EXPECT_TRUE(RectIsSolidColor(aSurface, IntRect(col, row, 1, 1),
                                   expected[col], /* aFuzz = */ 1));
    }
  }
}

TEST(ImageHDRPNGEncoder, R10G10B10A2RoundTrip)
{
  AutoInitializeImageLib initLib;

  uint32_t pixels[kWidth * kHeight];
  FillR10G10B10A2TestPixels(pixels);

  nsTArray<uint8_t> pngData =
      EncodeHDRPNG(reinterpret_cast<const uint8_t*>(pixels), sizeof(pixels),
                   imgIEncoder::INPUT_FORMAT_R10G10B10A2);
  ASSERT_GT(pngData.Length(), 0u);

  RefPtr<SourceSurface> surface = DecodePNG(pngData);
  ASSERT_TRUE(surface != nullptr);

  VerifyPixels(surface);
}

TEST(ImageHDRPNGEncoder, U10RoundTrip)
{
  AutoInitializeImageLib initLib;

  uint16_t pixels[kWidth * kHeight * 4];
  FillU10TestPixels(pixels);

  nsTArray<uint8_t> pngData =
      EncodeHDRPNG(reinterpret_cast<const uint8_t*>(pixels), sizeof(pixels),
                   imgIEncoder::INPUT_FORMAT_RGBA_U10);
  ASSERT_GT(pngData.Length(), 0u);

  RefPtr<SourceSurface> surface = DecodePNG(pngData);
  ASSERT_TRUE(surface != nullptr);

  VerifyPixels(surface);
}

TEST(ImageHDRPNGEncoder, U12RoundTrip)
{
  AutoInitializeImageLib initLib;

  uint16_t pixels[kWidth * kHeight * 4];
  FillU12TestPixels(pixels);

  nsTArray<uint8_t> pngData =
      EncodeHDRPNG(reinterpret_cast<const uint8_t*>(pixels), sizeof(pixels),
                   imgIEncoder::INPUT_FORMAT_RGBA_U12);
  ASSERT_GT(pngData.Length(), 0u);

  RefPtr<SourceSurface> surface = DecodePNG(pngData);
  ASSERT_TRUE(surface != nullptr);

  VerifyPixels(surface);
}

TEST(ImageHDRPNGEncoder, U16RoundTrip)
{
  AutoInitializeImageLib initLib;

  uint16_t pixels[kWidth * kHeight * 4];
  FillU16TestPixels(pixels);

  nsTArray<uint8_t> pngData =
      EncodeHDRPNG(reinterpret_cast<const uint8_t*>(pixels), sizeof(pixels),
                   imgIEncoder::INPUT_FORMAT_RGBA_U16);
  ASSERT_GT(pngData.Length(), 0u);

  RefPtr<SourceSurface> surface = DecodePNG(pngData);
  ASSERT_TRUE(surface != nullptr);

  VerifyPixels(surface);
}

TEST(ImageHDRPNGEncoder, F16RoundTrip)
{
  AutoInitializeImageLib initLib;

  uint16_t pixels[kWidth * kHeight * 4];
  FillF16TestPixels(pixels);

  nsTArray<uint8_t> pngData =
      EncodeHDRPNG(reinterpret_cast<const uint8_t*>(pixels), sizeof(pixels),
                   imgIEncoder::INPUT_FORMAT_RGBA_F16);
  ASSERT_GT(pngData.Length(), 0u);

  RefPtr<SourceSurface> surface = DecodePNG(pngData);
  ASSERT_TRUE(surface != nullptr);

  VerifyPixels(surface);
}
