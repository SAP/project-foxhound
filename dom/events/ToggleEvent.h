/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_TOGGLEEVENT_H_
#define DOM_TOGGLEEVENT_H_

#include "mozilla/EventForwards.h"
#include "mozilla/dom/Event.h"
#include "mozilla/dom/ToggleEventBinding.h"

namespace mozilla::dom {

class ToggleEvent : public Event {
 public:
  explicit ToggleEvent(EventTarget* aOwner);
  ToggleEvent* AsToggleEvent() override { return this; }

  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(ToggleEvent, Event)

  JSObject* WrapObjectInternal(JSContext* aCx,
                               JS::Handle<JSObject*> aGivenProto) override {
    return ToggleEvent_Binding::Wrap(aCx, this, aGivenProto);
  }

  static already_AddRefed<ToggleEvent> Constructor(
      mozilla::dom::EventTarget* aOwner, const nsAString& aType,
      const ToggleEventInit& aEventInitDict);

  static already_AddRefed<ToggleEvent> Constructor(
      const GlobalObject& aGlobal, const nsAString& aType,
      const ToggleEventInit& aEventInitDict);

  void GetOldState(nsString& aRetVal) const;

  void GetNewState(nsString& aRetVal) const;

  void SetSource(Element* aSource);
  Element* GetSource();

 protected:
  ~ToggleEvent() = default;

 private:
  nsString mOldState;
  nsString mNewState;
  RefPtr<Element> mSource;
};

already_AddRefed<mozilla::dom::ToggleEvent> NS_NewDOMToggleEvent(
    mozilla::dom::EventTarget* aOwner, nsPresContext* aPresContext,
    mozilla::WidgetGUIEvent* aEvent);

}  // namespace mozilla::dom

#endif  // DOM_TOGGLEEVENT_H_
