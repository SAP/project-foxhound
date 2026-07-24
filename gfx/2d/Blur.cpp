/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "Blur.h"

#include <algorithm>
#include <math.h>
#include <string.h>

#include "NumericTools.h"

#include "2D.h"
#include "DataSurfaceHelpers.h"
#include "HelpersSkia.h"
#include "Tools.h"

#include "skia/include/core/SkCanvas.h"
#include "skia/include/core/SkSurface.h"
#include "skia/include/effects/SkImageFilters.h"

namespace mozilla {
namespace gfx {

template <typename T>
struct PixelValue {
  T value;

  explicit PixelValue(T aValue) : value(aValue) {}

  void Spread(const PixelValue& aOther) {
    value = std::max(value, aOther.value);
  }
};

template <>
struct PixelValue<uint32_t> {
  union {
    struct {
      uint8_t r;
      uint8_t g;
      uint8_t b;
      uint8_t a;
    };
    uint32_t value;
  };

  explicit PixelValue(uint32_t aValue) { value = aValue; }

  void Spread(const PixelValue& aOther) {
    r = std::max(r, aOther.r);
    g = std::max(g, aOther.g);
    b = std::max(b, aOther.b);
    a = std::max(a, aOther.a);
  }
};

template <typename T>
static void SpreadHorizontal(const T* aInput, T* aOutput, int32_t aRadius,
                             int32_t aWidth, int32_t aRows, int32_t aStride,
                             const IntRect& aSkipRect) {
  if (aRadius == 0) {
    memcpy(aOutput, aInput, aStride * aRows * sizeof(T));
    return;
  }

  bool skipRectCoversWholeRow =
      0 >= aSkipRect.X() && aWidth <= aSkipRect.XMost();
  for (int32_t y = 0; y < aRows; y++) {
    // Check whether the skip rect intersects this row. If the skip
    // rect covers the whole surface in this row, we can avoid
    // this row entirely (and any others along the skip rect).
    bool inSkipRectY = aSkipRect.ContainsY(y);
    if (inSkipRectY && skipRectCoversWholeRow) {
      y = aSkipRect.YMost() - 1;
      continue;
    }

    T* dst = &aOutput[aStride * y];
    for (int32_t x = 0; x < aWidth; x++) {
      // Check whether we are within the skip rect. If so, go
      // to the next point outside the skip rect.
      if (inSkipRectY && aSkipRect.ContainsX(x)) {
        x = aSkipRect.XMost();
        if (x >= aWidth) break;
      }

      int32_t sMin = std::max(x - aRadius, 0);
      int32_t sMax = std::min(x + aRadius, aWidth - 1);
      const auto* src =
          reinterpret_cast<const PixelValue<T>*>(&aInput[aStride * y + sMin]);
      PixelValue<T> v(0);
      for (int32_t s = sMin; s <= sMax; ++s) {
        v.Spread(*src);
        ++src;
      }
      *dst = v.value;
      ++dst;
    }
  }
}

template <typename T>
static void SpreadVertical(const T* aInput, T* aOutput, int32_t aRadius,
                           int32_t aWidth, int32_t aRows, int32_t aStride,
                           const IntRect& aSkipRect) {
  if (aRadius == 0) {
    memcpy(aOutput, aInput, aStride * aRows * sizeof(T));
    return;
  }

  bool skipRectCoversWholeColumn =
      0 >= aSkipRect.Y() && aRows <= aSkipRect.YMost();
  for (int32_t x = 0; x < aWidth; x++) {
    bool inSkipRectX = aSkipRect.ContainsX(x);
    if (inSkipRectX && skipRectCoversWholeColumn) {
      x = aSkipRect.XMost() - 1;
      continue;
    }

    T* dst = &aOutput[x];
    for (int32_t y = 0; y < aRows; y++) {
      // Check whether we are within the skip rect. If so, go
      // to the next point outside the skip rect.
      if (inSkipRectX && aSkipRect.ContainsY(y)) {
        y = aSkipRect.YMost();
        if (y >= aRows) break;
      }

      int32_t sMin = std::max(y - aRadius, 0);
      int32_t sMax = std::min(y + aRadius, aRows - 1);
      const auto* src =
          reinterpret_cast<const PixelValue<T>*>(&aInput[aStride * sMin + x]);
      PixelValue<T> v(0);
      for (int32_t s = sMin; s <= sMax; ++s) {
        v.Spread(*src);
        src += aStride;
      }
      *dst = v.value;
      dst += aStride;
    }
  }
}

GaussianBlur::GaussianBlur(const Rect& aRect, const IntSize& aSpreadRadius,
                           const Point& aSigma, const Rect* aDirtyRect,
                           const Rect* aSkipRect, SurfaceFormat aFormat,
                           bool aClamp) {
  Init(aRect, aSpreadRadius, aSigma, aDirtyRect, aSkipRect, aFormat, aClamp);
}

void GaussianBlur::Init(const Rect& aRect, const IntSize& aSpreadRadius,
                        const Point& aBlurSigma, const Rect* aDirtyRect,
                        const Rect* aSkipRect, SurfaceFormat aFormat,
                        bool aClamp) {
  switch (aFormat) {
    case SurfaceFormat::A8:
    case SurfaceFormat::B8G8R8A8:
    case SurfaceFormat::B8G8R8X8:
    case SurfaceFormat::R8G8B8A8:
    case SurfaceFormat::R8G8B8X8:
    case SurfaceFormat::A8R8G8B8:
    case SurfaceFormat::X8R8G8B8:
      break;
    default:
      MOZ_RELEASE_ASSERT(false, "Unsupported format for GaussianBlur");
      break;
  }

  mFormat = aFormat;
  mClamp = aClamp;
  mSpreadRadius = aSpreadRadius;
  mBlurSigma = aBlurSigma;
  mBlurRadius = GaussianBlur::CalculateBlurRadius(aBlurSigma);

  Rect rect(aRect);
  rect.Inflate(Size(mBlurRadius + aSpreadRadius));
  rect.RoundOut();

  if (aDirtyRect) {
    // If we get passed a dirty rect from layout, we can minimize the
    // shadow size and make painting faster.
    mHasDirtyRect = true;
    mDirtyRect = *aDirtyRect;
    Rect requiredBlurArea = mDirtyRect.Intersect(rect);
    requiredBlurArea.Inflate(Size(mBlurRadius + aSpreadRadius));
    rect = requiredBlurArea.Intersect(rect);
  } else {
    mHasDirtyRect = false;
  }

  mRect = TruncatedToInt(rect);
  if (mRect.IsEmpty()) {
    return;
  }

  if (aSkipRect) {
    // If we get passed a skip rect, we can lower the amount of
    // blurring/spreading we need to do. We convert it to IntRect to avoid
    // expensive int<->float conversions if we were to use Rect instead.
    Rect skipRect = *aSkipRect;
    skipRect.Deflate(Size(mBlurRadius + aSpreadRadius));
    mSkipRect = RoundedIn(skipRect);
    mSkipRect = mSkipRect.Intersect(mRect);
    if (mSkipRect.IsEqualInterior(mRect)) {
      return;
    }

    mSkipRect -= mRect.TopLeft();
    if (mSkipRect.IsEmpty()) {
      mSkipRect = IntRect();
    }
  } else {
    mSkipRect = IntRect();
  }

  int32_t stride = StrideForFormatAndWidth(mFormat, mRect.Width());
  if (stride >= 0) {
    mStride = stride;

    // We need to leave room for an additional 3 bytes for a potential overrun
    // in our blurring code.
    size_t size = BufferSizeFromStrideAndHeight(mStride, mRect.Height(), 3);
    if (size != 0) {
      mSurfaceAllocationSize = size;
    }
  }
}

GaussianBlur::GaussianBlur(const Point& aSigma, bool aClamp)
    : mBlurSigma(aSigma),
      mBlurRadius(CalculateBlurRadius(aSigma)),
      mClamp(aClamp) {}

IntSize GaussianBlur::GetSize() const { return mRect.Size(); }

SurfaceFormat GaussianBlur::GetFormat() const { return mFormat; }

int32_t GaussianBlur::GetStride() const { return mStride; }

IntRect GaussianBlur::GetRect() const { return mRect; }

Rect* GaussianBlur::GetDirtyRect() {
  if (mHasDirtyRect) {
    return &mDirtyRect;
  }

  return nullptr;
}

size_t GaussianBlur::GetSurfaceAllocationSize() const {
  return mSurfaceAllocationSize;
}

bool GaussianBlur::Spread(uint8_t* aData, int32_t aStride, const IntSize& aSize,
                          SurfaceFormat aFormat) const {
  size_t bufSize = BufferSizeFromStrideAndHeight(aStride, aSize.height);
  if (!bufSize) {
    return false;
  }
  uint8_t* tmpData = (uint8_t*)calloc(1, bufSize);
  if (!tmpData) {
    return false;
  }
  if (aFormat == SurfaceFormat::A8) {
    SpreadHorizontal(aData, tmpData, mSpreadRadius.width, aSize.width,
                     aSize.height, aStride, mSkipRect);
    SpreadVertical(tmpData, aData, mSpreadRadius.height, aSize.width,
                   aSize.height, aStride, mSkipRect);
  } else {
    uint32_t* data32 = reinterpret_cast<uint32_t*>(aData);
    uint32_t* tmpData32 = reinterpret_cast<uint32_t*>(tmpData);
    int32_t stride32 = aStride / sizeof(uint32_t);
    SpreadHorizontal(data32, tmpData32, mSpreadRadius.width, aSize.width,
                     aSize.height, stride32, mSkipRect);
    SpreadVertical(tmpData32, data32, mSpreadRadius.height, aSize.width,
                   aSize.height, stride32, mSkipRect);
  }
  free(tmpData);
  return true;
}

void GaussianBlur::Blur(uint8_t* aData, int32_t aStride, const IntSize& aSize,
                        SurfaceFormat aFormat) const {
  if (!aData || aStride <= 0) {
    return;
  }
  if (aFormat == SurfaceFormat::UNKNOWN) {
    aFormat = mFormat;
    if (aFormat == SurfaceFormat::UNKNOWN) {
      return;
    }
  }
  if (mBlurRadius.width > 0 || mBlurRadius.height > 0 ||
      mSpreadRadius.width > 0 || mSpreadRadius.height > 0) {
    if (sk_sp<SkSurface> surface = SkSurfaces::WrapPixels(
            MakeSkiaImageInfo(aSize, aFormat), aData, aStride)) {
      BlurSkSurface(surface.get());
    }
  }
}

bool GaussianBlur::BlurSkSurface(SkSurface* aSurface) const {
  IntSize size(aSurface->width(), aSurface->height());
  MOZ_ASSERT(mRect.IsEmpty() || size == mRect.Size());
  SkCanvas* canvas = aSurface->getCanvas();
  if (!canvas) {
    return false;
  }

  if (mSpreadRadius.width > 0 || mSpreadRadius.height > 0) {
    SkImageInfo info;
    size_t rowBytes = 0;
    uint8_t* pixels = (uint8_t*)canvas->accessTopLayerPixels(&info, &rowBytes);
    if (!pixels ||
        !Spread(pixels, rowBytes, IntSize(info.width(), info.height()),
                SkiaColorTypeToGfxFormat(info.colorType()))) {
      return false;
    }
  }

  if (mBlurRadius.width <= 0 && mBlurRadius.height <= 0) {
    return true;
  }

  sk_sp<SkImage> snapshot = aSurface->makeImageSnapshot();
  if (!snapshot) {
    return false;
  }
  canvas->save();
  canvas->resetMatrix();
  SkPaint blurPaint;
  blurPaint.setBlendMode(SkBlendMode::kSrc);
  sk_sp<SkImageFilter> blurFilter(SkImageFilters::Blur(
      mBlurSigma.x, mBlurSigma.y,
      mClamp ? SkTileMode::kClamp : SkTileMode::kDecal, nullptr));
  blurPaint.setImageFilter(blurFilter);
  SkSamplingOptions sampling(SkFilterMode::kNearest);
  auto constraint = SkCanvas::kFast_SrcRectConstraint;
  if (mSkipRect.IsEmpty()) {
    canvas->drawImage(snapshot, 0, 0, sampling, &blurPaint);
  } else {
    SkRect top = SkRect::MakeIWH(size.width, size.height);
    if (top.intersect(SkRect::MakeLTRB(0, 0, size.width, mSkipRect.y))) {
      canvas->drawImageRect(snapshot, top, top, sampling, &blurPaint,
                            constraint);
    }
    SkRect left = SkRect::MakeIWH(size.width, size.height);
    if (left.intersect(
            SkRect::MakeLTRB(0, mSkipRect.y, mSkipRect.x, mSkipRect.YMost()))) {
      canvas->drawImageRect(snapshot, left, left, sampling, &blurPaint,
                            constraint);
    }
    SkRect right = SkRect::MakeIWH(size.width, size.height);
    if (right.intersect(SkRect::MakeLTRB(mSkipRect.XMost(), mSkipRect.y,
                                         size.width, mSkipRect.YMost()))) {
      canvas->drawImageRect(snapshot, right, right, sampling, &blurPaint,
                            constraint);
    }
    SkRect bottom = SkRect::MakeIWH(size.width, size.height);
    if (bottom.intersect(
            SkRect::MakeLTRB(0, mSkipRect.YMost(), size.width, size.height))) {
      canvas->drawImageRect(snapshot, bottom, bottom, sampling, &blurPaint,
                            constraint);
    }
  }
  canvas->restore();
  return true;
}

/**
 * Compute the box blur size (which we're calling the blur radius) from
 * the standard deviation.
 *
 * Much of this, the 3 * sqrt(2 * pi) / 4, is the known value for
 * approximating a Gaussian using box blurs.  This yields quite a good
 * approximation for a Gaussian.  Then we multiply this by 1.5 since our
 * code wants the radius of the entire triple-box-blur kernel instead of
 * the diameter of an individual box blur.  For more details, see:
 *   http://www.w3.org/TR/SVG11/filters.html#feGaussianBlurElement
 *   https://bugzilla.mozilla.org/show_bug.cgi?id=590039#c19
 */
constexpr double sqrt_2_PI = 0x1.40d931ff62705p+1;  // sqrt is not constexpr
static constexpr Float GAUSSIAN_SCALE_FACTOR = Float((3 * sqrt_2_PI / 4) * 1.5);

IntSize GaussianBlur::CalculateBlurRadius(const Point& aStd) {
  IntSize size(
      static_cast<int32_t>(floor(aStd.x * GAUSSIAN_SCALE_FACTOR + 0.5f)),
      static_cast<int32_t>(floor(aStd.y * GAUSSIAN_SCALE_FACTOR + 0.5f)));

  return size;
}

Float GaussianBlur::CalculateBlurSigma(int32_t aBlurRadius) {
  return aBlurRadius / GAUSSIAN_SCALE_FACTOR;
}

}  // namespace gfx
}  // namespace mozilla
