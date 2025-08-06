/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "MacIOSurfaceHelpers.h"
#include "MacIOSurfaceImage.h"
#include "gfxPlatform.h"
#include "mozilla/layers/CompositableClient.h"
#include "mozilla/layers/CompositableForwarder.h"
#include "mozilla/layers/MacIOSurfaceTextureClientOGL.h"
#include "mozilla/layers/TextureForwarder.h"
#include "mozilla/StaticPrefs_layers.h"
#include "mozilla/UniquePtr.h"
#include "mozilla/Unused.h"
#include "YCbCrUtils.h"

using namespace mozilla::layers;
using namespace mozilla::gfx;

TextureClient* MacIOSurfaceImage::GetTextureClient(
    KnowsCompositor* aKnowsCompositor) {
  if (!mTextureClient) {
    BackendType backend = BackendType::NONE;
    TextureFlags flags =
        IsDRM() ? TextureFlags::DRM_SOURCE : TextureFlags::DEFAULT;
    mTextureClient = TextureClient::CreateWithData(
        MacIOSurfaceTextureData::Create(mSurface, backend), flags,
        aKnowsCompositor->GetTextureForwarder());
  }
  return mTextureClient;
}

ColorDepth MacIOSurfaceImage::GetColorDepth() const {
  if (!mSurface) {
    return gfx::ColorDepth::COLOR_8;
  }
  return mSurface->GetColorDepth();
}

already_AddRefed<SourceSurface> MacIOSurfaceImage::GetAsSourceSurface() {
  return CreateSourceSurfaceFromMacIOSurface(mSurface);
}

nsresult MacIOSurfaceImage::BuildSurfaceDescriptorBuffer(
    SurfaceDescriptorBuffer& aSdBuffer, BuildSdbFlags aFlags,
    const std::function<MemoryOrShmem(uint32_t)>& aAllocate) {
  return CreateSurfaceDescriptorBufferFromMacIOSurface(mSurface, aSdBuffer,
                                                       aFlags, aAllocate);
}

