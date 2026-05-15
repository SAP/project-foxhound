/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ServiceWorkerUnregisterJob.h"

#include "ServiceWorkerManager.h"
#include "mozilla/dom/CookieStoreSubscriptionService.h"
#include "mozilla/dom/notification/NotificationUtils.h"
#include "nsIAlertsService.h"
#include "nsIPushService.h"
#include "nsServiceManagerUtils.h"
#include "nsThreadUtils.h"

using namespace mozilla::dom::notification;

namespace mozilla::dom {

class ServiceWorkerUnregisterJob::PushUnsubscribeCallback final
    : public nsIUnsubscribeResultCallback {
 public:
  NS_DECL_ISUPPORTS

  already_AddRefed<GenericPromise> Promise() {
    return mPromiseHolder.Ensure(__func__);
  }

  NS_IMETHOD
  OnUnsubscribe(nsresult aStatus, bool success) override {
    // Warn if unsubscribing fails, but don't prevent the worker from
    // unregistering.
    (void)NS_WARN_IF(NS_FAILED(aStatus));
    mPromiseHolder.Resolve(success, __func__);
    return NS_OK;
  }

 private:
  virtual ~PushUnsubscribeCallback() {
    // We may be shutting down prematurely without getting the result, so make
    // sure to settle the promise.
    mPromiseHolder.RejectIfExists(NS_ERROR_DOM_INVALID_STATE_ERR, __func__);
  };

  MozPromiseHolder<GenericPromise> mPromiseHolder;
};

NS_IMPL_ISUPPORTS(ServiceWorkerUnregisterJob::PushUnsubscribeCallback,
                  nsIUnsubscribeResultCallback)

ServiceWorkerUnregisterJob::ServiceWorkerUnregisterJob(nsIPrincipal* aPrincipal,
                                                       const nsACString& aScope)
    : ServiceWorkerJob(Type::Unregister, aPrincipal, aScope, ""_ns),
      mResult(false) {}

bool ServiceWorkerUnregisterJob::GetResult() const {
  MOZ_ASSERT(NS_IsMainThread());
  return mResult;
}

ServiceWorkerUnregisterJob::~ServiceWorkerUnregisterJob() = default;

already_AddRefed<GenericPromise>
ServiceWorkerUnregisterJob::ClearNotifications() {
  RefPtr<GenericPromise::Private> resultPromise =
      new GenericPromise::Private(__func__);

  nsCOMPtr<nsIAlertsService> alertsService =
      do_GetService("@mozilla.org/alerts-service;1");

  nsAutoCString origin;
  nsresult rv = mPrincipal->GetOrigin(origin);
  if (!alertsService || NS_FAILED(rv)) {
    resultPromise->Reject(rv, __func__);
    return resultPromise.forget();
  }

  RefPtr<NotificationsPromise> promise =
      GetStoredNotificationsForScope(mPrincipal, mScope, u""_ns);

  promise->Then(
      GetCurrentSerialEventTarget(), __func__,
      [resultPromise,
       alertsService](const CopyableTArray<IPCNotification>& aNotifications) {
        for (const IPCNotification& notification : aNotifications) {
          // CloseAlert will emit alertfinished which will synchronously remove
          // each notification also from the DB. (The DB removal doesn't happen
          // synchronously but its task queue guarantees the order.)
          alertsService->CloseAlert(notification.id(), false);
        }
        resultPromise->Resolve(true, __func__);
      },
      [resultPromise](nsresult rv) { resultPromise->Reject(rv, __func__); });

  return resultPromise.forget();
}

already_AddRefed<GenericPromise>
ServiceWorkerUnregisterJob::ClearPushSubscriptions() {
  nsresult rv = NS_OK;
  nsCOMPtr<nsIPushService> pushService =
      do_GetService("@mozilla.org/push/Service;1", &rv);
  if (NS_FAILED(rv)) {
    return GenericPromise::CreateAndReject(rv, __func__).forget();
  }

  nsCOMPtr<PushUnsubscribeCallback> unsubscribeCallback =
      new PushUnsubscribeCallback();
  rv = pushService->Unsubscribe(NS_ConvertUTF8toUTF16(mScope), mPrincipal,
                                unsubscribeCallback);
  if (NS_FAILED(rv)) {
    return GenericPromise::CreateAndReject(rv, __func__).forget();
  }
  return unsubscribeCallback->Promise();
}

void ServiceWorkerUnregisterJob::AsyncExecute() {
  MOZ_ASSERT(NS_IsMainThread());

  if (Canceled()) {
    Finish(NS_ERROR_DOM_ABORT_ERR);
    return;
  }

  CookieStoreSubscriptionService::ServiceWorkerUnregistered(mPrincipal, mScope);

  nsTArray<RefPtr<GenericPromise>> promises{ClearNotifications(),
                                            ClearPushSubscriptions()};

  GenericPromise::AllSettled(GetMainThreadSerialEventTarget(), promises)
      ->Then(GetMainThreadSerialEventTarget(), __func__,
             [self = RefPtr(this)](
                 GenericPromise::AllSettledPromiseType::ResolveOrRejectValue&&
                     aValue) { self->Unregister(); });
}

void ServiceWorkerUnregisterJob::Unregister() {
  MOZ_ASSERT(NS_IsMainThread());

  RefPtr<ServiceWorkerManager> swm = ServiceWorkerManager::GetInstance();
  if (Canceled() || !swm) {
    Finish(NS_ERROR_DOM_ABORT_ERR);
    return;
  }

  // Step 1 of the Unregister algorithm requires checking that the
  // client origin matches the scope's origin.  We perform this in
  // registration->update() method directly since we don't have that
  // client information available here.

  // "Let registration be the result of running [[Get Registration]]
  // algorithm passing scope as the argument."
  RefPtr<ServiceWorkerRegistrationInfo> registration =
      swm->GetRegistration(mPrincipal, mScope);
  if (!registration) {
    // "If registration is null, then, resolve promise with false."
    Finish(NS_OK);
    return;
  }

  // Note, we send the message to remove the registration from disk now. This is
  // necessary to ensure the registration is removed if the controlled
  // clients are closed by shutting down the browser.
  swm->MaybeSendUnregister(mPrincipal, mScope);

  swm->EvictFromBFCache(registration);

  // "Remove scope to registration map[job's scope url]."
  swm->RemoveRegistration(registration);
  MOZ_ASSERT(registration->IsUnregistered());

  // "Resolve promise with true"
  mResult = true;
  InvokeResultCallbacks(NS_OK);

  // "Invoke Try Clear Registration with registration"
  if (!registration->IsControllingClients()) {
    if (registration->IsIdle()) {
      registration->Clear();
    } else {
      registration->ClearWhenIdle();
    }
  }

  Finish(NS_OK);
}

}  // namespace mozilla::dom
