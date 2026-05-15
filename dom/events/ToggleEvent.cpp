/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/ToggleEvent.h"

#include "mozilla/MiscEvents.h"
#include "mozilla/dom/Element.h"
#include "nsContentUtils.h"

namespace mozilla::dom {

NS_IMPL_CYCLE_COLLECTION_INHERITED(ToggleEvent, Event, mSource)

NS_IMPL_ADDREF_INHERITED(ToggleEvent, Event)
NS_IMPL_RELEASE_INHERITED(ToggleEvent, Event)

NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(ToggleEvent)
NS_INTERFACE_MAP_END_INHERITING(Event)

ToggleEvent::ToggleEvent(mozilla::dom::EventTarget* aOwner)
    : Event(aOwner, nullptr, nullptr) {}

already_AddRefed<ToggleEvent> ToggleEvent::Constructor(
    const GlobalObject& aGlobal, const nsAString& aType,
    const ToggleEventInit& aEventInitDict) {
  nsCOMPtr<mozilla::dom::EventTarget> owner =
      do_QueryInterface(aGlobal.GetAsSupports());
  return Constructor(owner, aType, aEventInitDict);
}

already_AddRefed<ToggleEvent> ToggleEvent::Constructor(
    mozilla::dom::EventTarget* aOwner, const nsAString& aType,
    const ToggleEventInit& aEventInitDict) {
  RefPtr<ToggleEvent> e = new ToggleEvent(aOwner);
  bool trusted = e->Init(aOwner);
  e->InitEvent(aType, aEventInitDict.mBubbles, aEventInitDict.mCancelable);
  e->mOldState = aEventInitDict.mOldState;
  e->mNewState = aEventInitDict.mNewState;
  e->mSource = aEventInitDict.mSource;
  e->SetTrusted(trusted);
  e->SetComposed(aEventInitDict.mComposed);
  return e.forget();
}

void ToggleEvent::GetOldState(nsString& aRetVal) const { aRetVal = mOldState; }

void ToggleEvent::GetNewState(nsString& aRetVal) const { aRetVal = mNewState; }

void ToggleEvent::SetSource(Element* aSource) { mSource = aSource; }

Element* ToggleEvent::GetSource() {
  EventTarget* currentTarget = GetCurrentTarget();
  nsINode* retargeted = nsContentUtils::Retarget(
      mSource, currentTarget ? currentTarget->GetAsNode() : nullptr);
  return retargeted ? retargeted->AsElement() : nullptr;
}

}  // namespace mozilla::dom
