/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_cache_BoundStorageKeyCache_h
#define mozilla_dom_cache_BoundStorageKeyCache_h

#include "mozilla/dom/cache/CacheTypes.h"
#include "mozilla/dom/cache/TypeUtils.h"
#include "mozilla/dom/cache/Types.h"
#include "nsCOMPtr.h"
#include "nsISupportsImpl.h"

class nsIGlobalObject;

namespace mozilla {
class ErrorResult;

namespace dom {

class OwningRequestOrUTF8String;
struct CacheQueryOptions;
class RequestOrUTF8String;
class Response;
class Request;
template <typename T>
class Optional;
template <typename T>
class Sequence;
enum class CallerType : uint32_t;

namespace cache {
class AutoChildOpArgs;
class CacheChild;

using CachePromise = MozPromiseBase;

/* This is similar to Cache class as BoundStorageKeyCacheStorage is to
 * CacheStorage i.e.
 * 1. Exposes and implements Cache APIs but uses MozPromise as it's return value
 * rather than JS Promise
 * 2. IPC communication can be retargetted to any event target as it's protocol
 * gets created on a top-level actor
 */
class BoundStorageKeyCache final : public nsISupports,
                                   public TypeUtils,
                                   public CacheChildListener {
 public:
  NS_DECL_ISUPPORTS

  using MatchResultPromise =
      mozilla::MozPromise<RefPtr<dom::Response>, ErrorResult,
                          true /* IsExclusive= */>;
  using MatchAllResultPromise =
      mozilla::MozPromise<nsTArray<RefPtr<dom::Response>>, ErrorResult,
                          true /* IsExclusive= */>;
  using AddResultPromise =
      mozilla::MozPromise<bool, ErrorResult, true /* IsExclusive= */>;
  using AddAllResultPromise =
      mozilla::MozPromise<bool, ErrorResult, true /* IsExclusive= */>;
  using PutResultPromise =
      mozilla::MozPromise<bool, ErrorResult, true /* IsExclusive= */>;
  using PutAllResultPromise =
      mozilla::MozPromise<bool, ErrorResult, true /* IsExclusive= */>;
  using DeleteResultPromise =
      mozilla::MozPromise<bool, ErrorResult, true /* IsExclusive= */>;
  using KeysResultPromise =
      mozilla::MozPromise<nsTArray<SafeRefPtr<dom::Request>>, ErrorResult,
                          true /* IsExclusive= */>;

  BoundStorageKeyCache(nsIGlobalObject* aGlobal, CacheChild* aActor,
                       Namespace aNamespace);

  static bool CachesEnabled(JSContext* aCx, JSObject*);

  already_AddRefed<CachePromise> Match(JSContext* aCx,
                                       const RequestOrUTF8String& aRequest,
                                       const CacheQueryOptions& aOptions,
                                       ErrorResult& aRv);

  already_AddRefed<CachePromise> MatchAll(
      JSContext* aCx, const Optional<RequestOrUTF8String>& aRequest,
      const CacheQueryOptions& aOptions, ErrorResult& aRv);

  already_AddRefed<CachePromise> Add(JSContext* aContext,
                                     const RequestOrUTF8String& aRequest,
                                     CallerType aCallerType, ErrorResult& aRv);

  already_AddRefed<CachePromise> AddAll(
      JSContext* aContext,
      const Sequence<OwningRequestOrUTF8String>& aRequestList,
      CallerType aCallerType, ErrorResult& aRv);

  already_AddRefed<CachePromise> Put(JSContext* aCx,
                                     const RequestOrUTF8String& aRequest,
                                     Response& aResponse, ErrorResult& aRv);

  already_AddRefed<CachePromise> Delete(JSContext* aCx,
                                        const RequestOrUTF8String& aRequest,
                                        const CacheQueryOptions& aOptions,
                                        ErrorResult& aRv);

  already_AddRefed<CachePromise> Keys(
      JSContext* aCx, const Optional<RequestOrUTF8String>& aRequest,
      const CacheQueryOptions& aOptions, ErrorResult& aRv);

  // Called when CacheChild actor is being destroyed
  void OnActorDestroy(CacheChild* aActor) override;

  // TypeUtils methods
  virtual nsIGlobalObject* GetGlobalObject() const override;

#ifdef DEBUG
  virtual void AssertOwningThread() const override;
#endif

 private:
  ~BoundStorageKeyCache();

  // Called when we're destroyed or CCed.
  void DisconnectFromActor();

  void ExecuteOp(AutoChildOpArgs& aOpArgs, RefPtr<CachePromise>& aPromise,
                 ErrorResult& aRv);

  already_AddRefed<CachePromise> AddAll(
      const GlobalObject& aGlobal, nsTArray<SafeRefPtr<Request>>&& aRequestList,
      CallerType aCallerType, ErrorResult& aRv);

  already_AddRefed<CachePromise> PutAll(
      JSContext* aCx, const nsTArray<SafeRefPtr<Request>>& aRequestList,
      const nsTArray<RefPtr<Response>>& aResponseList, ErrorResult& aRv);

  OpenMode GetOpenMode() const;

  nsCOMPtr<nsIGlobalObject> mGlobal;
  CacheChild* mActor;
  const Namespace mNamespace;
};

}  // namespace cache

template <dom::cache::CacheOpResult::Type OP_TYPE>
struct cachestorage_traits;

template <>
struct cachestorage_traits<dom::cache::CacheOpResult::Type::TCacheMatchResult> {
  using PromiseType = cache::BoundStorageKeyCache::MatchResultPromise::Private;
};

template <>
struct cachestorage_traits<
    dom::cache::CacheOpResult::Type::TCacheMatchAllResult> {
  using PromiseType =
      cache::BoundStorageKeyCache::MatchAllResultPromise::Private;
};

template <>
struct cachestorage_traits<
    dom::cache::CacheOpResult::Type::TCachePutAllResult> {
  using PromiseType = cache::BoundStorageKeyCache::PutAllResultPromise::Private;
};

template <>
struct cachestorage_traits<
    dom::cache::CacheOpResult::Type::TCacheDeleteResult> {
  using PromiseType = cache::BoundStorageKeyCache::DeleteResultPromise::Private;
};

template <>
struct cachestorage_traits<dom::cache::CacheOpResult::Type::TCacheKeysResult> {
  using PromiseType = cache::BoundStorageKeyCache::KeysResultPromise::Private;
};

}  // namespace dom
}  // namespace mozilla

#endif  // mozilla_dom_cache_BoundStorageKeyCache_h
