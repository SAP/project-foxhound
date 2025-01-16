/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Main header first:
// This is also necessary to ensure our definition of M_SQRT1_2 is picked up
#include "SVGUtils.h"
#include <algorithm>

// Keep others in (case-insensitive) order:
#include "gfx2DGlue.h"
#include "gfxContext.h"
#include "gfxMatrix.h"
#include "gfxPlatform.h"
#include "gfxRect.h"
#include "gfxUtils.h"
#include "nsCSSFrameConstructor.h"
#include "nsDisplayList.h"
#include "nsFrameList.h"
#include "nsGkAtoms.h"
#include "nsIContent.h"
#include "nsIFrame.h"
#include "nsIFrameInlines.h"
#include "nsLayoutUtils.h"
#include "nsPresContext.h"
#include "nsStyleStruct.h"
#include "nsStyleTransformMatrix.h"
#include "SVGAnimatedLength.h"
#include "SVGPaintServerFrame.h"
#include "nsTextFrame.h"
#include "mozilla/CSSClipPathInstance.h"
#include "mozilla/FilterInstance.h"
#include "mozilla/ISVGDisplayableFrame.h"
#include "mozilla/Preferences.h"
#include "mozilla/StaticPrefs_svg.h"
#include "mozilla/SVGClipPathFrame.h"
#include "mozilla/SVGContainerFrame.h"
#include "mozilla/SVGContentUtils.h"
#include "mozilla/SVGContextPaint.h"
#include "mozilla/SVGForeignObjectFrame.h"
#include "mozilla/SVGIntegrationUtils.h"
#include "mozilla/SVGGeometryFrame.h"
#include "mozilla/SVGMaskFrame.h"
#include "mozilla/SVGObserverUtils.h"
#include "mozilla/SVGOuterSVGFrame.h"
#include "mozilla/SVGTextFrame.h"
#include "mozilla/Unused.h"
#include "mozilla/gfx/2D.h"
#include "mozilla/gfx/PatternHelpers.h"
#include "mozilla/dom/Document.h"
#include "mozilla/dom/SVGClipPathElement.h"
#include "mozilla/dom/SVGGeometryElement.h"
#include "mozilla/dom/SVGPathElement.h"
#include "mozilla/dom/SVGUnitTypesBinding.h"
#include "mozilla/dom/SVGViewportElement.h"

using namespace mozilla::dom;
using namespace mozilla::dom::SVGUnitTypes_Binding;
using namespace mozilla::gfx;
using namespace mozilla::image;

bool NS_SVGNewGetBBoxEnabled() {
  return mozilla::StaticPrefs::svg_new_getBBox_enabled();
}

