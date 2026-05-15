/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/ReportDeliver.h"

#include <algorithm>

#include "mozilla/JSONStringWriteFuncs.h"
#include "mozilla/StaticPrefs_dom.h"
#include "mozilla/dom/Document.h"
#include "mozilla/dom/Fetch.h"
#include "mozilla/dom/Navigator.h"
#include "mozilla/dom/Promise.h"
#include "mozilla/dom/ReportBody.h"
#include "mozilla/dom/Request.h"
#include "mozilla/dom/RequestBinding.h"
#include "mozilla/dom/Response.h"
#include "mozilla/dom/RootedDictionary.h"
#include "mozilla/ipc/BackgroundChild.h"
#include "mozilla/ipc/PBackgroundChild.h"
#include "mozilla/ipc/PBackgroundSharedTypes.h"
#include "nsGlobalWindowInner.h"
#include "nsIGlobalObject.h"
#include "nsIXPConnect.h"
#include "nsNetUtil.h"
#include "nsStringStream.h"

namespace mozilla::dom {

namespace {

StaticRefPtr<ReportDeliver> gReportDeliver;

// This is the same value as the default value of
// dom.min_timeout_value, so it's not that random.
constexpr double gMinReportAgeInMs = 4.0;

class ReportFetchHandler final : public PromiseNativeHandler {
 public:
  NS_DECL_ISUPPORTS

  explicit ReportFetchHandler(
      const nsTArray<ReportDeliver::ReportData>& aReportData)
      : mReports(aReportData.Clone()) {}

  void ResolvedCallback(JSContext* aCx, JS::Handle<JS::Value> aValue,
                        ErrorResult& aRv) override {
    if (!gReportDeliver) {
      return;
    }

    if (NS_WARN_IF(!aValue.isObject())) {
      return;
    }

    JS::Rooted<JSObject*> obj(aCx, &aValue.toObject());
    MOZ_ASSERT(obj);

    {
      Response* response = nullptr;
      if (NS_WARN_IF(NS_FAILED(UNWRAP_OBJECT(Response, &obj, response)))) {
        return;
      }

      if (response->Status() == 410) {
        if (XRE_IsContentProcess()) {
          for (const auto& report : mReports) {
            gReportDeliver->EndpointRespondedWithRemove(report.mGlobalKey,
                                                        report.mGroupName);
          }
        } else {
          // Crash Reports will end up here, because they're not sent from with
          // a content process. The endpoints used for crash reporting and NEL
          // are parsed using the ReportingHeader::ReportingFromChannel, since
          // these two variants of Reporting API strictly should run in the
          // parent process
          for (const auto& report : mReports) {
            ReportingHeader::RemoveEndpoint(
                report.mGroupName, report.mEndpointURL, report.mPrincipal);
          }
        }
      }
    }
  }

  void RejectedCallback(JSContext* aCx, JS::Handle<JS::Value> aValue,
                        ErrorResult& aRv) override {
    if (gReportDeliver) {
      for (auto& report : mReports) {
        ++report.mFailures;
        gReportDeliver->EnqueueReport(report);
      }
    }
  }

 private:
  ~ReportFetchHandler() = default;

  nsTArray<ReportDeliver::ReportData> mReports;
};

NS_IMPL_ISUPPORTS0(ReportFetchHandler)

class ReportJSONWriter final : public JSONWriter {
 public:
  explicit ReportJSONWriter(JSONStringWriteFunc<nsAutoCString>& aOutput)
      : JSONWriter(aOutput) {}

