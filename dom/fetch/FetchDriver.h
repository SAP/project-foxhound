/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_FetchDriver_h
#define mozilla_dom_FetchDriver_h

#include "nsIChannelEventSink.h"
#include "nsIInterfaceRequestor.h"
#include "nsINetworkInterceptController.h"
#include "nsIStreamListener.h"
#include "nsIThreadRetargetableStreamListener.h"
#include "mozilla/ConsoleReportCollector.h"
#include "mozilla/dom/AbortSignal.h"
#include "mozilla/dom/SafeRefPtr.h"
#include "mozilla/dom/SerializedStackHolder.h"
#include "mozilla/dom/SRIMetadata.h"
#include "mozilla/RefPtr.h"
#include "mozilla/UniquePtr.h"

#include "mozilla/DebugOnly.h"

class nsIConsoleReportCollector;
class nsICookieJarSettings;
class nsICSPEventListener;
class nsIEventTarget;
class nsIOutputStream;
class nsILoadGroup;
class nsIPrincipal;

namespace mozilla {
class PreloaderBase;

namespace dom {

class Document;
class InternalRequest;
class InternalResponse;
class PerformanceStorage;
class PerformanceTimingData;

/**
 * Provides callbacks to be called when response is available or on error.
 * Implemenations usually resolve or reject the promise returned from fetch().
 * The callbacks can be called synchronously or asynchronously from
 * FetchDriver::Fetch.
 */
class FetchDriverObserver {
 public:
  FetchDriverObserver()
      : mReporter(new ConsoleReportCollector()), mGotResponseAvailable(false) {}

  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(FetchDriverObserver);
  void OnResponseAvailable(SafeRefPtr<InternalResponse> aResponse);

  enum EndReason {
    eAborted,
    eByNetworking,
  };

  virtual void OnResponseEnd(EndReason aReason,
                             JS::Handle<JS::Value> aReasonDetails){};

  nsIConsoleReportCollector* GetReporter() const { return mReporter; }

  virtual void FlushConsoleReport() = 0;

  // Called in OnStartRequest() to determine if the OnDataAvailable() method
  // needs to be called.  Invoking that method may generate additional main
  // thread runnables.
  virtual bool NeedOnDataAvailable() = 0;

  // Called once when the first byte of data is received iff
  // NeedOnDataAvailable() returned true when called in OnStartRequest().
  virtual void OnDataAvailable() = 0;

  virtual void OnReportPerformanceTiming() {}

  virtual void OnNotifyNetworkMonitorAlternateStack(uint64_t aChannelID) {}

 protected:
  virtual ~FetchDriverObserver() = default;

  virtual void OnResponseAvailableInternal(
      SafeRefPtr<InternalResponse> aResponse) = 0;

  nsCOMPtr<nsIConsoleReportCollector> mReporter;