static inline uint16_t safeShift10BitBy6(const uint16_t& a10BitLSB) {
  // a10BitLSB is a 10-bit value packed into the least significant bits of
  // a 16 bit value. This function asserts that the 6 MSBs are zero, then
  // shifts the 10 LSBs by 6 to become the MSBs.
  MOZ_ASSERT((a10BitLSB & 0b1111'1100'0000'0000) == 0);
  return a10BitLSB << 6;
}

bool MacIOSurfaceImage::SetData(ImageContainer* aContainer,
                                const PlanarYCbCrData& aData) {
  MOZ_ASSERT(!mSurface);

  if (aData.mYSkip != 0 || aData.mCbSkip != 0 || aData.mCrSkip != 0 ||
      !(aData.mYUVColorSpace == YUVColorSpace::BT601 ||
        aData.mYUVColorSpace == YUVColorSpace::BT709 ||
        aData.mYUVColorSpace == YUVColorSpace::BT2020) ||
      !(aData.mColorRange == ColorRange::FULL ||
        aData.mColorRange == ColorRange::LIMITED) ||
      !(aData.mColorDepth == ColorDepth::COLOR_8 ||
        aData.mColorDepth == ColorDepth::COLOR_10)) {
    return false;
  }

  // We can only support 4:2:2 and 4:2:0 formats currently.
  switch (aData.mChromaSubsampling) {
    case ChromaSubsampling::HALF_WIDTH:
    case ChromaSubsampling::HALF_WIDTH_AND_HEIGHT:
      break;
    default:
      return false;
  }

  RefPtr<MacIOSurfaceRecycleAllocator> allocator =
      aContainer->GetMacIOSurfaceRecycleAllocator();

  auto ySize = aData.YDataSize();
  auto cbcrSize = aData.CbCrDataSize();
  RefPtr<MacIOSurface> surf = allocator->Allocate(
      ySize, cbcrSize, aData.mChromaSubsampling, aData.mYUVColorSpace,
      aData.mTransferFunction, aData.mColorRange, aData.mColorDepth);

  if (NS_WARN_IF(!surf) || NS_WARN_IF(!surf->Lock(false))) {
    return false;
  }

  if (surf->GetFormat() == SurfaceFormat::YUY2) {
    // If the CbCrSize's height is half of the YSize's height, then we'll
    // need to duplicate the CbCr data on every second row.
    size_t heightScale = ySize.height / cbcrSize.height;

    // The underlying IOSurface has format
    // kCVPixelFormatType_422YpCbCr8FullRange or
    // kCVPixelFormatType_422YpCbCr8_yuvs, which uses a 4:2:2 Y`0 Cb Y`1 Cr
    // layout. See CVPixelBuffer.h for the full list of format descriptions.
    MOZ_ASSERT(ySize.height > 0);
    uint8_t* dst = (uint8_t*)surf->GetBaseAddressOfPlane(0);
    size_t stride = surf->GetBytesPerRow(0);
    for (size_t i = 0; i < (size_t)ySize.height; i++) {
      // Compute the row addresses. If the input was 4:2:0, then
      // we divide i by 2, so that each source row of CbCr maps to
      // two dest rows.
      uint8_t* rowYSrc = aData.mYChannel + aData.mYStride * i;
      uint8_t* rowCbSrc =
          aData.mCbChannel + aData.mCbCrStride * (i / heightScale);
      uint8_t* rowCrSrc =
          aData.mCrChannel + aData.mCbCrStride * (i / heightScale);
      uint8_t* rowDst = dst + stride * i;

      // Iterate across the CbCr width (which we have guaranteed to be half of
      // the surface width), and write two 16bit pixels each time.
      for (size_t j = 0; j < (size_t)cbcrSize.width; j++) {
        *rowDst = *rowYSrc;
        rowDst++;
        rowYSrc++;

        *rowDst = *rowCbSrc;
        rowDst++;
        rowCbSrc++;

        *rowDst = *rowYSrc;
        rowDst++;
        rowYSrc++;

        *rowDst = *rowCrSrc;
        rowDst++;
        rowCrSrc++;
      }
    }
  } else if (surf->GetFormat() == SurfaceFormat::NV12) {
    MOZ_ASSERT(ySize.height > 0);
    uint8_t* dst = (uint8_t*)surf->GetBaseAddressOfPlane(0);
    size_t stride = surf->GetBytesPerRow(0);
    for (size_t i = 0; i < (size_t)ySize.height; i++) {
      uint8_t* rowSrc = aData.mYChannel + aData.mYStride * i;
      uint8_t* rowDst = dst + stride * i;
      memcpy(rowDst, rowSrc, ySize.width);
    }

    // Copy and interleave the Cb and Cr channels.
    MOZ_ASSERT(cbcrSize.height > 0);
    dst = (uint8_t*)surf->GetBaseAddressOfPlane(1);
    stride = surf->GetBytesPerRow(1);
    for (size_t i = 0; i < (size_t)cbcrSize.height; i++) {
      uint8_t* rowCbSrc = aData.mCbChannel + aData.mCbCrStride * i;
      uint8_t* rowCrSrc = aData.mCrChannel + aData.mCbCrStride * i;
      uint8_t* rowDst = dst + stride * i;

      for (size_t j = 0; j < (size_t)cbcrSize.width; j++) {
        *rowDst = *rowCbSrc;
        rowDst++;
        rowCbSrc++;

        *rowDst = *rowCrSrc;
        rowDst++;
        rowCrSrc++;
      }
    }
  } else if (surf->GetFormat() == SurfaceFormat::P010) {
    MOZ_ASSERT(ySize.height > 0);
    auto dst = reinterpret_cast<uint16_t*>(surf->GetBaseAddressOfPlane(0));
    size_t stride = surf->GetBytesPerRow(0) / 2;
    for (size_t i = 0; i < (size_t)ySize.height; i++) {
      auto rowSrc = reinterpret_cast<const uint16_t*>(aData.mYChannel +
                                                      aData.mYStride * i);
      auto rowDst = dst + stride * i;

      for (const auto j : IntegerRange(ySize.width)) {
        Unused << j;

        *rowDst = safeShift10BitBy6(*rowSrc);
        rowDst++;
        rowSrc++;
      }
    }

    // Copy and interleave the Cb and Cr channels.
    MOZ_ASSERT(cbcrSize.height > 0);
    dst = (uint16_t*)surf->GetBaseAddressOfPlane(1);
    stride = surf->GetBytesPerRow(1) / 2;
    for (size_t i = 0; i < (size_t)cbcrSize.height; i++) {
      uint16_t* rowCbSrc =
          (uint16_t*)(aData.mCbChannel + aData.mCbCrStride * i);
      uint16_t* rowCrSrc =
          (uint16_t*)(aData.mCrChannel + aData.mCbCrStride * i);
      uint16_t* rowDst = dst + stride * i;

      for (const auto j : IntegerRange(cbcrSize.width)) {
        Unused << j;

        *rowDst = safeShift10BitBy6(*rowCbSrc);
        rowDst++;
        rowCbSrc++;

        *rowDst = safeShift10BitBy6(*rowCrSrc);
        rowDst++;
        rowCrSrc++;
      }
    }
  } else if (surf->GetFormat() == SurfaceFormat::NV16) {
    MOZ_ASSERT(aData.mColorDepth == ColorDepth::COLOR_10,
               "Currently NV16 only supports 10-bit color.");
    MOZ_ASSERT(ySize.height > 0);
    auto dst = reinterpret_cast<uint16_t*>(surf->GetBaseAddressOfPlane(0));
    size_t stride = surf->GetBytesPerRow(0) / 2;
    for (size_t i = 0; i < (size_t)ySize.height; i++) {
      auto rowSrc = reinterpret_cast<const uint16_t*>(aData.mYChannel +
                                                      aData.mYStride * i);
      auto rowDst = dst + stride * i;

      for (const auto j : IntegerRange(ySize.width)) {
        Unused << j;

        *rowDst = safeShift10BitBy6(*rowSrc);
        rowDst++;
        rowSrc++;
      }
    }

    // Copy and interleave the Cb and Cr channels.
    MOZ_ASSERT(cbcrSize.height > 0);
    MOZ_ASSERT(cbcrSize.height == ySize.height,
               "4:2:2 CbCr should have same height as Y.");
    dst = (uint16_t*)surf->GetBaseAddressOfPlane(1);
    stride = surf->GetBytesPerRow(1) / 2;
    for (size_t i = 0; i < (size_t)cbcrSize.height; i++) {
      uint16_t* rowCbSrc =
          (uint16_t*)(aData.mCbChannel + aData.mCbCrStride * i);
      uint16_t* rowCrSrc =
          (uint16_t*)(aData.mCrChannel + aData.mCbCrStride * i);
      uint16_t* rowDst = dst + stride * i;

      for (const auto j : IntegerRange(cbcrSize.width)) {
        Unused << j;

        *rowDst = safeShift10BitBy6(*rowCbSrc);
        rowDst++;
        rowCbSrc++;

        *rowDst = safeShift10BitBy6(*rowCrSrc);
        rowDst++;
        rowCrSrc++;
      }
    }
  }

  surf->Unlock(false);
  mSurface = surf;
  mPictureRect = aData.mPictureRect;
  return true;
}

already_AddRefed<MacIOSurface> MacIOSurfaceRecycleAllocator::Allocate(
    const gfx::IntSize aYSize, const gfx::IntSize& aCbCrSize,
    gfx::ChromaSubsampling aChromaSubsampling,
    gfx::YUVColorSpace aYUVColorSpace, gfx::TransferFunction aTransferFunction,
    gfx::ColorRange aColorRange, gfx::ColorDepth aColorDepth) {
  // To avoid checking every property of every surface, we just cache the
  // parameters used during the last allocation. If any of these have changed,
  // dump the cached surfaces and update our cached parameters.
  if (mYSize != aYSize || mCbCrSize != aCbCrSize ||
      mChromaSubsampling != aChromaSubsampling ||
      mYUVColorSpace != aYUVColorSpace ||
      mTransferFunction != aTransferFunction || mColorRange != aColorRange ||
      mColorDepth != aColorDepth) {
    mSurfaces.Clear();
    mYSize = aYSize;
    mCbCrSize = aCbCrSize;
    mChromaSubsampling = aChromaSubsampling;
    mYUVColorSpace = aYUVColorSpace;
    mTransferFunction = aTransferFunction;
    mColorRange = aColorRange;
    mColorDepth = aColorDepth;
  }

  // Scan for an unused surface, and reuse that if one is available.
  for (auto& surf : mSurfaces) {
    if (::IOSurfaceIsInUse(surf.get())) {
      continue;
    }

#ifdef MOZ_DIAGNOSTIC_ASSERT_ENABLED
    Maybe<OSType> pixelFormat = MacIOSurface::ChoosePixelFormat(
        aChromaSubsampling, aColorRange, aColorDepth);
    MOZ_DIAGNOSTIC_ASSERT(pixelFormat.isSome());
    MOZ_DIAGNOSTIC_ASSERT(::IOSurfaceGetPixelFormat(surf.get()) ==
                          *pixelFormat);
    MOZ_DIAGNOSTIC_ASSERT(::IOSurfaceGetWidthOfPlane(surf.get(), 0) ==
                          (size_t)aYSize.width);
    MOZ_DIAGNOSTIC_ASSERT(::IOSurfaceGetHeightOfPlane(surf.get(), 0) ==
                          (size_t)aYSize.height);
    if (*pixelFormat != kCVPixelFormatType_422YpCbCr8_yuvs &&
        *pixelFormat != kCVPixelFormatType_422YpCbCr8FullRange) {
      MOZ_DIAGNOSTIC_ASSERT(::IOSurfaceGetWidthOfPlane(surf.get(), 1) ==
                            (size_t)aCbCrSize.width);
      MOZ_DIAGNOSTIC_ASSERT(::IOSurfaceGetHeightOfPlane(surf.get(), 1) ==
                            (size_t)aCbCrSize.height);
    }
#endif

    return MakeAndAddRef<MacIOSurface>(surf, false, aYUVColorSpace);
  }

  // Time to decide if we are creating a single planar or bi-planar surface.
  // We limit ourselves to macOS's single planar and bi-planar formats for
  // simplicity reasons, possibly gaining some small memory or performance
  // benefit relative to the tri-planar formats. We try and use as few
  // planes as possible.
  // 4:2:0 formats are always bi-planar, because there is no 4:2:0 single
  // planar format.
  // 4:2:2 formats with 8 bit color are single planar, otherwise bi-planar.

  RefPtr<MacIOSurface> result;
  if (aChromaSubsampling == gfx::ChromaSubsampling::HALF_WIDTH &&
      aColorDepth == gfx::ColorDepth::COLOR_8) {
    result = MacIOSurface::CreateSinglePlanarSurface(
        aYSize, aYUVColorSpace, aTransferFunction, aColorRange);
  } else {
    result = MacIOSurface::CreateBiPlanarSurface(
        aYSize, aCbCrSize, aChromaSubsampling, aYUVColorSpace,
        aTransferFunction, aColorRange, aColorDepth);
  }

  if (result &&
      mSurfaces.Length() < StaticPrefs::layers_iosurfaceimage_recycle_limit()) {
    mSurfaces.AppendElement(result->GetIOSurfaceRef());
  }

  return result.forget();
}
