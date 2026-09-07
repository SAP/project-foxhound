/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "PushNotifier.h"

#include "mozilla/BasePrincipal.h"
#include "mozilla/Preferences.h"
#include "mozilla/Services.h"
#include "mozilla/dom/BodyUtil.h"
#include "mozilla/dom/ServiceWorkerManager.h"
#include "nsCOMPtr.h"
#include "nsContentUtils.h"
#include "nsICategoryManager.h"
#include "nsIPushService.h"
#include "nsIXULRuntime.h"
#include "nsNetUtil.h"
#include "nsXPCOM.h"

namespace mozilla::dom {

NS_IMPL_CYCLE_COLLECTION_0(PushNotifier)

NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(PushNotifier)
  NS_INTERFACE_MAP_ENTRY_AMBIGUOUS(nsISupports, nsIPushNotifier)
  NS_INTERFACE_MAP_ENTRY(nsIPushNotifier)
NS_INTERFACE_MAP_END

NS_IMPL_CYCLE_COLLECTING_ADDREF(PushNotifier)
NS_IMPL_CYCLE_COLLECTING_RELEASE(PushNotifier)

NS_IMETHODIMP
PushNotifier::NotifyPushWithData(const nsACString& aScope,
                                 nsIPrincipal* aPrincipal,
                                 const nsAString& aMessageId,
                                 const nsTArray<uint8_t>& aData) {
  NS_ENSURE_ARG(aPrincipal);
  // We still need to do this copying business, if we want the copy to be
  // fallible.  Just passing Some(aData) would do an infallible copy at the
  // point where the Some() call happens.
  nsTArray<uint8_t> data;
  if (!data.AppendElements(aData, fallible)) {
    return NS_ERROR_OUT_OF_MEMORY;
  }
  PushMessageDispatcher dispatcher(aScope, aPrincipal, aMessageId,
                                   Some(std::move(data)));
  return Dispatch(dispatcher);
}

NS_IMETHODIMP
PushNotifier::NotifyPush(const nsACString& aScope, nsIPrincipal* aPrincipal,
                         const nsAString& aMessageId) {
  NS_ENSURE_ARG(aPrincipal);
  PushMessageDispatcher dispatcher(aScope, aPrincipal, aMessageId, Nothing());
  return Dispatch(dispatcher);
}

NS_IMETHODIMP
PushNotifier::NotifySubscriptionChange(const nsACString& aScope,
                                       nsIPrincipal* aPrincipal,
                                       nsIPushSubscription* aOldSubscription) {
  NS_ENSURE_ARG(aPrincipal);
  PushSubscriptionChangeDispatcher dispatcher(aScope, aPrincipal,
                                              aOldSubscription);
  return Dispatch(dispatcher);
}

NS_IMETHODIMP
PushNotifier::NotifySubscriptionModified(const nsACString& aScope,
                                         nsIPrincipal* aPrincipal) {
  NS_ENSURE_ARG(aPrincipal);
  PushSubscriptionModifiedDispatcher dispatcher(aScope, aPrincipal);
  return Dispatch(dispatcher);
}

NS_IMETHODIMP
PushNotifier::NotifyError(const nsACString& aScope, nsIPrincipal* aPrincipal,
                          const nsAString& aMessage, uint32_t aFlags) {
  NS_ENSURE_ARG(aPrincipal);
  PushErrorDispatcher dispatcher(aScope, aPrincipal, aMessage, aFlags);
  return Dispatch(dispatcher);
}

nsresult PushNotifier::Dispatch(PushDispatcher& aDispatcher) {
  MOZ_ASSERT(XRE_IsParentProcess());

  // Always notify XPCOM observers in the parent process.
  (void)NS_WARN_IF(NS_FAILED(aDispatcher.NotifyObservers()));

  // notify workers in the parent.
  return aDispatcher.NotifyWorkers();
}

PushData::PushData(const nsTArray<uint8_t>& aData) : mData(aData.Clone()) {}

PushData::~PushData() = default;

NS_IMPL_CYCLE_COLLECTION_0(PushData)

NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(PushData)
  NS_INTERFACE_MAP_ENTRY_AMBIGUOUS(nsISupports, nsIPushData)
  NS_INTERFACE_MAP_ENTRY(nsIPushData)
NS_INTERFACE_MAP_END

NS_IMPL_CYCLE_COLLECTING_ADDREF(PushData)
NS_IMPL_CYCLE_COLLECTING_RELEASE(PushData)

nsresult PushData::EnsureDecodedText() {
  if (mData.IsEmpty() || !mDecodedText.IsEmpty()) {
    return NS_OK;
  }
  nsresult rv = BodyUtil::ConsumeText(
      mData.Length(), reinterpret_cast<uint8_t*>(mData.Elements()),
      mDecodedText);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    mDecodedText.Truncate();
    return rv;
  }
  return NS_OK;
}

