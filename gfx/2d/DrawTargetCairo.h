/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MOZILLA_GFX_DRAWTARGET_CAIRO_H_
#define MOZILLA_GFX_DRAWTARGET_CAIRO_H_

#include "2D.h"
#include "cairo.h"
#include "PathCairo.h"

#include <vector>

namespace mozilla {
namespace gfx {

class SourceSurfaceCairo;

class GradientStopsCairo : public GradientStops {
 public:
  MOZ_DECLARE_REFCOUNTED_VIRTUAL_TYPENAME(GradientStopsCairo, override)

  GradientStopsCairo(GradientStop* aStops, uint32_t aNumStops,
                     ExtendMode aExtendMode)
      : mExtendMode(aExtendMode) {
    for (uint32_t i = 0; i < aNumStops; ++i) {
      mStops.push_back(aStops[i]);
    }
  }

  virtual ~GradientStopsCairo() = default;

  const std::vector<GradientStop>& GetStops() const { return mStops; }

  ExtendMode GetExtendMode() const { return mExtendMode; }

  BackendType GetBackendType() const override { return BackendType::CAIRO; }

 private:
  std::vector<GradientStop> mStops;
  ExtendMode mExtendMode;
};

class DrawTargetCairo final : public DrawTarget {
 public:
  MOZ_DECLARE_REFCOUNTED_VIRTUAL_TYPENAME(DrawTargetCairo, override)

  DrawTargetCairo();
  virtual ~DrawTargetCairo();

  bool IsValid() const override;
  DrawTargetType GetType() const override;
  BackendType GetBackendType() const override { return BackendType::CAIRO; }

  void Link(const char* aDest, const char* aURI, const Rect& aRect) override;
  void Destination(const char* aDestination, const Point& aPoint) override;

  already_AddRefed<SourceSurface> Snapshot() override;
  IntSize GetSize() const override;

  bool IsCurrentGroupOpaque() override;

  void SetPermitSubpixelAA(bool aPermitSubpixelAA) override;

  bool LockBits(uint8_t** aData, IntSize* aSize, int32_t* aStride,
                SurfaceFormat* aFormat, IntPoint* aOrigin = nullptr) override;
  void ReleaseBits(uint8_t* aData) override;

  void Flush() override;
  void DrawSurface(
      SourceSurface* aSurface, const Rect& aDest, const Rect& aSource,
      const DrawSurfaceOptions& aSurfOptions = DrawSurfaceOptions(),
      const DrawOptions& aOptions = DrawOptions()) override;
  void DrawFilter(FilterNode* aNode, const Rect& aSourceRect,
                  const Point& aDestPoint,
                  const DrawOptions& aOptions = DrawOptions()) override;
  void DrawSurfaceWithShadow(SourceSurface* aSurface, const Point& aDest,
                             const ShadowOptions& aShadow,
                             CompositionOp aOperator) override;

  void ClearRect(const Rect& aRect) override;

  void CopySurface(SourceSurface* aSurface, const IntRect& aSourceRect,
                   const IntPoint& aDestination) override;
  void CopyRect(const IntRect& aSourceRect,
                const IntPoint& aDestination) override;

  void FillRect(const Rect& aRect, const Pattern& aPattern,
                const DrawOptions& aOptions = DrawOptions()) override;
  void StrokeRect(const Rect& aRect, const Pattern& aPattern,
                  const StrokeOptions& aStrokeOptions = StrokeOptions(),
                  const DrawOptions& aOptions = DrawOptions()) override;
  void StrokeLine(const Point& aStart, const Point& aEnd,
                  const Pattern& aPattern,
                  const StrokeOptions& aStrokeOptions = StrokeOptions(),
                  const DrawOptions& aOptions = DrawOptions()) override;

  void Stroke(const Path* aPath, const Pattern& aPattern,
              const StrokeOptions& aStrokeOptions = StrokeOptions(),
              const DrawOptions& aOptions = DrawOptions()) override;

  void Fill(const Path* aPath, const Pattern& aPattern,
            const DrawOptions& aOptions = DrawOptions()) override;

  void FillGlyphs(ScaledFont* aFont, const GlyphBuffer& aBuffer,
                  const Pattern& aPattern,
                  const DrawOptions& aOptions) override;
  void Mask(const Pattern& aSource, const Pattern& aMask,
            const DrawOptions& aOptions = DrawOptions()) override;
  void MaskSurface(const Pattern& aSource, SourceSurface* aMask, Point aOffset,
                   const DrawOptions& aOptions = DrawOptions()) override;

  bool Draw3DTransformedSurface(SourceSurface* aSurface,
                                const Matrix4x4& aMatrix) override;

  void PushClip(const Path* aPath) override;
  void PushClipRect(const Rect& aRect) override;
  void PopClip() override;
  bool RemoveAllClips() override;
  void PushLayer(bool aOpaque, Float aOpacity, SourceSurface* aMask,
                 const Matrix& aMaskTransform,
                 const IntRect& aBounds = IntRect(),
                 bool aCopyBackground = false) override;
  void PushLayerWithBlend(bool aOpaque, Float aOpacity, SourceSurface* aMask,
                          const Matrix& aMaskTransform,
                          const IntRect& aBounds = IntRect(),
                          bool aCopyBackground = false,
                          CompositionOp = CompositionOp::OP_OVER) override;
  void PopLayer() override;

