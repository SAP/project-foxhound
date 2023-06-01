/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/net/OpaqueResponseUtils.h"

#include "mozilla/dom/Document.h"
#include "mozilla/StaticPrefs_browser.h"
#include "mozilla/dom/JSValidatorParent.h"
#include "ErrorList.h"
#include "nsContentUtils.h"
#include "nsHttpResponseHead.h"
#include "nsISupports.h"
#include "nsMimeTypes.h"
#include "nsThreadUtils.h"
#include "nsStringStream.h"
#include "HttpBaseChannel.h"

#define LOGORB(msg, ...)            \
  MOZ_LOG(gORBLog, LogLevel::Debug, \
          ("%s: %p " msg, __func__, this, ##__VA_ARGS__))

namespace mozilla::net {

static bool IsOpaqueSafeListedMIMEType(const nsACString& aContentType) {
  if (aContentType.EqualsLiteral(TEXT_CSS) ||
      aContentType.EqualsLiteral(IMAGE_SVG_XML)) {
    return true;
  }

  NS_ConvertUTF8toUTF16 typeString(aContentType);
  return nsContentUtils::IsJavascriptMIMEType(typeString);
}

static bool IsOpaqueBlockListedMIMEType(const nsACString& aContentType) {
  return aContentType.EqualsLiteral(TEXT_HTML) ||
         StringEndsWith(aContentType, "+json"_ns) ||
         aContentType.EqualsLiteral(APPLICATION_JSON) ||
         aContentType.EqualsLiteral(TEXT_JSON) ||
         StringEndsWith(aContentType, "+xml"_ns) ||
         aContentType.EqualsLiteral(APPLICATION_XML) ||
         aContentType.EqualsLiteral(TEXT_XML);
}

static bool IsOpaqueBlockListedNeverSniffedMIMEType(
    const nsACString& aContentType) {
  return aContentType.EqualsLiteral(APPLICATION_GZIP2) ||
         aContentType.EqualsLiteral(APPLICATION_MSEXCEL) ||
         aContentType.EqualsLiteral(APPLICATION_MSPPT) ||
         aContentType.EqualsLiteral(APPLICATION_MSWORD) ||
         aContentType.EqualsLiteral(APPLICATION_MSWORD_TEMPLATE) ||
         aContentType.EqualsLiteral(APPLICATION_PDF) ||
         aContentType.EqualsLiteral(APPLICATION_MPEGURL) ||
         aContentType.EqualsLiteral(APPLICATION_VND_CES_QUICKPOINT) ||
         aContentType.EqualsLiteral(APPLICATION_VND_CES_QUICKSHEET) ||
         aContentType.EqualsLiteral(APPLICATION_VND_CES_QUICKWORD) ||
         aContentType.EqualsLiteral(APPLICATION_VND_MS_EXCEL) ||
         aContentType.EqualsLiteral(APPLICATION_VND_MS_EXCEL2) ||
         aContentType.EqualsLiteral(APPLICATION_VND_MS_PPT) ||
         aContentType.EqualsLiteral(APPLICATION_VND_MS_PPT2) ||
         aContentType.EqualsLiteral(APPLICATION_VND_MS_WORD) ||
         aContentType.EqualsLiteral(APPLICATION_VND_MS_WORD2) ||
         aContentType.EqualsLiteral(APPLICATION_VND_MS_WORD3) ||
         aContentType.EqualsLiteral(APPLICATION_VND_MSWORD) ||
         aContentType.EqualsLiteral(
             APPLICATION_VND_PRESENTATIONML_PRESENTATION) ||
         aContentType.EqualsLiteral(APPLICATION_VND_PRESENTATIONML_TEMPLATE) ||
         aContentType.EqualsLiteral(APPLICATION_VND_SPREADSHEETML_SHEET) ||
         aContentType.EqualsLiteral(APPLICATION_VND_SPREADSHEETML_TEMPLATE) ||
         aContentType.EqualsLiteral(
             APPLICATION_VND_WORDPROCESSINGML_DOCUMENT) ||
         aContentType.EqualsLiteral(
             APPLICATION_VND_WORDPROCESSINGML_TEMPLATE) ||
         aContentType.EqualsLiteral(APPLICATION_VND_PRESENTATION_OPENXML) ||
         aContentType.EqualsLiteral(APPLICATION_VND_PRESENTATION_OPENXMLM) ||
         aContentType.EqualsLiteral(APPLICATION_VND_SPREADSHEET_OPENXML) ||
         aContentType.EqualsLiteral(APPLICATION_VND_WORDPROSSING_OPENXML) ||
         aContentType.EqualsLiteral(APPLICATION_GZIP) ||
         aContentType.EqualsLiteral(APPLICATION_XPROTOBUF) ||
         aContentType.EqualsLiteral(APPLICATION_XPROTOBUFFER) ||
         aContentType.EqualsLiteral(APPLICATION_ZIP) ||
         aContentType.EqualsLiteral(AUDIO_MPEG_URL) ||
         aContentType.EqualsLiteral(MULTIPART_BYTERANGES) ||
         aContentType.EqualsLiteral(MULTIPART_SIGNED) ||
         aContentType.EqualsLiteral(TEXT_EVENT_STREAM) ||
         aContentType.EqualsLiteral(TEXT_CSV) ||
         aContentType.EqualsLiteral(TEXT_VTT);
}

OpaqueResponseBlockedReason GetOpaqueResponseBlockedReason(
    const nsACString& aContentType, uint16_t aStatus, bool aNoSniff) {
  if (aContentType.IsEmpty()) {
    return OpaqueResponseBlockedReason::BLOCKED_SHOULD_SNIFF;
  }

  if (IsOpaqueSafeListedMIMEType(aContentType)) {
    return OpaqueResponseBlockedReason::ALLOWED_SAFE_LISTED;
  }

  if (IsOpaqueBlockListedNeverSniffedMIMEType(aContentType)) {
    return OpaqueResponseBlockedReason::BLOCKED_BLOCKLISTED_NEVER_SNIFFED;
  }

  if (aStatus == 206 && IsOpaqueBlockListedMIMEType(aContentType)) {
    return OpaqueResponseBlockedReason::BLOCKED_206_AND_BLOCKLISTED;
  }

  nsAutoCString contentTypeOptionsHeader;
  if (aNoSniff && (IsOpaqueBlockListedMIMEType(aContentType) ||
                   aContentType.EqualsLiteral(TEXT_PLAIN))) {
    return OpaqueResponseBlockedReason::
        BLOCKED_NOSNIFF_AND_EITHER_BLOCKLISTED_OR_TEXTPLAIN;
  }

  return OpaqueResponseBlockedReason::BLOCKED_SHOULD_SNIFF;
}

OpaqueResponseBlockedReason GetOpaqueResponseBlockedReason(
    const nsHttpResponseHead& aResponseHead) {
  nsAutoCString contentType;
  aResponseHead.ContentType(contentType);

  nsAutoCString contentTypeOptionsHeader;
  bool nosniff =
      aResponseHead.GetContentTypeOptionsHeader(contentTypeOptionsHeader) &&
      contentTypeOptionsHeader.EqualsIgnoreCase("nosniff");

  return GetOpaqueResponseBlockedReason(contentType, aResponseHead.Status(),
                                        nosniff);
}

Result<std::tuple<int64_t, int64_t, int64_t>, nsresult>
ParseContentRangeHeaderString(const nsAutoCString& aRangeStr) {
  // Parse the range header: e.g. Content-Range: bytes 7000-7999/8000.
  const int32_t spacePos = aRangeStr.Find(" "_ns);
  const int32_t dashPos = aRangeStr.Find("-"_ns, spacePos);
  const int32_t slashPos = aRangeStr.Find("/"_ns, dashPos);

  nsAutoCString rangeStartText;
  aRangeStr.Mid(rangeStartText, spacePos + 1, dashPos - (spacePos + 1));

  nsresult rv;
  const int64_t rangeStart = rangeStartText.ToInteger64(&rv);
  if (NS_FAILED(rv)) {
    return Err(rv);
  }
  if (0 > rangeStart) {
    return Err(NS_ERROR_ILLEGAL_VALUE);
  }

  nsAutoCString rangeEndText;
  aRangeStr.Mid(rangeEndText, dashPos + 1, slashPos - (dashPos + 1));
  const int64_t rangeEnd = rangeEndText.ToInteger64(&rv);
  if (NS_FAILED(rv)) {
    return Err(rv);
  }
  if (rangeStart > rangeEnd) {
    return Err(NS_ERROR_ILLEGAL_VALUE);
  }

  nsAutoCString rangeTotalText;
  aRangeStr.Right(rangeTotalText, aRangeStr.Length() - (slashPos + 1));
  if (rangeTotalText[0] == '*') {
    return std::make_tuple(rangeStart, rangeEnd, (int64_t)-1);
  }

  const int64_t rangeTotal = rangeTotalText.ToInteger64(&rv);
  if (NS_FAILED(rv)) {
    return Err(rv);
  }
  if (rangeEnd >= rangeTotal) {
    return Err(NS_ERROR_ILLEGAL_VALUE);
  }

  return std::make_tuple(rangeStart, rangeEnd, rangeTotal);
}

bool IsFirstPartialResponse(nsHttpResponseHead& aResponseHead) {
  MOZ_ASSERT(aResponseHead.Status() == 206);

  nsAutoCString contentRange;
  Unused << aResponseHead.GetHeader(nsHttp::Content_Range, contentRange);

  auto rangeOrErr = ParseContentRangeHeaderString(contentRange);
  if (rangeOrErr.isErr()) {
    return false;
  }

  const int64_t responseFirstBytePos = std::get<0>(rangeOrErr.unwrap());
  return responseFirstBytePos == 0;
}

void LogORBError(nsILoadInfo* aLoadInfo, nsIURI* aURI) {
  RefPtr<dom::Document> doc;
  aLoadInfo->GetLoadingDocument(getter_AddRefs(doc));

  nsAutoCString uri;
  nsresult rv = nsContentUtils::AnonymizeURI(aURI, uri);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return;
  }

  AutoTArray<nsString, 1> params;
  CopyUTF8toUTF16(uri, *params.AppendElement());

  MOZ_LOG(gORBLog, LogLevel::Debug,
          ("%s: Resource blocked: %s ", __func__, uri.get()));
  nsContentUtils::ReportToConsole(nsIScriptError::warningFlag, "ORB"_ns, doc,
                                  nsContentUtils::eNECKO_PROPERTIES,
                                  "ResourceBlockedCORS", params);
}

OpaqueResponseBlocker::OpaqueResponseBlocker(nsIStreamListener* aNext,
                                             HttpBaseChannel* aChannel,
                                             const nsCString& aContentType,
                                             bool aNoSniff)
    : mNext(aNext), mContentType(aContentType), mNoSniff(aNoSniff) {
  // Storing aChannel as a member is tricky as aChannel owns us and it's
  // hard to ensure aChannel is alive when we about to use it without
  // creating a cycle. This is all doable but need some extra efforts.
  //
  // So we are just passing aChannel from the caller when we need to use it.
  MOZ_ASSERT(aChannel);

  if (MOZ_UNLIKELY(MOZ_LOG_TEST(gORBLog, LogLevel::Debug))) {
    nsCOMPtr<nsIURI> uri;
    aChannel->GetURI(getter_AddRefs(uri));
    if (uri) {
      LOGORB(" channel=%p, uri=%s", aChannel, uri->GetSpecOrDefault().get());
    }
  }
  MOZ_DIAGNOSTIC_ASSERT(XRE_IsParentProcess());
  MOZ_DIAGNOSTIC_ASSERT(aChannel->CachedOpaqueResponseBlockingPref());
}

NS_IMETHODIMP
OpaqueResponseBlocker::OnStartRequest(nsIRequest* aRequest) {
  LOGORB();

  if (mState == State::Sniffing) {
    Unused << EnsureOpaqueResponseIsAllowedAfterSniff(aRequest);
  }

  // mState will remain State::Sniffing if we need to wait
  // for JS validator to make a decision.
  //
  // When the state is Sniffing, we can't call mNext->OnStartRequest
  // because fetch requests need the cancellation to be done
  // before its FetchDriver::OnStartRequest is called, otherwise it'll
  // resolve the promise regardless the decision of JS validator.
  if (mState != State::Sniffing) {
    nsresult rv = mNext->OnStartRequest(aRequest);
    return NS_SUCCEEDED(mStatus) ? rv : mStatus;
  }

  return NS_OK;
}

NS_IMETHODIMP
OpaqueResponseBlocker::OnStopRequest(nsIRequest* aRequest,
                                     nsresult aStatusCode) {
  LOGORB();

  nsresult statusForStop = aStatusCode;

  if (mState == State::Blocked && NS_FAILED(mStatus)) {
    statusForStop = mStatus;
  }

  if (mState == State::Sniffing) {
    // It is the call to JSValidatorParent::OnStopRequest that will trigger the
    // JS parser.
    mStartOfJavaScriptValidation = TimeStamp::Now();

    MOZ_ASSERT(mJSValidator);
    mPendingOnStopRequestStatus = Some(aStatusCode);
    mJSValidator->OnStopRequest(aStatusCode);
    return NS_OK;
  }

  return mNext->OnStopRequest(aRequest, statusForStop);
}

NS_IMETHODIMP
OpaqueResponseBlocker::OnDataAvailable(nsIRequest* aRequest,
                                       nsIInputStream* aInputStream,
                                       uint64_t aOffset, uint32_t aCount) {
  LOGORB();

  if (mState == State::Allowed) {
    return mNext->OnDataAvailable(aRequest, aInputStream, aOffset, aCount);
  }

  if (mState == State::Blocked) {
    return NS_ERROR_FAILURE;
  }

  MOZ_ASSERT(mState == State::Sniffing);

  nsCString data;
  if (!data.SetLength(aCount, fallible)) {
    return NS_ERROR_OUT_OF_MEMORY;
  }

  uint32_t read;
  nsresult rv = aInputStream->Read(data.BeginWriting(), aCount, &read);
  if (NS_FAILED(rv)) {
    return rv;
  }

  MOZ_ASSERT(mJSValidator);

  mJSValidator->OnDataAvailable(data);

  return NS_OK;
}

nsresult OpaqueResponseBlocker::EnsureOpaqueResponseIsAllowedAfterSniff(
    nsIRequest* aRequest) {
  nsCOMPtr<HttpBaseChannel> httpBaseChannel = do_QueryInterface(aRequest);
  MOZ_ASSERT(httpBaseChannel);

  // The `AfterSniff` check shouldn't be run when
  // 1. We have made a decision already
  // 2. The JS validator is running, so we should wait
  // for its result.
  if (mState != State::Sniffing || mJSValidator) {
    return NS_OK;
  }

  nsCOMPtr<nsILoadInfo> loadInfo;

  nsresult rv =
      httpBaseChannel->GetLoadInfo(getter_AddRefs<nsILoadInfo>(loadInfo));
  if (NS_FAILED(rv)) {
    LOGORB("Failed to get LoadInfo");
    BlockResponse(httpBaseChannel, rv);
    return rv;
  }

  nsCOMPtr<nsIURI> uri;
  rv = httpBaseChannel->GetURI(getter_AddRefs<nsIURI>(uri));
  if (NS_FAILED(rv)) {
    LOGORB("Failed to get uri");
    BlockResponse(httpBaseChannel, rv);
    return rv;
  }

  switch (httpBaseChannel->PerformOpaqueResponseSafelistCheckAfterSniff(
      mContentType, mNoSniff)) {
    case OpaqueResponse::Block:
      BlockResponse(httpBaseChannel, NS_ERROR_FAILURE);
      return NS_ERROR_FAILURE;
    case OpaqueResponse::Allow:
      AllowResponse();
      return NS_OK;
    case OpaqueResponse::Sniff:
    case OpaqueResponse::SniffCompressed:
      break;
  }

  MOZ_ASSERT(mState == State::Sniffing);
  return ValidateJavaScript(httpBaseChannel, uri, loadInfo);
}

static void RecordTelemetry(const TimeStamp& aStartOfValidation,
                            const TimeStamp& aStartOfJavaScriptValidation,
                            OpaqueResponseBlocker::ValidatorResult aResult) {
  using ValidatorResult = OpaqueResponseBlocker::ValidatorResult;
  MOZ_DIAGNOSTIC_ASSERT(aStartOfValidation);

  auto key = [aResult]() {
    switch (aResult) {
      case ValidatorResult::JavaScript:
        return "javascript"_ns;
      case ValidatorResult::JSON:
        return "json"_ns;
      case ValidatorResult::Other:
        return "other"_ns;
      case ValidatorResult::Failure:
        return "failure"_ns;
    }
    MOZ_ASSERT_UNREACHABLE("Switch statement should be saturated");
    return "failure"_ns;
  }();

  TimeStamp now = TimeStamp::Now();
  PROFILER_MARKER_TEXT(
      "ORB safelist check", NETWORK,
      MarkerTiming::Interval(aStartOfValidation, aStartOfJavaScriptValidation),
      nsPrintfCString("Receive data for validation (%s)", key.get()));

  PROFILER_MARKER_TEXT(
      "ORB safelist check", NETWORK,
      MarkerTiming::Interval(aStartOfJavaScriptValidation, now),
      nsPrintfCString("JS Validation (%s)", key.get()));

  Telemetry::AccumulateTimeDelta(Telemetry::ORB_RECEIVE_DATA_FOR_VALIDATION_MS,
                                 key, aStartOfValidation,
                                 aStartOfJavaScriptValidation);

  Telemetry::AccumulateTimeDelta(Telemetry::ORB_JAVASCRIPT_VALIDATION_MS, key,
                                 aStartOfJavaScriptValidation, now);
}

// The specification for ORB is currently being written:
// https://whatpr.org/fetch/1442.html#orb-algorithm
// The `opaque-response-safelist check` is implemented in:
// * `HttpBaseChannel::OpaqueResponseSafelistCheckBeforeSniff`
// * `nsHttpChannel::DisableIsOpaqueResponseAllowedAfterSniffCheck`
// * `HttpBaseChannel::OpaqueResponseSafelistCheckAfterSniff`
// * `OpaqueResponseBlocker::ValidateJavaScript`
nsresult OpaqueResponseBlocker::ValidateJavaScript(HttpBaseChannel* aChannel,
                                                   nsIURI* aURI,
                                                   nsILoadInfo* aLoadInfo) {
  MOZ_DIAGNOSTIC_ASSERT(aChannel);
  MOZ_ASSERT(aURI && aLoadInfo);

  if (!StaticPrefs::browser_opaqueResponseBlocking_javascriptValidator()) {
    LOGORB("Allowed: JS Validator is disabled");
    AllowResponse();
    return NS_OK;
  }

  int64_t contentLength;
  nsresult rv = aChannel->GetContentLength(&contentLength);
  if (NS_FAILED(rv)) {
    LOGORB("Blocked: No Content Length");
    BlockResponse(aChannel, rv);
    return rv;
  }

  Telemetry::ScalarAdd(
      Telemetry::ScalarID::OPAQUE_RESPONSE_BLOCKING_JAVASCRIPT_VALIDATION_COUNT,
      1);

  LOGORB("Send %s to the validator", aURI->GetSpecOrDefault().get());
  // https://whatpr.org/fetch/1442.html#orb-algorithm, step 15
  mJSValidator = dom::JSValidatorParent::Create();
  mJSValidator->IsOpaqueResponseAllowed(
      [self = RefPtr{this}, channel = nsCOMPtr{aChannel}, uri = nsCOMPtr{aURI},
       loadInfo = nsCOMPtr{aLoadInfo}, startOfValidation = TimeStamp::Now()](
          Maybe<ipc::Shmem> aSharedData, ValidatorResult aResult) {
        MOZ_LOG(gORBLog, LogLevel::Debug,
                ("JSValidator resolved for %s with %s",
                 uri->GetSpecOrDefault().get(),
                 aSharedData.isSome() ? "true" : "false"));
        bool allowed = aResult == ValidatorResult::JavaScript;
        if (allowed) {
          self->AllowResponse();
        } else {
          self->BlockResponse(channel, NS_ERROR_FAILURE);
          LogORBError(loadInfo, uri);
        }
        self->ResolveAndProcessData(channel, allowed, aSharedData);
        if (aSharedData.isSome()) {
          self->mJSValidator->DeallocShmem(aSharedData.ref());
        }

        RecordTelemetry(startOfValidation, self->mStartOfJavaScriptValidation,
                        aResult);

        Unused << dom::PJSValidatorParent::Send__delete__(self->mJSValidator);
        self->mJSValidator = nullptr;
      });

  return NS_OK;
}

bool OpaqueResponseBlocker::IsSniffing() const {
  return mState == State::Sniffing;
}

void OpaqueResponseBlocker::AllowResponse() {
  LOGORB("Sniffer is done, allow response, this=%p", this);
  MOZ_ASSERT(mState == State::Sniffing);
  mState = State::Allowed;
}

void OpaqueResponseBlocker::BlockResponse(HttpBaseChannel* aChannel,
                                          nsresult aReason) {
  LOGORB("Sniffer is done, block response, this=%p", this);
  MOZ_ASSERT(mState == State::Sniffing);
  mState = State::Blocked;
  mStatus = aReason;
  aChannel->SetChannelBlockedByOpaqueResponse();
  aChannel->CancelWithReason(mStatus,
                             "OpaqueResponseBlocker::BlockResponse"_ns);
}

void OpaqueResponseBlocker::ResolveAndProcessData(
    HttpBaseChannel* aChannel, bool aAllowed, Maybe<ipc::Shmem>& aSharedData) {
  nsresult rv = OnStartRequest(aChannel);

  if (!aAllowed || NS_FAILED(rv)) {
    MOZ_ASSERT_IF(!aAllowed, mState == State::Blocked);
    MaybeRunOnStopRequest(aChannel);
    return;
  }

  MOZ_ASSERT(mState == State::Allowed);

  if (aSharedData.isNothing()) {
    MaybeRunOnStopRequest(aChannel);
    return;
  }

  const ipc::Shmem& mem = aSharedData.ref();
  nsCOMPtr<nsIInputStream> input;
  rv = NS_NewByteInputStream(getter_AddRefs(input),
                             Span(mem.get<char>(), mem.Size<char>()),
                             NS_ASSIGNMENT_DEPEND);

  if (NS_WARN_IF(NS_FAILED(rv))) {
    BlockResponse(aChannel, rv);
    MaybeRunOnStopRequest(aChannel);
    return;
  }

  // When this line reaches, the state is either State::Allowed or
  // State::Blocked. The OnDataAvailable call will either call
  // the next listener or reject the request.
  OnDataAvailable(aChannel, input, 0, mem.Size<char>());

  MaybeRunOnStopRequest(aChannel);
}

void OpaqueResponseBlocker::MaybeRunOnStopRequest(HttpBaseChannel* aChannel) {
  MOZ_ASSERT(mState != State::Sniffing);
  if (mPendingOnStopRequestStatus.isSome()) {
    OnStopRequest(aChannel, mPendingOnStopRequestStatus.value());
  }
}

NS_IMPL_ISUPPORTS(OpaqueResponseBlocker, nsIStreamListener, nsIRequestObserver)

}  // namespace mozilla::net
