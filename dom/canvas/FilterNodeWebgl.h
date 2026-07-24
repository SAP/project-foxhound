/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MOZILLA_GFX_FILTERNODEWEBGL_H_
#define MOZILLA_GFX_FILTERNODEWEBGL_H_

#include <vector>

#include "mozilla/gfx/Filters.h"
#include "mozilla/gfx/PatternHelpers.h"

namespace mozilla::gfx {

class DrawTargetWebgl;
class FilterNodeSoftware;

/**
 * FilterNodeWebgl wraps a FilterNodeSoftware for most operations that
 * are not yet accelerated. To provide acceleration, this must be subclassed
 * to override an optimized implementation for particular operations.
 */
class FilterNodeWebgl : public FilterNode {
 public:
  ~FilterNodeWebgl() override;

  FilterBackend GetBackendType() override { return FILTER_BACKEND_WEBGL; }

  FilterType GetType() const { return mType; }

  bool ReserveInputIndex(uint32_t aIndex);
  bool SetInputAccel(uint32_t aIndex, SourceSurface* aSurface);
  bool SetInputSoftware(uint32_t aIndex, SourceSurface* aSurface);
  void SetInput(uint32_t aIndex, SourceSurface* aSurface) override;
  void SetInput(uint32_t aIndex, FilterNode* aFilter) override;
  void SetAttribute(uint32_t aIndex, bool) override;
  void SetAttribute(uint32_t aIndex, uint32_t) override;
  void SetAttribute(uint32_t aIndex, Float) override;
  void SetAttribute(uint32_t aIndex, const Size&) override;
  void SetAttribute(uint32_t aIndex, const IntSize&) override;
  void SetAttribute(uint32_t aIndex, const IntPoint&) override;
  void SetAttribute(uint32_t aIndex, const Rect&) override;
  void SetAttribute(uint32_t aIndex, const IntRect&) override;
  void SetAttribute(uint32_t aIndex, const Point&) override;
  void SetAttribute(uint32_t aIndex, const Matrix&) override;
  void SetAttribute(uint32_t aIndex, const Matrix5x4&) override;
  void SetAttribute(uint32_t aIndex, const Point3D&) override;
  void SetAttribute(uint32_t aIndex, const DeviceColor&) override;
  void SetAttribute(uint32_t aIndex, const Float* aValues,
                    uint32_t aSize) override;

  IntRect MapRectToSource(const IntRect& aRect, const IntRect& aMax,
                          FilterNode* aSourceNode) override;

  // Draw the root of a filter chain. Any filter drawing originates here.
  virtual void Draw(DrawTargetWebgl* aDT, const Rect& aSourceRect,
                    const Point& aDestPoint, const DrawOptions& aOptions,
                    FilterNodeWebgl* aParent = nullptr);
  // Speculatively draw part of a filter chain, only if it can be accelerated.
  // On success, it return true. Instead of falling back, nothing is drawn and
  // it returns false.
  virtual bool DrawAccel(DrawTargetWebgl* aDT, const Rect& aSourceRect,
                         const Point& aDestPoint, const DrawOptions& aOptions,
                         FilterNodeWebgl* aParent = nullptr) {
    return false;
  }
  // Draw a child filter and return a surface that can be processed by a parent
  // filter. This will try to accelerate the filter if possible, but implements
  // a fallback if not.
  virtual already_AddRefed<SourceSurface> DrawChild(
      FilterNodeWebgl* aParent, DrawTargetWebgl* aDT, const Rect& aSourceRect,
      const DrawOptions& aOptions, Point& aSurfaceOffset, DeviceColor& aColor);

  // This handles deferred filter inputs that should not be resolved to surfaces
  // until right before drawing. Accelerated filters must ensure they call this
  // to resolve these inputs before using them for drawing.
  virtual void ResolveInputs(DrawTargetWebgl* aDT, bool aAccel,
                             FilterNodeWebgl* aParent = nullptr) {}

  // Recursively resolve all inputs in the filter chain.
  void ResolveAllInputs(DrawTargetWebgl* aDT, FilterNodeWebgl* aParent);

 protected:
  std::vector<RefPtr<FilterNodeWebgl>> mInputFilters;
  std::vector<RefPtr<SourceSurface>> mInputSurfaces;
  uint32_t mInputMask = 0;
  FilterType mType;
  RefPtr<FilterNodeSoftware> mSoftwareFilter;

  friend class DrawTargetWebgl;

  explicit FilterNodeWebgl(FilterType aType);

  static already_AddRefed<FilterNodeWebgl> Create(FilterType aType);

  size_t NumberOfSetInputs() const {
    return std::max(mInputSurfaces.size(), mInputFilters.size());
  }

  virtual int32_t InputIndex(uint32_t aInputEnumIndex) const;

