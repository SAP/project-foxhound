/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_cache_BackgroundStorageKey_h
#define mozilla_dom_cache_BackgroundStorageKey_h

#include "BoundStorageKeyChild.h"
#include "ErrorList.h"
#include "mozilla/MozPromise.h"
#include "mozilla/dom/cache/CacheTypes.h"
#include "mozilla/dom/cache/TypeUtils.h"

namespace mozilla {
namespace ipc {
class PrincipalInfo;
class PBackgroundChild;
}  // namespace ipc

namespace dom {
class Response;

namespace cache {
extern bool IsTrusted(const ::mozilla::ipc::PrincipalInfo& aPrincipalInfo,
                      bool aTestingPrefEnabled);
class CacheStorageChild;
class BoundStorageKeyCache;

using mozilla::ipc::PrincipalInfo;

/* BoundStorageKey ipdl would be used to work with all storage APIs
 * between child and parent process. BoundStorageKey is a generic
 * base class and represents all respective derived storage classes.
 * BoundStorageKeyCacheStorage below is one such class which deals with
 * cachestorage and like this, there could be more in the future like
 * BoundStorageKeyIDB for IndexedDB, etc.
 *
 * TODO: it might be worth moving BoundStorageKey protocol definition,
 * implementation into separate directory while more derived implementations
 * could be under their respective storage directories like dom/cache for
 * BoundStorageKeyCacheStorage.
 */
class BoundStorageKey : public nsISupports,
                        public BoundStorageKeyChildListener {
 public:
  using PBackgroundChild = ::mozilla::ipc::PBackgroundChild;

  NS_DECL_ISUPPORTS
  BoundStorageKey() : mActor(nullptr), mStatus(NS_OK) {}

  // Overrides Listener methods and are called by
  // BoundStorageKeyChild and CacheStorageChild
  void OnActorDestroy(BoundStorageKeyChild* aActor) override;

 protected:
  virtual ~BoundStorageKey();

  // Initialization is performed here i.e.
  // 1. Child and parent actors are setup and connection is attempted.
  // 2. EventTarget has been retargetted to aTarget
  nsresult Init(Namespace aNamespace, const PrincipalInfo& aPrincipalInfo,
                nsISerialEventTarget* aTarget = GetCurrentSerialEventTarget());

  RefPtr<BoundStorageKeyChild> mActor;
  nsresult mStatus;
};

using CacheStoragePromise = MozPromiseBase;
using OpenResultPromise =
    mozilla::MozPromise<RefPtr<BoundStorageKeyCache>, ErrorResult,
                        true /*IsExclusive=*/>;
using DeleteResultPromise =
    mozilla::MozPromise<bool, ErrorResult, true /* IsExclusive= */>;
using HasResultPromise =
    mozilla::MozPromise<bool, ErrorResult, true /* IsExclusive= */>;
using KeysResultPromise =
    mozilla::MozPromise<CopyableTArray<nsString>, ErrorResult,
                        true /* IsExclusive= */>;
using MatchResultPromise =
    mozilla::MozPromise<RefPtr<Response>, ErrorResult, true /* IsExclusive= */>;

/* This class exposes Cache APIs to be used by internal clients and is currently
 * used by service workers when performing a lookup for cache'd scripts. This is
 * intended to be used by internal clients only and is in contrast with
 * CacheStorage which is used by internal and JS clients; though comparatively,
 * internal clients would find it easier to work with this class. There are two
 * major differences between the two:
 *  1. APIs in CacheStorage return JS promise whereas this class return
 * MozPromise
 *  2. Even though both classes uses same underlying actors but actor used here
 * gets spun off of top-level actor, BoundStorageKeyChild which could be
 * retargetted to any event target.
 * TODO: Since we have two implementations now; this class and CacheStorage with
 * almost similar responsibilities; it maybe worth exploring to consolidate
 * both.
 */
class BoundStorageKeyCacheStorage final : public BoundStorageKey,
                                          public TypeUtils,
                                          public CacheStorageChildListener {
 public:
  static already_AddRefed<BoundStorageKeyCacheStorage> Create(
      Namespace aNamespace, nsIGlobalObject* aGlobal,
      WorkerPrivate* aWorkerPrivate, nsISerialEventTarget* aActorTarget,
      ErrorResult& aRv);

#ifdef DEBUG
  void AssertOwningThread() const override {
    NS_ASSERT_OWNINGTHREAD(BoundStorageKey);
  }
#else
  inline void AssertOwningThread() const {}
#endif

  nsresult Init(WorkerPrivate* aWorkerPrivate, Namespace aNamespace,
                const PrincipalInfo& aPrincipalInfo,
                nsISerialEventTarget* aTarget = GetCurrentSerialEventTarget());

  // Below methods declares the APIs that this class exposes, which looks
  // similar to CacheStorage but return type is different
  already_AddRefed<CacheStoragePromise> Match(
      JSContext* aCx, const RequestOrUTF8String& aRequest,
      const MultiCacheQueryOptions& aOptions, ErrorResult& aRv);
  already_AddRefed<CacheStoragePromise> Has(const nsAString& aKey,
                                            ErrorResult& aRv);
  already_AddRefed<CacheStoragePromise> Open(const nsAString& aKey,
                                             ErrorResult& aRv);
  already_AddRefed<CacheStoragePromise> Delete(const nsAString& aKey,
                                               ErrorResult& aRv);
  already_AddRefed<CacheStoragePromise> Keys(ErrorResult& aRv);

  nsIGlobalObject* GetGlobalObject() const override { return mGlobal; }

  // explicitly exposing below OnActorDestroy to avoid cpp name hidiing
  using BoundStorageKey::OnActorDestroy;

  // called by associated CacheStorageChild actor during destruction.
  void OnActorDestroy(CacheStorageChild* aActor) override;

 private:
  template <typename PromiseType>
  struct Entry;

  BoundStorageKeyCacheStorage(
      Namespace aNamespace, nsIGlobalObject* aGlobal,
      const mozilla::ipc::PrincipalInfo& aPrincipalInfo);

  already_AddRefed<CacheStorageChild> CreateCacheStorageChild(
      WorkerPrivate* aWorkerPrivate);
  ~BoundStorageKeyCacheStorage() override;

  template <typename EntryType>
  void RunRequest(EntryType&& aEntry);

  RefPtr<CacheStorageChild> mCacheStorageChild;

  nsCOMPtr<nsIGlobalObject> mGlobal;
  const UniquePtr<mozilla::ipc::PrincipalInfo> mPrincipalInfo;
  const Namespace mNamespace;
};

}  // namespace cache

template <dom::cache::CacheOpResult::Type OP_TYPE>
struct cachestorage_traits;

template <>
struct cachestorage_traits<
    dom::cache::CacheOpResult::Type::TStorageMatchResult> {
  using PromiseType = cache::MatchResultPromise::Private;
};

template <>
struct cachestorage_traits<dom::cache::CacheOpResult::Type::TStorageHasResult> {
  using PromiseType = cache::HasResultPromise::Private;
};

template <>
struct cachestorage_traits<
    dom::cache::CacheOpResult::Type::TStorageOpenResult> {
  using PromiseType = cache::OpenResultPromise::Private;
};

template <>
struct cachestorage_traits<
    dom::cache::CacheOpResult::Type::TStorageDeleteResult> {
  using PromiseType = cache::DeleteResultPromise::Private;
};

template <>
struct cachestorage_traits<
    dom::cache::CacheOpResult::Type::TStorageKeysResult> {
  using PromiseType = cache::KeysResultPromise::Private;
};

template <>
struct cachestorage_traits<dom::cache::CacheOpResult::Type::Tvoid_t> {
  // Tvoid_t is only used to report errors, Resolve value doesn't matter much
  // here. Just using HasResultPromise has it has simple Resolve value
  using PromiseType = cache::HasResultPromise::Private;
};

}  // namespace dom
}  // namespace mozilla

#endif  // mozilla_dom_cache_BackgroundStorageKey_h