  void JSONProperty(const Span<const char>& aProperty,
                    const Span<const char>& aJSON) {
    Separator();
    PropertyNameAndColon(aProperty);
    mWriter.Write(aJSON);
  }
};

void SendReports(nsTArray<ReportDeliver::ReportData>& aReports,
                 const nsCString& aEndPointUrl, nsIPrincipal* aPrincipal) {
  if (NS_WARN_IF(aReports.IsEmpty())) {
    return;
  }

  nsIXPConnect* xpc = nsContentUtils::XPConnect();
  MOZ_ASSERT(xpc, "This should never be null!");

  nsCOMPtr<nsIGlobalObject> globalObject;
  {
    AutoJSAPI jsapi;
    jsapi.Init();

    JSContext* cx = jsapi.cx();
    JS::Rooted<JSObject*> sandbox(cx);
    nsresult rv = xpc->CreateSandbox(cx, aPrincipal, sandbox.address());
    if (NS_WARN_IF(NS_FAILED(rv))) {
      return;
    }

    // The JSContext is not in a realm, so CreateSandbox returned an unwrapped
    // global.
    MOZ_ASSERT(JS_IsGlobalObject(sandbox));

    globalObject = xpc::NativeGlobal(sandbox);
  }

  if (NS_WARN_IF(!globalObject)) {
    return;
  }

  // The body
  JSONStringWriteFunc<nsAutoCString> body;
  ReportJSONWriter w(body);

  w.StartArrayElement();
  for (const auto& report : aReports) {
    MOZ_ASSERT(report.mPrincipal == aPrincipal);
    MOZ_ASSERT(report.mEndpointURL == aEndPointUrl);
    w.StartObjectElement();
    // It looks like in rare cases, TimeStamp::Now() may be the same
    // as report.mCreationTime, so we introduce a constant number to
    // make sure "age" is always not 0.
    w.IntProperty(
        "age",
        std::max((TimeStamp::Now() - report.mCreationTime).ToMilliseconds(),
                 gMinReportAgeInMs));
    w.StringProperty("type", NS_ConvertUTF16toUTF8(report.mType));
    w.StringProperty("url", NS_ConvertUTF16toUTF8(report.mURL));
    w.StringProperty("user_agent", NS_ConvertUTF16toUTF8(report.mUserAgent));
    w.JSONProperty(MakeStringSpan("body"),
                   Span<const char>(report.mReportBodyJSON.Data(),
                                    report.mReportBodyJSON.Length()));
    w.EndObject();
  }
  w.EndArray();

  // The body as stream
  nsCOMPtr<nsIInputStream> streamBody;
  nsresult rv =
      NS_NewCStringInputStream(getter_AddRefs(streamBody), body.StringCRef());

  // Headers
  IgnoredErrorResult error;
  RefPtr<InternalHeaders> internalHeaders =
      new InternalHeaders(HeadersGuardEnum::Request);
  internalHeaders->Set("Content-Type"_ns, "application/reports+json"_ns, error);
  if (NS_WARN_IF(error.Failed())) {
    return;
  }

  // URL and fragments
  nsCOMPtr<nsIURI> uri;
  rv = NS_NewURI(getter_AddRefs(uri), aEndPointUrl);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return;
  }

  nsCOMPtr<nsIURI> uriClone;
  rv = NS_GetURIWithoutRef(uri, getter_AddRefs(uriClone));
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return;
  }

  nsAutoCString uriSpec;
  rv = uriClone->GetSpec(uriSpec);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return;
  }

  nsAutoCString uriFragment;
  rv = uri->GetRef(uriFragment);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return;
  }

  auto internalRequest = MakeSafeRefPtr<InternalRequest>(uriSpec, uriFragment);

  internalRequest->SetMethod("POST"_ns);
  internalRequest->SetBody(streamBody, body.StringCRef().Length());
  internalRequest->SetHeaders(internalHeaders);
  internalRequest->SetSkipServiceWorker();
  // TODO: internalRequest->SetContentPolicyType(TYPE_REPORT);
  internalRequest->SetMode(RequestMode::Cors);
  internalRequest->SetCredentialsMode(RequestCredentials::Same_origin);
  internalRequest->SetUnsafeRequest();

  if (aReports[0].mCookieJarSettings) {
    internalRequest->SetCookieJarSettings(aReports[0].mCookieJarSettings);
  }

  RefPtr<Request> request =
      new Request(globalObject, std::move(internalRequest), nullptr);

  RequestOrUTF8String fetchInput;
  fetchInput.SetAsRequest() = request;

  RootedDictionary<RequestInit> requestInit(RootingCx());
  RefPtr<Promise> promise = FetchRequest(globalObject, fetchInput, requestInit,
                                         CallerType::NonSystem, error);
  if (error.Failed()) {
    if (gReportDeliver) {
      for (auto& report : aReports) {
        ++report.mFailures;
        gReportDeliver->EnqueueReport(report);
      }
    }
    return;
  }

  RefPtr<ReportFetchHandler> handler = new ReportFetchHandler(aReports);
  promise->AppendNativeHandler(handler);
}

}  // namespace

