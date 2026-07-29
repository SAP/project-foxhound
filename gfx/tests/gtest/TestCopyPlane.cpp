/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ImageContainer.h"
#include "gtest/gtest.h"
#include "mozilla/RefPtr.h"
#include "mozilla/gfx/Types.h"

using mozilla::MakeRefPtr;
using mozilla::gfx::ChromaSubsampling;
using mozilla::gfx::ColorDepth;
using mozilla::gfx::ColorRange;
using mozilla::gfx::IntRect;
using mozilla::layers::BufferRecycleBin;
using mozilla::layers::PlanarYCbCrData;
using mozilla::layers::RecyclingPlanarYCbCrImage;

static const uint32_t kWidth = 4;
static const uint32_t kHeight = 2;
static const uint32_t kHalfHeight = (kHeight + 1) / 2;
static const int32_t kStride = static_cast<int32_t>(kWidth) * 2;  // 8

static const uint8_t kUVRow[8] = {
    0x10, 0x12,  // U0
    0xAA, 0xBB,  // V0
    0x20, 0x22,  // U1
    0xCC, 0xDD,  // V1
};

static PlanarYCbCrData MakeP010Data(uint8_t* aYPlane, uint8_t* aUVPlane) {
  PlanarYCbCrData d;
  d.mYChannel = aYPlane;
  d.mYStride = kStride;
  d.mYSkip = 0;
  d.mCbChannel = aUVPlane;
  d.mCrChannel = aUVPlane + sizeof(uint16_t);
  d.mCbCrStride = kStride;
  d.mCbSkip = 1;
  d.mCrSkip = 1;
  d.mPictureRect = IntRect(0, 0, kWidth, kHeight);
  d.mChromaSubsampling = ChromaSubsampling::HALF_WIDTH_AND_HEIGHT;
  d.mColorDepth = ColorDepth::COLOR_10;
  d.mColorRange = ColorRange::LIMITED;
  return d;
}

// Verifies correct 16-bit chroma de-interleaving from a P010 UV plane.
TEST(CopyPlane, P010ChromaDeinterleave)
{
  uint8_t yPlane[kStride * kHeight] = {};
  uint8_t uvPlane[kStride * kHalfHeight];
  memcpy(uvPlane, kUVRow, sizeof(kUVRow));

  auto recycleBin = MakeRefPtr<BufferRecycleBin>();
  auto image = MakeRefPtr<RecyclingPlanarYCbCrImage>(recycleBin.get());
  ASSERT_EQ(NS_OK, image->CopyData(MakeP010Data(yPlane, uvPlane)));

  const PlanarYCbCrData* r = image->GetData();
  ASSERT_TRUE(r);

  EXPECT_EQ(r->mCbChannel[0], 0x10);  // U0lo
  EXPECT_EQ(r->mCbChannel[1], 0x12);  // U0hi
  EXPECT_EQ(r->mCbChannel[2], 0x20);  // U1lo
  EXPECT_EQ(r->mCbChannel[3], 0x22);  // U1hi
  EXPECT_EQ(r->mCbChannel[4], 0x00);  // gap
  EXPECT_EQ(r->mCbChannel[5], 0x00);
  EXPECT_EQ(r->mCbChannel[6], 0x00);
  EXPECT_EQ(r->mCbChannel[7], 0x00);

  EXPECT_EQ(r->mCrChannel[0], 0xAA);  // V0lo
  EXPECT_EQ(r->mCrChannel[1], 0xBB);  // V0hi
  EXPECT_EQ(r->mCrChannel[2], 0xCC);  // V1lo
  EXPECT_EQ(r->mCrChannel[3], 0xDD);  // V1hi
  EXPECT_EQ(r->mCrChannel[4], 0x00);  // gap
  EXPECT_EQ(r->mCrChannel[5], 0x00);
  EXPECT_EQ(r->mCrChannel[6], 0x00);
  EXPECT_EQ(r->mCrChannel[7], 0x00);
}

// Verifies gap bytes are zero even when the recycled buffer was pre-dirtied
// with 0xFF, simulating stale frame data exposed via VideoFrame.copyTo().
TEST(CopyPlane, P010GapBytesZeroFilledOnRecycledBuffer)
{
  uint8_t yPlane[kStride * kHeight] = {};
  uint8_t uvPlane[kStride * kHalfHeight];
  memcpy(uvPlane, kUVRow, sizeof(kUVRow));

  auto recycleBin = MakeRefPtr<BufferRecycleBin>();

  {
    const uint32_t bufSize = static_cast<uint32_t>(kStride) * kHalfHeight * 2 +
                             static_cast<uint32_t>(kStride) * kHeight;
    auto dirtyBuf = recycleBin->GetBuffer(bufSize);
    memset(dirtyBuf.get(), 0xFF, bufSize);
    recycleBin->RecycleBuffer(std::move(dirtyBuf), bufSize);
  }

  auto image = MakeRefPtr<RecyclingPlanarYCbCrImage>(recycleBin.get());
  ASSERT_EQ(NS_OK, image->CopyData(MakeP010Data(yPlane, uvPlane)));

  const PlanarYCbCrData* r = image->GetData();
  ASSERT_TRUE(r);

  EXPECT_EQ(r->mCbChannel[4], 0x00);
  EXPECT_EQ(r->mCbChannel[5], 0x00);
  EXPECT_EQ(r->mCbChannel[6], 0x00);
  EXPECT_EQ(r->mCbChannel[7], 0x00);
  EXPECT_EQ(r->mCrChannel[4], 0x00);
  EXPECT_EQ(r->mCrChannel[5], 0x00);
  EXPECT_EQ(r->mCrChannel[6], 0x00);
  EXPECT_EQ(r->mCrChannel[7], 0x00);
}
