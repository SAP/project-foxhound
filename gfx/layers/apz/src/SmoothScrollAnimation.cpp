/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SmoothScrollAnimation.h"
#include "AsyncPanZoomController.h"
#include "ScrollAnimationBezierPhysics.h"
#include "ScrollAnimationMSDPhysics.h"
#include "ScrollPositionUpdate.h"
#include "Units.h"
#include "mozilla/RelativeTo.h"
#include "mozilla/StaticPrefs_general.h"
#include "nsLayoutUtils.h"

static mozilla::LazyLogModule sApzScrollAnimLog("apz.scrollanimation");
#define SSA_LOG(...) MOZ_LOG(sApzScrollAnimLog, LogLevel::Debug, (__VA_ARGS__))

namespace mozilla {
namespace layers {

/*static*/
already_AddRefed<SmoothScrollAnimation> SmoothScrollAnimation::Create(
    AsyncPanZoomController& aApzc, ScrollAnimationKind aKind,
    ViewportType aViewportToScroll, ScrollOrigin aOrigin) {
  MOZ_ASSERT(aKind == ScrollAnimationKind::Smooth ||
             aKind == ScrollAnimationKind::SmoothMsd);
  RefPtr<SmoothScrollAnimation> result =
      new SmoothScrollAnimation(aKind, aApzc, aViewportToScroll, aOrigin);
  return result.forget();
}

/*static*/
already_AddRefed<SmoothScrollAnimation>
SmoothScrollAnimation::CreateForKeyboard(AsyncPanZoomController& aApzc,
                                         ScrollOrigin aOrigin) {
  RefPtr<SmoothScrollAnimation> result = new SmoothScrollAnimation(
      ScrollAnimationKind::Keyboard, aApzc, ViewportType::Visual, aOrigin);
  return result.forget();
}

static ScrollOrigin OriginForDeltaType(
    ScrollWheelInput::ScrollDeltaType aDeltaType) {
  switch (aDeltaType) {
    case ScrollWheelInput::SCROLLDELTA_PAGE:
      return ScrollOrigin::Pages;
    case ScrollWheelInput::SCROLLDELTA_PIXEL:
      return ScrollOrigin::Pixels;
    case ScrollWheelInput::SCROLLDELTA_LINE:
      return ScrollOrigin::MouseWheel;
  }
  // Shouldn't happen, pick a default.
  return ScrollOrigin::MouseWheel;
}

/*static*/
already_AddRefed<SmoothScrollAnimation> SmoothScrollAnimation::CreateForWheel(
    AsyncPanZoomController& aApzc,
    ScrollWheelInput::ScrollDeltaType aDeltaType) {
  RefPtr<SmoothScrollAnimation> result = new SmoothScrollAnimation(
      ScrollAnimationKind::Wheel, aApzc, ViewportType::Visual,
      OriginForDeltaType(aDeltaType));
  MOZ_ASSERT(nsLayoutUtils::IsSmoothScrollingEnabled(),
             "We shouldn't be creating a WheelScrollAnimation if smooth "
             "scrolling is disabled");
  result->mDirectionForcedToOverscroll =
      aApzc.mScrollMetadata.GetDisregardedDirection();
  return result.forget();
}

SmoothScrollAnimation::SmoothScrollAnimation(ScrollAnimationKind aKind,
                                             AsyncPanZoomController& aApzc,
                                             ViewportType aViewportToScroll,
                                             ScrollOrigin aOrigin)
    : mKind(aKind),
      mViewportToScroll(aViewportToScroll),
      mApzc(aApzc),
      mFinalDestination(
          CSSPoint::ToAppUnits(GetViewportOffset(aApzc.Metrics()))),
      mOrigin(aOrigin),
      mTriggeredByScript(ScrollTriggeredByScript::No) {
  // ScrollAnimationBezierPhysics (despite its name) handles the case of
  // general.smoothScroll being disabled whereas ScrollAnimationMSDPhysics does
  // not (ie it scrolls smoothly).
  if (mKind == ScrollAnimationKind::SmoothMsd ||
      (nsLayoutUtils::IsSmoothScrollingEnabled() &&
       StaticPrefs::general_smoothScroll_msdPhysics_enabled())) {
    nscoord smallestVisibleIncrement = 1;
    if (mKind == ScrollAnimationKind::SmoothMsd &&
        mApzc.GetFrameMetrics().GetZoom() != CSSToParentLayerScale(0)) {
      // SmoothMsdScrollAnimation used 1 ParentLayer pixel as the "smallest
      // visible increment". Note that we are passing quantities (such as the
      // destination) to ScrollAnimationMSDPhysics in app units, so the
      // increment needs to be converted to app units as well.
      smallestVisibleIncrement = CSSPixel::ToAppUnits(
          ParentLayerCoord(1) / mApzc.GetFrameMetrics().GetZoom());
    }
    mAnimationPhysics = MakeUnique<ScrollAnimationMSDPhysics>(
        mKind, mFinalDestination, smallestVisibleIncrement);
  } else {
    mAnimationPhysics = MakeUnique<ScrollAnimationBezierPhysics>(
        mFinalDestination,
        apz::ComputeBezierAnimationSettingsForOrigin(aOrigin));
  }
}

bool SmoothScrollAnimation::CanExtend(ViewportType aViewportToScroll,
                                      ScrollOrigin aOrigin) const {
  MOZ_ASSERT(mKind == ScrollAnimationKind::Smooth ||
             mKind == ScrollAnimationKind::SmoothMsd);
  // The viewport type must always match.
  if (aViewportToScroll != mViewportToScroll) {
    return false;
  }
  if (mKind == ScrollAnimationKind::SmoothMsd) {
    // We do not track the origin of SmoothMsd animations, so
    // always allow extending.
    return true;
  }
  // Otherwise, the origin must match.
  return aOrigin == mOrigin;
}

SmoothScrollAnimation* SmoothScrollAnimation::AsSmoothScrollAnimation() {
  return this;
}

void SmoothScrollAnimation::UpdateDestinationAndSnapTargets(
    TimeStamp aTime, const nsPoint& aDestination,
    const nsSize& aCurrentVelocity, ScrollSnapTargetIds&& aSnapTargetIds,
    ScrollTriggeredByScript aTriggeredByScript) {
  UpdateDestination(aTime, aDestination, aCurrentVelocity);
  mSnapTargetIds = std::move(aSnapTargetIds);
  mTriggeredByScript = aTriggeredByScript;
}

ScrollOrigin SmoothScrollAnimation::GetScrollOrigin() const { return mOrigin; }

ScrollOrigin SmoothScrollAnimation::GetScrollOriginForAction(
    KeyboardScrollAction::KeyboardScrollActionType aAction) {
  switch (aAction) {
    case KeyboardScrollAction::eScrollCharacter:
    case KeyboardScrollAction::eScrollLine: {
      return ScrollOrigin::Lines;
    }
    case KeyboardScrollAction::eScrollPage:
      return ScrollOrigin::Pages;
    case KeyboardScrollAction::eScrollComplete:
      return ScrollOrigin::Other;
    default:
      MOZ_ASSERT(false, "Unknown keyboard scroll action type");
      return ScrollOrigin::Other;
  }
}

void SmoothScrollAnimation::UpdateDelta(TimeStamp aTime, const nsPoint& aDelta,
                                        const nsSize& aCurrentVelocity) {
  mFinalDestination += aDelta;

  Update(aTime, aCurrentVelocity);
}

void SmoothScrollAnimation::UpdateDestination(TimeStamp aTime,
                                              const nsPoint& aDestination,
                                              const nsSize& aCurrentVelocity) {
  mFinalDestination = aDestination;

  Update(aTime, aCurrentVelocity);
}

void SmoothScrollAnimation::Update(TimeStamp aTime,
                                   const nsSize& aCurrentVelocity) {
  // Clamp the final destination to the scrollable area.
  CSSPoint clamped = CSSPoint::FromAppUnits(mFinalDestination);
  clamped.x = mApzc.mX.ClampOriginToScrollableRect(clamped.x);
  clamped.y = mApzc.mY.ClampOriginToScrollableRect(clamped.y);
  mFinalDestination = CSSPoint::ToAppUnits(clamped);

  mAnimationPhysics->Update(aTime, mFinalDestination, aCurrentVelocity);
}

CSSPoint SmoothScrollAnimation::GetViewportOffset(
    const FrameMetrics& aMetrics) const {
  return mViewportToScroll == ViewportType::Visual
             ? aMetrics.GetVisualScrollOffset()
             : aMetrics.GetLayoutScrollOffset();
}

bool SmoothScrollAnimation::DoSample(FrameMetrics& aFrameMetrics,
                                     const TimeDuration& aDelta) {
  TimeStamp now = mApzc.GetFrameTime().Time();
  CSSToParentLayerScale zoom(aFrameMetrics.GetZoom());
  if (zoom == CSSToParentLayerScale(0)) {
    return false;
  }

  // If the animation is finished, make sure the final position is correct by
  // using one last displacement. Otherwise, compute the delta via the timing
  // function as normal.
  bool finished = mAnimationPhysics->IsFinished(now);
  nsPoint sampledDest = mAnimationPhysics->PositionAt(now);
  const CSSPoint cssDisplacement =
      CSSPoint::FromAppUnits(sampledDest) - GetViewportOffset(aFrameMetrics);

  if (finished) {
    mApzc.mX.SetVelocity(0);
    mApzc.mY.SetVelocity(0);
  } else if (!IsZero(cssDisplacement)) {
    // Convert velocity from AppUnits/Seconds to ParentLayerCoords/Milliseconds
    nsSize velocity = mAnimationPhysics->VelocityAt(now);
    ParentLayerPoint velocityPL =
        CSSPoint::FromAppUnits(nsPoint(velocity.width, velocity.height)) * zoom;
    mApzc.mX.SetVelocity(velocityPL.x / 1000.0);
    mApzc.mY.SetVelocity(velocityPL.y / 1000.0);
  }
  if (mViewportToScroll == ViewportType::Visual) {
    // Note: we ignore overscroll for generic animations.
    const ParentLayerPoint displacement = cssDisplacement * zoom;
    ParentLayerPoint adjustedOffset, overscroll;
    mApzc.mX.AdjustDisplacement(
        displacement.x, adjustedOffset.x, overscroll.x,
        mDirectionForcedToOverscroll == Some(ScrollDirection::eHorizontal));
    mApzc.mY.AdjustDisplacement(
        displacement.y, adjustedOffset.y, overscroll.y,
        mDirectionForcedToOverscroll == Some(ScrollDirection::eVertical));
    // If we expected to scroll, but there's no more scroll range on either
    // axis, then end the animation early. Note that the initial displacement
    // could be 0 if the compositor ran very quickly (<1ms) after the animation
    // was created. When that happens we want to make sure the animation
    // continues.
    SSA_LOG(
        "Sampling SmoothScrollAnimation (visual mode): time %f finished %d "
        "sampledDest %s adjustedOffset %s overscroll %s",
        (now - TimeStamp::ProcessCreation()).ToMilliseconds(), finished,
        ToString(CSSPoint::FromAppUnits(sampledDest)).c_str(),
        ToString(adjustedOffset).c_str(), ToString(overscroll).c_str());
    if (!IsZero(cssDisplacement) && IsZero(adjustedOffset / zoom)) {
      // Nothing more to do - end the animation.
      finished = true;
    } else {
      mApzc.ScrollBy(adjustedOffset / zoom);
    }
  } else {
    // Use a slightly simplified implementation for ViewportType::Layout.
    // For example, we don't need to handle mDirectionForcedToOverscroll in this
    // case.
    MOZ_ASSERT(mDirectionForcedToOverscroll.isNothing());
    MOZ_ASSERT(!mApzc.IsPhysicallyOverscrolled());
    CSSPoint offsetBefore = GetViewportOffset(aFrameMetrics);
    mApzc.ScrollByAndClamp(mViewportToScroll, cssDisplacement);
    CSSPoint offsetAfter = GetViewportOffset(aFrameMetrics);
    CSSPoint amountScrolled = offsetAfter - offsetBefore;
    if (!IsZero(cssDisplacement) && IsZero(amountScrolled)) {
      finished = true;
    }
    SSA_LOG(
        "Sampling SmoothScrollAnimation (layout mode): time %f finished %d "
        "sampledDest %s offsetAfter %s\n",
        (now - TimeStamp::ProcessCreation()).ToMilliseconds(), finished,
        ToString(CSSPoint::FromAppUnits(sampledDest)).c_str(),
        ToString(offsetAfter).c_str());
  }
  if (finished) {
    // Set the scroll offset to the exact destination. If we allow the scroll
    // offset to end up being a bit off from the destination, we can get
    // artefacts like "scroll to the next snap point in this direction"
    // scrolling to the snap point we're already supposed to be at.
    mApzc.ScrollToAndClamp(mViewportToScroll,
                           CSSPoint::FromAppUnits(mFinalDestination));
  }
  return !finished;
}

bool SmoothScrollAnimation::HandleScrollOffsetUpdate(
    const Maybe<CSSPoint>& aRelativeDelta) {
  if (aRelativeDelta) {
    mAnimationPhysics->ApplyContentShift(*aRelativeDelta);
    mFinalDestination += CSSPoint::ToAppUnits(*aRelativeDelta);
    return true;
  }
  return false;
}

}  // namespace layers
}  // namespace mozilla
