/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "WebTransportEventService.h"
#include "nsThreadUtils.h"
#include "nsIObserverService.h"
#include "mozilla/StaticPtr.h"
#include "mozilla/Services.h"
#include "nsISupportsPrimitives.h"
#include "mozilla/StaticMutex.h"

namespace mozilla {
namespace net {

namespace {

StaticRefPtr<WebTransportEventService> gWebTransportEventService;
static StaticMutex sLock;

}  // anonymous namespace

class WebTransportBaseRunnable : public Runnable {
 public:
  WebTransportBaseRunnable(uint64_t aInnerWindowID, uint64_t aHttpChannelId)
      : Runnable("net::WebTransportBaseRunnable"),
        mInnerWindowID(aInnerWindowID),
        mHttpChannelId(aHttpChannelId),
        mService(WebTransportEventService::GetOrCreate()) {}

  NS_IMETHOD Run() override {
    MOZ_ASSERT(NS_IsMainThread());
    MOZ_ASSERT(mService);

    WebTransportEventService::WebTransportEventListeners listeners;
    mService->GetListeners(mInnerWindowID, listeners);

    for (uint32_t i = 0; i < listeners.Length(); ++i) {
      DoWork(listeners[i]);
    }

    return NS_OK;
  }

 protected:
  ~WebTransportBaseRunnable() = default;

  virtual void DoWork(nsIWebTransportEventListener* aListener) = 0;

  uint64_t mInnerWindowID;
  uint64_t mHttpChannelId;
  RefPtr<WebTransportEventService> mService;
};

class WebTransportSessionCreatedRunnable final
    : public WebTransportBaseRunnable {
 public:
  WebTransportSessionCreatedRunnable(uint64_t aInnerWindowID,
                                     uint64_t aHttpChannelId)
      : WebTransportBaseRunnable(aInnerWindowID, aHttpChannelId) {}

 private:
  virtual void DoWork(nsIWebTransportEventListener* aListener) override {
    DebugOnly<nsresult> rv =
        aListener->WebTransportSessionCreated(mHttpChannelId);
    NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                         "WebTransport Session Created failed");
  }
};

class WebTransportSessionClosedRunnable final
    : public WebTransportBaseRunnable {
 public:
  WebTransportSessionClosedRunnable(uint64_t aInnerWindowID,
                                    uint64_t aHttpChannelId, uint32_t aCode,
                                    const nsAString& aReason)
      : WebTransportBaseRunnable(aInnerWindowID, aHttpChannelId),
        mCode(aCode),
        mReason(aReason) {}

 private:
  virtual void DoWork(nsIWebTransportEventListener* aListener) override {
    DebugOnly<nsresult> rv =
        aListener->WebTransportSessionClosed(mHttpChannelId, mCode, mReason);
    NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                         "WebTransport Session Closed failed");
  }

  uint32_t mCode;
  const nsString mReason;
};

/* static */
already_AddRefed<WebTransportEventService>
WebTransportEventService::GetOrCreate() {
  StaticMutexAutoLock lock(sLock);

  if (!gWebTransportEventService) {
    gWebTransportEventService = new WebTransportEventService();
  }

  RefPtr<WebTransportEventService> service = gWebTransportEventService.get();
  return service.forget();
}

NS_INTERFACE_MAP_BEGIN(WebTransportEventService)
  NS_INTERFACE_MAP_ENTRY_AMBIGUOUS(nsISupports, nsIWebTransportEventService)
  NS_INTERFACE_MAP_ENTRY(nsIObserver)
  NS_INTERFACE_MAP_ENTRY(nsIWebTransportEventService)
NS_INTERFACE_MAP_END

NS_IMPL_ADDREF(WebTransportEventService)
NS_IMPL_RELEASE(WebTransportEventService)

WebTransportEventService::WebTransportEventService() : mCountListeners(0) {
  if (NS_IsMainThread()) {
    nsCOMPtr<nsIObserverService> obs = mozilla::services::GetObserverService();
    if (obs) {
      obs->AddObserver(this, "xpcom-shutdown", false);
      obs->AddObserver(this, "inner-window-destroyed", false);
    }
  } else {
    gWebTransportEventService = nullptr;
  }
}

void WebTransportEventService::WebTransportSessionCreated(
    uint64_t aInnerWindowID, uint64_t aHttpChannelId) {
  // Let's continue only if we have some listeners.
  if (!HasListeners()) {
    return;
  }

  RefPtr<WebTransportSessionCreatedRunnable> runnable =
      new WebTransportSessionCreatedRunnable(aInnerWindowID, aHttpChannelId);
  DebugOnly<nsresult> rv =
      NS_IsMainThread() ? runnable->Run() : NS_DispatchToMainThread(runnable);
  NS_WARNING_ASSERTION(NS_SUCCEEDED(rv), "Dispatch failed");
}