/* static */
void ReportDeliver::AttemptDelivery(nsIGlobalObject* aGlobal,
                                    const nsAString& aType,
                                    const nsAString& aGroupName,
                                    const nsAString& aURL, ReportBody* aBody) {
  MOZ_ASSERT(aGlobal && aBody);

  if (NS_WARN_IF(!gReportDeliver)) {
    return;
  }

  nsCOMPtr<nsIPrincipal> principal = aGlobal->PrincipalOrNull();
  if (NS_WARN_IF(!principal)) {
    return;
  }

  // We have to serialize aBody here because the thread we're sending
  // this to, sometimes isn't not the owner, which doesn't work for RefPtr.
  JSONStringWriteFunc<nsAutoCString> reportBodyJSON;
  ReportJSONWriter w(reportBodyJSON);

  w.Start();
  aBody->ToJSON(w);
  w.End();

  RefPtr<nsIRunnable> runnable = NS_NewRunnableFunction(
      "ReportDeliver::AttemptDelivery",
      [aGlobalKey = reinterpret_cast<uintptr_t>(aGlobal),
       type = nsString{aType}, group = nsString{aGroupName},
       reportUrl = nsString{aURL},
       reportBody = std::move(reportBodyJSON).StringRRef(),
       principal]() mutable {
        ReportData data;

        // https://w3c.github.io/reporting/#report-delivery
        // 2.1 If there exists an endpoint (endpoint) in context’s endpoints
        // list whose name is report’s destination:
        // 2.1.1 Append report to
        // endpoint map’s list of reports for endpoint.
        nsIURI* endpointURI =
            gReportDeliver->GetEndpointURLFor(aGlobalKey, group);
        if (!endpointURI) {
          return;
        }
        endpointURI->GetSpec(data.mEndpointURL);

        data.mType = std::move(type);
        data.mGroupName = std::move(group);
        data.mURL = std::move(reportUrl);
        data.mCreationTime = TimeStamp::Now();
        data.mReportBodyJSON = std::move(reportBody);
        data.mPrincipal = std::move(principal);
        data.mFailures = 0;
        gReportDeliver->SetGlobalAndUserAgentData(data, aGlobalKey);
        ReportDeliver::Fetch(data);
      });

  if (!NS_IsMainThread()) {
    NS_DispatchToMainThread(runnable.forget());
  } else {
    runnable->Run();
  }
}

void ReportDeliver::SetGlobalAndUserAgentData(
    ReportDeliver::ReportData& aReportData, uintptr_t aGlobalKey) {
  // Will be null for workers
  aReportData.mGlobalKey = aGlobalKey;
  if (auto reportingGlobal = mGlobalsEndpointLists.Lookup(aGlobalKey)) {
    aReportData.mUserAgent = reportingGlobal->mUserAgentData;
    aReportData.mCookieJarSettings = reportingGlobal->mCookieJarSettings;
  }
}

void ReportDeliver::ScheduleFetch() {
  MOZ_ASSERT(NS_IsMainThread());
  if (mPendingDelivery) {
    return;
  }

  mPendingDelivery = true;
  nsCOMPtr<nsIRunnable> runnable = NS_NewRunnableFunction(
      "ReportDeliver::CallNotify",
      [self = RefPtr<ReportDeliver>{gReportDeliver}]() { self->Notify(); });

  NS_DispatchToCurrentThreadQueue(
      runnable.forget(), StaticPrefs::dom_reporting_delivering_timeout() * 1000,
      EventQueuePriority::Idle);
}

