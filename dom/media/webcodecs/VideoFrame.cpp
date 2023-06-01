/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/VideoFrame.h"
#include "mozilla/dom/VideoFrameBinding.h"

#include <math.h>
#include <limits>

#include "ImageContainer.h"
#include "VideoColorSpace.h"
#include "js/StructuredClone.h"
#include "mozilla/Maybe.h"
#include "mozilla/Result.h"
#include "mozilla/ResultVariant.h"
#include "mozilla/ScopeExit.h"
#include "mozilla/Tuple.h"
#include "mozilla/UniquePtr.h"
#include "mozilla/dom/CanvasUtils.h"
#include "mozilla/dom/DOMRect.h"
#include "mozilla/dom/HTMLCanvasElement.h"
#include "mozilla/dom/HTMLImageElement.h"
#include "mozilla/dom/HTMLVideoElement.h"
#include "mozilla/dom/ImageBitmap.h"
#include "mozilla/dom/ImageUtils.h"
#include "mozilla/dom/OffscreenCanvas.h"
#include "mozilla/dom/Promise.h"
#include "mozilla/dom/SVGImageElement.h"
#include "mozilla/dom/StructuredCloneHolder.h"
#include "mozilla/dom/StructuredCloneTags.h"
#include "mozilla/dom/UnionTypes.h"
#include "mozilla/gfx/2D.h"
#include "mozilla/gfx/Swizzle.h"
#include "nsLayoutUtils.h"
#include "nsIPrincipal.h"
#include "nsIURI.h"

namespace mozilla::dom {

// Only needed for refcounted objects.
NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE(VideoFrame, mParent)
NS_IMPL_CYCLE_COLLECTING_ADDREF(VideoFrame)
NS_IMPL_CYCLE_COLLECTING_RELEASE(VideoFrame)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(VideoFrame)
  NS_WRAPPERCACHE_INTERFACE_MAP_ENTRY
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END

/*
 * The below are helpers to operate ArrayBuffer or ArrayBufferView.
 */
template <class T>
static Result<Tuple<RangedPtr<uint8_t>, size_t>, nsresult> GetArrayBufferData(
    const T& aBuffer) {
  // Get buffer's data and length before using it.
  aBuffer.ComputeState();

  CheckedInt<size_t> byteLength(sizeof(typename T::element_type));
  byteLength *= aBuffer.Length();
  if (!byteLength.isValid()) {
    return Err(NS_ERROR_INVALID_ARG);
  }

  return MakeTuple(RangedPtr(aBuffer.Data(), byteLength.value()),
                   byteLength.value());
}

static Result<Tuple<RangedPtr<uint8_t>, size_t>, nsresult>
GetSharedArrayBufferData(
    const MaybeSharedArrayBufferViewOrMaybeSharedArrayBuffer& aBuffer) {
  if (aBuffer.IsArrayBufferView()) {
    return GetArrayBufferData(aBuffer.GetAsArrayBufferView());
  }

  MOZ_ASSERT(aBuffer.IsArrayBuffer());
  return GetArrayBufferData(aBuffer.GetAsArrayBuffer());
}

/*
 * The following are utilities to convert between VideoColorSpace values to
 * gfx's values.
 */

static gfx::YUVColorSpace ToColorSpace(VideoMatrixCoefficients aMatrix) {
  switch (aMatrix) {
    case VideoMatrixCoefficients::Rgb:
      return gfx::YUVColorSpace::Identity;
    case VideoMatrixCoefficients::Bt709:
    case VideoMatrixCoefficients::Bt470bg:
      return gfx::YUVColorSpace::BT709;
    case VideoMatrixCoefficients::Smpte170m:
      return gfx::YUVColorSpace::BT601;
    case VideoMatrixCoefficients::Bt2020_ncl:
      return gfx::YUVColorSpace::BT2020;
    case VideoMatrixCoefficients::EndGuard_:
      break;
  }
  MOZ_ASSERT_UNREACHABLE("unsupported VideoMatrixCoefficients");
  return gfx::YUVColorSpace::Default;
}

static gfx::TransferFunction ToTransferFunction(
    VideoTransferCharacteristics aTransfer) {
  switch (aTransfer) {
    case VideoTransferCharacteristics::Bt709:
    case VideoTransferCharacteristics::Smpte170m:
      return gfx::TransferFunction::BT709;
    case VideoTransferCharacteristics::Iec61966_2_1:
      return gfx::TransferFunction::SRGB;
    case VideoTransferCharacteristics::Pq:
      return gfx::TransferFunction::PQ;
    case VideoTransferCharacteristics::Hlg:
      return gfx::TransferFunction::HLG;
    case VideoTransferCharacteristics::Linear:
    case VideoTransferCharacteristics::EndGuard_:
      break;
  }
  MOZ_ASSERT_UNREACHABLE("unsupported VideoTransferCharacteristics");
  return gfx::TransferFunction::Default;
}

static gfx::ColorSpace2 ToPrimaries(VideoColorPrimaries aPrimaries) {
  switch (aPrimaries) {
    case VideoColorPrimaries::Bt709:
      return gfx::ColorSpace2::BT709;
    case VideoColorPrimaries::Bt470bg:
      return gfx::ColorSpace2::BT601_625;
    case VideoColorPrimaries::Smpte170m:
      return gfx::ColorSpace2::BT601_525;
    case VideoColorPrimaries::Bt2020:
      return gfx::ColorSpace2::BT2020;
    case VideoColorPrimaries::Smpte432:
      return gfx::ColorSpace2::DISPLAY_P3;
    case VideoColorPrimaries::EndGuard_:
      break;
  }
  MOZ_ASSERT_UNREACHABLE("unsupported VideoTransferCharacteristics");
  return gfx::ColorSpace2::UNKNOWN;
}

static Maybe<VideoPixelFormat> ToVideoPixelFormat(gfx::SurfaceFormat aFormat) {
  switch (aFormat) {
    case gfx::SurfaceFormat::B8G8R8A8:
      return Some(VideoPixelFormat::BGRA);
    case gfx::SurfaceFormat::B8G8R8X8:
      return Some(VideoPixelFormat::BGRX);
    case gfx::SurfaceFormat::R8G8B8A8:
      return Some(VideoPixelFormat::RGBA);
    case gfx::SurfaceFormat::R8G8B8X8:
      return Some(VideoPixelFormat::RGBX);
    case gfx::SurfaceFormat::NV12:
      return Some(VideoPixelFormat::NV12);
    default:
      break;
  }
  return Nothing();
}

static Maybe<VideoPixelFormat> ToVideoPixelFormat(ImageBitmapFormat aFormat) {
  switch (aFormat) {
    case ImageBitmapFormat::RGBA32:
      return Some(VideoPixelFormat::RGBA);
    case ImageBitmapFormat::BGRA32:
      return Some(VideoPixelFormat::BGRA);
    case ImageBitmapFormat::YUV444P:
      return Some(VideoPixelFormat::I444);
    case ImageBitmapFormat::YUV422P:
      return Some(VideoPixelFormat::I422);
    case ImageBitmapFormat::YUV420P:
      return Some(VideoPixelFormat::I420);
    case ImageBitmapFormat::YUV420SP_NV12:
      return Some(VideoPixelFormat::NV12);
    default:
      break;
  }
  return Nothing();
}

/*
 * The following are helpers to read the image data from the given buffer and
 * the format. The data layout is illustrated in the comments for
 * `VideoFrame::Format` below.
 */

static int32_t CeilingOfHalf(int32_t aValue) {
  MOZ_ASSERT(aValue >= 0);
  return aValue / 2 + (aValue % 2);
}

class YUVBufferReaderBase {
 public:
  YUVBufferReaderBase(const RangedPtr<uint8_t>& aPtr, int32_t aWidth,
                      int32_t aHeight)
      : mWidth(aWidth), mHeight(aHeight), mStrideY(aWidth), mPtr(aPtr) {}
  virtual ~YUVBufferReaderBase() = default;

  const uint8_t* DataY() const { return mPtr.get(); }
  const int32_t mWidth;
  const int32_t mHeight;
  const int32_t mStrideY;

 protected:
  CheckedInt<size_t> YByteSize() const {
    return CheckedInt<size_t>(mStrideY) * mHeight;
  }

  const RangedPtr<uint8_t> mPtr;
};

class I420ABufferReader;
class I420BufferReader : public YUVBufferReaderBase {
 public:
  I420BufferReader(const RangedPtr<uint8_t>& aPtr, int32_t aWidth,
                   int32_t aHeight)
      : YUVBufferReaderBase(aPtr, aWidth, aHeight),
        mStrideU(CeilingOfHalf(aWidth)),
        mStrideV(CeilingOfHalf(aWidth)) {}
  virtual ~I420BufferReader() = default;

  const uint8_t* DataU() const {
    return &mPtr[CheckedInt<ptrdiff_t>(YByteSize().value()).value()];
  }
  const uint8_t* DataV() const {
    return &mPtr[(CheckedInt<ptrdiff_t>(YByteSize().value()) +
                  UByteSize().value())
                     .value()];
  }
  virtual I420ABufferReader* AsI420ABufferReader() { return nullptr; }

  const int32_t mStrideU;
  const int32_t mStrideV;

 protected:
  CheckedInt<size_t> UByteSize() const {
    return CheckedInt<size_t>(CeilingOfHalf(mHeight)) * mStrideU;
  }

  CheckedInt<size_t> VSize() const {
    return CheckedInt<size_t>(CeilingOfHalf(mHeight)) * mStrideV;
  }
};

class I420ABufferReader final : public I420BufferReader {
 public:
  I420ABufferReader(const RangedPtr<uint8_t>& aPtr, int32_t aWidth,
                    int32_t aHeight)
      : I420BufferReader(aPtr, aWidth, aHeight), mStrideA(aWidth) {
    MOZ_ASSERT(mStrideA == mStrideY);
  }
  virtual ~I420ABufferReader() = default;

  const uint8_t* DataA() const {
    return &mPtr[(CheckedInt<ptrdiff_t>(YByteSize().value()) +
                  UByteSize().value() + VSize().value())
                     .value()];
  }

  virtual I420ABufferReader* AsI420ABufferReader() override { return this; }

  const int32_t mStrideA;
};

class NV12BufferReader final : public YUVBufferReaderBase {
 public:
  NV12BufferReader(const RangedPtr<uint8_t>& aPtr, int32_t aWidth,
                   int32_t aHeight)
      : YUVBufferReaderBase(aPtr, aWidth, aHeight),
        mStrideUV(aWidth + aWidth % 2) {}
  virtual ~NV12BufferReader() = default;

  const uint8_t* DataUV() const {
    return &mPtr[static_cast<ptrdiff_t>(YByteSize().value())];
  }

