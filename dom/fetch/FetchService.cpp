/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "FetchLog.h"
#include "FetchParent.h"
#include "nsContentUtils.h"
#include "nsIContentSecurityPolicy.h"
#include "nsICookieJarSettings.h"
#include "nsILoadGroup.h"
#include "nsILoadInfo.h"
#include "nsIIOService.h"
#include "nsIObserverService.h"
#include "nsIPrincipal.h"
#include "nsIScriptSecurityManager.h"
#include "nsNetUtil.h"
#include "nsThreadUtils.h"
#include "nsXULAppAPI.h"
#include "mozilla/BasePrincipal.h"
#include "mozilla/ClearOnShutdown.h"
#include "mozilla/SchedulerGroup.h"
#include "mozilla/ScopeExit.h"
#include "mozilla/UniquePtr.h"
#include "mozilla/dom/ClientInfo.h"
#include "mozilla/dom/FetchService.h"
#include "mozilla/dom/InternalRequest.h"
#include "mozilla/dom/InternalResponse.h"
#include "mozilla/dom/PerformanceStorage.h"
#include "mozilla/dom/PerformanceTiming.h"
#include "mozilla/dom/ServiceWorkerDescriptor.h"
#include "mozilla/ipc/BackgroundUtils.h"
#include "mozilla/net/CookieJarSettings.h"

