/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/cache/CacheOpChild.h"

#include "mozilla/dom/Promise.h"
#include "mozilla/dom/Request.h"
#include "mozilla/dom/Response.h"
#include "mozilla/dom/cache/BoundStorageKey.h"
#include "mozilla/dom/cache/BoundStorageKeyCache.h"
#include "mozilla/dom/cache/Cache.h"
#include "mozilla/dom/cache/CacheChild.h"
#include "mozilla/dom/cache/CacheStreamControlChild.h"
#include "mozilla/dom/cache/CacheWorkerRef.h"

namespace mozilla::dom {
// XXX Move this to ToJSValue.h
template <typename T>
[[nodiscard]] bool ToJSValue(JSContext* aCx, const SafeRefPtr<T>& aArgument,
                             JS::MutableHandle<JS::Value> aValue) {
  return ToJSValue(aCx, *aArgument.unsafeGetRawPtr(), aValue);
}

namespace cache {

using mozilla::ipc::PBackgroundChild;
using Promise = mozilla::dom::Promise;

namespace {

void AddWorkerRefToStreamChild(const CacheReadStream& aReadStream,
                               const SafeRefPtr<CacheWorkerRef>& aWorkerRef) {
  MOZ_ASSERT_IF(!NS_IsMainThread(), aWorkerRef);
  CacheStreamControlChild* cacheControl =
      static_cast<CacheStreamControlChild*>(aReadStream.control().AsChild());
  if (cacheControl) {
    cacheControl->SetWorkerRef(aWorkerRef.clonePtr());
  }
}

void AddWorkerRefToStreamChild(const CacheResponse& aResponse,
                               const SafeRefPtr<CacheWorkerRef>& aWorkerRef) {
  MOZ_ASSERT_IF(!NS_IsMainThread(), aWorkerRef);

  if (aResponse.body().isNothing()) {
    return;
  }

  AddWorkerRefToStreamChild(aResponse.body().ref(), aWorkerRef);
}

void AddWorkerRefToStreamChild(const CacheRequest& aRequest,
                               const SafeRefPtr<CacheWorkerRef>& aWorkerRef) {
  MOZ_ASSERT_IF(!NS_IsMainThread(), aWorkerRef);

  if (aRequest.body().isNothing()) {
    return;
  }

  AddWorkerRefToStreamChild(aRequest.body().ref(), aWorkerRef);
}

}  // namespace

CacheOpChild::CacheOpChild(SafeRefPtr<CacheWorkerRef> aWorkerRef,
                           nsIGlobalObject* aGlobal, nsISupports* aParent,
                           RefPtr<Promise>& aPromise, ActorChild* aParentActor)
    : mGlobal(aGlobal),
      mParent(aParent),
      mPromise(aPromise),
      mParentActor(aParentActor) {
  MOZ_DIAGNOSTIC_ASSERT(mGlobal);
  MOZ_DIAGNOSTIC_ASSERT(mParent);
  MOZ_DIAGNOSTIC_ASSERT(aPromise);

  MOZ_ASSERT_IF(!NS_IsMainThread(), aWorkerRef);

  SetWorkerRef(CacheWorkerRef::PreferBehavior(
      std::move(aWorkerRef), CacheWorkerRef::eStrongWorkerRef));
}

CacheOpChild::CacheOpChild(SafeRefPtr<CacheWorkerRef> aWorkerRef,
                           nsIGlobalObject* aGlobal, nsISupports* aParent,
                           RefPtr<CacheStoragePromise>& aPromise,
                           ActorChild* aParentActor)
    : mGlobal(aGlobal),
      mParent(aParent),
      mPromise(aPromise),
      mParentActor(aParentActor) {
  MOZ_DIAGNOSTIC_ASSERT(mGlobal);
  MOZ_DIAGNOSTIC_ASSERT(mParent);
  MOZ_DIAGNOSTIC_ASSERT(aPromise);

  MOZ_ASSERT_IF(!NS_IsMainThread(), aWorkerRef);

  SetWorkerRef(CacheWorkerRef::PreferBehavior(
      std::move(aWorkerRef), CacheWorkerRef::eStrongWorkerRef));
}

CacheOpChild::~CacheOpChild() {
  NS_ASSERT_OWNINGTHREAD(CacheOpChild);
  MOZ_DIAGNOSTIC_ASSERT(!mPromise);
}

void CacheOpChild::ActorDestroy(ActorDestroyReason aReason) {
  NS_ASSERT_OWNINGTHREAD(CacheOpChild);

  // If the actor was terminated for some unknown reason, then indicate the
  // operation is dead.
  if (mPromise) {
    HandleAndSettle<CacheOpResult::Tvoid_t>(ErrorResult(NS_ERROR_FAILURE));
    mPromise.destroy();
  }
  mParentActor->NoteDeletedActor();
  RemoveWorkerRef();
}

using StorageOpenResultType = std::pair<CacheChild*, Namespace>;

template <CacheOpResult::Type OP_TYPE, typename ResultType>
void CacheOpChild::SettlePromise(
    ResultType&& aRes, ErrorResult&& aRv,
    const RefPtr<CacheStoragePromise>& aThePromise) {
  // picks the correct promise type using traits defined in BoundStorageKey.h
  // and BoundStorageKeyCache.h
  using TargetPromiseType =
      typename dom::cachestorage_traits<OP_TYPE>::PromiseType;
  auto* target = static_cast<TargetPromiseType*>(aThePromise.get());
  auto&& res = std::forward<ResultType>(aRes);

  if (aRv.Failed()) {
    target->Reject(std::move(aRv), __func__);
    return;
  }

  using ValueType = typename std::decay_t<decltype(aRes)>;
  if constexpr (std::is_same_v<ValueType, JS::HandleValue>) {
    // Not serializing JS types into MozPromise. Need to collapse JS values
    // into their raw types here. Since this is internal private method and
    // based on it's usage yet; just expecting Undefined or null values here.
    MOZ_ASSERT(res.isNullOrUndefined());
    target->Resolve(nullptr /*implicitly converts to false for boolean types */,
                    __func__);
  } else if constexpr (std::is_same_v<ValueType, StorageOpenResultType>) {
    // result would be of type CacheChild here and we need to properly wrap into
    // holder class BoundStorageKeyCache before resolving promise
    auto [cacheChild, ns] = res;
    auto* cache = new BoundStorageKeyCache(mGlobal, cacheChild, ns);
    target->Resolve(RefPtr(cache), __func__);
  } else {
    target->Resolve(std::forward<ResultType>(aRes), __func__);
  }
}

template <CacheOpResult::Type OP_TYPE, typename ResultType>
void CacheOpChild::SettlePromise(ResultType&& aRes, ErrorResult&& aRv,
                                 const RefPtr<Promise>& aThePromise) {
  if (aRv.Failed()) {
    aThePromise->MaybeReject(aRv.StealNSResult());
  } else {
    using ValueType = typename std::decay_t<decltype(aRes)>;

    if constexpr (std::is_same_v<ValueType, StorageOpenResultType>) {
      // result would be of type CacheChild here and we need to properly wrap
      // into holder class Cache before resolving promise
      auto&& res = std::forward<ResultType>(aRes);
      auto [cacheChild, ns] = res;
      auto* cache = new Cache(mGlobal, cacheChild, ns);
      aThePromise->MaybeResolve(RefPtr(cache));
    } else {
      aThePromise->MaybeResolve(std::forward<ResultType>(aRes));
    }
  }
}

template <CacheOpResult::Type OP_TYPE, typename ResultType>
void CacheOpChild::Settle(ResultType&& aRes, ErrorResult&& aRv) {
  if (mPromise->is<RefPtr<mozilla::dom::Promise>>()) {
    auto targetPromise = mPromise->as<RefPtr<mozilla::dom::Promise>>();
    MOZ_ASSERT(targetPromise);

    SettlePromise<OP_TYPE>(std::forward<ResultType>(aRes), std::move(aRv),
                           targetPromise);
  } else if (mPromise->is<RefPtr<CacheStoragePromise>>()) {
    auto targetPromise = mPromise->as<RefPtr<CacheStoragePromise>>();
    MOZ_ASSERT(targetPromise);

    SettlePromise<OP_TYPE>(std::forward<ResultType>(aRes), std::move(aRv),
                           targetPromise);
  }
}

template <CacheOpResult::Type OP_TYPE, typename TResponse>
void CacheOpChild::HandleAndSettle(TResponse&& aRes) {
  using ValueType = typename std::decay_t<decltype(aRes)>;
  auto&& res = std::forward<TResponse>(aRes);

  if constexpr (std::is_same_v<ValueType, Maybe<CacheResponse>>) {
    if (res.isNothing()) {
      Settle<OP_TYPE>(JS::UndefinedHandleValue);
      return;
    }

    const CacheResponse& cacheResponse = res.ref();

    AddWorkerRefToStreamChild(cacheResponse, GetWorkerRefPtr());
    RefPtr<Response> response = ToResponse(cacheResponse);
    Settle<OP_TYPE>(response);

  } else if constexpr (std::is_same_v<ValueType, nsTArray<CacheResponse>>) {
    AutoTArray<RefPtr<Response>, 256> responses;
    responses.SetCapacity(res.Length());

    for (uint32_t i = 0; i < res.Length(); ++i) {
      AddWorkerRefToStreamChild(res[i], GetWorkerRefPtr());
      responses.AppendElement(ToResponse(res[i]));
    }

    Settle<OP_TYPE>(std::move(responses));

  } else if constexpr (std::is_same_v<ValueType, nsTArray<CacheRequest>>) {
    AutoTArray<SafeRefPtr<Request>, 256> requests;
    requests.SetCapacity(res.Length());

    for (uint32_t i = 0; i < res.Length(); ++i) {
      AddWorkerRefToStreamChild(res[i], GetWorkerRefPtr());
      requests.AppendElement(ToRequest(res[i]));
    }

    Settle<OP_TYPE>(std::move(requests));

  } else if constexpr (std::is_same_v<ValueType, bool> ||
                       std::is_same_v<ValueType, nsTArray<nsString>> ||
                       std::is_same_v<ValueType, JS::Handle<JS::Value>>) {
    Settle<OP_TYPE>(std::forward<TResponse>(aRes));
  } else if constexpr (std::is_same_v<ValueType, ErrorResult>) {
    Settle<OP_TYPE>(false /* valid response does not exist */, std::move(res));
  } else if constexpr (std::is_same_v<ValueType, StorageOpenResult>) {
    auto* actor = static_cast<CacheChild*>(res.actor().AsChild());

    // If we have a success status then we should have an actor.  Gracefully
    // reject instead of crashing, though, if we get a nullptr here.
    MOZ_DIAGNOSTIC_ASSERT(actor);
    if (!actor) {
      ErrorResult errRes;
      errRes.ThrowTypeError(
          "CacheStorage.open() failed to access the storage system.");
      Settle<OP_TYPE>(StorageOpenResultType{} /* dummy */, std::move(errRes));
    }

    actor->SetWorkerRef(CacheWorkerRef::PreferBehavior(
        GetWorkerRefPtr().clonePtr(), CacheWorkerRef::eIPCWorkerRef));
    Settle<OP_TYPE>(StorageOpenResultType{actor, res.ns()});
  } else {
    static_assert(std::is_same_v<ValueType, void>,
                  "There should be a block handling this type");
  }
}

mozilla::ipc::IPCResult CacheOpChild::Recv__delete__(
    ErrorResult&& aRv, const CacheOpResult& aResult) {
  NS_ASSERT_OWNINGTHREAD(CacheOpChild);

  if (NS_WARN_IF(aRv.Failed())) {
    MOZ_DIAGNOSTIC_ASSERT(aResult.type() == CacheOpResult::Tvoid_t);
    HandleAndSettle<CacheOpResult::Tvoid_t>(aRv);
    mPromise.destroy();
    return IPC_OK();
  }

  switch (aResult.type()) {
    case CacheOpResult::TCacheMatchResult: {
      const auto& response = aResult.get_CacheMatchResult().maybeResponse();
      HandleAndSettle<CacheOpResult::TCacheMatchResult>(response);
      break;
    }
    case CacheOpResult::TCacheMatchAllResult: {
      const auto& response = aResult.get_CacheMatchAllResult().responseList();
      HandleAndSettle<CacheOpResult::TCacheMatchAllResult>(response);
      break;
    }
    case CacheOpResult::TCachePutAllResult: {
      // resolve with undefined
      HandleAndSettle<CacheOpResult::TCachePutAllResult>(
          JS::UndefinedHandleValue);
      break;
    }
    case CacheOpResult::TCacheDeleteResult: {
      const auto& response = aResult.get_CacheDeleteResult().success();
      HandleAndSettle<CacheOpResult::TCacheDeleteResult>(response);
      break;
    }
    case CacheOpResult::TCacheKeysResult: {
      const auto& response = aResult.get_CacheKeysResult().requestList();
      HandleAndSettle<CacheOpResult::TCacheKeysResult>(response);
      break;
    }
    case CacheOpResult::TStorageMatchResult: {
      const auto& response = aResult.get_StorageMatchResult().maybeResponse();
      HandleAndSettle<CacheOpResult::TStorageMatchResult>(response);
      break;
    }
    case CacheOpResult::TStorageHasResult: {
      const auto& response = aResult.get_StorageHasResult().success();
      HandleAndSettle<CacheOpResult::TStorageHasResult>(response);
      break;
    }
    case CacheOpResult::TStorageOpenResult: {
      const auto& response = aResult.get_StorageOpenResult();
      HandleAndSettle<CacheOpResult::TStorageOpenResult>(response);
      break;
    }
    case CacheOpResult::TStorageDeleteResult: {
      const auto& response = aResult.get_StorageDeleteResult().success();
      HandleAndSettle<CacheOpResult::TStorageDeleteResult>(response);
      break;
    }
    case CacheOpResult::TStorageKeysResult: {
      const auto& response = aResult.get_StorageKeysResult().keyList();
      HandleAndSettle<CacheOpResult::TStorageKeysResult>(response);
      break;
    }
    default:
      MOZ_CRASH("Unknown Cache op result type!");
  }

  mPromise.destroy();
  return IPC_OK();
}

void CacheOpChild::StartDestroy() {
  NS_ASSERT_OWNINGTHREAD(CacheOpChild);

  // Do not cancel on-going operations when WorkerRef calls this.  Instead,
  // keep the Worker alive until we are done.
}

nsIGlobalObject* CacheOpChild::GetGlobalObject() const { return mGlobal; }

#ifdef DEBUG
void CacheOpChild::AssertOwningThread() const {
  NS_ASSERT_OWNINGTHREAD(CacheOpChild);
}
#endif

}  // namespace cache
}  // namespace mozilla::dom
