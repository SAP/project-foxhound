/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/NavigationHistoryEntry.h"

#include "mozilla/dom/Document.h"
#include "mozilla/dom/NavigationHistoryEntryBinding.h"
#include "mozilla/dom/SessionHistoryEntry.h"
#include "nsDocShell.h"
#include "nsGlobalWindowInner.h"

extern mozilla::LazyLogModule gNavigationAPILog;

namespace mozilla::dom {

NS_IMPL_CYCLE_COLLECTION_INHERITED(NavigationHistoryEntry,
                                   DOMEventTargetHelper);
NS_IMPL_ADDREF_INHERITED(NavigationHistoryEntry, DOMEventTargetHelper)
NS_IMPL_RELEASE_INHERITED(NavigationHistoryEntry, DOMEventTargetHelper)

NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(NavigationHistoryEntry)
NS_INTERFACE_MAP_END_INHERITING(DOMEventTargetHelper)

NavigationHistoryEntry::NavigationHistoryEntry(
    nsIGlobalObject* aGlobal, const class SessionHistoryInfo* aSHInfo,
    int64_t aIndex)
    : DOMEventTargetHelper(aGlobal),
      mSHInfo(MakeUnique<class SessionHistoryInfo>(*aSHInfo)),
      mIndex(aIndex) {}

NavigationHistoryEntry::~NavigationHistoryEntry() = default;

// https://html.spec.whatwg.org/#dom-navigationhistoryentry-url
void NavigationHistoryEntry::GetUrl(nsAString& aResult) const {
  if (!HasActiveDocument()) {
    return;
  }

  // HasActiveDocument implies that GetAssociatedDocument returns non-null.
  MOZ_DIAGNOSTIC_ASSERT(GetAssociatedDocument());

  if (!SameDocument()) {
    const auto referrerPolicy =
        GetAssociatedDocument()->ReferrerPolicyUsedToFetchThisDocument();
    if (referrerPolicy == ReferrerPolicy::No_referrer ||
        referrerPolicy == ReferrerPolicy::Origin) {
      aResult.SetIsVoid(true);
      return;
    }
  }

  MOZ_ASSERT(mSHInfo);
  nsCOMPtr<nsIURI> uri = mSHInfo->GetURI();
  MOZ_ASSERT(uri);
  nsCString uriSpec;
  uri->GetSpec(uriSpec);
  CopyUTF8toUTF16(uriSpec, aResult);
}

// https://html.spec.whatwg.org/#dom-navigationhistoryentry-key
void NavigationHistoryEntry::GetKey(nsAString& aResult) const {
  if (!HasActiveDocument()) {
    return;
  }

  nsIDToCString keyString(mSHInfo->NavigationKey());
  // Omit the curly braces and NUL.
  CopyUTF8toUTF16(Substring(keyString.get() + 1, NSID_LENGTH - 3), aResult);
}

// https://html.spec.whatwg.org/#dom-navigationhistoryentry-id
void NavigationHistoryEntry::GetId(nsAString& aResult) const {
  if (!HasActiveDocument()) {
    return;
  }

  nsIDToCString idString(mSHInfo->NavigationId());
  // Omit the curly braces and NUL.
  CopyUTF8toUTF16(Substring(idString.get() + 1, NSID_LENGTH - 3), aResult);
}

// https://html.spec.whatwg.org/#dom-navigationhistoryentry-index
int64_t NavigationHistoryEntry::Index() const {
  MOZ_ASSERT(mSHInfo);
  if (!HasActiveDocument()) {
    return -1;
  }
  return mIndex;
}

// https://html.spec.whatwg.org/#dom-navigationhistoryentry-samedocument
bool NavigationHistoryEntry::SameDocument() const {
  if (!HasActiveDocument()) {
    return false;
  }

  // HasActiveDocument implies that GetAssociatedDocument returns non-null.
  MOZ_DIAGNOSTIC_ASSERT(GetAssociatedDocument());

  MOZ_ASSERT(mSHInfo);
  auto* docShell = nsDocShell::Cast(GetAssociatedDocument()->GetDocShell());
  return docShell && docShell->IsSameDocumentAsActiveEntry(*mSHInfo);
}

// https://html.spec.whatwg.org/#dom-navigationhistoryentry-getstate
void NavigationHistoryEntry::GetState(JSContext* aCx,
                                      JS::MutableHandle<JS::Value> aResult,
                                      ErrorResult& aRv) const {
  // Step 1
  aResult.setUndefined();
  if (!HasActiveDocument()) {
    return;
  }

  // Step 2
  RefPtr<nsIStructuredCloneContainer> state = mSHInfo->GetNavigationAPIState();
  if (!state) {
    return;
  }
  nsresult rv = state->DeserializeToJsval(aCx, aResult);
  if (NS_FAILED(rv)) {
    // nsStructuredCloneContainer::DeserializeToJsval suppresses exceptions, so
    // the best we can do is just re-throw the NS_ERROR_DOM_DATA_CLONE_ERR. When
    // nsStructuredCloneContainer::DeserializeToJsval throws better exceptions
    // this should too.
    // See also: NavigationDestination::GetState
    aRv.Throw(rv);
  }
}

void NavigationHistoryEntry::SetNavigationAPIState(
    nsIStructuredCloneContainer* aState) {
  mSHInfo->SetNavigationAPIState(aState);
}

bool NavigationHistoryEntry::IsSameEntry(
    const class SessionHistoryInfo* aSHInfo) const {
  return mSHInfo->NavigationId() == aSHInfo->NavigationId();
}

bool NavigationHistoryEntry::SharesDocumentWith(
    const class SessionHistoryInfo& aSHInfo) const {
  return mSHInfo->SharesDocumentWith(aSHInfo);
}

JSObject* NavigationHistoryEntry::WrapObject(
    JSContext* aCx, JS::Handle<JSObject*> aGivenProto) {
  return NavigationHistoryEntry_Binding::Wrap(aCx, this, aGivenProto);
}

Document* NavigationHistoryEntry::GetAssociatedDocument() const {
  nsGlobalWindowInner* window = GetOwnerWindow();
  return window ? window->GetDocument() : nullptr;
}

bool NavigationHistoryEntry::HasActiveDocument() const {
  if (auto* document = GetAssociatedDocument()) {
    return document->IsCurrentActiveDocument();
  }

  return false;
}

const nsID& NavigationHistoryEntry::Key() const {
  return mSHInfo->NavigationKey();
}

nsIStructuredCloneContainer* NavigationHistoryEntry::GetNavigationAPIState()
    const {
  if (!mSHInfo) {
    return nullptr;
  }

  return mSHInfo->GetNavigationAPIState();
}

void NavigationHistoryEntry::ResetIndexForDisposal() { mIndex = -1; }

}  // namespace mozilla::dom
