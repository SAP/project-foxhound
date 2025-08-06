/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Portions Copyright 2013 Microsoft Open Technologies, Inc. */

#ifndef mozilla_dom_PointerEvent_h_
#define mozilla_dom_PointerEvent_h_

#include "mozilla/dom/MouseEvent.h"
#include "mozilla/dom/PointerEventBinding.h"
#include "mozilla/Maybe.h"

class nsPresContext;

namespace mozilla::dom {

struct PointerEventInit;

class PointerEvent : public MouseEvent {
 public:
  PointerEvent(EventTarget* aOwner, nsPresContext* aPresContext,
               WidgetPointerEvent* aEvent);

  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(PointerEvent, MouseEvent)

  virtual JSObject* WrapObjectInternal(
      JSContext* aCx, JS::Handle<JSObject*> aGivenProto) override;

  static already_AddRefed<PointerEvent> Constructor(
      const GlobalObject& aGlobal, const nsAString& aType,
      const PointerEventInit& aParam);

  static already_AddRefed<PointerEvent> Constructor(
      EventTarget* aOwner, const nsAString& aType,
      const PointerEventInit& aParam);

  PointerEvent* AsPointerEvent() final { return this; }

  int32_t PointerId();
  int32_t Width();
  int32_t Height();
  float Pressure();
  float TangentialPressure();
  int32_t TiltX();
  int32_t TiltY();
  int32_t Twist();
  double AltitudeAngle();
  double AzimuthAngle();
  bool IsPrimary();
  void GetPointerType(nsAString& aPointerType);
  static bool EnableGetCoalescedEvents(JSContext* aCx, JSObject* aGlobal);
  void GetCoalescedEvents(nsTArray<RefPtr<PointerEvent>>& aPointerEvents);
  void GetPredictedEvents(nsTArray<RefPtr<PointerEvent>>& aPointerEvents);

 protected:
  ~PointerEvent() = default;

 private:
  // This method returns the boolean to indicate whether spoofing pointer
  // event for fingerprinting resistance.
  bool ShouldResistFingerprinting(bool aForPointerId = false) const;

  // When the instance is a trusted `pointermove` event but the widget event
  // does not have proper coalesced events (typically, the event is synthesized
  // for tests or instantiated in the main process), this fills mCoalescedEvents
  // with this instance.
  void EnsureFillingCoalescedEvents(WidgetPointerEvent& aWidgetEvent);

  nsTArray<RefPtr<PointerEvent>> mCoalescedEvents;
  nsTArray<RefPtr<PointerEvent>> mPredictedEvents;

  // This is used to store the pointerType assigned from constructor.
  Maybe<nsString> mPointerType;

  Maybe<int32_t> mTiltX;
  Maybe<int32_t> mTiltY;
  Maybe<double> mAltitudeAngle;
  Maybe<double> mAzimuthAngle;

  // https://w3c.github.io/pointerevents/#dfn-coalesced-events
  // https://w3c.github.io/pointerevents/#dfn-predicted-events
  // The events in the coalesced/predicted events list of a trusted event will
  // have:
  // ... Empty coalesced events list and predicted events list of their own.
  bool mCoalescedOrPredictedEvent = false;
};

void ConvertPointerTypeToString(uint16_t aPointerTypeSrc,
                                nsAString& aPointerTypeDest);

}  // namespace mozilla::dom

already_AddRefed<mozilla::dom::PointerEvent> NS_NewDOMPointerEvent(
    mozilla::dom::EventTarget* aOwner, nsPresContext* aPresContext,
    mozilla::WidgetPointerEvent* aEvent);

#endif  // mozilla_dom_PointerEvent_h_