namespace mozilla::dom {

mozilla::LazyLogModule gFetchLog("Fetch");

// FetchServicePromises

FetchServicePromises::FetchServicePromises()
    : mAvailablePromise(
          MakeRefPtr<FetchServiceResponseAvailablePromise::Private>(__func__)),
      mEndPromise(
          MakeRefPtr<FetchServiceResponseEndPromise::Private>(__func__)) {
  mAvailablePromise->UseSynchronousTaskDispatch(__func__);
  mEndPromise->UseSynchronousTaskDispatch(__func__);
}

RefPtr<FetchServiceResponseAvailablePromise>
FetchServicePromises::GetResponseAvailablePromise() {
  return mAvailablePromise;
}

RefPtr<FetchServiceResponseEndPromise>
FetchServicePromises::GetResponseEndPromise() {
  return mEndPromise;
}

void FetchServicePromises::ResolveResponseAvailablePromise(
    FetchServiceResponse&& aResponse, const char* aMethodName) {
  if (mAvailablePromise) {
    mAvailablePromise->Resolve(std::move(aResponse), aMethodName);
  }
}

void FetchServicePromises::RejectResponseAvailablePromise(
    const CopyableErrorResult&& aError, const char* aMethodName) {
  if (mAvailablePromise) {
    mAvailablePromise->Reject(aError, aMethodName);
  }
}

void FetchServicePromises::ResolveResponseEndPromise(ResponseEndArgs&& aArgs,
                                                     const char* aMethodName) {
  if (mEndPromise) {
    mEndPromise->Resolve(std::move(aArgs), aMethodName);
  }
}

void FetchServicePromises::RejectResponseEndPromise(
    const CopyableErrorResult&& aError, const char* aMethodName) {
  if (mEndPromise) {
    mEndPromise->Reject(aError, aMethodName);
  }
}

// FetchInstance

nsresult FetchService::FetchInstance::Initialize(FetchArgs&& aArgs) {
  MOZ_ASSERT(XRE_IsParentProcess());
  MOZ_ASSERT(NS_IsMainThread());
  MOZ_ASSERT(!aArgs.is<UnknownArgs>() && mArgs.is<UnknownArgs>());

  mArgs = std::move(aArgs);

  // Get needed information for FetchDriver from passed-in channel.
  if (mArgs.is<NavigationPreloadArgs>()) {
    mRequest = mArgs.as<NavigationPreloadArgs>().mRequest.clonePtr();
    nsIChannel* channel = mArgs.as<NavigationPreloadArgs>().mChannel;
    FETCH_LOG(("FetchInstance::Initialize [%p] request[%p], channel[%p]", this,
               mRequest.unsafeGetRawPtr(), channel));

    nsresult rv;
    nsCOMPtr<nsILoadInfo> loadInfo = channel->LoadInfo();
    MOZ_ASSERT(loadInfo);

    nsCOMPtr<nsIURI> channelURI;
    rv = channel->GetURI(getter_AddRefs(channelURI));
    if (NS_WARN_IF(NS_FAILED(rv))) {
      return rv;
    }

    nsIScriptSecurityManager* securityManager =
        nsContentUtils::GetSecurityManager();
    if (securityManager) {
      securityManager->GetChannelResultPrincipal(channel,
                                                 getter_AddRefs(mPrincipal));
    }

    if (!mPrincipal) {
      return NS_ERROR_UNEXPECTED;
    }

    // Get loadGroup from channel
    rv = channel->GetLoadGroup(getter_AddRefs(mLoadGroup));
    if (NS_WARN_IF(NS_FAILED(rv))) {
      return rv;
    }
    if (!mLoadGroup) {
      rv = NS_NewLoadGroup(getter_AddRefs(mLoadGroup), mPrincipal);
      if (NS_WARN_IF(NS_FAILED(rv))) {
        return rv;
      }
    }

    // Get CookieJarSettings from channel
    rv = loadInfo->GetCookieJarSettings(getter_AddRefs(mCookieJarSettings));
    if (NS_WARN_IF(NS_FAILED(rv))) {
      return rv;
    }

    // Get PerformanceStorage from channel
    mPerformanceStorage = loadInfo->GetPerformanceStorage();
  } else {
    mIsWorkerFetch = true;
    mRequest = mArgs.as<WorkerFetchArgs>().mRequest.clonePtr();

    FETCH_LOG(("FetchInstance::Initialize [%p] request[%p]", this,
               mRequest.unsafeGetRawPtr()));

    auto principalOrErr =
        PrincipalInfoToPrincipal(mArgs.as<WorkerFetchArgs>().mPrincipalInfo);
    if (principalOrErr.isErr()) {
      return principalOrErr.unwrapErr();
    }
    mPrincipal = principalOrErr.unwrap();
    nsresult rv = NS_NewLoadGroup(getter_AddRefs(mLoadGroup), mPrincipal);
    if (NS_WARN_IF(NS_FAILED(rv))) {
      return rv;
    }

    if (mArgs.as<WorkerFetchArgs>().mCookieJarSettings.isSome()) {
      net::CookieJarSettings::Deserialize(
          mArgs.as<WorkerFetchArgs>().mCookieJarSettings.ref(),
          getter_AddRefs(mCookieJarSettings));
    }
  }

  return NS_OK;
}

RefPtr<FetchServicePromises> FetchService::FetchInstance::Fetch() {
  MOZ_ASSERT(XRE_IsParentProcess());
  MOZ_ASSERT(NS_IsMainThread());

  MOZ_ASSERT(mPrincipal);
  MOZ_ASSERT(mLoadGroup);

  nsAutoCString principalSpec;
  MOZ_ALWAYS_SUCCEEDS(mPrincipal->GetAsciiSpec(principalSpec));
  nsAutoCString requestURL;
  mRequest->GetURL(requestURL);
  FETCH_LOG(("FetchInstance::Fetch [%p], mRequest URL: %s mPrincipal: %s", this,
             requestURL.BeginReading(), principalSpec.BeginReading()));

  nsresult rv;

  // Create a FetchDriver instance
  mFetchDriver = MakeRefPtr<FetchDriver>(
      mRequest.clonePtr(),               // Fetch Request
      mPrincipal,                        // Principal
      mLoadGroup,                        // LoadGroup
      GetMainThreadSerialEventTarget(),  // MainThreadEventTarget
      mCookieJarSettings,                // CookieJarSettings
      mPerformanceStorage,               // PerformanceStorage
      false                              // IsTrackingFetch
  );

  if (mIsWorkerFetch) {
    auto& args = mArgs.as<WorkerFetchArgs>();
    mFetchDriver->SetWorkerScript(args.mWorkerScript);
    MOZ_ASSERT(args.mClientInfo.isSome());
    mFetchDriver->SetClientInfo(args.mClientInfo.ref());
    mFetchDriver->SetController(args.mController);
    if (args.mCSPEventListener) {
      mFetchDriver->SetCSPEventListener(args.mCSPEventListener);
    }
  }

  mFetchDriver->EnableNetworkInterceptControl();

  mPromises = MakeRefPtr<FetchServicePromises>();

  // Call FetchDriver::Fetch to start fetching.
  // Pass AbortSignalImpl as nullptr since we no need support AbortSignalImpl
  // with FetchService. AbortSignalImpl related information should be passed
  // through PFetch or InterceptedHttpChannel, then call
  // FetchService::CancelFetch() to abort the running fetch.
  rv = mFetchDriver->Fetch(nullptr, this);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    FETCH_LOG(
        ("FetchInstance::Fetch FetchDriver::Fetch failed(0x%X)", (uint32_t)rv));
    return FetchService::NetworkErrorResponse(rv);
  }

  return mPromises;
}