void WebTransportEventService::WebTransportSessionClosed(
    uint64_t aInnerWindowID, uint64_t aHttpChannelId, uint32_t aCode,
    const nsAString& aReason) {
  // Let's continue only if we have some listeners.
  if (!HasListeners()) {
    return;
  }

  RefPtr<WebTransportSessionClosedRunnable> runnable =
      new WebTransportSessionClosedRunnable(aInnerWindowID, aHttpChannelId,
                                            aCode, aReason);
  DebugOnly<nsresult> rv =
      NS_IsMainThread() ? runnable->Run() : NS_DispatchToMainThread(runnable);
  NS_WARNING_ASSERTION(NS_SUCCEEDED(rv), "Dispatch failed");
}

WebTransportEventService::~WebTransportEventService() {
  MOZ_ASSERT(NS_IsMainThread());
}

NS_IMETHODIMP
WebTransportEventService::AddListener(uint64_t aInnerWindowID,
                                      nsIWebTransportEventListener* aListener) {
  MOZ_ASSERT(NS_IsMainThread());

  if (!aListener) {
    return NS_ERROR_INVALID_ARG;
  }

  ++mCountListeners;

  WindowListener* listener = mWindows.GetOrInsertNew(aInnerWindowID);

  listener->mListeners.AppendElement(aListener);

  return NS_OK;
}

NS_IMETHODIMP
WebTransportEventService::RemoveListener(
    uint64_t aInnerWindowID, nsIWebTransportEventListener* aListener) {
  MOZ_ASSERT(NS_IsMainThread());

  if (!aListener) {
    return NS_ERROR_INVALID_ARG;
  }

  WindowListener* listener = mWindows.Get(aInnerWindowID);
  if (!listener) {
    return NS_ERROR_FAILURE;
  }

  if (!listener->mListeners.RemoveElement(aListener)) {
    return NS_ERROR_FAILURE;
  }

  // The last listener for this window.
  if (listener->mListeners.IsEmpty()) {
    mWindows.Remove(aInnerWindowID);
  }

  MOZ_ASSERT(mCountListeners);
  --mCountListeners;

  return NS_OK;
}

NS_IMETHODIMP
WebTransportEventService::HasListenerFor(uint64_t aInnerWindowID,
                                         bool* aResult) {
  MOZ_ASSERT(NS_IsMainThread());

  *aResult = mWindows.Get(aInnerWindowID);

  return NS_OK;
}

NS_IMETHODIMP
WebTransportEventService::Observe(nsISupports* aSubject, const char* aTopic,
                                  const char16_t* aData) {
  MOZ_ASSERT(NS_IsMainThread());

  if (!strcmp(aTopic, "xpcom-shutdown")) {
    Shutdown();
    return NS_OK;
  }

  if (!strcmp(aTopic, "inner-window-destroyed") && HasListeners()) {
    nsCOMPtr<nsISupportsPRUint64> wrapper = do_QueryInterface(aSubject);
    NS_ENSURE_TRUE(wrapper, NS_ERROR_FAILURE);

    uint64_t innerWindowID;
    nsresult rv = wrapper->GetData(&innerWindowID);
    NS_ENSURE_SUCCESS(rv, rv);

    WindowListener* listener = mWindows.Get(innerWindowID);
    if (!listener) {
      return NS_OK;
    }

    MOZ_ASSERT(mCountListeners >= listener->mListeners.Length());
    mCountListeners -= listener->mListeners.Length();
    mWindows.Remove(innerWindowID);
    return NS_OK;
  }
  return NS_ERROR_FAILURE;
}

bool WebTransportEventService::HasListeners() const {
  return !!mCountListeners;
}

void WebTransportEventService::GetListeners(
    uint64_t aInnerWindowID,
    WebTransportEventService::WebTransportEventListeners& aListeners) const {
  MOZ_ASSERT(NS_IsMainThread());
  aListeners.Clear();

  WindowListener* listener = mWindows.Get(aInnerWindowID);
  if (!listener) {
    return;
  }

  aListeners.AppendElements(listener->mListeners);
}

void WebTransportEventService::Shutdown() {
  MOZ_ASSERT(NS_IsMainThread());
  if (gWebTransportEventService) {
    nsCOMPtr<nsIObserverService> obs = mozilla::services::GetObserverService();
    if (obs) {
      obs->RemoveObserver(gWebTransportEventService, "xpcom-shutdown");
      obs->RemoveObserver(gWebTransportEventService, "inner-window-destroyed");
    }

    mWindows.Clear();
    StaticMutexAutoLock lock(sLock);
    gWebTransportEventService = nullptr;
  }
}

}  // namespace net
}  // namespace mozilla