  already_AddRefed<PathBuilder> CreatePathBuilder(
      FillRule aFillRule = FillRule::FILL_WINDING) const override {
    return PathBuilderCairo::Create(aFillRule);
  }

  already_AddRefed<SourceSurface> CreateSourceSurfaceFromData(
      unsigned char* aData, const IntSize& aSize, int32_t aStride,
      SurfaceFormat aFormat) const override;
  already_AddRefed<SourceSurface> OptimizeSourceSurface(
      SourceSurface* aSurface) const override;
  already_AddRefed<SourceSurface> CreateSourceSurfaceFromNativeSurface(
      const NativeSurface& aSurface) const override;
  already_AddRefed<DrawTarget> CreateSimilarDrawTarget(
      const IntSize& aSize, SurfaceFormat aFormat) const override;
  already_AddRefed<DrawTarget> CreateShadowDrawTarget(
      const IntSize& aSize, SurfaceFormat aFormat, float aSigma) const override;
  RefPtr<DrawTarget> CreateClippedDrawTarget(const Rect& aBounds,
                                             SurfaceFormat aFormat) override;

  already_AddRefed<GradientStops> CreateGradientStops(
      GradientStop* aStops, uint32_t aNumStops,
      ExtendMode aExtendMode = ExtendMode::CLAMP) const override;

  already_AddRefed<FilterNode> CreateFilter(FilterType aType) override;

  void* GetNativeSurface(NativeSurfaceType aType) override;

  bool Init(cairo_surface_t* aSurface, const IntSize& aSize,
            SurfaceFormat* aFormat = nullptr);
  bool Init(const IntSize& aSize, SurfaceFormat aFormat);
  bool Init(unsigned char* aData, const IntSize& aSize, int32_t aStride,
            SurfaceFormat aFormat);

  void SetTransform(const Matrix& aTransform) override;

  void DetachAllSnapshots() override { MarkSnapshotIndependent(); }

  // Call to set up aContext for drawing (with the current transform, etc).
  // Pass the path you're going to be using if you have one.
  // Implicitly calls WillChange(aPath).
  void PrepareForDrawing(cairo_t* aContext, const Path* aPath = nullptr);

  static cairo_surface_t* GetDummySurface();

  // Cairo hardcodes this as its maximum surface size.
  static size_t GetMaxSurfaceSize() { return 32766; }
  // Cairo assumes the surface area will fit in a 32-bit signed integer.
  static size_t GetMaxSurfaceArea() { return 0x7FFFFFFF; }

 private:  // methods
  // Init cairo surface without doing a cairo_surface_reference() call.
  bool InitAlreadyReferenced(cairo_surface_t* aSurface, const IntSize& aSize,
                             SurfaceFormat* aFormat = nullptr);
  enum DrawPatternType { DRAW_FILL, DRAW_STROKE };
  void DrawPattern(const Pattern& aPattern, const StrokeOptions& aStrokeOptions,
                   const DrawOptions& aOptions, DrawPatternType aDrawType,
                   bool aPathBoundsClip = false);

  void CopySurfaceInternal(cairo_surface_t* aSurface, const IntRect& aSource,
                           const IntPoint& aDest);

  Rect GetUserSpaceClip() const;

  // Call before you make any changes to the backing surface with which this
  // context is associated. Pass the path you're going to be using if you have
  // one.
  void WillChange(const Path* aPath = nullptr);

  // Call if there is any reason to disassociate the snapshot from this draw
  // target; for example, because we're going to be destroyed.
  void MarkSnapshotIndependent();

  // If the current operator is "source" then clear the destination before we
  // draw into it, to simulate the effect of an unbounded source operator.
  void ClearSurfaceForUnboundedSource(const CompositionOp& aOperator);

  // Set the Cairo context font options according to the current draw target
  // font state.
  void SetFontOptions(cairo_antialias_t aAAMode = CAIRO_ANTIALIAS_DEFAULT);

 private:  // data
  cairo_t* mContext;
  cairo_surface_t* mSurface;
  IntSize mSize;
  bool mTransformSingular;
  size_t mClipDepth = 0;

  uint8_t* mLockedBits;

  cairo_font_options_t* mFontOptions;

  struct PushedLayer {
    PushedLayer(Float aOpacity, CompositionOp aCompositionOp,
                bool aWasPermittingSubpixelAA)
        : mOpacity(aOpacity),
          mCompositionOp(aCompositionOp),
          mMaskPattern(nullptr),
          mWasPermittingSubpixelAA(aWasPermittingSubpixelAA) {}
    Float mOpacity;
    CompositionOp mCompositionOp;
    cairo_pattern_t* mMaskPattern;
    bool mWasPermittingSubpixelAA;
  };
  std::vector<PushedLayer> mPushedLayers;

  // The latest snapshot of this surface. This needs to be told when this
  // target is modified. We keep it alive as a cache.
  RefPtr<SourceSurfaceCairo> mSnapshot;
  static cairo_surface_t* mDummySurface;
};

}  // namespace gfx
}  // namespace mozilla

#endif  // MOZILLA_GFX_DRAWTARGET_CAIRO_H_
