/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "BoundStorageKey.h"

#include "BoundStorageKeyCache.h"
#include "mozilla/dom/WorkerPrivate.h"
#include "mozilla/dom/cache/AutoUtils.h"
#include "mozilla/dom/cache/Cache.h"
#include "mozilla/dom/cache/CacheStorageChild.h"
#include "mozilla/dom/cache/CacheWorkerRef.h"
#include "mozilla/dom/quota/PrincipalUtils.h"
#include "mozilla/ipc/BackgroundChild.h"
#include "mozilla/ipc/PBackgroundChild.h"
#include "mozilla/ipc/PBackgroundSharedTypes.h"

namespace mozilla::dom::cache {
using mozilla::ipc::BackgroundChild;
using mozilla::ipc::PrincipalInfo;
NS_IMPL_ISUPPORTS(BoundStorageKey, nsISupports)

template <typename PromiseType>
struct BoundStorageKeyCacheStorage::Entry final {
  RefPtr<PromiseType> mPromise;
  CacheOpArgs mArgs;
};

nsresult BoundStorageKey::Init(Namespace aNamespace,
                               const PrincipalInfo& aPrincipalInfo,
                               nsISerialEventTarget* aTarget) {
  MOZ_DIAGNOSTIC_ASSERT(aTarget);

  // setup child and parent actors and retarget to aTarget
  auto* actor = new BoundStorageKeyChild(this);
  MOZ_ASSERT(actor);

  {
    ::mozilla::ipc::Endpoint<PBoundStorageKeyChild> childEP;
    ::mozilla::ipc::Endpoint<PBoundStorageKeyParent> parentEP;

    auto rv = PBoundStorageKey::CreateEndpoints(&parentEP, &childEP);
    (void)NS_WARN_IF(NS_FAILED(rv));

    PBackgroundChild* bgActor = BackgroundChild::GetOrCreateForCurrentThread();
    if (NS_WARN_IF(!bgActor)) {
      NS_WARNING("BoundStorageKey failed to obtain bgActor");
      return NS_ERROR_UNEXPECTED;
    }

    bgActor->SendCreateBoundStorageKeyParent(std::move(parentEP), aNamespace,
                                             aPrincipalInfo);

    if (NS_WARN_IF(!(childEP.Bind(actor, aTarget)))) {
      NS_WARNING("BoundStorageKeyChildActor failed to bind to target.");
      return NS_ERROR_UNEXPECTED;
    }
  }

  mActor = actor;
  return NS_OK;
}

void BoundStorageKey::OnActorDestroy(BoundStorageKeyChild* aActor) {
  MOZ_DIAGNOSTIC_ASSERT(mActor);
  MOZ_DIAGNOSTIC_ASSERT(mActor == aActor);
  MOZ_DIAGNOSTIC_ASSERT(!NS_FAILED(mStatus));

  // Note that we will never get an actor again in case another request is
  // made before this object is destructed.
  mActor->ClearListener();
  mActor = nullptr;
  mStatus = NS_ERROR_UNEXPECTED;
}

BoundStorageKey::~BoundStorageKey() {
  if (mActor) {
    mActor->StartDestroyFromListener();
  }
  MOZ_DIAGNOSTIC_ASSERT(!mActor);
}

// static
already_AddRefed<BoundStorageKeyCacheStorage>
BoundStorageKeyCacheStorage::Create(Namespace aNamespace,
                                    nsIGlobalObject* aGlobal,
                                    WorkerPrivate* aWorkerPrivate,
                                    nsISerialEventTarget* aActorTarget,
                                    ErrorResult& aRv) {
  MOZ_DIAGNOSTIC_ASSERT(aWorkerPrivate);

  if (aWorkerPrivate->GetOriginAttributes().IsPrivateBrowsing() &&
      !StaticPrefs::dom_cache_privateBrowsing_enabled()) {
    NS_WARNING("BoundStorageKey not supported during private browsing.");

    aRv = NS_ERROR_DOM_SECURITY_ERR;
    return nullptr;
  }

  const PrincipalInfo& principalInfo =
      aWorkerPrivate->GetEffectiveStoragePrincipalInfo();

  QM_TRY(OkIf(quota::IsPrincipalInfoValid(principalInfo)), nullptr,
         [&aRv](const auto) { aRv = NS_ERROR_FAILURE; });

  // We have a number of cases where we want to skip the https scheme
  // validation:
  //
  // 1) Any worker when dom.caches.testing.enabled pref is true.
  // 2) Any worker when dom.serviceWorkers.testing.enabled pref is true.  This
  //    is mainly because most sites using SWs will expect Cache to work if
  //    SWs are enabled.
  // 3) If the window that created this worker has the devtools SW testing
  //    option enabled.  Same reasoning as (2).
  // 4) If the worker itself is a ServiceWorker, then we always skip the
  //    origin checks.  The ServiceWorker has its own trusted origin checks
  //    that are better than ours.  In addition, we don't have information
  //    about the window any more, so we can't do our own checks.
  bool testingEnabled = StaticPrefs::dom_caches_testing_enabled() ||
                        StaticPrefs::dom_serviceWorkers_testing_enabled() ||
                        aWorkerPrivate->ServiceWorkersTestingInWindow() ||
                        aWorkerPrivate->IsServiceWorker();

  if (!IsTrusted(principalInfo, testingEnabled)) {
    NS_WARNING("BoundStorageKey not supported on untrusted origins.");

    aRv = NS_ERROR_UNEXPECTED;
    return nullptr;
  }

  RefPtr<BoundStorageKeyCacheStorage> ref =
      new BoundStorageKeyCacheStorage(aNamespace, aGlobal, principalInfo);

  auto rv = ref->Init(aWorkerPrivate, aNamespace, principalInfo, aActorTarget);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    aRv = rv;
    return nullptr;
  }