void FetchService::FetchInstance::Cancel() {
  MOZ_ASSERT(XRE_IsParentProcess());
  MOZ_ASSERT(NS_IsMainThread());

  FETCH_LOG(("FetchInstance::Cancel() [%p]", this));

  if (mFetchDriver) {
    mFetchDriver->RunAbortAlgorithm();
  }

  MOZ_ASSERT(mPromises);

  mPromises->ResolveResponseAvailablePromise(
      InternalResponse::NetworkError(NS_ERROR_DOM_ABORT_ERR), __func__);

  mPromises->ResolveResponseEndPromise(
      ResponseEndArgs(FetchDriverObserver::eAborted, Nothing()), __func__);
}

void FetchService::FetchInstance::OnResponseEnd(
    FetchDriverObserver::EndReason aReason,
    JS::Handle<JS::Value> aReasonDetails) {
  FETCH_LOG(("FetchInstance::OnResponseEnd [%p] %s", this,
             aReason == eAborted ? "eAborted" : "eNetworking"));

  // Get response timing form FetchDriver
  Maybe<ResponseTiming> responseTiming;
  if (aReason != eAborted) {
    ResponseTiming timing;
    UniquePtr<PerformanceTimingData> performanceTiming(
        mFetchDriver->GetPerformanceTimingData(timing.initiatorType(),
                                               timing.entryName()));
    if (performanceTiming != nullptr) {
      timing.timingData() = performanceTiming->ToIPC();
      if (!mIsWorkerFetch) {
        // Force replace initiatorType for ServiceWorkerNavgationPreload.
        timing.initiatorType() = u"navigation"_ns;
      }
      responseTiming = Some(timing);
    }
  }

  if (mIsWorkerFetch) {
    FlushConsoleReport();
    nsCOMPtr<nsIRunnable> r = NS_NewRunnableFunction(
        __func__, [endArgs = ResponseEndArgs(aReason, responseTiming),
                   actorID = mArgs.as<WorkerFetchArgs>().mActorID]() {
          FETCH_LOG(("FetchInstance::OnResponseEnd, Runnable"));
          RefPtr<FetchParent> actor = FetchParent::GetActorByID(actorID);
          if (actor) {
            actor->OnResponseEnd(std::move(endArgs));
          }
        });
    MOZ_ALWAYS_SUCCEEDS(mArgs.as<WorkerFetchArgs>().mEventTarget->Dispatch(
        r, nsIThread::DISPATCH_NORMAL));
  }

  MOZ_ASSERT(mPromises);

  // Resolve the ResponseEndPromise
  mPromises->ResolveResponseEndPromise(ResponseEndArgs(aReason, responseTiming),
                                       __func__);

  if (aReason == eAborted) {
    return;
  }

  // Remove the FetchInstance from FetchInstanceTable
  RefPtr<FetchService> fetchService = FetchService::GetInstance();
  MOZ_ASSERT(fetchService);
  auto entry = fetchService->mFetchInstanceTable.Lookup(mPromises);
  if (entry) {
    entry.Remove();
    FETCH_LOG(
        ("FetchInstance::OnResponseEnd entry of responsePromise[%p] is "
         "removed",
         mPromises.get()));
  }
}

void FetchService::FetchInstance::OnResponseAvailableInternal(
    SafeRefPtr<InternalResponse> aResponse) {
  FETCH_LOG(("FetchInstance::OnResponseAvailableInternal [%p]", this));
  mResponse = std::move(aResponse);

  nsCOMPtr<nsIInputStream> body;
  mResponse->GetUnfilteredBody(getter_AddRefs(body));
  FETCH_LOG(
      ("FetchInstance::OnResponseAvailableInternal [%p] response body: %p",
       this, body.get()));

  if (mIsWorkerFetch) {
    nsCOMPtr<nsIRunnable> r = NS_NewRunnableFunction(
        __func__, [response = mResponse.clonePtr(),
                   actorID = mArgs.as<WorkerFetchArgs>().mActorID]() mutable {
          FETCH_LOG(("FetchInstance::OnResponseAvailableInternal Runnable"));
          RefPtr<FetchParent> actor = FetchParent::GetActorByID(actorID);
          if (actor) {
            actor->OnResponseAvailableInternal(std::move(response));
          }
        });
    MOZ_ALWAYS_SUCCEEDS(mArgs.as<WorkerFetchArgs>().mEventTarget->Dispatch(
        r, nsIThread::DISPATCH_NORMAL));
  }

  MOZ_ASSERT(mPromises);

  // Resolve the ResponseAvailablePromise
  mPromises->ResolveResponseAvailablePromise(mResponse.clonePtr(), __func__);
}