void ReportDeliver::EnqueueReport(const ReportData& aReportData) {
  MOZ_ASSERT(NS_IsMainThread());
  // If this is failed report, and queue is full, don't remove potentially
  // non-tried reports, instead discard this one.
  if ((aReportData.mFailures > 0 &&
       mReportQueue.Length() >
           StaticPrefs::dom_reporting_delivering_maxReports()) ||
      aReportData.mFailures >=
          StaticPrefs::dom_reporting_delivering_maxFailures()) {
    return;
  }

  if (NS_WARN_IF(!mReportQueue.AppendElement(aReportData, fallible))) {
    return;
  }

  while (mReportQueue.Length() >
         StaticPrefs::dom_reporting_delivering_maxReports()) {
    mReportQueue.RemoveElementAt(0);
  }

  ScheduleFetch();
}

void ReportDeliver::Initialize() {
  if (!gReportDeliver) {
    RefPtr<ReportDeliver> rd = new ReportDeliver();

    nsCOMPtr<nsIObserverService> obs = services::GetObserverService();
    if (NS_WARN_IF(!obs)) {
      return;
    }

    obs->AddObserver(rd, NS_XPCOM_SHUTDOWN_OBSERVER_ID, false);
    gReportDeliver = rd;
  }
}

/* static */
void ReportDeliver::WorkerInitializeReportingEndpoints(
    uintptr_t aGlobalKey, nsIURI* aResourceURI, nsCString aHeaderContents,
    bool aShouldResistFingerprinting,
    nsICookieJarSettings* aCookieJarSettings) {
  MOZ_ASSERT(!NS_IsMainThread());
  if (NS_WARN_IF(!aResourceURI) || aHeaderContents.IsEmpty() ||
      aHeaderContents.IsVoid()) {
    return;
  }

  NS_DispatchToMainThread(NS_NewRunnableFunction(
      "ReportDeliver::DispatchInitializeReportingEndpoints",
      [aGlobalKey, uri = RefPtr{aResourceURI},
       header = std::move(aHeaderContents), aShouldResistFingerprinting,
       cookieJarSettings = nsCOMPtr{aCookieJarSettings}]() mutable {
        EndpointsList list;
        ReportingHeader::ParseReportingEndpointsHeader(
            header, uri,
            [&list](const nsAString& aEndpointName,
                    nsCOMPtr<nsIURI> aEndpointURL) {
              list.mData.EmplaceBack(ReportingHeader::Endpoint::Create(
                  aEndpointURL.forget(), aEndpointName));
            });

        nsString userAgent;
        mozilla::dom::Navigator::GetUserAgent(
            nullptr, nullptr, Some(aShouldResistFingerprinting), userAgent);

        gReportDeliver->mGlobalsEndpointLists.InsertOrUpdate(
            aGlobalKey,
            GlobalReportingData{std::move(userAgent), std::move(list),
                                cookieJarSettings});
      }));
}

/** static */
void ReportDeliver::WindowInitializeReportingEndpoints(
    nsIGlobalObject* aGlobal, mozilla::dom::EndpointsList aEndpointList) {
  MOZ_ASSERT(NS_IsMainThread());

  nsString userAgentData;
  if (aEndpointList.mData.IsEmpty()) {
    return;
  }

  nsPIDOMWindowInner* win = aGlobal->GetAsInnerWindow();
  RefPtr<Document> doc;
  if (win) {
    doc = win->GetExtantDoc();
  }

  nsCOMPtr<nsICookieJarSettings> cookieJarSettings;
  if (doc) {
    cookieJarSettings = doc->CookieJarSettings();
  }

  (void)mozilla::dom::Navigator::GetUserAgent(
      win, doc,
      mozilla::Some(
          aGlobal->ShouldResistFingerprinting(RFPTarget::NavigatorUserAgent)),
      userAgentData);
  gReportDeliver->mGlobalsEndpointLists.InsertOrUpdate(
      reinterpret_cast<uintptr_t>(aGlobal),
      GlobalReportingData{std::move(userAgentData), std::move(aEndpointList),
                          std::move(cookieJarSettings)});
}

