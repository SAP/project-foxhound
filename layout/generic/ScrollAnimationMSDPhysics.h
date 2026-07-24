/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_layout_ScrollAnimationMSDPhysics_h_
#define mozilla_layout_ScrollAnimationMSDPhysics_h_

#include "ScrollAnimationPhysics.h"
#include "mozilla/layers/APZPublicUtils.h"
#include "mozilla/layers/AxisPhysicsMSDModel.h"

namespace mozilla {

// This class implements a cubic MSD timing function and automatically
// adapts the animation duration based on the scrolling rate.
class ScrollAnimationMSDPhysics final : public ScrollAnimationPhysics {
 public:
  using AxisPhysicsMSDModel = mozilla::layers::AxisPhysicsMSDModel;
  using ScrollAnimationKind = mozilla::layers::apz::ScrollAnimationKind;

  explicit ScrollAnimationMSDPhysics(ScrollAnimationKind aAnimationKind,
                                     const nsPoint& aStartPos,
                                     nscoord aSmallestVisibleIncrement);

  void Update(const TimeStamp& aTime, const nsPoint& aDestination,
              const nsSize& aCurrentVelocity) override;

  void ApplyContentShift(const CSSPoint& aShiftDelta) override;

  // Get the velocity at a point in time in nscoords/sec.
  nsSize VelocityAt(const TimeStamp& aTime) override;

  // Returns the expected scroll position at a given point in time, in app
  // units, relative to the scroll frame.
  nsPoint PositionAt(const TimeStamp& aTime) override;

  bool IsFinished(const TimeStamp& aTime) override;

 protected:
  // A wrapper around AxisPhysicsMSDModel which takes additional steps to avoid
  // oscillating motion.
  class NonOscillatingAxisPhysicsMSDModel : public AxisPhysicsMSDModel {
   public:
    NonOscillatingAxisPhysicsMSDModel(double aInitialPosition,
                                      double aInitialDestination,
                                      double aInitialVelocity,
                                      double aSpringConstant,
                                      double aDampingRatio);
  };

  double ComputeSpringConstant(const TimeStamp& aTime);
  double GetDampingRatio() const;
  void SimulateUntil(const TimeStamp& aTime);

  ScrollAnimationKind mAnimationKind;
  nscoord mSmallestVisibleIncrement;

  TimeStamp mPreviousEventTime;
  TimeDuration mPreviousDelta;

  TimeStamp mStartTime;

  nsPoint mStartPos;
  nsPoint mDestination;
  TimeStamp mLastSimulatedTime;
  NonOscillatingAxisPhysicsMSDModel mModelX;
  NonOscillatingAxisPhysicsMSDModel mModelY;
  bool mIsFirstIteration;
};

}  // namespace mozilla

#endif  // mozilla_layout_ScrollAnimationMSDPhysics_h_
