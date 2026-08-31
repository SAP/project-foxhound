/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "backend.h"

#include "mozilla/Logging.h"
#include "mozilla/Span.h"
#include "nsCOMPtr.h"
#include "nsComponentManagerUtils.h"
#include "nsContentUtils.h"
#include "nsIChannel.h"
#include "nsIHttpChannel.h"
#include "nsIHttpChannelInternal.h"
#include "nsIHttpHeaderVisitor.h"
#include "nsIInputStream.h"
#include "nsIStreamListener.h"
#include "nsITimer.h"
#include "nsIUploadChannel2.h"
#include "nsIURI.h"
#include "nsNetUtil.h"
#include "nsPrintfCString.h"
#include "nsStringStream.h"
#include "nsThreadUtils.h"
#include "nsTArray.h"

#include <cinttypes>
#include <utility>

using namespace mozilla;

// Logger for viaduct-necko backend
static LazyLogModule gViaductLogger("viaduct");

/**
 * Manages viaduct Request/Result pointers
 *
 * This class ensures that we properly manage the `ViaductRequest` and
 * `ViaductResult` pointers, avoiding use-after-free bugs. It ensures that
 * either `viaduct_necko_result_complete` or
 * `viaduct_necko_result_complete_error` will be called exactly once and the
 * pointers won't be used after that.
 *
 * This class is designed to be created outside of NS_DispatchToMainThread and
 * moved into the closure. This way, even if the closure never runs, the
 * destructor will still be called and we'll complete with an error.
 */
class ViaductRequestGuard {
 private:
  const ViaductRequest* mRequest;
  ViaductResult* mResult;

 public:
  // Constructor
  ViaductRequestGuard(const ViaductRequest* aRequest, ViaductResult* aResult)
      : mRequest(aRequest), mResult(aResult) {
    MOZ_LOG(gViaductLogger, LogLevel::Debug,
            ("ViaductRequestGuard: Created with request=%p, result=%p",
             mRequest, mResult));
  }

  // Move Constructor
  // Transfers ownership of the pointers from other to this.
  ViaductRequestGuard(ViaductRequestGuard&& other) noexcept
      : mRequest(std::exchange(other.mRequest, nullptr)),
        mResult(std::exchange(other.mResult, nullptr)) {
    MOZ_LOG(gViaductLogger, LogLevel::Debug,
            ("ViaductRequestGuard: Move constructed, request=%p, result=%p",
             mRequest, mResult));
  }

  // Move assignment operator
  ViaductRequestGuard& operator=(ViaductRequestGuard&& other) noexcept {
    if (this != &other) {
      // If we already own pointers, complete with error before replacing
      if (mResult) {
        MOZ_LOG(gViaductLogger, LogLevel::Warning,
                ("ViaductRequestGuard: Move assignment replacing existing "
                 "pointers, completing with error"));
        viaduct_necko_result_complete_error(
            mResult, static_cast<uint32_t>(NS_ERROR_ABORT),
            "Request replaced by move assignment");
      }
      mRequest = std::exchange(other.mRequest, nullptr);
      mResult = std::exchange(other.mResult, nullptr);
    }
    return *this;
  }

  // Disable copy constructor and assignment
  // We prevent copying since we only want to complete the result once.
  ViaductRequestGuard(const ViaductRequestGuard& other) = delete;
  ViaductRequestGuard& operator=(const ViaductRequestGuard& other) = delete;

  ~ViaductRequestGuard() {
    // If mResult is non-null, the request was destroyed before completing.
    // This can happen if the closure never runs (e.g., shutdown).
    if (mResult) {
      MOZ_LOG(gViaductLogger, LogLevel::Warning,
              ("ViaductRequestGuard: Destructor called with non-null result, "
               "completing with error"));
      viaduct_necko_result_complete_error(
          mResult, static_cast<uint32_t>(NS_ERROR_ABORT),
          "Request destroyed without completion");
    }
  }

  // Get the request pointer (for reading request data)
  // Returns nullptr if already consumed.
  const ViaductRequest* Request() const {
    MOZ_ASSERT(mRequest,
               "ViaductRequestGuard::Request called after completion");
    return mRequest;
  }

  // Get the result pointer (for building up the response)
  // Returns nullptr if already consumed.
  ViaductResult* Result() const {
    MOZ_ASSERT(mResult, "ViaductRequestGuard::Result called after completion");
    return mResult;
  }