NS_IMETHODIMP
PushData::Text(nsAString& aText) {
  nsresult rv = EnsureDecodedText();
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return rv;
  }
  aText = mDecodedText;
  return NS_OK;
}

NS_IMETHODIMP
PushData::Json(JSContext* aCx, JS::MutableHandle<JS::Value> aResult) {
  nsresult rv = EnsureDecodedText();
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return rv;
  }
  ErrorResult error;
  BodyUtil::ConsumeJson(aCx, aResult, mDecodedText, error);
  return error.StealNSResult();
}

NS_IMETHODIMP
PushData::Binary(nsTArray<uint8_t>& aData) {
  aData = mData.Clone();
  return NS_OK;
}

PushMessage::PushMessage(nsIPrincipal* aPrincipal, nsIPushData* aData)
    : mPrincipal(aPrincipal), mData(aData) {}

PushMessage::~PushMessage() = default;

NS_IMPL_CYCLE_COLLECTION(PushMessage, mPrincipal, mData)

NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(PushMessage)
  NS_INTERFACE_MAP_ENTRY_AMBIGUOUS(nsISupports, nsIPushMessage)
  NS_INTERFACE_MAP_ENTRY(nsIPushMessage)
NS_INTERFACE_MAP_END

NS_IMPL_CYCLE_COLLECTING_ADDREF(PushMessage)
NS_IMPL_CYCLE_COLLECTING_RELEASE(PushMessage)

NS_IMETHODIMP
PushMessage::GetPrincipal(nsIPrincipal** aPrincipal) {
  NS_ENSURE_ARG_POINTER(aPrincipal);

  nsCOMPtr<nsIPrincipal> principal = mPrincipal;
  principal.forget(aPrincipal);
  return NS_OK;
}

NS_IMETHODIMP
PushMessage::GetData(nsIPushData** aData) {
  NS_ENSURE_ARG_POINTER(aData);

  nsCOMPtr<nsIPushData> data = mData;
  data.forget(aData);
  return NS_OK;
}

PushDispatcher::PushDispatcher(const nsACString& aScope,
                               nsIPrincipal* aPrincipal)
    : mScope(aScope), mPrincipal(aPrincipal) {}

PushDispatcher::~PushDispatcher() = default;

nsresult PushDispatcher::NotifyObserversAndWorkers() {
  (void)NS_WARN_IF(NS_FAILED(NotifyObservers()));
  return NotifyWorkers();
}

bool PushDispatcher::ShouldNotifyWorkers() {
  if (NS_WARN_IF(!mPrincipal)) {
    return false;
  }

  // System subscriptions use observer notifications instead of service worker
  // events.
  if (mPrincipal->IsSystemPrincipal()) {
    return false;
  }

  // The `testing.notifyWorkers` pref controls worker events for non-system
  // subscriptions.
  return Preferences::GetBool("dom.push.testing.notifyWorkers", true);
}

nsresult PushDispatcher::DoNotifyObservers(nsISupports* aSubject,
                                           const char* aTopic,
                                           const nsACString& aScope) {
  nsCOMPtr<nsIObserverService> obsService =
      mozilla::services::GetObserverService();
  if (!obsService) {
    return NS_ERROR_FAILURE;
  }
  // If there's a service for this push category, make sure it is alive.
  nsCOMPtr<nsICategoryManager> catMan =
      do_GetService(NS_CATEGORYMANAGER_CONTRACTID);
  if (catMan) {
    nsCString contractId;
    nsresult rv = catMan->GetCategoryEntry("push", mScope, contractId);
    if (NS_SUCCEEDED(rv)) {
      // Ensure the service is created - we don't need to do anything with
      // it though - we assume the service constructor attaches a listener.
      nsCOMPtr<nsISupports> service = do_GetService(contractId.get());
    }
  }
  return obsService->NotifyObservers(aSubject, aTopic,
                                     NS_ConvertUTF8toUTF16(mScope).get());
}

