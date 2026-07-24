/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_NavigationActivation_h_
#define mozilla_dom_NavigationActivation_h_

#include "nsCOMPtr.h"
#include "nsISupports.h"
#include "nsWrapperCache.h"

class nsIGlobalObject;

namespace mozilla::dom {

class NavigationHistoryEntry;
enum class NavigationType : uint8_t;

class NavigationActivation final : public nsISupports, public nsWrapperCache {
 public:
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_CYCLE_COLLECTION_WRAPPERCACHE_CLASS(NavigationActivation)

  NavigationActivation(nsIGlobalObject* aGlobal,
                       NavigationHistoryEntry* aNewEntry,
                       NavigationHistoryEntry* aOldEntry, NavigationType aType);

  already_AddRefed<NavigationHistoryEntry> GetFrom() const;
  already_AddRefed<NavigationHistoryEntry> Entry() const;
  // https://html.spec.whatwg.org/#dom-navigationactivation-navigationtype
  enum NavigationType NavigationType() const { return mType; }

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;
  nsIGlobalObject* GetParentObject() const { return mGlobal; }

 private:
  ~NavigationActivation() = default;

  nsCOMPtr<nsIGlobalObject> mGlobal;
  // https://html.spec.whatwg.org/#nav-activation-new-entry
  RefPtr<NavigationHistoryEntry> mNewEntry;
  // https://html.spec.whatwg.org/#nav-activation-old-entry
  RefPtr<NavigationHistoryEntry> mOldEntry;
  // https://html.spec.whatwg.org/#nav-activation-navigation-type
  enum NavigationType mType;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_NavigationActivation_h_
