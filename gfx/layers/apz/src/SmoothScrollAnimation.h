/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_layers_SmoothScrollAnimation_h_
#define mozilla_layers_SmoothScrollAnimation_h_

#include "AsyncPanZoomAnimation.h"
#include "InputData.h"
#include "ScrollPositionUpdate.h"
#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/RelativeTo.h"
#include "mozilla/ScrollOrigin.h"
#include "mozilla/layers/APZPublicUtils.h"
#include "mozilla/layers/KeyboardScrollAction.h"

namespace mozilla {

class ScrollAnimationPhysics;

namespace layers {

class AsyncPanZoomController;

class SmoothScrollAnimation : public AsyncPanZoomAnimation {
 public:
  using ScrollAnimationKind = apz::ScrollAnimationKind;

  // Create a SmoothScrollAnimation of kind Smooth or SmoothMsd.
  // The origin is ignored for SmoothMsd animations.
  static already_AddRefed<SmoothScrollAnimation> Create(
      AsyncPanZoomController& aApzc, ScrollAnimationKind aKind,
      ViewportType aViewportToScroll, ScrollOrigin aOrigin);
  // Create a SmoothScrollAnimation of kind Keyboard.
  static already_AddRefed<SmoothScrollAnimation> CreateForKeyboard(
      AsyncPanZoomController& aApzc, ScrollOrigin aOrigin);
  // Create a SmoothScrollAnimation of kind Wheel.
  static already_AddRefed<SmoothScrollAnimation> CreateForWheel(
      AsyncPanZoomController& aApzc,
      ScrollWheelInput::ScrollDeltaType aDeltaType);

  void UpdateDestinationAndSnapTargets(
      TimeStamp aTime, const nsPoint& aDestination,
      const nsSize& aCurrentVelocity, ScrollSnapTargetIds&& aSnapTargetIds,
      ScrollTriggeredByScript aTriggeredByScript);

  SmoothScrollAnimation* AsSmoothScrollAnimation() override;
  bool WasTriggeredByScript() const override {
    return mTriggeredByScript == ScrollTriggeredByScript::Yes;
  }
  ScrollAnimationKind Kind() const { return mKind; }
  ViewportType ViewportToScroll() const { return mViewportToScroll; }
  ScrollSnapTargetIds TakeSnapTargetIds() { return std::move(mSnapTargetIds); }
  ScrollOrigin GetScrollOrigin() const;
  static ScrollOrigin GetScrollOriginForAction(
      KeyboardScrollAction::KeyboardScrollActionType aAction);

  bool DoSample(FrameMetrics& aFrameMetrics,
                const TimeDuration& aDelta) override;

  bool HandleScrollOffsetUpdate(const Maybe<CSSPoint>& aRelativeDelta) override;

  void UpdateDelta(TimeStamp aTime, const nsPoint& aDelta,
                   const nsSize& aCurrentVelocity);
  void UpdateDestination(TimeStamp aTime, const nsPoint& aDestination,
                         const nsSize& aCurrentVelocity);

  CSSPoint GetDestination() const {
    return CSSPoint::FromAppUnits(mFinalDestination);
  }

  // If we need to perform an animation of the same kind and the specified
  // parameters, can we extend this existing animation?
  bool CanExtend(ViewportType aViewportToScroll, ScrollOrigin aOrigin) const;

 private:
  SmoothScrollAnimation(ScrollAnimationKind aKind,
                        AsyncPanZoomController& aApzc,
                        ViewportType aViewportToScroll, ScrollOrigin aOrigin);

  void Update(TimeStamp aTime, const nsSize& aCurrentVelocity);
  CSSPoint GetViewportOffset(const FrameMetrics& aMetrics) const;

  ScrollAnimationKind mKind;
  // Whether the animation is scroling the visual viewport or the layout
  // viewport.
  ViewportType mViewportToScroll;
  AsyncPanZoomController& mApzc;
  UniquePtr<ScrollAnimationPhysics> mAnimationPhysics;
  nsPoint mFinalDestination;
  // If a direction is forced to overscroll, it means it's axis in that
  // direction is locked, and scroll in that direction is treated as overscroll
  // of an equal amount, which, for example, may then bubble up a scroll action
  // to its parent, or may behave as whatever an overscroll occurence requires
  // to behave
  Maybe<ScrollDirection> mDirectionForcedToOverscroll;
  ScrollOrigin mOrigin;

  // These fields are only used for animations of kind Smooth and SmoothMsd.
  ScrollSnapTargetIds mSnapTargetIds;
  ScrollTriggeredByScript mTriggeredByScript;
};

}  // namespace layers
}  // namespace mozilla

#endif  // mozilla_layers_SmoothScrollAnimation_h_