  // Check if the guard still owns valid pointers
  bool IsValid() const { return mResult != nullptr; }

  // Complete the result successfully and release ownership.
  // After this call, the guard no longer owns the pointers.
  void Complete() {
    MOZ_ASSERT(mResult, "ViaductRequestGuard::Complete called twice");
    MOZ_LOG(gViaductLogger, LogLevel::Debug,
            ("ViaductRequestGuard: Completing successfully"));
    viaduct_necko_result_complete(mResult);
    mResult = nullptr;
    mRequest = nullptr;
  }

  // Complete the result with an error and release ownership.
  // After this call, the guard no longer owns the pointers.
  void CompleteWithError(nsresult aError, const char* aMessage) {
    MOZ_ASSERT(mResult, "ViaductRequestGuard::CompleteWithError called twice");
    MOZ_LOG(gViaductLogger, LogLevel::Error,
            ("ViaductRequestGuard: Completing with error: %s (0x%08x)",
             aMessage, static_cast<uint32_t>(aError)));
    viaduct_necko_result_complete_error(mResult, static_cast<uint32_t>(aError),
                                        aMessage);
    mResult = nullptr;
    mRequest = nullptr;
  }
};

// Listener that collects the complete HTTP response (headers and body)
class ViaductResponseListener final : public nsIHttpHeaderVisitor,
                                      public nsIStreamListener,
                                      public nsITimerCallback,
                                      public nsINamed {
 public:
  NS_DECL_THREADSAFE_ISUPPORTS
  NS_DECL_NSIHTTPHEADERVISITOR
  NS_DECL_NSIREQUESTOBSERVER
  NS_DECL_NSISTREAMLISTENER
  NS_DECL_NSITIMERCALLBACK
  NS_DECL_NSINAMED

  // Use Create() instead of calling the constructor directly.
  // Timer creation must happen after a RefPtr holds a reference.
  // Returns nullptr if timer creation fails (when aTimeoutSecs > 0).
  static already_AddRefed<ViaductResponseListener> Create(
      ViaductRequestGuard&& aGuard, uint32_t aTimeoutSecs,
      nsresult* aOutTimerRv = nullptr) {
    RefPtr<ViaductResponseListener> listener =
        new ViaductResponseListener(std::move(aGuard));
    nsresult rv = listener->StartTimeoutTimer(aTimeoutSecs);
    if (aOutTimerRv) {
      *aOutTimerRv = rv;
    }
    if (NS_FAILED(rv)) {
      return nullptr;
    }
    return listener.forget();
  }

  void SetChannel(nsIChannel* aChannel) { mChannel = aChannel; }

 private:
  explicit ViaductResponseListener(ViaductRequestGuard&& aGuard)
      : mGuard(std::move(aGuard)), mChannel(nullptr) {
    MOZ_LOG(gViaductLogger, LogLevel::Debug,
            ("TRACE: ViaductResponseListener constructor called, guard valid: "
             "%s",
             mGuard.IsValid() ? "true" : "false"));
  }

  nsresult StartTimeoutTimer(uint32_t aTimeoutSecs) {
    if (aTimeoutSecs == 0) {
      return NS_OK;
    }
    MOZ_LOG(gViaductLogger, LogLevel::Debug,
            ("Setting timeout timer for %u seconds", aTimeoutSecs));
    nsresult rv =
        NS_NewTimerWithCallback(getter_AddRefs(mTimeoutTimer), this,
                                aTimeoutSecs * 1000, nsITimer::TYPE_ONE_SHOT);
    if (NS_FAILED(rv)) {
      MOZ_LOG(gViaductLogger, LogLevel::Error,
              ("Failed to create timeout timer: 0x%08x",
               static_cast<uint32_t>(rv)));
    }
    return rv;
  }

  ~ViaductResponseListener() {
    MOZ_LOG(gViaductLogger, LogLevel::Debug,
            ("TRACE: ViaductResponseListener destructor called"));

    ClearTimer();

    // The guard's destructor will handle completion if needed
  }

  void ClearTimer() {
    if (mTimeoutTimer) {
      mTimeoutTimer->Cancel();
      mTimeoutTimer = nullptr;
    }
  }

  // Error handling: logs error and completes the result with error via the
  // guard.
  void HandleError(nsresult aError, const char* aMessage);

  // Wrapper methods that use the guard to safely access the result
  void SetStatusCode(uint16_t aStatusCode);
  void SetUrl(const char* aUrl, size_t aLength);
  void AddHeader(const char* aKey, size_t aKeyLength, const char* aValue,
                 size_t aValueLength);
  void ExtendBody(const uint8_t* aData, size_t aLength);
  void Complete();

  ViaductRequestGuard mGuard;
  nsCOMPtr<nsITimer> mTimeoutTimer;
  nsCOMPtr<nsIChannel> mChannel;
};