bool FetchService::FetchInstance::NeedOnDataAvailable() {
  if (mArgs.is<WorkerFetchArgs>()) {
    return mArgs.as<WorkerFetchArgs>().mNeedOnDataAvailable;
  }
  return false;
}

void FetchService::FetchInstance::OnDataAvailable() {
  FETCH_LOG(("FetchInstance::OnDataAvailable [%p]", this));

  if (!NeedOnDataAvailable()) {
    return;
  }

  if (mIsWorkerFetch) {
    nsCOMPtr<nsIRunnable> r = NS_NewRunnableFunction(
        __func__, [actorID = mArgs.as<WorkerFetchArgs>().mActorID]() {
          FETCH_LOG(("FetchInstance::OnDataAvailable, Runnable"));
          RefPtr<FetchParent> actor = FetchParent::GetActorByID(actorID);
          if (actor) {
            actor->OnDataAvailable();
          }
        });
    MOZ_ALWAYS_SUCCEEDS(mArgs.as<WorkerFetchArgs>().mEventTarget->Dispatch(
        r, nsIThread::DISPATCH_NORMAL));
  }
}

void FetchService::FetchInstance::FlushConsoleReport() {
  FETCH_LOG(("FetchInstance::FlushConsoleReport [%p]", this));

  if (mIsWorkerFetch) {
    if (!mReporter) {
      return;
    }
    nsTArray<net::ConsoleReportCollected> reports;
    mReporter->StealConsoleReports(reports);
    nsCOMPtr<nsIRunnable> r = NS_NewRunnableFunction(
        __func__, [actorID = mArgs.as<WorkerFetchArgs>().mActorID,
                   consoleReports = std::move(reports)]() {
          FETCH_LOG(("FetchInstance::FlushConsolReport, Runnable"));
          RefPtr<FetchParent> actor = FetchParent::GetActorByID(actorID);
          if (actor) {
            actor->OnFlushConsoleReport(std::move(consoleReports));
          }
        });
    MOZ_ALWAYS_SUCCEEDS(mArgs.as<WorkerFetchArgs>().mEventTarget->Dispatch(
        r, nsIThread::DISPATCH_NORMAL));
  }
}

// FetchService

NS_IMPL_ISUPPORTS(FetchService, nsIObserver)

StaticRefPtr<FetchService> gInstance;

/*static*/
already_AddRefed<FetchService> FetchService::GetInstance() {
  MOZ_ASSERT(XRE_IsParentProcess());
  MOZ_ASSERT(NS_IsMainThread());

  if (!gInstance) {
    gInstance = MakeRefPtr<FetchService>();
    nsresult rv = gInstance->RegisterNetworkObserver();
    if (NS_WARN_IF(NS_FAILED(rv))) {
      gInstance = nullptr;
      return nullptr;
    }
    ClearOnShutdown(&gInstance);
  }
  RefPtr<FetchService> service = gInstance;
  return service.forget();
}

/*static*/
RefPtr<FetchServicePromises> FetchService::NetworkErrorResponse(nsresult aRv) {
  RefPtr<FetchServicePromises> promises = MakeRefPtr<FetchServicePromises>();
  promises->ResolveResponseAvailablePromise(InternalResponse::NetworkError(aRv),
                                            __func__);
  promises->ResolveResponseEndPromise(
      ResponseEndArgs(FetchDriverObserver::eAborted, Nothing()), __func__);
  return promises;
}

FetchService::FetchService() {
  MOZ_ASSERT(XRE_IsParentProcess());
  MOZ_ASSERT(NS_IsMainThread());
}

FetchService::~FetchService() {
  MOZ_ALWAYS_SUCCEEDS(UnregisterNetworkObserver());
}

nsresult FetchService::RegisterNetworkObserver() {
  AssertIsOnMainThread();
  nsCOMPtr<nsIObserverService> observerService = services::GetObserverService();
  if (!observerService) {
    return NS_ERROR_UNEXPECTED;
  }

  nsCOMPtr<nsIIOService> ioService = services::GetIOService();
  if (!ioService) {
    return NS_ERROR_UNEXPECTED;
  }

  nsresult rv = observerService->AddObserver(
      this, NS_IOSERVICE_OFFLINE_STATUS_TOPIC, false);
  NS_ENSURE_SUCCESS(rv, rv);

  rv = observerService->AddObserver(this, "xpcom-shutdown", false);
  NS_ENSURE_SUCCESS(rv, rv);

  rv = ioService->GetOffline(&mOffline);
  NS_ENSURE_SUCCESS(rv, rv);
  mObservingNetwork = true;

  return NS_OK;
}

