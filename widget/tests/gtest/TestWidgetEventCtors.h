/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef TestWidgetEventCtors_h
#define TestWidgetEventCtors_h

#include "mozilla/MouseEvents.h"
#include "mozilla/TouchEvents.h"

namespace mozilla {

inline void CompletelyCopy(const WidgetEventTime& aSource,
                           WidgetEventTime& aDest) {
  aDest.mTimeStamp = aSource.mTimeStamp;
}

inline void CompletelyCopy(const WidgetEvent& aSource, WidgetEvent& aDest) {
  CompletelyCopy(static_cast<const WidgetEventTime&>(aSource),
                 static_cast<WidgetEventTime&>(aDest));
  aDest.mClass = aSource.mClass;
  aDest.mMessage = aSource.mMessage;
  aDest.mRefPoint = aSource.mRefPoint;
  aDest.mLastRefPoint = aSource.mLastRefPoint;
  aDest.mFocusSequenceNumber = aSource.mFocusSequenceNumber;
  aDest.mFlags = aSource.mFlags;
  aDest.mSpecifiedEventType = aSource.mSpecifiedEventType;
  aDest.mSpecifiedEventTypeString = aSource.mSpecifiedEventTypeString;
  aDest.mTarget = aSource.mTarget;
  aDest.mCurrentTarget = aSource.mCurrentTarget;
  aDest.mOriginalTarget = aSource.mOriginalTarget;
  aDest.mRelatedTarget = aSource.mRelatedTarget;
  aDest.mOriginalRelatedTarget = aSource.mOriginalRelatedTarget;
  aDest.mPath = aSource.mPath;
  aDest.mLayersId = aSource.mLayersId;
}

inline void CompletelyCopy(const WidgetGUIEvent& aSource,
                           WidgetGUIEvent& aDest) {
  CompletelyCopy(static_cast<const WidgetEvent&>(aSource),
                 static_cast<WidgetEvent&>(aDest));
  aDest.mWidget = aSource.mWidget;
}

inline void CompletelyCopy(const WidgetInputEvent& aSource,
                           WidgetInputEvent& aDest) {
  CompletelyCopy(static_cast<const WidgetGUIEvent&>(aSource),
                 static_cast<WidgetGUIEvent&>(aDest));
  aDest.mModifiers = aSource.mModifiers;
}

// MouseEvents.h

inline void CompletelyCopy(const WidgetMouseEventBase& aSource,
                           WidgetMouseEventBase& aDest) {
  CompletelyCopy(static_cast<const WidgetInputEvent&>(aSource),
                 static_cast<WidgetInputEvent&>(aDest));
  aDest.mPressure = aSource.mPressure;
  aDest.mButton = aSource.mButton;
  aDest.mButtons = aSource.mButtons;
  aDest.mInputSource = aSource.mInputSource;
}

inline void CompletelyCopy(const WidgetPointerHelper& aSource,
                           WidgetPointerHelper& aDest) {
  aDest.pointerId = aSource.pointerId;
  aDest.mTilt = aSource.mTilt;
  aDest.twist = aSource.twist;
  aDest.mAngle = aSource.mAngle;
  aDest.tangentialPressure = aSource.tangentialPressure;
  aDest.convertToPointer = aSource.convertToPointer;
  aDest.convertToPointerRawUpdate = aSource.convertToPointerRawUpdate;
  aDest.mCoalescedWidgetEvents = aSource.mCoalescedWidgetEvents;
}

inline void CompletelyCopy(const WidgetMouseEvent& aSource,
                           WidgetMouseEvent& aDest) {
  CompletelyCopy(static_cast<const WidgetMouseEventBase&>(aSource),
                 static_cast<WidgetMouseEventBase&>(aDest));
  CompletelyCopy(static_cast<const WidgetPointerHelper&>(aSource),
                 static_cast<WidgetPointerHelper&>(aDest));
  aDest.mClickTarget = aSource.mClickTarget;
  aDest.mReason = aSource.mReason;
  aDest.mContextMenuTrigger = aSource.mContextMenuTrigger;
  aDest.mExitFrom = aSource.mExitFrom;
  aDest.mClickCount = aSource.mClickCount;
  aDest.mIgnoreRootScrollFrame = aSource.mIgnoreRootScrollFrame;
  aDest.mIgnoreCapturingContent = aSource.mIgnoreCapturingContent;
  aDest.mClickEventPrevented = aSource.mClickEventPrevented;
  aDest.mSynthesizeMoveAfterDispatch = aSource.mSynthesizeMoveAfterDispatch;
  aDest.mTriggerEvent = aSource.mTriggerEvent;
  aDest.mCallbackId = aSource.mCallbackId;
}

inline void CompletelyCopy(const WidgetDragEvent& aSource,
                           WidgetDragEvent& aDest) {
  CompletelyCopy(static_cast<const WidgetMouseEvent&>(aSource),
                 static_cast<WidgetMouseEvent&>(aDest));
  aDest.mDataTransfer = aSource.mDataTransfer;
  aDest.mUserCancelled = aSource.mUserCancelled;
  aDest.mDefaultPreventedOnContent = aSource.mDefaultPreventedOnContent;
  aDest.mInHTMLEditorEventListener = aSource.mInHTMLEditorEventListener;
}

inline void CompletelyCopy(const WidgetPointerEvent& aSource,
                           WidgetPointerEvent& aDest) {
  CompletelyCopy(static_cast<const WidgetMouseEvent&>(aSource),
                 static_cast<WidgetMouseEvent&>(aDest));
  aDest.mWidth = aSource.mWidth;
  aDest.mHeight = aSource.mHeight;
  aDest.mIsPrimary = aSource.mIsPrimary;
  aDest.mFromTouchEvent = aSource.mFromTouchEvent;
}

// TouchEvents.

inline void CompletelyCopy(const WidgetSimpleGestureEvent& aSource,
                           WidgetSimpleGestureEvent& aDest) {
  CompletelyCopy(static_cast<const WidgetMouseEventBase&>(aSource),
                 static_cast<WidgetMouseEventBase&>(aDest));
  aDest.mAllowedDirections = aSource.mAllowedDirections;
  aDest.mDirection = aSource.mDirection;
  aDest.mClickCount = aSource.mClickCount;
  aDest.mDelta = aSource.mDelta;
}

inline void CompletelyCopy(const WidgetTouchEvent& aSource,
                           WidgetTouchEvent& aDest) {
  CompletelyCopy(static_cast<const WidgetInputEvent&>(aSource),
                 static_cast<WidgetInputEvent&>(aDest));
  aDest.mTouches.Clear();
  aDest.mTouches.AppendElements(aSource.mTouches);
  aDest.mInputSource = aSource.mInputSource;
  aDest.mButton = aSource.mButton;
  aDest.mButtons = aSource.mButtons;
  aDest.mCallbackId = aSource.mCallbackId;
}

}  // namespace mozilla

#endif  // #ifndef TestWidgetEventCtors_h
