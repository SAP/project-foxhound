/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/NavigationDestination.h"

#include "nsIURI.h"

#include "nsError.h"
#include "nsReadableUtils.h"

#include "mozilla/ErrorResult.h"

#include "mozilla/dom/NavigationDestinationBinding.h"
#include "mozilla/dom/NavigationHistoryEntry.h"

namespace mozilla::dom {

NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE(NavigationDestination, mGlobal, mEntry,
                                      mState)
NS_IMPL_CYCLE_COLLECTING_ADDREF(NavigationDestination)
NS_IMPL_CYCLE_COLLECTING_RELEASE(NavigationDestination)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(NavigationDestination)
  NS_WRAPPERCACHE_INTERFACE_MAP_ENTRY
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END

NavigationDestination::NavigationDestination(nsIGlobalObject* aGlobal,
                                             nsIURI* aURI,
                                             NavigationHistoryEntry* aEntry,
                                             nsStructuredCloneContainer* aState,
                                             bool aIsSameDocument)
    : mGlobal(aGlobal),
      mURL(aURI),
      mEntry(aEntry),
      mState(aState),
      mIsSameDocument(aIsSameDocument) {}

// https://html.spec.whatwg.org/#dom-navigationdestination-url
void NavigationDestination::GetUrl(nsString& aURL) const {
  nsAutoCString uri;
  nsresult rv = mURL->GetSpec(uri);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    aURL.Truncate();
    return;
  }

  CopyUTF8toUTF16(uri, aURL);
}

// https://html.spec.whatwg.org/#dom-navigationdestination-key
void NavigationDestination::GetKey(nsString& aKey) const {
  if (!mEntry) {
    aKey.Truncate();
    return;
  }

  mEntry->GetKey(aKey);
}

// https://html.spec.whatwg.org/#dom-navigationdestination-id
void NavigationDestination::GetId(nsString& aId) const {
  if (!mEntry) {
    aId.Truncate();
    return;
  }

  mEntry->GetId(aId);
}

// https://html.spec.whatwg.org/#dom-navigationdestination-index
int64_t NavigationDestination::Index() const {
  if (!mEntry) {
    return -1;
  }

  return mEntry->Index();
}

// https://html.spec.whatwg.org/#dom-navigationdestination-samedocument
bool NavigationDestination::SameDocument() const { return mIsSameDocument; }

// https://html.spec.whatwg.org/#dom-navigationdestination-getstate
void NavigationDestination::GetState(JSContext* aCx,
                                     JS::MutableHandle<JS::Value> aRetVal,
                                     ErrorResult& aRv) const {
  nsresult rv = mState->DeserializeToJsval(aCx, aRetVal);
  if (NS_FAILED(rv)) {
    // nsStructuredCloneContainer::DeserializeToJsval suppresses exceptions, so
    // the best we can do is just re-throw the NS_ERROR_DOM_DATA_CLONE_ERR. When
    // nsStructuredCloneContainer::DeserializeToJsval throws better exceptions
    // this should too.
    aRv.Throw(rv);
    return;
  }
}

JSObject* NavigationDestination::WrapObject(JSContext* aCx,
                                            JS::Handle<JSObject*> aGivenProto) {
  return NavigationDestination_Binding::Wrap(aCx, this, aGivenProto);
}

nsIGlobalObject* NavigationDestination::GetParentObject() { return mGlobal; }

}  // namespace mozilla::dom