nsIURI* ReportDeliver::GetEndpointURLFor(uintptr_t aGlobalKey,
                                         const nsAString& aGroupName) {
  MOZ_ASSERT(NS_IsMainThread());
  auto reportingGlobal = mGlobalsEndpointLists.Lookup(aGlobalKey);
  if (!reportingGlobal) {
    return nullptr;
  }

  if (ReportingHeader::Endpoint* endpoint =
          reportingGlobal->mEndpoints.GetEndpointWithName(aGroupName)) {
    return endpoint->mUrl;
  }
  return nullptr;
}

void ReportDeliver::EndpointRespondedWithRemove(
    uint64_t aGlobalKey, const nsAString& aEndpointName) {
  auto reportingGlobal = mGlobalsEndpointLists.Lookup(aGlobalKey);
  if (!reportingGlobal) {
    return;
  }
  reportingGlobal->mEndpoints.RemoveEndpoint(aEndpointName);
}

/* static */
void ReportDeliver::Fetch(const ReportData& aReportData) {
  if (aReportData.mFailures >
      StaticPrefs::dom_reporting_delivering_maxFailures()) {
    return;
  }

  gReportDeliver->EnqueueReport(aReportData);
}

void ReportDeliver::Notify() {
  MOZ_ASSERT(NS_IsMainThread());
  mPendingDelivery = false;
  nsTArray<ReportData> reports = std::move(mReportQueue);
  // group reports by endpoint and nsIPrincipal
  std::map<std::pair<nsCString, nsCOMPtr<nsIPrincipal>>, nsTArray<ReportData>>
      reportsByPrincipal;
  for (ReportData& report : reports) {
    auto already_seen =
        reportsByPrincipal.find({report.mEndpointURL, report.mPrincipal});
    if (already_seen == reportsByPrincipal.end()) {
      reportsByPrincipal.emplace(
          std::make_pair(report.mEndpointURL, report.mPrincipal),
          nsTArray<ReportData>({report}));
    } else {
      already_seen->second.AppendElement(report);
    }
  }

  for (auto& iter : reportsByPrincipal) {
    std::pair<nsCString, nsCOMPtr<nsIPrincipal>> key = iter.first;
    nsTArray<ReportData>& value = iter.second;
    nsCString url = key.first;
    nsCOMPtr<nsIPrincipal> principal = key.second;
    nsAutoCString u(url);
    SendReports(value, url, principal);
  }
}

NS_IMETHODIMP
ReportDeliver::GetName(nsACString& aName) {
  aName.AssignLiteral("ReportDeliver");
  return NS_OK;
}

NS_IMETHODIMP
ReportDeliver::Observe(nsISupports* aSubject, const char* aTopic,
                       const char16_t* aData) {
  MOZ_ASSERT(!strcmp(aTopic, NS_XPCOM_SHUTDOWN_OBSERVER_ID));

  nsCOMPtr<nsIObserverService> obs = services::GetObserverService();
  if (NS_WARN_IF(!obs)) {
    return NS_OK;
  }

  obs->RemoveObserver(this, NS_XPCOM_SHUTDOWN_OBSERVER_ID);

  gReportDeliver = nullptr;
  return NS_OK;
}

ReportDeliver::ReportDeliver() = default;

ReportDeliver::~ReportDeliver() = default;

NS_INTERFACE_MAP_BEGIN(ReportDeliver)
  NS_INTERFACE_MAP_ENTRY_AMBIGUOUS(nsISupports, nsIObserver)
  NS_INTERFACE_MAP_ENTRY(nsIObserver)
  NS_INTERFACE_MAP_ENTRY(nsINamed)
NS_INTERFACE_MAP_END

NS_IMPL_ADDREF(ReportDeliver)
NS_IMPL_RELEASE(ReportDeliver)

}  // namespace mozilla::dom