PushMessageDispatcher::PushMessageDispatcher(
    const nsACString& aScope, nsIPrincipal* aPrincipal,
    const nsAString& aMessageId, const Maybe<nsTArray<uint8_t>>& aData)
    : PushDispatcher(aScope, aPrincipal),
      mMessageId(aMessageId),
      mData(aData ? Some(aData->Clone()) : Nothing()) {}

PushMessageDispatcher::~PushMessageDispatcher() = default;

nsresult PushMessageDispatcher::NotifyObservers() {
  nsCOMPtr<nsIPushData> data;
  if (mData) {
    data = new PushData(mData.ref());
  }
  nsCOMPtr<nsIPushMessage> message = new PushMessage(mPrincipal, data);
  return DoNotifyObservers(message, OBSERVER_TOPIC_PUSH, mScope);
}

nsresult PushMessageDispatcher::NotifyWorkers() {
  if (!ShouldNotifyWorkers()) {
    return NS_OK;
  }
  RefPtr<ServiceWorkerManager> swm = ServiceWorkerManager::GetInstance();
  if (!swm) {
    return NS_ERROR_FAILURE;
  }
  nsAutoCString originSuffix;
  nsresult rv = mPrincipal->GetOriginSuffix(originSuffix);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return rv;
  }
  return swm->SendPushEvent(originSuffix, mScope, mMessageId, mData);
}

PushSubscriptionChangeDispatcher::PushSubscriptionChangeDispatcher(
    const nsACString& aScope, nsIPrincipal* aPrincipal,
    nsIPushSubscription* aOldSubscription)
    : PushDispatcher(aScope, aPrincipal), mOldSubscription(aOldSubscription) {}

PushSubscriptionChangeDispatcher::~PushSubscriptionChangeDispatcher() = default;

nsresult PushSubscriptionChangeDispatcher::NotifyObservers() {
  return DoNotifyObservers(mPrincipal, OBSERVER_TOPIC_SUBSCRIPTION_CHANGE,
                           mScope);
}

nsresult PushSubscriptionChangeDispatcher::NotifyWorkers() {
  if (!ShouldNotifyWorkers()) {
    return NS_OK;
  }
  RefPtr<ServiceWorkerManager> swm = ServiceWorkerManager::GetInstance();
  if (!swm) {
    return NS_ERROR_FAILURE;
  }
  nsAutoCString originSuffix;
  nsresult rv = mPrincipal->GetOriginSuffix(originSuffix);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return rv;
  }
  return swm->SendPushSubscriptionChangeEvent(originSuffix, mScope,
                                              mOldSubscription);
}

PushSubscriptionModifiedDispatcher::PushSubscriptionModifiedDispatcher(
    const nsACString& aScope, nsIPrincipal* aPrincipal)
    : PushDispatcher(aScope, aPrincipal) {}

PushSubscriptionModifiedDispatcher::~PushSubscriptionModifiedDispatcher() =
    default;

nsresult PushSubscriptionModifiedDispatcher::NotifyObservers() {
  return DoNotifyObservers(mPrincipal, OBSERVER_TOPIC_SUBSCRIPTION_MODIFIED,
                           mScope);
}

nsresult PushSubscriptionModifiedDispatcher::NotifyWorkers() { return NS_OK; }

PushErrorDispatcher::PushErrorDispatcher(const nsACString& aScope,
                                         nsIPrincipal* aPrincipal,
                                         const nsAString& aMessage,
                                         uint32_t aFlags)
    : PushDispatcher(aScope, aPrincipal), mMessage(aMessage), mFlags(aFlags) {}

PushErrorDispatcher::~PushErrorDispatcher() = default;

nsresult PushErrorDispatcher::NotifyObservers() { return NS_OK; }

nsresult PushErrorDispatcher::NotifyWorkers() {
  if (!ShouldNotifyWorkers() &&
      (!mPrincipal || mPrincipal->IsSystemPrincipal())) {
    // For system subscriptions, log the error directly to the browser console.
    return nsContentUtils::ReportToConsoleNonLocalized(
        mMessage, mFlags, "Push"_ns, nullptr, /* aDocument */
        SourceLocation());
  }

  // For service worker subscriptions, report the error to all clients.
  RefPtr<ServiceWorkerManager> swm = ServiceWorkerManager::GetInstance();
  if (swm) {
    swm->ReportToAllClients(mScope, mMessage, mScope, /* aFilename */
                            u""_ns,                   /* aLine */
                            0,                        /* aLineNumber */
                            0,                        /* aColumnNumber */
                            mFlags);
  }
  return NS_OK;
}

}  // namespace mozilla::dom