 private:
  bool mGotResponseAvailable;
};

class AlternativeDataStreamListener;

class FetchDriver final : public nsIChannelEventSink,
                          public nsIInterfaceRequestor,
                          public nsINetworkInterceptController,
                          public nsIThreadRetargetableStreamListener,
                          public AbortFollower {
 public:
  NS_DECL_THREADSAFE_ISUPPORTS
  NS_DECL_NSIREQUESTOBSERVER
  NS_DECL_NSISTREAMLISTENER
  NS_DECL_NSICHANNELEVENTSINK
  NS_DECL_NSIINTERFACEREQUESTOR
  NS_DECL_NSINETWORKINTERCEPTCONTROLLER
  NS_DECL_NSITHREADRETARGETABLESTREAMLISTENER

  FetchDriver(SafeRefPtr<InternalRequest> aRequest, nsIPrincipal* aPrincipal,
              nsILoadGroup* aLoadGroup, nsIEventTarget* aMainThreadEventTarget,
              nsICookieJarSettings* aCookieJarSettings,
              PerformanceStorage* aPerformanceStorage, bool aIsTrackingFetch);

  nsresult Fetch(AbortSignalImpl* aSignalImpl, FetchDriverObserver* aObserver);

  void SetDocument(Document* aDocument);

  void SetCSPEventListener(nsICSPEventListener* aCSPEventListener);

  void SetClientInfo(const ClientInfo& aClientInfo);

  void SetController(const Maybe<ServiceWorkerDescriptor>& aController);

  void SetWorkerScript(const nsACString& aWorkerScript) {
    MOZ_ASSERT(!aWorkerScript.IsEmpty());
    mWorkerScript = aWorkerScript;
  }

  void SetOriginStack(UniquePtr<SerializedStackHolder>&& aOriginStack) {
    mOriginStack = std::move(aOriginStack);
  }

  PerformanceTimingData* GetPerformanceTimingData(nsAString& aInitiatorType,
                                                  nsAString& aEntryName);

  // AbortFollower
  void RunAbortAlgorithm() override;
  void FetchDriverAbortActions(AbortSignalImpl* aSignalImpl);

  void EnableNetworkInterceptControl();

  void SetAssociatedBrowsingContextID(uint64_t aID) {
    mAssociatedBrowsingContextID = aID;
  }

  void SetIsThirdPartyWorker(const Maybe<bool> aIsThirdPartyWorker) {
    mIsThirdPartyWorker = aIsThirdPartyWorker;
  }

 private:
  nsCOMPtr<nsIPrincipal> mPrincipal;
  nsCOMPtr<nsILoadGroup> mLoadGroup;
  SafeRefPtr<InternalRequest> mRequest;
  SafeRefPtr<InternalResponse> mResponse;
  nsCOMPtr<nsIOutputStream> mPipeOutputStream;
  // Access to mObserver can be racy from OnDataAvailable and
  // FetchAbortActions. This must not be modified
  // in either of these functions.
  RefPtr<FetchDriverObserver> mObserver;
  RefPtr<Document> mDocument;
  nsCOMPtr<nsICSPEventListener> mCSPEventListener;
  Maybe<ClientInfo> mClientInfo;
  Maybe<ServiceWorkerDescriptor> mController;
  nsCOMPtr<nsIChannel> mChannel;
  UniquePtr<SRICheckDataVerifier> mSRIDataVerifier;
  nsCOMPtr<nsIEventTarget> mMainThreadEventTarget;

  nsCOMPtr<nsICookieJarSettings> mCookieJarSettings;

  // This is set only when Fetch is used in workers.
  RefPtr<PerformanceStorage> mPerformanceStorage;

  SRIMetadata mSRIMetadata;
  nsCString mWorkerScript;
  UniquePtr<SerializedStackHolder> mOriginStack;

  // This is written once in OnStartRequest on the main thread and then
  // written/read in OnDataAvailable() on any thread.  Necko guarantees
  // that these do not overlap.
  bool mNeedToObserveOnDataAvailable;

  bool mIsTrackingFetch;

  // Indicates whether the fetch request is from a third-party worker. Nothing
  // if the fetch request is not from a worker.
  Maybe<bool> mIsThirdPartyWorker;

  RefPtr<AlternativeDataStreamListener> mAltDataListener;
  bool mOnStopRequestCalled;

  // This flag is true when this fetch has found a matching preload and is being
  // satisfied by a its response.
  bool mFromPreload = false;
  // This flag is set in call to Abort() and spans the possible window this
  // fetch doesn't have mChannel (to be cancelled) between reuse of the matching
  // preload, that has already finished and dropped reference to its channel,
  // and OnStartRequest notification.  It let's us cancel the load when we get
  // the channel in OnStartRequest.
  bool mAborted = false;

#ifdef DEBUG
  bool mResponseAvailableCalled;
  bool mFetchCalled;
#endif
  nsCOMPtr<nsINetworkInterceptController> mInterceptController;

  uint64_t mAssociatedBrowsingContextID{0};

  friend class AlternativeDataStreamListener;

  FetchDriver() = delete;
  FetchDriver(const FetchDriver&) = delete;
  FetchDriver& operator=(const FetchDriver&) = delete;
  ~FetchDriver();

  already_AddRefed<PreloaderBase> FindPreload(nsIURI* aURI);

  void UpdateReferrerInfoFromNewChannel(nsIChannel* aChannel);

  nsresult HttpFetch(const nsACString& aPreferredAlternativeDataType = ""_ns);
  // Returns the filtered response sent to the observer.
  SafeRefPtr<InternalResponse> BeginAndGetFilteredResponse(
      SafeRefPtr<InternalResponse> aResponse, bool aFoundOpaqueRedirect);
  // Utility since not all cases need to do any post processing of the filtered
  // response.
  void FailWithNetworkError(nsresult rv);

  void SetRequestHeaders(nsIHttpChannel* aChannel, bool aStripRequestBodyHeader,
                         bool aStripAuthHeader) const;

  void FinishOnStopRequest(AlternativeDataStreamListener* aAltDataListener);
};

}  // namespace dom
}  // namespace mozilla

#endif  // mozilla_dom_FetchDriver_h
