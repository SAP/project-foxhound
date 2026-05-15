/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "FilterNodeWebgl.h"

#include <limits>

#include "DrawTargetWebglInternal.h"
#include "SourceSurfaceWebgl.h"
#include "mozilla/PodOperations.h"
#include "mozilla/gfx/Blur.h"
#include "mozilla/gfx/DrawTargetSkia.h"
#include "mozilla/gfx/FilterNodeSoftware.h"
#include "mozilla/gfx/Helpers.h"
#include "mozilla/gfx/Logging.h"

namespace mozilla::gfx {

FilterNodeWebgl::FilterNodeWebgl(FilterType aType)
    : mType(aType),
      mSoftwareFilter(
          FilterNodeSoftware::Create(aType).downcast<FilterNodeSoftware>()) {}

FilterNodeWebgl::~FilterNodeWebgl() = default;

already_AddRefed<FilterNodeWebgl> FilterNodeWebgl::Create(FilterType aType) {
  RefPtr<FilterNodeWebgl> filter;
  switch (aType) {
    case FilterType::CROP:
      filter = new FilterNodeCropWebgl;
      break;
    case FilterType::TRANSFORM:
      filter = new FilterNodeTransformWebgl;
      break;
    case FilterType::GAUSSIAN_BLUR:
      filter = new FilterNodeGaussianBlurWebgl;
      break;
    case FilterType::PREMULTIPLY:
      filter = new FilterNodePremultiplyWebgl;
      break;
    case FilterType::UNPREMULTIPLY:
      filter = new FilterNodeUnpremultiplyWebgl;
      break;
    case FilterType::COLOR_MATRIX:
      filter = new FilterNodeColorMatrixWebgl;
      break;
    case FilterType::LINEAR_TRANSFER:
      filter = new FilterNodeLinearTransferWebgl;
      break;
    case FilterType::TABLE_TRANSFER:
      filter = new FilterNodeTableTransferWebgl;
      break;
    case FilterType::OPACITY:
      filter = new FilterNodeOpacityWebgl;
      break;
    default:
      filter = new FilterNodeWebgl(aType);
      break;
  }
  return filter.forget();
}

int32_t FilterNodeWebgl::InputIndex(uint32_t aInputEnumIndex) const {
  if (mSoftwareFilter) {
    return mSoftwareFilter->InputIndex(aInputEnumIndex);
  }
  return -1;
}

bool FilterNodeWebgl::ReserveInputIndex(uint32_t aIndex) {
  size_t inputIndex = aIndex;
  if (std::numeric_limits<size_t>::max() - inputIndex < 1) {
    return false;
  }
  if (mInputSurfaces.size() <= inputIndex) {
    mInputSurfaces.resize(inputIndex + 1);
  }
  if (mInputFilters.size() <= inputIndex) {
    mInputFilters.resize(inputIndex + 1);
  }
  return true;
}

bool FilterNodeWebgl::SetInputAccel(uint32_t aIndex, SourceSurface* aSurface) {
  if (ReserveInputIndex(aIndex)) {
    mInputSurfaces[aIndex] = aSurface;
    mInputFilters[aIndex] = nullptr;
    return true;
  }
  return false;
}

bool FilterNodeWebgl::SetInputSoftware(uint32_t aIndex,
                                       SourceSurface* aSurface) {
  if (mSoftwareFilter) {
    mSoftwareFilter->SetInput(aIndex, aSurface);
  }
  mInputMask |= (1 << aIndex);
  return true;
}

void FilterNodeWebgl::SetInput(uint32_t aIndex, SourceSurface* aSurface) {
  int32_t inputIndex = InputIndex(aIndex);
  if (inputIndex < 0 || !SetInputAccel(inputIndex, aSurface) ||
      !SetInputSoftware(inputIndex, aSurface)) {
    gfxDevCrash(LogReason::FilterInputSet) << "Invalid set " << inputIndex;
    return;
  }
}

void FilterNodeWebgl::SetInput(uint32_t aIndex, FilterNode* aFilter) {
  if (aFilter && aFilter->GetBackendType() != FILTER_BACKEND_WEBGL) {
    MOZ_ASSERT(false, "FilterNodeWebgl required as input");
    return;
  }

  int32_t inputIndex = InputIndex(aIndex);
  if (inputIndex < 0 || !ReserveInputIndex(inputIndex)) {
    gfxDevCrash(LogReason::FilterInputSet) << "Invalid set " << inputIndex;
    return;
  }

  auto* webglFilter = static_cast<FilterNodeWebgl*>(aFilter);
  mInputFilters[inputIndex] = webglFilter;
  mInputSurfaces[inputIndex] = nullptr;
  if (mSoftwareFilter) {
    MOZ_ASSERT(!webglFilter || webglFilter->mSoftwareFilter);
    mSoftwareFilter->SetInput(
        aIndex, webglFilter ? webglFilter->mSoftwareFilter.get() : nullptr);
  }
}

void FilterNodeWebgl::SetAttribute(uint32_t aIndex, bool aValue) {
  if (mSoftwareFilter) {
    mSoftwareFilter->SetAttribute(aIndex, aValue);
  }
}

void FilterNodeWebgl::SetAttribute(uint32_t aIndex, uint32_t aValue) {
  if (mSoftwareFilter) {
    mSoftwareFilter->SetAttribute(aIndex, aValue);
  }
}

void FilterNodeWebgl::SetAttribute(uint32_t aIndex, Float aValue) {
  if (mSoftwareFilter) {
    mSoftwareFilter->SetAttribute(aIndex, aValue);
  }
}

void FilterNodeWebgl::SetAttribute(uint32_t aIndex, const Size& aValue) {
  if (mSoftwareFilter) {
    mSoftwareFilter->SetAttribute(aIndex, aValue);
  }
}

void FilterNodeWebgl::SetAttribute(uint32_t aIndex, const IntSize& aValue) {
  if (mSoftwareFilter) {
    mSoftwareFilter->SetAttribute(aIndex, aValue);
  }
}

void FilterNodeWebgl::SetAttribute(uint32_t aIndex, const IntPoint& aValue) {
  if (mSoftwareFilter) {
    mSoftwareFilter->SetAttribute(aIndex, aValue);
  }
}

void FilterNodeWebgl::SetAttribute(uint32_t aIndex, const Rect& aValue) {
  if (mSoftwareFilter) {
    mSoftwareFilter->SetAttribute(aIndex, aValue);
  }
}

void FilterNodeWebgl::SetAttribute(uint32_t aIndex, const IntRect& aValue) {
  if (mSoftwareFilter) {
    mSoftwareFilter->SetAttribute(aIndex, aValue);
  }
}

void FilterNodeWebgl::SetAttribute(uint32_t aIndex, const Point& aValue) {
  if (mSoftwareFilter) {
    mSoftwareFilter->SetAttribute(aIndex, aValue);
  }
}

void FilterNodeWebgl::SetAttribute(uint32_t aIndex, const Matrix& aValue) {
  if (mSoftwareFilter) {
    mSoftwareFilter->SetAttribute(aIndex, aValue);
  }
}

void FilterNodeWebgl::SetAttribute(uint32_t aIndex, const Matrix5x4& aValue) {
  if (mSoftwareFilter) {
    mSoftwareFilter->SetAttribute(aIndex, aValue);
  }
}

void FilterNodeWebgl::SetAttribute(uint32_t aIndex, const Point3D& aValue) {
  if (mSoftwareFilter) {
    mSoftwareFilter->SetAttribute(aIndex, aValue);
  }
}

void FilterNodeWebgl::SetAttribute(uint32_t aIndex, const DeviceColor& aValue) {
  if (mSoftwareFilter) {
    mSoftwareFilter->SetAttribute(aIndex, aValue);
  }
}

void FilterNodeWebgl::SetAttribute(uint32_t aIndex, const Float* aValues,
                                   uint32_t aSize) {
  if (mSoftwareFilter) {
    mSoftwareFilter->SetAttribute(aIndex, aValues, aSize);
  }
}

IntRect FilterNodeWebgl::MapRectToSource(const IntRect& aRect,
                                         const IntRect& aMax,
                                         FilterNode* aSourceNode) {
  if (mSoftwareFilter) {
    if (aSourceNode && aSourceNode->GetBackendType() == FILTER_BACKEND_WEBGL) {
      aSourceNode = static_cast<FilterNodeWebgl*>(aSourceNode)->mSoftwareFilter;
    }
    return mSoftwareFilter->MapRectToSource(aRect, aMax, aSourceNode);
  }
  return aMax;
}

void FilterNodeWebgl::Draw(DrawTargetWebgl* aDT, const Rect& aSourceRect,
                           const Point& aDestPoint, const DrawOptions& aOptions,
                           FilterNodeWebgl* aParent) {
  ResolveAllInputs(aDT, aParent);

  MOZ_ASSERT(mSoftwareFilter);
  aDT->DrawFilterFallback(mSoftwareFilter, aSourceRect, aDestPoint, aOptions);
}

already_AddRefed<SourceSurface> FilterNodeWebgl::DrawChild(
    FilterNodeWebgl* aParent, DrawTargetWebgl* aDT, const Rect& aSourceRect,
    const DrawOptions& aOptions, Point& aSurfaceOffset, DeviceColor& aColor) {
  ResolveAllInputs(aDT, aParent);

  MOZ_ASSERT(mSoftwareFilter);
  RefPtr<DrawTarget> swDT = aDT->mSkia->CreateSimilarDrawTarget(
      IntSize::Ceil(aSourceRect.Size()), aDT->GetFormat());
  if (!swDT) {
    return nullptr;
  }
  swDT->DrawFilter(mSoftwareFilter, aSourceRect, Point(0, 0), aOptions);
  aSurfaceOffset = aSourceRect.TopLeft();
  aColor = DeviceColor(1, 1, 1, 1);
  return swDT->Snapshot();
}

IntRect FilterNodeWebgl::MapInputRectToSource(uint32_t aInputEnumIndex,
                                              const IntRect& aRect,
                                              const IntRect& aMax,
                                              FilterNode* aSourceNode) {
  int32_t inputIndex = InputIndex(aInputEnumIndex);
  if (inputIndex < 0) {
    gfxDevCrash(LogReason::FilterInputError)
        << "Invalid input " << inputIndex << " vs. " << NumberOfSetInputs();
    return aMax;
  }
  if ((uint32_t)inputIndex < NumberOfSetInputs()) {
    if (RefPtr<FilterNodeWebgl> filter = mInputFilters[inputIndex]) {
      return filter->MapRectToSource(aRect, aMax, aSourceNode);
    }
  }
  if (this == aSourceNode) {
    return aRect;
  }
  return IntRect();
}

void FilterNodeWebgl::ResolveAllInputs(DrawTargetWebgl* aDT,
                                       FilterNodeWebgl* aParent) {
  ResolveInputs(aDT, false, aParent);
  for (const auto& filter : mInputFilters) {
    if (filter) {
      filter->ResolveAllInputs(aDT, this);
    }
  }
}

int32_t FilterNodeCropWebgl::InputIndex(uint32_t aInputEnumIndex) const {
  switch (aInputEnumIndex) {
    case IN_CROP_IN:
      return 0;
    default:
      return -1;
  }
}

void FilterNodeCropWebgl::SetAttribute(uint32_t aIndex, const Rect& aValue) {
  MOZ_ASSERT(aIndex == ATT_CROP_RECT);
  Rect srcRect = aValue;
  srcRect.Round();
  if (!srcRect.ToIntRect(&mCropRect)) {
    mCropRect = IntRect();
  }
  FilterNodeWebgl::SetAttribute(aIndex, aValue);
}

IntRect FilterNodeCropWebgl::MapRectToSource(const IntRect& aRect,
                                             const IntRect& aMax,
                                             FilterNode* aSourceNode) {
  return MapInputRectToSource(IN_CROP_IN, aRect.Intersect(mCropRect), aMax,
                              aSourceNode);
}

void FilterNodeCropWebgl::Draw(DrawTargetWebgl* aDT, const Rect& aSourceRect,
                               const Point& aDestPoint,
                               const DrawOptions& aOptions,
                               FilterNodeWebgl* aParent) {
  ResolveInputs(aDT, true, aParent);

  uint32_t inputIdx = InputIndex(IN_CROP_IN);
  if (inputIdx < NumberOfSetInputs()) {
    Rect croppedSource = aSourceRect.Intersect(Rect(mCropRect));
    if (RefPtr<FilterNodeWebgl> filter = mInputFilters[inputIdx]) {
      filter->Draw(aDT, croppedSource,
                   aDestPoint + croppedSource.TopLeft() - aSourceRect.TopLeft(),
                   aOptions, this);
    } else if (RefPtr<SourceSurface> surface = mInputSurfaces[inputIdx]) {
      aDT->DrawSurface(surface,
                       croppedSource - aSourceRect.TopLeft() + aDestPoint,
                       croppedSource, DrawSurfaceOptions(), aOptions);
    }
  }
}

bool FilterNodeCropWebgl::DrawAccel(DrawTargetWebgl* aDT,
                                    const Rect& aSourceRect,
                                    const Point& aDestPoint,
                                    const DrawOptions& aOptions,
                                    FilterNodeWebgl* aParent) {
  uint32_t inputIdx = InputIndex(IN_CROP_IN);
  if (inputIdx < NumberOfSetInputs() && mInputFilters[inputIdx]) {
    Rect croppedSource = aSourceRect.Intersect(Rect(mCropRect));
    FilterNodeWebgl* filter = mInputFilters[inputIdx];
    switch (filter->GetType()) {
      case FilterType::COLOR_MATRIX:
      case FilterType::LINEAR_TRANSFER:
      case FilterType::TABLE_TRANSFER:
        // Crop filters are sometimes generated before evaluating a color matrix
        // filter.
        return filter->DrawAccel(
            aDT, croppedSource,
            aDestPoint + croppedSource.TopLeft() - aSourceRect.TopLeft(),
            aOptions, this);
      default:
        break;
    }
  }
  return false;
}

already_AddRefed<SourceSurface> FilterNodeCropWebgl::DrawChild(
    FilterNodeWebgl* aParent, DrawTargetWebgl* aDT, const Rect& aSourceRect,
    const DrawOptions& aOptions, Point& aSurfaceOffset, DeviceColor& aColor) {
  ResolveInputs(aDT, true, aParent);

  uint32_t inputIdx = InputIndex(IN_CROP_IN);
  if (inputIdx < NumberOfSetInputs()) {
    if (RefPtr<FilterNodeWebgl> filter = mInputFilters[inputIdx]) {
      Rect croppedSource = aSourceRect.Intersect(Rect(mCropRect));
      return filter->DrawChild(this, aDT, croppedSource, aOptions,
                               aSurfaceOffset, aColor);
    }
    return FilterNodeWebgl::DrawChild(aParent, aDT, aSourceRect, aOptions,
                                      aSurfaceOffset, aColor);
  }
  return nullptr;
}

int32_t FilterNodeTransformWebgl::InputIndex(uint32_t aInputEnumIndex) const {
  switch (aInputEnumIndex) {
    case IN_TRANSFORM_IN:
      return 0;
    default:
      return -1;
  }
}

void FilterNodeTransformWebgl::SetAttribute(uint32_t aIndex, uint32_t aValue) {
  MOZ_ASSERT(aIndex == ATT_TRANSFORM_FILTER);
  mSamplingFilter = static_cast<SamplingFilter>(aValue);
  FilterNodeWebgl::SetAttribute(aIndex, aValue);
}

void FilterNodeTransformWebgl::SetAttribute(uint32_t aIndex,
                                            const Matrix& aValue) {
  MOZ_ASSERT(aIndex == ATT_TRANSFORM_MATRIX);
  mMatrix = aValue;
  FilterNodeWebgl::SetAttribute(aIndex, aValue);
}

IntRect FilterNodeTransformWebgl::MapRectToSource(const IntRect& aRect,
                                                  const IntRect& aMax,
                                                  FilterNode* aSourceNode) {
  if (aRect.IsEmpty()) {
    return IntRect();
  }
  Matrix inv(mMatrix);
  if (!inv.Invert()) {
    return aMax;
  }
  Rect rect = inv.TransformBounds(Rect(aRect));
  rect.RoundOut();
  IntRect intRect;
  if (!rect.ToIntRect(&intRect)) {
    return aMax;
  }
  return MapInputRectToSource(IN_TRANSFORM_IN, intRect, aMax, aSourceNode);
}

void FilterNodeTransformWebgl::Draw(DrawTargetWebgl* aDT,
                                    const Rect& aSourceRect,
                                    const Point& aDestPoint,
                                    const DrawOptions& aOptions,
                                    FilterNodeWebgl* aParent) {
  if (!mMatrix.IsTranslation()) {
    FilterNodeWebgl::Draw(aDT, aSourceRect, aDestPoint, aOptions, aParent);
    return;
  }

  ResolveInputs(aDT, true, aParent);

  uint32_t inputIdx = InputIndex(IN_TRANSFORM_IN);
  if (inputIdx < NumberOfSetInputs()) {
    if (RefPtr<FilterNodeWebgl> filter = mInputFilters[inputIdx]) {
      filter->Draw(aDT, aSourceRect - mMatrix.GetTranslation(), aDestPoint,
                   aOptions, aParent);
    } else if (RefPtr<SourceSurface> surface = mInputSurfaces[inputIdx]) {
      aDT->DrawSurface(surface, Rect(aDestPoint, aSourceRect.Size()),
                       aSourceRect - mMatrix.GetTranslation(),
                       DrawSurfaceOptions(mSamplingFilter), aOptions);
    }
  }
}

already_AddRefed<SourceSurface> FilterNodeTransformWebgl::DrawChild(
    FilterNodeWebgl* aParent, DrawTargetWebgl* aDT, const Rect& aSourceRect,
    const DrawOptions& aOptions, Point& aSurfaceOffset, DeviceColor& aColor) {
  if (!mMatrix.IsIntegerTranslation()) {
    return FilterNodeWebgl::DrawChild(aParent, aDT, aSourceRect, aOptions,
                                      aSurfaceOffset, aColor);
  }

  ResolveInputs(aDT, true, aParent);

  uint32_t inputIdx = InputIndex(IN_TRANSFORM_IN);
  if (inputIdx < NumberOfSetInputs()) {
    if (RefPtr<SourceSurface> surface = mInputSurfaces[inputIdx]) {
      aSurfaceOffset = mMatrix.GetTranslation().Round();
      aColor = DeviceColor(1, 1, 1, aOptions.mAlpha);
      return surface.forget();
    }
    return FilterNodeWebgl::DrawChild(aParent, aDT, aSourceRect, aOptions,
                                      aSurfaceOffset, aColor);
  }
  return nullptr;
}

FilterNodeDeferInputWebgl::FilterNodeDeferInputWebgl(
    RefPtr<Path> aPath, const Pattern& aPattern, const IntRect& aSourceRect,
    const Matrix& aDestTransform, const DrawOptions& aOptions,
    const StrokeOptions* aStrokeOptions)
    : mPath(std::move(aPath)),
      mSourceRect(aSourceRect),
      mDestTransform(aDestTransform),
      mOptions(aOptions) {
  mPattern.Init(aPattern);
  if (aStrokeOptions) {
    mStrokeOptions = Some(*aStrokeOptions);
    if (aStrokeOptions->mDashLength > 0) {
      mDashPatternStorage.reset(new Float[aStrokeOptions->mDashLength]);
      PodCopy(mDashPatternStorage.get(), aStrokeOptions->mDashPattern,
              aStrokeOptions->mDashLength);
      mStrokeOptions->mDashPattern = mDashPatternStorage.get();
    }
  }
  SetAttribute(ATT_TRANSFORM_MATRIX,
               Matrix::Translation(mSourceRect.TopLeft()));
}

void FilterNodeDeferInputWebgl::ResolveInputs(DrawTargetWebgl* aDT, bool aAccel,
                                              FilterNodeWebgl* aParent) {
  uint32_t inputIdx = InputIndex(IN_TRANSFORM_IN);
  bool hasAccel = false;
  if (inputIdx < NumberOfSetInputs() && mInputSurfaces[inputIdx]) {
    if (aAccel || (mInputMask & (1 << inputIdx))) {
      return;
    }
    hasAccel = true;
  }
  RefPtr<SourceSurface> surface;
  SurfaceFormat format = SurfaceFormat::B8G8R8A8;
  static const ColorPattern maskPattern(DeviceColor(1, 1, 1, 1));
  const Pattern* pattern = mPattern.GetPattern();
  if (aAccel) {
    // If using acceleration on a color pattern, attempt to blur solely on the
    // alpha values to significantly reduce data churn, as the color will only
    // vary linearly with alpha over the input surface. The color will be
    // incorporated on the final mask draw.
    if (mPattern.GetPattern()->GetType() == PatternType::COLOR) {
      format = SurfaceFormat::A8;
      pattern = &maskPattern;
    }
    surface = aDT->ResolveFilterInputAccel(
        mPath, *pattern, mSourceRect, mDestTransform, mOptions,
        mStrokeOptions.ptrOr(nullptr), format);
  }
  if (!surface) {
    surface = aDT->mSkia->ResolveFilterInput(
        mPath, *pattern, mSourceRect, mDestTransform, mOptions,
        mStrokeOptions.ptrOr(nullptr), format);
  }
  if (hasAccel) {
    SetInputSoftware(inputIdx, surface);
  } else if (surface && surface->GetFormat() == SurfaceFormat::A8) {
    SetInputAccel(inputIdx, surface);
  } else {
    SetInput(inputIdx, surface);
  }
}

void FilterNodeDeferInputWebgl::Draw(DrawTargetWebgl* aDT,
                                     const Rect& aSourceRect,
                                     const Point& aDestPoint,
                                     const DrawOptions& aOptions,
                                     FilterNodeWebgl* aParent) {
  const Pattern* pattern = mPattern.GetPattern();
  AutoRestoreTransform restore(aDT);
  aDT->PushClipRect(Rect(aDestPoint, aSourceRect.Size()));
  aDT->ConcatTransform(
      Matrix(mDestTransform).PostTranslate(aDestPoint - aSourceRect.TopLeft()));
  DrawOptions options(aOptions.mAlpha * mOptions.mAlpha,
                      aOptions.mCompositionOp, mOptions.mAntialiasMode);
  if (mStrokeOptions) {
    aDT->Stroke(mPath, *pattern, *mStrokeOptions, options);
  } else {
    aDT->Fill(mPath, *pattern, options);
  }
  aDT->PopClip();
}

already_AddRefed<SourceSurface> FilterNodeDeferInputWebgl::DrawChild(
    FilterNodeWebgl* aParent, DrawTargetWebgl* aDT, const Rect& aSourceRect,
    const DrawOptions& aOptions, Point& aSurfaceOffset, DeviceColor& aColor) {
  ResolveInputs(aDT, true, aParent);

  uint32_t inputIdx = InputIndex(IN_TRANSFORM_IN);
  if (inputIdx < NumberOfSetInputs()) {
    if (RefPtr<SourceSurface> surface = mInputSurfaces[inputIdx]) {
      aSurfaceOffset = mMatrix.GetTranslation().Round();
      // If the output will be a mask, then supply the color that should be
      // rendered with it.
      aColor =
          mPattern.GetPattern()->GetType() == PatternType::COLOR
              ? static_cast<const ColorPattern*>(mPattern.GetPattern())->mColor
              : DeviceColor(1, 1, 1, 1);
      aColor.a *= aOptions.mAlpha;
      return surface.forget();
    }
    return FilterNodeWebgl::DrawChild(aParent, aDT, aSourceRect, aOptions,
                                      aSurfaceOffset, aColor);
  }
  return nullptr;
}

int32_t FilterNodeGaussianBlurWebgl::InputIndex(
    uint32_t aInputEnumIndex) const {
  switch (aInputEnumIndex) {
    case IN_GAUSSIAN_BLUR_IN:
      return 0;
    default:
      return -1;
  }
}

void FilterNodeGaussianBlurWebgl::SetAttribute(uint32_t aIndex, float aValue) {
  MOZ_ASSERT(aIndex == ATT_GAUSSIAN_BLUR_STD_DEVIATION);
  // Match the FilterNodeSoftware blur limit.
  mStdDeviation = std::clamp(aValue, 0.0f, 100.0f);
  FilterNodeWebgl::SetAttribute(aIndex, aValue);
}

IntRect FilterNodeGaussianBlurWebgl::MapRectToSource(const IntRect& aRect,
                                                     const IntRect& aMax,
                                                     FilterNode* aSourceNode) {
  return MapInputRectToSource(IN_GAUSSIAN_BLUR_IN, aRect, aMax, aSourceNode);
}

void FilterNodeGaussianBlurWebgl::Draw(DrawTargetWebgl* aDT,
                                       const Rect& aSourceRect,
                                       const Point& aDestPoint,
                                       const DrawOptions& aOptions,
                                       FilterNodeWebgl* aParent) {
  ResolveInputs(aDT, true, aParent);

  uint32_t inputIdx = InputIndex(IN_GAUSSIAN_BLUR_IN);
  if (inputIdx < NumberOfSetInputs()) {
    bool success = false;
    Point surfaceOffset;
    DeviceColor color(1, 1, 1, 1);
    if (RefPtr<SourceSurface> surface =
            mInputFilters[inputIdx] ? mInputFilters[inputIdx]->DrawChild(
                                          this, aDT, aSourceRect, DrawOptions(),
                                          surfaceOffset, color)
                                    : mInputSurfaces[inputIdx]) {
      aDT->PushClipRect(Rect(aDestPoint, aSourceRect.Size()));
      IntRect surfRect = RoundedOut(
          Rect(surface->GetRect()).Intersect(aSourceRect - surfaceOffset));
      Point destOffset = aDestPoint + Point(surfRect.TopLeft()) +
                         surfaceOffset - aSourceRect.TopLeft();
      success = surfRect.IsEmpty() ||
                aDT->BlurSurface(mStdDeviation, surface, surfRect, destOffset,
                                 aOptions, color);
      aDT->PopClip();
    }
    if (!success) {
      FilterNodeWebgl::Draw(aDT, aSourceRect, aDestPoint, aOptions, aParent);
    }
  }
}

void FilterNodeColorMatrixWebgl::SetAttribute(uint32_t aIndex,
                                              const Matrix5x4& aValue) {
  MOZ_ASSERT(aIndex == ATT_COLOR_MATRIX_MATRIX);
  mMatrix = aValue;
  FilterNodeWebgl::SetAttribute(aIndex, aValue);
}

void FilterNodeColorMatrixWebgl::SetAttribute(uint32_t aIndex,
                                              uint32_t aValue) {
  MOZ_ASSERT(aIndex == ATT_COLOR_MATRIX_ALPHA_MODE);
  mAlphaMode = (AlphaMode)aValue;
  FilterNodeWebgl::SetAttribute(aIndex, aValue);
}

int32_t FilterNodeColorMatrixWebgl::InputIndex(uint32_t aInputEnumIndex) const {
  switch (aInputEnumIndex) {
    case IN_COLOR_MATRIX_IN:
      return 0;
    default:
      return -1;
  }
}

static bool DrawColorMatrixFilter(DrawTargetWebgl* aDT, const Point& aDestPoint,
                                  const DrawOptions& aOptions,
                                  const RefPtr<SourceSurface>& aSurface,
                                  const Rect& aSourceRect,
                                  const Point& aSurfaceOffset,
                                  const Matrix5x4& aMatrix,
                                  const DeviceColor& aColor) {
  IntRect surfRect = RoundedOut(
      Rect(aSurface->GetRect()).Intersect(aSourceRect - aSurfaceOffset));
  if (surfRect.IsEmpty()) {
    return true;
  }
  aDT->PushClipRect(Rect(aDestPoint, aSourceRect.Size()));
  Point destOffset = aDestPoint + Point(surfRect.TopLeft()) + aSurfaceOffset -
                     aSourceRect.TopLeft();
  bool success = true;
  if (aSurface->GetFormat() == SurfaceFormat::A8) {
    // Mask surfaces only use a solid color that is supplied outside the
    // surface. This color can be transformed without requiring a shader.
    Point4D outColor =
        Matrix4x4(aMatrix.components)
            .TransformPoint(Point4D(aColor.r, aColor.g, aColor.b, aColor.a)) +
        Point4D(aMatrix._51, aMatrix._52, aMatrix._53, aMatrix._54);
    SurfacePattern maskPattern(aSurface, ExtendMode::CLAMP,
                               Matrix::Translation(destOffset));
    if (!surfRect.IsEqualEdges(aSurface->GetRect())) {
      maskPattern.mSamplingRect = surfRect;
    }
    aDT->Mask(ColorPattern(
                  DeviceColor(outColor.x, outColor.y, outColor.z, outColor.w)),
              maskPattern, aOptions);
  } else {
    // For normal surfaces, try to use the color matrix filter shader.
    success =
        aDT->FilterSurface(aMatrix, aSurface, surfRect, destOffset, aOptions);
  }
  aDT->PopClip();
  return success;
}

bool FilterNodeColorMatrixWebgl::DrawAccel(DrawTargetWebgl* aDT,
                                           const Rect& aSourceRect,
                                           const Point& aDestPoint,
                                           const DrawOptions& aOptions,
                                           FilterNodeWebgl* aParent) {
  if (!aParent || mAlphaMode != ALPHA_MODE_STRAIGHT) {
    return false;
  }
  switch (aParent->GetType()) {
    case FilterType::PREMULTIPLY:
    case FilterType::CROP:
      break;
    default:
      return false;
  }

  ResolveInputs(aDT, true, aParent);

  uint32_t inputIdx = InputIndex(IN_COLOR_MATRIX_IN);
  if (inputIdx < NumberOfSetInputs() && mInputFilters[inputIdx]) {
    FilterNodeWebgl* filter = mInputFilters[inputIdx];
    if (filter->GetType() == FilterType::UNPREMULTIPLY) {
      bool success = false;
      Point surfaceOffset;
      DeviceColor color;
      if (RefPtr<SourceSurface> surface = filter->DrawChild(
              this, aDT, aSourceRect, DrawOptions(), surfaceOffset, color)) {
        success =
            DrawColorMatrixFilter(aDT, aDestPoint, aOptions, surface,
                                  aSourceRect, surfaceOffset, mMatrix, color);
      }
      return success;
    }
  }
  return false;
}

void FilterNodeComponentTransferWebgl::SetAttribute(uint32_t aIndex,
                                                    bool aValue) {
  switch (aIndex) {
    case ATT_TRANSFER_DISABLE_R:
      mDisableR = aValue;
      break;
    case ATT_TRANSFER_DISABLE_G:
      mDisableG = aValue;
      break;
    case ATT_TRANSFER_DISABLE_B:
      mDisableB = aValue;
      break;
    case ATT_TRANSFER_DISABLE_A:
      mDisableA = aValue;
      break;
    default:
      gfxDevCrash(LogReason::FilterInputError)
          << "FilterNodeComponentTransferWebgl: Invalid attribute " << aIndex;
      break;
  }
  FilterNodeWebgl::SetAttribute(aIndex, aValue);
}

int32_t FilterNodeComponentTransferWebgl::InputIndex(
    uint32_t aInputEnumIndex) const {
  switch (aInputEnumIndex) {
    case IN_TRANSFER_IN:
      return 0;
    default:
      return -1;
  }
}

bool FilterNodeComponentTransferWebgl::DrawAccel(DrawTargetWebgl* aDT,
                                                 const Rect& aSourceRect,
                                                 const Point& aDestPoint,
                                                 const DrawOptions& aOptions,
                                                 FilterNodeWebgl* aParent) {
  if (!aParent) {
    return false;
  }
  switch (aParent->GetType()) {
    case FilterType::PREMULTIPLY:
    case FilterType::CROP:
      break;
    default:
      return false;
  }

  Matrix5x4 mat5x4;
  if (!ToColorMatrix(mat5x4)) {
    return false;
  }

  ResolveInputs(aDT, true, aParent);

  uint32_t inputIdx = InputIndex(IN_TRANSFER_IN);
  if (inputIdx < NumberOfSetInputs() && mInputFilters[inputIdx]) {
    FilterNodeWebgl* filter = mInputFilters[inputIdx];
    if (filter->GetType() == FilterType::UNPREMULTIPLY) {
      bool success = false;
      Point surfaceOffset;
      DeviceColor color;
      if (RefPtr<SourceSurface> surface = filter->DrawChild(
              this, aDT, aSourceRect, DrawOptions(), surfaceOffset, color)) {
        success =
            DrawColorMatrixFilter(aDT, aDestPoint, aOptions, surface,
                                  aSourceRect, surfaceOffset, mat5x4, color);
      }
      return success;
    }
  }
  return false;
}

void FilterNodeLinearTransferWebgl::SetAttribute(uint32_t aIndex,
                                                 Float aValue) {
  switch (aIndex) {
    case ATT_LINEAR_TRANSFER_SLOPE_R:
      mSlope.r = aValue;
      break;
    case ATT_LINEAR_TRANSFER_INTERCEPT_R:
      mIntercept.r = aValue;
      break;
    case ATT_LINEAR_TRANSFER_SLOPE_G:
      mSlope.g = aValue;
      break;
    case ATT_LINEAR_TRANSFER_INTERCEPT_G:
      mIntercept.g = aValue;
      break;
    case ATT_LINEAR_TRANSFER_SLOPE_B:
      mSlope.b = aValue;
      break;
    case ATT_LINEAR_TRANSFER_INTERCEPT_B:
      mIntercept.b = aValue;
      break;
    case ATT_LINEAR_TRANSFER_SLOPE_A:
      mSlope.a = aValue;
      break;
    case ATT_LINEAR_TRANSFER_INTERCEPT_A:
      mIntercept.a = aValue;
      break;
    default:
      MOZ_ASSERT(false);
      break;
  }
  FilterNodeWebgl::SetAttribute(aIndex, aValue);
}

bool FilterNodeLinearTransferWebgl::ToColorMatrix(Matrix5x4& aMatrix) const {
  // Linear filters can be interpreted as a scale and translation matrix.
  aMatrix = Matrix5x4();
  if (!mDisableR) {
    aMatrix._11 = mSlope.r;
    aMatrix._51 = mIntercept.r;
  }
  if (!mDisableG) {
    aMatrix._22 = mSlope.g;
    aMatrix._52 = mIntercept.g;
  }
  if (!mDisableB) {
    aMatrix._33 = mSlope.b;
    aMatrix._53 = mIntercept.b;
  }
  if (!mDisableA) {
    aMatrix._44 = mSlope.a;
    aMatrix._54 = mIntercept.a;
  }
  return true;
}

void FilterNodeTableTransferWebgl::SetAttribute(uint32_t aIndex,
                                                const Float* aValues,
                                                uint32_t aSize) {
  std::vector<Float> table(aValues, aValues + aSize);
  switch (aIndex) {
    case ATT_TABLE_TRANSFER_TABLE_R:
      mTableR = table;
      break;
    case ATT_TABLE_TRANSFER_TABLE_G:
      mTableG = table;
      break;
    case ATT_TABLE_TRANSFER_TABLE_B:
      mTableB = table;
      break;
    case ATT_TABLE_TRANSFER_TABLE_A:
      mTableA = table;
      break;
    default:
      MOZ_ASSERT(false);
      break;
  }
  FilterNodeWebgl::SetAttribute(aIndex, aValues, aSize);
}

bool FilterNodeTableTransferWebgl::ToColorMatrix(Matrix5x4& aMatrix) const {
  // 2 element table transfers are effectively linear transfers. These can be
  // interpreted as a scale and translation matrix.
  if ((mDisableR || mTableR.size() == 2) &&
      (mDisableG || mTableG.size() == 2) &&
      (mDisableB || mTableB.size() == 2) &&
      (mDisableA || mTableA.size() == 2)) {
    aMatrix = Matrix5x4();
    if (!mDisableR) {
      aMatrix._11 = mTableR[1] - mTableR[0];
      aMatrix._51 = mTableR[0];
    }
    if (!mDisableG) {
      aMatrix._22 = mTableG[1] - mTableG[0];
      aMatrix._52 = mTableG[0];
    }
    if (!mDisableB) {
      aMatrix._33 = mTableB[1] - mTableB[0];
      aMatrix._53 = mTableB[0];
    }
    if (!mDisableA) {
      aMatrix._44 = mTableA[1] - mTableA[0];
      aMatrix._54 = mTableA[0];
    }
    return true;
  }
  return true;
}

int32_t FilterNodePremultiplyWebgl::InputIndex(uint32_t aInputEnumIndex) const {
  switch (aInputEnumIndex) {
    case IN_PREMULTIPLY_IN:
      return 0;
    default:
      return -1;
  }
}

void FilterNodePremultiplyWebgl::Draw(DrawTargetWebgl* aDT,
                                      const Rect& aSourceRect,
                                      const Point& aDestPoint,
                                      const DrawOptions& aOptions,
                                      FilterNodeWebgl* aParent) {
  uint32_t inputIdx = InputIndex(IN_PREMULTIPLY_IN);
  if (inputIdx < NumberOfSetInputs() && mInputFilters[inputIdx]) {
    FilterNodeWebgl* filter = mInputFilters[inputIdx];
    switch (filter->GetType()) {
      case FilterType::CROP:
      case FilterType::COLOR_MATRIX:
      case FilterType::LINEAR_TRANSFER:
      case FilterType::TABLE_TRANSFER:
        // For color matrix filters, they will normally be preceded by a premul
        // filter. In certain cases, after the premul there is a crop before the
        // color matrix filter is actually evaluated. Here, we use DrawAccel to
        // only handle the filter if it can actually be accelerated, otherwise
        // falling back to a software color matrix filter below.
        if (filter->DrawAccel(aDT, aSourceRect, aDestPoint, aOptions, this)) {
          return;
        }
        break;
      default:
        break;
    }
  }
  FilterNodeWebgl::Draw(aDT, aSourceRect, aDestPoint, aOptions, aParent);
}

int32_t FilterNodeUnpremultiplyWebgl::InputIndex(
    uint32_t aInputEnumIndex) const {
  switch (aInputEnumIndex) {
    case IN_UNPREMULTIPLY_IN:
      return 0;
    default:
      return -1;
  }
}

already_AddRefed<SourceSurface> FilterNodeUnpremultiplyWebgl::DrawChild(
    FilterNodeWebgl* aParent, DrawTargetWebgl* aDT, const Rect& aSourceRect,
    const DrawOptions& aOptions, Point& aSurfaceOffset, DeviceColor& aColor) {
  switch (aParent->GetType()) {
    case FilterType::COLOR_MATRIX:
    case FilterType::LINEAR_TRANSFER:
    case FilterType::TABLE_TRANSFER:
      // Unpremul should always be the child of a color matrix filter.
      break;
    default:
      return FilterNodeWebgl::DrawChild(aParent, aDT, aSourceRect, aOptions,
                                        aSurfaceOffset, aColor);
  }

  ResolveInputs(aDT, true, aParent);

  uint32_t inputIdx = InputIndex(IN_UNPREMULTIPLY_IN);
  if (inputIdx < NumberOfSetInputs()) {
    if (RefPtr<FilterNodeWebgl> filter = mInputFilters[inputIdx]) {
      if (RefPtr<SourceSurface> surface = filter->DrawChild(
              this, aDT, aSourceRect, aOptions, aSurfaceOffset, aColor)) {
        return surface.forget();
      }
    } else if (RefPtr<SourceSurface> surface = mInputSurfaces[inputIdx]) {
      aColor = DeviceColor(1, 1, 1, aOptions.mAlpha);
      return surface.forget();
    }
    return FilterNodeWebgl::DrawChild(aParent, aDT, aSourceRect, aOptions,
                                      aSurfaceOffset, aColor);
  }
  return nullptr;
}

int32_t FilterNodeOpacityWebgl::InputIndex(uint32_t aInputEnumIndex) const {
  switch (aInputEnumIndex) {
    case IN_OPACITY_IN:
      return 0;
    default:
      return -1;
  }
}

void FilterNodeOpacityWebgl::SetAttribute(uint32_t aIndex, Float aValue) {
  MOZ_ASSERT(aIndex == ATT_OPACITY_VALUE);
  mValue = aValue;
  FilterNodeWebgl::SetAttribute(aIndex, aValue);
}

void FilterNodeOpacityWebgl::Draw(DrawTargetWebgl* aDT, const Rect& aSourceRect,
                                  const Point& aDestPoint,
                                  const DrawOptions& aOptions,
                                  FilterNodeWebgl* aParent) {
  ResolveInputs(aDT, true, aParent);

  uint32_t inputIdx = InputIndex(IN_OPACITY_IN);
  if (inputIdx < NumberOfSetInputs()) {
    // Opacity filters need only modify the DrawOptions alpha value.
    DrawOptions options(aOptions);
    options.mAlpha *= mValue;
    if (RefPtr<FilterNodeWebgl> filter = mInputFilters[inputIdx]) {
      filter->Draw(aDT, aSourceRect, aDestPoint, options, this);
    } else if (RefPtr<SourceSurface> surface = mInputSurfaces[inputIdx]) {
      aDT->DrawSurface(surface, Rect(aDestPoint, aSourceRect.Size()),
                       aSourceRect, DrawSurfaceOptions(), options);
    }
  }
}

already_AddRefed<SourceSurface> FilterNodeOpacityWebgl::DrawChild(
    FilterNodeWebgl* aParent, DrawTargetWebgl* aDT, const Rect& aSourceRect,
    const DrawOptions& aOptions, Point& aSurfaceOffset, DeviceColor& aColor) {
  ResolveInputs(aDT, true, aParent);

  uint32_t inputIdx = InputIndex(IN_OPACITY_IN);
  if (inputIdx < NumberOfSetInputs()) {
    if (RefPtr<FilterNodeWebgl> filter = mInputFilters[inputIdx]) {
      // Opacity filters need only modify he DrawOptions alpha value.
      DrawOptions options(aOptions);
      options.mAlpha *= mValue;
      return filter->DrawChild(this, aDT, aSourceRect, options, aSurfaceOffset,
                               aColor);
    }
    return FilterNodeWebgl::DrawChild(aParent, aDT, aSourceRect, aOptions,
                                      aSurfaceOffset, aColor);
  }
  return nullptr;
}

}  // namespace mozilla::gfx
