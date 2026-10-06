/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "PermissionStatusSink.h"

#include "PermissionObserver.h"
#include "PermissionStatus.h"
#include "mozilla/Permission.h"
#include "mozilla/PermissionDelegateHandler.h"
#include "mozilla/PermissionManager.h"
#include "mozilla/StaticPrefs_dom.h"
#include "mozilla/dom/BrowsingContext.h"
#include "mozilla/dom/ContentChild.h"
#include "mozilla/dom/WorkerPrivate.h"
#include "mozilla/dom/WorkerRef.h"
#include "nsGlobalWindowInner.h"
#include "nsPIDOMWindowInlines.h"

namespace mozilla::dom {

void PermissionStatusSink::ClearPermissionStatus() {
  MOZ_ASSERT(mSerialEventTarget->IsOnCurrentThread());
  mPermissionStatus = nullptr;
}

PermissionStatusSink::PermissionStatusSink(PermissionStatus* aPermissionStatus,
                                           PermissionName aPermissionName,
                                           const nsACString& aPermissionType)
    : mSerialEventTarget(NS_GetCurrentThread()),
      mMutex("PermissionStatusSink::mMutex"),
      mPermissionStatus(aPermissionStatus),
      mPermissionName(aPermissionName),
      mPermissionType(aPermissionType) {
  MOZ_ASSERT(aPermissionStatus);
  MOZ_ASSERT(mSerialEventTarget);

  nsCOMPtr<nsIGlobalObject> global = aPermissionStatus->GetRelevantGlobal();
  if (NS_WARN_IF(!global)) {
    return;
  }

  nsCOMPtr<nsIPrincipal> principal = global->PrincipalOrNull();
  if (NS_WARN_IF(!principal)) {
    return;
  }

  mPrincipalForPermission = Permission::ClonePrincipalForPermission(principal);
}

PermissionStatusSink::~PermissionStatusSink() = default;

RefPtr<PermissionStatusSink::InternalPermissionStatesPromise>
PermissionStatusSink::Init() {
  if (!NS_IsMainThread()) {
    WorkerPrivate* workerPrivate = GetCurrentThreadWorkerPrivate();
    MOZ_ASSERT(workerPrivate);

    MutexAutoLock lock(mMutex);

    RefPtr<StrongWorkerRef> workerRef = StrongWorkerRef::Create(
        workerPrivate, "PermissionStatusSink",
        [self = RefPtr(this)]() { self->Disentangle(); });
    if (NS_WARN_IF(!workerRef)) {
      // If WorkerRef creation fails, the Worker has started shutting down. But
      // we are on the Worker thread, promise handlers in
      // PermissionStatus::Init()/Permissions::Query() can still be dispatched
      // to the Worker thread for outer promise rejection.
      return InternalPermissionStatesPromise::CreateAndReject(NS_ERROR_FAILURE,
                                                              __func__);
    }

    mWorkerRef = new ThreadSafeWorkerRef(workerRef);
  }

  // On the Worker thread, so the below async function must be executed before
  // WorkerRef callback which should also be on the Worker thread. So the above
  // created WorkerRef should protect the outer promise handling can be
  // dispatched on the Worker thread.
  return InvokeAsync(GetMainThreadSerialEventTarget(), __func__,
                     [self = RefPtr(this)] {
                       MOZ_ASSERT(!self->mObserver);

                       // Covers the onchange part
                       // Whenever the user agent is aware that the state of a
                       // PermissionStatus instance status has changed: ... (The
                       // observer calls PermissionChanged() to do the steps)
                       self->mObserver = PermissionObserver::GetInstance();
                       if (NS_WARN_IF(!self->mObserver)) {
                         return PermissionStatePromise::CreateAndReject(
                             NS_ERROR_FAILURE, __func__);
                       }

                       self->mObserver->AddSink(self);

                       // Covers the query part (Step 8.2 - 8.4)
                       return self->ComputeStateOnMainThread();
                     })
      ->Then(
          GetCurrentSerialEventTarget(), __func__,
          [self = RefPtr(this)](uint32_t aBrowserState) {
            RefPtr<InternalPermissionStatesPromise> promise =
                self->ComputeSystemState()->Then(
                    GetCurrentSerialEventTarget(), __func__,
                    [self, aBrowserState](PermissionState aSystemState) {
                      return InternalPermissionStatesPromise::CreateAndResolve(
                          InternalPermissionStates{.mBrowser = aBrowserState,
                                                   .mSystem = aSystemState},
                          __func__);
                    },
                    [](nsresult aResult) {
                      return InternalPermissionStatesPromise::CreateAndReject(
                          aResult, __func__);
                    });
            return promise;
          },
          [](nsresult aResult) {
            return InternalPermissionStatesPromise::CreateAndReject(aResult,
                                                                    __func__);
          });
}

bool PermissionStatusSink::MaybeUpdatedByOnMainThread(
    nsIPermission* aPermission) {
  MOZ_ASSERT(NS_IsMainThread());

  if (!mPrincipalForPermission) {
    return false;
  }

  nsCOMPtr<nsIPrincipal> permissionPrincipal;
  aPermission->GetPrincipal(getter_AddRefs(permissionPrincipal));
  if (!permissionPrincipal) {
    return false;
  }

  return mPrincipalForPermission->Equals(permissionPrincipal);
}

bool PermissionStatusSink::MaybeUpdatedByBrowserPermOnMainThread(
    nsIPermission* aPermission) {
  MOZ_ASSERT(NS_IsMainThread());

  if (!MaybeUpdatedByOnMainThread(aPermission)) {
    return false;
  }

  uint64_t permBrowserId = 0;
  aPermission->GetBrowserId(&permBrowserId);
  if (!permBrowserId) {
    return false;
  }

  uint64_t sinkBrowserId = 0;
  if (!GetBrowserIdOnMainThread(&sinkBrowserId)) {
    return false;
  }

  return sinkBrowserId == permBrowserId;
}

bool PermissionStatusSink::MaybeUpdatedByNotifyOnlyOnMainThread(
    nsPIDOMWindowInner* aInnerWindow) {
  MOZ_ASSERT(NS_IsMainThread());
  return false;
}

bool PermissionStatusSink::MaybeAffectedByBrowserIdOnMainThread(
    uint64_t aBrowserId) {
  MOZ_ASSERT(NS_IsMainThread());

  uint64_t sinkBrowserId = 0;
  if (!GetBrowserIdOnMainThread(&sinkBrowserId)) {
    return false;
  }

  return sinkBrowserId == aBrowserId;
}

bool PermissionStatusSink::GetBrowserIdOnMainThread(uint64_t* aBrowserId) {
  MOZ_ASSERT(NS_IsMainThread());
  *aBrowserId = 0;

  RefPtr<nsGlobalWindowInner> window;

  if (mSerialEventTarget->IsOnCurrentThread()) {
    // Window sink: the main thread is the owning thread, so we can safely
    // access mPermissionStatus to get the owner window.
    if (!GetPermissionStatus()) {
      return false;
    }
    window = GetPermissionStatus()->GetOwnerWindow();
  } else {
    // Worker sink: mPermissionStatus is owned by the worker thread and must
    // not be touched here. Instead, get the worker's ancestor window (the tab
    // that spawned it) via mWorkerRef, which is mutex-guarded.
    MutexAutoLock lock(mMutex);
    if (!mWorkerRef) {
      return false;
    }
    nsCOMPtr<nsPIDOMWindowInner> ancestorWindow =
        mWorkerRef->Private()->GetAncestorWindow();
    if (!ancestorWindow) {
      return false;
    }
    window = nsGlobalWindowInner::Cast(ancestorWindow);
  }

  if (!window) {
    return false;
  }

  RefPtr<BrowsingContext> bc = window->GetBrowsingContext();
  if (!bc) {
    return false;
  }

  *aBrowserId = bc->Top()->BrowserId();
  return true;
}

void PermissionStatusSink::PermissionChangedOnMainThread() {
  MOZ_ASSERT(NS_IsMainThread());

  // Nothing to do if Worker had shutted down.
  if (!mSerialEventTarget->IsOnCurrentThread()) {
    MutexAutoLock lock(mMutex);
    if (!mWorkerRef) {
      return;
    }
  }

  // mWorkerRef is not nullptr, it will protect the promise handling can be
  // dispatched to the Worker thread, even though the Worker starts shutdown,
  // because mWorkerRef is nullify on the main thread.
  ComputeStateOnMainThread()->Then(
      mSerialEventTarget, __func__,
      [self = RefPtr(this)](
          const PermissionStatePromise::ResolveOrRejectValue& aResult) {
        if (aResult.IsResolve() && self->GetPermissionStatus()) {
          self->GetPermissionStatus()->PermissionChanged(
              aResult.ResolveValue());
        }
      });
}

void PermissionStatusSink::Disentangle() {
  MOZ_ASSERT(mSerialEventTarget->IsOnCurrentThread());

  ClearPermissionStatus();

  NS_DispatchToMainThread(
      NS_NewRunnableFunction(__func__, [self = RefPtr(this)] {
        if (self->mObserver) {
          self->mObserver->RemoveSink(self);
          self->mObserver = nullptr;
        }
        {
          MutexAutoLock lock(self->mMutex);
          self->mWorkerRef = nullptr;
        }
      }));
}

RefPtr<PermissionStatusSink::PermissionStatePromise>
PermissionStatusSink::ComputeStateOnMainThread() {
  MOZ_ASSERT(NS_IsMainThread());

  // Step 1: If settings wasn't passed, set it to the current settings object.
  // Step 2: If settings is a non-secure context, return "denied".
  // XXX(krosylight): No such steps here, and no WPT coverage?

  // The permission handler covers the rest of the steps, although the model
  // does not exactly match what the spec has. (Not passing "permission key" for
  // example)

  if (mSerialEventTarget->IsOnCurrentThread()) {
    if (!GetPermissionStatus()) {
      return PermissionStatePromise::CreateAndReject(NS_ERROR_FAILURE,
                                                     __func__);
    }

    RefPtr<nsGlobalWindowInner> window =
        GetPermissionStatus()->GetOwnerWindow();
    return ComputeStateOnMainThreadInternal(window);
  }

  nsCOMPtr<nsPIDOMWindowInner> ancestorWindow;
  nsCOMPtr<nsIPrincipal> workerPrincipal;

  {
    MutexAutoLock lock(mMutex);

    if (!mWorkerRef) {
      // We have been disentangled.
      return PermissionStatePromise::CreateAndReject(NS_ERROR_FAILURE,
                                                     __func__);
    }

    // If we have mWorkerRef, we haven't received the WorkerRef notification
    // yet.
    WorkerPrivate* workerPrivate = mWorkerRef->Private();
    MOZ_ASSERT(workerPrivate);

    ancestorWindow = workerPrivate->GetAncestorWindow();
    workerPrincipal = workerPrivate->GetPrincipal();
  }

  if (ancestorWindow) {
    return ComputeStateOnMainThreadInternal(ancestorWindow);
  }

  if (NS_WARN_IF(!workerPrincipal)) {
    return PermissionStatePromise::CreateAndReject(NS_ERROR_FAILURE, __func__);
  }

  RefPtr<nsIPermissionManager> permissionManager =
      PermissionManager::GetInstance();
  if (!permissionManager) {
    return PermissionStatePromise::CreateAndReject(NS_ERROR_FAILURE, __func__);
  }

  uint32_t action = nsIPermissionManager::DENY_ACTION;
  nsresult rv = permissionManager->TestPermissionFromPrincipal(
      workerPrincipal, mPermissionType, &action);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return PermissionStatePromise::CreateAndReject(rv, __func__);
  }

