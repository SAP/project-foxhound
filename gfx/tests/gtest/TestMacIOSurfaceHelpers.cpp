/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Tests for MacIOSurfaceHelpers: verifies that CPU readback of MacIOSurfaces
// via CreateSourceSurfaceFromMacIOSurface produces correct BGRA pixel values
// for 10-bit biplanar formats (P010, NV16).

#include "gtest/gtest.h"
#include "mozilla/gfx/2D.h"
#include "mozilla/gfx/MacIOSurface.h"
#include "MacIOSurfaceHelpers.h"

using namespace mozilla;
using namespace mozilla::gfx;
using namespace mozilla::layers;

static void FillBiPlanarSurface(MacIOSurface* aSurface, uint16_t aYVal,
                                uint16_t aCbCrVal) {
  uint16_t* yPlane =
      reinterpret_cast<uint16_t*>(aSurface->GetBaseAddressOfPlane(0));
  size_t yStride = aSurface->GetBytesPerRow(0) / sizeof(uint16_t);
  for (size_t y = 0; y < aSurface->GetDevicePixelHeight(0); y++) {
    for (size_t x = 0; x < aSurface->GetDevicePixelWidth(0); x++) {
      yPlane[y * yStride + x] = aYVal;
    }
  }

  uint16_t* cbcrPlane =
      reinterpret_cast<uint16_t*>(aSurface->GetBaseAddressOfPlane(1));
  size_t cbcrStride = aSurface->GetBytesPerRow(1) / sizeof(uint16_t);
  for (size_t y = 0; y < aSurface->GetDevicePixelHeight(1); y++) {
    for (size_t x = 0; x < aSurface->GetDevicePixelWidth(1); x++) {
      cbcrPlane[y * cbcrStride + x * 2] = aCbCrVal;
      cbcrPlane[y * cbcrStride + x * 2 + 1] = aCbCrVal;
    }
  }
}

static void TestBiPlanarMidGrayReadback(const IntSize& aYSize,
                                        const IntSize& aCbCrSize,
                                        ChromaSubsampling aSubsampling) {
  RefPtr<MacIOSurface> surface = MacIOSurface::CreateBiPlanarSurface(
      aYSize, aCbCrSize, aSubsampling, YUVColorSpace::BT709,
      TransferFunction::BT709, ColorRange::FULL, ColorDepth::COLOR_10);
  ASSERT_TRUE(surface);

  // Mid-gray in 10-bit full range: Y=Cb=Cr=512, stored in bits 15:6.
  ASSERT_TRUE(surface->Lock(false));
  FillBiPlanarSurface(surface, uint16_t(512) << 6, uint16_t(512) << 6);
  surface->Unlock();

  RefPtr<SourceSurface> sourceSurface =
      CreateSourceSurfaceFromMacIOSurface(surface);
  ASSERT_TRUE(sourceSurface);
  ASSERT_EQ(sourceSurface->GetSize(), aYSize);

  RefPtr<DataSourceSurface> dataSurface = sourceSurface->GetDataSurface();
  ASSERT_TRUE(dataSurface);

  DataSourceSurface::ScopedMap map(dataSurface, DataSourceSurface::READ);
  ASSERT_TRUE(map.IsMapped());

  uint8_t* pixels = map.GetData();
  const int32_t stride = map.GetStride();
  for (int y = 0; y < aYSize.height; y++) {
    for (int x = 0; x < aYSize.width; x++) {
      EXPECT_NEAR(pixels[y * stride + x * 4 + 0], 128, 3)
          << "Pixel (" << x << "," << y << ")";
      EXPECT_NEAR(pixels[y * stride + x * 4 + 1], 128, 3)
          << "Pixel (" << x << "," << y << ")";
      EXPECT_NEAR(pixels[y * stride + x * 4 + 2], 128, 3)
          << "Pixel (" << x << "," << y << ")";
    }
  }
}

// Tests that a P010 (10-bit 4:2:0 biplanar) IOSurface filled with mid-gray
// produces the correct BGRA output via CreateSourceSurfaceFromMacIOSurface.
TEST(MacIOSurfaceHelpers, P010Readback)
{
  ASSERT_NO_FATAL_FAILURE(TestBiPlanarMidGrayReadback(
      IntSize(16, 16), IntSize(8, 8),
      ChromaSubsampling::HALF_WIDTH_AND_HEIGHT));
}

// Tests that an NV16 (10-bit 4:2:2 biplanar) IOSurface filled with mid-gray
// produces the correct BGRA output via CreateSourceSurfaceFromMacIOSurface.
TEST(MacIOSurfaceHelpers, NV16Readback)
{
  ASSERT_NO_FATAL_FAILURE(TestBiPlanarMidGrayReadback(
      IntSize(16, 16), IntSize(8, 16), ChromaSubsampling::HALF_WIDTH));
}
