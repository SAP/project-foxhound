/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_ReportDeliver_h
#define mozilla_dom_ReportDeliver_h

#include "mozilla/dom/ReportingHeader.h"
#include "nsIObserver.h"
#include "nsITimer.h"
#include "nsTArray.h"
#include "nsTHashMap.h"

// XXX Avoid including this here by moving function bodies to the cpp file
#include "nsIPrincipal.h"

class nsICookieJarSettings;
class nsIPrincipal;
class nsPIDOMWindowInner;
class nsIGlobalObject;

namespace mozilla::dom {

class ReportBody;

// A global's registered user agent data and it's list of endpoints parsed from
// the response header "Reporting-Endpoints"
struct GlobalReportingData {
  nsString mUserAgentData;
  EndpointsList mEndpoints;
  nsCOMPtr<nsICookieJarSettings> mCookieJarSettings;
};

class ReportDeliver final : public nsIObserver, public nsINamed {
 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIOBSERVER
  NS_DECL_NSINAMED

  struct ReportData {
    nsString mType;
    nsString mGroupName;
    nsString mURL;
    nsCString mEndpointURL;
    nsString mUserAgent;
    TimeStamp mCreationTime;
    nsCString mReportBodyJSON;
    nsCOMPtr<nsIPrincipal> mPrincipal;
    nsCOMPtr<nsICookieJarSettings> mCookieJarSettings;
    uint32_t mFailures;
    uintptr_t mGlobalKey;
  };

  static void AttemptDelivery(nsIGlobalObject* aGlobal, const nsAString& aType,
                              const nsAString& aGroupName,
                              const nsAString& aURL, ReportBody* aBody);

  static void Fetch(const ReportData& aReportData);

  void Notify();
  void EnqueueReport(const ReportData& aReportData);

  /* Initialize static ReportingDeliver */
  static void Initialize();

  /**
   * https://w3c.github.io/reporting/#document-configuration
   * Initialize global's endpoint list for workers.
   * Dispatches to main thread.
   */
  static void WorkerInitializeReportingEndpoints(
      uintptr_t aGlobalKey, nsIURI* aResourceURI, nsCString aHeaderContents,
      bool aShouldResistFingerprinting,
      nsICookieJarSettings* aCookieJarSettings);

  /**
   * https://w3c.github.io/reporting/#document-configuration
   * Initialize global's endpoint list for document globals.
   */
  static void WindowInitializeReportingEndpoints(
      nsIGlobalObject* aGlobal, mozilla::dom::EndpointsList aEndpointList);

  // Safe to return T* here, because now, all mutations, all getters, happens on
  // the main thread.
  nsIURI* GetEndpointURLFor(uintptr_t aGlobalKey, const nsAString& aGroupName);
  void EndpointRespondedWithRemove(uint64_t aGlobalKey,
                                   const nsAString& aEndpointName);

 private:
  ReportDeliver();
  ~ReportDeliver();

  void ScheduleFetch();
  void SetGlobalAndUserAgentData(ReportDeliver::ReportData& aReportData,
                                 uintptr_t aGlobalKey);
  bool mPendingDelivery{false};
  nsTArray<ReportData> mReportQueue;
  // Maps a `WindowOrWorkerGlobalScope` to a GlobalReportingData, containing the
  // user agent information it should provide. It also contains the list of
  // endpoints registered for that global.
  nsTHashMap<uintptr_t, GlobalReportingData> mGlobalsEndpointLists;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_ReportDeliver_h