namespace mozilla {

// we only take the address of this:
static gfx::UserDataKey sSVGAutoRenderStateKey;

SVGAutoRenderState::SVGAutoRenderState(DrawTarget* aDrawTarget)
    : mDrawTarget(aDrawTarget),
      mOriginalRenderState(nullptr),
      mPaintingToWindow(false) {
  mOriginalRenderState = aDrawTarget->RemoveUserData(&sSVGAutoRenderStateKey);
  // We always remove ourselves from aContext before it dies, so
  // passing nullptr as the destroy function is okay.
  aDrawTarget->AddUserData(&sSVGAutoRenderStateKey, this, nullptr);
}

SVGAutoRenderState::~SVGAutoRenderState() {
  mDrawTarget->RemoveUserData(&sSVGAutoRenderStateKey);
  if (mOriginalRenderState) {
    mDrawTarget->AddUserData(&sSVGAutoRenderStateKey, mOriginalRenderState,
                             nullptr);
  }
}

void SVGAutoRenderState::SetPaintingToWindow(bool aPaintingToWindow) {
  mPaintingToWindow = aPaintingToWindow;
}

/* static */
bool SVGAutoRenderState::IsPaintingToWindow(DrawTarget* aDrawTarget) {
  void* state = aDrawTarget->GetUserData(&sSVGAutoRenderStateKey);
  if (state) {
    return static_cast<SVGAutoRenderState*>(state)->mPaintingToWindow;
  }
  return false;
}

// Unlike containers, leaf frames do not include GetPosition() in
// GetCanvasTM().
static bool FrameDoesNotIncludePositionInTM(const nsIFrame* aFrame) {
  return aFrame->IsSVGGeometryFrame() || aFrame->IsSVGImageFrame() ||
         aFrame->IsInSVGTextSubtree();
}

nsRect SVGUtils::GetPostFilterInkOverflowRect(nsIFrame* aFrame,
                                              const nsRect& aPreFilterRect) {
  MOZ_ASSERT(aFrame->HasAnyStateBits(NS_FRAME_SVG_LAYOUT),
             "Called on invalid frame type");

  // Note: we do not return here for eHasNoRefs since we must still handle any
  // CSS filter functions.
  // in that case we disable painting of the element.
  nsTArray<SVGFilterFrame*> filterFrames;
  if (!aFrame->StyleEffects()->HasFilters() ||
      SVGObserverUtils::GetAndObserveFilters(aFrame, &filterFrames) ==
          SVGObserverUtils::eHasRefsSomeInvalid) {
    return aPreFilterRect;
  }

  return FilterInstance::GetPostFilterBounds(aFrame, filterFrames, nullptr,
                                             &aPreFilterRect)
      .valueOr(aPreFilterRect);
}

bool SVGUtils::OuterSVGIsCallingReflowSVG(nsIFrame* aFrame) {
  return GetOuterSVGFrame(aFrame)->IsCallingReflowSVG();
}

bool SVGUtils::AnyOuterSVGIsCallingReflowSVG(nsIFrame* aFrame) {
  SVGOuterSVGFrame* outer = GetOuterSVGFrame(aFrame);
  do {
    if (outer->IsCallingReflowSVG()) {
      return true;
    }
    outer = GetOuterSVGFrame(outer->GetParent());
  } while (outer);
  return false;
}

void SVGUtils::ScheduleReflowSVG(nsIFrame* aFrame) {
  MOZ_ASSERT(aFrame->IsSVGFrame(), "Passed bad frame!");

  // If this is triggered, the callers should be fixed to call us before
  // ReflowSVG is called. If we try to mark dirty bits on frames while we're
  // in the process of removing them, things will get messed up.
  MOZ_ASSERT(!OuterSVGIsCallingReflowSVG(aFrame),
             "Do not call under ISVGDisplayableFrame::ReflowSVG!");

  // We don't call SVGObserverUtils::InvalidateRenderingObservers here because
  // we should only be called under InvalidateAndScheduleReflowSVG (which
  // calls InvalidateBounds) or SVGDisplayContainerFrame::InsertFrames
  // (at which point the frame has no observers).

  if (aFrame->HasAnyStateBits(NS_FRAME_IS_NONDISPLAY)) {
    return;
  }

  if (aFrame->HasAnyStateBits(NS_FRAME_IS_DIRTY | NS_FRAME_FIRST_REFLOW)) {
    // Nothing to do if we're already dirty, or if the outer-<svg>
    // hasn't yet had its initial reflow.
    return;
  }

  SVGOuterSVGFrame* outerSVGFrame = nullptr;

  // We must not add dirty bits to the SVGOuterSVGFrame or else
  // PresShell::FrameNeedsReflow won't work when we pass it in below.
  if (aFrame->IsSVGOuterSVGFrame()) {
    outerSVGFrame = static_cast<SVGOuterSVGFrame*>(aFrame);
  } else {
    aFrame->MarkSubtreeDirty();

    nsIFrame* f = aFrame->GetParent();
    while (f && !f->IsSVGOuterSVGFrame()) {
      if (f->HasAnyStateBits(NS_FRAME_IS_DIRTY | NS_FRAME_HAS_DIRTY_CHILDREN)) {
        return;
      }
      f->AddStateBits(NS_FRAME_HAS_DIRTY_CHILDREN);
      f = f->GetParent();
      MOZ_ASSERT(f->IsSVGFrame(), "IsSVGOuterSVGFrame check above not valid!");
    }

    outerSVGFrame = static_cast<SVGOuterSVGFrame*>(f);

    MOZ_ASSERT(outerSVGFrame && outerSVGFrame->IsSVGOuterSVGFrame(),
               "Did not find SVGOuterSVGFrame!");
  }

  if (outerSVGFrame->HasAnyStateBits(NS_FRAME_IN_REFLOW)) {
    // We're currently under an SVGOuterSVGFrame::Reflow call so there is no
    // need to call PresShell::FrameNeedsReflow, since we have an
    // SVGOuterSVGFrame::DidReflow call pending.
    return;
  }

  nsFrameState dirtyBit =
      (outerSVGFrame == aFrame ? NS_FRAME_IS_DIRTY
                               : NS_FRAME_HAS_DIRTY_CHILDREN);

  aFrame->PresShell()->FrameNeedsReflow(outerSVGFrame, IntrinsicDirty::None,
                                        dirtyBit);
}

bool SVGUtils::NeedsReflowSVG(const nsIFrame* aFrame) {
  MOZ_ASSERT(aFrame->IsSVGFrame(), "SVG uses bits differently!");

  // The flags we test here may change, hence why we have this separate
  // function.
  return aFrame->IsSubtreeDirty();
}

Size SVGUtils::GetContextSize(const nsIFrame* aFrame) {
  Size size;

  MOZ_ASSERT(aFrame->GetContent()->IsSVGElement(), "bad cast");
  const SVGElement* element = static_cast<SVGElement*>(aFrame->GetContent());

  SVGViewportElement* ctx = element->GetCtx();
  if (ctx) {
    size.width = ctx->GetLength(SVGContentUtils::X);
    size.height = ctx->GetLength(SVGContentUtils::Y);
  }
  return size;
}

float SVGUtils::ObjectSpace(const gfxRect& aRect,
                            const SVGAnimatedLength* aLength) {
  float axis;

  switch (aLength->GetCtxType()) {
    case SVGContentUtils::X:
      axis = aRect.Width();
      break;
    case SVGContentUtils::Y:
      axis = aRect.Height();
      break;
    case SVGContentUtils::XY:
      axis = float(SVGContentUtils::ComputeNormalizedHypotenuse(
          aRect.Width(), aRect.Height()));
      break;
    default:
      MOZ_ASSERT_UNREACHABLE("unexpected ctx type");
      axis = 0.0f;
      break;
  }
  if (aLength->IsPercentage()) {
    // Multiply first to avoid precision errors:
    return axis * aLength->GetAnimValInSpecifiedUnits() / 100;
  }
  return aLength->GetAnimValue(static_cast<SVGViewportElement*>(nullptr)) *
         axis;
}

float SVGUtils::UserSpace(nsIFrame* aNonSVGContext,
                          const SVGAnimatedLength* aLength) {
  MOZ_ASSERT(!aNonSVGContext->IsTextFrame(), "Not expecting text content");
  return aLength->GetAnimValue(aNonSVGContext);
}

float SVGUtils::UserSpace(const UserSpaceMetrics& aMetrics,
                          const SVGAnimatedLength* aLength) {
  return aLength->GetAnimValue(aMetrics);
}

SVGOuterSVGFrame* SVGUtils::GetOuterSVGFrame(nsIFrame* aFrame) {
  return static_cast<SVGOuterSVGFrame*>(nsLayoutUtils::GetClosestFrameOfType(
      aFrame, LayoutFrameType::SVGOuterSVG));
}

nsIFrame* SVGUtils::GetOuterSVGFrameAndCoveredRegion(nsIFrame* aFrame,
                                                     nsRect* aRect) {
  ISVGDisplayableFrame* svg = do_QueryFrame(aFrame);
  if (!svg) {
    return nullptr;
  }
  SVGOuterSVGFrame* outer = GetOuterSVGFrame(aFrame);
  if (outer == svg) {
    return nullptr;
  }

  if (aFrame->HasAnyStateBits(NS_FRAME_IS_NONDISPLAY)) {
    *aRect = nsRect(0, 0, 0, 0);
  } else {
    uint32_t flags = SVGUtils::eForGetClientRects | SVGUtils::eBBoxIncludeFill |
                     SVGUtils::eBBoxIncludeStroke |
                     SVGUtils::eBBoxIncludeMarkers |
                     SVGUtils::eUseUserSpaceOfUseElement;

    auto ctm = nsLayoutUtils::GetTransformToAncestor(RelativeTo{aFrame},
                                                     RelativeTo{outer});

    float initPositionX = NSAppUnitsToFloatPixels(aFrame->GetPosition().x,
                                                  AppUnitsPerCSSPixel()),
          initPositionY = NSAppUnitsToFloatPixels(aFrame->GetPosition().y,
                                                  AppUnitsPerCSSPixel());

    Matrix mm;
    ctm.ProjectTo2D();
    ctm.CanDraw2D(&mm);
    gfxMatrix m = ThebesMatrix(mm);

    float appUnitsPerDevPixel = aFrame->PresContext()->AppUnitsPerDevPixel();
    float devPixelPerCSSPixel =
        float(AppUnitsPerCSSPixel()) / appUnitsPerDevPixel;

    // The matrix that GetBBox accepts should operate on "user space",
    // i.e. with CSS pixel unit.
    m = m.PreScale(devPixelPerCSSPixel, devPixelPerCSSPixel);

    // Both SVGUtils::GetBBox and nsLayoutUtils::GetTransformToAncestor
    // will count this displacement, we should remove it here to avoid
    // double-counting.
    m = m.PreTranslate(-initPositionX, -initPositionY);

    gfxRect bbox = SVGUtils::GetBBox(aFrame, flags, &m);
    *aRect = nsLayoutUtils::RoundGfxRectToAppRect(bbox, appUnitsPerDevPixel);
  }

  return outer;
}

gfxMatrix SVGUtils::GetCanvasTM(nsIFrame* aFrame) {
  // XXX yuck, we really need a common interface for GetCanvasTM

  if (!aFrame->HasAnyStateBits(NS_FRAME_SVG_LAYOUT)) {
    return GetCSSPxToDevPxMatrix(aFrame);
  }

  if (aFrame->IsSVGForeignObjectFrame()) {
    return static_cast<SVGForeignObjectFrame*>(aFrame)->GetCanvasTM();
  }

  if (SVGContainerFrame* containerFrame = do_QueryFrame(aFrame)) {
    return containerFrame->GetCanvasTM();
  }

  MOZ_ASSERT(aFrame->GetParent()->IsSVGContainerFrame());

  auto* parent = static_cast<SVGContainerFrame*>(aFrame->GetParent());
  auto* content = static_cast<SVGElement*>(aFrame->GetContent());

  return content->PrependLocalTransformsTo(parent->GetCanvasTM());
}

bool SVGUtils::IsSVGTransformed(const nsIFrame* aFrame,
                                gfx::Matrix* aOwnTransform,
                                gfx::Matrix* aFromParentTransform) {
  MOZ_ASSERT(aFrame->HasAllStateBits(NS_FRAME_SVG_LAYOUT |
                                     NS_FRAME_MAY_BE_TRANSFORMED),
             "Expecting an SVG frame that can be transformed");
  bool foundTransform = false;

  // Check if our parent has children-only transforms:
  if (SVGContainerFrame* parent = do_QueryFrame(aFrame->GetParent())) {
    foundTransform = parent->HasChildrenOnlyTransform(aFromParentTransform);
  }

  if (auto* content = SVGElement::FromNode(aFrame->GetContent())) {
    auto* transformList = content->GetAnimatedTransformList();
    if ((transformList && transformList->HasTransform()) ||
        content->GetAnimateMotionTransform()) {
      if (aOwnTransform) {
        *aOwnTransform = gfx::ToMatrix(
            content->PrependLocalTransformsTo(gfxMatrix(), eUserSpaceToParent));
      }
      foundTransform = true;
    }
  }
  return foundTransform;
}

void SVGUtils::NotifyChildrenOfSVGChange(nsIFrame* aFrame, uint32_t aFlags) {
  for (nsIFrame* kid : aFrame->PrincipalChildList()) {
    ISVGDisplayableFrame* SVGFrame = do_QueryFrame(kid);
    if (SVGFrame) {
      SVGFrame->NotifySVGChanged(aFlags);
    } else {
      NS_ASSERTION(kid->IsSVGFrame() || kid->IsInSVGTextSubtree(),
                   "SVG frame expected");
      // recurse into the children of container frames e.g. <clipPath>, <mask>
      // in case they have child frames with transformation matrices
      if (kid->IsSVGFrame()) {
        NotifyChildrenOfSVGChange(kid, aFlags);
      }
    }
  }
}

// ************************************************************

float SVGUtils::ComputeOpacity(const nsIFrame* aFrame, bool aHandleOpacity) {
  const auto* styleEffects = aFrame->StyleEffects();

  if (!styleEffects->IsOpaque() &&
      (SVGUtils::CanOptimizeOpacity(aFrame) || !aHandleOpacity)) {
    return 1.0f;
  }

  return styleEffects->mOpacity;
}

SVGUtils::MaskUsage SVGUtils::DetermineMaskUsage(const nsIFrame* aFrame,
                                                 bool aHandleOpacity) {
  MaskUsage usage;

  using ClipPathType = StyleClipPath::Tag;

  usage.mOpacity = ComputeOpacity(aFrame, aHandleOpacity);

  nsIFrame* firstFrame =
      nsLayoutUtils::FirstContinuationOrIBSplitSibling(aFrame);

  const nsStyleSVGReset* svgReset = firstFrame->StyleSVGReset();

  if (SVGObserverUtils::GetAndObserveMasks(firstFrame, nullptr) !=
      SVGObserverUtils::eHasNoRefs) {
    usage.mShouldGenerateMaskLayer = true;
  }

  SVGClipPathFrame* clipPathFrame;
  // XXX check return value?
  SVGObserverUtils::GetAndObserveClipPath(firstFrame, &clipPathFrame);
  MOZ_ASSERT(!clipPathFrame || svgReset->mClipPath.IsUrl());

  switch (svgReset->mClipPath.tag) {
    case ClipPathType::Url:
      if (clipPathFrame) {
        if (clipPathFrame->IsTrivial()) {
          usage.mShouldApplyClipPath = true;
        } else {
          usage.mShouldGenerateClipMaskLayer = true;
        }
      }
      break;
    case ClipPathType::Shape: {
      usage.mShouldApplyBasicShapeOrPath = true;
      const auto& shape = svgReset->mClipPath.AsShape()._0;
      usage.mIsSimpleClipShape =
          !usage.mShouldGenerateMaskLayer &&
          (shape->IsRect() || shape->IsCircle() || shape->IsEllipse());
      break;
    }
    case ClipPathType::Box:
      usage.mShouldApplyBasicShapeOrPath = true;
      break;
    case ClipPathType::None:
      MOZ_ASSERT(!usage.mShouldGenerateClipMaskLayer &&
                 !usage.mShouldApplyClipPath &&
                 !usage.mShouldApplyBasicShapeOrPath);
      break;
    default:
      MOZ_ASSERT_UNREACHABLE("Unsupported clip-path type.");
      break;
  }
  return usage;
}

class MixModeBlender {
 public:
  using Factory = gfx::Factory;

