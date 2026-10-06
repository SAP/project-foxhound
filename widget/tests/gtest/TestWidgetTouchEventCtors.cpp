/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"
#include "mozilla/TouchEvents.h"
#include "mozilla/dom/MouseEventBinding.h"
#include "TestWidgetEventCtors.h"

namespace mozilla {

/**
 * WidgetSimpleGestureEvent and WidgetTouchEvent have user-defined copy
 * constructor which do not use the base class's copy constructor. Therefore,
 * some base classes' members are not assigned to the new copy.
 */

TEST(WidgetTouchEventCtorTests, WidgetSimpleGestureEvent)
{
  WidgetSimpleGestureEvent origin(true, eSwipeGesture, nullptr);
  // WidgetEvent
  origin.mRefPoint = {1, 1};
  origin.mFlags.mHandledByAPZ = true;
  // WidgetInputEvent
  origin.mModifiers = Modifier::MODIFIER_NUMLOCK;
  // WidgetMouseEventBase
  origin.mPressure = 0.4f;
  origin.mButton = MouseButton::eMiddle;
  origin.mButtons = MouseButtonsFlag::eMiddleFlag;
  origin.mInputSource = dom::MouseEvent_Binding::MOZ_SOURCE_TOUCH;
  // WidgetSimpleGestureEvent
  origin.mAllowedDirections = 1;
  origin.mDirection = 2;
  origin.mClickCount = 3;  // Should be reset to 0 by the copy constructor
  origin.mDelta = 1.5;
  {
    WidgetSimpleGestureEvent copy(origin);
    EXPECT_EQ(copy.mMessage, origin.mMessage) << "CopyCtor: mMessage";
    EXPECT_EQ(copy.mClass, origin.mClass) << "CopyCtor: mClass";
    EXPECT_EQ(copy.mRefPoint, LayoutDeviceIntPoint(0, 0))
        << "CopyCtor: mRefPoint";
    EXPECT_NE(copy.mRefPoint, origin.mRefPoint) << "CopyCtor: mRefPoint";
    EXPECT_EQ(copy.mFlags.mHandledByAPZ, false)
        << "CopyCtor: mFlags.mHandledByAPZ";
    EXPECT_NE(copy.mFlags.mHandledByAPZ, origin.mFlags.mHandledByAPZ)
        << "CopyCtor: mFlags.mHandledByAPZ";
    EXPECT_EQ(copy.mModifiers, 0u) << "CopyCtor: mModifiers";
    EXPECT_NE(copy.mModifiers, origin.mModifiers) << "CopyCtor: mModifiers";
    EXPECT_EQ(copy.mPressure, 0.0f) << "CopyCtor: mPressure";
    EXPECT_NE(copy.mPressure, origin.mPressure) << "CopyCtor: mPressure";
    EXPECT_EQ(copy.mButton, MouseButton::ePrimary) << "CopyCtor: mButton";
    EXPECT_NE(copy.mButton, origin.mButton) << "CopyCtor: mButton";
    EXPECT_EQ(copy.mButtons, MouseButtonsFlag::eNoButtons)
        << "CopyCtor: mButtons";
    EXPECT_NE(copy.mButtons, origin.mButtons) << "CopyCtor: mButtons";
    EXPECT_EQ(copy.mInputSource, dom::MouseEvent_Binding::MOZ_SOURCE_MOUSE)
        << "CopyCtor: mInputSource";
    EXPECT_NE(copy.mInputSource, origin.mInputSource)
        << "CopyCtor: mInputSource";
    EXPECT_EQ(copy.mAllowedDirections, origin.mAllowedDirections)
        << "CopyCtor: mAllowedDirections";
    EXPECT_EQ(copy.mDirection, origin.mDirection) << "CopyCtor: mDirection";
    EXPECT_EQ(copy.mClickCount, 0u) << "CopyCtor: mClickCount";
    EXPECT_NE(copy.mClickCount, origin.mClickCount) << "CopyCtor: mClickCount";
    EXPECT_EQ(copy.mDelta, origin.mDelta) << "CopyCtor: mDelta";
  }
  {
    WidgetSimpleGestureEvent assigned(true, eSwipeGesture, nullptr);
    assigned = origin;
    EXPECT_EQ(assigned.mMessage, origin.mMessage)
        << "Assignment(Copy): mMessage";
    EXPECT_EQ(assigned.mClass, origin.mClass) << "Assignment(Copy): mClass";
    EXPECT_EQ(assigned.mRefPoint, origin.mRefPoint)
        << "Assignment(Copy): mRefPoint";
    EXPECT_EQ(assigned.mFlags.mHandledByAPZ, origin.mFlags.mHandledByAPZ)
        << "Assignment(Copy): mFlags.mHandledByAPZ";
    EXPECT_EQ(assigned.mModifiers, origin.mModifiers)
        << "Assignment(Copy): mModifiers";
    EXPECT_EQ(assigned.mPressure, origin.mPressure)
        << "Assignment(Copy): mPressure";
    EXPECT_EQ(assigned.mButton, origin.mButton) << "Assignment(Copy): mButton";
    EXPECT_EQ(assigned.mButtons, origin.mButtons)
        << "Assignment(Copy): mButtons";
    EXPECT_EQ(assigned.mInputSource, origin.mInputSource)
        << "Assignment(Copy): mInputSource";
    EXPECT_EQ(assigned.mAllowedDirections, origin.mAllowedDirections)
        << "Assignment(Copy): mAllowedDirections";
    EXPECT_EQ(assigned.mDirection, origin.mDirection)
        << "Assignment(Copy): mDirection";
    EXPECT_EQ(assigned.mClickCount, origin.mClickCount)
        << "Assignment(Copy): mClickCount";
    EXPECT_EQ(assigned.mDelta, origin.mDelta) << "Assignment(Copy): mDelta";
  }
  {
    WidgetSimpleGestureEvent move(std::move(origin));
    EXPECT_EQ(move.mMessage, origin.mMessage) << "MoveCtor: mMessage";
    EXPECT_EQ(move.mClass, origin.mClass) << "MoveCtor: mClass";
    EXPECT_EQ(move.mRefPoint, LayoutDeviceIntPoint(0, 0))
        << "MoveCtor: mRefPoint";
    EXPECT_NE(move.mRefPoint, origin.mRefPoint) << "MoveCtor: mRefPoint";
    EXPECT_EQ(move.mFlags.mHandledByAPZ, false)
        << "MoveCtor: mFlags.mHandledByAPZ";
    EXPECT_NE(move.mFlags.mHandledByAPZ, origin.mFlags.mHandledByAPZ)
        << "MoveCtor: mFlags.mHandledByAPZ";
    EXPECT_EQ(move.mModifiers, 0u) << "MoveCtor: mModifiers";
    EXPECT_NE(move.mModifiers, origin.mModifiers) << "MoveCtor: mModifiers";
    EXPECT_EQ(move.mPressure, 0.0f) << "MoveCtor: mPressure";
    EXPECT_NE(move.mPressure, origin.mPressure) << "MoveCtor: mPressure";
    EXPECT_EQ(move.mButton, MouseButton::ePrimary) << "MoveCtor: mButton";
    EXPECT_NE(move.mButton, origin.mButton) << "MoveCtor: mButton";
    EXPECT_EQ(move.mButtons, MouseButtonsFlag::eNoButtons)
        << "MoveCtor: mButtons";
    EXPECT_NE(move.mButtons, origin.mButtons) << "MoveCtor: mButtons";
    EXPECT_EQ(move.mInputSource, dom::MouseEvent_Binding::MOZ_SOURCE_MOUSE)
        << "MoveCtor: mInputSource";
    EXPECT_NE(move.mInputSource, origin.mInputSource)
        << "MoveCtor: mInputSource";
    EXPECT_EQ(move.mAllowedDirections, origin.mAllowedDirections)
        << "MoveCtor: mAllowedDirections";
    EXPECT_EQ(move.mDirection, origin.mDirection) << "MoveCtor: mDirection";
    EXPECT_EQ(move.mClickCount, 0u) << "MoveCtor: mClickCount";
    EXPECT_NE(move.mClickCount, origin.mClickCount) << "MoveCtor: mClickCount";
    EXPECT_EQ(move.mDelta, origin.mDelta) << "MoveCtor: mDelta";
  }
  {
    WidgetSimpleGestureEvent originToBeMoved(true, eSwipeGesture, nullptr);
    CompletelyCopy(origin, originToBeMoved);

    WidgetSimpleGestureEvent assigned(true, eSwipeGestureEnd, nullptr);
    assigned = std::move(originToBeMoved);
    EXPECT_EQ(assigned.mMessage, origin.mMessage)
        << "Assignment(Move): mMessage";
    EXPECT_EQ(assigned.mClass, origin.mClass) << "Assignment(Move): mClass";
    EXPECT_EQ(assigned.mRefPoint, origin.mRefPoint)
        << "Assignment(Move): mRefPoint";
    EXPECT_EQ(assigned.mFlags.mHandledByAPZ, origin.mFlags.mHandledByAPZ)
        << "Assignment(Move): mFlags.mHandledByAPZ";
    EXPECT_EQ(assigned.mModifiers, origin.mModifiers)
        << "Assignment(Move): mModifiers";
    EXPECT_EQ(assigned.mPressure, origin.mPressure)
        << "Assignment(Move): mPressure";
    EXPECT_EQ(assigned.mButton, origin.mButton) << "Assignment(Move): mButton";
    EXPECT_EQ(assigned.mButtons, origin.mButtons)
        << "Assignment(Move): mButtons";
    EXPECT_EQ(assigned.mInputSource, origin.mInputSource)
        << "Assignment(Move): mInputSource";
    EXPECT_EQ(assigned.mAllowedDirections, origin.mAllowedDirections)
        << "Assignment(Move): mAllowedDirections";
    EXPECT_EQ(assigned.mDirection, origin.mDirection)
        << "Assignment(Move): mDirection";
    EXPECT_EQ(assigned.mClickCount, origin.mClickCount)
        << "Assignment(Move): mClickCount";
    EXPECT_EQ(assigned.mDelta, origin.mDelta) << "Assignment(Move): mDelta";
  }
}

TEST(WidgetTouchEventCtorTests, WidgetTouchEvent)
{
  WidgetTouchEvent origin(true, eTouchStart, nullptr);
  // WidgetEvent
  origin.mRefPoint = {1, 1};
  origin.mFlags.mCancelable =
      false;  // should be defaulted to true by the copy constructor
  origin.mFlags.mHandledByAPZ =
      true;  // should be copied by the copy constructor
  // WidgetInputEvent
  origin.mModifiers = Modifier::MODIFIER_NUMLOCK;
  // WidgetTouchEvent
  origin.mButton = MouseButton::eMiddle;
  origin.mButtons = MouseButtonsFlag::eMiddleFlag;
  origin.mInputSource = dom::MouseEvent_Binding::MOZ_SOURCE_MOUSE;
  origin.mCallbackId = Some(256);
  auto touch = MakeRefPtr<dom::Touch>(3, LayoutDeviceIntPoint{0, 0},
                                      LayoutDeviceIntPoint{1, 1}, 0.0f, 0.5f);
  origin.mTouches.AppendElement(touch);
  {
    WidgetTouchEvent copy(origin);
    EXPECT_EQ(copy.mMessage, origin.mMessage) << "CopyCtor: mMessage";
    EXPECT_EQ(copy.mClass, origin.mClass) << "CopyCtor: mClass";
    EXPECT_EQ(copy.mRefPoint, LayoutDeviceIntPoint(0, 0))
        << "CopyCtor: mRefPoint";
    EXPECT_NE(copy.mRefPoint, origin.mRefPoint) << "CopyCtor: mRefPoint";
    EXPECT_EQ(copy.mFlags.mCancelable, true) << "CopyCtor: mFlags.mCancelable";
    EXPECT_NE(copy.mFlags.mCancelable, origin.mFlags.mCancelable)
        << "CopyCtor: mFlags.mCancelable";
    EXPECT_EQ(copy.mFlags.mHandledByAPZ, origin.mFlags.mHandledByAPZ)
        << "CopyCtor: mFlags.mHandledByAPZ";
    EXPECT_EQ(copy.mModifiers, origin.mModifiers) << "CopyCtor: mModifiers";
    EXPECT_EQ(copy.mTouches.Length(), origin.mTouches.Length())
        << "CopyCtor: mTouches.Length()";
    EXPECT_EQ(copy.mTouches.SafeElementAt(0), touch) << "CopyCtor: mTouches[0]";
    EXPECT_EQ(copy.mButton, origin.mButton) << "CopyCtor: mButton";
    EXPECT_EQ(copy.mButtons, origin.mButtons) << "CopyCtor: mButtons";
    EXPECT_EQ(copy.mInputSource, origin.mInputSource)
        << "CopyCtor: mInputSource";
    EXPECT_EQ(copy.mCallbackId, Nothing{}) << "CopyCtor: mCallbackId";
    EXPECT_NE(copy.mCallbackId, origin.mCallbackId) << "CopyCtor: mCallbackId";
  }
  // FYI: No assignment operator
  static_assert(!std::is_copy_assignable_v<WidgetTouchEvent>,
                "Add the test for the copy assignment operator");
  {
    WidgetTouchEvent originToBeMoved(true, eTouchStart, nullptr);
    CompletelyCopy(origin, originToBeMoved);

    WidgetTouchEvent move(std::move(originToBeMoved));
    EXPECT_EQ(move.mMessage, origin.mMessage) << "MoveCtor: mMessage";
    EXPECT_EQ(move.mClass, origin.mClass) << "MoveCtor: mClass";
    EXPECT_EQ(move.mRefPoint, origin.mRefPoint) << "MoveCtor: mRefPoint";
    EXPECT_EQ(move.mFlags.mCancelable, origin.mFlags.mCancelable)
        << "MoveCtor: mFlags.mCancelable";
    EXPECT_EQ(move.mFlags.mHandledByAPZ, origin.mFlags.mHandledByAPZ)
        << "MoveCtor: mFlags.mHandledByAPZ";
    EXPECT_EQ(move.mModifiers, origin.mModifiers) << "MoveCtor: mModifiers";
    EXPECT_EQ(move.mTouches.Length(), origin.mTouches.Length())
        << "MoveCtor: mTouches.Length()";
    EXPECT_EQ(move.mTouches.SafeElementAt(0), touch) << "MoveCtor: mTouches[0]";
    EXPECT_EQ(move.mButton, origin.mButton) << "MoveCtor: mButton";
    EXPECT_EQ(move.mButtons, origin.mButtons) << "MoveCtor: mButtons";
    EXPECT_EQ(move.mInputSource, origin.mInputSource)
        << "MoveCtor: mInputSource";
    EXPECT_EQ(move.mCallbackId, Nothing{}) << "MoveCtor: mCallbackId";
    EXPECT_NE(move.mCallbackId, origin.mCallbackId) << "MoveCtor: mCallbackId";
  }
  {
    WidgetTouchEvent originToBeMoved(true, eTouchStart, nullptr);
    CompletelyCopy(origin, originToBeMoved);

    WidgetTouchEvent assigned(true, eTouchEnd, nullptr);
    assigned = std::move(originToBeMoved);
    EXPECT_EQ(assigned.mMessage, origin.mMessage)
        << "Assignment(Move): mMessage";
    EXPECT_EQ(assigned.mClass, origin.mClass) << "Assignment(Move): mClass";
    EXPECT_EQ(assigned.mRefPoint, origin.mRefPoint)
        << "Assignment(Move): mRefPoint";
    EXPECT_EQ(assigned.mFlags.mCancelable, origin.mFlags.mCancelable)
        << "Assignment(Move): mFlags.mCancelable";
    EXPECT_EQ(assigned.mFlags.mHandledByAPZ, origin.mFlags.mHandledByAPZ)
        << "Assignment(Move): mFlags.mHandledByAPZ";
    EXPECT_EQ(assigned.mModifiers, origin.mModifiers)
        << "Assignment(Move): mModifiers";
    EXPECT_EQ(assigned.mTouches.Length(), origin.mTouches.Length())
        << "Assignment(Move): mTouches.Length()";
    EXPECT_EQ(assigned.mTouches.SafeElementAt(0), touch)
        << "Assignment(Move): mTouches[0]";
    EXPECT_EQ(assigned.mButton, origin.mButton) << "Assignment(Move): mButton";
    EXPECT_EQ(assigned.mButtons, origin.mButtons)
        << "Assignment(Move): mButtons";
    EXPECT_EQ(assigned.mInputSource, origin.mInputSource)
        << "Assignment(Move): mInputSource";
    EXPECT_EQ(assigned.mCallbackId, origin.mCallbackId)
        << "Assignment(Move): mCallbackId";
  }
}

}  // namespace mozilla
