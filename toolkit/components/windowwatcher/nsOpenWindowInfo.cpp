/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsOpenWindowInfo.h"

#include "mozilla/dom/BrowserParent.h"
#include "mozilla/dom/ToJSValue.h"
#include "nsIClassInfoImpl.h"

NS_IMPL_CLASSINFO(nsOpenWindowInfo, nullptr, 0, NS_OPENWINDOWINFO_CID)
NS_IMPL_ISUPPORTS_CI(nsOpenWindowInfo, nsIOpenWindowInfo);

nsOpenWindowInfo::nsOpenWindowInfo() = default;
nsOpenWindowInfo::~nsOpenWindowInfo() = default;

nsOpenWindowInfo::nsOpenWindowInfo(const nsOpenWindowInfo& aOther)
    : mForceNoOpener(aOther.mForceNoOpener),
      mIsRemote(aOther.mIsRemote),
      mIsForPrinting(aOther.mIsForPrinting),
      mIsForWindowDotPrint(aOther.mIsForWindowDotPrint),
      mIsTopLevelCreatedByWebContent(aOther.mIsTopLevelCreatedByWebContent),
      mHasValidUserGestureActivation(aOther.mHasValidUserGestureActivation),
      mTextDirectiveUserActivation(aOther.mTextDirectiveUserActivation),
      mNextRemoteBrowser(aOther.mNextRemoteBrowser),
      mParent(aOther.mParent),
      mBrowsingContextReadyCallback(aOther.mBrowsingContextReadyCallback),
      mPrincipalToInheritForAboutBlank(aOther.mPrincipalToInheritForAboutBlank),
      mPartitionedPrincipalToInheritForAboutBlank(
          aOther.mPartitionedPrincipalToInheritForAboutBlank),
      mBaseUriToInheritForAboutBlank(aOther.mBaseUriToInheritForAboutBlank),
      mPolicyContainerToInheritForAboutBlank(
          aOther.mPolicyContainerToInheritForAboutBlank),
      mCoepToInheritForAboutBlank(aOther.mCoepToInheritForAboutBlank) {};

NS_IMETHODIMP nsOpenWindowInfo::GetParent(
    mozilla::dom::BrowsingContext** aParent) {
  *aParent = do_AddRef(mParent).take();
  return NS_OK;
}

NS_IMETHODIMP nsOpenWindowInfo::GetIsRemote(bool* aIsRemote) {
  *aIsRemote = mIsRemote;
  return NS_OK;
}

NS_IMETHODIMP nsOpenWindowInfo::GetIsForWindowDotPrint(bool* aResult) {
  *aResult = mIsForWindowDotPrint;
  return NS_OK;
}

NS_IMETHODIMP nsOpenWindowInfo::GetIsForPrinting(bool* aIsForPrinting) {
  *aIsForPrinting = mIsForPrinting;
  return NS_OK;
}

NS_IMETHODIMP nsOpenWindowInfo::GetForceNoOpener(bool* aForceNoOpener) {
  *aForceNoOpener = mForceNoOpener;
  return NS_OK;
}

NS_IMETHODIMP nsOpenWindowInfo::GetIsTopLevelCreatedByWebContent(
    bool* aIsTopLevelCreatedByWebContent) {
  *aIsTopLevelCreatedByWebContent = mIsTopLevelCreatedByWebContent;
  return NS_OK;
}

NS_IMETHODIMP nsOpenWindowInfo::GetHasValidUserGestureActivation(
    bool* aHasValidUserGestureActivation) {
  *aHasValidUserGestureActivation = mHasValidUserGestureActivation;
  return NS_OK;
}

NS_IMETHODIMP nsOpenWindowInfo::GetTextDirectiveUserActivation(
    bool* aTextDirectiveUserActivation) {
  *aTextDirectiveUserActivation = mTextDirectiveUserActivation;
  return NS_OK;
}