  MixModeBlender(nsIFrame* aFrame, gfxContext* aContext)
      : mFrame(aFrame), mSourceCtx(aContext) {
    MOZ_ASSERT(mFrame && mSourceCtx);
  }

  bool ShouldCreateDrawTargetForBlend() const {
    return mFrame->StyleEffects()->HasMixBlendMode();
  }

  gfxContext* CreateBlendTarget(const gfxMatrix& aTransform) {
    MOZ_ASSERT(ShouldCreateDrawTargetForBlend());

    // Create a temporary context to draw to so we can blend it back with
    // another operator.
    IntRect drawRect = ComputeClipExtsInDeviceSpace(aTransform);
    if (drawRect.IsEmpty()) {
      return nullptr;
    }

    RefPtr<DrawTarget> targetDT =
        mSourceCtx->GetDrawTarget()->CreateSimilarDrawTarget(
            drawRect.Size(), SurfaceFormat::B8G8R8A8);
    if (!targetDT || !targetDT->IsValid()) {
      return nullptr;
    }

    MOZ_ASSERT(!mTargetCtx,
               "CreateBlendTarget is designed to be used once only.");

    mTargetCtx = gfxContext::CreateOrNull(targetDT);
    MOZ_ASSERT(mTargetCtx);  // already checked the draw target above
    mTargetCtx->SetMatrix(mSourceCtx->CurrentMatrix() *
                          Matrix::Translation(-drawRect.TopLeft()));

    mTargetOffset = drawRect.TopLeft();

    return mTargetCtx.get();
  }

  void BlendToTarget() {
    MOZ_ASSERT(ShouldCreateDrawTargetForBlend());
    MOZ_ASSERT(mTargetCtx,
               "BlendToTarget should be used after CreateBlendTarget.");

    RefPtr<SourceSurface> targetSurf = mTargetCtx->GetDrawTarget()->Snapshot();

    gfxContextAutoSaveRestore save(mSourceCtx);
    mSourceCtx->SetMatrix(Matrix());  // This will be restored right after.
    RefPtr<gfxPattern> pattern = new gfxPattern(
        targetSurf, Matrix::Translation(mTargetOffset.x, mTargetOffset.y));
    mSourceCtx->SetPattern(pattern);
    mSourceCtx->Paint();
  }

 private:
  MixModeBlender() = delete;

  IntRect ComputeClipExtsInDeviceSpace(const gfxMatrix& aTransform) {
    // These are used if we require a temporary surface for a custom blend
    // mode. Clip the source context first, so that we can generate a smaller
    // temporary surface. (Since we will clip this context in
    // SetupContextMatrix, a pair of save/restore is needed.)
    gfxContextAutoSaveRestore saver;

    if (!mFrame->HasAnyStateBits(NS_FRAME_IS_NONDISPLAY)) {
      saver.SetContext(mSourceCtx);
      // aFrame has a valid ink overflow rect, so clip to it before calling
      // PushGroup() to minimize the size of the surfaces we'll composite:
      gfxContextMatrixAutoSaveRestore matrixAutoSaveRestore(mSourceCtx);
      mSourceCtx->Multiply(aTransform);
      nsRect overflowRect = mFrame->InkOverflowRectRelativeToSelf();
      if (FrameDoesNotIncludePositionInTM(mFrame)) {
        overflowRect = overflowRect + mFrame->GetPosition();
      }
      mSourceCtx->Clip(NSRectToSnappedRect(
          overflowRect, mFrame->PresContext()->AppUnitsPerDevPixel(),
          *mSourceCtx->GetDrawTarget()));
    }

    // Get the clip extents in device space.
    gfxRect clippedFrameSurfaceRect =
        mSourceCtx->GetClipExtents(gfxContext::eDeviceSpace);
    clippedFrameSurfaceRect.RoundOut();

    IntRect result;
    ToRect(clippedFrameSurfaceRect).ToIntRect(&result);

    return Factory::CheckSurfaceSize(result.Size()) ? result : IntRect();
  }