  return PermissionStatePromise::CreateAndResolve(action, __func__);
}

RefPtr<PermissionStatusSink::PermissionStatePromise>
PermissionStatusSink::ComputeStateOnMainThreadInternal(
    nsPIDOMWindowInner* aWindow) {
  MOZ_ASSERT(NS_IsMainThread());

  if (NS_WARN_IF(!aWindow)) {
    return PermissionStatePromise::CreateAndReject(NS_ERROR_FAILURE, __func__);
  }

  RefPtr<Document> document = aWindow->GetExtantDoc();
  if (NS_WARN_IF(!document)) {
    return PermissionStatePromise::CreateAndReject(NS_ERROR_FAILURE, __func__);
  }

  uint32_t action = nsIPermissionManager::DENY_ACTION;

  PermissionDelegateHandler* permissionHandler =
      document->GetPermissionDelegateHandler();
  if (NS_WARN_IF(!permissionHandler)) {
    return PermissionStatePromise::CreateAndReject(NS_ERROR_FAILURE, __func__);
  }

  nsresult rv = permissionHandler->GetPermissionForPermissionsAPI(
      mPermissionType, &action);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return PermissionStatePromise::CreateAndReject(rv, __func__);
  }

  return PermissionStatePromise::CreateAndResolve(action, __func__);
}

