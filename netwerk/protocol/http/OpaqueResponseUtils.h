/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set sw=2 ts=8 et tw=80 : */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_net_OpaqueResponseUtils_h
#define mozilla_net_OpaqueResponseUtils_h

#include "ipc/EnumSerializer.h"
#include "mozilla/TimeStamp.h"
#include "nsIContentPolicy.h"
#include "nsIStreamListener.h"
#include "nsUnknownDecoder.h"
#include "nsMimeTypes.h"
#include "nsIHttpChannel.h"

#include "mozilla/Variant.h"
#include "mozilla/Logging.h"

#include "nsCOMPtr.h"
#include "nsString.h"
#include "nsTArray.h"

class nsIContentSniffer;
static mozilla::LazyLogModule gORBLog("ORB");

namespace mozilla::dom {
class JSValidatorParent;
}

namespace mozilla::ipc {
class Shmem;
}

namespace mozilla::net {

class HttpBaseChannel;
class nsHttpResponseHead;

enum class OpaqueResponseBlockedReason : uint32_t {
  ALLOWED_SAFE_LISTED,
  BLOCKED_BLOCKLISTED_NEVER_SNIFFED,
  BLOCKED_206_AND_BLOCKLISTED,
  BLOCKED_NOSNIFF_AND_EITHER_BLOCKLISTED_OR_TEXTPLAIN,
  BLOCKED_SHOULD_SNIFF
};

OpaqueResponseBlockedReason GetOpaqueResponseBlockedReason(
    const nsACString& aContentType, uint16_t aStatus, bool aNoSniff);

OpaqueResponseBlockedReason GetOpaqueResponseBlockedReason(
    const nsHttpResponseHead& aResponseHead);

// Returns a tuple of (rangeStart, rangeEnd, rangeTotal) from the input range
// header string if succeed.
Result<std::tuple<int64_t, int64_t, int64_t>, nsresult>
ParseContentRangeHeaderString(const nsAutoCString& aRangeStr);

bool IsFirstPartialResponse(nsHttpResponseHead& aResponseHead);

void LogORBError(nsILoadInfo* aLoadInfo, nsIURI* aURI);

class OpaqueResponseBlocker final : public nsIStreamListener {
  enum class State { Sniffing, Allowed, Blocked };

 public:
  NS_DECL_THREADSAFE_ISUPPORTS
  NS_DECL_NSIREQUESTOBSERVER
  NS_DECL_NSISTREAMLISTENER;

  OpaqueResponseBlocker(nsIStreamListener* aNext, HttpBaseChannel* aChannel,
                        const nsCString& aContentType, bool aNoSniff);

  bool IsSniffing() const;
  void AllowResponse();
  void BlockResponse(HttpBaseChannel* aChannel, nsresult aReason);

  nsresult EnsureOpaqueResponseIsAllowedAfterSniff(nsIRequest* aRequest);

  // The four possible results for validation. `JavaScript` and `JSON` are
  // self-explanatory. `JavaScript` is the only successful result, in the sense
  // that it will allow the opaque response, whereas `JSON` will block. `Other`
  // is the case where validation fails, because the response is neither
  // `JavaScript` nor `JSON`, but the framework itself works as intended.
  // `Failure` implies that something has gone wrong, such as allocation, etc.
  enum class ValidatorResult : uint32_t { JavaScript, JSON, Other, Failure };

 private:
  virtual ~OpaqueResponseBlocker() = default;

  nsresult ValidateJavaScript(HttpBaseChannel* aChannel, nsIURI* aURI,
                              nsILoadInfo* aLoadInfo);

  void ResolveAndProcessData(HttpBaseChannel* aChannel, bool aAllowed,
                             Maybe<ipc::Shmem>& aSharedData);

  void MaybeRunOnStopRequest(HttpBaseChannel* aChannel);

  nsCOMPtr<nsIStreamListener> mNext;

  const nsCString mContentType;
  const bool mNoSniff;

  State mState = State::Sniffing;
  nsresult mStatus = NS_OK;

  TimeStamp mStartOfJavaScriptValidation;

  RefPtr<dom::JSValidatorParent> mJSValidator;

  Maybe<nsresult> mPendingOnStopRequestStatus{Nothing()};
};

class nsCompressedAudioVideoImageDetector : public nsUnknownDecoder {
  const std::function<void(void*, const uint8_t*, uint32_t)> mCallback;

 public:
  nsCompressedAudioVideoImageDetector(
      nsIStreamListener* aListener,
      std::function<void(void*, const uint8_t*, uint32_t)>&& aCallback)
      : nsUnknownDecoder(aListener), mCallback(aCallback) {}

 protected:
  virtual void DetermineContentType(nsIRequest* aRequest) override {
    nsCOMPtr<nsIHttpChannel> httpChannel = do_QueryInterface(aRequest);
    if (!httpChannel) {
      return;
    }

    const char* testData = mBuffer;
    uint32_t testDataLen = mBufferLen;
    // Check if data are compressed.
    nsAutoCString decodedData;

    // ConvertEncodedData is always called only on a single thread for each
    // instance of an object.
    nsresult rv = ConvertEncodedData(aRequest, mBuffer, mBufferLen);
    if (NS_SUCCEEDED(rv)) {
      MutexAutoLock lock(mMutex);
      decodedData = mDecodedData;
    }
    if (!decodedData.IsEmpty()) {
      testData = decodedData.get();
      testDataLen = std::min<uint32_t>(decodedData.Length(), 512u);
    }

    mCallback(httpChannel, (const uint8_t*)testData, testDataLen);

    nsAutoCString contentType;
    rv = httpChannel->GetContentType(contentType);

    MutexAutoLock lock(mMutex);
    if (!contentType.IsEmpty()) {
      mContentType = contentType;
    } else {
      mContentType = UNKNOWN_CONTENT_TYPE;
    }
  }
};
}  // namespace mozilla::net

namespace IPC {
template <>
struct ParamTraits<mozilla::net::OpaqueResponseBlocker::ValidatorResult>
    : public ContiguousEnumSerializerInclusive<
          mozilla::net::OpaqueResponseBlocker::ValidatorResult,
          mozilla::net::OpaqueResponseBlocker::ValidatorResult::JavaScript,
          mozilla::net::OpaqueResponseBlocker::ValidatorResult::Failure> {};
}  // namespace IPC

#endif  // mozilla_net_OpaqueResponseUtils_h