NS_IMPL_ISUPPORTS(ViaductResponseListener, nsIHttpHeaderVisitor,
                  nsIStreamListener, nsIRequestObserver, nsITimerCallback,
                  nsINamed)

void ViaductResponseListener::HandleError(nsresult aError,
                                          const char* aMessage) {
  MOZ_LOG(gViaductLogger, LogLevel::Debug,
          ("TRACE: HandleError called with message: %s (0x%08x)", aMessage,
           static_cast<uint32_t>(aError)));

  if (mGuard.IsValid()) {
    MOZ_LOG(gViaductLogger, LogLevel::Debug,
            ("TRACE: Calling CompleteWithError via guard"));
    mGuard.CompleteWithError(aError, aMessage);
  } else {
    MOZ_LOG(gViaductLogger, LogLevel::Error,
            ("HandleError called but guard is invalid"));
  }
}

void ViaductResponseListener::SetStatusCode(uint16_t aStatusCode) {
  MOZ_LOG(gViaductLogger, LogLevel::Debug,
          ("TRACE: SetStatusCode called with code: %u", aStatusCode));
  if (!mGuard.IsValid()) {
    MOZ_LOG(gViaductLogger, LogLevel::Error,
            ("SetStatusCode called but guard is invalid"));
    return;
  }
  viaduct_necko_result_set_status_code(mGuard.Result(), aStatusCode);
  MOZ_LOG(gViaductLogger, LogLevel::Debug,
          ("Set status code: %u", aStatusCode));
}

void ViaductResponseListener::SetUrl(const char* aUrl, size_t aLength) {
  MOZ_LOG(gViaductLogger, LogLevel::Debug,
          ("TRACE: SetUrl called with URL (length %zu)", aLength));
  if (!mGuard.IsValid()) {
    MOZ_LOG(gViaductLogger, LogLevel::Error,
            ("SetUrl called but guard is invalid"));
    return;
  }
  viaduct_necko_result_set_url(mGuard.Result(), aUrl, aLength);
  MOZ_LOG(gViaductLogger, LogLevel::Debug, ("Set URL"));
}

void ViaductResponseListener::AddHeader(const char* aKey, size_t aKeyLength,
                                        const char* aValue,
                                        size_t aValueLength) {
  MOZ_LOG(gViaductLogger, LogLevel::Debug,
          ("TRACE: AddHeader called - key length: %zu, value length: %zu",
           aKeyLength, aValueLength));
  if (!mGuard.IsValid()) {
    MOZ_LOG(gViaductLogger, LogLevel::Error,
            ("AddHeader called but guard is invalid"));
    return;
  }
  viaduct_necko_result_add_header(mGuard.Result(), aKey, aKeyLength, aValue,
                                  aValueLength);
  MOZ_LOG(gViaductLogger, LogLevel::Debug, ("Added header"));
}

void ViaductResponseListener::ExtendBody(const uint8_t* aData, size_t aLength) {
  MOZ_LOG(gViaductLogger, LogLevel::Debug,
          ("TRACE: ExtendBody called with %zu bytes", aLength));
  if (!mGuard.IsValid()) {
    MOZ_LOG(gViaductLogger, LogLevel::Error,
            ("ExtendBody called but guard is invalid"));
    return;
  }
  viaduct_necko_result_extend_body(mGuard.Result(), aData, aLength);
  MOZ_LOG(gViaductLogger, LogLevel::Debug,
          ("Extended body with %zu bytes", aLength));
}

void ViaductResponseListener::Complete() {
  MOZ_LOG(gViaductLogger, LogLevel::Debug,
          ("TRACE: Complete called - marking request as successful"));
  if (!mGuard.IsValid()) {
    MOZ_LOG(gViaductLogger, LogLevel::Error,
            ("Complete called but guard is invalid"));
    return;
  }
  MOZ_LOG(gViaductLogger, LogLevel::Debug,
          ("TRACE: Calling Complete via guard"));
  mGuard.Complete();
}