NS_IMETHODIMP nsOpenWindowInfo::GetScriptableOriginAttributes(
    JSContext* aCx, JS::MutableHandle<JS::Value> aAttrs) {
  bool ok = ToJSValue(aCx, GetOriginAttributes(), aAttrs);
  NS_ENSURE_TRUE(ok, NS_ERROR_FAILURE);
  return NS_OK;
}

nsIPrincipal* nsOpenWindowInfo::PrincipalToInheritForAboutBlank() {
  MOZ_ASSERT(mPrincipalToInheritForAboutBlank, "Must have principal");
  return mPrincipalToInheritForAboutBlank;
}

nsIPrincipal* nsOpenWindowInfo::PartitionedPrincipalToInheritForAboutBlank() {
  if (mPartitionedPrincipalToInheritForAboutBlank) {
    return mPartitionedPrincipalToInheritForAboutBlank;
  }
  MOZ_ASSERT(mPrincipalToInheritForAboutBlank, "Must have principal");
  return mPrincipalToInheritForAboutBlank;
}

nsIURI* nsOpenWindowInfo::BaseUriToInheritForAboutBlank() {
  return mBaseUriToInheritForAboutBlank;
}

nsIPolicyContainer* nsOpenWindowInfo::PolicyContainerToInheritForAboutBlank() {
  return mPolicyContainerToInheritForAboutBlank;
}

const mozilla::Maybe<nsILoadInfo::CrossOriginEmbedderPolicy>&
nsOpenWindowInfo::CoepToInheritForAboutBlank() {
  return mCoepToInheritForAboutBlank;
}

const mozilla::OriginAttributes& nsOpenWindowInfo::GetOriginAttributes() {
  return mPrincipalToInheritForAboutBlank->OriginAttributesRef();
}

mozilla::dom::BrowserParent* nsOpenWindowInfo::GetNextRemoteBrowser() {
  return mNextRemoteBrowser;
}

nsIBrowsingContextReadyCallback*
nsOpenWindowInfo::BrowsingContextReadyCallback() {
  return mBrowsingContextReadyCallback;
}

NS_IMETHODIMP nsOpenWindowInfo::Cancel() {
  if (mBrowsingContextReadyCallback) {
    mBrowsingContextReadyCallback->BrowsingContextReady(nullptr);
    mBrowsingContextReadyCallback = nullptr;
  }
  return NS_OK;
}

NS_IMPL_ISUPPORTS(nsBrowsingContextReadyCallback,
                  nsIBrowsingContextReadyCallback)

nsBrowsingContextReadyCallback::nsBrowsingContextReadyCallback(
    RefPtr<mozilla::dom::BrowsingContextCallbackReceivedPromise::Private>
        aPromise)
    : mPromise(std::move(aPromise)) {}

nsBrowsingContextReadyCallback::~nsBrowsingContextReadyCallback() {
  if (mPromise) {
    mPromise->Reject(NS_ERROR_FAILURE, __func__);
  }
  mPromise = nullptr;
}

NS_IMETHODIMP nsBrowsingContextReadyCallback::BrowsingContextReady(
    mozilla::dom::BrowsingContext* aBC) {
  MOZ_DIAGNOSTIC_ASSERT(mPromise,
                        "The 'browsing context ready' callback is null");
  if (!mPromise) {
    return NS_OK;
  }
  if (aBC) {
    mPromise->Resolve(aBC, __func__);
  } else {
    mPromise->Reject(NS_ERROR_FAILURE, __func__);
  }
  mPromise = nullptr;
  return NS_OK;
}

NS_IMETHODIMP nsOpenWindowInfo::CloneWithPrincipals(
    nsIPrincipal* aPrincipal, nsIPrincipal* aPartitionedPrincipal,
    nsIOpenWindowInfo** aClone) {
  NS_ENSURE_ARG(aPrincipal);
  NS_ENSURE_ARG(aPartitionedPrincipal);
  RefPtr<nsOpenWindowInfo> clone = new nsOpenWindowInfo(*this);
  clone->mPrincipalToInheritForAboutBlank = aPrincipal;
  clone->mPartitionedPrincipalToInheritForAboutBlank = aPartitionedPrincipal;
  clone.forget(aClone);
  return NS_OK;
}
