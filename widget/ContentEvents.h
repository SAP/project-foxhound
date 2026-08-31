/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_ContentEvents_h_
#define mozilla_ContentEvents_h_

#include "mozilla/BasicEvents.h"
#include "mozilla/dom/DataTransfer.h"
#include "mozilla/dom/EventTarget.h"
#include "nsCOMPtr.h"
#include "nsRect.h"
#include "nsString.h"

class nsIContent;

namespace mozilla {

namespace dom {
class CSSAnimation;
class CSSTransition;
}  // namespace dom

/******************************************************************************
 * mozilla::InternalScrollPortEvent
 ******************************************************************************/

class InternalScrollPortEvent final : public WidgetGUIEvent {
 public:
  NS_DEFINE_AS_EVENT_OVERRIDE(Internal, ScrollPortEvent);

  enum OrientType { eVertical, eHorizontal, eBoth };

  InternalScrollPortEvent(bool aIsTrusted, EventMessage aMessage,
                          nsIWidget* aWidget,
                          const WidgetEventTime* aTime = nullptr)
      : WidgetGUIEvent(aIsTrusted, aMessage, aWidget, eScrollPortEventClass,
                       aTime),
        mOrient(eVertical) {}

  NS_DEFINE_VIRTUAL_DESTRUCTOR_CHECKING_CLASS_VALUE(InternalScrollPortEvent,
                                                    eScrollPortEventClass,
                                                    eGUIEventClass)

  virtual WidgetEvent* Duplicate() const override {
    MOZ_ASSERT(mClass == eScrollPortEventClass,
               "Duplicate() must be overridden by sub class");
    // Not copying widget, it is a weak reference.
    InternalScrollPortEvent* result =
        new InternalScrollPortEvent(false, mMessage, nullptr, this);
    result->AssignScrollPortEventData(*this, true);
    result->mFlags = mFlags;
    return result;
  }

  OrientType mOrient;

  void AssignScrollPortEventData(const InternalScrollPortEvent& aEvent,
                                 bool aCopyTargets) {
    AssignGUIEventData(aEvent, aCopyTargets);

    mOrient = aEvent.mOrient;
  }
};

/******************************************************************************
 * mozilla::InternalScrollPortEvent
 ******************************************************************************/

class InternalScrollAreaEvent final : public WidgetGUIEvent {
 public:
  NS_DEFINE_AS_EVENT_OVERRIDE(Internal, ScrollAreaEvent);

  InternalScrollAreaEvent(bool aIsTrusted, EventMessage aMessage,
                          nsIWidget* aWidget,
                          const WidgetEventTime* aTime = nullptr)
      : WidgetGUIEvent(aIsTrusted, aMessage, aWidget, eScrollAreaEventClass,
                       aTime) {}

  NS_DEFINE_VIRTUAL_DESTRUCTOR_CHECKING_CLASS_VALUE(InternalScrollAreaEvent,
                                                    eScrollAreaEventClass,
                                                    eGUIEventClass)

  virtual WidgetEvent* Duplicate() const override {
    MOZ_ASSERT(mClass == eScrollAreaEventClass,
               "Duplicate() must be overridden by sub class");
    // Not copying widget, it is a weak reference.
    InternalScrollAreaEvent* result =
        new InternalScrollAreaEvent(false, mMessage, nullptr, this);
    result->AssignScrollAreaEventData(*this, true);
    result->mFlags = mFlags;
    return result;
  }

  nsRect mArea;

  void AssignScrollAreaEventData(const InternalScrollAreaEvent& aEvent,
                                 bool aCopyTargets) {
    AssignGUIEventData(aEvent, aCopyTargets);

    mArea = aEvent.mArea;
  }
};

/******************************************************************************
 * mozilla::InternalFormEvent
 *
 * We hold the originating form control for form submit and reset events.
 * mOriginator is a weak pointer (does not hold a strong reference).
 ******************************************************************************/

class InternalFormEvent final : public WidgetEvent {
 public:
  NS_DEFINE_AS_EVENT_OVERRIDE(Internal, FormEvent);

  InternalFormEvent(bool aIsTrusted, EventMessage aMessage,
                    const WidgetEventTime* aTime = nullptr)
      : WidgetEvent(aIsTrusted, aMessage, eFormEventClass, aTime),
        mOriginator(nullptr) {}

  NS_DEFINE_VIRTUAL_DESTRUCTOR_CHECKING_CLASS_VALUE(InternalFormEvent,
                                                    eFormEventClass,
                                                    eBasicEventClass)

  virtual WidgetEvent* Duplicate() const override {
    MOZ_ASSERT(mClass == eFormEventClass,
               "Duplicate() must be overridden by sub class");
    InternalFormEvent* result = new InternalFormEvent(false, mMessage, this);
    result->AssignFormEventData(*this, true);
    result->mFlags = mFlags;
    return result;
  }

  nsIContent* mOriginator;

  void AssignFormEventData(const InternalFormEvent& aEvent, bool aCopyTargets) {
    AssignEventData(aEvent, aCopyTargets);

    // Don't copy mOriginator due to a weak pointer.
  }
};

/******************************************************************************
 * mozilla::InternalClipboardEvent
 ******************************************************************************/

class InternalClipboardEvent final : public WidgetEvent {
 public:
  NS_DEFINE_AS_EVENT_OVERRIDE(Internal, ClipboardEvent);

  InternalClipboardEvent(bool aIsTrusted, EventMessage aMessage,
                         const WidgetEventTime* aTime = nullptr)
      : WidgetEvent(aIsTrusted, aMessage, eClipboardEventClass, aTime) {}

  NS_DEFINE_VIRTUAL_DESTRUCTOR_CHECKING_CLASS_VALUE(InternalClipboardEvent,
                                                    eClipboardEventClass,
                                                    eBasicEventClass)