  IntRect MapInputRectToSource(uint32_t aInputEnumIndex, const IntRect& aRect,
                               const IntRect& aMax, FilterNode* aSourceNode);
};

class FilterNodeCropWebgl : public FilterNodeWebgl {
 public:
  FilterNodeCropWebgl() : FilterNodeWebgl(FilterType::CROP) {}

  void SetAttribute(uint32_t aIndex, const Rect& aValue) override;
  IntRect MapRectToSource(const IntRect& aRect, const IntRect& aMax,
                          FilterNode* aSourceNode) override;

  void Draw(DrawTargetWebgl* aDT, const Rect& aSourceRect,
            const Point& aDestPoint, const DrawOptions& aOptions,
            FilterNodeWebgl* aParent) override;
  bool DrawAccel(DrawTargetWebgl* aDT, const Rect& aSourceRect,
                 const Point& aDestPoint, const DrawOptions& aOptions,
                 FilterNodeWebgl* aParent) override;
  already_AddRefed<SourceSurface> DrawChild(FilterNodeWebgl* aParent,
                                            DrawTargetWebgl* aDT,
                                            const Rect& aSourceRect,
                                            const DrawOptions& aOptions,
                                            Point& aSurfaceOffset,
                                            DeviceColor& aColor) override;

 private:
  IntRect mCropRect;

  int32_t InputIndex(uint32_t aInputEnumIndex) const override;
};

class FilterNodeTransformWebgl : public FilterNodeWebgl {
 public:
  FilterNodeTransformWebgl() : FilterNodeWebgl(FilterType::TRANSFORM) {}

  void SetAttribute(uint32_t aIndex, uint32_t aValue) override;
  void SetAttribute(uint32_t aIndex, const Matrix& aValue) override;
  IntRect MapRectToSource(const IntRect& aRect, const IntRect& aMax,
                          FilterNode* aSourceNode) override;

  void Draw(DrawTargetWebgl* aDT, const Rect& aSourceRect,
            const Point& aDestPoint, const DrawOptions& aOptions,
            FilterNodeWebgl* aParent) override;
  already_AddRefed<SourceSurface> DrawChild(FilterNodeWebgl* aParent,
                                            DrawTargetWebgl* aDT,
                                            const Rect& aSourceRect,
                                            const DrawOptions& aOptions,
                                            Point& aSurfaceOffset,
                                            DeviceColor& aColor) override;

 protected:
  Matrix mMatrix;
  SamplingFilter mSamplingFilter = SamplingFilter::GOOD;

  int32_t InputIndex(uint32_t aInputEnumIndex) const override;
};

class FilterNodeDeferInputWebgl : public FilterNodeTransformWebgl {
 public:
  FilterNodeDeferInputWebgl(RefPtr<Path> aPath, const Pattern& aPattern,
                            const IntRect& aSourceRect,
                            const Matrix& aDestTransform,
                            const DrawOptions& aOptions,
                            const StrokeOptions* aStrokeOptions);

  void ResolveInputs(DrawTargetWebgl* aDT, bool aAccel,
                     FilterNodeWebgl* aParent) override;

  void Draw(DrawTargetWebgl* aDT, const Rect& aSourceRect,
            const Point& aDestPoint, const DrawOptions& aOptions,
            FilterNodeWebgl* aParent) override;
  already_AddRefed<SourceSurface> DrawChild(FilterNodeWebgl* aParent,
                                            DrawTargetWebgl* aDT,
                                            const Rect& aSourceRect,
                                            const DrawOptions& aOptions,
                                            Point& aSurfaceOffset,
                                            DeviceColor& aColor) override;

 private:
  RefPtr<Path> mPath;
  GeneralPattern mPattern;
  IntRect mSourceRect;
  Matrix mDestTransform;
  DrawOptions mOptions;
  Maybe<StrokeOptions> mStrokeOptions;
  UniquePtr<Float[]> mDashPatternStorage;
};

class FilterNodeGaussianBlurWebgl : public FilterNodeWebgl {
 public:
  FilterNodeGaussianBlurWebgl() : FilterNodeWebgl(FilterType::GAUSSIAN_BLUR) {}

  void SetAttribute(uint32_t aIndex, float aValue) override;
  IntRect MapRectToSource(const IntRect& aRect, const IntRect& aMax,
                          FilterNode* aSourceNode) override;

  void Draw(DrawTargetWebgl* aDT, const Rect& aSourceRect,
            const Point& aDestPoint, const DrawOptions& aOptions,
            FilterNodeWebgl* aParent) override;

 private:
  float mStdDeviation = 0;

  int32_t InputIndex(uint32_t aInputEnumIndex) const override;
};

class FilterNodeColorMatrixWebgl : public FilterNodeWebgl {
 public:
  FilterNodeColorMatrixWebgl() : FilterNodeWebgl(FilterType::COLOR_MATRIX) {}