NS_IMETHODIMP
ViaductResponseListener::VisitHeader(const nsACString& aHeader,
                                     const nsACString& aValue) {
  MOZ_LOG(gViaductLogger, LogLevel::Debug,
          ("TRACE: VisitHeader called for header: %s",
           PromiseFlatCString(aHeader).get()));
  AddHeader(aHeader.BeginReading(), aHeader.Length(), aValue.BeginReading(),
            aValue.Length());
  return NS_OK;
}

NS_IMETHODIMP
ViaductResponseListener::OnStartRequest(nsIRequest* aRequest) {
  MOZ_LOG(gViaductLogger, LogLevel::Debug,
          ("TRACE: ========== OnStartRequest called =========="));

  nsCOMPtr<nsIHttpChannel> httpChannel = do_QueryInterface(aRequest);
  if (!httpChannel) {
    HandleError(NS_ERROR_FAILURE, "Request is not an HTTP channel");
    return NS_ERROR_FAILURE;
  }

  // Get status code from HTTP channel
  uint32_t responseStatus;
  nsresult rv = httpChannel->GetResponseStatus(&responseStatus);
  if (NS_FAILED(rv)) {
    HandleError(rv, "Failed to get response status");
    return rv;
  }
  SetStatusCode(static_cast<uint16_t>(responseStatus));

  // Get final URL
  nsCOMPtr<nsIURI> uri;
  rv = httpChannel->GetURI(getter_AddRefs(uri));
  if (NS_FAILED(rv)) {
    HandleError(rv, "Failed to get URI");
    return rv;
  }

  if (!uri) {
    HandleError(NS_ERROR_FAILURE, "HTTP channel has null URI");
    return NS_ERROR_FAILURE;
  }

  nsAutoCString spec;
  rv = uri->GetSpec(spec);
  if (NS_FAILED(rv)) {
    HandleError(rv, "Failed to get URI spec");
    return rv;
  }
  SetUrl(spec.get(), spec.Length());

  // Collect response headers - using 'this' since we implement
  // nsIHttpHeaderVisitor
  MOZ_LOG(gViaductLogger, LogLevel::Debug,
          ("TRACE: About to visit response headers"));
  rv = httpChannel->VisitResponseHeaders(this);
  if (NS_FAILED(rv)) {
    HandleError(rv, "Failed to visit response headers");
    return rv;
  }

  return NS_OK;
}

NS_IMETHODIMP
ViaductResponseListener::OnDataAvailable(nsIRequest* aRequest,
                                         nsIInputStream* aInputStream,
                                         uint64_t aOffset, uint32_t aCount) {
  MOZ_LOG(gViaductLogger, LogLevel::Debug,
          ("OnDataAvailable called with %u bytes at offset %" PRIu64, aCount,
           aOffset));

  // Read the data from the input stream
  nsTArray<uint8_t> buffer;
  buffer.SetLength(aCount);

  uint32_t bytesRead;
  nsresult rv = aInputStream->Read(reinterpret_cast<char*>(buffer.Elements()),
                                   aCount, &bytesRead);
  if (NS_FAILED(rv)) {
    HandleError(rv, "Failed to read from input stream");
    return rv;
  }

  if (bytesRead > 0) {
    ExtendBody(buffer.Elements(), bytesRead);
  } else {
    MOZ_LOG(gViaductLogger, LogLevel::Warning,
            ("Read 0 bytes from input stream"));
  }

  return NS_OK;
}

NS_IMETHODIMP
ViaductResponseListener::OnStopRequest(nsIRequest* aRequest, nsresult aStatus) {
  MOZ_LOG(gViaductLogger, LogLevel::Debug,
          ("OnStopRequest called with status: 0x%08x",
           static_cast<uint32_t>(aStatus)));

  // Cancel timer since request is complete
  ClearTimer();

  if (NS_SUCCEEDED(aStatus)) {
    Complete();
  } else {
    HandleError(aStatus, "Request failed");
  }

  return NS_OK;
}

///////////////////////////////////////////////////////////////////////////////
// nsITimerCallback implementation

NS_IMETHODIMP
ViaductResponseListener::Notify(nsITimer* aTimer) {
  MOZ_LOG(gViaductLogger, LogLevel::Warning,
          ("Request timeout fired - cancelling request"));

  ClearTimer();

  // Cancel the channel, which will trigger OnStopRequest with an error
  if (mChannel) {
    mChannel->Cancel(NS_ERROR_NET_TIMEOUT_EXTERNAL);
    mChannel = nullptr;
  }

  return NS_OK;
}