  virtual WidgetEvent* Duplicate() const override {
    MOZ_ASSERT(mClass == eClipboardEventClass,
               "Duplicate() must be overridden by sub class");
    InternalClipboardEvent* result =
        new InternalClipboardEvent(false, mMessage, this);
    result->AssignClipboardEventData(*this, true);
    result->mFlags = mFlags;
    return result;
  }

  nsCOMPtr<dom::DataTransfer> mClipboardData;

  void AssignClipboardEventData(const InternalClipboardEvent& aEvent,
                                bool aCopyTargets) {
    AssignEventData(aEvent, aCopyTargets);

    mClipboardData = aEvent.mClipboardData;
  }
};

/******************************************************************************
 * mozilla::InternalFocusEvent
 ******************************************************************************/

class InternalFocusEvent final : public InternalUIEvent {
 public:
  NS_DEFINE_AS_EVENT_OVERRIDE(Internal, FocusEvent);

  InternalFocusEvent(bool aIsTrusted, EventMessage aMessage,
                     const WidgetEventTime* aTime = nullptr)
      : InternalUIEvent(aIsTrusted, aMessage, eFocusEventClass, aTime),
        mFromRaise(false),
        mIsRefocus(false) {}

  NS_DEFINE_VIRTUAL_DESTRUCTOR_CHECKING_CLASS_VALUE(InternalFocusEvent,
                                                    eFocusEventClass,
                                                    eUIEventClass)

  virtual WidgetEvent* Duplicate() const override {
    MOZ_ASSERT(mClass == eFocusEventClass,
               "Duplicate() must be overridden by sub class");
    InternalFocusEvent* result = new InternalFocusEvent(false, mMessage, this);
    result->AssignFocusEventData(*this, true);
    result->mFlags = mFlags;
    return result;
  }

  bool mFromRaise;
  bool mIsRefocus;

  void AssignFocusEventData(const InternalFocusEvent& aEvent,
                            bool aCopyTargets) {
    AssignUIEventData(aEvent, aCopyTargets);

    mFromRaise = aEvent.mFromRaise;
    mIsRefocus = aEvent.mIsRefocus;
  }
};

/******************************************************************************
 * mozilla::InternalTransitionEvent
 ******************************************************************************/

class InternalTransitionEvent final : public WidgetEvent {
 public:
  NS_DEFINE_AS_EVENT_OVERRIDE(Internal, TransitionEvent);

  InternalTransitionEvent(bool aIsTrusted, EventMessage aMessage,
                          const WidgetEventTime* aTime = nullptr);

  InternalTransitionEvent(const InternalTransitionEvent&) = delete;
  InternalTransitionEvent& operator=(const InternalTransitionEvent&) = delete;
  InternalTransitionEvent(InternalTransitionEvent&&);
  InternalTransitionEvent& operator=(InternalTransitionEvent&&);

  ~InternalTransitionEvent();

  WidgetEvent* Duplicate() const override;

  nsString mPropertyName;
  nsString mPseudoElement;
  float mElapsedTime;
  RefPtr<dom::CSSTransition> mAnimation;

  void AssignTransitionEventData(const InternalTransitionEvent& aEvent,
                                 bool aCopyTargets);
};

/******************************************************************************
 * mozilla::InternalAnimationEvent
 ******************************************************************************/

class InternalAnimationEvent final : public WidgetEvent {
 public:
  NS_DEFINE_AS_EVENT_OVERRIDE(Internal, AnimationEvent);

  InternalAnimationEvent(bool aIsTrusted, EventMessage aMessage,
                         const WidgetEventTime* aTime = nullptr);

  InternalAnimationEvent(const InternalAnimationEvent&) = delete;
  InternalAnimationEvent& operator=(const InternalAnimationEvent&) = delete;
  InternalAnimationEvent(InternalAnimationEvent&&);
  InternalAnimationEvent& operator=(InternalAnimationEvent&&);

  virtual ~InternalAnimationEvent();

  WidgetEvent* Duplicate() const override;

  nsString mAnimationName;
  nsString mPseudoElement;
  float mElapsedTime;
  RefPtr<dom::CSSAnimation> mAnimation;

  void AssignAnimationEventData(const InternalAnimationEvent& aEvent,
                                bool aCopyTargets);
};

/******************************************************************************
 * mozilla::InternalSMILTimeEvent
 ******************************************************************************/

class InternalSMILTimeEvent final : public InternalUIEvent {
 public:
  NS_DEFINE_AS_EVENT_OVERRIDE(Internal, SMILTimeEvent);

  InternalSMILTimeEvent(bool aIsTrusted, EventMessage aMessage,
                        const WidgetEventTime* aTime = nullptr)
      : InternalUIEvent(aIsTrusted, aMessage, eSMILTimeEventClass, aTime) {}

  NS_DEFINE_VIRTUAL_DESTRUCTOR_CHECKING_CLASS_VALUE(InternalSMILTimeEvent,
                                                    eSMILTimeEventClass,
                                                    eUIEventClass)

  virtual WidgetEvent* Duplicate() const override {
    MOZ_ASSERT(mClass == eSMILTimeEventClass,
               "Duplicate() must be overridden by sub class");
    InternalSMILTimeEvent* result =
        new InternalSMILTimeEvent(false, mMessage, this);
    result->AssignSMILTimeEventData(*this, true);
    result->mFlags = mFlags;
    return result;
  }

  void AssignSMILTimeEventData(const InternalSMILTimeEvent& aEvent,
                               bool aCopyTargets) {
    AssignUIEventData(aEvent, aCopyTargets);
  }
};

}  // namespace mozilla

#endif  // mozilla_ContentEvents_h_