  MOZ_ASSERT(ref->mActor);
  return ref.forget();
}

nsresult BoundStorageKeyCacheStorage::Init(WorkerPrivate* aWorkerPrivate,
                                           Namespace aNamespace,
                                           const PrincipalInfo& aPrincipalInfo,
                                           nsISerialEventTarget* aTarget) {
  auto rc = BoundStorageKey::Init(aNamespace, aPrincipalInfo, aTarget);
  if (NS_FAILED(rc)) {
    return rc;
  }

  mCacheStorageChild = CreateCacheStorageChild(aWorkerPrivate);
  MOZ_ASSERT(mCacheStorageChild);

  return mCacheStorageChild ? NS_OK : NS_ERROR_FAILURE;
}

BoundStorageKeyCacheStorage::BoundStorageKeyCacheStorage(
    Namespace aNamespace, nsIGlobalObject* aGlobal,
    const mozilla::ipc::PrincipalInfo& aPrincipalInfo)
    : mGlobal(aGlobal),
      mPrincipalInfo(MakeUnique<PrincipalInfo>(aPrincipalInfo)),
      mNamespace(aNamespace) {}

void BoundStorageKeyCacheStorage::OnActorDestroy(CacheStorageChild* aActor) {
  AssertOwningThread();

  MOZ_DIAGNOSTIC_ASSERT(mActor);
  MOZ_DIAGNOSTIC_ASSERT(mCacheStorageChild.get() == aActor);

  mCacheStorageChild->ClearListener();
  mCacheStorageChild = nullptr;
}

BoundStorageKeyCacheStorage::~BoundStorageKeyCacheStorage() {
  AssertOwningThread();
  if (mCacheStorageChild) {
    mCacheStorageChild->StartDestroyFromListener();
  }
}

already_AddRefed<CacheStorageChild>
BoundStorageKeyCacheStorage::CreateCacheStorageChild(
    WorkerPrivate* aWorkerPrivate) {
  SafeRefPtr<CacheWorkerRef> workerRef;
  if (aWorkerPrivate) {
    aWorkerPrivate->AssertIsOnWorkerThread();
    workerRef =
        CacheWorkerRef::Create(aWorkerPrivate, CacheWorkerRef::eIPCWorkerRef);
    if (NS_WARN_IF(!workerRef)) {
      return nullptr;
    }
  }

  RefPtr<CacheStorageChild> newActor =
      new CacheStorageChild(this, std::move(workerRef), mActor.get());
  auto* constructedActor = mActor->SendPCacheStorageConstructor(
      newActor, mNamespace, *mPrincipalInfo);

  if (NS_WARN_IF(!constructedActor)) {
    mStatus = NS_ERROR_UNEXPECTED;
    return nullptr;
  }

  MOZ_DIAGNOSTIC_ASSERT(newActor == constructedActor);
  return newActor.forget();
}

template <typename EntryType>
void BoundStorageKeyCacheStorage::RunRequest(EntryType&& aEntry) {
  MOZ_ASSERT(mActor);
  MOZ_ASSERT(mCacheStorageChild);

  AutoChildOpArgs args(this, aEntry.mArgs, 1);
  RefPtr<CacheStoragePromise> p{aEntry.mPromise.forget()};
  mCacheStorageChild->ExecuteOp(mGlobal, p, this, args.SendAsOpArgs());
}

auto BoundStorageKeyCacheStorage::Open(const nsAString& aKey, ErrorResult& aRv)
    -> already_AddRefed<CacheStoragePromise> {
  AssertOwningThread();

  if (NS_WARN_IF(NS_FAILED(mStatus))) {
    aRv = mStatus;
    return nullptr;
  }

  RefPtr<OpenResultPromise::Private> promise{
      new OpenResultPromise::Private(__func__)};
  RunRequest(Entry<OpenResultPromise::Private>{
      promise, StorageOpenArgs{nsString(aKey)}});

  return promise.forget();
}

auto BoundStorageKeyCacheStorage::Has(const nsAString& aKey, ErrorResult& aRv)
    -> already_AddRefed<CacheStoragePromise> {
  AssertOwningThread();

  if (NS_WARN_IF(NS_FAILED(mStatus))) {
    aRv = mStatus;
    return nullptr;
  }

  RefPtr<HasResultPromise::Private> promise{
      new HasResultPromise::Private(__func__)};
  RunRequest(Entry<HasResultPromise::Private>{promise,
                                              StorageHasArgs(nsString(aKey))});

  return promise.forget();
}

auto BoundStorageKeyCacheStorage::Delete(const nsAString& aKey,
                                         ErrorResult& aRv)
    -> already_AddRefed<CacheStoragePromise> {
  AssertOwningThread();

  if (NS_WARN_IF(NS_FAILED(mStatus))) {
    aRv = mStatus;
    return nullptr;
  }

  RefPtr<DeleteResultPromise::Private> promise{
      new DeleteResultPromise::Private(__func__)};
  RunRequest(Entry<DeleteResultPromise::Private>{
      promise, StorageDeleteArgs{nsString(aKey)}});

  return promise.forget();
}

auto BoundStorageKeyCacheStorage::Keys(ErrorResult& aRv)
    -> already_AddRefed<CacheStoragePromise> {
  AssertOwningThread();

  if (NS_WARN_IF(NS_FAILED(mStatus))) {
    aRv = mStatus;
    return nullptr;
  }

  RefPtr<KeysResultPromise::Private> promise{
      new KeysResultPromise::Private(__func__)};
  RunRequest(Entry<KeysResultPromise::Private>{promise, StorageKeysArgs()});

  return promise.forget();
}

}  // namespace mozilla::dom::cache
