/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "Request.h"

#include "js/Value.h"
#include "nsIURI.h"
#include "nsNetUtil.h"
#include "nsPIDOMWindow.h"
#include "nsTaintingUtils.h"

#include "mozilla/ErrorResult.h"
#include "mozilla/StaticPrefs_network.h"
#include "mozilla/dom/Headers.h"
#include "mozilla/dom/Fetch.h"
#include "mozilla/dom/FetchUtil.h"
#include "mozilla/dom/Promise.h"
#include "mozilla/dom/URL.h"
#include "mozilla/dom/WorkerPrivate.h"
#include "mozilla/dom/WorkerRunnable.h"
#include "mozilla/dom/WindowContext.h"
#include "mozilla/ipc/PBackgroundSharedTypes.h"
#include "mozilla/Unused.h"

#include "mozilla/dom/ReadableStreamDefaultReader.h"

namespace mozilla::dom {

NS_IMPL_ADDREF_INHERITED(Request, FetchBody<Request>)
NS_IMPL_RELEASE_INHERITED(Request, FetchBody<Request>)

// Can't use _INHERITED macro here because FetchBody<Request> is abstract.
NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE_CLASS(Request)

NS_IMPL_CYCLE_COLLECTION_UNLINK_BEGIN_INHERITED(Request, FetchBody<Request>)
  NS_IMPL_CYCLE_COLLECTION_UNLINK(mOwner)
  NS_IMPL_CYCLE_COLLECTION_UNLINK(mHeaders)
  NS_IMPL_CYCLE_COLLECTION_UNLINK(mSignal)
  NS_IMPL_CYCLE_COLLECTION_UNLINK(mFetchStreamReader)
  NS_IMPL_CYCLE_COLLECTION_UNLINK_PRESERVED_WRAPPER
NS_IMPL_CYCLE_COLLECTION_UNLINK_END

NS_IMPL_CYCLE_COLLECTION_TRAVERSE_BEGIN_INHERITED(Request, FetchBody<Request>)
  NS_IMPL_CYCLE_COLLECTION_TRAVERSE(mOwner)
  NS_IMPL_CYCLE_COLLECTION_TRAVERSE(mHeaders)
  NS_IMPL_CYCLE_COLLECTION_TRAVERSE(mSignal)
  NS_IMPL_CYCLE_COLLECTION_TRAVERSE(mFetchStreamReader)
NS_IMPL_CYCLE_COLLECTION_TRAVERSE_END

NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(Request)
  NS_WRAPPERCACHE_INTERFACE_MAP_ENTRY
NS_INTERFACE_MAP_END_INHERITING(FetchBody<Request>)

Request::Request(nsIGlobalObject* aOwner, SafeRefPtr<InternalRequest> aRequest,
                 AbortSignal* aSignal)
    : FetchBody<Request>(aOwner), mRequest(std::move(aRequest)) {
  MOZ_ASSERT(mRequest->Headers()->Guard() == HeadersGuardEnum::Immutable ||
             mRequest->Headers()->Guard() == HeadersGuardEnum::Request ||
             mRequest->Headers()->Guard() == HeadersGuardEnum::Request_no_cors);
  if (aSignal) {
    // If we don't have a signal as argument, we will create it when required by
    // content, otherwise the Request's signal must follow what has been passed.
    JS::Rooted<JS::Value> reason(RootingCx(), aSignal->RawReason());
    mSignal = new AbortSignal(aOwner, aSignal->Aborted(), reason);
    if (!mSignal->Aborted()) {
      mSignal->Follow(aSignal);
    }
  }
}

Request::~Request() = default;

SafeRefPtr<InternalRequest> Request::GetInternalRequest() {
  return mRequest.clonePtr();
}

namespace {
already_AddRefed<nsIURI> ParseURL(nsIGlobalObject* aGlobal,
                                  const nsACString& aInput, ErrorResult& aRv) {
  nsCOMPtr<nsIURI> baseURI;
  if (NS_IsMainThread()) {
    nsCOMPtr<nsPIDOMWindowInner> inner(do_QueryInterface(aGlobal));
    Document* doc = inner ? inner->GetExtantDoc() : nullptr;
    baseURI = doc ? doc->GetBaseURI() : nullptr;
  } else {
    WorkerPrivate* worker = GetCurrentThreadWorkerPrivate();
    baseURI = worker->GetBaseURI();
  }

  nsCOMPtr<nsIURI> uri;
  if (NS_FAILED(NS_NewURI(getter_AddRefs(uri), aInput, nullptr, baseURI))) {
    aRv.ThrowTypeError<MSG_INVALID_URL>(aInput);
    return nullptr;
  }
  return uri.forget();
}

void GetRequestURL(nsIGlobalObject* aGlobal, const nsACString& aInput,
                   nsACString& aRequestURL, nsACString& aURLfragment,
                   ErrorResult& aRv) {
  nsCOMPtr<nsIURI> resolvedURI = ParseURL(aGlobal, aInput, aRv);
  if (aRv.Failed()) {
    return;
  }
  // This fails with URIs with weird protocols, even when they are valid,
  // so we ignore the failure
  nsAutoCString credentials;
  Unused << resolvedURI->GetUserPass(credentials);
  if (!credentials.IsEmpty()) {
    aRv.ThrowTypeError<MSG_URL_HAS_CREDENTIALS>(aInput);
    return;
  }

  nsCOMPtr<nsIURI> resolvedURIClone;
  aRv = NS_GetURIWithoutRef(resolvedURI, getter_AddRefs(resolvedURIClone));
  if (NS_WARN_IF(aRv.Failed())) {
    return;
  }
  aRv = resolvedURIClone->GetSpec(aRequestURL);
  if (NS_WARN_IF(aRv.Failed())) {
    return;
  }

  // Get the fragment from nsIURI.
  aRv = resolvedURI->GetRef(aURLfragment);
  if (NS_WARN_IF(aRv.Failed())) {
    return;
  }
}
}  // namespace

/*static*/
SafeRefPtr<Request> Request::Constructor(const GlobalObject& aGlobal,
                                         const RequestOrUTF8String& aInput,
                                         const RequestInit& aInit,
                                         ErrorResult& aRv) {
  nsCOMPtr<nsIGlobalObject> global = do_QueryInterface(aGlobal.GetAsSupports());
  return Constructor(global, aGlobal.Context(), aInput, aInit,
                     aGlobal.CallerType(), aRv);
}

/*static*/
SafeRefPtr<Request> Request::Constructor(
    nsIGlobalObject* aGlobal, JSContext* aCx, const RequestOrUTF8String& aInput,
    const RequestInit& aInit, CallerType aCallerType, ErrorResult& aRv) {
  bool hasCopiedBody = false;
  SafeRefPtr<InternalRequest> request;

  RefPtr<AbortSignal> signal;
  bool bodyFromInit = false;

  if (aInput.IsRequest()) {
    RefPtr<Request> inputReq = &aInput.GetAsRequest();
    nsCOMPtr<nsIInputStream> body;

    if (aInit.mBody.WasPassed() && !aInit.mBody.Value().IsNull()) {
      bodyFromInit = true;
      hasCopiedBody = true;
    } else {
      inputReq->GetBody(getter_AddRefs(body));
      if (inputReq->BodyUsed()) {
        aRv.ThrowTypeError<MSG_FETCH_BODY_CONSUMED_ERROR>();
        return nullptr;
      }

      // The body will be copied when GetRequestConstructorCopy() is executed.
      if (body) {
        hasCopiedBody = true;
      }
    }

    request = inputReq->GetInternalRequest();
    signal = inputReq->GetOrCreateSignal();
  } else {
    // aInput is UTF8String.
    // We need to get url before we create a InternalRequest.
    const nsACString& input = aInput.GetAsUTF8String();
    nsAutoCString requestURL;
    nsCString fragment;
    GetRequestURL(aGlobal, input, requestURL, fragment, aRv);
    if (aRv.Failed()) {
      return nullptr;
    }
    request = MakeSafeRefPtr<InternalRequest>(requestURL, fragment);
  }
  request = request->GetRequestConstructorCopy(aGlobal, aRv);
  if (NS_WARN_IF(aRv.Failed())) {
    return nullptr;
  }
  Maybe<RequestMode> mode;
  if (aInit.mMode.WasPassed()) {
    if (aInit.mMode.Value() == RequestMode::Navigate) {
      aRv.ThrowTypeError<MSG_INVALID_REQUEST_MODE>("navigate");
      return nullptr;
    }

    mode.emplace(aInit.mMode.Value());
  }
  Maybe<RequestCredentials> credentials;
  if (aInit.mCredentials.WasPassed()) {
    credentials.emplace(aInit.mCredentials.Value());
  }
  Maybe<RequestCache> cache;
  if (aInit.mCache.WasPassed()) {
    cache.emplace(aInit.mCache.Value());
  }
  if (aInput.IsUTF8String()) {
    if (mode.isNothing()) {
      mode.emplace(RequestMode::Cors);
    }
    if (credentials.isNothing()) {
      if (aCallerType == CallerType::System &&
          StaticPrefs::network_fetch_systemDefaultsToOmittingCredentials()) {
        credentials.emplace(RequestCredentials::Omit);
      } else {
        credentials.emplace(RequestCredentials::Same_origin);
      }
    }
    if (cache.isNothing()) {
      cache.emplace(RequestCache::Default);
    }
  }

  if (aInit.IsAnyMemberPresent() && request->Mode() == RequestMode::Navigate) {
    mode = Some(RequestMode::Same_origin);
  }

  if (aInit.IsAnyMemberPresent()) {
    request->SetReferrer(nsLiteralCString(kFETCH_CLIENT_REFERRER_STR));
    request->SetReferrerPolicy(ReferrerPolicy::_empty);
  }
  if (aInit.mReferrer.WasPassed()) {
    const nsCString& referrer = aInit.mReferrer.Value();
    if (referrer.IsEmpty()) {
      request->SetReferrer(""_ns);
    } else {
      nsCOMPtr<nsIURI> referrerURI = ParseURL(aGlobal, referrer, aRv);
      if (NS_WARN_IF(aRv.Failed())) {
        aRv.ThrowTypeError<MSG_INVALID_REFERRER_URL>(referrer);
        return nullptr;
      }

      nsAutoCString spec;
      referrerURI->GetSpec(spec);
      if (!spec.EqualsLiteral(kFETCH_CLIENT_REFERRER_STR)) {
        nsCOMPtr<nsIPrincipal> principal = aGlobal->PrincipalOrNull();
        if (principal) {
          nsresult rv =
              principal->CheckMayLoad(referrerURI,
                                      /* allowIfInheritsPrincipal */ false);
          if (NS_FAILED(rv)) {
            spec.AssignLiteral(kFETCH_CLIENT_REFERRER_STR);
          }
        }
      }

      request->SetReferrer(spec);
    }
  }

  if (aInit.mReferrerPolicy.WasPassed()) {
    request->SetReferrerPolicy(aInit.mReferrerPolicy.Value());
  }

  if (aInit.mSignal.WasPassed()) {
    signal = aInit.mSignal.Value();
  }

  // https://fetch.spec.whatwg.org/#dom-global-fetch
  // https://fetch.spec.whatwg.org/#dom-request
  // The priority of init overrides input's priority.
  if (aInit.mPriority.WasPassed()) {
    request->SetPriorityMode(aInit.mPriority.Value());
  }

  UniquePtr<mozilla::ipc::PrincipalInfo> principalInfo;
  nsILoadInfo::CrossOriginEmbedderPolicy coep =
      nsILoadInfo::EMBEDDER_POLICY_NULL;

  if (NS_IsMainThread()) {
    nsCOMPtr<nsPIDOMWindowInner> window = do_QueryInterface(aGlobal);
    if (window) {
      nsCOMPtr<Document> doc;
      doc = window->GetExtantDoc();
      if (doc) {
        request->SetEnvironmentReferrerPolicy(doc->GetReferrerPolicy());

        principalInfo.reset(new mozilla::ipc::PrincipalInfo());
        nsresult rv =
            PrincipalToPrincipalInfo(doc->NodePrincipal(), principalInfo.get());
        if (NS_WARN_IF(NS_FAILED(rv))) {
          aRv.ThrowTypeError<MSG_FETCH_BODY_CONSUMED_ERROR>();
          return nullptr;
        }
      }
      if (window->GetWindowContext()) {
        coep = window->GetWindowContext()->GetEmbedderPolicy();
      }
    }
  } else {
    WorkerPrivate* worker = GetCurrentThreadWorkerPrivate();
    if (worker) {
      worker->AssertIsOnWorkerThread();
      request->SetEnvironmentReferrerPolicy(worker->GetReferrerPolicy());
      principalInfo =
          MakeUnique<mozilla::ipc::PrincipalInfo>(worker->GetPrincipalInfo());
      coep = worker->GetEmbedderPolicy();
      // For dedicated worker, the response must respect the owner's COEP.
      if (coep == nsILoadInfo::EMBEDDER_POLICY_NULL &&
          worker->IsDedicatedWorker()) {
        coep = worker->GetOwnerEmbedderPolicy();
      }
    }
  }

  request->SetPrincipalInfo(std::move(principalInfo));
  request->SetEmbedderPolicy(coep);

  if (mode.isSome()) {
    request->SetMode(mode.value());
  }

  if (credentials.isSome()) {
    request->SetCredentialsMode(credentials.value());
  }

  if (cache.isSome()) {
    if (cache.value() == RequestCache::Only_if_cached &&
        request->Mode() != RequestMode::Same_origin) {
      aRv.ThrowTypeError<MSG_ONLY_IF_CACHED_WITHOUT_SAME_ORIGIN>(
          GetEnumString(request->Mode()));
      return nullptr;
    }
    request->SetCacheMode(cache.value());
  }

  if (aInit.mRedirect.WasPassed()) {
    request->SetRedirectMode(aInit.mRedirect.Value());
  }

  if (aInit.mIntegrity.WasPassed()) {
    request->SetIntegrity(aInit.mIntegrity.Value());
  }

  if (aInit.mKeepalive.WasPassed()) {
    request->SetKeepalive(aInit.mKeepalive.Value());
  }

  if (aInit.mMozErrors.WasPassed() && aInit.mMozErrors.Value()) {
    request->SetMozErrors();
  }

  // Request constructor step 14.
  if (aInit.mMethod.WasPassed()) {
    nsAutoCString method(aInit.mMethod.Value());

    // Step 14.1. Disallow forbidden methods, and anything that is not a HTTP
    // token, since HTTP states that Method may be any of the defined values or
    // a token (extension method).
    nsAutoCString outMethod;
    nsresult rv = FetchUtil::GetValidRequestMethod(method, outMethod);
    if (NS_FAILED(rv)) {
      aRv.ThrowTypeError<MSG_INVALID_REQUEST_METHOD>(method);
      return nullptr;
    }

    // Step 14.2
    request->SetMethod(outMethod);
  }

  RefPtr<InternalHeaders> requestHeaders = request->Headers();

  RefPtr<InternalHeaders> headers;
  if (aInit.mHeaders.WasPassed()) {
    RefPtr<Headers> h = Headers::Create(aGlobal, aInit.mHeaders.Value(), aRv);
    if (aRv.Failed()) {
      return nullptr;
    }
    headers = h->GetInternalHeaders();

    // Foxhound:
    nsTArray<InternalHeaders::Entry> headerEntries;
    headers->GetEntries(headerEntries);
    for(InternalHeaders::Entry entry : headerEntries) {
      ReportTaintSink(entry.mName, "fetch.header(key)");
      ReportTaintSink(entry.mValue, "fetch.header(value)");
    }

  } else {
    headers = new InternalHeaders(*requestHeaders);
  }

  requestHeaders->Clear();
  // From "Let r be a new Request object associated with request and a new
  // Headers object whose guard is "request"."
  requestHeaders->SetGuard(HeadersGuardEnum::Request, aRv);
  MOZ_ASSERT(!aRv.Failed());

  if (request->Mode() == RequestMode::No_cors) {
    if (!request->HasSimpleMethod()) {
      nsAutoCString method;
      request->GetMethod(method);
      aRv.ThrowTypeError<MSG_INVALID_REQUEST_METHOD>(method);
      return nullptr;
    }

    requestHeaders->SetGuard(HeadersGuardEnum::Request_no_cors, aRv);
    if (aRv.Failed()) {
      return nullptr;
    }
  }

  requestHeaders->Fill(*headers, aRv);
  if (aRv.Failed()) {
    return nullptr;
  }

  if ((aInit.mBody.WasPassed() && !aInit.mBody.Value().IsNull()) ||
      hasCopiedBody) {
    // HEAD and GET are not allowed to have a body.
    nsAutoCString method;
    request->GetMethod(method);
    // method is guaranteed to be uppercase due to step 14.2 above.
    if (method.EqualsLiteral("HEAD") || method.EqualsLiteral("GET")) {
      aRv.ThrowTypeError("HEAD or GET Request cannot have a body.");
      return nullptr;
    }
  }

  if (aInit.mBody.WasPassed()) {
    const Nullable<fetch::OwningBodyInit>& bodyInitNullable =
        aInit.mBody.Value();
    if (!bodyInitNullable.IsNull()) {
      const fetch::OwningBodyInit& bodyInit = bodyInitNullable.Value();
      nsCOMPtr<nsIInputStream> stream;
      nsAutoCString contentTypeWithCharset;
      uint64_t contentLength = 0;
      if (bodyInit.IsUSVString()) {
        nsAutoCString url;
        request->GetURL(url);
        nsAutoString aUrl;
        CopyUTF8toUTF16(url, aUrl);
        ReportTaintSink(bodyInit.GetAsUSVString(), "fetch.body", aUrl);
      }
      aRv = ExtractByteStreamFromBody(bodyInit, getter_AddRefs(stream),
                                      contentTypeWithCharset, contentLength);
      if (NS_WARN_IF(aRv.Failed())) {
        return nullptr;
      }

      nsCOMPtr<nsIInputStream> temporaryBody = stream;

      if (!contentTypeWithCharset.IsVoid() &&
          !requestHeaders->Has("Content-Type"_ns, aRv)) {
        requestHeaders->Append("Content-Type"_ns, contentTypeWithCharset, aRv);
      }

      if (NS_WARN_IF(aRv.Failed())) {
        return nullptr;
      }

      if (hasCopiedBody) {
        request->SetBody(nullptr, 0);
      }

      request->SetBody(temporaryBody, contentLength);
    }
  }

  auto domRequest =
      MakeSafeRefPtr<Request>(aGlobal, std::move(request), signal);

  if (aInput.IsRequest() && !bodyFromInit) {
    RefPtr<Request> inputReq = &aInput.GetAsRequest();
    nsCOMPtr<nsIInputStream> body;
    inputReq->GetBody(getter_AddRefs(body));
    if (body) {
      inputReq->SetBody(nullptr, 0);
      inputReq->SetBodyUsed(aCx, aRv);
      if (NS_WARN_IF(aRv.Failed())) {
        return nullptr;
      }
    }
  }
  return domRequest;
}

SafeRefPtr<Request> Request::Clone(ErrorResult& aRv) {
  if (BodyUsed()) {
    aRv.ThrowTypeError<MSG_FETCH_BODY_CONSUMED_ERROR>();
    return nullptr;
  }

  SafeRefPtr<InternalRequest> ir = mRequest->Clone();
  if (!ir) {
    aRv.Throw(NS_ERROR_FAILURE);
    return nullptr;
  }

  return MakeSafeRefPtr<Request>(mOwner, std::move(ir), GetOrCreateSignal());
}

Headers* Request::Headers_() {
  if (!mHeaders) {
    mHeaders = new Headers(mOwner, mRequest->Headers());
  }

  return mHeaders;
}

AbortSignal* Request::GetOrCreateSignal() {
  if (!mSignal) {
    mSignal = new AbortSignal(mOwner, false, JS::UndefinedHandleValue);
  }

  return mSignal;
}

AbortSignalImpl* Request::GetSignalImpl() const { return mSignal; }

AbortSignalImpl* Request::GetSignalImplToConsumeBody() const {
  // This is a hack, see Response::GetSignalImplToConsumeBody.
  return nullptr;
}

}  // namespace mozilla::dom
