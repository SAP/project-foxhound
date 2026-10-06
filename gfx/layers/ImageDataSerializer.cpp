/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ImageDataSerializer.h"

#include "YCbCrUtils.h"           // for YCbCr conversions
#include "gfx2DGlue.h"            // for SurfaceFormatToImageFormat
#include "mozilla/Assertions.h"   // for MOZ_ASSERT, etc
#include "mozilla/DebugOnly.h"    // for DebugOnly
#include "mozilla/gfx/2D.h"       // for DataSourceSurface, Factory
#include "mozilla/gfx/Logging.h"  // for gfxDebug
#include "mozilla/gfx/Tools.h"    // for GetAlignedStride, etc
#include "mozilla/gfx/Types.h"
#include "mozilla/mozalloc.h"  // for operator delete, etc

namespace mozilla {
namespace layers {
namespace ImageDataSerializer {

using namespace gfx;

Maybe<int32_t> ComputeRGBStride(SurfaceFormat aFormat, int32_t aWidth) {
#ifdef XP_MACOSX
  // Some drivers require an alignment of 32 bytes for efficient texture upload.
  return GetAlignedStride<32>(aWidth, BytesPerPixel(aFormat));
#else
  return GetAlignedStride<4>(aWidth, BytesPerPixel(aFormat));
#endif
}

Maybe<int32_t> GetRGBStride(const RGBDescriptor& aDescriptor) {
  return ComputeRGBStride(aDescriptor.format(), aDescriptor.size().width);
}

Maybe<uint32_t> ComputeRGBBufferSize(IntSize aSize, SurfaceFormat aFormat) {
  MOZ_ASSERT(aSize.height >= 0 && aSize.width >= 0);

  // This takes care of checking whether there could be overflow
  // with enough margin for the metadata.
  if (!gfx::Factory::AllowedSurfaceSize(aSize)) {
    return Nothing();
  }

  auto stride = ComputeRGBStride(aFormat, aSize.width);
  if (stride.isNothing()) {
    return Nothing();
  }

  // Note we're passing height instad of the bpp parameter, but the end
  // result is the same - and the bpp was already taken care of in the
  // ComputeRGBStride function.
  Maybe<int32_t> bufsize = GetAlignedStride<16>(stride.value(), aSize.height);
  if (bufsize.isNothing()) {
    return Nothing();
  }

  MOZ_ASSERT(bufsize.value() >= 0);
  return Some(uint32_t(bufsize.value()));
}

static bool CheckYCbCrStride(const gfx::IntSize& aSize, int32_t aStride,
                             gfx::ColorDepth aDepth) {
  gfx::SurfaceFormat format = gfx::SurfaceFormatForColorDepth(aDepth);
  CheckedInt32 minStride =
      CheckedInt32(gfx::BytesPerPixel(format)) * aSize.width;
  return minStride.isValid() && aStride >= minStride.value();
}

// Minimum required shmem size in bytes
Maybe<uint32_t> ComputeYCbCrBufferSize(
    const gfx::IntRect& aDisplay, const gfx::IntSize& aYSize, int32_t aYStride,
    const gfx::IntSize& aCbCrSize, int32_t aCbCrStride, gfx::ColorDepth aDepth,
    const ChromaSubsampling aSubsampling) {
  MOZ_ASSERT(aYSize.height >= 0 && aYSize.width >= 0);

  if (aDisplay.IsEmpty() || aDisplay.x < 0 || aDisplay.y < 0 ||
      !gfx::IntRect(gfx::IntPoint(), aYSize).Contains(aDisplay) ||
      aYSize.height < 0 || aYSize.width < 0 || aCbCrSize.height < 0 ||
      aCbCrSize.width < 0 ||
      !gfx::Factory::AllowedSurfaceSize(IntSize(aYStride, aYSize.height)) ||
      !gfx::Factory::AllowedSurfaceSize(
          IntSize(aCbCrStride, aCbCrSize.height)) ||
      !CheckYCbCrStride(aYSize, aYStride, aDepth) ||
      !CheckYCbCrStride(aCbCrSize, aCbCrStride, aDepth) ||
      !(ChromaSize(aYSize, aSubsampling) <= aCbCrSize)) {
    return Nothing();
  }

  // Overflow checks are performed only individually in AllowedSurfaceSize
  auto ySize = GetAlignedStride<4>(aYSize.height, aYStride);
  auto cbcrSize = GetAlignedStride<4>(aCbCrSize.height, aCbCrStride);
  if (ySize.isNothing() || cbcrSize.isNothing()) {
    return Nothing();
  }
  auto bufLen = CheckedInt<uint32_t>(ySize.value()) +
                CheckedInt<uint32_t>(cbcrSize.value()) * 2;
  if (!bufLen.isValid() || bufLen.value() <= 0) {
    return Nothing();
  }
  return Some(bufLen.value());
}

Maybe<uint32_t> ComputeYCbCrBufferSize(
    const gfx::IntRect& aDisplay, const gfx::IntSize& aYSize, int32_t aYStride,
    const gfx::IntSize& aCbCrSize, int32_t aCbCrStride, uint32_t aYOffset,
    uint32_t aCbOffset, uint32_t aCrOffset, gfx::ColorDepth aDepth,
    const ChromaSubsampling aSubsampling) {
  Maybe<uint32_t> minBufLen = ComputeYCbCrBufferSize(
      aDisplay, aYSize, aYStride, aCbCrSize, aCbCrStride, aDepth, aSubsampling);
  if (minBufLen.isNothing()) {
    return Nothing();
  }

  auto yLength = GetAlignedStride<4>(aYStride, aYSize.height);
  auto cbCrLength = GetAlignedStride<4>(aCbCrStride, aCbCrSize.height);
  if (yLength.isNothing() || cbCrLength.isNothing()) {
    return Nothing();
  }

  CheckedInt<uint32_t> yEnd = aYOffset;
  yEnd += yLength.value();
  CheckedInt<uint32_t> cbEnd = aCbOffset;
  cbEnd += cbCrLength.value();
  CheckedInt<uint32_t> crEnd = aCrOffset;
  crEnd += cbCrLength.value();

  if (!yEnd.isValid() || !cbEnd.isValid() || !crEnd.isValid() ||
      yEnd.value() > aCbOffset || cbEnd.value() > aCrOffset ||
      crEnd.value() < minBufLen.value()) {
    return Nothing();
  }

  MOZ_ASSERT(crEnd.value() > 0);
  return Some(crEnd.value());
}

void ComputeYCbCrOffsets(int32_t yStride, int32_t yHeight, int32_t cbCrStride,
                         int32_t cbCrHeight, uint32_t& outYOffset,
                         uint32_t& outCbOffset, uint32_t& outCrOffset) {
  outYOffset = 0;
  outCbOffset = outYOffset + GetAlignedStride<4>(yStride, yHeight).valueOr(0);
  outCrOffset =
      outCbOffset + GetAlignedStride<4>(cbCrStride, cbCrHeight).valueOr(0);
}

gfx::SurfaceFormat FormatFromBufferDescriptor(
    const BufferDescriptor& aDescriptor) {
  switch (aDescriptor.type()) {
    case BufferDescriptor::TRGBDescriptor:
      return aDescriptor.get_RGBDescriptor().format();
    case BufferDescriptor::TYCbCrDescriptor:
      return gfx::SurfaceFormat::YUV420;
    default:
      MOZ_CRASH("GFX: FormatFromBufferDescriptor");
  }
}

gfx::IntSize SizeFromBufferDescriptor(const BufferDescriptor& aDescriptor) {
  switch (aDescriptor.type()) {
    case BufferDescriptor::TRGBDescriptor:
      return aDescriptor.get_RGBDescriptor().size();
    case BufferDescriptor::TYCbCrDescriptor: {
      return aDescriptor.get_YCbCrDescriptor().display().Size();
    }
    default:
      MOZ_CRASH("GFX: SizeFromBufferDescriptor");
  }
}

gfx::IntRect RectFromBufferDescriptor(const BufferDescriptor& aDescriptor) {
  switch (aDescriptor.type()) {
    case BufferDescriptor::TRGBDescriptor: {
      auto size = aDescriptor.get_RGBDescriptor().size();
      return gfx::IntRect(0, 0, size.Width(), size.Height());
    }
    case BufferDescriptor::TYCbCrDescriptor:
      return aDescriptor.get_YCbCrDescriptor().display();
    default:
      MOZ_CRASH("GFX: RectFromBufferDescriptor");
  }
}

Maybe<gfx::IntSize> YSizeFromBufferDescriptor(
    const BufferDescriptor& aDescriptor) {
  switch (aDescriptor.type()) {
    case BufferDescriptor::TRGBDescriptor:
      return Nothing();
    case BufferDescriptor::TYCbCrDescriptor:
      return Some(aDescriptor.get_YCbCrDescriptor().ySize());
    default:
      MOZ_CRASH("GFX: YSizeFromBufferDescriptor");
  }
}

Maybe<gfx::IntSize> CbCrSizeFromBufferDescriptor(
    const BufferDescriptor& aDescriptor) {
  switch (aDescriptor.type()) {
    case BufferDescriptor::TRGBDescriptor:
      return Nothing();
    case BufferDescriptor::TYCbCrDescriptor:
      return Some(aDescriptor.get_YCbCrDescriptor().cbCrSize());
    default:
      MOZ_CRASH("GFX: CbCrSizeFromBufferDescriptor");
  }
}

Maybe<int32_t> YStrideFromBufferDescriptor(
    const BufferDescriptor& aDescriptor) {
  switch (aDescriptor.type()) {
    case BufferDescriptor::TRGBDescriptor:
      return Nothing();
    case BufferDescriptor::TYCbCrDescriptor:
      return Some(aDescriptor.get_YCbCrDescriptor().yStride());
    default:
      MOZ_CRASH("GFX: YStrideFromBufferDescriptor");
  }
}

Maybe<int32_t> CbCrStrideFromBufferDescriptor(
    const BufferDescriptor& aDescriptor) {
  switch (aDescriptor.type()) {
    case BufferDescriptor::TRGBDescriptor:
      return Nothing();
    case BufferDescriptor::TYCbCrDescriptor:
      return Some(aDescriptor.get_YCbCrDescriptor().cbCrStride());
    default:
      MOZ_CRASH("GFX: CbCrStrideFromBufferDescriptor");
  }
}

Maybe<gfx::ColorSpace2> ColorSpace2FromBufferDescriptor(
    const BufferDescriptor& aDescriptor) {
  switch (aDescriptor.type()) {
    case BufferDescriptor::TRGBDescriptor:
      return Some(aDescriptor.get_RGBDescriptor().colorSpace());
    case BufferDescriptor::TYCbCrDescriptor:
      return Nothing();
    default:
      MOZ_CRASH("GFX:  ColorSpace2FromBufferDescriptor");
  }
}

Maybe<gfx::YUVColorSpace> YUVColorSpaceFromBufferDescriptor(
    const BufferDescriptor& aDescriptor) {
  switch (aDescriptor.type()) {
    case BufferDescriptor::TRGBDescriptor:
      return Nothing();
    case BufferDescriptor::TYCbCrDescriptor:
      return Some(aDescriptor.get_YCbCrDescriptor().yUVColorSpace());
    default:
      MOZ_CRASH("GFX:  YUVColorSpaceFromBufferDescriptor");
  }
}

Maybe<gfx::ColorDepth> ColorDepthFromBufferDescriptor(
    const BufferDescriptor& aDescriptor) {
  switch (aDescriptor.type()) {
    case BufferDescriptor::TRGBDescriptor:
      return Nothing();
    case BufferDescriptor::TYCbCrDescriptor:
      return Some(aDescriptor.get_YCbCrDescriptor().colorDepth());
    default:
      MOZ_CRASH("GFX:  ColorDepthFromBufferDescriptor");
  }
}

Maybe<gfx::ColorRange> ColorRangeFromBufferDescriptor(
    const BufferDescriptor& aDescriptor) {
  switch (aDescriptor.type()) {
    case BufferDescriptor::TRGBDescriptor:
      return Nothing();
    case BufferDescriptor::TYCbCrDescriptor:
      return Some(aDescriptor.get_YCbCrDescriptor().colorRange());
    default:
      MOZ_CRASH("GFX: YUVFullRangeFromBufferDescriptor");
  }
}

Maybe<StereoMode> StereoModeFromBufferDescriptor(
    const BufferDescriptor& aDescriptor) {
  switch (aDescriptor.type()) {
    case BufferDescriptor::TRGBDescriptor:
      return Nothing();
    case BufferDescriptor::TYCbCrDescriptor:
      return Some(aDescriptor.get_YCbCrDescriptor().stereoMode());
    default:
      MOZ_CRASH("GFX:  StereoModeFromBufferDescriptor");
  }
}

Maybe<gfx::ChromaSubsampling> ChromaSubsamplingFromBufferDescriptor(
    const BufferDescriptor& aDescriptor) {
  switch (aDescriptor.type()) {
    case BufferDescriptor::TRGBDescriptor:
      return Nothing();
    case BufferDescriptor::TYCbCrDescriptor:
      return Some(aDescriptor.get_YCbCrDescriptor().chromaSubsampling());
    default:
      MOZ_CRASH("GFX: ChromaSubsamplingFromBufferDescriptor");
  }
}

Maybe<gfx::TransferFunction> TransferFunctionFromBufferDescriptor(
    const BufferDescriptor& aDescriptor) {
  switch (aDescriptor.type()) {
    case BufferDescriptor::TRGBDescriptor:
      return Some(aDescriptor.get_RGBDescriptor().transferFunction());
    case BufferDescriptor::TYCbCrDescriptor:
      return Some(aDescriptor.get_YCbCrDescriptor().transferFunction());
    default:
      MOZ_CRASH("GFX: TransferFunctionFromBufferDescriptor");
  }
}

uint8_t* GetYChannel(uint8_t* aBuffer, const YCbCrDescriptor& aDescriptor) {
  return aBuffer + aDescriptor.yOffset();
}

uint8_t* GetCbChannel(uint8_t* aBuffer, const YCbCrDescriptor& aDescriptor) {
  return aBuffer + aDescriptor.cbOffset();
}

uint8_t* GetCrChannel(uint8_t* aBuffer, const YCbCrDescriptor& aDescriptor) {
  return aBuffer + aDescriptor.crOffset();
}

uint16_t* GetYChannel(uint16_t* aBuffer, const YCbCrDescriptor& aDescriptor) {
  return aBuffer + aDescriptor.yOffset() / 2;
}

uint16_t* GetCbChannel(uint16_t* aBuffer, const YCbCrDescriptor& aDescriptor) {
  return aBuffer + aDescriptor.cbOffset() / 2;
}

uint16_t* GetCrChannel(uint16_t* aBuffer, const YCbCrDescriptor& aDescriptor) {
  return aBuffer + aDescriptor.crOffset() / 2;
}

already_AddRefed<DataSourceSurface> DataSourceSurfaceFromYCbCrDescriptor(
    uint8_t* aBuffer, const YCbCrDescriptor& aDescriptor,
    gfx::DataSourceSurface* aSurface) {
  const gfx::IntRect display = aDescriptor.display();
  const gfx::IntSize size = display.Size();
  RefPtr<DataSourceSurface> result;
  if (aSurface) {
    MOZ_ASSERT(aSurface->GetSize() == size);
    MOZ_ASSERT(aSurface->GetFormat() == gfx::SurfaceFormat::B8G8R8X8);
    if (aSurface->GetSize() == size &&
        aSurface->GetFormat() == gfx::SurfaceFormat::B8G8R8X8) {
      result = aSurface;
    }
  }

  if (!result) {
    result =
        Factory::CreateDataSourceSurface(size, gfx::SurfaceFormat::B8G8R8X8);
  }
  if (NS_WARN_IF(!result)) {
    return nullptr;
  }

  DataSourceSurface::MappedSurface map;
  if (NS_WARN_IF(!result->Map(DataSourceSurface::MapType::WRITE, &map))) {
    return nullptr;
  }

  if (!aBuffer) {
    return nullptr;
  }

  layers::PlanarYCbCrData ycbcrData;
  ycbcrData.mYChannel = GetYChannel(aBuffer, aDescriptor);
  ycbcrData.mYStride = aDescriptor.yStride();
  ycbcrData.mCbChannel = GetCbChannel(aBuffer, aDescriptor);
  ycbcrData.mCrChannel = GetCrChannel(aBuffer, aDescriptor);
  ycbcrData.mCbCrStride = aDescriptor.cbCrStride();
  ycbcrData.mPictureRect = aDescriptor.display();
  ycbcrData.mYUVColorSpace = aDescriptor.yUVColorSpace();
  ycbcrData.mColorDepth = aDescriptor.colorDepth();
  ycbcrData.mChromaSubsampling = aDescriptor.chromaSubsampling();

  if (NS_WARN_IF(NS_FAILED(
          gfx::ConvertYCbCrToRGB(ycbcrData, gfx::SurfaceFormat::B8G8R8X8, size,
                                 map.mData, map.mStride)))) {
    MOZ_ASSERT_UNREACHABLE("Failed to convert YUV into RGB data");
    return nullptr;
  }

  result->Unmap();
  return result.forget();
}

void ConvertAndScaleFromYCbCrDescriptor(uint8_t* aBuffer,
                                        const YCbCrDescriptor& aDescriptor,
                                        const gfx::SurfaceFormat& aDestFormat,
                                        const gfx::IntSize& aDestSize,
                                        unsigned char* aDestBuffer,
                                        int32_t aStride) {
  MOZ_ASSERT(aBuffer);
  MOZ_ASSERT(gfx::IntRect(gfx::IntPoint(), aDescriptor.ySize())
                 .Contains(aDescriptor.display()));

  layers::PlanarYCbCrData ycbcrData;
  ycbcrData.mYChannel = GetYChannel(aBuffer, aDescriptor);
  ycbcrData.mYStride = aDescriptor.yStride();
  ycbcrData.mCbChannel = GetCbChannel(aBuffer, aDescriptor);
  ycbcrData.mCrChannel = GetCrChannel(aBuffer, aDescriptor);
  ycbcrData.mCbCrStride = aDescriptor.cbCrStride();
  ycbcrData.mPictureRect = aDescriptor.display();
  ycbcrData.mYUVColorSpace = aDescriptor.yUVColorSpace();
  ycbcrData.mColorDepth = aDescriptor.colorDepth();
  ycbcrData.mChromaSubsampling = aDescriptor.chromaSubsampling();

  DebugOnly<nsresult> result = gfx::ConvertYCbCrToRGB(
      ycbcrData, aDestFormat, aDestSize, aDestBuffer, aStride);
  MOZ_ASSERT(NS_SUCCEEDED(result), "Failed to convert YUV into RGB data");
}

gfx::IntSize GetCroppedCbCrSize(const YCbCrDescriptor& aDescriptor) {
  return ChromaSize(aDescriptor.display().Size(),
                    aDescriptor.chromaSubsampling());
}

}  // namespace ImageDataSerializer
}  // namespace layers
}  // namespace mozilla
