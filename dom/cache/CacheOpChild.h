/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_cache_CacheOpChild_h
#define mozilla_dom_cache_CacheOpChild_h

#include "mozilla/InitializedOnce.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/cache/ActorChild.h"
#include "mozilla/dom/cache/BoundStorageKey.h"
#include "mozilla/dom/cache/PCacheOpChild.h"
#include "mozilla/dom/cache/TypeUtils.h"

class nsIGlobalObject;

namespace mozilla::dom {
class Promise;

namespace cache {
class CacheOpChild final : public PCacheOpChild,
                           public CacheActorChild,
                           public TypeUtils {
  friend class CacheChild;
  friend class CacheStorageChild;
  friend class PCacheOpChild;

 public:
  NS_INLINE_DECL_REFCOUNTING(CacheOpChild, override)

 private:
  // CacheOpChild can be used by Cache, CacheStorage and BoundStorageKey APIs.
  // It can handle two promise types; where Cache works with dom::Promise,
  // BoundStorageKey APIs works with MozPromise (represented by
  // CacheStoragePromise below)
  using PromiseType =
      Variant<RefPtr<mozilla::dom::Promise>, RefPtr<CacheStoragePromise>>;

  template <typename T>
  struct PromiseTrait;

  // This class must be constructed by CacheChild or CacheStorageChild using
  // their ExecuteOp() factory method.
  CacheOpChild(SafeRefPtr<CacheWorkerRef> aWorkerRef, nsIGlobalObject* aGlobal,
               nsISupports* aParent, RefPtr<Promise>& aPromise,
               ActorChild* aParentActor);

  // Below overload is used by BoundStorageKey APIs; passing in
  // CacheStoragePromise
  CacheOpChild(SafeRefPtr<CacheWorkerRef> aWorkerRef, nsIGlobalObject* aGlobal,
               nsISupports* aParent, RefPtr<CacheStoragePromise>& aPromise,
               ActorChild* aParentActor);

  ~CacheOpChild();

  // PCacheOpChild methods
  virtual void ActorDestroy(ActorDestroyReason aReason) override;

  mozilla::ipc::IPCResult Recv__delete__(ErrorResult&& aRv,
                                         const CacheOpResult& aResult);

  // ActorChild methods
  virtual void StartDestroy() override;

  // TypeUtils methods
  virtual nsIGlobalObject* GetGlobalObject() const override;

#ifdef DEBUG
  virtual void AssertOwningThread() const override;
#endif

  // Utility methods

  /* Generic method to handle all response types, formats responses before
   * resolving for the underlying promises */
  template <CacheOpResult::Type OP_TYPE, typename TResponse>
  void HandleAndSettle(TResponse&& aRes);

  // generic settle overload which routes the control to one of two
  // SettlePromise method overloads below depending if we are resolving for
  // native JS promise vs MozPromise
  template <CacheOpResult::Type OP_TYPE, typename ResultType>
  void Settle(ResultType&& aRes, ErrorResult&& aRv = ErrorResult(NS_OK));

  // settles promise for BoundStorageKeyCache; which is of type MozPromise
  template <CacheOpResult::Type OP_TYPE, typename ResultType>
  void SettlePromise(ResultType&& aRes, ErrorResult&& aRv,
                     const RefPtr<CacheStoragePromise>& aThePromise);

  // settles promise for cache, which is of type dom::Promise
  template <typename CacheOpResult::Type OP_TYPE, typename ResultType>
  void SettlePromise(ResultType&& aRes, ErrorResult&& aRv,
                     const RefPtr<Promise>& aThePromise);

  nsCOMPtr<nsIGlobalObject> mGlobal;

  // Hold the parent Cache or CacheStorage object alive until this async
  // operation completes.
  nsCOMPtr<nsISupports> mParent;
  LazyInitializedOnceEarlyDestructible<const PromiseType> mPromise;
  ActorChild* mParentActor;
};

}  // namespace cache
}  // namespace mozilla::dom

#endif  // mozilla_dom_cache_CacheOpChild_h
