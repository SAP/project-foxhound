/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "GlobalTeardownObserver.h"

#include "mozilla/dom/Document.h"
#include "nsGlobalWindowInner.h"

namespace mozilla {

GlobalTeardownObserver::GlobalTeardownObserver() = default;
GlobalTeardownObserver::GlobalTeardownObserver(nsIGlobalObject* aGlobalObject,
                                               bool aHasOrHasHadOwnerWindow)
    : mHasOrHasHadOwnerWindow(aHasOrHasHadOwnerWindow) {
  BindToGlobal(aGlobalObject);
}

GlobalTeardownObserver::~GlobalTeardownObserver() {
  if (mParentObject) {
    mParentObject->RemoveGlobalTeardownObserver(this);
  }
}

nsGlobalWindowInner* GlobalTeardownObserver::GetOwnerWindow() const {
  return mHasOrHasHadOwnerWindow
             ? static_cast<nsGlobalWindowInner*>(mParentObject)
             : nullptr;
}

void GlobalTeardownObserver::BindToGlobal(nsIGlobalObject* aGlobal) {
  MOZ_ASSERT(!mParentObject);

  if (aGlobal) {
    mParentObject = aGlobal;
    aGlobal->AddGlobalTeardownObserver(this);
    const bool isWindow = !!aGlobal->GetAsInnerWindow();
    MOZ_ASSERT_IF(!isWindow, !mHasOrHasHadOwnerWindow);
    mHasOrHasHadOwnerWindow = isWindow;
  }
}

void GlobalTeardownObserver::DisconnectFromOwner() {
  if (mParentObject) {
    mParentObject->RemoveGlobalTeardownObserver(this);
    mParentObject = nullptr;
  }
}

nsresult GlobalTeardownObserver::CheckCurrentGlobalCorrectness() const {
  if (!mParentObject) {
    if (NS_IsMainThread() && !HasOrHasHadOwnerWindow()) {
      return NS_OK;
    }
    return NS_ERROR_FAILURE;
  }

  // Main-thread.
  if (mHasOrHasHadOwnerWindow) {
    auto* ownerWin = static_cast<nsGlobalWindowInner*>(mParentObject);
    if (!ownerWin->IsCurrentInnerWindow()) {
      return NS_ERROR_FAILURE;
    }
  }

  if (NS_IsMainThread()) {
    return NS_OK;
  }

  // Not on main thread, might check if is on the global's owning thread before
  // calling IsDying().
  if (mParentObject->IsDying()) {
    return NS_ERROR_FAILURE;
  }

  return NS_OK;
}

};  // namespace mozilla