  nsIFrame* mFrame;
  gfxContext* mSourceCtx;
  UniquePtr<gfxContext> mTargetCtx;
  IntPoint mTargetOffset;
};

void SVGUtils::PaintFrameWithEffects(nsIFrame* aFrame, gfxContext& aContext,
                                     const gfxMatrix& aTransform,
                                     imgDrawingParams& aImgParams) {
  NS_ASSERTION(aFrame->HasAnyStateBits(NS_FRAME_IS_NONDISPLAY) ||
                   aFrame->PresContext()->Document()->IsSVGGlyphsDocument(),
               "Only painting of non-display SVG should take this code path");

  ISVGDisplayableFrame* svgFrame = do_QueryFrame(aFrame);
  if (!svgFrame) {
    return;
  }

  MaskUsage maskUsage = DetermineMaskUsage(aFrame, true);
  if (maskUsage.IsTransparent()) {
    return;
  }

  if (auto* svg = SVGElement::FromNode(aFrame->GetContent())) {
    if (!svg->HasValidDimensions()) {
      return;
    }
  }

  /* SVG defines the following rendering model:
   *
   *  1. Render fill
   *  2. Render stroke
   *  3. Render markers
   *  4. Apply filter
   *  5. Apply clipping, masking, group opacity
   *
   * We follow this, but perform a couple of optimizations:
   *
   * + Use cairo's clipPath when representable natively (single object
   *   clip region).
   *
   * + Merge opacity and masking if both used together.
   */

  /* Properties are added lazily and may have been removed by a restyle,
     so make sure all applicable ones are set again. */
  SVGClipPathFrame* clipPathFrame;
  nsTArray<SVGMaskFrame*> maskFrames;
  nsTArray<SVGFilterFrame*> filterFrames;
  const bool hasInvalidFilter =
      SVGObserverUtils::GetAndObserveFilters(aFrame, &filterFrames) ==
      SVGObserverUtils::eHasRefsSomeInvalid;
  SVGObserverUtils::GetAndObserveClipPath(aFrame, &clipPathFrame);
  SVGObserverUtils::GetAndObserveMasks(aFrame, &maskFrames);

  SVGMaskFrame* maskFrame = maskFrames.IsEmpty() ? nullptr : maskFrames[0];

  MixModeBlender blender(aFrame, &aContext);
  gfxContext* target = blender.ShouldCreateDrawTargetForBlend()
                           ? blender.CreateBlendTarget(aTransform)
                           : &aContext;

  if (!target) {
    return;
  }

  /* Check if we need to do additional operations on this child's
   * rendering, which necessitates rendering into another surface. */
  bool shouldPushMask = false;

  if (maskUsage.ShouldGenerateMask()) {
    RefPtr<SourceSurface> maskSurface;

    // maskFrame can be nullptr even if maskUsage.ShouldGenerateMaskLayer() is
    // true. That happens when a user gives an unresolvable mask-id, such as
    //   mask:url()
    //   mask:url(#id-which-does-not-exist)
    // Since we only uses SVGUtils with SVG elements, not like mask on an
    // HTML element, we should treat an unresolvable mask as no-mask here.
    if (maskUsage.ShouldGenerateMaskLayer() && maskFrame) {
      StyleMaskMode maskMode =
          aFrame->StyleSVGReset()->mMask.mLayers[0].mMaskMode;
      SVGMaskFrame::MaskParams params(aContext.GetDrawTarget(), aFrame,
                                      aTransform, maskUsage.Opacity(), maskMode,
                                      aImgParams);

      maskSurface = maskFrame->GetMaskForMaskedFrame(params);

      if (!maskSurface) {
        // Either entire surface is clipped out, or gfx buffer allocation
        // failure in SVGMaskFrame::GetMaskForMaskedFrame.
        return;
      }
      shouldPushMask = true;
    }

    if (maskUsage.ShouldGenerateClipMaskLayer()) {
      RefPtr<SourceSurface> clipMaskSurface =
          clipPathFrame->GetClipMask(aContext, aFrame, aTransform, maskSurface);
      if (clipMaskSurface) {
        maskSurface = clipMaskSurface;
      } else {
        // Either entire surface is clipped out, or gfx buffer allocation
        // failure in SVGClipPathFrame::GetClipMask.
        return;
      }
      shouldPushMask = true;
    }

    if (!maskUsage.ShouldGenerateLayer()) {
      shouldPushMask = true;
    }

    // SVG mask multiply opacity into maskSurface already, so we do not bother
    // to apply opacity again.
    if (shouldPushMask) {
      // We want the mask to be untransformed so use the inverse of the
      // current transform as the maskTransform to compensate.
      Matrix maskTransform = aContext.CurrentMatrix();
      maskTransform.Invert();
      target->PushGroupForBlendBack(gfxContentType::COLOR_ALPHA,
                                    maskFrame ? 1.0f : maskUsage.Opacity(),
                                    maskSurface, maskTransform);
    }
  }

  /* If this frame has only a trivial clipPath, set up cairo's clipping now so
   * we can just do normal painting and get it clipped appropriately.
   */
  if (maskUsage.ShouldApplyClipPath() ||
      maskUsage.ShouldApplyBasicShapeOrPath()) {
    if (maskUsage.ShouldApplyClipPath()) {
      clipPathFrame->ApplyClipPath(aContext, aFrame, aTransform);
    } else {
      CSSClipPathInstance::ApplyBasicShapeOrPathClip(aContext, aFrame,
                                                     aTransform);
    }
  }

  /* Paint the child */

  // Invalid filters should render the unfiltered contents per spec.
  if (aFrame->StyleEffects()->HasFilters() && !hasInvalidFilter) {
    gfxContextMatrixAutoSaveRestore autoSR(target);

    // 'target' is currently scaled such that its user space units are CSS
    // pixels (SVG user space units). But PaintFilteredFrame expects it to be
    // scaled in such a way that its user space units are device pixels. So we
    // have to adjust the scale.
    gfxMatrix reverseScaleMatrix = SVGUtils::GetCSSPxToDevPxMatrix(aFrame);
    DebugOnly<bool> invertible = reverseScaleMatrix.Invert();
    target->SetMatrixDouble(reverseScaleMatrix * aTransform *
                            target->CurrentMatrixDouble());

    auto callback = [&](gfxContext& aContext, imgDrawingParams& aImgParams,
                        const gfxMatrix* aFilterTransform,
                        const nsIntRect* aDirtyRect) {
      svgFrame->PaintSVG(aContext,
                         aFilterTransform
                             ? SVGUtils::GetCSSPxToDevPxMatrix(aFrame)
                             : aTransform,
                         aImgParams);
    };
    // If we're masking a userSpaceOnUse mask we may need to include the
    // stroke too. Err on the side of caution and include it always.
    gfxRect bbox = GetBBox(aFrame, SVGUtils::eUseFrameBoundsForOuterSVG |
                                       SVGUtils::eBBoxIncludeFillGeometry |
                                       SVGUtils::eBBoxIncludeStroke);
    FilterInstance::PaintFilteredFrame(
        aFrame, aFrame->StyleEffects()->mFilters.AsSpan(), filterFrames, target,
        callback, nullptr, aImgParams, 1.0f, &bbox);
  } else {
    svgFrame->PaintSVG(*target, aTransform, aImgParams);
  }

  if (maskUsage.ShouldApplyClipPath() ||
      maskUsage.ShouldApplyBasicShapeOrPath()) {
    aContext.PopClip();
  }

  if (shouldPushMask) {
    target->PopGroupAndBlend();
  }

  if (blender.ShouldCreateDrawTargetForBlend()) {
    MOZ_ASSERT(target != &aContext);
    blender.BlendToTarget();
  }
}

bool SVGUtils::HitTestClip(nsIFrame* aFrame, const gfxPoint& aPoint) {
  const nsStyleSVGReset* svgReset = aFrame->StyleSVGReset();
  if (!svgReset->HasClipPath()) {
    return true;
  }
  if (svgReset->mClipPath.IsUrl()) {
    // If the clip-path property references non-existent or invalid clipPath
    // element(s) we ignore it.
    SVGClipPathFrame* clipPathFrame;
    SVGObserverUtils::GetAndObserveClipPath(aFrame, &clipPathFrame);
    return !clipPathFrame ||
           clipPathFrame->PointIsInsideClipPath(aFrame, aPoint);
  }
  return CSSClipPathInstance::HitTestBasicShapeOrPathClip(aFrame, aPoint);
}

IntSize SVGUtils::ConvertToSurfaceSize(const gfxSize& aSize,
                                       bool* aResultOverflows) {
  IntSize surfaceSize(ClampToInt(ceil(aSize.width)),
                      ClampToInt(ceil(aSize.height)));

  *aResultOverflows = surfaceSize.width != ceil(aSize.width) ||
                      surfaceSize.height != ceil(aSize.height);

  if (!Factory::AllowedSurfaceSize(surfaceSize)) {
    surfaceSize.width =
        std::min(NS_SVG_OFFSCREEN_MAX_DIMENSION, surfaceSize.width);
    surfaceSize.height =
        std::min(NS_SVG_OFFSCREEN_MAX_DIMENSION, surfaceSize.height);
    *aResultOverflows = true;
  }

  return surfaceSize;
}

bool SVGUtils::HitTestRect(const gfx::Matrix& aMatrix, float aRX, float aRY,
                           float aRWidth, float aRHeight, float aX, float aY) {
  gfx::Rect rect(aRX, aRY, aRWidth, aRHeight);
  if (rect.IsEmpty() || aMatrix.IsSingular()) {
    return false;
  }
  gfx::Matrix toRectSpace = aMatrix;
  toRectSpace.Invert();
  gfx::Point p = toRectSpace.TransformPoint(gfx::Point(aX, aY));
  return rect.x <= p.x && p.x <= rect.XMost() && rect.y <= p.y &&
         p.y <= rect.YMost();
}

gfxRect SVGUtils::GetClipRectForFrame(const nsIFrame* aFrame, float aX,
                                      float aY, float aWidth, float aHeight) {
  const nsStyleDisplay* disp = aFrame->StyleDisplay();
  const nsStyleEffects* effects = aFrame->StyleEffects();

  bool clipApplies = disp->mOverflowX == StyleOverflow::Hidden ||
                     disp->mOverflowY == StyleOverflow::Hidden;

  if (!clipApplies || effects->mClip.IsAuto()) {
    return gfxRect(aX, aY, aWidth, aHeight);
  }

  const auto& rect = effects->mClip.AsRect();
  nsRect coordClipRect = rect.ToLayoutRect();
  nsIntRect clipPxRect = coordClipRect.ToOutsidePixels(
      aFrame->PresContext()->AppUnitsPerDevPixel());
  gfxRect clipRect =
      gfxRect(clipPxRect.x, clipPxRect.y, clipPxRect.width, clipPxRect.height);
  if (rect.right.IsAuto()) {
    clipRect.width = aWidth - clipRect.X();
  }
  if (rect.bottom.IsAuto()) {
    clipRect.height = aHeight - clipRect.Y();
  }
  if (disp->mOverflowX != StyleOverflow::Hidden) {
    clipRect.x = aX;
    clipRect.width = aWidth;
  }
  if (disp->mOverflowY != StyleOverflow::Hidden) {
    clipRect.y = aY;
    clipRect.height = aHeight;
  }
  return clipRect;
}

gfxRect SVGUtils::GetBBox(nsIFrame* aFrame, uint32_t aFlags,
                          const gfxMatrix* aToBoundsSpace) {
  if (aFrame->IsTextFrame()) {
    aFrame = aFrame->GetParent();
  }

  if (aFrame->IsInSVGTextSubtree()) {
    // It is possible to apply a gradient, pattern, clipping path, mask or
    // filter to text. When one of these facilities is applied to text
    // the bounding box is the entire text element in all cases.
    aFrame =
        nsLayoutUtils::GetClosestFrameOfType(aFrame, LayoutFrameType::SVGText);
  }

  ISVGDisplayableFrame* svg = do_QueryFrame(aFrame);
  const bool hasSVGLayout = aFrame->HasAnyStateBits(NS_FRAME_SVG_LAYOUT);
  if (hasSVGLayout && !svg) {
    // An SVG frame, but not one that can be displayed directly (for
    // example, nsGradientFrame). These can't contribute to the bbox.
    return gfxRect();
  }

  const bool isOuterSVG = svg && !hasSVGLayout;
  MOZ_ASSERT(!isOuterSVG || aFrame->IsSVGOuterSVGFrame());
  if (!svg || (isOuterSVG && (aFlags & eUseFrameBoundsForOuterSVG))) {
    // An HTML element or an SVG outer frame.
    MOZ_ASSERT(!hasSVGLayout);
    bool onlyCurrentFrame = aFlags & eIncludeOnlyCurrentFrameForNonSVGElement;
    return SVGIntegrationUtils::GetSVGBBoxForNonSVGFrame(
        aFrame,
        /* aUnionContinuations = */ !onlyCurrentFrame);
  }

  MOZ_ASSERT(svg);

  if (auto* element = SVGElement::FromNodeOrNull(aFrame->GetContent())) {
    if (!element->HasValidDimensions()) {
      return gfxRect();
    }
  }

  // Clean out flags which have no effects on returning bbox from now, so that
  // we can cache and reuse ObjectBoundingBoxProperty() in the code below.
  aFlags &=
      ~(eIncludeOnlyCurrentFrameForNonSVGElement | eUseFrameBoundsForOuterSVG);
  if (!aFrame->IsSVGUseFrame()) {
    aFlags &= ~eUseUserSpaceOfUseElement;
  }

  if (aFlags == eBBoxIncludeFillGeometry &&
      // We only cache bbox in element's own user space
      !aToBoundsSpace) {
    gfxRect* prop = aFrame->GetProperty(ObjectBoundingBoxProperty());
    if (prop) {
      return *prop;
    }
  }

  gfxMatrix matrix;
  if (aToBoundsSpace) {
    matrix = *aToBoundsSpace;
  }

  if (aFrame->IsSVGForeignObjectFrame() ||
      aFlags & SVGUtils::eUseUserSpaceOfUseElement) {
    // The spec says getBBox "Returns the tight bounding box in *current user
    // space*". So we should really be doing this for all elements, but that
    // needs investigation to check that we won't break too much content.
    // NOTE: When changing this to apply to other frame types, make sure to
    // also update SVGUtils::FrameSpaceInCSSPxToUserSpaceOffset.
    MOZ_ASSERT(aFrame->GetContent()->IsSVGElement(), "bad cast");
    SVGElement* element = static_cast<SVGElement*>(aFrame->GetContent());
    matrix = element->PrependLocalTransformsTo(matrix, eChildToUserSpace);
  }
  gfxRect bbox =
      svg->GetBBoxContribution(ToMatrix(matrix), aFlags).ToThebesRect();
  // Account for 'clipped'.
  if (aFlags & SVGUtils::eBBoxIncludeClipped) {
    gfxRect clipRect;
    float x, y, width, height;
    gfxRect fillBBox =
        svg->GetBBoxContribution({}, SVGUtils::eBBoxIncludeFill).ToThebesRect();
    x = fillBBox.x;
    y = fillBBox.y;
    width = fillBBox.width;
    height = fillBBox.height;
    // XXX Should probably check for overflow: clip too.
    bool hasClip = aFrame->StyleDisplay()->IsScrollableOverflow();
    if (hasClip) {
      clipRect = SVGUtils::GetClipRectForFrame(aFrame, x, y, width, height);
      if (aFrame->IsSVGForeignObjectFrame() || aFrame->IsSVGUseFrame()) {
        clipRect = matrix.TransformBounds(clipRect);
      }
    }
    SVGClipPathFrame* clipPathFrame;
    if (SVGObserverUtils::GetAndObserveClipPath(aFrame, &clipPathFrame) ==
        SVGObserverUtils::eHasRefsSomeInvalid) {
      bbox = gfxRect(0, 0, 0, 0);
    } else {
      if (clipPathFrame) {
        SVGClipPathElement* clipContent =
            static_cast<SVGClipPathElement*>(clipPathFrame->GetContent());
        if (clipContent->IsUnitsObjectBoundingBox()) {
          matrix.PreTranslate(gfxPoint(x, y));
          matrix.PreScale(width, height);
        } else if (aFrame->IsSVGForeignObjectFrame()) {
          matrix = gfxMatrix();
        }
        matrix *= SVGUtils::GetTransformMatrixInUserSpace(clipPathFrame);

        bbox = clipPathFrame->GetBBoxForClipPathFrame(bbox, matrix, aFlags)
                   .ToThebesRect();
      }

      if (hasClip) {
        bbox = bbox.Intersect(clipRect);
      }

      if (bbox.IsEmpty()) {
        bbox = gfxRect(0, 0, 0, 0);
      }
    }
  }

  if (aFlags == eBBoxIncludeFillGeometry &&
      // We only cache bbox in element's own user space
      !aToBoundsSpace) {
    // Obtaining the bbox for objectBoundingBox calculations is common so we
    // cache the result for future calls, since calculation can be expensive:
    aFrame->SetProperty(ObjectBoundingBoxProperty(), new gfxRect(bbox));
  }

  return bbox;
}

gfxPoint SVGUtils::FrameSpaceInCSSPxToUserSpaceOffset(const nsIFrame* aFrame) {
  if (!aFrame->HasAnyStateBits(NS_FRAME_SVG_LAYOUT)) {
    // The user space for non-SVG frames is defined as the bounding box of the
    // frame's border-box rects over all continuations.
    return gfxPoint();
  }

  // Leaf frames apply their own offset inside their user space.
  if (FrameDoesNotIncludePositionInTM(aFrame)) {
    return nsLayoutUtils::RectToGfxRect(aFrame->GetRect(),
                                        AppUnitsPerCSSPixel())
        .TopLeft();
  }

  // For foreignObject frames, SVGUtils::GetBBox applies their local
  // transform, so we need to do the same here.
  if (aFrame->IsSVGForeignObjectFrame()) {
    gfxMatrix transform =
        static_cast<SVGElement*>(aFrame->GetContent())
            ->PrependLocalTransformsTo(gfxMatrix(), eChildToUserSpace);
    NS_ASSERTION(!transform.HasNonTranslation(),
                 "we're relying on this being an offset-only transform");
    return transform.GetTranslation();
  }

  return gfxPoint();
}

static gfxRect GetBoundingBoxRelativeRect(const SVGAnimatedLength* aXYWH,
                                          const gfxRect& aBBox) {
  return gfxRect(aBBox.x + SVGUtils::ObjectSpace(aBBox, &aXYWH[0]),
                 aBBox.y + SVGUtils::ObjectSpace(aBBox, &aXYWH[1]),
                 SVGUtils::ObjectSpace(aBBox, &aXYWH[2]),
                 SVGUtils::ObjectSpace(aBBox, &aXYWH[3]));
}

gfxRect SVGUtils::GetRelativeRect(uint16_t aUnits,
                                  const SVGAnimatedLength* aXYWH,
                                  const gfxRect& aBBox,
                                  const UserSpaceMetrics& aMetrics) {
  if (aUnits == SVG_UNIT_TYPE_OBJECTBOUNDINGBOX) {
    return GetBoundingBoxRelativeRect(aXYWH, aBBox);
  }
  return gfxRect(UserSpace(aMetrics, &aXYWH[0]), UserSpace(aMetrics, &aXYWH[1]),
                 UserSpace(aMetrics, &aXYWH[2]),
                 UserSpace(aMetrics, &aXYWH[3]));
}

gfxRect SVGUtils::GetRelativeRect(uint16_t aUnits,
                                  const SVGAnimatedLength* aXYWH,
                                  const gfxRect& aBBox, nsIFrame* aFrame) {
  if (aUnits == SVG_UNIT_TYPE_OBJECTBOUNDINGBOX) {
    return GetBoundingBoxRelativeRect(aXYWH, aBBox);
  }
  if (SVGElement* svgElement = SVGElement::FromNode(aFrame->GetContent())) {
    return GetRelativeRect(aUnits, aXYWH, aBBox, SVGElementMetrics(svgElement));
  }
  return GetRelativeRect(aUnits, aXYWH, aBBox,
                         NonSVGFrameUserSpaceMetrics(aFrame));
}

bool SVGUtils::CanOptimizeOpacity(const nsIFrame* aFrame) {
  if (!aFrame->HasAnyStateBits(NS_FRAME_SVG_LAYOUT)) {
    return false;
  }
  auto* content = aFrame->GetContent();
  if (!content->IsSVGGeometryElement() &&
      !content->IsSVGElement(nsGkAtoms::image)) {
    return false;
  }
  if (aFrame->StyleEffects()->HasFilters()) {
    return false;
  }
  // XXX The SVG WG is intending to allow fill, stroke and markers on <image>
  if (content->IsSVGElement(nsGkAtoms::image)) {
    return true;
  }
  const nsStyleSVG* style = aFrame->StyleSVG();
  if (style->HasMarker() &&
      static_cast<SVGGeometryElement*>(content)->IsMarkable()) {
    return false;
  }

  if (nsLayoutUtils::HasAnimationOfPropertySet(
          aFrame, nsCSSPropertyIDSet::OpacityProperties())) {
    return false;
  }

  return !style->HasFill() || !HasStroke(aFrame);
}

gfxMatrix SVGUtils::AdjustMatrixForUnits(const gfxMatrix& aMatrix,
                                         const SVGAnimatedEnumeration* aUnits,
                                         nsIFrame* aFrame, uint32_t aFlags) {
  if (aFrame && aUnits->GetAnimValue() == SVG_UNIT_TYPE_OBJECTBOUNDINGBOX) {
    gfxRect bbox = GetBBox(aFrame, aFlags);
    gfxMatrix tm = aMatrix;
    tm.PreTranslate(gfxPoint(bbox.X(), bbox.Y()));
    tm.PreScale(bbox.Width(), bbox.Height());
    return tm;
  }
  return aMatrix;
}

bool SVGUtils::GetNonScalingStrokeTransform(const nsIFrame* aFrame,
                                            gfxMatrix* aUserToOuterSVG) {
  if (aFrame->GetContent()->IsText()) {
    aFrame = aFrame->GetParent();
  }

  if (!aFrame->StyleSVGReset()->HasNonScalingStroke()) {
    return false;
  }

  MOZ_ASSERT(aFrame->GetContent()->IsSVGElement(), "should be an SVG element");

  *aUserToOuterSVG = ThebesMatrix(SVGContentUtils::GetCTM(
      static_cast<SVGElement*>(aFrame->GetContent()), true));

  return aUserToOuterSVG->HasNonTranslation();
}

// The logic here comes from _cairo_stroke_style_max_distance_from_path
static gfxRect PathExtentsToMaxStrokeExtents(const gfxRect& aPathExtents,
                                             const nsIFrame* aFrame,
                                             double aStyleExpansionFactor,
                                             const gfxMatrix& aMatrix) {
  double style_expansion =
      aStyleExpansionFactor * SVGUtils::GetStrokeWidth(aFrame);

  gfxMatrix matrix = aMatrix;

  gfxMatrix outerSVGToUser;
  if (SVGUtils::GetNonScalingStrokeTransform(aFrame, &outerSVGToUser)) {
    outerSVGToUser.Invert();
    matrix.PreMultiply(outerSVGToUser);
  }

  double dx = style_expansion * (fabs(matrix._11) + fabs(matrix._21));
  double dy = style_expansion * (fabs(matrix._22) + fabs(matrix._12));

  gfxRect strokeExtents = aPathExtents;
  strokeExtents.Inflate(dx, dy);
  return strokeExtents;
}

/*static*/
gfxRect SVGUtils::PathExtentsToMaxStrokeExtents(const gfxRect& aPathExtents,
                                                const nsTextFrame* aFrame,
                                                const gfxMatrix& aMatrix) {
  NS_ASSERTION(aFrame->IsInSVGTextSubtree(),
               "expected an nsTextFrame for SVG text");
  return mozilla::PathExtentsToMaxStrokeExtents(aPathExtents, aFrame, 0.5,
                                                aMatrix);
}

/*static*/
gfxRect SVGUtils::PathExtentsToMaxStrokeExtents(const gfxRect& aPathExtents,
                                                const SVGGeometryFrame* aFrame,
                                                const gfxMatrix& aMatrix) {
  bool strokeMayHaveCorners =
      !SVGContentUtils::ShapeTypeHasNoCorners(aFrame->GetContent());

  // For a shape without corners the stroke can only extend half the stroke
  // width from the path in the x/y-axis directions. For shapes with corners
  // the stroke can extend by sqrt(1/2) (think 45 degree rotated rect, or line
  // with stroke-linecaps="square").
  double styleExpansionFactor = strokeMayHaveCorners ? M_SQRT1_2 : 0.5;

  // The stroke can extend even further for paths that can be affected by
  // stroke-miterlimit.
  // We only need to do this if the limit is greater than 1, but it's probably
  // not worth optimizing for that.
  bool affectedByMiterlimit = aFrame->GetContent()->IsAnyOfSVGElements(
      nsGkAtoms::path, nsGkAtoms::polyline, nsGkAtoms::polygon);

  if (affectedByMiterlimit) {
    const nsStyleSVG* style = aFrame->StyleSVG();
    if (style->mStrokeLinejoin == StyleStrokeLinejoin::Miter &&
        styleExpansionFactor < style->mStrokeMiterlimit / 2.0) {
      styleExpansionFactor = style->mStrokeMiterlimit / 2.0;
    }
  }

  return mozilla::PathExtentsToMaxStrokeExtents(aPathExtents, aFrame,
                                                styleExpansionFactor, aMatrix);
}

// ----------------------------------------------------------------------

/* static */
nscolor SVGUtils::GetFallbackOrPaintColor(
    const ComputedStyle& aStyle, StyleSVGPaint nsStyleSVG::*aFillOrStroke,
    nscolor aDefaultContextFallbackColor) {
  const auto& paint = aStyle.StyleSVG()->*aFillOrStroke;
  nscolor color;
  switch (paint.kind.tag) {
    case StyleSVGPaintKind::Tag::PaintServer:
      color = paint.fallback.IsColor()
                  ? paint.fallback.AsColor().CalcColor(aStyle)
                  : NS_RGBA(0, 0, 0, 0);
      break;
    case StyleSVGPaintKind::Tag::ContextStroke:
    case StyleSVGPaintKind::Tag::ContextFill:
      color = paint.fallback.IsColor()
                  ? paint.fallback.AsColor().CalcColor(aStyle)
                  : aDefaultContextFallbackColor;
      break;
    default:
      color = paint.kind.AsColor().CalcColor(aStyle);
      break;
  }
  if (const auto* styleIfVisited = aStyle.GetStyleIfVisited()) {
    const auto& paintIfVisited = styleIfVisited->StyleSVG()->*aFillOrStroke;
    // To prevent Web content from detecting if a user has visited a URL
    // (via URL loading triggered by paint servers or performance
    // differences between paint servers or between a paint server and a
    // color), we do not allow whether links are visited to change which
    // paint server is used or switch between paint servers and simple
    // colors.  A :visited style may only override a simple color with
    // another simple color.
    if (paintIfVisited.kind.IsColor() && paint.kind.IsColor()) {
      nscolor colors[2] = {
          color, paintIfVisited.kind.AsColor().CalcColor(*styleIfVisited)};
      return ComputedStyle::CombineVisitedColors(colors,
                                                 aStyle.RelevantLinkVisited());
    }
  }
  return color;
}

/* static */
void SVGUtils::MakeFillPatternFor(nsIFrame* aFrame, gfxContext* aContext,
                                  GeneralPattern* aOutPattern,
                                  imgDrawingParams& aImgParams,
                                  SVGContextPaint* aContextPaint) {
  const nsStyleSVG* style = aFrame->StyleSVG();
  if (style->mFill.kind.IsNone()) {
    return;
  }

  const auto* styleEffects = aFrame->StyleEffects();

  float fillOpacity = GetOpacity(style->mFillOpacity, aContextPaint);
  if (!styleEffects->IsOpaque() && SVGUtils::CanOptimizeOpacity(aFrame)) {
    // Combine the group opacity into the fill opacity (we will have skipped
    // creating an offscreen surface to apply the group opacity).
    fillOpacity *= styleEffects->mOpacity;
  }

  const DrawTarget* dt = aContext->GetDrawTarget();

  SVGPaintServerFrame* ps =
      SVGObserverUtils::GetAndObservePaintServer(aFrame, &nsStyleSVG::mFill);

  if (ps) {
    RefPtr<gfxPattern> pattern =
        ps->GetPaintServerPattern(aFrame, dt, aContext->CurrentMatrixDouble(),
                                  &nsStyleSVG::mFill, fillOpacity, aImgParams);
    if (pattern) {
      pattern->CacheColorStops(dt);
      aOutPattern->Init(*pattern->GetPattern(dt));
      return;
    }
  }

  if (aContextPaint) {
    RefPtr<gfxPattern> pattern;
    switch (style->mFill.kind.tag) {
      case StyleSVGPaintKind::Tag::ContextFill:
        pattern = aContextPaint->GetFillPattern(
            dt, fillOpacity, aContext->CurrentMatrixDouble(), aImgParams);
        break;
      case StyleSVGPaintKind::Tag::ContextStroke:
        pattern = aContextPaint->GetStrokePattern(
            dt, fillOpacity, aContext->CurrentMatrixDouble(), aImgParams);
        break;
      default:;
    }
    if (pattern) {
      aOutPattern->Init(*pattern->GetPattern(dt));
      return;
    }
  }

  if (style->mFill.fallback.IsNone()) {
    return;
  }

  // On failure, use the fallback colour in case we have an
  // objectBoundingBox where the width or height of the object is zero.
  // See http://www.w3.org/TR/SVG11/coords.html#ObjectBoundingBox
  sRGBColor color(sRGBColor::FromABGR(GetFallbackOrPaintColor(
      *aFrame->Style(), &nsStyleSVG::mFill, NS_RGB(0, 0, 0))));
  color.a *= fillOpacity;
  aOutPattern->InitColorPattern(ToDeviceColor(color));
}

/* static */
void SVGUtils::MakeStrokePatternFor(nsIFrame* aFrame, gfxContext* aContext,
                                    GeneralPattern* aOutPattern,
                                    imgDrawingParams& aImgParams,
                                    SVGContextPaint* aContextPaint) {
  const nsStyleSVG* style = aFrame->StyleSVG();
  if (style->mStroke.kind.IsNone()) {
    return;
  }

  const auto* styleEffects = aFrame->StyleEffects();

  float strokeOpacity = GetOpacity(style->mStrokeOpacity, aContextPaint);
  if (!styleEffects->IsOpaque() && SVGUtils::CanOptimizeOpacity(aFrame)) {
    // Combine the group opacity into the stroke opacity (we will have skipped
    // creating an offscreen surface to apply the group opacity).
    strokeOpacity *= styleEffects->mOpacity;
  }

  const DrawTarget* dt = aContext->GetDrawTarget();

  SVGPaintServerFrame* ps =
      SVGObserverUtils::GetAndObservePaintServer(aFrame, &nsStyleSVG::mStroke);

  if (ps) {
    RefPtr<gfxPattern> pattern = ps->GetPaintServerPattern(
        aFrame, dt, aContext->CurrentMatrixDouble(), &nsStyleSVG::mStroke,
        strokeOpacity, aImgParams);
    if (pattern) {
      pattern->CacheColorStops(dt);
      aOutPattern->Init(*pattern->GetPattern(dt));
      return;
    }
  }

  if (aContextPaint) {
    RefPtr<gfxPattern> pattern;
    switch (style->mStroke.kind.tag) {
      case StyleSVGPaintKind::Tag::ContextFill:
        pattern = aContextPaint->GetFillPattern(
            dt, strokeOpacity, aContext->CurrentMatrixDouble(), aImgParams);
        break;
      case StyleSVGPaintKind::Tag::ContextStroke:
        pattern = aContextPaint->GetStrokePattern(
            dt, strokeOpacity, aContext->CurrentMatrixDouble(), aImgParams);
        break;
      default:;
    }
    if (pattern) {
      aOutPattern->Init(*pattern->GetPattern(dt));
      return;
    }
  }

  if (style->mStroke.fallback.IsNone()) {
    return;
  }

  // On failure, use the fallback colour in case we have an
  // objectBoundingBox where the width or height of the object is zero.
  // See http://www.w3.org/TR/SVG11/coords.html#ObjectBoundingBox
  sRGBColor color(sRGBColor::FromABGR(GetFallbackOrPaintColor(
      *aFrame->Style(), &nsStyleSVG::mStroke, NS_RGBA(0, 0, 0, 0))));
  color.a *= strokeOpacity;
  aOutPattern->InitColorPattern(ToDeviceColor(color));
}

/* static */
float SVGUtils::GetOpacity(const StyleSVGOpacity& aOpacity,
                           const SVGContextPaint* aContextPaint) {
  float opacity = 1.0f;
  switch (aOpacity.tag) {
    case StyleSVGOpacity::Tag::Opacity:
      return aOpacity.AsOpacity();
    case StyleSVGOpacity::Tag::ContextFillOpacity:
      if (aContextPaint) {
        opacity = aContextPaint->GetFillOpacity();
      }
      break;
    case StyleSVGOpacity::Tag::ContextStrokeOpacity:
      if (aContextPaint) {
        opacity = aContextPaint->GetStrokeOpacity();
      }
      break;
  }
  return opacity;
}

bool SVGUtils::HasStroke(const nsIFrame* aFrame,
                         const SVGContextPaint* aContextPaint) {
  const nsStyleSVG* style = aFrame->StyleSVG();
  return style->HasStroke() && GetStrokeWidth(aFrame, aContextPaint) > 0;
}

float SVGUtils::GetStrokeWidth(const nsIFrame* aFrame,
                               const SVGContextPaint* aContextPaint) {
  nsIContent* content = aFrame->GetContent();
  if (content->IsText()) {
    content = content->GetParent();
  }

  auto* ctx = SVGElement::FromNode(content);
  return SVGContentUtils::GetStrokeWidth(ctx, aFrame->Style(), aContextPaint);
}

void SVGUtils::SetupStrokeGeometry(nsIFrame* aFrame, gfxContext* aContext,
                                   SVGContextPaint* aContextPaint) {
  MOZ_ASSERT(aFrame->GetContent()->IsSVGElement(), "bad cast");
  SVGContentUtils::AutoStrokeOptions strokeOptions;
  SVGContentUtils::GetStrokeOptions(&strokeOptions,
                                    SVGElement::FromNode(aFrame->GetContent()),
                                    aFrame->Style(), aContextPaint);

  if (strokeOptions.mLineWidth <= 0) {
    return;
  }

  // SVGContentUtils::GetStrokeOptions gets the stroke options in CSS px;
  // convert to device pixels for gfxContext.
  float devPxPerCSSPx = aFrame->PresContext()->CSSToDevPixelScale().scale;

  aContext->SetLineWidth(strokeOptions.mLineWidth * devPxPerCSSPx);
  aContext->SetLineCap(strokeOptions.mLineCap);
  aContext->SetMiterLimit(strokeOptions.mMiterLimit);
  aContext->SetLineJoin(strokeOptions.mLineJoin);
  aContext->SetDash(strokeOptions.mDashPattern, strokeOptions.mDashLength,
                    strokeOptions.mDashOffset, devPxPerCSSPx);
}

uint16_t SVGUtils::GetGeometryHitTestFlags(const nsIFrame* aFrame) {
  uint16_t flags = 0;

  switch (aFrame->Style()->PointerEvents()) {
    case StylePointerEvents::None:
      break;
    case StylePointerEvents::Auto:
    case StylePointerEvents::Visiblepainted:
      if (aFrame->StyleVisibility()->IsVisible()) {
        if (!aFrame->StyleSVG()->mFill.kind.IsNone()) {
          flags = SVG_HIT_TEST_FILL;
        }
        if (!aFrame->StyleSVG()->mStroke.kind.IsNone()) {
          flags |= SVG_HIT_TEST_STROKE;
        }
      }
      break;
    case StylePointerEvents::Visiblefill:
      if (aFrame->StyleVisibility()->IsVisible()) {
        flags = SVG_HIT_TEST_FILL;
      }
      break;
    case StylePointerEvents::Visiblestroke:
      if (aFrame->StyleVisibility()->IsVisible()) {
        flags = SVG_HIT_TEST_STROKE;
      }
      break;
    case StylePointerEvents::Visible:
      if (aFrame->StyleVisibility()->IsVisible()) {
        flags = SVG_HIT_TEST_FILL | SVG_HIT_TEST_STROKE;
      }
      break;
    case StylePointerEvents::Painted:
      if (!aFrame->StyleSVG()->mFill.kind.IsNone()) {
        flags = SVG_HIT_TEST_FILL;
      }
      if (!aFrame->StyleSVG()->mStroke.kind.IsNone()) {
        flags |= SVG_HIT_TEST_STROKE;
      }
      break;
    case StylePointerEvents::Fill:
      flags = SVG_HIT_TEST_FILL;
      break;
    case StylePointerEvents::Stroke:
      flags = SVG_HIT_TEST_STROKE;
      break;
    case StylePointerEvents::All:
      flags = SVG_HIT_TEST_FILL | SVG_HIT_TEST_STROKE;
      break;
    default:
      NS_ERROR("not reached");
      break;
  }

  return flags;
}

void SVGUtils::PaintSVGGlyph(Element* aElement, gfxContext* aContext) {
  nsIFrame* frame = aElement->GetPrimaryFrame();
  ISVGDisplayableFrame* svgFrame = do_QueryFrame(frame);
  if (!svgFrame) {
    return;
  }
  gfxMatrix m;
  if (frame->GetContent()->IsSVGElement()) {
    // PaintSVG() expects the passed transform to be the transform to its own
    // SVG user space, so we need to account for any 'transform' attribute:
    m = SVGUtils::GetTransformMatrixInUserSpace(frame);
  }

  // SVG-in-OpenType is not allowed to paint external resources, so we can
  // just pass a dummy params into PatintSVG.
  imgDrawingParams dummy;
  svgFrame->PaintSVG(*aContext, m, dummy);
}

bool SVGUtils::GetSVGGlyphExtents(const Element* aElement,
                                  const gfxMatrix& aSVGToAppSpace,
                                  gfxRect* aResult) {
  nsIFrame* frame = aElement->GetPrimaryFrame();
  ISVGDisplayableFrame* svgFrame = do_QueryFrame(frame);
  if (!svgFrame) {
    return false;
  }

  gfxMatrix transform(aSVGToAppSpace);
  if (auto* svg = SVGElement::FromNode(frame->GetContent())) {
    transform = svg->PrependLocalTransformsTo(aSVGToAppSpace);
  }

  *aResult =
      svgFrame
          ->GetBBoxContribution(gfx::ToMatrix(transform),
                                SVGUtils::eBBoxIncludeFill |
                                    SVGUtils::eBBoxIncludeFillGeometry |
                                    SVGUtils::eBBoxIncludeStroke |
                                    SVGUtils::eBBoxIncludeStrokeGeometry |
                                    SVGUtils::eBBoxIncludeMarkers)
          .ToThebesRect();
  return true;
}

nsRect SVGUtils::ToCanvasBounds(const gfxRect& aUserspaceRect,
                                const gfxMatrix& aToCanvas,
                                const nsPresContext* presContext) {
  return nsLayoutUtils::RoundGfxRectToAppRect(
      aToCanvas.TransformBounds(aUserspaceRect),
      presContext->AppUnitsPerDevPixel());
}

gfxMatrix SVGUtils::GetCSSPxToDevPxMatrix(const nsIFrame* aNonSVGFrame) {
  float devPxPerCSSPx = aNonSVGFrame->PresContext()->CSSToDevPixelScale().scale;

  return gfxMatrix(devPxPerCSSPx, 0.0, 0.0, devPxPerCSSPx, 0.0, 0.0);
}

gfxMatrix SVGUtils::GetTransformMatrixInUserSpace(const nsIFrame* aFrame) {
  // We check element instead of aFrame directly because SVG element
  // may have non-SVG frame, <tspan> for example.
  MOZ_ASSERT(aFrame->GetContent() && aFrame->GetContent()->IsSVGElement(),
             "Only use this wrapper for SVG elements");

  if (!aFrame->IsTransformed()) {
    return {};
  }

  nsStyleTransformMatrix::TransformReferenceBox refBox(aFrame);
  nsDisplayTransform::FrameTransformProperties properties{
      aFrame, refBox, AppUnitsPerCSSPixel()};

  // SVG elements can have x/y offset, their default transform origin
  // is the origin of user space, not the top left point of the frame.
  Point3D svgTransformOrigin{
      properties.mToTransformOrigin.x - CSSPixel::FromAppUnits(refBox.X()),
      properties.mToTransformOrigin.y - CSSPixel::FromAppUnits(refBox.Y()),
      properties.mToTransformOrigin.z};

  Matrix svgTransform;
  Matrix4x4 trans;
  (void)aFrame->IsSVGTransformed(&svgTransform);

  if (properties.HasTransform()) {
    trans = nsStyleTransformMatrix::ReadTransforms(
        properties.mTranslate, properties.mRotate, properties.mScale,
        properties.mMotion.ptrOr(nullptr), properties.mTransform, refBox,
        AppUnitsPerCSSPixel());
  } else {
    trans = Matrix4x4::From2D(svgTransform);
  }

  trans.ChangeBasis(svgTransformOrigin);

  Matrix mm;
  trans.ProjectTo2D();
  (void)trans.CanDraw2D(&mm);

  return ThebesMatrix(mm);
}

}  // namespace mozilla
