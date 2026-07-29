/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsSHEntryShared.h"

#include "nsContentUtils.h"
#include "nsISHistory.h"
#include "mozilla/dom/Document.h"
#include "nsILayoutHistoryState.h"
#include "nsIWebNavigation.h"
#include "nsSHistory.h"
#include "nsThreadUtils.h"
#include "nsFrameLoader.h"

namespace {
uint64_t gSHEntrySharedID = 0;
nsTHashMap<nsUint64HashKey, mozilla::dom::SHEntrySharedParentState*>*
    sIdToSharedState = nullptr;
}  // namespace

namespace mozilla {
namespace dom {

/* static */
uint64_t SHEntrySharedState::GenerateId() {
  return nsContentUtils::GenerateProcessSpecificId(++gSHEntrySharedID);
}

/* static */
SHEntrySharedParentState* SHEntrySharedParentState::Lookup(uint64_t aId) {
  MOZ_ASSERT(aId != 0);

  return sIdToSharedState ? sIdToSharedState->Get(aId) : nullptr;
}

static void AddSHEntrySharedParentState(
    SHEntrySharedParentState* aSharedState) {
  MOZ_ASSERT(aSharedState->mId != 0);

  if (!sIdToSharedState) {
    sIdToSharedState =
        new nsTHashMap<nsUint64HashKey, SHEntrySharedParentState*>();
  }
  sIdToSharedState->InsertOrUpdate(aSharedState->mId, aSharedState);
}

SHEntrySharedParentState::SHEntrySharedParentState() {
  AddSHEntrySharedParentState(this);
}

SHEntrySharedParentState::SHEntrySharedParentState(
    nsIPrincipal* aTriggeringPrincipal, nsIPrincipal* aPrincipalToInherit,
    nsIPrincipal* aPartitionedPrincipalToInherit,
    nsIPolicyContainer* aPolicyContainer, const nsACString& aContentType)
    : SHEntrySharedState(aTriggeringPrincipal, aPrincipalToInherit,
                         aPartitionedPrincipalToInherit, aPolicyContainer,
                         aContentType) {
  AddSHEntrySharedParentState(this);
}

SHEntrySharedParentState::~SHEntrySharedParentState() {
  MOZ_ASSERT(mId != 0);

  RefPtr<nsFrameLoader> loader = mFrameLoader;
  SetFrameLoader(nullptr);
  if (loader) {
    if (NS_FAILED(NS_DispatchToCurrentThread(NS_NewRunnableFunction(
            "SHEntrySharedParentState::~SHEntrySharedParentState",
            [loader]() -> void { loader->AsyncDestroy(); })))) {
      // Trigger AsyncDestroy immediately during shutdown.
      loader->AsyncDestroy();
    }
  }

  sIdToSharedState->Remove(mId);
  if (sIdToSharedState->IsEmpty()) {
    delete sIdToSharedState;
    sIdToSharedState = nullptr;
  }
}

void SHEntrySharedParentState::ChangeId(uint64_t aId) {
  MOZ_ASSERT(aId != 0);

  sIdToSharedState->Remove(mId);
  mId = aId;
  sIdToSharedState->InsertOrUpdate(mId, this);
}

void SHEntrySharedParentState::CopyFrom(SHEntrySharedParentState* aEntry) {
  mDocShellID = aEntry->mDocShellID;
  mTriggeringPrincipal = aEntry->mTriggeringPrincipal;
  mPrincipalToInherit = aEntry->mPrincipalToInherit;
  mPartitionedPrincipalToInherit = aEntry->mPartitionedPrincipalToInherit;
  mPolicyContainer = aEntry->mPolicyContainer;
  mSaveLayoutState = aEntry->mSaveLayoutState;
  mContentType.Assign(aEntry->mContentType);
  mIsFrameNavigation = aEntry->mIsFrameNavigation;
  mSticky = aEntry->mSticky;
  mDynamicallyCreated = aEntry->mDynamicallyCreated;
  mCacheKey = aEntry->mCacheKey;
  mLastTouched = aEntry->mLastTouched;
}

void dom::SHEntrySharedParentState::NotifyListenersDocumentViewerEvicted() {
  if (nsCOMPtr<nsISHistory> shistory = do_QueryReferent(mSHistory)) {
    RefPtr<nsSHistory> nsshistory = static_cast<nsSHistory*>(shistory.get());
    nsshistory->NotifyListenersDocumentViewerEvicted(1);
  }
}

void SHEntrySharedChildState::CopyFrom(SHEntrySharedChildState* aEntry) {
  mChildShells.AppendObjects(aEntry->mChildShells);
}

void SHEntrySharedParentState::SetFrameLoader(nsFrameLoader* aFrameLoader) {
  // If expiration tracker is removing this object, IsTracked() returns false.
  if (GetExpirationState()->IsTracked() && mFrameLoader) {
    if (nsCOMPtr<nsISHistory> shistory = do_QueryReferent(mSHistory)) {
      shistory->RemoveFromExpirationTracker(this);
    }
  }

  mFrameLoader = aFrameLoader;

  if (mFrameLoader) {
    if (nsCOMPtr<nsISHistory> shistory = do_QueryReferent(mSHistory)) {
      shistory->AddToExpirationTracker(this);
    }
  }
}

nsFrameLoader* SHEntrySharedParentState::GetFrameLoader() {
  return mFrameLoader;
}

}  // namespace dom
}  // namespace mozilla
