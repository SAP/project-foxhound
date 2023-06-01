/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "FetchEventOpProxyChild.h"

#include <utility>

#include "mozilla/dom/FetchTypes.h"
#include "mozilla/dom/ServiceWorkerOpPromise.h"
#include "nsCOMPtr.h"
#include "nsDebug.h"
#include "nsThreadUtils.h"

#include "mozilla/Assertions.h"
#include "mozilla/RefPtr.h"
#include "mozilla/UniquePtr.h"
#include "mozilla/Unused.h"
#include "mozilla/dom/InternalRequest.h"
#include "mozilla/dom/InternalResponse.h"
#include "mozilla/dom/RemoteWorkerChild.h"
#include "mozilla/dom/RemoteWorkerService.h"
#include "mozilla/dom/ServiceWorkerOp.h"
#include "mozilla/dom/WorkerCommon.h"
#include "mozilla/ipc/BackgroundChild.h"
#include "mozilla/ipc/IPCStreamUtils.h"

namespace mozilla {

using namespace ipc;

namespace dom {

namespace {

nsresult GetIPCSynthesizeResponseArgs(
    ChildToParentSynthesizeResponseArgs* aIPCArgs,
    SynthesizeResponseArgs&& aArgs) {
  MOZ_ASSERT(RemoteWorkerService::Thread()->IsOnCurrentThread());

  SafeRefPtr<InternalResponse> internalResponse;
  FetchEventRespondWithClosure closure;
  FetchEventTimeStamps timeStamps;
  Tie(internalResponse, closure, timeStamps) = std::move(aArgs);

  aIPCArgs->closure() = std::move(closure);
  aIPCArgs->timeStamps() = std::move(timeStamps);

  PBackgroundChild* bgChild = BackgroundChild::GetOrCreateForCurrentThread();

  if (NS_WARN_IF(!bgChild)) {
    return NS_ERROR_DOM_INVALID_STATE_ERR;
  }

  internalResponse->ToChildToParentInternalResponse(
      &aIPCArgs->internalResponse(), bgChild);
  return NS_OK;
}

}  // anonymous namespace

void FetchEventOpProxyChild::Initialize(
    const ParentToChildServiceWorkerFetchEventOpArgs& aArgs) {
  MOZ_ASSERT(RemoteWorkerService::Thread()->IsOnCurrentThread());
  MOZ_ASSERT(!mOp);

  mInternalRequest =
      MakeSafeRefPtr<InternalRequest>(aArgs.common().internalRequest());

  if (aArgs.common().preloadNavigation()) {
    // We use synchronous task dispatch here to make sure that if the preload
    // response arrived before we dispatch the fetch event, then the JS preload
    // response promise will get resolved immediately.
    mPreloadResponseAvailablePromise =
        MakeRefPtr<FetchEventPreloadResponseAvailablePromise::Private>(
            __func__);
    mPreloadResponseAvailablePromise->UseSynchronousTaskDispatch(__func__);

    if (aArgs.preloadResponse().isSome()) {
      mPreloadResponseAvailablePromise->Resolve(
          InternalResponse::FromIPC(aArgs.preloadResponse().ref()), __func__);
    }
    mPreloadResponseEndPromise =
        MakeRefPtr<FetchEventPreloadResponseEndPromise::Private>(__func__);
    mPreloadResponseEndPromise->UseSynchronousTaskDispatch(__func__);
    if (aArgs.preloadResponseEndArgs().isSome()) {
      mPreloadResponseEndPromise->Resolve(aArgs.preloadResponseEndArgs().ref(),
                                          __func__);
    }
  }

  RemoteWorkerChild* manager = static_cast<RemoteWorkerChild*>(Manager());
  MOZ_ASSERT(manager);

  RefPtr<FetchEventOpProxyChild> self = this;

  auto callback = [self](const ServiceWorkerOpResult& aResult) {
    // FetchEventOp could finish before NavigationPreload fetch finishes.
    // If NavigationPreload is available in FetchEvent, caching FetchEventOp
    // result until RecvPreloadResponseEnd is called, such that the response's
    // ResourceTiming could be recorded in worker's performanceStorage.
    if (self->mPreloadResponseEndPromise &&
        !self->mPreloadResponseEndPromise->IsResolved() &&
        self->mPreloadResponseAvailablePromise->IsResolved()) {
      self->mCachedOpResult = Some(aResult);
      return;
    }
    if (!self->CanSend()) {
      return;
    }

    if (NS_WARN_IF(aResult.type() == ServiceWorkerOpResult::Tnsresult)) {
      Unused << self->Send__delete__(self, aResult.get_nsresult());
      return;
    }

    MOZ_ASSERT(aResult.type() ==
               ServiceWorkerOpResult::TServiceWorkerFetchEventOpResult);

    Unused << self->Send__delete__(self, aResult);
  };

  RefPtr<FetchEventOp> op = ServiceWorkerOp::Create(aArgs, std::move(callback))
                                .template downcast<FetchEventOp>();

  MOZ_ASSERT(op);

  op->SetActor(this);
  mOp = op;

  op->GetRespondWithPromise()
      ->Then(GetCurrentSerialEventTarget(), __func__,
             [self = std::move(self)](
                 FetchEventRespondWithPromise::ResolveOrRejectValue&& aResult) {
               self->mRespondWithPromiseRequestHolder.Complete();

               if (NS_WARN_IF(aResult.IsReject())) {
                 MOZ_ASSERT(NS_FAILED(aResult.RejectValue().status()));

                 Unused << self->SendRespondWith(aResult.RejectValue());
                 return;
               }

               auto& result = aResult.ResolveValue();

               if (result.is<SynthesizeResponseArgs>()) {
                 ChildToParentSynthesizeResponseArgs ipcArgs;
                 nsresult rv = GetIPCSynthesizeResponseArgs(
                     &ipcArgs, result.extract<SynthesizeResponseArgs>());

                 if (NS_WARN_IF(NS_FAILED(rv))) {
                   Unused << self->SendRespondWith(
                       CancelInterceptionArgs(rv, ipcArgs.timeStamps()));
                   return;
                 }

                 Unused << self->SendRespondWith(ipcArgs);
               } else if (result.is<ResetInterceptionArgs>()) {
                 Unused << self->SendRespondWith(
                     result.extract<ResetInterceptionArgs>());
               } else {
                 Unused << self->SendRespondWith(
                     result.extract<CancelInterceptionArgs>());
               }
             })
      ->Track(mRespondWithPromiseRequestHolder);

  manager->MaybeStartOp(std::move(op));
}

SafeRefPtr<InternalRequest> FetchEventOpProxyChild::ExtractInternalRequest() {
  MOZ_ASSERT(IsCurrentThreadRunningWorker());
  MOZ_ASSERT(mInternalRequest);

  return std::move(mInternalRequest);
}

RefPtr<FetchEventPreloadResponseAvailablePromise>
FetchEventOpProxyChild::GetPreloadResponseAvailablePromise() {
  return mPreloadResponseAvailablePromise;
}

RefPtr<FetchEventPreloadResponseEndPromise>
FetchEventOpProxyChild::GetPreloadResponseEndPromise() {
  return mPreloadResponseEndPromise;
}

mozilla::ipc::IPCResult FetchEventOpProxyChild::RecvPreloadResponse(
    ParentToChildInternalResponse&& aResponse) {
  // Receiving this message implies that navigation preload is enabled, so
  // Initialize() should have created this promise.
  MOZ_ASSERT(mPreloadResponseAvailablePromise);

  mPreloadResponseAvailablePromise->Resolve(
      InternalResponse::FromIPC(aResponse), __func__);

  return IPC_OK();
}

mozilla::ipc::IPCResult FetchEventOpProxyChild::RecvPreloadResponseEnd(
    ResponseEndArgs&& aArgs) {
  // Receiving this message implies that navigation preload is enabled, so
  // Initialize() should have created this promise.
  MOZ_ASSERT(mPreloadResponseEndPromise);

  mPreloadResponseEndPromise->Resolve(std::move(aArgs), __func__);
  // If mCachedOpResult is not nothing, it means FetchEventOp had already done
  // and the operation result is cached. Continue closing IPC here.
  if (mCachedOpResult.isNothing()) {
    return IPC_OK();
  }

  if (!CanSend()) {
    return IPC_OK();
  }

  if (NS_WARN_IF(mCachedOpResult.ref().type() ==
                 ServiceWorkerOpResult::Tnsresult)) {
    Unused << Send__delete__(this, mCachedOpResult.ref().get_nsresult());
    return IPC_OK();
  }

  MOZ_ASSERT(mCachedOpResult.ref().type() ==
             ServiceWorkerOpResult::TServiceWorkerFetchEventOpResult);

  Unused << Send__delete__(this, mCachedOpResult.ref());

  return IPC_OK();
}

void FetchEventOpProxyChild::ActorDestroy(ActorDestroyReason) {
  Unused << NS_WARN_IF(mRespondWithPromiseRequestHolder.Exists());
  mRespondWithPromiseRequestHolder.DisconnectIfExists();

  // If mPreloadResponseAvailablePromise exists, navigation preloading response
  // will not be valid anymore since it is too late to respond to the
  // FetchEvent. Resolve the preload response promise with
  // NS_ERROR_DOM_ABORT_ERR.
  if (mPreloadResponseAvailablePromise) {
    mPreloadResponseAvailablePromise->Resolve(
        InternalResponse::NetworkError(NS_ERROR_DOM_ABORT_ERR), __func__);
  }

  if (mPreloadResponseEndPromise) {
    ResponseEndArgs args(FetchDriverObserver::eAborted, Nothing());
    mPreloadResponseEndPromise->Resolve(args, __func__);
  }

  mOp->RevokeActor(this);
  mOp = nullptr;
}

}  // namespace dom
}  // namespace mozilla
