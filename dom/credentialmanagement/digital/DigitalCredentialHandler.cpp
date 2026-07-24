/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/DigitalCredentialHandler.h"

#include "mozilla/dom/DigitalCredentialChild.h"
#include "mozilla/dom/FeaturePolicyUtils.h"
#include "mozilla/dom/WindowGlobalChild.h"
#include "nsCycleCollectionParticipant.h"

namespace mozilla::dom {

NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(DigitalCredentialHandler)
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END

NS_IMPL_CYCLE_COLLECTION(DigitalCredentialHandler, mWindow)

NS_IMPL_CYCLE_COLLECTING_ADDREF(DigitalCredentialHandler)
NS_IMPL_CYCLE_COLLECTING_RELEASE(DigitalCredentialHandler)

DigitalCredentialHandler::~DigitalCredentialHandler() {
  MOZ_ASSERT(NS_IsMainThread());
  if (mActor) {
    mActor->SetHandler(nullptr);
  }
}

void DigitalCredentialHandler::RunAbortAlgorithm() {
  MOZ_ASSERT(NS_IsMainThread());

  if (mActor) {
    mActor->SendCancelOperationInParent();
  }
}

void DigitalCredentialHandler::RejectPromiseWithAbortError(
    const RefPtr<Promise>& aPromise) {
  MOZ_ASSERT(NS_IsMainThread());

  nsCOMPtr<nsIGlobalObject> global = do_QueryInterface(mWindow);
  AutoJSAPI jsapi;
  if (jsapi.Init(global) && Signal() && Signal()->Aborted()) {
    JSContext* cx = jsapi.cx();
    JS::Rooted<JS::Value> reason(cx);
    Signal()->GetReason(cx, &reason);
    aPromise->MaybeReject(reason);
  } else {
    aPromise->MaybeRejectWithAbortError("Operation aborted.");
  }
}

bool DigitalCredentialHandler::MaybeCreateActor() {
  if (mActor) {
    return true;
  }

  RefPtr<DigitalCredentialChild> actor = new DigitalCredentialChild();
  WindowGlobalChild* windowGlobalChild = mWindow->GetWindowGlobalChild();

  if (!windowGlobalChild ||
      !windowGlobalChild->SendPDigitalCredentialConstructor(actor)) {
    return false;
  }

  mActor = actor;
  mActor->SetHandler(this);
  return true;
}

void DigitalCredentialHandler::GetDigitalCredential(
    JSContext* aCx, const DigitalCredentialRequestOptions& aOptions,
    const Optional<OwningNonNull<AbortSignal>>& aSignal,
    const RefPtr<Promise>& aPromise) {
  MOZ_ASSERT(XRE_IsContentProcess());
  MOZ_ASSERT(mWindow);
  MOZ_ASSERT(aPromise);

  if (!MaybeCreateActor()) {
    aPromise->MaybeRejectWithUnknownError("Could not create IPC actor.");
    return;
  }

  if (mPending) {
    aPromise->MaybeRejectWithNotAllowedError(
        "Concurrent requests are not allowed.");
    return;
  }

  mPending = true;
  auto cleanup = MakeScopeExit([self = RefPtr{this}]() {
    self->mPending = false;
    self->Unfollow();
  });

  if (aSignal.WasPassed()) {
    Follow(&aSignal.Value());
    if (Signal()->Aborted()) {
      RejectPromiseWithAbortError(aPromise);
      return;
    }
  }

  // Section 5.1 of
  // <https://w3c-fedid.github.io/digital-credentials/>

  // Step 1: Let global be the relevant global object
  // Step 2: Let document be the global's associated document.
  RefPtr<Document> document = mWindow->GetExtantDoc();
  if (NS_WARN_IF(!document)) {
    aPromise->MaybeRejectWithUnknownError("Could not get extant document.");
    return;
  }

  // Step 3: If document is not a fully active descendant of a top-level
  // traversable with user attention, throw "NotAllowedError" DOMException.
  if (!IsInActiveTab(document)) {
    aPromise->MaybeRejectWithNotAllowedError(
        "Digital credential requests require a fully active document."_ns);
    return;
  }

  // Step 4: If window does not have transient activation, throw
  //         "NotAllowedError" DOMException.
  // Step 5: Consume user activation of window.
  if (!document->ConsumeTransientUserGestureActivation()) {
    aPromise->MaybeRejectWithNotAllowedError(
        "Digital credential requests require transient activation."_ns);
    return;
  }

  // Step 6: Let requests be options's digital's requests member.
  const Sequence<DigitalCredentialGetRequest>& requests = aOptions.mRequests;

  // Step 7: If requests is empty, throw a TypeError.
  if (requests.Length() == 0) {
    aPromise->MaybeRejectWithTypeError(
        "Digital credentials API requires at least one well-formed request.");
    return;
  }

  // Step 8: Serialize each request to a JSON string.
  nsTArray<IPCDigitalCredentialRequest> ipcRequests;
  for (auto& request : requests) {
    nsString serializedData;
    JS::Rooted<JSObject*> requestDataObject(aCx, request.mData);
    JS::Rooted<JS::Value> requestDataValue(aCx,
                                           JS::ObjectValue(*requestDataObject));
    if (!nsContentUtils::StringifyJSON(aCx, requestDataValue, serializedData,
                                       UndefinedIsVoidString)) {
      JS_ClearPendingException(aCx);
      aPromise->MaybeRejectWithTypeError(
          "Digital credentials API requests must be serializable to JSON.");
      return;
    }
    ipcRequests.AppendElement(
        IPCDigitalCredentialRequest(request.mProtocol, serializedData));
  }

  cleanup.release();

  RefPtr<Promise> promise(aPromise);
  RefPtr<DigitalCredentialHandler> self(this);
  mActor->SendGetDigitalCredential(ipcRequests)
      ->Then(
          GetCurrentSerialEventTarget(), __func__,
          [self,
           promise](const DigitalCredentialChild::GetDigitalCredentialPromise::
                        ResolveOrRejectValue& aResult) {
            if (aResult.IsResolve() &&
                aResult.ResolveValue().type() ==
                    IPCDigitalCredentialResponse::Type::TIPCDigitalCredential) {
              promise->MaybeRejectWithNotSupportedError(
                  "Digital credential get requests are not supported.");
            } else if (aResult.IsResolve() &&
                       aResult.ResolveValue() == NS_ERROR_DOM_ABORT_ERR) {
              self->RejectPromiseWithAbortError(promise);
            } else if (aResult.IsResolve()) {
              promise->MaybeReject(aResult.ResolveValue());
            } else {
              promise->MaybeRejectWithOperationError(
                  "Digital credential get request failed.");
            }
            self->mPending = false;
            self->Unfollow();
          });
}

void DigitalCredentialHandler::CreateDigitalCredential(
    JSContext* aCx, const DigitalCredentialCreationOptions& aOptions,
    const Optional<OwningNonNull<AbortSignal>>& aSignal,
    const RefPtr<Promise>& aPromise) {
  MOZ_ASSERT(XRE_IsContentProcess());
  MOZ_ASSERT(mWindow);
  MOZ_ASSERT(aPromise);

  if (!MaybeCreateActor()) {
    aPromise->MaybeRejectWithUnknownError("Could not create IPC actor.");
    return;
  }

  if (mPending) {
    aPromise->MaybeRejectWithNotAllowedError(
        "Concurrent requests are not allowed.");
    return;
  }

  mPending = true;
  auto cleanup = MakeScopeExit([self = RefPtr{this}]() {
    self->mPending = false;
    self->Unfollow();
  });

  if (aSignal.WasPassed()) {
    Follow(&aSignal.Value());
    if (Signal()->Aborted()) {
      RejectPromiseWithAbortError(aPromise);
      return;
    }
  }

  // Section 5.3 of
  // <https://w3c-fedid.github.io/digital-credentials/>

  // Step 1: Let global be the relevant global object
  // Step 2: Let document be the global's associated document.
  RefPtr<Document> document = mWindow->GetExtantDoc();
  if (NS_WARN_IF(!document)) {
    aPromise->MaybeRejectWithUnknownError("Could not get extant document.");
    return;
  }

  // Step 3: If document is not a fully active descendant of a top-level
  // traversable with user attention, throw "NotAllowedError" DOMException.
  if (!IsInActiveTab(document)) {
    aPromise->MaybeRejectWithNotAllowedError(
        "Digital credential requests require a fully active document."_ns);
    return;
  }

  // Step 4: If window does not have transient activation, throw
  //         "NotAllowedError" DOMException.
  // Step 5: Consume user activation of window.
  if (!document->ConsumeTransientUserGestureActivation()) {
    aPromise->MaybeRejectWithNotAllowedError(
        "Digital credential requests require transient activation."_ns);
    return;
  }

  // Step 6: Let requests be options's digital's requests member.
  if (!aOptions.mRequests.WasPassed()) {
    aPromise->MaybeRejectWithTypeError(
        "Digital credentials API requests must have a request field.");
    return;
  }
  const Sequence<DigitalCredentialCreateRequest>& requests =
      aOptions.mRequests.Value();

  // Step 7: If requests is empty, throw a TypeError.
  if (requests.Length() == 0) {
    aPromise->MaybeRejectWithTypeError(
        "Digital credentials API requires at least one well-formed request.");
    return;
  }

  // Step 8: Serialize each request to a JSON string.
  nsTArray<IPCDigitalCredentialRequest> ipcRequests;
  for (auto& request : requests) {
    nsString serializedData;
    JS::Rooted<JSObject*> requestDataObject(aCx, request.mData);
    JS::Rooted<JS::Value> requestDataValue(aCx,
                                           JS::ObjectValue(*requestDataObject));
    if (!nsContentUtils::StringifyJSON(aCx, requestDataValue, serializedData,
                                       UndefinedIsVoidString)) {
      JS_ClearPendingException(aCx);
      aPromise->MaybeRejectWithTypeError(
          "Digital credentials API requests must be serializable to JSON.");
      return;
    }
    ipcRequests.AppendElement(
        IPCDigitalCredentialRequest(request.mProtocol, serializedData));
  }

  cleanup.release();

  RefPtr<Promise> promise(aPromise);
  RefPtr<DigitalCredentialHandler> self(this);
  mActor->SendCreateDigitalCredential(ipcRequests)
      ->Then(
          GetCurrentSerialEventTarget(), __func__,
          [self,
           promise](const DigitalCredentialChild::GetDigitalCredentialPromise::
                        ResolveOrRejectValue& aResult) {
            if (aResult.IsResolve() &&
                aResult.ResolveValue().type() ==
                    IPCDigitalCredentialResponse::Type::TIPCDigitalCredential) {
              promise->MaybeRejectWithNotSupportedError(
                  "Digital credential create requests are not supported.");
            } else if (aResult.IsResolve() &&
                       aResult.ResolveValue() == NS_ERROR_DOM_ABORT_ERR) {
              self->RejectPromiseWithAbortError(promise);
            } else if (aResult.IsResolve()) {
              promise->MaybeReject(aResult.ResolveValue());
            } else {
              promise->MaybeRejectWithOperationError(
                  "Digital credential create request failed.");
            }
            self->mPending = false;
            self->Unfollow();
          });
}

void DigitalCredentialHandler::ActorDestroyed() {
  MOZ_ASSERT(NS_IsMainThread());
  mActor = nullptr;
  mPending = false;
}

}  // namespace mozilla::dom