  void SetAttribute(uint32_t aIndex, const Matrix5x4& aValue) override;
  void SetAttribute(uint32_t aIndex, uint32_t aValue) override;

  bool DrawAccel(DrawTargetWebgl* aDT, const Rect& aSourceRect,
                 const Point& aDestPoint, const DrawOptions& aOptions,
                 FilterNodeWebgl* aParent) override;

 protected:
  Matrix5x4 mMatrix;
  AlphaMode mAlphaMode;

  int32_t InputIndex(uint32_t aInputEnumIndex) const override;
};

class FilterNodeComponentTransferWebgl : public FilterNodeWebgl {
 public:
  explicit FilterNodeComponentTransferWebgl(FilterType aType)
      : FilterNodeWebgl(aType),
        mDisableR(true),
        mDisableG(true),
        mDisableB(true),
        mDisableA(true) {}

  void SetAttribute(uint32_t aIndex, bool aValue) override;

  bool DrawAccel(DrawTargetWebgl* aDT, const Rect& aSourceRect,
                 const Point& aDestPoint, const DrawOptions& aOptions,
                 FilterNodeWebgl* aParent) override;

  virtual bool ToColorMatrix(Matrix5x4& aMatrix) const { return false; }

 protected:
  bool mDisableR : 1;
  bool mDisableG : 1;
  bool mDisableB : 1;
  bool mDisableA : 1;

  int32_t InputIndex(uint32_t aInputEnumIndex) const override;
};

class FilterNodeLinearTransferWebgl : public FilterNodeComponentTransferWebgl {
 public:
  FilterNodeLinearTransferWebgl()
      : FilterNodeComponentTransferWebgl(FilterType::LINEAR_TRANSFER) {}

  using FilterNodeComponentTransferWebgl::SetAttribute;
  void SetAttribute(uint32_t aIndex, Float aValue) override;

  bool ToColorMatrix(Matrix5x4& aMatrix) const override;

 protected:
  DeviceColor mSlope;
  DeviceColor mIntercept;
};

class FilterNodeTableTransferWebgl : public FilterNodeComponentTransferWebgl {
 public:
  FilterNodeTableTransferWebgl()
      : FilterNodeComponentTransferWebgl(FilterType::TABLE_TRANSFER) {}

  using FilterNodeComponentTransferWebgl::SetAttribute;
  void SetAttribute(uint32_t aIndex, const Float* aValues,
                    uint32_t aSize) override;

  bool ToColorMatrix(Matrix5x4& aMatrix) const override;

 protected:
  std::vector<Float> mTableR;
  std::vector<Float> mTableG;
  std::vector<Float> mTableB;
  std::vector<Float> mTableA;
};

class FilterNodePremultiplyWebgl : public FilterNodeWebgl {
 public:
  FilterNodePremultiplyWebgl() : FilterNodeWebgl(FilterType::PREMULTIPLY) {}

  void Draw(DrawTargetWebgl* aDT, const Rect& aSourceRect,
            const Point& aDestPoint, const DrawOptions& aOptions,
            FilterNodeWebgl* aParent) override;

 protected:
  int32_t InputIndex(uint32_t aInputEnumIndex) const override;
};

class FilterNodeUnpremultiplyWebgl : public FilterNodeWebgl {
 public:
  FilterNodeUnpremultiplyWebgl() : FilterNodeWebgl(FilterType::UNPREMULTIPLY) {}

  already_AddRefed<SourceSurface> DrawChild(FilterNodeWebgl* aParent,
                                            DrawTargetWebgl* aDT,
                                            const Rect& aSourceRect,
                                            const DrawOptions& aOptions,
                                            Point& aSurfaceOffset,
                                            DeviceColor& aColor) override;

 protected:
  int32_t InputIndex(uint32_t aInputEnumIndex) const override;
};

class FilterNodeOpacityWebgl : public FilterNodeWebgl {
 public:
  FilterNodeOpacityWebgl() : FilterNodeWebgl(FilterType::OPACITY) {}

  void SetAttribute(uint32_t aIndex, Float aValue) override;

  void Draw(DrawTargetWebgl* aDT, const Rect& aSourceRect,
            const Point& aDestPoint, const DrawOptions& aOptions,
            FilterNodeWebgl* aParent) override;
  already_AddRefed<SourceSurface> DrawChild(FilterNodeWebgl* aParent,
                                            DrawTargetWebgl* aDT,
                                            const Rect& aSourceRect,
                                            const DrawOptions& aOptions,
                                            Point& aSurfaceOffset,
                                            DeviceColor& aColor) override;

 protected:
  Float mValue = 1.0f;

  int32_t InputIndex(uint32_t aInputEnumIndex) const override;
};

}  // namespace mozilla::gfx

#endif /* MOZILLA_GFX_FILTERNODEWEBGL_H_ */