static PermissionState ComputeGeolocationBehavior(
    geolocation::SystemGeolocationPermissionBehavior aBehavior) {
  if (aBehavior == geolocation::SystemGeolocationPermissionBehavior::NoPrompt) {
    return PermissionState::Granted;
  }
  return PermissionState::Prompt;
}

RefPtr<PermissionStatusSink::SystemPermissionStatePromise>
PermissionStatusSink::ComputeSystemState() {
  if (mPermissionName != PermissionName::Geolocation ||
      StaticPrefs::dom_permissions_testing_enabled()) {
    return SystemPermissionStatePromise::CreateAndResolve(
        PermissionState::Granted, __func__);
  }

  // Avoid using PContent on a background thread.
  auto spsPromisePrivate =
      MakeRefPtr<PermissionStatusSink::SystemPermissionStatePromise::Private>(
          __func__);

  nsresult rv = NS_DispatchToMainThread(NS_NewRunnableFunction(
      "PermissionStatusSink::ComputeSystemState", [spsPromisePrivate]() {
        if (auto* contentChild = ContentChild::GetSingleton()) {
          contentChild->SendGetSystemGeolocationPermissionBehavior()->Then(
              GetCurrentSerialEventTarget(), __func__,
              [spsPromisePrivate](
                  geolocation::SystemGeolocationPermissionBehavior aBehavior) {
                spsPromisePrivate->Resolve(
                    ComputeGeolocationBehavior(aBehavior), __func__);
              },
              [spsPromisePrivate](mozilla::ipc::ResponseRejectReason aReason) {
                spsPromisePrivate->Resolve(PermissionState::Granted, __func__);
              });
        } else {
          // No ContentChild. Fall back to Granted.
          spsPromisePrivate->Resolve(PermissionState::Granted, __func__);
        }
      }));
  if (NS_FAILED(rv)) {
    spsPromisePrivate->Resolve(PermissionState::Granted, __func__);
  }
  return spsPromisePrivate;
}

void PermissionStatusSink::SystemPermissionChangedOnMainThread(
    PermissionState aState) {
  MOZ_ASSERT(NS_IsMainThread());

  if (StaticPrefs::dom_permissions_testing_enabled()) {
    return;
  }

  if (!mSerialEventTarget->IsOnCurrentThread()) {
    MutexAutoLock lock(mMutex);
    if (!mWorkerRef) {
      return;
    }
  }

  mSerialEventTarget->Dispatch(
      NS_NewRunnableFunction(__func__, [self = RefPtr(this), aState]() {
        if (self->mPermissionStatus) {
          self->mPermissionStatus->SystemPermissionChanged(aState);
        }
      }));
}

}  // namespace mozilla::dom