///////////////////////////////////////////////////////////////////////////////
// nsINamed implementation

NS_IMETHODIMP
ViaductResponseListener::GetName(nsACString& aName) {
  aName.AssignLiteral("ViaductResponseListener");
  return NS_OK;
}

// Convert ViaductMethod to HTTP method string
static const char* GetMethodString(ViaductMethod method) {
  switch (method) {
    case VIADUCT_METHOD_GET:
      return "GET";
    case VIADUCT_METHOD_HEAD:
      return "HEAD";
    case VIADUCT_METHOD_POST:
      return "POST";
    case VIADUCT_METHOD_PUT:
      return "PUT";
    case VIADUCT_METHOD_DELETE:
      return "DELETE";
    case VIADUCT_METHOD_CONNECT:
      return "CONNECT";
    case VIADUCT_METHOD_OPTIONS:
      return "OPTIONS";
    case VIADUCT_METHOD_TRACE:
      return "TRACE";
    case VIADUCT_METHOD_PATCH:
      return "PATCH";
    default:
      MOZ_LOG(gViaductLogger, LogLevel::Warning,
              ("Unknown ViaductMethod: %d, defaulting to GET", method));
      return "GET";
  }
}

extern "C" {

void viaduct_necko_backend_init() {
  MOZ_LOG(gViaductLogger, LogLevel::Info,
          ("Viaduct Necko backend initialized"));
}

void viaduct_necko_backend_send_request(const ViaductRequest* request,
                                        ViaductResult* result) {
  MOZ_LOG(gViaductLogger, LogLevel::Debug, ("send_request called"));

  MOZ_ASSERT(request, "Request pointer should not be null");
  MOZ_ASSERT(result, "Result pointer should not be null");

  // Create a guard to manage the request/result pointer lifetime.
  // This ensures that either viaduct_necko_result_complete or
  // viaduct_necko_result_complete_error is called exactly once,
  // even if the closure never runs (e.g., during shutdown).
  ViaductRequestGuard guard(request, result);

  // This function is called from Rust on a background thread.
  // We need to dispatch to the main thread to use Necko.
  NS_DispatchToMainThread(NS_NewRunnableFunction(
      "ViaductNeckoRequest", [guard = std::move(guard)]() mutable {
        MOZ_LOG(gViaductLogger, LogLevel::Debug,
                ("Executing request on main thread"));

        MOZ_ASSERT(guard.Request() && guard.Result(),
                   "Guard should have valid pointers");

        nsresult rv;

        // Parse the URL
        nsCOMPtr<nsIURI> uri;
        nsAutoCString urlSpec(guard.Request()->url);
        MOZ_LOG(gViaductLogger, LogLevel::Debug,
                ("Parsing URL: %s", urlSpec.get()));

        rv = NS_NewURI(getter_AddRefs(uri), urlSpec);
        if (NS_FAILED(rv)) {
          guard.CompleteWithError(rv, "Failed to parse URL");
          return;
        }

        // Create the channel
        nsSecurityFlags secFlags =
            nsILoadInfo::SEC_ALLOW_CROSS_ORIGIN_SEC_CONTEXT_IS_NULL |
            nsILoadInfo::SEC_COOKIES_OMIT;

        nsCOMPtr<nsIChannel> channel;
        rv = NS_NewChannel(getter_AddRefs(channel), uri,
                           nsContentUtils::GetSystemPrincipal(), secFlags,
                           nsIContentPolicy::TYPE_OTHER);

        if (NS_FAILED(rv)) {
          guard.CompleteWithError(rv, "Failed to create channel");
          return;
        }

        if (!channel) {
          guard.CompleteWithError(NS_ERROR_FAILURE,
                                  "NS_NewChannel returned null channel");
          return;
        }

        // Get the HTTP channel interface
        nsCOMPtr<nsIHttpChannel> httpChannel = do_QueryInterface(channel);
        if (!httpChannel) {
          guard.CompleteWithError(NS_ERROR_FAILURE,
                                  "Channel is not an HTTP channel");
          return;
        }

        // Set HTTP method
        const char* methodStr = GetMethodString(guard.Request()->method);
        MOZ_LOG(gViaductLogger, LogLevel::Debug,
                ("Setting HTTP method: %s", methodStr));
        rv = httpChannel->SetRequestMethod(nsDependentCString(methodStr));
        if (NS_FAILED(rv)) {
          guard.CompleteWithError(rv, "Failed to set request method");
          return;
        }

        // Set request headers
        MOZ_LOG(gViaductLogger, LogLevel::Debug,
                ("Setting %zu request headers", guard.Request()->header_count));
        for (size_t i = 0; i < guard.Request()->header_count; i++) {
          nsAutoCString key(guard.Request()->headers[i].key);
          nsAutoCString value(guard.Request()->headers[i].value);
          rv = httpChannel->SetRequestHeader(key, value, false);
          if (NS_FAILED(rv)) {
            guard.CompleteWithError(rv, "Failed to set request header");
            return;
          }
        }

        // Set redirect limit
        if (guard.Request()->redirect_limit == 0) {
          // Disable redirects entirely
          MOZ_LOG(gViaductLogger, LogLevel::Debug, ("Disabling redirects"));
          nsCOMPtr<nsIHttpChannelInternal> httpInternal =
              do_QueryInterface(httpChannel);
          if (!httpInternal) {
            guard.CompleteWithError(
                NS_ERROR_FAILURE,
                "Failed to get nsIHttpChannelInternal interface");
            return;
          }
          rv = httpInternal->SetRedirectMode(
              nsIHttpChannelInternal::REDIRECT_MODE_ERROR);
          if (NS_FAILED(rv)) {
            guard.CompleteWithError(rv, "Failed to set redirect mode");
            return;
          }
        } else {
          // Set a specific redirect limit
          MOZ_LOG(
              gViaductLogger, LogLevel::Debug,
              ("Setting redirect limit: %u", guard.Request()->redirect_limit));
          rv =
              httpChannel->SetRedirectionLimit(guard.Request()->redirect_limit);
          if (NS_FAILED(rv)) {
            guard.CompleteWithError(rv, "Failed to set redirection limit");
            return;
          }
        }

        // Set request body if present
        if (guard.Request()->body != nullptr && guard.Request()->body_len > 0) {
          MOZ_LOG(
              gViaductLogger, LogLevel::Debug,
              ("Setting request body (%zu bytes)", guard.Request()->body_len));
          nsCOMPtr<nsIUploadChannel2> uploadChannel =
              do_QueryInterface(httpChannel);
          if (!uploadChannel) {
            guard.CompleteWithError(
                NS_ERROR_FAILURE, "Failed to get nsIUploadChannel2 interface");
            return;
          }

          nsCOMPtr<nsIInputStream> bodyStream;
          rv = NS_NewByteInputStream(
              getter_AddRefs(bodyStream),
              Span(reinterpret_cast<const char*>(guard.Request()->body),
                   guard.Request()->body_len),
              NS_ASSIGNMENT_COPY);
          if (NS_FAILED(rv)) {
            guard.CompleteWithError(rv, "Failed to create body stream");
            return;
          }

          rv = uploadChannel->ExplicitSetUploadStream(
              bodyStream, VoidCString(), guard.Request()->body_len,
              nsDependentCString(methodStr), false);
          if (NS_FAILED(rv)) {
            guard.CompleteWithError(rv, "Failed to set upload stream");
            return;
          }
        }

        // Get timeout before moving the guard
        uint32_t timeout = guard.Request()->timeout;

        // Create listener using factory method. This ensures the timer is
        // created after a RefPtr holds a reference.
        nsresult timerRv;
        RefPtr<ViaductResponseListener> listener =
            ViaductResponseListener::Create(std::move(guard), timeout,
                                            &timerRv);
        if (!listener) {
          MOZ_LOG(gViaductLogger, LogLevel::Error,
                  ("Failed to create listener: timer creation failed 0x%08x",
                   static_cast<uint32_t>(timerRv)));
          return;
        }

        // Store the channel in the listener so it can cancel it on timeout.
        listener->SetChannel(channel);

        MOZ_LOG(gViaductLogger, LogLevel::Debug, ("Opening HTTP channel"));
        rv = httpChannel->AsyncOpen(listener);

        if (NS_FAILED(rv)) {
          MOZ_LOG(gViaductLogger, LogLevel::Error,
                  ("AsyncOpen failed: 0x%08x. Guard was moved to listener, "
                   "destructor will handle cleanup and complete with error.",
                   static_cast<uint32_t>(rv)));
          return;
        }

        MOZ_LOG(gViaductLogger, LogLevel::Debug,
                ("Request initiated successfully"));
        // The request is now in progress. The listener will handle
        // completion.
      }));
}

}  // extern "C"