  const int32_t mStrideUV;
};

/*
 * The followings are helpers defined in
 * https://w3c.github.io/webcodecs/#videoframe-algorithms
 */
static bool IsSameOrigin(nsIGlobalObject* aGlobal, nsIURI* aURI) {
  MOZ_ASSERT(aGlobal);

  nsIPrincipal* principal = aGlobal->PrincipalOrNull();
  // If VideoFrames is created in worker, then it's from the same origin. In
  // this case, principal or aURI is null. Otherwise, check the origin.
  return !principal || !aURI || principal->IsSameOrigin(aURI);
}

static bool IsSameOrigin(nsIGlobalObject* aGlobal, const VideoFrame& aFrame) {
  MOZ_ASSERT(aGlobal);
  MOZ_ASSERT(aFrame.GetParentObject());

  nsIPrincipal* principalX = aGlobal->PrincipalOrNull();
  nsIPrincipal* principalY = aFrame.GetParentObject()->PrincipalOrNull();

  // If both of VideoFrames are created in worker, they are in the same origin
  // domain.
  if (!principalX) {
    return !principalY;
  }
  // Otherwise, check their domains.
  return principalX->Equals(principalY);
}

static bool IsSameOrigin(nsIGlobalObject* aGlobal,
                         HTMLVideoElement& aVideoElement) {
  MOZ_ASSERT(aGlobal);

  // If CORS is in use, consider the video source is same-origin.
  if (aVideoElement.GetCORSMode() != CORS_NONE) {
    return true;
  }

  // Otherwise, check if video source has cross-origin redirect or not.
  if (aVideoElement.HadCrossOriginRedirects()) {
    return false;
  }

  // Finally, compare the VideoFrame's domain and video's one.
  nsIPrincipal* principal = aGlobal->PrincipalOrNull();
  nsCOMPtr<nsIPrincipal> elementPrincipal =
      aVideoElement.GetCurrentVideoPrincipal();
  // <video> cannot be created in worker, so it should have a valid principal.
  if (NS_WARN_IF(!elementPrincipal) || !principal) {
    return false;
  }
  return principal->Subsumes(elementPrincipal);
}

// A sub-helper to convert DOMRectInit to gfx::IntRect.
static Result<gfx::IntRect, nsCString> ToIntRect(const DOMRectInit& aRectInit) {
  auto EQ = [](const double& a, const double& b) {
    constexpr double e = std::numeric_limits<double>::epsilon();
    return std::fabs(a - b) <= e;
  };
  auto GT = [&](const double& a, const double& b) {
    return !EQ(a, b) && a > b;
  };

  // Make sure the double values are in the gfx::IntRect's valid range, before
  // checking the spec's valid range. The double's infinity value is larger than
  // gfx::IntRect's max value so it will be filtered out here.
  constexpr double MAX = static_cast<double>(
      std::numeric_limits<decltype(gfx::IntRect::x)>::max());
  constexpr double MIN = static_cast<double>(
      std::numeric_limits<decltype(gfx::IntRect::x)>::min());
  if (GT(aRectInit.mX, MAX) || GT(MIN, aRectInit.mX)) {
    return Err(nsCString("x is out of the valid range"));
  }
  if (GT(aRectInit.mY, MAX) || GT(MIN, aRectInit.mY)) {
    return Err(nsCString("y is out of the valid range"));
  }
  if (GT(aRectInit.mWidth, MAX) || GT(MIN, aRectInit.mWidth)) {
    return Err(nsCString("width is out of the valid range"));
  }
  if (GT(aRectInit.mHeight, MAX) || GT(MIN, aRectInit.mHeight)) {
    return Err(nsCString("height is out of the valid range"));
  }

  gfx::IntRect rect(
      static_cast<decltype(gfx::IntRect::x)>(aRectInit.mX),
      static_cast<decltype(gfx::IntRect::y)>(aRectInit.mY),
      static_cast<decltype(gfx::IntRect::width)>(aRectInit.mWidth),
      static_cast<decltype(gfx::IntRect::height)>(aRectInit.mHeight));
  // Check the spec's valid range.
  if (rect.X() < 0) {
    return Err(nsCString("x must be non-negative"));
  }
  if (rect.Y() < 0) {
    return Err(nsCString("y must be non-negative"));
  }
  if (rect.Width() <= 0) {
    return Err(nsCString("width must be positive"));
  }
  if (rect.Height() <= 0) {
    return Err(nsCString("height must be positive"));
  }

  return rect;
}

// A sub-helper to convert a (width, height) pair to gfx::IntRect.
static Result<gfx::IntSize, nsCString> ToIntSize(const uint32_t& aWidth,
                                                 const uint32_t& aHeight) {
  // Make sure the given values are in the gfx::IntSize's valid range, before
  // checking the spec's valid range.
  constexpr uint32_t MAX = static_cast<uint32_t>(
      std::numeric_limits<decltype(gfx::IntRect::width)>::max());
  if (aWidth > MAX) {
    return Err(nsCString("Width exceeds the implementation's range"));
  }
  if (aHeight > MAX) {
    return Err(nsCString("Height exceeds the implementation's range"));
  }

  gfx::IntSize size(static_cast<decltype(gfx::IntRect::width)>(aWidth),
                    static_cast<decltype(gfx::IntRect::height)>(aHeight));
  // Check the spec's valid range.
  if (size.Width() <= 0) {
    return Err(nsCString("Width must be positive"));
  }
  if (size.Height() <= 0) {
    return Err(nsCString("Height must be positive"));
  }
  return size;
}

// A sub-helper to make sure visible range is in the picture.
static Result<Ok, nsCString> ValidateVisibility(
    const gfx::IntRect& aVisibleRect, const gfx::IntSize& aPicSize) {
  MOZ_ASSERT(aVisibleRect.X() >= 0);
  MOZ_ASSERT(aVisibleRect.Y() >= 0);
  MOZ_ASSERT(aVisibleRect.Width() > 0);
  MOZ_ASSERT(aVisibleRect.Height() > 0);

  const auto w = CheckedInt<uint32_t>(aVisibleRect.Width()) + aVisibleRect.X();
  if (w.value() > static_cast<uint32_t>(aPicSize.Width())) {
    return Err(nsCString(
        "Sum of visible rectangle's x and width exceeds the picture's width"));
  }

  const auto h = CheckedInt<uint32_t>(aVisibleRect.Height()) + aVisibleRect.Y();
  if (h.value() > static_cast<uint32_t>(aPicSize.Height())) {
    return Err(
        nsCString("Sum of visible rectangle's y and height exceeds the "
                  "picture's height"));
  }

  return Ok();
}

// A sub-helper to check and get display{Width, Height} in
// VideoFrame(Buffer)Init.
template <class T>
static Result<Maybe<gfx::IntSize>, nsCString> MaybeGetDisplaySize(
    const T& aInit) {
  if (aInit.mDisplayWidth.WasPassed() != aInit.mDisplayHeight.WasPassed()) {
    return Err(nsCString(
        "displayWidth and displayHeight cannot be set without the other"));
  }

  Maybe<gfx::IntSize> displaySize;
  if (aInit.mDisplayWidth.WasPassed() && aInit.mDisplayHeight.WasPassed()) {
    displaySize.emplace();
    MOZ_TRY_VAR(displaySize.ref(), ToIntSize(aInit.mDisplayWidth.Value(),
                                             aInit.mDisplayHeight.Value())
                                       .mapErr([](nsCString error) {
                                         error.Insert("display", 0);
                                         return error;
                                       }));
  }
  return displaySize;
}

// https://w3c.github.io/webcodecs/#valid-videoframebufferinit
static Result<Tuple<gfx::IntSize, Maybe<gfx::IntRect>, Maybe<gfx::IntSize>>,
              nsCString>
ValidateVideoFrameBufferInit(const VideoFrameBufferInit& aInit) {
  gfx::IntSize codedSize;
  MOZ_TRY_VAR(codedSize, ToIntSize(aInit.mCodedWidth, aInit.mCodedHeight)
                             .mapErr([](nsCString error) {
                               error.Insert("coded", 0);
                               return error;
                             }));

  Maybe<gfx::IntRect> visibleRect;
  if (aInit.mVisibleRect.WasPassed()) {
    visibleRect.emplace();
    MOZ_TRY_VAR(
        visibleRect.ref(),
        ToIntRect(aInit.mVisibleRect.Value()).mapErr([](nsCString error) {
          error.Insert("visibleRect's ", 0);
          return error;
        }));
    MOZ_TRY(ValidateVisibility(visibleRect.ref(), codedSize));
  }

  Maybe<gfx::IntSize> displaySize;
  MOZ_TRY_VAR(displaySize, MaybeGetDisplaySize(aInit));

  return MakeTuple(codedSize, visibleRect, displaySize);
}

// https://w3c.github.io/webcodecs/#videoframe-verify-rect-offset-alignment
static Result<Ok, nsCString> VerifyRectOffsetAlignment(
    const VideoFrame::Format& aFormat, const gfx::IntRect& aRect) {
  for (const VideoFrame::Format::Plane& p : aFormat.Planes()) {
    const gfx::IntSize sample = aFormat.SampleSize(p);
    if (aRect.X() % sample.Width() != 0) {
      return Err(nsCString("Mismatch between format and given left offset"));
    }

    if (aRect.Y() % sample.Height() != 0) {
      return Err(nsCString("Mismatch between format and given top offset"));
    }
  }
  return Ok();
}

// https://w3c.github.io/webcodecs/#videoframe-parse-visible-rect
static Result<gfx::IntRect, nsCString> ParseVisibleRect(
    const gfx::IntRect& aDefaultRect, const Maybe<gfx::IntRect>& aOverrideRect,
    const gfx::IntSize& aCodedSize, const VideoFrame::Format& aFormat) {
  MOZ_ASSERT(ValidateVisibility(aDefaultRect, aCodedSize).isOk());

  gfx::IntRect rect = aDefaultRect;
  if (aOverrideRect) {
    // Skip checking overrideRect's width and height here. They should be
    // checked before reaching here, and ValidateVisibility will assert it.

    MOZ_TRY(ValidateVisibility(aOverrideRect.ref(), aCodedSize));
    rect = *aOverrideRect;
  }

  MOZ_TRY(VerifyRectOffsetAlignment(aFormat, rect));

  return rect;
}

// https://w3c.github.io/webcodecs/#computed-plane-layout
struct ComputedPlaneLayout {
  // The offset from the beginning of the buffer in one plane.
  uint32_t mDestinationOffset = 0;
  // The stride of the image data in one plane.
  uint32_t mDestinationStride = 0;
  // Sample count of picture's top offset (a.k.a samples of y).
  uint32_t mSourceTop = 0;
  // Sample count of the picture's height.
  uint32_t mSourceHeight = 0;
  // Byte count of the picture's left offset (a.k.a bytes of x).
  uint32_t mSourceLeftBytes = 0;
  // Byte count of the picture's width.
  uint32_t mSourceWidthBytes = 0;
};

// https://w3c.github.io/webcodecs/#combined-buffer-layout
struct CombinedBufferLayout {
  CombinedBufferLayout() : mAllocationSize(0) {}
  CombinedBufferLayout(uint32_t aAllocationSize,
                       nsTArray<ComputedPlaneLayout>&& aLayout)
      : mAllocationSize(aAllocationSize),
        mComputedLayouts(std::move(aLayout)) {}
  uint32_t mAllocationSize = 0;
  nsTArray<ComputedPlaneLayout> mComputedLayouts;
};

// https://w3c.github.io/webcodecs/#videoframe-compute-layout-and-allocation-size
static Result<CombinedBufferLayout, nsCString> ComputeLayoutAndAllocationSize(
    const gfx::IntRect& aRect, const VideoFrame::Format& aFormat,
    const Sequence<PlaneLayout>* aPlaneLayouts) {
  nsTArray<VideoFrame::Format::Plane> planes = aFormat.Planes();

  if (aPlaneLayouts && aPlaneLayouts->Length() != planes.Length()) {
    return Err(nsCString("Mismatch between format and layout"));
  }

  uint32_t minAllocationSize = 0;
  nsTArray<ComputedPlaneLayout> layouts;
  nsTArray<uint32_t> endOffsets;

  for (size_t i = 0; i < planes.Length(); ++i) {
    const VideoFrame::Format::Plane& p = planes[i];
    const gfx::IntSize sampleSize = aFormat.SampleSize(p);

    // TODO: Spec here is wrong so we do differently:
    // https://github.com/w3c/webcodecs/issues/511
    // This comment should be removed once the issue is resolved.
    ComputedPlaneLayout layout{
        .mDestinationOffset = 0,
        .mDestinationStride = 0,
        .mSourceTop = (CheckedUint32(aRect.Y()) / sampleSize.Height()).value(),
        .mSourceHeight =
            (CheckedUint32(aRect.Height()) / sampleSize.Height()).value(),
        .mSourceLeftBytes = (CheckedUint32(aRect.X()) / sampleSize.Width() *
                             aFormat.SampleBytes(p))
                                .value(),
        .mSourceWidthBytes = (CheckedUint32(aRect.Width()) /
                              sampleSize.Width() * aFormat.SampleBytes(p))
                                 .value()};
    if (aPlaneLayouts) {
      const PlaneLayout& planeLayout = aPlaneLayouts->ElementAt(i);
      if (planeLayout.mStride < layout.mSourceWidthBytes) {
        return Err(nsPrintfCString("The stride in %s plane is too small",
                                   aFormat.PlaneName(p)));
      }
      layout.mDestinationOffset = planeLayout.mOffset;
      layout.mDestinationStride = planeLayout.mStride;
    } else {
      layout.mDestinationOffset = minAllocationSize;
      layout.mDestinationStride = layout.mSourceWidthBytes;
    }

    const CheckedInt<uint32_t> planeSize =
        CheckedInt<uint32_t>(layout.mDestinationStride) * layout.mSourceHeight;
    if (!planeSize.isValid()) {
      return Err(nsCString("Invalid layout with an over-sized plane"));
    }
    const CheckedInt<uint32_t> planeEnd = planeSize + layout.mDestinationOffset;
    if (!planeEnd.isValid()) {
      return Err(nsCString("Invalid layout with the out-out-bound offset"));
    }
    endOffsets.AppendElement(planeEnd.value());

    minAllocationSize = std::max(minAllocationSize, planeEnd.value());

    for (size_t j = 0; j < i; ++j) {
      const ComputedPlaneLayout& earlier = layouts[j];
      // If the current data's end is smaller or equal to the previous one's
      // head, or if the previous data's end is smaller or equal to the current
      // one's head, then they do not overlap. Otherwise, they do.
      if (endOffsets[i] > earlier.mDestinationOffset &&
          endOffsets[j] > layout.mDestinationOffset) {
        return Err(nsCString("Invalid layout with the overlapped planes"));
      }
    }
    layouts.AppendElement(layout);
  }

  return CombinedBufferLayout(minAllocationSize, std::move(layouts));
}

// https://w3c.github.io/webcodecs/#videoframe-verify-rect-size-alignment
static Result<Ok, nsCString> VerifyRectSizeAlignment(
    const VideoFrame::Format& aFormat, const gfx::IntRect& aRect) {
  for (const VideoFrame::Format::Plane& p : aFormat.Planes()) {
    const gfx::IntSize sample = aFormat.SampleSize(p);
    if (aRect.Width() % sample.Width() != 0) {
      return Err(nsCString("Mismatch between format and given rect's width"));
    }

    if (aRect.Height() % sample.Height() != 0) {
      return Err(nsCString("Mismatch between format and given rect's height"));
    }
  }
  return Ok();
}

// https://w3c.github.io/webcodecs/#videoframe-parse-videoframecopytooptions
static Result<CombinedBufferLayout, nsCString> ParseVideoFrameCopyToOptions(
    const VideoFrameCopyToOptions& aOptions, const gfx::IntRect& aVisibleRect,
    const gfx::IntSize& aCodedSize, const VideoFrame::Format& aFormat) {
  Maybe<gfx::IntRect> overrideRect;
  if (aOptions.mRect.WasPassed()) {
    // TODO: We handle some edge cases that spec misses:
    // https://github.com/w3c/webcodecs/issues/513
    // This comment should be removed once the issue is resolved.
    overrideRect.emplace();
    MOZ_TRY_VAR(overrideRect.ref(),
                ToIntRect(aOptions.mRect.Value()).mapErr([](nsCString error) {
                  error.Insert("rect's ", 0);
                  return error;
                }));

    MOZ_TRY(VerifyRectSizeAlignment(aFormat, overrideRect.ref()));
  }

  gfx::IntRect parsedRect;
  MOZ_TRY_VAR(parsedRect, ParseVisibleRect(aVisibleRect, overrideRect,
                                           aCodedSize, aFormat));

  const Sequence<PlaneLayout>* optLayout = nullptr;
  if (aOptions.mLayout.WasPassed()) {
    optLayout = &aOptions.mLayout.Value();
  }

  return ComputeLayoutAndAllocationSize(parsedRect, aFormat, optLayout);
}

static bool IsYUVFormat(const VideoPixelFormat& aFormat) {
  switch (aFormat) {
    case VideoPixelFormat::I420:
    case VideoPixelFormat::I420A:
    case VideoPixelFormat::I422:
    case VideoPixelFormat::I444:
    case VideoPixelFormat::NV12:
      return true;
    case VideoPixelFormat::RGBA:
    case VideoPixelFormat::RGBX:
    case VideoPixelFormat::BGRA:
    case VideoPixelFormat::BGRX:
      return false;
    case VideoPixelFormat::EndGuard_:
      MOZ_ASSERT_UNREACHABLE("unsupported format");
  }
  return false;
}

// https://w3c.github.io/webcodecs/#videoframe-pick-color-space
static VideoColorSpaceInit PickColorSpace(
    const VideoColorSpaceInit* aInitColorSpace,
    const VideoPixelFormat& aFormat) {
  VideoColorSpaceInit colorSpace;
  if (aInitColorSpace) {
    colorSpace = *aInitColorSpace;
    // By spec, we MAY replace null members of aInitColorSpace with guessed
    // values so we can always use these in CreateYUVImageFromBuffer.
    if (IsYUVFormat(aFormat) && !colorSpace.mMatrix.WasPassed()) {
      colorSpace.mMatrix.Construct(VideoMatrixCoefficients::Bt709);
    }
    return colorSpace;
  }

  switch (aFormat) {
    case VideoPixelFormat::I420:
    case VideoPixelFormat::I420A:
    case VideoPixelFormat::I422:
    case VideoPixelFormat::I444:
    case VideoPixelFormat::NV12:
      // https://w3c.github.io/webcodecs/#rec709-color-space
      colorSpace.mFullRange.Construct(false);
      colorSpace.mMatrix.Construct(VideoMatrixCoefficients::Bt709);
      colorSpace.mPrimaries.Construct(VideoColorPrimaries::Bt709);
      colorSpace.mTransfer.Construct(VideoTransferCharacteristics::Bt709);
      break;
    case VideoPixelFormat::RGBA:
    case VideoPixelFormat::RGBX:
    case VideoPixelFormat::BGRA:
    case VideoPixelFormat::BGRX:
      // https://w3c.github.io/webcodecs/#srgb-color-space
      colorSpace.mFullRange.Construct(true);
      colorSpace.mMatrix.Construct(VideoMatrixCoefficients::Rgb);
      colorSpace.mPrimaries.Construct(VideoColorPrimaries::Bt709);
      colorSpace.mTransfer.Construct(
          VideoTransferCharacteristics::Iec61966_2_1);
      break;
    case VideoPixelFormat::EndGuard_:
      MOZ_ASSERT_UNREACHABLE("unsupported format");
  }

  return colorSpace;
}

// https://w3c.github.io/webcodecs/#validate-videoframeinit
static Result<Tuple<Maybe<gfx::IntRect>, Maybe<gfx::IntSize>>, nsCString>
ValidateVideoFrameInit(const VideoFrameInit& aInit,
                       const VideoFrame::Format& aFormat,
                       const gfx::IntSize& aCodedSize) {
  if (aCodedSize.Width() <= 0 || aCodedSize.Height() <= 0) {
    return Err(nsCString("codedWidth and codedHeight must be positive"));
  }

  Maybe<gfx::IntRect> visibleRect;
  if (aInit.mVisibleRect.WasPassed()) {
    visibleRect.emplace();
    MOZ_TRY_VAR(
        visibleRect.ref(),
        ToIntRect(aInit.mVisibleRect.Value()).mapErr([](nsCString error) {
          error.Insert("visibleRect's ", 0);
          return error;
        }));
    MOZ_TRY(ValidateVisibility(visibleRect.ref(), aCodedSize));

    MOZ_TRY(VerifyRectOffsetAlignment(aFormat, visibleRect.ref()));
  }

  Maybe<gfx::IntSize> displaySize;
  MOZ_TRY_VAR(displaySize, MaybeGetDisplaySize(aInit));

  return MakeTuple(visibleRect, displaySize);
}

/*
 * The followings are helpers to create a VideoFrame from a given buffer
 */

static Result<RefPtr<gfx::DataSourceSurface>, nsCString> AllocateBGRASurface(
    gfx::DataSourceSurface* aSurface) {
  MOZ_ASSERT(aSurface);

  // Memory allocation relies on CreateDataSourceSurfaceWithStride so we still
  // need to do this even if the format is SurfaceFormat::BGR{A, X}.

  gfx::DataSourceSurface::ScopedMap surfaceMap(aSurface,
                                               gfx::DataSourceSurface::READ);
  if (!surfaceMap.IsMapped()) {
    return Err(nsCString("The source surface is not readable"));
  }

  RefPtr<gfx::DataSourceSurface> bgraSurface =
      gfx::Factory::CreateDataSourceSurfaceWithStride(
          aSurface->GetSize(), gfx::SurfaceFormat::B8G8R8A8,
          surfaceMap.GetStride());
  if (!bgraSurface) {
    return Err(nsCString("Failed to allocate a BGRA surface"));
  }

  gfx::DataSourceSurface::ScopedMap bgraMap(bgraSurface,
                                            gfx::DataSourceSurface::WRITE);
  if (!bgraMap.IsMapped()) {
    return Err(nsCString("The allocated BGRA surface is not writable"));
  }

  gfx::SwizzleData(surfaceMap.GetData(), surfaceMap.GetStride(),
                   aSurface->GetFormat(), bgraMap.GetData(),
                   bgraMap.GetStride(), bgraSurface->GetFormat(),
                   bgraSurface->GetSize());

  return bgraSurface;
}

static Result<RefPtr<layers::Image>, nsCString> CreateImageFromRawData(
    const gfx::IntSize& aSize, int32_t aStride, gfx::SurfaceFormat aFormat,
    const RangedPtr<uint8_t>& aPtr) {
  MOZ_ASSERT(!aSize.IsEmpty());

  // Wrap the source buffer into a DataSourceSurface.
  RefPtr<gfx::DataSourceSurface> surface =
      gfx::Factory::CreateWrappingDataSourceSurface(aPtr.get(), aStride, aSize,
                                                    aFormat);
  if (!surface) {
    return Err(nsCString("Failed to wrap the raw data into a surface"));
  }

  // Gecko favors BGRA so we convert surface into BGRA format first.
  RefPtr<gfx::DataSourceSurface> bgraSurface;
  MOZ_TRY_VAR(bgraSurface, AllocateBGRASurface(surface));
  MOZ_ASSERT(bgraSurface);

  return RefPtr<layers::Image>(
      new layers::SourceSurfaceImage(bgraSurface.get()));
}

static Result<RefPtr<layers::Image>, nsCString> CreateRGBAImageFromBuffer(
    const VideoFrame::Format& aFormat, const gfx::IntSize& aSize,
    const RangedPtr<uint8_t>& aPtr) {
  const gfx::SurfaceFormat format = aFormat.ToSurfaceFormat();
  MOZ_ASSERT(format == gfx::SurfaceFormat::R8G8B8A8 ||
             format == gfx::SurfaceFormat::R8G8B8X8 ||
             format == gfx::SurfaceFormat::B8G8R8A8 ||
             format == gfx::SurfaceFormat::B8G8R8X8);
  // TODO: Use aFormat.SampleBytes() instead?
  CheckedInt<int32_t> stride(BytesPerPixel(format));
  stride *= aSize.Width();
  if (!stride.isValid()) {
    return Err(nsCString("Image size exceeds implementation's limit"));
  }
  return CreateImageFromRawData(aSize, stride.value(), format, aPtr);
}

static Result<RefPtr<layers::Image>, nsCString> CreateYUVImageFromBuffer(
    const VideoFrame::Format& aFormat, const VideoColorSpaceInit& aColorSpace,
    const gfx::IntSize& aSize, const RangedPtr<uint8_t>& aPtr) {
  if (aFormat.PixelFormat() == VideoPixelFormat::I420 ||
      aFormat.PixelFormat() == VideoPixelFormat::I420A) {
    UniquePtr<I420BufferReader> reader;
    if (aFormat.PixelFormat() == VideoPixelFormat::I420) {
      reader.reset(new I420BufferReader(aPtr, aSize.Width(), aSize.Height()));
    } else {
      reader.reset(new I420ABufferReader(aPtr, aSize.Width(), aSize.Height()));
    }

    layers::PlanarYCbCrData data;
    data.mPictureRect = gfx::IntRect(0, 0, reader->mWidth, reader->mHeight);

    // Y plane.
    data.mYChannel = const_cast<uint8_t*>(reader->DataY());
    data.mYStride = reader->mStrideY;
    data.mYSkip = 0;
    // Cb plane.
    data.mCbChannel = const_cast<uint8_t*>(reader->DataU());
    data.mCbSkip = 0;
    // Cr plane.
    data.mCrChannel = const_cast<uint8_t*>(reader->DataV());
    data.mCbSkip = 0;
    // A plane.
    if (aFormat.PixelFormat() == VideoPixelFormat::I420A) {
      data.mAlpha.emplace();
      data.mAlpha->mChannel =
          const_cast<uint8_t*>(reader->AsI420ABufferReader()->DataA());
      data.mAlpha->mSize = data.mPictureRect.Size();
      // No values for mDepth and mPremultiplied.
    }

    // CbCr plane vector.
    MOZ_RELEASE_ASSERT(reader->mStrideU == reader->mStrideV);
    data.mCbCrStride = reader->mStrideU;
    data.mChromaSubsampling = gfx::ChromaSubsampling::HALF_WIDTH_AND_HEIGHT;
    // Color settings.
    if (aColorSpace.mFullRange.WasPassed() && aColorSpace.mFullRange.Value()) {
      data.mColorRange = gfx::ColorRange::FULL;
    }
    MOZ_RELEASE_ASSERT(aColorSpace.mMatrix.WasPassed());
    data.mYUVColorSpace = ToColorSpace(aColorSpace.mMatrix.Value());
    if (aColorSpace.mTransfer.WasPassed()) {
      data.mTransferFunction =
          ToTransferFunction(aColorSpace.mTransfer.Value());
    }
    if (aColorSpace.mPrimaries.WasPassed()) {
      data.mColorPrimaries = ToPrimaries(aColorSpace.mPrimaries.Value());
    }

    RefPtr<layers::PlanarYCbCrImage> image =
        new layers::RecyclingPlanarYCbCrImage(new layers::BufferRecycleBin());
    if (!image->CopyData(data)) {
      return Err(nsPrintfCString(
          "Failed to create I420%s image",
          (aFormat.PixelFormat() == VideoPixelFormat::I420A ? "A" : "")));
    }
    // Manually cast type to make Result work.
    return RefPtr<layers::Image>(image.forget());
  }

  if (aFormat.PixelFormat() == VideoPixelFormat::NV12) {
    NV12BufferReader reader(aPtr, aSize.Width(), aSize.Height());

    layers::PlanarYCbCrData data;
    data.mPictureRect = gfx::IntRect(0, 0, reader.mWidth, reader.mHeight);

    // Y plane.
    data.mYChannel = const_cast<uint8_t*>(reader.DataY());
    data.mYStride = reader.mStrideY;
    data.mYSkip = 0;
    // Cb plane.
    data.mCbChannel = const_cast<uint8_t*>(reader.DataUV());
    data.mCbSkip = 1;
    // Cr plane.
    data.mCrChannel = data.mCbChannel + 1;
    data.mCrSkip = 1;
    // CbCr plane vector.
    data.mCbCrStride = reader.mStrideUV;
    data.mChromaSubsampling = gfx::ChromaSubsampling::HALF_WIDTH_AND_HEIGHT;
    // Color settings.
    if (aColorSpace.mFullRange.WasPassed() && aColorSpace.mFullRange.Value()) {
      data.mColorRange = gfx::ColorRange::FULL;
    }
    MOZ_RELEASE_ASSERT(aColorSpace.mMatrix.WasPassed());
    data.mYUVColorSpace = ToColorSpace(aColorSpace.mMatrix.Value());
    if (aColorSpace.mTransfer.WasPassed()) {
      data.mTransferFunction =
          ToTransferFunction(aColorSpace.mTransfer.Value());
    }
    if (aColorSpace.mPrimaries.WasPassed()) {
      data.mColorPrimaries = ToPrimaries(aColorSpace.mPrimaries.Value());
    }

    RefPtr<layers::NVImage> image = new layers::NVImage();
    if (!image->SetData(data)) {
      return Err(nsCString("Failed to create NV12 image"));
    }
    // Manually cast type to make Result work.
    return RefPtr<layers::Image>(image.forget());
  }

  return Err(nsCString("Unsupported image format"));
}

static Result<RefPtr<layers::Image>, nsCString> CreateImageFromBuffer(
    const VideoFrame::Format& aFormat, const VideoColorSpaceInit& aColorSpace,
    const gfx::IntSize& aSize, const RangedPtr<uint8_t>& aPtr) {
  switch (aFormat.PixelFormat()) {
    case VideoPixelFormat::I420:
    case VideoPixelFormat::I420A:
    case VideoPixelFormat::NV12:
      return CreateYUVImageFromBuffer(aFormat, aColorSpace, aSize, aPtr);
    case VideoPixelFormat::I422:
    case VideoPixelFormat::I444:
      // Not yet support for now.
      break;
    case VideoPixelFormat::RGBA:
    case VideoPixelFormat::RGBX:
    case VideoPixelFormat::BGRA:
    case VideoPixelFormat::BGRX:
      return CreateRGBAImageFromBuffer(aFormat, aSize, aPtr);
    case VideoPixelFormat::EndGuard_:
      MOZ_ASSERT_UNREACHABLE("unsupported format");
  }
  return Err(nsCString("Invalid image format"));
}

// https://w3c.github.io/webcodecs/#dom-videoframe-videoframe-data-init
template <class T>
static Result<RefPtr<VideoFrame>, nsCString> CreateVideoFrameFromBuffer(
    nsIGlobalObject* aGlobal, const T& aBuffer,
    const VideoFrameBufferInit& aInit) {
  if (aInit.mColorSpace.WasPassed() &&
      aInit.mColorSpace.Value().mTransfer.WasPassed() &&
      aInit.mColorSpace.Value().mTransfer.Value() ==
          VideoTransferCharacteristics::Linear) {
    return Err(nsCString("linear RGB is not supported"));
  }

  Tuple<gfx::IntSize, Maybe<gfx::IntRect>, Maybe<gfx::IntSize>> init;
  MOZ_TRY_VAR(init, ValidateVideoFrameBufferInit(aInit));
  gfx::IntSize codedSize = Get<0>(init);
  Maybe<gfx::IntRect> visibleRect = Get<1>(init);
  Maybe<gfx::IntSize> displaySize = Get<2>(init);

  VideoFrame::Format format(aInit.mFormat);
  // TODO: Spec doesn't ask for this in ctor but Pixel Format does. See
  // https://github.com/w3c/webcodecs/issues/512
  // This comment should be removed once the issue is resolved.
  if (!format.IsValidSize(codedSize)) {
    return Err(nsCString("coded width and/or height is invalid"));
  }

  gfx::IntRect parsedRect;
  MOZ_TRY_VAR(parsedRect, ParseVisibleRect(gfx::IntRect({0, 0}, codedSize),
                                           visibleRect, codedSize, format));

  const Sequence<PlaneLayout>* optLayout = nullptr;
  if (aInit.mLayout.WasPassed()) {
    optLayout = &aInit.mLayout.Value();
  }

  CombinedBufferLayout combinedLayout;
  MOZ_TRY_VAR(combinedLayout,
              ComputeLayoutAndAllocationSize(parsedRect, format, optLayout));

  // RangedPtr's range won't change once it's set so no good default RangedPtr
  // value for using MOZ_TRY_VAR.
  auto r = GetArrayBufferData(aBuffer);
  if (r.isErr()) {
    return Err(nsCString("data is too large"));
  }
  Tuple<RangedPtr<uint8_t>, size_t> bufInfo = r.unwrap();
  RangedPtr<uint8_t> ptr(Get<0>(bufInfo));
  size_t byteLength = Get<1>(bufInfo);

  if (byteLength < static_cast<size_t>(combinedLayout.mAllocationSize)) {
    return Err(nsCString("data is too small"));
  }

  // TODO: If codedSize is (3, 3) and visibleRect is (0, 0, 1, 1) but the data
  // is 2 x 2 RGBA buffer (2 x 2 x 4 bytes), it pass the above check. In this
  // case, we can crop it to a 1 x 1-codedSize image (Bug 1782128).
  if (byteLength < format.SampleCount(codedSize)) {  // 1 byte/sample
    return Err(nsCString("data is too small"));
  }

  // By spec, we should set visible* here. But if we don't change the image,
  // visible* is same as parsedRect here. The display{Width, Height} is
  // visible{Width, Height} if it's not set.

  Maybe<uint64_t> duration =
      aInit.mDuration.WasPassed() ? Some(aInit.mDuration.Value()) : Nothing();

  VideoColorSpaceInit colorSpace = PickColorSpace(
      aInit.mColorSpace.WasPassed() ? &aInit.mColorSpace.Value() : nullptr,
      aInit.mFormat);

  RefPtr<layers::Image> data;
  MOZ_TRY_VAR(data, CreateImageFromBuffer(format, colorSpace, codedSize, ptr));
  MOZ_ASSERT(data);
  MOZ_ASSERT(data->GetSize() == codedSize);

  // TODO: Spec should assign aInit.mFormat to inner format value:
  // https://github.com/w3c/webcodecs/issues/509.
  // This comment should be removed once the issue is resolved.
  return MakeRefPtr<VideoFrame>(aGlobal, data, aInit.mFormat, codedSize,
                                parsedRect,
                                displaySize ? *displaySize : parsedRect.Size(),
                                duration, aInit.mTimestamp, colorSpace);
}

template <class T>
static already_AddRefed<VideoFrame> CreateVideoFrameFromBuffer(
    const GlobalObject& aGlobal, const T& aBuffer,
    const VideoFrameBufferInit& aInit, ErrorResult& aRv) {
  nsCOMPtr<nsIGlobalObject> global = do_QueryInterface(aGlobal.GetAsSupports());
  if (!global) {
    aRv.Throw(NS_ERROR_FAILURE);
    return nullptr;
  }

  auto r = CreateVideoFrameFromBuffer(global, aBuffer, aInit);
  if (r.isErr()) {
    aRv.ThrowTypeError(r.unwrapErr());
    return nullptr;
  }
  return r.unwrap().forget();
}

// https://w3c.github.io/webcodecs/#videoframe-initialize-visible-rect-and-display-size
static void InitializeVisibleRectAndDisplaySize(
    Maybe<gfx::IntRect>& aVisibleRect, Maybe<gfx::IntSize>& aDisplaySize,
    gfx::IntRect aDefaultVisibleRect, gfx::IntSize aDefaultDisplaySize) {
  if (!aVisibleRect) {
    aVisibleRect.emplace(aDefaultVisibleRect);
  }
  if (!aDisplaySize) {
    double wScale = static_cast<double>(aDefaultDisplaySize.Width()) /
                    aDefaultVisibleRect.Width();
    double hScale = static_cast<double>(aDefaultDisplaySize.Height()) /
                    aDefaultVisibleRect.Height();
    double w = wScale * aVisibleRect->Width();
    double h = hScale * aVisibleRect->Height();
    aDisplaySize.emplace(gfx::IntSize(static_cast<uint32_t>(round(w)),
                                      static_cast<uint32_t>(round(h))));
  }
}

// https://w3c.github.io/webcodecs/#videoframe-initialize-frame-with-resource-and-size
static Result<already_AddRefed<VideoFrame>, nsCString>
InitializeFrameWithResourceAndSize(
    nsIGlobalObject* aGlobal, const VideoFrameInit& aInit,
    already_AddRefed<layers::SourceSurfaceImage> aImage) {
  MOZ_ASSERT(aInit.mTimestamp.WasPassed());

  RefPtr<layers::SourceSurfaceImage> image(aImage);
  MOZ_ASSERT(image);

  RefPtr<gfx::SourceSurface> surface = image->GetAsSourceSurface();
  Maybe<VideoFrame::Format> format =
      ToVideoPixelFormat(surface->GetFormat())
          .map([](const VideoPixelFormat& aFormat) {
            return VideoFrame::Format(aFormat);
          });
  // TODO: Handle `ToVideoPixelFormat` failure.
  if (NS_WARN_IF(!format)) {
    return Err(nsCString("This image has unsupport format"));
  }

  Tuple<Maybe<gfx::IntRect>, Maybe<gfx::IntSize>> init;
  MOZ_TRY_VAR(init,
              ValidateVideoFrameInit(aInit, format.ref(), image->GetSize()));
  Maybe<gfx::IntRect> visibleRect = Get<0>(init);
  Maybe<gfx::IntSize> displaySize = Get<1>(init);

  if (aInit.mAlpha == AlphaOption::Discard) {
    format->MakeOpaque();
    // Keep the alpha data in image for now until it's being rendered.
  }

  InitializeVisibleRectAndDisplaySize(visibleRect, displaySize,
                                      gfx::IntRect({0, 0}, image->GetSize()),
                                      image->GetSize());

  Maybe<uint64_t> duration =
      aInit.mDuration.WasPassed() ? Some(aInit.mDuration.Value()) : Nothing();

  // TODO: WPT will fail if we guess a VideoColorSpace here.
  const VideoColorSpaceInit colorSpace{};
  return MakeAndAddRef<VideoFrame>(aGlobal, image, format->PixelFormat(),
                                   image->GetSize(), visibleRect.value(),
                                   displaySize.value(), duration,
                                   aInit.mTimestamp.Value(), colorSpace);
}

// https://w3c.github.io/webcodecs/#videoframe-initialize-frame-from-other-frame
static Result<already_AddRefed<VideoFrame>, nsCString>
InitializeFrameFromOtherFrame(nsIGlobalObject* aGlobal, VideoFrameData&& aData,
                              const VideoFrameInit& aInit) {
  MOZ_ASSERT(aGlobal);
  MOZ_ASSERT(aData.mImage);

  VideoFrame::Format format(aData.mFormat);
  if (aInit.mAlpha == AlphaOption::Discard) {
    format.MakeOpaque();
    // Keep the alpha data in image for now until it's being rendered.
  }

  Tuple<Maybe<gfx::IntRect>, Maybe<gfx::IntSize>> init;
  MOZ_TRY_VAR(init,
              ValidateVideoFrameInit(aInit, format, aData.mImage->GetSize()));
  Maybe<gfx::IntRect> visibleRect = Get<0>(init);
  Maybe<gfx::IntSize> displaySize = Get<1>(init);

  InitializeVisibleRectAndDisplaySize(visibleRect, displaySize,
                                      aData.mVisibleRect, aData.mDisplaySize);

  Maybe<uint64_t> duration = aInit.mDuration.WasPassed()
                                 ? Some(aInit.mDuration.Value())
                                 : aData.mDuration;
  int64_t timestamp = aInit.mTimestamp.WasPassed() ? aInit.mTimestamp.Value()
                                                   : aData.mTimestamp;

  return MakeAndAddRef<VideoFrame>(
      aGlobal, aData.mImage, format.PixelFormat(), aData.mImage->GetSize(),
      *visibleRect, *displaySize, duration, timestamp, aData.mColorSpace);
}

/*
 * W3C Webcodecs VideoFrame implementation
 */

VideoFrame::VideoFrame(nsIGlobalObject* aParent,
                       const RefPtr<layers::Image>& aImage,
                       const VideoPixelFormat& aFormat, gfx::IntSize aCodedSize,
                       gfx::IntRect aVisibleRect, gfx::IntSize aDisplaySize,
                       const Maybe<uint64_t>& aDuration, int64_t aTimestamp,
                       const VideoColorSpaceInit& aColorSpace)
    : mParent(aParent),
      mResource(Some(Resource(aImage, VideoFrame::Format(aFormat)))),
      mCodedSize(aCodedSize),
      mVisibleRect(aVisibleRect),
      mDisplaySize(aDisplaySize),
      mDuration(aDuration),
      mTimestamp(aTimestamp),
      mColorSpace(aColorSpace) {
  MOZ_ASSERT(mParent);
}

VideoFrame::VideoFrame(const VideoFrame& aOther)
    : mParent(aOther.mParent),
      mResource(aOther.mResource),
      mCodedSize(aOther.mCodedSize),
      mVisibleRect(aOther.mVisibleRect),
      mDisplaySize(aOther.mDisplaySize),
      mDuration(aOther.mDuration),
      mTimestamp(aOther.mTimestamp),
      mColorSpace(aOther.mColorSpace) {
  MOZ_ASSERT(mParent);
}

nsIGlobalObject* VideoFrame::GetParentObject() const {
  AssertIsOnOwningThread();

  return mParent.get();
}

JSObject* VideoFrame::WrapObject(JSContext* aCx,
                                 JS::Handle<JSObject*> aGivenProto) {
  AssertIsOnOwningThread();

  return VideoFrame_Binding::Wrap(aCx, this, aGivenProto);
}

// The following constructors are defined in
// https://w3c.github.io/webcodecs/#dom-videoframe-videoframe

/* static */
already_AddRefed<VideoFrame> VideoFrame::Constructor(
    const GlobalObject& aGlobal, HTMLImageElement& aImageElement,
    const VideoFrameInit& aInit, ErrorResult& aRv) {
  nsCOMPtr<nsIGlobalObject> global = do_QueryInterface(aGlobal.GetAsSupports());
  if (!global) {
    aRv.Throw(NS_ERROR_FAILURE);
    return nullptr;
  }

  // Check the usability.
  if (aImageElement.IntrinsicState().HasState(ElementState::BROKEN)) {
    aRv.ThrowInvalidStateError("The image's state is broken");
    return nullptr;
  }
  if (!aImageElement.Complete()) {
    aRv.ThrowInvalidStateError("The image is not completely loaded yet");
    return nullptr;
  }
  if (aImageElement.NaturalWidth() == 0) {
    aRv.ThrowInvalidStateError("The image has a width of 0");
    return nullptr;
  }
  if (aImageElement.NaturalHeight() == 0) {
    aRv.ThrowInvalidStateError("The image has a height of 0");
    return nullptr;
  }

  // If the origin of HTMLImageElement's image data is not same origin with the
  // entry settings object's origin, then throw a SecurityError DOMException.
  SurfaceFromElementResult res = nsLayoutUtils::SurfaceFromElement(
      &aImageElement, nsLayoutUtils::SFE_WANT_FIRST_FRAME_IF_IMAGE);
  if (res.mIsWriteOnly) {
    // Being write-only implies its image is cross-origin w/out CORS headers.
    aRv.ThrowSecurityError("The image is not same-origin");
    return nullptr;
  }

  RefPtr<gfx::SourceSurface> surface = res.GetSourceSurface();
  if (NS_WARN_IF(!surface)) {
    aRv.ThrowInvalidStateError("The image's surface acquisition failed");
    return nullptr;
  }

  if (!aInit.mTimestamp.WasPassed()) {
    aRv.ThrowTypeError("Missing timestamp");
    return nullptr;
  }

  RefPtr<layers::SourceSurfaceImage> image =
      new layers::SourceSurfaceImage(surface.get());
  auto r = InitializeFrameWithResourceAndSize(global, aInit, image.forget());
  if (r.isErr()) {
    aRv.ThrowTypeError(r.unwrapErr());
    return nullptr;
  }
  return r.unwrap();
}

/* static */
already_AddRefed<VideoFrame> VideoFrame::Constructor(
    const GlobalObject& aGlobal, SVGImageElement& aSVGImageElement,
    const VideoFrameInit& aInit, ErrorResult& aRv) {
  nsCOMPtr<nsIGlobalObject> global = do_QueryInterface(aGlobal.GetAsSupports());
  if (!global) {
    aRv.Throw(NS_ERROR_FAILURE);
    return nullptr;
  }

  // Check the usability.
  if (aSVGImageElement.IntrinsicState().HasState(ElementState::BROKEN)) {
    aRv.ThrowInvalidStateError("The SVG's state is broken");
    return nullptr;
  }

  // Check the image width and height.
  if (!aSVGImageElement.HasValidDimensions()) {
    aRv.ThrowInvalidStateError("The SVG does not have valid dimensions");
    return nullptr;
  }

  // If the origin of SVGImageElement's image data is not same origin with the
  // entry settings object's origin, then throw a SecurityError DOMException.
  SurfaceFromElementResult res = nsLayoutUtils::SurfaceFromElement(
      &aSVGImageElement, nsLayoutUtils::SFE_WANT_FIRST_FRAME_IF_IMAGE);
  if (res.mIsWriteOnly) {
    // Being write-only implies its image is cross-origin w/out CORS headers.
    aRv.ThrowSecurityError("The SVG is not same-origin");
    return nullptr;
  }

  RefPtr<gfx::SourceSurface> surface = res.GetSourceSurface();
  if (NS_WARN_IF(!surface)) {
    aRv.ThrowInvalidStateError("The SVG's surface acquisition failed");
    return nullptr;
  }

  if (!aInit.mTimestamp.WasPassed()) {
    aRv.ThrowTypeError("Missing timestamp");
    return nullptr;
  }

  RefPtr<layers::SourceSurfaceImage> image =
      new layers::SourceSurfaceImage(surface.get());
  auto r = InitializeFrameWithResourceAndSize(global, aInit, image.forget());
  if (r.isErr()) {
    aRv.ThrowTypeError(r.unwrapErr());
    return nullptr;
  }
  return r.unwrap();
}

/* static */
already_AddRefed<VideoFrame> VideoFrame::Constructor(
    const GlobalObject& aGlobal, HTMLCanvasElement& aCanvasElement,
    const VideoFrameInit& aInit, ErrorResult& aRv) {
  nsCOMPtr<nsIGlobalObject> global = do_QueryInterface(aGlobal.GetAsSupports());
  if (!global) {
    aRv.Throw(NS_ERROR_FAILURE);
    return nullptr;
  }

  // Check the usability.
  if (aCanvasElement.Width() == 0) {
    aRv.ThrowInvalidStateError("The canvas has a width of 0");
    return nullptr;
  }

  if (aCanvasElement.Height() == 0) {
    aRv.ThrowInvalidStateError("The canvas has a height of 0");
    return nullptr;
  }

  // If the origin of HTMLCanvasElement's image data is not same origin with the
  // entry settings object's origin, then throw a SecurityError DOMException.
  SurfaceFromElementResult res = nsLayoutUtils::SurfaceFromElement(
      &aCanvasElement, nsLayoutUtils::SFE_WANT_FIRST_FRAME_IF_IMAGE);
  if (res.mIsWriteOnly) {
    // Being write-only implies its image is cross-origin w/out CORS headers.
    aRv.ThrowSecurityError("The canvas is not same-origin");
    return nullptr;
  }

  RefPtr<gfx::SourceSurface> surface = res.GetSourceSurface();
  if (NS_WARN_IF(!surface)) {
    aRv.ThrowInvalidStateError("The canvas' surface acquisition failed");
    return nullptr;
  }

  if (!aInit.mTimestamp.WasPassed()) {
    aRv.ThrowTypeError("Missing timestamp");
    return nullptr;
  }

  RefPtr<layers::SourceSurfaceImage> image =
      new layers::SourceSurfaceImage(surface.get());
  auto r = InitializeFrameWithResourceAndSize(global, aInit, image.forget());
  if (r.isErr()) {
    aRv.ThrowTypeError(r.unwrapErr());
    return nullptr;
  }
  return r.unwrap();
}

/* static */
already_AddRefed<VideoFrame> VideoFrame::Constructor(
    const GlobalObject& aGlobal, HTMLVideoElement& aVideoElement,
    const VideoFrameInit& aInit, ErrorResult& aRv) {
  nsCOMPtr<nsIGlobalObject> global = do_QueryInterface(aGlobal.GetAsSupports());
  if (!global) {
    aRv.Throw(NS_ERROR_FAILURE);
    return nullptr;
  }

  aVideoElement.LogVisibility(
      mozilla::dom::HTMLVideoElement::CallerAPI::CREATE_VIDEOFRAME);

  // Check the usability.
  if (aVideoElement.NetworkState() == HTMLMediaElement_Binding::NETWORK_EMPTY) {
    aRv.ThrowInvalidStateError("The video has not been initialized yet");
    return nullptr;
  }
  if (aVideoElement.ReadyState() <= HTMLMediaElement_Binding::HAVE_METADATA) {
    aRv.ThrowInvalidStateError("The video is not ready yet");
    return nullptr;
  }
  RefPtr<layers::Image> image = aVideoElement.GetCurrentImage();
  if (!image) {
    aRv.ThrowInvalidStateError("The video doesn't have any image yet");
    return nullptr;
  }

  // If the origin of HTMLVideoElement's image data is not same origin with the
  // entry settings object's origin, then throw a SecurityError DOMException.
  if (!IsSameOrigin(global.get(), aVideoElement)) {
    aRv.ThrowSecurityError("The video is not same-origin");
    return nullptr;
  }

  const ImageUtils imageUtils(image);
  Maybe<VideoPixelFormat> format = ToVideoPixelFormat(imageUtils.GetFormat());
  if (!format) {
    aRv.ThrowTypeError("The video's image is in unsupported format");
    return nullptr;
  }

  // TODO: Retrive/infer the duration, and colorspace.
  auto r = InitializeFrameFromOtherFrame(
      global.get(),
      VideoFrameData(image.get(), format.ref(), image->GetPictureRect(),
                     image->GetSize(), Nothing(),
                     static_cast<int64_t>(aVideoElement.CurrentTime()), {}),
      aInit);
  if (r.isErr()) {
    aRv.ThrowTypeError(r.unwrapErr());
    return nullptr;
  }
  return r.unwrap();
}

/* static */
already_AddRefed<VideoFrame> VideoFrame::Constructor(
    const GlobalObject& aGlobal, OffscreenCanvas& aOffscreenCanvas,
    const VideoFrameInit& aInit, ErrorResult& aRv) {
  nsCOMPtr<nsIGlobalObject> global = do_QueryInterface(aGlobal.GetAsSupports());
  if (!global) {
    aRv.Throw(NS_ERROR_FAILURE);
    return nullptr;
  }

  // Check the usability.
  if (aOffscreenCanvas.Width() == 0) {
    aRv.ThrowInvalidStateError("The canvas has a width of 0");
    return nullptr;
  }
  if (aOffscreenCanvas.Height() == 0) {
    aRv.ThrowInvalidStateError("The canvas has a height of 0");
    return nullptr;
  }

  // If the origin of the OffscreenCanvas's image data is not same origin with
  // the entry settings object's origin, then throw a SecurityError
  // DOMException.
  SurfaceFromElementResult res = nsLayoutUtils::SurfaceFromOffscreenCanvas(
      &aOffscreenCanvas, nsLayoutUtils::SFE_WANT_FIRST_FRAME_IF_IMAGE);
  if (res.mIsWriteOnly) {
    // Being write-only implies its image is cross-origin w/out CORS headers.
    aRv.ThrowSecurityError("The canvas is not same-origin");
    return nullptr;
  }

  RefPtr<gfx::SourceSurface> surface = res.GetSourceSurface();
  if (NS_WARN_IF(!surface)) {
    aRv.ThrowInvalidStateError("The canvas' surface acquisition failed");
    return nullptr;
  }

  if (!aInit.mTimestamp.WasPassed()) {
    aRv.ThrowTypeError("Missing timestamp");
    return nullptr;
  }

  RefPtr<layers::SourceSurfaceImage> image =
      new layers::SourceSurfaceImage(surface.get());
  auto r = InitializeFrameWithResourceAndSize(global, aInit, image.forget());
  if (r.isErr()) {
    aRv.ThrowTypeError(r.unwrapErr());
    return nullptr;
  }
  return r.unwrap();
}

/* static */
already_AddRefed<VideoFrame> VideoFrame::Constructor(
    const GlobalObject& aGlobal, ImageBitmap& aImageBitmap,
    const VideoFrameInit& aInit, ErrorResult& aRv) {
  nsCOMPtr<nsIGlobalObject> global = do_QueryInterface(aGlobal.GetAsSupports());
  if (!global) {
    aRv.Throw(NS_ERROR_FAILURE);
    return nullptr;
  }

  // Check the usability.
  UniquePtr<ImageBitmapCloneData> data = aImageBitmap.ToCloneData();
  if (!data || !data->mSurface) {
    aRv.ThrowInvalidStateError(
        "The ImageBitmap is closed or its surface acquisition failed");
    return nullptr;
  }

  // If the origin of the ImageBitmap's image data is not same origin with the
  // entry settings object's origin, then throw a SecurityError DOMException.
  if (data->mWriteOnly) {
    // Being write-only implies its image is cross-origin w/out CORS headers.
    aRv.ThrowSecurityError("The ImageBitmap is not same-origin");
    return nullptr;
  }

  if (!aInit.mTimestamp.WasPassed()) {
    aRv.ThrowTypeError("Missing timestamp");
    return nullptr;
  }

  RefPtr<layers::SourceSurfaceImage> image =
      new layers::SourceSurfaceImage(data->mSurface.get());
  // TODO: Take care of data->mAlphaType
  auto r = InitializeFrameWithResourceAndSize(global, aInit, image.forget());
  if (r.isErr()) {
    aRv.ThrowTypeError(r.unwrapErr());
    return nullptr;
  }
  return r.unwrap();
}

/* static */
already_AddRefed<VideoFrame> VideoFrame::Constructor(
    const GlobalObject& aGlobal, VideoFrame& aVideoFrame,
    const VideoFrameInit& aInit, ErrorResult& aRv) {
  nsCOMPtr<nsIGlobalObject> global = do_QueryInterface(aGlobal.GetAsSupports());
  if (!global) {
    aRv.Throw(NS_ERROR_FAILURE);
    return nullptr;
  }

  // Check the usability.
  if (!aVideoFrame.mResource) {
    aRv.ThrowInvalidStateError(
        "The VideoFrame is closed or no image found there");
    return nullptr;
  }
  MOZ_ASSERT(aVideoFrame.mResource->mImage->GetSize() ==
             aVideoFrame.mCodedSize);
  MOZ_ASSERT(!aVideoFrame.mCodedSize.IsEmpty());
  MOZ_ASSERT(!aVideoFrame.mVisibleRect.IsEmpty());
  MOZ_ASSERT(!aVideoFrame.mDisplaySize.IsEmpty());

  // If the origin of the VideoFrame is not same origin with the entry settings
  // object's origin, then throw a SecurityError DOMException.
  if (!IsSameOrigin(global.get(), aVideoFrame)) {
    aRv.ThrowSecurityError("The VideoFrame is not same-origin");
    return nullptr;
  }

  auto r = InitializeFrameFromOtherFrame(
      global.get(),
      VideoFrameData(aVideoFrame.mResource->mImage.get(),
                     aVideoFrame.mResource->mFormat.PixelFormat(),
                     aVideoFrame.mVisibleRect, aVideoFrame.mDisplaySize,
                     aVideoFrame.mDuration, aVideoFrame.mTimestamp,
                     aVideoFrame.mColorSpace),
      aInit);
  if (r.isErr()) {
    aRv.ThrowTypeError(r.unwrapErr());
    return nullptr;
  }
  return r.unwrap();
}

// The following constructors are defined in
// https://w3c.github.io/webcodecs/#dom-videoframe-videoframe-data-init

/* static */
already_AddRefed<VideoFrame> VideoFrame::Constructor(
    const GlobalObject& aGlobal, const ArrayBufferView& aBufferView,
    const VideoFrameBufferInit& aInit, ErrorResult& aRv) {
  return CreateVideoFrameFromBuffer(aGlobal, aBufferView, aInit, aRv);
}

/* static */
already_AddRefed<VideoFrame> VideoFrame::Constructor(
    const GlobalObject& aGlobal, const ArrayBuffer& aBuffer,
    const VideoFrameBufferInit& aInit, ErrorResult& aRv) {
  return CreateVideoFrameFromBuffer(aGlobal, aBuffer, aInit, aRv);
}

// https://w3c.github.io/webcodecs/#dom-videoframe-format
Nullable<VideoPixelFormat> VideoFrame::GetFormat() const {
  AssertIsOnOwningThread();

  return mResource
             ? Nullable<VideoPixelFormat>(mResource->mFormat.PixelFormat())
             : Nullable<VideoPixelFormat>();
}

// https://w3c.github.io/webcodecs/#dom-videoframe-codedwidth
uint32_t VideoFrame::CodedWidth() const {
  AssertIsOnOwningThread();

  return static_cast<uint32_t>(mCodedSize.Width());
}

// https://w3c.github.io/webcodecs/#dom-videoframe-codedheight
uint32_t VideoFrame::CodedHeight() const {
  AssertIsOnOwningThread();

  return static_cast<uint32_t>(mCodedSize.Height());
}

// https://w3c.github.io/webcodecs/#dom-videoframe-codedrect
already_AddRefed<DOMRectReadOnly> VideoFrame::GetCodedRect() const {
  AssertIsOnOwningThread();

  return mResource
             ? MakeAndAddRef<DOMRectReadOnly>(
                   mParent, 0.0f, 0.0f, static_cast<double>(mCodedSize.Width()),
                   static_cast<double>(mCodedSize.Height()))
             : nullptr;
}

// https://w3c.github.io/webcodecs/#dom-videoframe-visiblerect
already_AddRefed<DOMRectReadOnly> VideoFrame::GetVisibleRect() const {
  AssertIsOnOwningThread();

  return mResource ? MakeAndAddRef<DOMRectReadOnly>(
                         mParent, static_cast<double>(mVisibleRect.X()),
                         static_cast<double>(mVisibleRect.Y()),
                         static_cast<double>(mVisibleRect.Width()),
                         static_cast<double>(mVisibleRect.Height()))
                   : nullptr;
}

// https://w3c.github.io/webcodecs/#dom-videoframe-displaywidth
uint32_t VideoFrame::DisplayWidth() const {
  AssertIsOnOwningThread();

  return static_cast<uint32_t>(mDisplaySize.Width());
}

// https://w3c.github.io/webcodecs/#dom-videoframe-displayheight
uint32_t VideoFrame::DisplayHeight() const {
  AssertIsOnOwningThread();

  return static_cast<uint32_t>(mDisplaySize.Height());
}

// https://w3c.github.io/webcodecs/#dom-videoframe-duration
Nullable<uint64_t> VideoFrame::GetDuration() const {
  AssertIsOnOwningThread();

  return mDuration ? Nullable<uint64_t>(*mDuration) : Nullable<uint64_t>();
}

// https://w3c.github.io/webcodecs/#dom-videoframe-timestamp
int64_t VideoFrame::Timestamp() const {
  AssertIsOnOwningThread();

  return mTimestamp;
}

// https://w3c.github.io/webcodecs/#dom-videoframe-colorspace
already_AddRefed<VideoColorSpace> VideoFrame::ColorSpace() const {
  AssertIsOnOwningThread();

  return MakeAndAddRef<VideoColorSpace>(mParent, mColorSpace);
}

// https://w3c.github.io/webcodecs/#dom-videoframe-allocationsize
uint32_t VideoFrame::AllocationSize(const VideoFrameCopyToOptions& aOptions,
                                    ErrorResult& aRv) {
  AssertIsOnOwningThread();

  if (!mResource) {
    aRv.ThrowInvalidStateError("No media resource in VideoFrame");
    return 0;
  }

  auto r = ParseVideoFrameCopyToOptions(aOptions, mVisibleRect, mCodedSize,
                                        mResource->mFormat);
  if (r.isErr()) {
    // TODO: Should throw layout.
    aRv.ThrowTypeError(r.unwrapErr());
    return 0;
  }
  CombinedBufferLayout layout = r.unwrap();

  return layout.mAllocationSize;
}

// https://w3c.github.io/webcodecs/#dom-videoframe-copyto
already_AddRefed<Promise> VideoFrame::CopyTo(
    const MaybeSharedArrayBufferViewOrMaybeSharedArrayBuffer& aDestination,
    const VideoFrameCopyToOptions& aOptions, ErrorResult& aRv) {
  AssertIsOnOwningThread();

  if (!mResource) {
    aRv.ThrowInvalidStateError("No media resource in VideoFrame");
    return nullptr;
  }

  RefPtr<Promise> p = Promise::Create(mParent.get(), aRv);
  if (NS_WARN_IF(aRv.Failed())) {
    return p.forget();
  }

  CombinedBufferLayout layout;
  auto r1 = ParseVideoFrameCopyToOptions(aOptions, mVisibleRect, mCodedSize,
                                         mResource->mFormat);
  if (r1.isErr()) {
    // TODO: Should reject with layout.
    p->MaybeRejectWithTypeError(r1.unwrapErr());
    return p.forget();
  }
  layout = r1.unwrap();

  auto r2 = GetSharedArrayBufferData(aDestination);
  if (r2.isErr()) {
    p->MaybeRejectWithTypeError("Failed to get buffer");
    return p.forget();
  }
  Tuple<RangedPtr<uint8_t>, size_t> bufInfo = r2.unwrap();
  RangedPtr<uint8_t> ptr(Get<0>(bufInfo));
  size_t byteLength = Get<1>(bufInfo);

  if (byteLength < layout.mAllocationSize) {
    p->MaybeRejectWithTypeError("Destination buffer is too small");
    return p.forget();
  }

  Sequence<PlaneLayout> planeLayouts;

  nsTArray<Format::Plane> planes = mResource->mFormat.Planes();
  MOZ_ASSERT(layout.mComputedLayouts.Length() == planes.Length());

  // TODO: These jobs can be run in a thread pool (bug 1780656) to unblock the
  // current thread.
  for (size_t i = 0; i < layout.mComputedLayouts.Length(); ++i) {
    ComputedPlaneLayout& l = layout.mComputedLayouts[i];
    uint32_t destinationOffset = l.mDestinationOffset;

    PlaneLayout* pl = planeLayouts.AppendElement(fallible);
    if (!pl) {
      p->MaybeRejectWithTypeError("Out of memory");
      return p.forget();
    }
    pl->mOffset = l.mDestinationOffset;
    pl->mStride = l.mDestinationStride;

    // Copy pixels of `size` starting from `origin` on planes[i] to
    // `aDestination`.
    gfx::IntPoint origin(
        l.mSourceLeftBytes / mResource->mFormat.SampleBytes(planes[i]),
        l.mSourceTop);
    gfx::IntSize size(
        l.mSourceWidthBytes / mResource->mFormat.SampleBytes(planes[i]),
        l.mSourceHeight);
    if (!mResource->CopyTo(planes[i], {origin, size},
                           ptr + static_cast<size_t>(destinationOffset),
                           static_cast<size_t>(l.mDestinationStride))) {
      p->MaybeRejectWithTypeError(
          nsPrintfCString("Failed to copy image data in %s plane",
                          mResource->mFormat.PlaneName(planes[i])));
      return p.forget();
    }
  }

  MOZ_ASSERT(layout.mComputedLayouts.Length() == planes.Length());
  // TODO: Spec doesn't resolve with a value. See
  // https://github.com/w3c/webcodecs/issues/510 This comment should be removed
  // once the issue is resolved.
  p->MaybeResolve(planeLayouts);
  return p.forget();
}

// https://w3c.github.io/webcodecs/#dom-videoframe-clone
already_AddRefed<VideoFrame> VideoFrame::Clone(ErrorResult& aRv) {
  AssertIsOnOwningThread();

  if (!mResource) {
    aRv.ThrowInvalidStateError("No media resource in the VideoFrame now");
    return nullptr;
  }
  // The VideoFrame's data must be shared instead of copied:
  // https://w3c.github.io/webcodecs/#raw-media-memory-model-reference-counting
  return MakeAndAddRef<VideoFrame>(*this);
}

// https://w3c.github.io/webcodecs/#close-videoframe
void VideoFrame::Close() {
  AssertIsOnOwningThread();

  mResource.reset();
  mCodedSize = gfx::IntSize();
  mVisibleRect = gfx::IntRect();
  mDisplaySize = gfx::IntSize();
  mDuration.reset();
}

// https://w3c.github.io/webcodecs/#ref-for-deserialization-steps%E2%91%A0
/* static */
JSObject* VideoFrame::ReadStructuredClone(
    JSContext* aCx, nsIGlobalObject* aGlobal, JSStructuredCloneReader* aReader,
    const VideoFrameSerializedData& aData) {
  if (!IsSameOrigin(aGlobal, aData.mPrincipalURI.get())) {
    return nullptr;
  }

  JS::Rooted<JS::Value> value(aCx, JS::NullValue());
  // To avoid a rooting hazard error from returning a raw JSObject* before
  // running the RefPtr destructor, RefPtr needs to be destructed before
  // returning the raw JSObject*, which is why the RefPtr<VideoFrame> is created
  // in the scope below. Otherwise, the static analysis infers the RefPtr cannot
  // be safely destructed while the unrooted return JSObject* is on the stack.
  {
    RefPtr<VideoFrame> frame = MakeAndAddRef<VideoFrame>(
        aGlobal, aData.mImage, aData.mFormat, aData.mCodedSize,
        aData.mVisibleRect, aData.mDisplaySize, aData.mDuration,
        aData.mTimestamp, aData.mColorSpace);
    if (!GetOrCreateDOMReflector(aCx, frame, &value) || !value.isObject()) {
      return nullptr;
    }
  }
  return value.toObjectOrNull();
}

// https://w3c.github.io/webcodecs/#ref-for-serialization-steps%E2%91%A0
bool VideoFrame::WriteStructuredClone(JSStructuredCloneWriter* aWriter,
                                      StructuredCloneHolder* aHolder) const {
  AssertIsOnOwningThread();

  if (!mResource) {
    return false;
  }

  // Indexing the image and send the index to the receiver.
  const uint32_t index = aHolder->VideoFrames().Length();
  RefPtr<layers::Image> image(mResource->mImage.get());
  // The serialization is limited to the same process scope so it's ok to
  // serialize a reference instead of a copy.
  aHolder->VideoFrames().AppendElement(VideoFrameSerializedData(
      image.get(), mResource->mFormat.PixelFormat(), mCodedSize, mVisibleRect,
      mDisplaySize, mDuration, mTimestamp, mColorSpace, GetPrincipalURI()));

  return !NS_WARN_IF(!JS_WriteUint32Pair(aWriter, SCTAG_DOM_VIDEOFRAME, index));
}

// https://w3c.github.io/webcodecs/#ref-for-transfer-steps%E2%91%A0
UniquePtr<VideoFrame::TransferredData> VideoFrame::Transfer() {
  AssertIsOnOwningThread();

  if (!mResource) {
    return nullptr;
  }

  Resource r = mResource.extract();
  auto frame = MakeUnique<TransferredData>(
      r.mImage.get(), r.mFormat.PixelFormat(), mCodedSize, mVisibleRect,
      mDisplaySize, mDuration, mTimestamp, mColorSpace, GetPrincipalURI());
  Close();
  return frame;
}

// https://w3c.github.io/webcodecs/#ref-for-transfer-receiving-steps%E2%91%A0
/* static */
already_AddRefed<VideoFrame> VideoFrame::FromTransferred(
    nsIGlobalObject* aGlobal, TransferredData* aData) {
  MOZ_ASSERT(aData);

  if (!IsSameOrigin(aGlobal, aData->mPrincipalURI.get())) {
    return nullptr;
  }

  return MakeAndAddRef<VideoFrame>(aGlobal, aData->mImage, aData->mFormat,
                                   aData->mCodedSize, aData->mVisibleRect,
                                   aData->mDisplaySize, aData->mDuration,
                                   aData->mTimestamp, aData->mColorSpace);
}

already_AddRefed<nsIURI> VideoFrame::GetPrincipalURI() const {
  AssertIsOnOwningThread();

  nsIPrincipal* principal = mParent->PrincipalOrNull();
  return principal ? principal->GetURI() : nullptr;
}

/*
 * VideoFrame::Format
 *
 * This class wraps a VideoPixelFormat defined in [1] and provides some
 * utilities for the VideoFrame's functions. Each sample in the format is 8
 * bits. The pixel layouts for a 4 x 2 image in the spec are illustrated below:
 * [1] https://w3c.github.io/webcodecs/#pixel-format
 *
 * I420 - 3 planes: Y, U, V
 * ------
 *     <- width ->
 *  Y: Y1 Y2 Y3 Y4 ^ height
 *     Y5 Y6 Y7 Y8 v
 *  U: U1    U2      => 1/2 Y's width, 1/2 Y's height
 *  V: V1    V2      => 1/2 Y's width, 1/2 Y's height
 *
 * I420A - 4 planes: Y, U, V, A
 * ------
 *     <- width ->
 *  Y: Y1 Y2 Y3 Y4 ^ height
 *     Y5 Y6 Y7 Y8 v
 *  U: U1    U2      => 1/2 Y's width, 1/2 Y's height
 *  V: V1    V2      => 1/2 Y's width, 1/2 Y's height
 *  A: A1 A2 A3 A4   => Y's width, Y's height
 *     A5 A6 A7 A8
 *
 * I422 - 3 planes: Y, U, V
 * ------
 *     <- width ->
 *  Y: Y1 Y2 Y3 Y4 ^ height
 *     Y5 Y6 Y7 Y8 v
 *  U: U1 U2 U3 U4 => Y's width, 1/2 Y's height
 *  V: V1 V2 V3 V4 => Y's width, 1/2 Y's height
 *
 * I444 - 3 planes: Y, U, V
 * ------
 *     <- width ->
 *  Y: Y1 Y2 Y3 Y4 ^ height
 *     Y5 Y6 Y7 Y8 v
 *  U: U1 U2 U3 U4   => Y's width, Y's height
 *     U5 U6 U7 U8
 *  V: V1 V2 V3 V4   => Y's width, Y's height
 *     V5 V6 V7 B8
 *
 * NV12 - 2 planes: Y, UV
 * ------
 *     <- width ->
 *  Y: Y1 Y2 Y3 Y4 ^ height
 *     Y5 Y6 Y7 Y8 v
 * UV: U1 V1 U2 V2 => Y's width, 1/2 Y's height
 *
 * RGBA - 1 plane encoding 3 colors: Red, Green, Blue, and an Alpha value
 * ------
 *     <---------------------- width ---------------------->
 *     R1 G1 B1 A1 | R2 G2 B2 A2 | R3 G3 B3 A3 | R4 G4 B4 A4 ^ height
 *     R5 G5 B5 A5 | R6 G6 B6 A6 | R7 G7 B7 A7 | R8 G8 B8 A8 v
 *
 * RGBX - 1 plane encoding 3 colors: Red, Green, Blue, and an padding value
 *      This is the opaque version of RGBA
 * ------
 *     <---------------------- width ---------------------->
 *     R1 G1 B1 X1 | R2 G2 B2 X2 | R3 G3 B3 X3 | R4 G4 B4 X4 ^ height
 *     R5 G5 B5 X5 | R6 G6 B6 X6 | R7 G7 B7 X7 | R8 G8 B8 X8 v
 *
 * BGRA - 1 plane encoding 3 colors: Blue, Green, Red, and an Alpha value
 * ------
 *     <---------------------- width ---------------------->
 *     B1 G1 R1 A1 | B2 G2 R2 A2 | B3 G3 R3 A3 | B4 G4 R4 A4 ^ height
 *     B5 G5 R5 A5 | B6 G6 R6 A6 | B7 G7 R7 A7 | B8 G8 R8 A8 v
 *
 * BGRX - 1 plane encoding 3 colors: Blue, Green, Red, and an padding value
 *      This is the opaque version of BGRA
 * ------
 *     <---------------------- width ---------------------->
 *     B1 G1 R1 X1 | B2 G2 R2 X2 | B3 G3 R3 X3 | B4 G4 R4 X4 ^ height
 *     B5 G5 R5 X5 | B6 G6 R6 X6 | B7 G7 R7 X7 | B8 G8 R8 X8 v
 */

VideoFrame::Format::Format(const VideoPixelFormat& aFormat)
    : mFormat(aFormat) {}

const VideoPixelFormat& VideoFrame::Format::PixelFormat() const {
  return mFormat;
}

gfx::SurfaceFormat VideoFrame::Format::ToSurfaceFormat() const {
  gfx::SurfaceFormat format = gfx::SurfaceFormat::UNKNOWN;
  switch (mFormat) {
    case VideoPixelFormat::I420:
    case VideoPixelFormat::I420A:
    case VideoPixelFormat::I422:
    case VideoPixelFormat::I444:
    case VideoPixelFormat::NV12:
      // Not yet support for now.
      break;
    case VideoPixelFormat::RGBA:
      format = gfx::SurfaceFormat::R8G8B8A8;
      break;
    case VideoPixelFormat::RGBX:
      format = gfx::SurfaceFormat::R8G8B8X8;
      break;
    case VideoPixelFormat::BGRA:
      format = gfx::SurfaceFormat::B8G8R8A8;
      break;
    case VideoPixelFormat::BGRX:
      format = gfx::SurfaceFormat::B8G8R8X8;
      break;
    case VideoPixelFormat::EndGuard_:
      MOZ_ASSERT_UNREACHABLE("unsupported format");
  }
  return format;
}

void VideoFrame::Format::MakeOpaque() {
  switch (mFormat) {
    case VideoPixelFormat::I420A:
      mFormat = VideoPixelFormat::I420;
      return;
    case VideoPixelFormat::RGBA:
      mFormat = VideoPixelFormat::RGBX;
      return;
    case VideoPixelFormat::BGRA:
      mFormat = VideoPixelFormat::BGRX;
      return;
    case VideoPixelFormat::I420:
    case VideoPixelFormat::I422:
    case VideoPixelFormat::I444:
    case VideoPixelFormat::NV12:
    case VideoPixelFormat::RGBX:
    case VideoPixelFormat::BGRX:
      return;
    case VideoPixelFormat::EndGuard_:
      break;
  }
  MOZ_ASSERT_UNREACHABLE("unsupported format");
}

nsTArray<VideoFrame::Format::Plane> VideoFrame::Format::Planes() const {
  switch (mFormat) {
    case VideoPixelFormat::I420:
    case VideoPixelFormat::I422:
    case VideoPixelFormat::I444:
      return {Plane::Y, Plane::U, Plane::V};
    case VideoPixelFormat::I420A:
      return {Plane::Y, Plane::U, Plane::V, Plane::A};
    case VideoPixelFormat::NV12:
      return {Plane::Y, Plane::UV};
    case VideoPixelFormat::RGBA:
    case VideoPixelFormat::RGBX:
    case VideoPixelFormat::BGRA:
    case VideoPixelFormat::BGRX:
      return {Plane::RGBA};
    case VideoPixelFormat::EndGuard_:
      break;
  }
  MOZ_ASSERT_UNREACHABLE("unsupported format");
  return {};
}

const char* VideoFrame::Format::PlaneName(const Plane& aPlane) const {
  switch (aPlane) {
    case Format::Plane::Y:  // and RGBA
      return IsYUV() ? "Y" : "RGBA";
    case Format::Plane::U:  // and UV
      MOZ_ASSERT(IsYUV());
      return mFormat == VideoPixelFormat::NV12 ? "UV" : "U";
    case Format::Plane::V:
      MOZ_ASSERT(IsYUV());
      return "V";
    case Format::Plane::A:
      MOZ_ASSERT(IsYUV());
      return "A";
  }
  MOZ_ASSERT_UNREACHABLE("invalid plane");
  return "Unknown";
}

uint32_t VideoFrame::Format::SampleBytes(const Plane& aPlane) const {
  switch (mFormat) {
    case VideoPixelFormat::I420:
    case VideoPixelFormat::I420A:
    case VideoPixelFormat::I422:
    case VideoPixelFormat::I444:
      return 1;  // 8 bits/sample on the Y, U, V, A plane.
    case VideoPixelFormat::NV12:
      switch (aPlane) {
        case Plane::Y:
          return 1;  // 8 bits/sample on the Y plane
        case Plane::UV:
          return 2;  // Interleaved U and V values on the UV plane.
        case Plane::V:
        case Plane::A:
          MOZ_ASSERT_UNREACHABLE("invalid plane");
      }
      return 0;
    case VideoPixelFormat::RGBA:
    case VideoPixelFormat::RGBX:
    case VideoPixelFormat::BGRA:
    case VideoPixelFormat::BGRX:
      return 4;  // 8 bits/sample, 32 bits/pixel
    case VideoPixelFormat::EndGuard_:
      break;
  }
  MOZ_ASSERT_UNREACHABLE("unsupported format");
  return 0;
}

gfx::IntSize VideoFrame::Format::SampleSize(const Plane& aPlane) const {
  // The sample width and height refers to
  // https://w3c.github.io/webcodecs/#sub-sampling-factor
  switch (aPlane) {
    case Plane::Y:  // and RGBA
    case Plane::A:
      return gfx::IntSize(1, 1);
    case Plane::U:  // and UV
    case Plane::V:
      switch (mFormat) {
        case VideoPixelFormat::I420:
        case VideoPixelFormat::I420A:
        case VideoPixelFormat::NV12:
          return gfx::IntSize(2, 2);
        case VideoPixelFormat::I422:
          return gfx::IntSize(2, 1);
        case VideoPixelFormat::I444:
          return gfx::IntSize(1, 1);
        case VideoPixelFormat::RGBA:
        case VideoPixelFormat::RGBX:
        case VideoPixelFormat::BGRA:
        case VideoPixelFormat::BGRX:
        case VideoPixelFormat::EndGuard_:
          MOZ_ASSERT_UNREACHABLE("invalid format");
          return {0, 0};
      }
  }
  MOZ_ASSERT_UNREACHABLE("invalid plane");
  return {0, 0};
}

bool VideoFrame::Format::IsValidSize(const gfx::IntSize& aSize) const {
  switch (mFormat) {
    case VideoPixelFormat::I420:
    case VideoPixelFormat::I420A:
    case VideoPixelFormat::NV12:
      return (aSize.Width() % 2 == 0) && (aSize.Height() % 2 == 0);
    case VideoPixelFormat::I422:
      return aSize.Height() % 2 == 0;
    case VideoPixelFormat::I444:
    case VideoPixelFormat::RGBA:
    case VideoPixelFormat::RGBX:
    case VideoPixelFormat::BGRA:
    case VideoPixelFormat::BGRX:
      return true;
    case VideoPixelFormat::EndGuard_:
      break;
  }
  MOZ_ASSERT_UNREACHABLE("unsupported format");
  return false;
}

size_t VideoFrame::Format::SampleCount(const gfx::IntSize& aSize) const {
  MOZ_ASSERT(IsValidSize(aSize));

  CheckedInt<size_t> count(aSize.Width());
  count *= aSize.Height();

  switch (mFormat) {
    case VideoPixelFormat::I420:
    case VideoPixelFormat::NV12:
      return (count + count / 2).value();
    case VideoPixelFormat::I420A:
      return (count * 2 + count / 2).value();
    case VideoPixelFormat::I422:
      return (count * 2).value();
    case VideoPixelFormat::I444:
      return (count * 3).value();
    case VideoPixelFormat::RGBA:
    case VideoPixelFormat::RGBX:
    case VideoPixelFormat::BGRA:
    case VideoPixelFormat::BGRX:
      return (count * 4).value();
    case VideoPixelFormat::EndGuard_:
      break;
  }

  MOZ_ASSERT_UNREACHABLE("unsupported format");
  return 0;
}

bool VideoFrame::Format::IsYUV() const { return IsYUVFormat(mFormat); }

/*
 * VideoFrame::Resource
 */

VideoFrame::Resource::Resource(const RefPtr<layers::Image>& aImage,
                               const class Format& aFormat)
    : mImage(aImage), mFormat(aFormat) {
  MOZ_ASSERT(mImage);
}

VideoFrame::Resource::Resource(const Resource& aOther)
    : mImage(aOther.mImage), mFormat(aOther.mFormat) {
  MOZ_ASSERT(mImage);
}

uint32_t VideoFrame::Resource::Stride(const Format::Plane& aPlane) const {
  CheckedInt<uint32_t> width(mImage->GetSize().Width());
  switch (aPlane) {
    case Format::Plane::Y:  // and RGBA
    case Format::Plane::A:
      switch (mFormat.PixelFormat()) {
        case VideoPixelFormat::I420:
        case VideoPixelFormat::I420A:
        case VideoPixelFormat::I422:
        case VideoPixelFormat::I444:
        case VideoPixelFormat::NV12:
        case VideoPixelFormat::RGBA:
        case VideoPixelFormat::RGBX:
        case VideoPixelFormat::BGRA:
        case VideoPixelFormat::BGRX:
          return (width * mFormat.SampleBytes(aPlane)).value();
        case VideoPixelFormat::EndGuard_:
          MOZ_ASSERT_UNREACHABLE("invalid format");
      }
      return 0;
    case Format::Plane::U:  // and UV
    case Format::Plane::V:
      switch (mFormat.PixelFormat()) {
        case VideoPixelFormat::I420:
        case VideoPixelFormat::I420A:
        case VideoPixelFormat::I422:
        case VideoPixelFormat::I444:
        case VideoPixelFormat::NV12:
          return (((width + 1) / 2) * mFormat.SampleBytes(aPlane)).value();
        case VideoPixelFormat::RGBA:
        case VideoPixelFormat::RGBX:
        case VideoPixelFormat::BGRA:
        case VideoPixelFormat::BGRX:
        case VideoPixelFormat::EndGuard_:
          MOZ_ASSERT_UNREACHABLE("invalid format");
      }
      return 0;
  }
  MOZ_ASSERT_UNREACHABLE("invalid plane");
  return 0;
}

bool VideoFrame::Resource::CopyTo(const Format::Plane& aPlane,
                                  const gfx::IntRect& aRect,
                                  RangedPtr<uint8_t>&& aPlaneDest,
                                  size_t aDestinationStride) const {
  auto copyPlane = [&](const uint8_t* aPlaneData) {
    MOZ_ASSERT(aPlaneData);

    CheckedInt<size_t> offset(aRect.Y());
    offset *= Stride(aPlane);
    offset += aRect.X() * mFormat.SampleBytes(aPlane);
    if (!offset.isValid()) {
      return false;
    }

    CheckedInt<size_t> elementsBytes(aRect.Width());
    elementsBytes *= mFormat.SampleBytes(aPlane);
    if (!elementsBytes.isValid()) {
      return false;
    }

    aPlaneData += offset.value();
    for (int32_t row = 0; row < aRect.Height(); ++row) {
      PodCopy(aPlaneDest.get(), aPlaneData, elementsBytes.value());
      aPlaneData += Stride(aPlane);
      // Spec asks to move `aDestinationStride` bytes instead of
      // `Stride(aPlane)` forward.
      aPlaneDest += aDestinationStride;
    }
    return true;
  };

  if (mImage->GetFormat() == ImageFormat::MOZ2D_SURFACE) {
    RefPtr<gfx::SourceSurface> surface = mImage->GetAsSourceSurface();
    if (NS_WARN_IF(!surface)) {
      return false;
    }

    RefPtr<gfx::DataSourceSurface> dataSurface = surface->GetDataSurface();
    if (NS_WARN_IF(!surface)) {
      return false;
    }

    gfx::DataSourceSurface::ScopedMap map(dataSurface,
                                          gfx::DataSourceSurface::READ);
    if (NS_WARN_IF(!map.IsMapped())) {
      return false;
    }

    const gfx::SurfaceFormat format = dataSurface->GetFormat();

    if (format == gfx::SurfaceFormat::R8G8B8A8 ||
        format == gfx::SurfaceFormat::R8G8B8X8 ||
        format == gfx::SurfaceFormat::B8G8R8A8 ||
        format == gfx::SurfaceFormat::B8G8R8X8) {
      MOZ_ASSERT(aPlane == Format::Plane::RGBA);

      // The mImage's format can be different from mFormat (since Gecko prefers
      // BGRA). To get the data in the matched format, we create a temp buffer
      // holding the image data in that format and then copy them to
      // `aDestination`.
      const gfx::SurfaceFormat f = mFormat.ToSurfaceFormat();
      MOZ_ASSERT(f == gfx::SurfaceFormat::R8G8B8A8 ||
                 f == gfx::SurfaceFormat::R8G8B8X8 ||
                 f == gfx::SurfaceFormat::B8G8R8A8 ||
                 f == gfx::SurfaceFormat::B8G8R8X8);

      // TODO: We could use Factory::CreateWrappingDataSourceSurface to wrap
      // `aDestination` to avoid extra copy.
      RefPtr<gfx::DataSourceSurface> tempSurface =
          gfx::Factory::CreateDataSourceSurfaceWithStride(
              dataSurface->GetSize(), f, map.GetStride());
      if (NS_WARN_IF(!tempSurface)) {
        return false;
      }

      gfx::DataSourceSurface::ScopedMap tempMap(tempSurface,
                                                gfx::DataSourceSurface::WRITE);
      if (NS_WARN_IF(!tempMap.IsMapped())) {
        return false;
      }

      if (!gfx::SwizzleData(map.GetData(), map.GetStride(),
                            dataSurface->GetFormat(), tempMap.GetData(),
                            tempMap.GetStride(), tempSurface->GetFormat(),
                            tempSurface->GetSize())) {
        return false;
      }

      return copyPlane(tempMap.GetData());
    }

    return false;
  }

  if (mImage->GetFormat() == ImageFormat::PLANAR_YCBCR) {
    switch (aPlane) {
      case Format::Plane::Y:
        return copyPlane(mImage->AsPlanarYCbCrImage()->GetData()->mYChannel);
      case Format::Plane::U:
        return copyPlane(mImage->AsPlanarYCbCrImage()->GetData()->mCbChannel);
      case Format::Plane::V:
        return copyPlane(mImage->AsPlanarYCbCrImage()->GetData()->mCrChannel);
      case Format::Plane::A:
        MOZ_ASSERT(mFormat.PixelFormat() == VideoPixelFormat::I420A);
        MOZ_ASSERT(mImage->AsPlanarYCbCrImage()->GetData()->mAlpha);
        return copyPlane(
            mImage->AsPlanarYCbCrImage()->GetData()->mAlpha->mChannel);
    }
    MOZ_ASSERT_UNREACHABLE("invalid plane");
  }

  if (mImage->GetFormat() == ImageFormat::NV_IMAGE) {
    switch (aPlane) {
      case Format::Plane::Y:
        return copyPlane(mImage->AsNVImage()->GetData()->mYChannel);
      case Format::Plane::UV:
        return copyPlane(mImage->AsNVImage()->GetData()->mCbChannel);
      case Format::Plane::V:
      case Format::Plane::A:
        MOZ_ASSERT_UNREACHABLE("invalid plane");
    }
  }

  return false;
}

}  // namespace mozilla::dom
