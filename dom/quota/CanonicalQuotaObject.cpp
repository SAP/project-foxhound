/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "CanonicalQuotaObject.h"

#include "GroupInfo.h"
#include "GroupInfoPair.h"
#include "OriginInfo.h"
#include "mozilla/DebugOnly.h"
#include "mozilla/dom/StorageActivityService.h"
#include "mozilla/dom/quota/AssertionsImpl.h"
#include "mozilla/dom/quota/NotifyUtils.h"
#include "mozilla/dom/quota/OriginDirectoryLock.h"
#include "mozilla/dom/quota/QuotaManager.h"
#include "mozilla/ipc/BackgroundParent.h"

namespace mozilla::dom::quota {

NS_IMETHODIMP_(MozExternalRefCountType) CanonicalQuotaObject::AddRef() {
  QuotaManager* quotaManager = QuotaManager::Get();
  if (!quotaManager) {
    NS_ERROR("Null quota manager, this shouldn't happen, possible leak!");

    return ++mRefCnt;
  }

  MutexAutoLock lock(quotaManager->mQuotaMutex);

  return ++mRefCnt;
}

NS_IMETHODIMP_(MozExternalRefCountType) CanonicalQuotaObject::Release() {
  QuotaManager* quotaManager = QuotaManager::Get();
  if (!quotaManager) {
    NS_ERROR("Null quota manager, this shouldn't happen, possible leak!");

    nsrefcnt count = --mRefCnt;
    if (count == 0) {
      mRefCnt = 1;
      delete this;
      return 0;
    }

    return mRefCnt;
  }

  {
    MutexAutoLock lock(quotaManager->mQuotaMutex);

    --mRefCnt;

    if (mRefCnt > 0) {
      return mRefCnt;
    }

    if (mOriginInfo) {
      mOriginInfo->mCanonicalQuotaObjects.Remove(mPath);
    }
  }

  delete this;
  return 0;
}

bool CanonicalQuotaObject::MaybeUpdateSize(int64_t aSize, bool aTruncate) {
  QuotaManager* quotaManager = QuotaManager::Get();
  MOZ_ASSERT(quotaManager);

  MutexAutoLock lock(quotaManager->mQuotaMutex);

  return LockedMaybeUpdateSize(aSize, aTruncate);
}

bool CanonicalQuotaObject::IncreaseSize(int64_t aDelta) {
  MOZ_ASSERT(aDelta >= 0);

  QuotaManager* quotaManager = QuotaManager::Get();
  MOZ_ASSERT(quotaManager);

  MutexAutoLock lock(quotaManager->mQuotaMutex);

  AssertNoOverflow(mSize, aDelta);
  int64_t size = mSize + aDelta;

  return LockedMaybeUpdateSize(size, /* aTruncate */ false);
}

void CanonicalQuotaObject::DisableQuotaCheck() {
  QuotaManager* quotaManager = QuotaManager::Get();
  MOZ_ASSERT(quotaManager);

  MutexAutoLock lock(quotaManager->mQuotaMutex);

  mQuotaCheckDisabled = true;
}

void CanonicalQuotaObject::EnableQuotaCheck() {
  QuotaManager* quotaManager = QuotaManager::Get();
  MOZ_ASSERT(quotaManager);

  MutexAutoLock lock(quotaManager->mQuotaMutex);

  mQuotaCheckDisabled = false;
}

bool CanonicalQuotaObject::LockedMaybeUpdateSize(int64_t aSize, bool aTruncate)
    MOZ_NO_THREAD_SAFETY_ANALYSIS {
  QuotaManager* quotaManager = QuotaManager::Get();
  MOZ_ASSERT(quotaManager);

  quotaManager->mQuotaMutex.AssertCurrentThreadOwns();

  if (mWritingDone == false && mOriginInfo) {
    mWritingDone = true;
    StorageActivityService::SendActivity(mOriginInfo->mOrigin);
  }

  if (mQuotaCheckDisabled) {
    return true;
  }

  if (mSize == aSize) {
    return true;
  }

  if (!mOriginInfo) {
    mSize = aSize;
    return true;
  }

  DebugOnly<GroupInfo*> groupInfo = mOriginInfo->mGroupInfo;
  MOZ_ASSERT(groupInfo);

  if (mSize > aSize) {
    if (aTruncate) {
      const int64_t delta = mSize - aSize;
      mOriginInfo->LockedTruncateUsages(mClientType, delta);
      mSize = aSize;
    }
    return true;
  }

  MOZ_ASSERT(mSize < aSize);

  uint64_t delta = aSize - mSize;

  // Temporary storage has no limit for origin usage (there's a group and the
  // global limit though).

  if (const auto& maybeReturnValue =
          mOriginInfo->LockedUpdateUsages(mClientType, delta)) {
    if (maybeReturnValue.value()) {
      mSize = aSize;  // No limit was breached and we are done.
    }

    return maybeReturnValue.value();
  }

  // This will block the thread without holding the lock while waitting.

  AutoTArray<RefPtr<OriginDirectoryLock>, 10> locks;
  uint64_t sizeToBeFreed;

  if (::mozilla::ipc::IsOnBackgroundThread()) {
    MutexAutoUnlock autoUnlock(quotaManager->mQuotaMutex);

    sizeToBeFreed = quotaManager->CollectOriginsForEviction(delta, locks);
  } else {
    sizeToBeFreed = quotaManager->LockedCollectOriginsForEviction(delta, locks);
  }

  if (!sizeToBeFreed) {
    uint64_t usage = quotaManager->mTemporaryStorageUsage;

    MutexAutoUnlock autoUnlock(quotaManager->mQuotaMutex);

    NotifyStoragePressure(*quotaManager, usage);

    return false;
  }

  NS_ASSERTION(sizeToBeFreed >= delta, "Huh?");

  {
    MutexAutoUnlock autoUnlock(quotaManager->mQuotaMutex);

    for (const auto& lock : locks) {
      quotaManager->DeleteOriginDirectory(lock->OriginMetadata());
    }
  }

  // Relocked.

  NS_ASSERTION(mOriginInfo, "How come?!");

  for (const auto& lock : locks) {
    MOZ_ASSERT(!(lock->GetPersistenceType() == groupInfo->mPersistenceType &&
                 lock->Origin() == mOriginInfo->mOrigin),
               "Deleted itself!");

    quotaManager->LockedRemoveQuotaForOrigin(lock->OriginMetadata());
  }

  // We unlocked and relocked several times so we need to recompute all the
  // essential variables and recheck the group limit.

  AssertNoUnderflow(aSize, mSize);
  const uint64_t increase = aSize - mSize;

  if (!mOriginInfo->LockedUpdateUsagesForEviction(mClientType, increase)) {
    // Unfortunately some other thread increased the group usage in the
    // meantime and we are not below the group limit anymore.

    // However, the origin eviction must be finalized in this case too.
    MutexAutoUnlock autoUnlock(quotaManager->mQuotaMutex);

    quotaManager->FinalizeOriginEviction(std::move(locks));
    return false;
  }

  // Some other thread could increase the size in the meantime, but no more
  // than this one.
  MOZ_ASSERT(mSize < aSize);
  mSize = aSize;

  // Finally, release IO thread only objects and allow next synchronized
  // ops for the evicted origins.
  MutexAutoUnlock autoUnlock(quotaManager->mQuotaMutex);

  quotaManager->FinalizeOriginEviction(std::move(locks));

  return true;
}

}  // namespace mozilla::dom::quota
