/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/NavigationActivation.h"

#include "mozilla/dom/NavigationActivationBinding.h"
#include "mozilla/dom/NavigationHistoryEntry.h"

namespace mozilla::dom {

NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE(NavigationActivation, mNewEntry,
                                      mOldEntry, mGlobal)
NS_IMPL_CYCLE_COLLECTING_ADDREF(NavigationActivation)
NS_IMPL_CYCLE_COLLECTING_RELEASE(NavigationActivation)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(NavigationActivation)
  NS_WRAPPERCACHE_INTERFACE_MAP_ENTRY
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END

NavigationActivation::NavigationActivation(nsIGlobalObject* aGlobal,
                                           NavigationHistoryEntry* aNewEntry,
                                           NavigationHistoryEntry* aOldEntry,
                                           enum NavigationType aType)
    : mGlobal(aGlobal),
      mNewEntry(aNewEntry),
      mOldEntry(aOldEntry),
      mType(aType) {}

JSObject* NavigationActivation::WrapObject(JSContext* aCx,
                                           JS::Handle<JSObject*> aGivenProto) {
  return NavigationActivation_Binding::Wrap(aCx, this, aGivenProto);
}

// https://html.spec.whatwg.org/#dom-navigationactivation-from
already_AddRefed<NavigationHistoryEntry> NavigationActivation::GetFrom() const {
  return do_AddRef(mOldEntry);
}

// https://html.spec.whatwg.org/#dom-navigationactivation-entry
already_AddRefed<NavigationHistoryEntry> NavigationActivation::Entry() const {
  return do_AddRef(mNewEntry);
}

}  // namespace mozilla::dom
