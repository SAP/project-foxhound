/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_ReportingHeader_h
#define mozilla_dom_ReportingHeader_h

#include "mozilla/TimeStamp.h"
#include "nsClassHashtable.h"
#include "nsIObserver.h"
#include "nsITimer.h"
#include "nsTHashMap.h"
#include "nsTObserverArray.h"

class nsIChannel;
class nsIHttpChannel;
class nsIPrincipal;
class nsIURI;

namespace mozilla {

class OriginAttributesPattern;

namespace ipc {
class PrincipalInfo;
}

namespace dom {

class EndpointsList;

class ReportingHeader final : public nsIObserver,
                              public nsITimerCallback,
                              public nsINamed {
 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIOBSERVER
  NS_DECL_NSITIMERCALLBACK
  NS_DECL_NSINAMED

  static void Initialize();

  // Exposed structs for gtests

  // https://w3c.github.io/reporting/#endpoint
  struct Endpoint {
    nsCOMPtr<nsIURI> mUrl;
    nsString mEndpointName;
    uint32_t mPriority;
    uint32_t mWeight;
    uint32_t mFailures;
    static Endpoint Create(already_AddRefed<nsIURI> aURL,
                           const nsAString& aEndpointName) {
      return Endpoint{aURL, nsString{aEndpointName}, 1, 1, 0};
    }
  };

  struct Group {
    nsString mName;
    bool mIncludeSubdomains;
    int32_t mTTL;
    TimeStamp mCreationTime;
    nsTObserverArray<Endpoint> mEndpoints;
  };

  struct Client {
    nsTObserverArray<Group> mGroups;
  };

  // https://w3c.github.io/reporting/#process-header
  static EndpointsList ProcessReportingEndpointsListFromResponse(
      nsIHttpChannel* aChannel);

  // Parses the Reporting-Endpoints of a given header according to the algorithm
  // in https://www.w3.org/TR/reporting-1/#header
  static size_t ParseReportingEndpointsHeader(
      const nsACString& aHeaderValue, nsIURI* aURI,
      std::function<void(const nsAString&, nsCOMPtr<nsIURI>)>&&
          aOnParsedItemCallback);

  // [Deprecated] Parses the contents of a given header according to the
  // algorithm in https://www.w3.org/TR/2018/WD-reporting-1-20180925/#header
  static UniquePtr<Client> ParseReportToHeader(nsIHttpChannel* aChannel,
                                               nsIURI* aURI,
                                               const nsACString& aHeaderValue);

  static void GetEndpointForReport(
      const nsAString& aGroupName,
      const mozilla::ipc::PrincipalInfo& aPrincipalInfo,
      nsACString& aEndpointURI);

  static void GetEndpointForReport(const nsAString& aGroupName,
                                   nsIPrincipal* aPrincipal,
                                   nsACString& aEndpointURI);

  // Used for network-error-logging
  // If no endpoint is found for aPrincipal and aIncludeSubdomains is true
  // we'll check all parent origins for groups that have mIncludeSubdomains
  // equal to true.
  static void GetEndpointForReportIncludeSubdomains(const nsAString& aGroupName,
                                                    nsIPrincipal* aPrincipal,
                                                    bool aIncludeSubdomains,
                                                    nsACString& aEndpointURI);

  static void RemoveEndpoint(const nsAString& aGroupName,
                             const nsACString& aEndpointURL,
                             nsIPrincipal* aPrincipal);

  // ChromeOnly-WebIDL methods

  static bool HasReportingHeaderForOrigin(const nsACString& aOrigin);

 private:
  ReportingHeader();
  ~ReportingHeader();

  static void Shutdown();

  // Checks if a channel contains a Report-To header and parses its value.
  void ReportingFromChannel(nsIHttpChannel* aChannel);

  // This method checks if the protocol handler of the URI has the
  // URI_IS_POTENTIALLY_TRUSTWORTHY flag.
  static bool IsSecureURI(nsIURI* aURI);

  void RemoveOriginsFromHost(const nsAString& aHost);

  void RemoveOriginsFromOriginAttributesPattern(
      const OriginAttributesPattern& aPattern);

  void RemoveOrigins();

  void RemoveOriginsForTTL();

  void MaybeCreateCleanupTimer();

  void MaybeCancelCleanupTimer();

  static void LogToConsoleInvalidJSON(nsIHttpChannel* aChannel, nsIURI* aURI);

  static void LogToConsoleDuplicateGroup(nsIHttpChannel* aChannel, nsIURI* aURI,
                                         const nsAString& aName);

  static void LogToConsoleInvalidNameItem(nsIHttpChannel* aChannel,
                                          nsIURI* aURI);

  static void LogToConsoleIncompleteItem(nsIHttpChannel* aChannel, nsIURI* aURI,
                                         const nsAString& aName);

  static void LogToConsoleIncompleteEndpoint(nsIHttpChannel* aChannel,
                                             nsIURI* aURI,
                                             const nsAString& aName);

  static void LogToConsoleInvalidURLEndpoint(nsIHttpChannel* aChannel,
                                             nsIURI* aURI,
                                             const nsAString& aName,
                                             const nsAString& aURL);

  static void LogToConsoleInternal(nsIHttpChannel* aChannel, nsIURI* aURI,
                                   const char* aMsg,
                                   const nsTArray<nsString>& aParams);

  static void GetEndpointForReportInternal(const ReportingHeader::Group& aGrup,
                                           nsACString& aEndpointURI);

  nsClassHashtable<nsCStringHashKey, Client> mOrigins;

  nsCOMPtr<nsITimer> mCleanupTimer;
};

class EndpointsList {
 public:
  ReportingHeader::Endpoint* GetEndpointWithName(
      const nsAString& aEndpointName);
  void RemoveEndpoint(const nsAString& aEndpointName);

  nsTArray<ReportingHeader::Endpoint> mData;
};

}  // namespace dom
}  // namespace mozilla

#endif  // mozilla_dom_ReportingHeader_h
