/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef dom_base_nsPIDOMWindowInlines_h_
#define dom_base_nsPIDOMWindowInlines_h_

#include "nsGlobalWindowInner.h"
#include "nsGlobalWindowOuter.h"

inline bool nsPIDOMWindowOuter::IsLoading() const {
  auto* win = GetCurrentInnerWindow();

  if (!win) {
    NS_ERROR("No current inner window available!");

    return false;
  }

  return win->IsLoading();
}

inline bool nsPIDOMWindowInner::IsLoading() const {
  if (!mOuterWindow) {
    NS_ERROR("IsLoading() called on orphan inner window!");

    return false;
  }

  return !mIsDocumentLoaded;
}

inline bool nsPIDOMWindowOuter::IsHandlingResizeEvent() const {
  auto* win = GetCurrentInnerWindow();

  if (!win) {
    NS_ERROR("No current inner window available!");

    return false;
  }

  return win->IsHandlingResizeEvent();
}

inline bool nsPIDOMWindowInner::IsHandlingResizeEvent() const {
  if (!mOuterWindow) {
    NS_ERROR("IsHandlingResizeEvent() called on orphan inner window!");

    return false;
  }

  return mIsHandlingResizeEvent;
}

inline bool nsPIDOMWindowInner::HasActiveDocument() const {
  return IsCurrentInnerWindow();
}

inline bool nsPIDOMWindowInner::IsTopInnerWindow() const {
  return mTopInnerWindow == this;
}

inline nsIDocShell* nsPIDOMWindowOuter::GetDocShell() const {
  return mDocShell;
}

inline nsIDocShell* nsPIDOMWindowInner::GetDocShell() const {
  return mOuterWindow ? mOuterWindow->GetDocShell() : nullptr;
}

inline mozilla::dom::BrowsingContext* nsPIDOMWindowOuter::GetBrowsingContext()
    const {
  return mBrowsingContext;
}

inline mozilla::dom::BrowsingContext* nsPIDOMWindowInner::GetBrowsingContext()
    const {
  return mBrowsingContext;
}

inline mozilla::dom::Element* nsPIDOMWindowOuter::GetFocusedElement() const {
  return mInnerWindow ? mInnerWindow->GetFocusedElement() : nullptr;
}

inline bool nsPIDOMWindowOuter::UnknownFocusMethodShouldShowOutline() const {
  return mInnerWindow && mInnerWindow->UnknownFocusMethodShouldShowOutline();
}

inline nsIGlobalObject* nsGlobalWindowInner::GetRelevantGlobal() const {
  return const_cast<nsGlobalWindowInner*>(this);
}

inline nsGlobalWindowOuter* nsGlobalWindowInner::GetInProcessTopInternal() {
  nsGlobalWindowOuter* outer = GetOuterWindowInternal();
  nsCOMPtr<nsPIDOMWindowOuter> top = outer ? outer->GetInProcessTop() : nullptr;
  if (top) {
    return nsGlobalWindowOuter::Cast(top);
  }
  return nullptr;
}

inline nsGlobalWindowOuter*
nsGlobalWindowInner::GetInProcessScriptableTopInternal() {
  nsPIDOMWindowOuter* top = GetInProcessScriptableTop();
  return nsGlobalWindowOuter::Cast(top);
}

inline nsIScriptContext* nsGlobalWindowInner::GetContextInternal() {
  if (mOuterWindow) {
    return GetOuterWindowInternal()->mContext;
  }

  return nullptr;
}

inline nsGlobalWindowOuter* nsGlobalWindowInner::GetOuterWindowInternal()
    const {
  return nsGlobalWindowOuter::Cast(GetOuterWindow());
}

#endif
