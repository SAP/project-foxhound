/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"
#include "mozilla/MouseEvents.h"
#include "mozilla/dom/MouseEventBinding.h"
#include "TestWidgetEventCtors.h"

namespace mozilla {

/**
 * WidgetMouseEvent has custom copy constructor which do not copy some members
 * intentionally. Therefore, its subclass uses it by default so that some
 * members are not copied by the copy constructor even if the subclass defines a
 * move constructor. On the other hand, the assignment operators are not
 * defined. Therefore, assignment operators are the default one, which assigns
 * everything.
 */

TEST(WidgetMouseEventCtorTests, WidgetMouseEvent)
{
  WidgetMouseEvent origin(true, eMouseDown, nullptr);
  // WidgetInputEvent
  origin.mModifiers = Modifier::MODIFIER_NUMLOCK;
  // WidgetMouseEventBase
  origin.mPressure = 0.4f;
  origin.mButton = MouseButton::eMiddle;
  origin.mButtons = MouseButtonsFlag::eMiddleFlag;
  origin.mInputSource = dom::MouseEvent_Binding::MOZ_SOURCE_MOUSE;
  // WidgetPointerHelper
  origin.pointerId = 3;
  origin.mTilt = Some(WidgetPointerHelper::Tilt{1, 2});
  origin.twist = 5;
  origin.mAngle = Some(WidgetPointerHelper::Angle{0.4, 0.8});
  origin.tangentialPressure = 0.7;
  origin.convertToPointer = false;
  origin.convertToPointerRawUpdate = false;
  // WidgetMouseEvent
  origin.mReason = WidgetMouseEvent::eSynthesized;
  origin.mContextMenuTrigger = WidgetMouseEvent::eContextMenuKey;
  origin.mIgnoreRootScrollFrame = true;
  origin.mIgnoreCapturingContent = true;
  origin.mClickEventPrevented = true;
  origin.mSynthesizeMoveAfterDispatch = true;
  origin.mCallbackId = Some(256);
  {
    WidgetMouseEvent copy(origin);
    EXPECT_EQ(copy.mMessage, origin.mMessage) << "CopyCtor: mMessage";
    EXPECT_EQ(copy.mClass, origin.mClass) << "CopyCtor: mClass";
    EXPECT_EQ(copy.mModifiers, origin.mModifiers) << "CopyCtor: mModifiers";
    EXPECT_EQ(copy.mPressure, origin.mPressure) << "CopyCtor: mPressure";
    EXPECT_EQ(copy.mButton, origin.mButton) << "CopyCtor: mButton";
    EXPECT_EQ(copy.mButtons, origin.mButtons) << "CopyCtor: mButtons";
    EXPECT_EQ(copy.mInputSource, origin.mInputSource)
        << "CopyCtor: mInputSource";
    EXPECT_EQ(copy.pointerId, origin.pointerId) << "CopyCtor: pointerId";
    EXPECT_EQ(copy.mTilt, origin.mTilt) << "CopyCtor: mTilt";
    EXPECT_EQ(copy.twist, origin.twist) << "CopyCtor: twist";
    EXPECT_EQ(copy.mAngle, origin.mAngle) << "CopyCtor: mAngle";
    EXPECT_EQ(copy.tangentialPressure, origin.tangentialPressure)
        << "CopyCtor: tangentialPressure";
    EXPECT_EQ(copy.convertToPointer, origin.convertToPointer)
        << "CopyCtor: convertToPointer";
    EXPECT_EQ(copy.convertToPointerRawUpdate, origin.convertToPointerRawUpdate)
        << "CopyCtor: convertToPointerRawUpdate";
    EXPECT_EQ(copy.mReason, origin.mReason) << "CopyCtor: mReason";
    EXPECT_EQ(copy.mContextMenuTrigger, origin.mContextMenuTrigger)
        << "CopyCtor: mContextMenuTrigger";
    EXPECT_EQ(copy.mIgnoreRootScrollFrame, origin.mIgnoreRootScrollFrame)
        << "CopyCtor: mIgnoreRootScrollFrame";
    EXPECT_EQ(copy.mIgnoreCapturingContent, origin.mIgnoreCapturingContent)
        << "CopyCtor: mIgnoreCapturingContent";
    EXPECT_EQ(copy.mClickEventPrevented, origin.mClickEventPrevented)
        << "CopyCtor: mClickEventPrevented";
    EXPECT_EQ(copy.mSynthesizeMoveAfterDispatch, false)
        << "CopyCtor: mSynthesizeMoveAfterDispatch";
    EXPECT_NE(copy.mSynthesizeMoveAfterDispatch,
              origin.mSynthesizeMoveAfterDispatch)
        << "CopyCtor: mSynthesizeMoveAfterDispatch";
    EXPECT_EQ(copy.mCallbackId, Nothing{}) << "CopyCtor: mCallbackId";
    EXPECT_NE(copy.mCallbackId, origin.mCallbackId) << "CopyCtor: mCallbackId";
  }
  {
    WidgetMouseEvent assigned(true, eMouseUp, nullptr);
    assigned = origin;
    EXPECT_EQ(assigned.mMessage, origin.mMessage)
        << "Assignment(Copy): mMessage";
    EXPECT_EQ(assigned.mClass, origin.mClass) << "Assignment(Copy): mClass";
    EXPECT_EQ(assigned.mModifiers, origin.mModifiers)
        << "Assignment(Copy): mModifiers";
    EXPECT_EQ(assigned.mPressure, origin.mPressure)
        << "Assignment(Copy): mPressure";
    EXPECT_EQ(assigned.mButton, origin.mButton) << "Assignment(Copy): mButton";
    EXPECT_EQ(assigned.mButtons, origin.mButtons)
        << "Assignment(Copy): mButtons";
    EXPECT_EQ(assigned.mInputSource, origin.mInputSource)
        << "Assignment(Copy): mInputSource";
    EXPECT_EQ(assigned.pointerId, origin.pointerId)
        << "Assignment(Copy): pointerId";
    EXPECT_EQ(assigned.mTilt, origin.mTilt) << "Assignment(Copy): mTilt";
    EXPECT_EQ(assigned.twist, origin.twist) << "Assignment(Copy): twist";
    EXPECT_EQ(assigned.mAngle, origin.mAngle) << "Assignment(Copy): mAngle";
    EXPECT_EQ(assigned.tangentialPressure, origin.tangentialPressure)
        << "Assignment(Copy): tangentialPressure";
    EXPECT_EQ(assigned.convertToPointer, origin.convertToPointer)
        << "Assignment(Copy): convertToPointer";
    EXPECT_EQ(assigned.convertToPointerRawUpdate,
              origin.convertToPointerRawUpdate)
        << "Assignment(Copy): convertToPointerRawUpdate";
    EXPECT_EQ(assigned.mReason, origin.mReason) << "Assignment(Copy): mReason";
    EXPECT_EQ(assigned.mContextMenuTrigger, origin.mContextMenuTrigger)
        << "Assignment(Copy): mContextMenuTrigger";
    EXPECT_EQ(assigned.mIgnoreRootScrollFrame, origin.mIgnoreRootScrollFrame)
        << "Assignment(Copy): mIgnoreRootScrollFrame";
    EXPECT_EQ(assigned.mIgnoreCapturingContent, origin.mIgnoreCapturingContent)
        << "Assignment(Copy): mIgnoreCapturingContent";
    EXPECT_EQ(assigned.mClickEventPrevented, origin.mClickEventPrevented)
        << "Assignment(Copy): mClickEventPrevented";
    EXPECT_EQ(assigned.mSynthesizeMoveAfterDispatch,
              origin.mSynthesizeMoveAfterDispatch)
        << "Assignment(Copy): mSynthesizeMoveAfterDispatch";
    EXPECT_EQ(assigned.mCallbackId, origin.mCallbackId)
        << "Assignment(Copy): mCallbackId";
  }
  {
    WidgetMouseEvent originToBeMoved(true, eMouseDown, nullptr);
    CompletelyCopy(origin, originToBeMoved);

    WidgetMouseEvent move(std::move(originToBeMoved));
    EXPECT_EQ(move.mMessage, origin.mMessage) << "MoveCtor: mMessage";
    EXPECT_EQ(move.mClass, origin.mClass) << "MoveCtor: mClass";
    EXPECT_EQ(move.mModifiers, origin.mModifiers) << "MoveCtor: mModifiers";
    EXPECT_EQ(move.mPressure, origin.mPressure) << "MoveCtor: mPressure";
    EXPECT_EQ(move.mButton, origin.mButton) << "MoveCtor: mButton";
    EXPECT_EQ(move.mButtons, origin.mButtons) << "MoveCtor: mButtons";
    EXPECT_EQ(move.mInputSource, origin.mInputSource)
        << "MoveCtor: mInputSource";
    EXPECT_EQ(move.pointerId, origin.pointerId) << "MoveCtor: pointerId";
    EXPECT_EQ(move.mTilt, origin.mTilt) << "MoveCtor: mTilt";
    EXPECT_EQ(move.twist, origin.twist) << "MoveCtor: twist";
    EXPECT_EQ(move.mAngle, origin.mAngle) << "MoveCtor: mAngle";
    EXPECT_EQ(move.tangentialPressure, origin.tangentialPressure)
        << "MoveCtor: tangentialPressure";
    EXPECT_EQ(move.convertToPointer, origin.convertToPointer)
        << "MoveCtor: convertToPointer";
    EXPECT_EQ(move.convertToPointerRawUpdate, origin.convertToPointerRawUpdate)
        << "MoveCtor: convertToPointerRawUpdate";
    EXPECT_EQ(move.mReason, origin.mReason) << "MoveCtor: mReason";
    EXPECT_EQ(move.mContextMenuTrigger, origin.mContextMenuTrigger)
        << "MoveCtor: mContextMenuTrigger";
    EXPECT_EQ(move.mIgnoreRootScrollFrame, origin.mIgnoreRootScrollFrame)
        << "MoveCtor: mIgnoreRootScrollFrame";
    EXPECT_EQ(move.mIgnoreCapturingContent, origin.mIgnoreCapturingContent)
        << "MoveCtor: mIgnoreCapturingContent";
    EXPECT_EQ(move.mClickEventPrevented, origin.mClickEventPrevented)
        << "MoveCtor: mClickEventPrevented";
    EXPECT_EQ(move.mSynthesizeMoveAfterDispatch, false)
        << "MoveCtor: mSynthesizeMoveAfterDispatch";
    EXPECT_NE(move.mSynthesizeMoveAfterDispatch,
              origin.mSynthesizeMoveAfterDispatch)
        << "MoveCtor: mSynthesizeMoveAfterDispatch";
    EXPECT_EQ(move.mCallbackId, Nothing{}) << "MoveCtor: mCallbackId";
    EXPECT_NE(move.mCallbackId, origin.mCallbackId) << "MoveCtor: mCallbackId";
  }
  {
    WidgetMouseEvent originToBeMoved(true, eMouseDown, nullptr);
    CompletelyCopy(origin, originToBeMoved);

    WidgetMouseEvent assigned(true, eMouseUp, nullptr);
    assigned = std::move(originToBeMoved);
    EXPECT_EQ(assigned.mMessage, origin.mMessage)
        << "Assignment(Move): mMessage";
    EXPECT_EQ(assigned.mClass, origin.mClass) << "Assignment(Move): mClass";
    EXPECT_EQ(assigned.mModifiers, origin.mModifiers)
        << "Assignment(Move): mModifiers";
    EXPECT_EQ(assigned.mPressure, origin.mPressure)
        << "Assignment(Move): mPressure";
    EXPECT_EQ(assigned.mButton, origin.mButton) << "Assignment(Move): mButton";
    EXPECT_EQ(assigned.mButtons, origin.mButtons)
        << "Assignment(Move): mButtons";
    EXPECT_EQ(assigned.mInputSource, origin.mInputSource)
        << "Assignment(Move): mInputSource";
    EXPECT_EQ(assigned.pointerId, origin.pointerId)
        << "Assignment(Move): pointerId";
    EXPECT_EQ(assigned.mTilt, origin.mTilt) << "Assignment(Move): mTilt";
    EXPECT_EQ(assigned.twist, origin.twist) << "Assignment(Move): twist";
    EXPECT_EQ(assigned.mAngle, origin.mAngle) << "Assignment(Move): mAngle";
    EXPECT_EQ(assigned.tangentialPressure, origin.tangentialPressure)
        << "Assignment(Move): tangentialPressure";
    EXPECT_EQ(assigned.convertToPointer, origin.convertToPointer)
        << "Assignment(Move): convertToPointer";
    EXPECT_EQ(assigned.convertToPointerRawUpdate,
              origin.convertToPointerRawUpdate)
        << "Assignment(Move): convertToPointerRawUpdate";
    EXPECT_EQ(assigned.mReason, origin.mReason) << "Assignment(Move): mReason";
    EXPECT_EQ(assigned.mContextMenuTrigger, origin.mContextMenuTrigger)
        << "Assignment(Move): mContextMenuTrigger";
    EXPECT_EQ(assigned.mIgnoreRootScrollFrame, origin.mIgnoreRootScrollFrame)
        << "Assignment(Move): mIgnoreRootScrollFrame";
    EXPECT_EQ(assigned.mIgnoreCapturingContent, origin.mIgnoreCapturingContent)
        << "Assignment(Move): mIgnoreCapturingContent";
    EXPECT_EQ(assigned.mClickEventPrevented, origin.mClickEventPrevented)
        << "Assignment(Move): mClickEventPrevented";
    EXPECT_EQ(assigned.mSynthesizeMoveAfterDispatch,
              origin.mSynthesizeMoveAfterDispatch)
        << "Assignment(Move): mSynthesizeMoveAfterDispatch";
    EXPECT_EQ(assigned.mCallbackId, origin.mCallbackId)
        << "Assignment(Move): mCallbackId";
  }
}

TEST(WidgetMouseEventCtorTests, WidgetDragEvent)
{
  WidgetDragEvent origin(true, eDragStart, nullptr);
  // WidgetInputEvent
  origin.mModifiers = Modifier::MODIFIER_NUMLOCK;
  // WidgetMouseEventBase
  origin.mPressure = 0.4f;
  origin.mButton = MouseButton::eMiddle;
  origin.mButtons = MouseButtonsFlag::eMiddleFlag;
  origin.mInputSource = dom::MouseEvent_Binding::MOZ_SOURCE_MOUSE;
  // WidgetPointerHelper
  origin.pointerId = 3;
  origin.mTilt = Some(WidgetPointerHelper::Tilt{1, 2});
  origin.twist = 5;
  origin.mAngle = Some(WidgetPointerHelper::Angle{0.4, 0.8});
  origin.tangentialPressure = 0.7;
  origin.convertToPointer = false;
  origin.convertToPointerRawUpdate = false;
  // WidgetMouseEvent
  origin.mReason = WidgetMouseEvent::eSynthesized;
  origin.mContextMenuTrigger = WidgetMouseEvent::eContextMenuKey;
  origin.mIgnoreRootScrollFrame = true;
  origin.mIgnoreCapturingContent = true;
  origin.mClickEventPrevented = true;
  origin.mSynthesizeMoveAfterDispatch = true;
  origin.mCallbackId = Some(256);
  // WidgetDragEvent
  origin.mUserCancelled = true;
  origin.mDefaultPreventedOnContent = true;
  origin.mInHTMLEditorEventListener = true;

  {
    WidgetDragEvent copy(origin);
    EXPECT_EQ(copy.mMessage, origin.mMessage) << "CopyCtor: mMessage";
    EXPECT_EQ(copy.mClass, origin.mClass) << "CopyCtor: mClass";
    EXPECT_EQ(copy.mModifiers, origin.mModifiers) << "CopyCtor: mModifiers";
    EXPECT_EQ(copy.mPressure, origin.mPressure) << "CopyCtor: mPressure";
    EXPECT_EQ(copy.mButton, origin.mButton) << "CopyCtor: mButton";
    EXPECT_EQ(copy.mButtons, origin.mButtons) << "CopyCtor: mButtons";
    EXPECT_EQ(copy.mInputSource, origin.mInputSource)
        << "CopyCtor: mInputSource";
    EXPECT_EQ(copy.pointerId, origin.pointerId) << "CopyCtor: pointerId";
    EXPECT_EQ(copy.mTilt, origin.mTilt) << "CopyCtor: mTilt";
    EXPECT_EQ(copy.twist, origin.twist) << "CopyCtor: twist";
    EXPECT_EQ(copy.mAngle, origin.mAngle) << "CopyCtor: mAngle";
    EXPECT_EQ(copy.tangentialPressure, origin.tangentialPressure)
        << "CopyCtor: tangentialPressure";
    EXPECT_EQ(copy.convertToPointer, origin.convertToPointer)
        << "CopyCtor: convertToPointer";
    EXPECT_EQ(copy.convertToPointerRawUpdate, origin.convertToPointerRawUpdate)
        << "CopyCtor: convertToPointerRawUpdate";
    EXPECT_EQ(copy.mReason, origin.mReason) << "CopyCtor: mReason";
    EXPECT_EQ(copy.mContextMenuTrigger, origin.mContextMenuTrigger)
        << "CopyCtor: mContextMenuTrigger";
    EXPECT_EQ(copy.mIgnoreRootScrollFrame, origin.mIgnoreRootScrollFrame)
        << "CopyCtor: mIgnoreRootScrollFrame";
    EXPECT_EQ(copy.mIgnoreCapturingContent, origin.mIgnoreCapturingContent)
        << "CopyCtor: mIgnoreCapturingContent";
    EXPECT_EQ(copy.mClickEventPrevented, origin.mClickEventPrevented)
        << "CopyCtor: mClickEventPrevented";
    EXPECT_EQ(copy.mSynthesizeMoveAfterDispatch, false)
        << "CopyCtor: mSynthesizeMoveAfterDispatch";
    EXPECT_NE(copy.mSynthesizeMoveAfterDispatch,
              origin.mSynthesizeMoveAfterDispatch)
        << "CopyCtor: mSynthesizeMoveAfterDispatch";
    EXPECT_EQ(copy.mCallbackId, Nothing{}) << "CopyCtor: mCallbackId";
    EXPECT_NE(copy.mCallbackId, origin.mCallbackId) << "CopyCtor: mCallbackId";
    EXPECT_EQ(copy.mUserCancelled, origin.mUserCancelled)
        << "CopyCtor: mUserCancelled";
    EXPECT_EQ(copy.mDefaultPreventedOnContent,
              origin.mDefaultPreventedOnContent)
        << "CopyCtor: mDefaultPreventedOnContent";
    EXPECT_EQ(copy.mInHTMLEditorEventListener,
              origin.mInHTMLEditorEventListener)
        << "CopyCtor: mInHTMLEditorEventListener";
  }
  {
    WidgetDragEvent assigned(true, eDragEnd, nullptr);
    assigned = origin;
    EXPECT_EQ(assigned.mMessage, origin.mMessage)
        << "Assignment(Copy): mMessage";
    EXPECT_EQ(assigned.mClass, origin.mClass) << "Assignment(Copy): mClass";
    EXPECT_EQ(assigned.mModifiers, origin.mModifiers)
        << "Assignment(Copy): mModifiers";
    EXPECT_EQ(assigned.mPressure, origin.mPressure)
        << "Assignment(Copy): mPressure";
    EXPECT_EQ(assigned.mButton, origin.mButton) << "Assignment(Copy): mButton";
    EXPECT_EQ(assigned.mButtons, origin.mButtons)
        << "Assignment(Copy): mButtons";
    EXPECT_EQ(assigned.mInputSource, origin.mInputSource)
        << "Assignment(Copy): mInputSource";
    EXPECT_EQ(assigned.pointerId, origin.pointerId)
        << "Assignment(Copy): pointerId";
    EXPECT_EQ(assigned.mTilt, origin.mTilt) << "Assignment(Copy): mTilt";
    EXPECT_EQ(assigned.twist, origin.twist) << "Assignment(Copy): twist";
    EXPECT_EQ(assigned.mAngle, origin.mAngle) << "Assignment(Copy): mAngle";
    EXPECT_EQ(assigned.tangentialPressure, origin.tangentialPressure)
        << "Assignment(Copy): tangentialPressure";
    EXPECT_EQ(assigned.convertToPointer, origin.convertToPointer)
        << "Assignment(Copy): convertToPointer";
    EXPECT_EQ(assigned.convertToPointerRawUpdate,
              origin.convertToPointerRawUpdate)
        << "Assignment(Copy): convertToPointerRawUpdate";
    EXPECT_EQ(assigned.mReason, origin.mReason) << "Assignment(Copy): mReason";
    EXPECT_EQ(assigned.mContextMenuTrigger, origin.mContextMenuTrigger)
        << "Assignment(Copy): mContextMenuTrigger";
    EXPECT_EQ(assigned.mIgnoreRootScrollFrame, origin.mIgnoreRootScrollFrame)
        << "Assignment(Copy): mIgnoreRootScrollFrame";
    EXPECT_EQ(assigned.mIgnoreCapturingContent, origin.mIgnoreCapturingContent)
        << "Assignment(Copy): mIgnoreCapturingContent";
    EXPECT_EQ(assigned.mClickEventPrevented, origin.mClickEventPrevented)
        << "Assignment(Copy): mClickEventPrevented";
    EXPECT_EQ(assigned.mSynthesizeMoveAfterDispatch,
              origin.mSynthesizeMoveAfterDispatch)
        << "Assignment(Copy): mSynthesizeMoveAfterDispatch";
    EXPECT_EQ(assigned.mCallbackId, origin.mCallbackId)
        << "Assignment(Copy): mCallbackId";
    EXPECT_EQ(assigned.mUserCancelled, origin.mUserCancelled)
        << "Assignment(Copy): mUserCancelled";
    EXPECT_EQ(assigned.mDefaultPreventedOnContent,
              origin.mDefaultPreventedOnContent)
        << "Assignment(Copy): mDefaultPreventedOnContent";
    EXPECT_EQ(assigned.mInHTMLEditorEventListener,
              origin.mInHTMLEditorEventListener)
        << "Assignment(Copy): mInHTMLEditorEventListener";
  }
  {
    WidgetDragEvent originToBeMoved(true, eDragStart, nullptr);
    CompletelyCopy(origin, originToBeMoved);

    WidgetDragEvent move(std::move(originToBeMoved));
    EXPECT_EQ(move.mMessage, origin.mMessage) << "MoveCtor: mMessage";
    EXPECT_EQ(move.mClass, origin.mClass) << "MoveCtor: mClass";
    EXPECT_EQ(move.mModifiers, origin.mModifiers) << "MoveCtor: mModifiers";
    EXPECT_EQ(move.mPressure, origin.mPressure) << "MoveCtor: mPressure";
    EXPECT_EQ(move.mButton, origin.mButton) << "MoveCtor: mButton";
    EXPECT_EQ(move.mButtons, origin.mButtons) << "MoveCtor: mButtons";
    EXPECT_EQ(move.mInputSource, origin.mInputSource)
        << "MoveCtor: mInputSource";
    EXPECT_EQ(move.pointerId, origin.pointerId) << "MoveCtor: pointerId";
    EXPECT_EQ(move.mTilt, origin.mTilt) << "MoveCtor: mTilt";
    EXPECT_EQ(move.twist, origin.twist) << "MoveCtor: twist";
    EXPECT_EQ(move.mAngle, origin.mAngle) << "MoveCtor: mAngle";
    EXPECT_EQ(move.tangentialPressure, origin.tangentialPressure)
        << "MoveCtor: tangentialPressure";
    EXPECT_EQ(move.convertToPointer, origin.convertToPointer)
        << "MoveCtor: convertToPointer";
    EXPECT_EQ(move.convertToPointerRawUpdate, origin.convertToPointerRawUpdate)
        << "MoveCtor: convertToPointerRawUpdate";
    EXPECT_EQ(move.mReason, origin.mReason) << "MoveCtor: mReason";
    EXPECT_EQ(move.mContextMenuTrigger, origin.mContextMenuTrigger)
        << "MoveCtor: mContextMenuTrigger";
    EXPECT_EQ(move.mIgnoreRootScrollFrame, origin.mIgnoreRootScrollFrame)
        << "MoveCtor: mIgnoreRootScrollFrame";
    EXPECT_EQ(move.mIgnoreCapturingContent, origin.mIgnoreCapturingContent)
        << "MoveCtor: mIgnoreCapturingContent";
    EXPECT_EQ(move.mClickEventPrevented, origin.mClickEventPrevented)
        << "MoveCtor: mClickEventPrevented";
    EXPECT_EQ(move.mSynthesizeMoveAfterDispatch, false)
        << "MoveCtor: mSynthesizeMoveAfterDispatch";
    EXPECT_NE(move.mSynthesizeMoveAfterDispatch,
              origin.mSynthesizeMoveAfterDispatch)
        << "MoveCtor: mSynthesizeMoveAfterDispatch";
    EXPECT_EQ(move.mCallbackId, Nothing{}) << "MoveCtor: mCallbackId";
    EXPECT_NE(move.mCallbackId, origin.mCallbackId) << "MoveCtor: mCallbackId";
    EXPECT_EQ(move.mUserCancelled, origin.mUserCancelled)
        << "MoveCtor: mUserCancelled";
    EXPECT_EQ(move.mDefaultPreventedOnContent,
              origin.mDefaultPreventedOnContent)
        << "MoveCtor: mDefaultPreventedOnContent";
    EXPECT_EQ(move.mInHTMLEditorEventListener,
              origin.mInHTMLEditorEventListener)
        << "MoveCtor: mInHTMLEditorEventListener";
  }
  {
    WidgetDragEvent originToBeMoved(true, eDragStart, nullptr);
    CompletelyCopy(origin, originToBeMoved);

    WidgetDragEvent assigned(true, eDragEnd, nullptr);
    assigned = std::move(originToBeMoved);
    EXPECT_EQ(assigned.mMessage, origin.mMessage)
        << "Assignment(Move): mMessage";
    EXPECT_EQ(assigned.mClass, origin.mClass) << "Assignment(Move): mClass";
    EXPECT_EQ(assigned.mModifiers, origin.mModifiers)
        << "Assignment(Move): mModifiers";
    EXPECT_EQ(assigned.mPressure, origin.mPressure)
        << "Assignment(Move): mPressure";
    EXPECT_EQ(assigned.mButton, origin.mButton) << "Assignment(Move): mButton";
    EXPECT_EQ(assigned.mButtons, origin.mButtons)
        << "Assignment(Move): mButtons";
    EXPECT_EQ(assigned.mInputSource, origin.mInputSource)
        << "Assignment(Move): mInputSource";
    EXPECT_EQ(assigned.pointerId, origin.pointerId)
        << "Assignment(Move): pointerId";
    EXPECT_EQ(assigned.mTilt, origin.mTilt) << "Assignment(Move): mTilt";
    EXPECT_EQ(assigned.twist, origin.twist) << "Assignment(Move): twist";
    EXPECT_EQ(assigned.mAngle, origin.mAngle) << "Assignment(Move): mAngle";
    EXPECT_EQ(assigned.tangentialPressure, origin.tangentialPressure)
        << "Assignment(Move): tangentialPressure";
    EXPECT_EQ(assigned.convertToPointer, origin.convertToPointer)
        << "Assignment(Move): convertToPointer";
    EXPECT_EQ(assigned.convertToPointerRawUpdate,
              origin.convertToPointerRawUpdate)
        << "Assignment(Move): convertToPointerRawUpdate";
    EXPECT_EQ(assigned.mReason, origin.mReason) << "Assignment(Move): mReason";
    EXPECT_EQ(assigned.mContextMenuTrigger, origin.mContextMenuTrigger)
        << "Assignment(Move): mContextMenuTrigger";
    EXPECT_EQ(assigned.mIgnoreRootScrollFrame, origin.mIgnoreRootScrollFrame)
        << "Assignment(Move): mIgnoreRootScrollFrame";
    EXPECT_EQ(assigned.mIgnoreCapturingContent, origin.mIgnoreCapturingContent)
        << "Assignment(Move): mIgnoreCapturingContent";
    EXPECT_EQ(assigned.mClickEventPrevented, origin.mClickEventPrevented)
        << "Assignment(Move): mClickEventPrevented";
    EXPECT_EQ(assigned.mSynthesizeMoveAfterDispatch,
              origin.mSynthesizeMoveAfterDispatch)
        << "Assignment(Move): mSynthesizeMoveAfterDispatch";
    EXPECT_EQ(assigned.mCallbackId, origin.mCallbackId)
        << "Assignment(Move): mCallbackId";
    EXPECT_EQ(assigned.mUserCancelled, origin.mUserCancelled)
        << "Assignment(Move): mUserCancelled";
    EXPECT_EQ(assigned.mDefaultPreventedOnContent,
              origin.mDefaultPreventedOnContent)
        << "Assignment(Move): mDefaultPreventedOnContent";
    EXPECT_EQ(assigned.mInHTMLEditorEventListener,
              origin.mInHTMLEditorEventListener)
        << "Assignment(Move): mInHTMLEditorEventListener";
  }
}

TEST(WidgetMouseEventCtorTests, WidgetPointerEvent)
{
  WidgetPointerEvent origin(true, ePointerDown, nullptr);
  // WidgetInputEvent
  origin.mModifiers = Modifier::MODIFIER_NUMLOCK;
  // WidgetMouseEventBase
  origin.mPressure = 0.4f;
  origin.mButton = MouseButton::eMiddle;
  origin.mButtons = MouseButtonsFlag::eMiddleFlag;
  origin.mInputSource = dom::MouseEvent_Binding::MOZ_SOURCE_MOUSE;
  // WidgetPointerHelper
  origin.pointerId = 3;
  origin.mTilt = Some(WidgetPointerHelper::Tilt{1, 2});
  origin.twist = 5;
  origin.mAngle = Some(WidgetPointerHelper::Angle{0.4, 0.8});
  origin.tangentialPressure = 0.7;
  origin.convertToPointer = false;
  origin.convertToPointerRawUpdate = false;
  // WidgetMouseEvent
  origin.mReason = WidgetMouseEvent::eSynthesized;
  origin.mContextMenuTrigger = WidgetMouseEvent::eContextMenuKey;
  origin.mIgnoreRootScrollFrame = true;
  origin.mIgnoreCapturingContent = true;
  origin.mClickEventPrevented = true;
  origin.mSynthesizeMoveAfterDispatch = true;
  origin.mCallbackId = Some(256);
  // WidgetPointerEvent
  origin.mWidth = 1.5;
  origin.mHeight = 1.6;
  origin.mIsPrimary = false;
  origin.mFromTouchEvent = true;

  {
    WidgetPointerEvent copy(origin);
    EXPECT_EQ(copy.mMessage, origin.mMessage) << "CopyCtor: mMessage";
    EXPECT_EQ(copy.mClass, origin.mClass) << "CopyCtor: mClass";
    EXPECT_EQ(copy.mModifiers, origin.mModifiers) << "CopyCtor: mModifiers";
    EXPECT_EQ(copy.mPressure, origin.mPressure) << "CopyCtor: mPressure";
    EXPECT_EQ(copy.mButton, origin.mButton) << "CopyCtor: mButton";
    EXPECT_EQ(copy.mButtons, origin.mButtons) << "CopyCtor: mButtons";
    EXPECT_EQ(copy.mInputSource, origin.mInputSource)
        << "CopyCtor: mInputSource";
    EXPECT_EQ(copy.pointerId, origin.pointerId) << "CopyCtor: pointerId";
    EXPECT_EQ(copy.mTilt, origin.mTilt) << "CopyCtor: mTilt";
    EXPECT_EQ(copy.twist, origin.twist) << "CopyCtor: twist";
    EXPECT_EQ(copy.mAngle, origin.mAngle) << "CopyCtor: mAngle";
    EXPECT_EQ(copy.tangentialPressure, origin.tangentialPressure)
        << "CopyCtor: tangentialPressure";
    EXPECT_EQ(copy.convertToPointer, origin.convertToPointer)
        << "CopyCtor: convertToPointer";
    EXPECT_EQ(copy.convertToPointerRawUpdate, origin.convertToPointerRawUpdate)
        << "CopyCtor: convertToPointerRawUpdate";
    EXPECT_EQ(copy.mReason, origin.mReason) << "CopyCtor: mReason";
    EXPECT_EQ(copy.mContextMenuTrigger, origin.mContextMenuTrigger)
        << "CopyCtor: mContextMenuTrigger";
    EXPECT_EQ(copy.mIgnoreRootScrollFrame, origin.mIgnoreRootScrollFrame)
        << "CopyCtor: mIgnoreRootScrollFrame";
    EXPECT_EQ(copy.mIgnoreCapturingContent, origin.mIgnoreCapturingContent)
        << "CopyCtor: mIgnoreCapturingContent";
    EXPECT_EQ(copy.mClickEventPrevented, origin.mClickEventPrevented)
        << "CopyCtor: mClickEventPrevented";
    EXPECT_EQ(copy.mSynthesizeMoveAfterDispatch, false)
        << "CopyCtor: mSynthesizeMoveAfterDispatch";
    EXPECT_NE(copy.mSynthesizeMoveAfterDispatch,
              origin.mSynthesizeMoveAfterDispatch)
        << "CopyCtor: mSynthesizeMoveAfterDispatch";
    EXPECT_EQ(copy.mCallbackId, Nothing{}) << "CopyCtor: mCallbackId";
    EXPECT_NE(copy.mCallbackId, origin.mCallbackId) << "CopyCtor: mCallbackId";
    EXPECT_EQ(copy.mWidth, origin.mWidth) << "CopyCtor: mWidth";
    EXPECT_EQ(copy.mHeight, origin.mHeight) << "CopyCtor: mHeight";
    EXPECT_EQ(copy.mIsPrimary, origin.mIsPrimary) << "CopyCtor: mIsPrimary";
    EXPECT_EQ(copy.mFromTouchEvent, origin.mFromTouchEvent)
        << "CopyCtor: mFromTouchEvent";
  }
  {
    WidgetPointerEvent assigned(true, ePointerUp, nullptr);
    assigned = origin;
    EXPECT_EQ(assigned.mMessage, origin.mMessage)
        << "Assignment(Copy): mMessage";
    EXPECT_EQ(assigned.mClass, origin.mClass) << "Assignment(Copy): mClass";
    EXPECT_EQ(assigned.mModifiers, origin.mModifiers)
        << "Assignment(Copy): mModifiers";
    EXPECT_EQ(assigned.mPressure, origin.mPressure)
        << "Assignment(Copy): mPressure";
    EXPECT_EQ(assigned.mButton, origin.mButton) << "Assignment(Copy): mButton";
    EXPECT_EQ(assigned.mButtons, origin.mButtons)
        << "Assignment(Copy): mButtons";
    EXPECT_EQ(assigned.mInputSource, origin.mInputSource)
        << "Assignment(Copy): mInputSource";
    EXPECT_EQ(assigned.pointerId, origin.pointerId)
        << "Assignment(Copy): pointerId";
    EXPECT_EQ(assigned.mTilt, origin.mTilt) << "Assignment(Copy): mTilt";
    EXPECT_EQ(assigned.twist, origin.twist) << "Assignment(Copy): twist";
    EXPECT_EQ(assigned.mAngle, origin.mAngle) << "Assignment(Copy): mAngle";
    EXPECT_EQ(assigned.tangentialPressure, origin.tangentialPressure)
        << "Assignment(Copy): tangentialPressure";
    EXPECT_EQ(assigned.convertToPointer, origin.convertToPointer)
        << "Assignment(Copy): convertToPointer";
    EXPECT_EQ(assigned.convertToPointerRawUpdate,
              origin.convertToPointerRawUpdate)
        << "Assignment(Copy): convertToPointerRawUpdate";
    EXPECT_EQ(assigned.mReason, origin.mReason) << "Assignment(Copy): mReason";
    EXPECT_EQ(assigned.mContextMenuTrigger, origin.mContextMenuTrigger)
        << "Assignment(Copy): mContextMenuTrigger";
    EXPECT_EQ(assigned.mIgnoreRootScrollFrame, origin.mIgnoreRootScrollFrame)
        << "Assignment(Copy): mIgnoreRootScrollFrame";
    EXPECT_EQ(assigned.mIgnoreCapturingContent, origin.mIgnoreCapturingContent)
        << "Assignment(Copy): mIgnoreCapturingContent";
    EXPECT_EQ(assigned.mClickEventPrevented, origin.mClickEventPrevented)
        << "Assignment(Copy): mClickEventPrevented";
    EXPECT_EQ(assigned.mSynthesizeMoveAfterDispatch,
              origin.mSynthesizeMoveAfterDispatch)
        << "Assignment(Copy): mSynthesizeMoveAfterDispatch";
    EXPECT_EQ(assigned.mCallbackId, origin.mCallbackId)
        << "Assignment(Copy): mCallbackId";
    EXPECT_EQ(assigned.mWidth, origin.mWidth) << "Assignment(Copy): mWidth";
    EXPECT_EQ(assigned.mHeight, origin.mHeight) << "Assignment(Copy): mHeight";
    EXPECT_EQ(assigned.mIsPrimary, origin.mIsPrimary)
        << "Assignment(Copy): mIsPrimary";
    EXPECT_EQ(assigned.mFromTouchEvent, origin.mFromTouchEvent)
        << "Assignment(Copy): mFromTouchEvent";
  }
  {
    WidgetPointerEvent originToBeMoved(true, ePointerDown, nullptr);
    CompletelyCopy(origin, originToBeMoved);

    WidgetPointerEvent move(std::move(originToBeMoved));
    EXPECT_EQ(move.mMessage, origin.mMessage) << "MoveCtor: mMessage";
    EXPECT_EQ(move.mClass, origin.mClass) << "MoveCtor: mClass";
    EXPECT_EQ(move.mModifiers, origin.mModifiers) << "MoveCtor: mModifiers";
    EXPECT_EQ(move.mPressure, origin.mPressure) << "MoveCtor: mPressure";
    EXPECT_EQ(move.mButton, origin.mButton) << "MoveCtor: mButton";
    EXPECT_EQ(move.mButtons, origin.mButtons) << "MoveCtor: mButtons";
    EXPECT_EQ(move.mInputSource, origin.mInputSource)
        << "MoveCtor: mInputSource";
    EXPECT_EQ(move.pointerId, origin.pointerId) << "MoveCtor: pointerId";
    EXPECT_EQ(move.mTilt, origin.mTilt) << "MoveCtor: mTilt";
    EXPECT_EQ(move.twist, origin.twist) << "MoveCtor: twist";
    EXPECT_EQ(move.mAngle, origin.mAngle) << "MoveCtor: mAngle";
    EXPECT_EQ(move.tangentialPressure, origin.tangentialPressure)
        << "MoveCtor: tangentialPressure";
    EXPECT_EQ(move.convertToPointer, origin.convertToPointer)
        << "MoveCtor: convertToPointer";
    EXPECT_EQ(move.convertToPointerRawUpdate, origin.convertToPointerRawUpdate)
        << "MoveCtor: convertToPointerRawUpdate";
    EXPECT_EQ(move.mReason, origin.mReason) << "MoveCtor: mReason";
    EXPECT_EQ(move.mContextMenuTrigger, origin.mContextMenuTrigger)
        << "MoveCtor: mContextMenuTrigger";
    EXPECT_EQ(move.mIgnoreRootScrollFrame, origin.mIgnoreRootScrollFrame)
        << "MoveCtor: mIgnoreRootScrollFrame";
    EXPECT_EQ(move.mIgnoreCapturingContent, origin.mIgnoreCapturingContent)
        << "MoveCtor: mIgnoreCapturingContent";
    EXPECT_EQ(move.mClickEventPrevented, origin.mClickEventPrevented)
        << "MoveCtor: mClickEventPrevented";
    EXPECT_EQ(move.mSynthesizeMoveAfterDispatch, false)
        << "MoveCtor: mSynthesizeMoveAfterDispatch";
    EXPECT_NE(move.mSynthesizeMoveAfterDispatch,
              origin.mSynthesizeMoveAfterDispatch)
        << "MoveCtor: mSynthesizeMoveAfterDispatch";
    EXPECT_EQ(move.mCallbackId, Nothing{}) << "MoveCtor: mCallbackId";
    EXPECT_NE(move.mCallbackId, origin.mCallbackId) << "MoveCtor: mCallbackId";
    EXPECT_EQ(move.mWidth, origin.mWidth) << "MoveCtor: mWidth";
    EXPECT_EQ(move.mHeight, origin.mHeight) << "MoveCtor: mHeight";
    EXPECT_EQ(move.mIsPrimary, origin.mIsPrimary) << "MoveCtor: mIsPrimary";
    EXPECT_EQ(move.mFromTouchEvent, origin.mFromTouchEvent)
        << "MoveCtor: mFromTouchEvent";
  }
  {
    WidgetPointerEvent originToBeMoved(true, ePointerDown, nullptr);
    CompletelyCopy(origin, originToBeMoved);

    WidgetPointerEvent assigned(true, ePointerUp, nullptr);
    assigned = std::move(originToBeMoved);
    EXPECT_EQ(assigned.mMessage, origin.mMessage)
        << "Assignment(Move): mMessage";
    EXPECT_EQ(assigned.mClass, origin.mClass) << "Assignment(Move): mClass";
    EXPECT_EQ(assigned.mModifiers, origin.mModifiers)
        << "Assignment(Move): mModifiers";
    EXPECT_EQ(assigned.mPressure, origin.mPressure)
        << "Assignment(Move): mPressure";
    EXPECT_EQ(assigned.mButton, origin.mButton) << "Assignment(Move): mButton";
    EXPECT_EQ(assigned.mButtons, origin.mButtons)
        << "Assignment(Move): mButtons";
    EXPECT_EQ(assigned.mInputSource, origin.mInputSource)
        << "Assignment(Move): mInputSource";
    EXPECT_EQ(assigned.pointerId, origin.pointerId)
        << "Assignment(Move): pointerId";
    EXPECT_EQ(assigned.mTilt, origin.mTilt) << "Assignment(Move): mTilt";
    EXPECT_EQ(assigned.twist, origin.twist) << "Assignment(Move): twist";
    EXPECT_EQ(assigned.mAngle, origin.mAngle) << "Assignment(Move): mAngle";
    EXPECT_EQ(assigned.tangentialPressure, origin.tangentialPressure)
        << "Assignment(Move): tangentialPressure";
    EXPECT_EQ(assigned.convertToPointer, origin.convertToPointer)
        << "Assignment(Move): convertToPointer";
    EXPECT_EQ(assigned.convertToPointerRawUpdate,
              origin.convertToPointerRawUpdate)
        << "Assignment(Move): convertToPointerRawUpdate";
    EXPECT_EQ(assigned.mReason, origin.mReason) << "Assignment(Move): mReason";
    EXPECT_EQ(assigned.mContextMenuTrigger, origin.mContextMenuTrigger)
        << "Assignment(Move): mContextMenuTrigger";
    EXPECT_EQ(assigned.mIgnoreRootScrollFrame, origin.mIgnoreRootScrollFrame)
        << "Assignment(Move): mIgnoreRootScrollFrame";
    EXPECT_EQ(assigned.mIgnoreCapturingContent, origin.mIgnoreCapturingContent)
        << "Assignment(Move): mIgnoreCapturingContent";
    EXPECT_EQ(assigned.mClickEventPrevented, origin.mClickEventPrevented)
        << "Assignment(Move): mClickEventPrevented";
    EXPECT_EQ(assigned.mSynthesizeMoveAfterDispatch,
              origin.mSynthesizeMoveAfterDispatch)
        << "Assignment(Move): mSynthesizeMoveAfterDispatch";
    EXPECT_EQ(assigned.mCallbackId, origin.mCallbackId)
        << "Assignment(Move): mCallbackId";
    EXPECT_EQ(assigned.mWidth, origin.mWidth) << "Assignment(Move): mWidth";
    EXPECT_EQ(assigned.mHeight, origin.mHeight) << "Assignment(Move): mHeight";
    EXPECT_EQ(assigned.mIsPrimary, origin.mIsPrimary)
        << "Assignment(Move): mIsPrimary";
    EXPECT_EQ(assigned.mFromTouchEvent, origin.mFromTouchEvent)
        << "Assignment(Move): mFromTouchEvent";
  }
}

TEST(WidgetMouseEventCtorTests, UpgradeWidgetMouseEventToWidgetPointerEvent)
{
  WidgetPointerEvent mouse(true, eMouseDown, nullptr);
  // WidgetInputEvent
  mouse.mModifiers = Modifier::MODIFIER_NUMLOCK;
  // WidgetMouseEventBase
  mouse.mPressure = 0.4f;
  mouse.mButton = MouseButton::eMiddle;
  mouse.mButtons = MouseButtonsFlag::eMiddleFlag;
  mouse.mInputSource = dom::MouseEvent_Binding::MOZ_SOURCE_MOUSE;
  // WidgetPointerHelper
  mouse.pointerId = 3;
  mouse.mTilt = Some(WidgetPointerHelper::Tilt{1, 2});
  mouse.twist = 5;
  mouse.mAngle = Some(WidgetPointerHelper::Angle{0.4, 0.8});
  mouse.tangentialPressure = 0.7;
  mouse.convertToPointer = false;
  mouse.convertToPointerRawUpdate = false;
  // WidgetMouseEvent
  mouse.mReason = WidgetMouseEvent::eSynthesized;
  mouse.mContextMenuTrigger = WidgetMouseEvent::eContextMenuKey;
  mouse.mIgnoreRootScrollFrame = true;
  mouse.mIgnoreCapturingContent = true;
  mouse.mClickEventPrevented = true;
  mouse.mSynthesizeMoveAfterDispatch = true;
  mouse.mCallbackId = Some(256);
  WidgetPointerEvent pointer(mouse);
  EXPECT_EQ(pointer.mMessage, mouse.mMessage) << "mMessage";
  EXPECT_EQ(pointer.mClass, ePointerEventClass) << "mClass";
  EXPECT_EQ(pointer.mModifiers, mouse.mModifiers) << "mModifiers";
  EXPECT_EQ(pointer.mPressure, mouse.mPressure) << "mPressure";
  EXPECT_EQ(pointer.mButton, mouse.mButton) << "mButton";
  EXPECT_EQ(pointer.mButtons, mouse.mButtons) << "mButtons";
  EXPECT_EQ(pointer.mInputSource, mouse.mInputSource) << "mInputSource";
  EXPECT_EQ(pointer.pointerId, mouse.pointerId) << "pointerId";
  EXPECT_EQ(pointer.mTilt, mouse.mTilt) << "mTilt";
  EXPECT_EQ(pointer.twist, mouse.twist) << "twist";
  EXPECT_EQ(pointer.mAngle, mouse.mAngle) << "mAngle";
  EXPECT_EQ(pointer.tangentialPressure, mouse.tangentialPressure)
      << " tangentialPressure";
  EXPECT_EQ(pointer.convertToPointer, mouse.convertToPointer)
      << "convertToPointer";
  EXPECT_EQ(pointer.convertToPointerRawUpdate, mouse.convertToPointerRawUpdate)
      << "convertToPointerRawUpdate";
  EXPECT_EQ(pointer.mReason, mouse.mReason) << "mReason";
  EXPECT_EQ(pointer.mContextMenuTrigger, mouse.mContextMenuTrigger)
      << "mContextMenuTrigger";
  EXPECT_EQ(pointer.mIgnoreRootScrollFrame, mouse.mIgnoreRootScrollFrame)
      << "mIgnoreRootScrollFrame";
  EXPECT_EQ(pointer.mIgnoreCapturingContent, mouse.mIgnoreCapturingContent)
      << "mIgnoreCapturingContent";
  EXPECT_EQ(pointer.mClickEventPrevented, mouse.mClickEventPrevented)
      << "mClickEventPrevented";
  EXPECT_EQ(pointer.mSynthesizeMoveAfterDispatch, false)
      << "mSynthesizeMoveAfterDispatch";
  EXPECT_NE(pointer.mSynthesizeMoveAfterDispatch,
            mouse.mSynthesizeMoveAfterDispatch)
      << "mSynthesizeMoveAfterDispatch";
  EXPECT_EQ(pointer.mCallbackId, Nothing{}) << "mCallbackId";
  EXPECT_NE(pointer.mCallbackId, mouse.mCallbackId) << "mCallbackId";
  EXPECT_EQ(pointer.mWidth, 1.0) << "mWidth";
  EXPECT_EQ(pointer.mHeight, 1.0) << "mHeight";
  EXPECT_EQ(pointer.mIsPrimary, true) << "mIsPrimary";
  EXPECT_EQ(pointer.mFromTouchEvent, false) << "mFromTouchEvent";
}

}  // namespace mozilla