nsresult FetchService::UnregisterNetworkObserver() {
  AssertIsOnMainThread();
  nsresult rv;
  if (mObservingNetwork) {
    nsCOMPtr<nsIObserverService> observerService =
        mozilla::services::GetObserverService();
    if (observerService) {
      rv = observerService->RemoveObserver(this,
                                           NS_IOSERVICE_OFFLINE_STATUS_TOPIC);
      NS_ENSURE_SUCCESS(rv, rv);
      rv = observerService->RemoveObserver(this, "xpcom-shutdown");
      NS_ENSURE_SUCCESS(rv, rv);
    }
    mObservingNetwork = false;
  }
  return NS_OK;
}

NS_IMETHODIMP FetchService::Observe(nsISupports* aSubject, const char* aTopic,
                                    const char16_t* aData) {
  FETCH_LOG(("FetchService::Observe topic: %s", aTopic));
  AssertIsOnMainThread();
  MOZ_ASSERT(!strcmp(aTopic, NS_IOSERVICE_OFFLINE_STATUS_TOPIC) ||
             !strcmp(aTopic, "xpcom-shutdown"));

  if (!strcmp(aTopic, "xpcom-shutdown")) {
    // Going to shutdown, unregister the network status observer to avoid
    // receiving
    nsresult rv = UnregisterNetworkObserver();
    NS_ENSURE_SUCCESS(rv, rv);
    return NS_OK;
  }

  if (nsDependentString(aData).EqualsLiteral(NS_IOSERVICE_ONLINE)) {
    mOffline = false;
  } else {
    mOffline = true;
    // Network is offline, cancel running fetchs.
    for (auto it = mFetchInstanceTable.begin(), end = mFetchInstanceTable.end();
         it != end; ++it) {
      it->GetData()->Cancel();
    }
    mFetchInstanceTable.Clear();
  }
  return NS_OK;
}

RefPtr<FetchServicePromises> FetchService::Fetch(FetchArgs&& aArgs) {
  MOZ_ASSERT(XRE_IsParentProcess());
  MOZ_ASSERT(NS_IsMainThread());

  FETCH_LOG(("FetchService::Fetch (%s)", aArgs.is<NavigationPreloadArgs>()
                                             ? "NavigationPreload"
                                             : "WorkerFetch"));
  if (mOffline) {
    FETCH_LOG(("FetchService::Fetch network offline"));
    return NetworkErrorResponse(NS_ERROR_OFFLINE);
  }

  // Create FetchInstance
  RefPtr<FetchInstance> fetch = MakeRefPtr<FetchInstance>();

  // Call FetchInstance::Initialize() to get needed information for FetchDriver,
  nsresult rv = fetch->Initialize(std::move(aArgs));
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return NetworkErrorResponse(rv);
  }

  // Call FetchInstance::Fetch() to start an asynchronous fetching.
  RefPtr<FetchServicePromises> promises = fetch->Fetch();
  MOZ_ASSERT(promises);

  if (!promises->GetResponseAvailablePromise()->IsResolved()) {
    // Insert the created FetchInstance into FetchInstanceTable.
    if (!mFetchInstanceTable.WithEntryHandle(promises, [&](auto&& entry) {
          if (entry.HasEntry()) {
            return false;
          }
          entry.Insert(fetch);
          return true;
        })) {
      FETCH_LOG(
          ("FetchService::Fetch entry[%p] already exists", promises.get()));
      return NetworkErrorResponse(NS_ERROR_UNEXPECTED);
    }
    FETCH_LOG(("FetchService::Fetch entry[%p] of FetchInstance[%p] added",
               promises.get(), fetch.get()));
  }
  return promises;
}

void FetchService::CancelFetch(const RefPtr<FetchServicePromises>&& aPromises) {
  MOZ_ASSERT(XRE_IsParentProcess());
  MOZ_ASSERT(NS_IsMainThread());
  MOZ_ASSERT(aPromises);
  FETCH_LOG(("FetchService::CancelFetch aPromises[%p]", aPromises.get()));

  auto entry = mFetchInstanceTable.Lookup(aPromises);
  if (entry) {
    // Notice any modifications here before entry.Remove() probably should be
    // reflected to Observe() offline case.
    entry.Data()->Cancel();
    entry.Remove();
    FETCH_LOG(
        ("FetchService::CancelFetch entry [%p] removed", aPromises.get()));
  }
}

}  // namespace mozilla::dom
