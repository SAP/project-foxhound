/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CredentialsContainer.h"

#include "mozilla/StaticPrefs_security.h"
#include "mozilla/dom/Credential.h"
#include "mozilla/dom/DigitalCredentialHandler.h"
#include "mozilla/dom/FeaturePolicyUtils.h"
#include "mozilla/dom/Promise.h"
#include "mozilla/dom/WebAuthnHandler.h"
#include "mozilla/dom/WebIdentityHandler.h"
#include "mozilla/dom/WindowContext.h"
#include "mozilla/dom/WindowGlobalChild.h"
#include "nsContentUtils.h"
#include "nsIDocShell.h"

namespace mozilla::dom {

NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE(CredentialsContainer, mParent,
                                      mWebAuthnHandler,
                                      mDigitalCredentialHandler)
NS_IMPL_CYCLE_COLLECTING_ADDREF(CredentialsContainer)
NS_IMPL_CYCLE_COLLECTING_RELEASE(CredentialsContainer)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(CredentialsContainer)
  NS_WRAPPERCACHE_INTERFACE_MAP_ENTRY
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END

static bool IsInActiveTab(nsPIDOMWindowInner* aParent) {
  // Returns whether aParent is an inner window somewhere in the active tab.
  // The active tab is the selected (i.e. visible) tab in the focused window.
  MOZ_ASSERT(aParent);

  RefPtr<Document> doc = aParent->GetExtantDoc();
  if (NS_WARN_IF(!doc)) {
    return false;
  }

  return IsInActiveTab(doc);
}

static bool ConsumeUserActivation(nsPIDOMWindowInner* aParent) {
  // Returns whether aParent has transient activation, and consumes the
  // activation.
  MOZ_ASSERT(aParent);

  RefPtr<Document> doc = aParent->GetExtantDoc();
  if (NS_WARN_IF(!doc)) {
    return false;
  }

  return doc->ConsumeTransientUserGestureActivation();
}

// static
bool CredentialsContainer::IsSameOriginWithAncestors(
    nsPIDOMWindowInner* aParent) {
  // This method returns true if aParent is either not in a frame / iframe, or
  // is in a frame or iframe and all ancestors for aParent are the same origin.
  // This is useful for Credential Management because we need to prohibit
  // iframes, but not break mochitests (which use iframes to embed the tests).
  MOZ_ASSERT(aParent);

  WindowGlobalChild* wgc = aParent->GetWindowGlobalChild();

  // If there's no WindowGlobalChild, the inner window has already been
  // destroyed, so fail safe and return false.
  if (!wgc) {
    return false;
  }

  // Check that all ancestors are the same origin, repeating until we find a
  // null parent
  for (WindowContext* parentContext =
           wgc->WindowContext()->GetParentWindowContext();
       parentContext; parentContext = parentContext->GetParentWindowContext()) {
    if (!wgc->IsSameOriginWith(parentContext)) {
      // same-origin policy is violated
      return false;
    }
  }

  return true;
}

CredentialsContainer::CredentialsContainer(nsPIDOMWindowInner* aParent)
    : mParent(aParent) {
  MOZ_ASSERT(aParent);
}

CredentialsContainer::~CredentialsContainer() = default;

void CredentialsContainer::EnsureWebAuthnHandler() {
  MOZ_ASSERT(NS_IsMainThread());

  if (!mWebAuthnHandler) {
    mWebAuthnHandler = new WebAuthnHandler(mParent);
  }
}

void CredentialsContainer::EnsureDigitalCredentialHandler() {
  MOZ_ASSERT(NS_IsMainThread());

  if (!mDigitalCredentialHandler) {
    mDigitalCredentialHandler = new DigitalCredentialHandler(mParent);
  }
}

already_AddRefed<WebAuthnHandler> CredentialsContainer::GetWebAuthnHandler() {
  MOZ_ASSERT(NS_IsMainThread());

  EnsureWebAuthnHandler();
  RefPtr<WebAuthnHandler> ref = mWebAuthnHandler;
  return ref.forget();
}

JSObject* CredentialsContainer::WrapObject(JSContext* aCx,
                                           JS::Handle<JSObject*> aGivenProto) {
  return CredentialsContainer_Binding::Wrap(aCx, this, aGivenProto);
}

already_AddRefed<Promise> CredentialsContainer::Get(
    JSContext* aCx, const CredentialRequestOptions& aOptions,
    ErrorResult& aRv) {
  RefPtr<Promise> promise = Promise::Create(mParent->AsGlobal(), aRv);
  if (aRv.Failed()) {
    return nullptr;
  }

  uint64_t totalOptions = 0;
  if (aOptions.mPublicKey.WasPassed()) {
    totalOptions += 1;
  }
  if (aOptions.mIdentity.WasPassed()) {
    totalOptions += 1;
  }
  if (aOptions.mDigital.WasPassed()) {
    totalOptions += 1;
  }
  if (totalOptions > 1) {
    promise->MaybeRejectWithNotSupportedError(
        "CredentialsContainer request is not supported."_ns);
    return promise.forget();
  }

  if (aOptions.mSignal.WasPassed() && aOptions.mSignal.Value().Aborted()) {
    JS::Rooted<JS::Value> reason(aCx);
    aOptions.mSignal.Value().GetReason(aCx, &reason);
    promise->MaybeReject(reason);
    return promise.forget();
  }

  bool conditionallyMediated =
      aOptions.mMediation == CredentialMediationRequirement::Conditional;
  if (aOptions.mPublicKey.WasPassed()) {
    MOZ_ASSERT(mParent);
    if (!FeaturePolicyUtils::IsFeatureAllowed(
            mParent->GetExtantDoc(), u"publickey-credentials-get"_ns) ||
        !(IsInActiveTab(mParent) || conditionallyMediated)) {
      promise->MaybeRejectWithNotAllowedError(
          "CredentialsContainer request is not allowed."_ns);
      return promise.forget();
    }

    if (conditionallyMediated &&
        !StaticPrefs::security_webauthn_enable_conditional_mediation()) {
      promise->MaybeRejectWithTypeError<MSG_INVALID_ENUM_VALUE>(
          "mediation", "conditional", "CredentialMediationRequirement");
      return promise.forget();
    }

    if (aOptions.mMediation != CredentialMediationRequirement::Conditional &&
        aOptions.mMediation != CredentialMediationRequirement::Optional &&
        aOptions.mMediation != CredentialMediationRequirement::Required) {
      promise->MaybeRejectWithNotSupportedError(
          "Unsupported credential mediation requirement"_ns);
      return promise.forget();
    }

    EnsureWebAuthnHandler();
    mWebAuthnHandler->GetAssertion(aCx, aOptions.mPublicKey.Value(),
                                   conditionallyMediated, aOptions.mSignal,
                                   promise);
    return promise.forget();
  }

  if (aOptions.mIdentity.WasPassed()) {
    if (conditionallyMediated) {
      promise->MaybeRejectWithTypeError<MSG_INVALID_ENUM_VALUE>(
          "mediation", "conditional", "CredentialMediationRequirement");
      return promise.forget();
    }

    WebIdentityHandler* identityHandler =
        mParent->GetOrCreateWebIdentityHandler();
    if (!identityHandler) {
      promise->MaybeRejectWithOperationError("");
      return promise.forget();
    }
    if (aOptions.mSignal.WasPassed()) {
      identityHandler->Follow(&aOptions.mSignal.Value());
    }
    identityHandler->GetCredential(aOptions, IsSameOriginWithAncestors(mParent),
                                   promise);

    return promise.forget();
  }

  if (aOptions.mDigital.WasPassed()) {
    if (!FeaturePolicyUtils::IsFeatureAllowed(mParent->GetExtantDoc(),
                                              u"digital-credentials-get"_ns)) {
      promise->MaybeRejectWithNotAllowedError(
          "The 'digital-credentials-get' feature is not allowed by policy in this document."_ns);
      return promise.forget();
    }

    EnsureDigitalCredentialHandler();
    mDigitalCredentialHandler->GetDigitalCredential(
        aCx, aOptions.mDigital.Value(), aOptions.mSignal, promise);
    return promise.forget();
  }

  promise->MaybeRejectWithNotSupportedError(
      "CredentialsContainer request is not supported."_ns);
  return promise.forget();
}

already_AddRefed<Promise> CredentialsContainer::Create(
    JSContext* aCx, const CredentialCreationOptions& aOptions,
    ErrorResult& aRv) {
  RefPtr<Promise> promise = Promise::Create(mParent->AsGlobal(), aRv);
  if (aRv.Failed()) {
    return nullptr;
  }

  // Count the types of options provided. Must not be >1.
  uint64_t totalOptions = 0;
  if (aOptions.mPublicKey.WasPassed()) {
    totalOptions += 1;
  }
  if (aOptions.mDigital.WasPassed()) {
    totalOptions += 1;
  }
  if (totalOptions > 1) {
    promise->MaybeRejectWithNotSupportedError(
        "CredentialsContainer request is not supported."_ns);
    return promise.forget();
  }

  if (aOptions.mSignal.WasPassed() && aOptions.mSignal.Value().Aborted()) {
    JS::Rooted<JS::Value> reason(aCx);
    aOptions.mSignal.Value().GetReason(aCx, &reason);
    promise->MaybeReject(reason);
    return promise.forget();
  }

  if (aOptions.mPublicKey.WasPassed()) {
    MOZ_ASSERT(mParent);
    // In a cross-origin iframe this request consumes user activation, i.e.
    // subsequent requests cannot be made without further user interaction.
    // See step 2.2 of https://w3c.github.io/webauthn/#sctn-createCredential
    bool hasRequiredActivation =
        IsInActiveTab(mParent) &&
        (IsSameOriginWithAncestors(mParent) || ConsumeUserActivation(mParent));
    if (!FeaturePolicyUtils::IsFeatureAllowed(
            mParent->GetExtantDoc(), u"publickey-credentials-create"_ns) ||
        !hasRequiredActivation) {
      promise->MaybeRejectWithNotAllowedError(
          "CredentialsContainer request is not allowed."_ns);
      return promise.forget();
    }

    if (aOptions.mMediation != CredentialMediationRequirement::Optional &&
        aOptions.mMediation != CredentialMediationRequirement::Required) {
      promise->MaybeRejectWithNotSupportedError(
          "Unsupported credential mediation requirement"_ns);
      return promise.forget();
    }

    EnsureWebAuthnHandler();
    mWebAuthnHandler->MakeCredential(aCx, aOptions.mPublicKey.Value(),
                                     aOptions.mSignal, promise);
    return promise.forget();
  }

  if (aOptions.mDigital.WasPassed()) {
    if (!FeaturePolicyUtils::IsFeatureAllowed(
            mParent->GetExtantDoc(), u"digital-credentials-create"_ns)) {
      promise->MaybeRejectWithNotAllowedError(
          "The 'digital-credentials-create' feature is not allowed by policy in this document."_ns);
      return promise.forget();
    }

    EnsureDigitalCredentialHandler();
    mDigitalCredentialHandler->CreateDigitalCredential(
        aCx, aOptions.mDigital.Value(), aOptions.mSignal, promise);
    return promise.forget();
  }

  promise->MaybeRejectWithNotSupportedError(
      "CredentialsContainer request is not supported."_ns);
  return promise.forget();
}

already_AddRefed<Promise> CredentialsContainer::Store(
    const Credential& aCredential, ErrorResult& aRv) {
  RefPtr<Promise> promise = Promise::Create(mParent->AsGlobal(), aRv);
  if (aRv.Failed()) {
    return nullptr;
  }

  nsString type;
  aCredential.GetType(type);
  if (type.EqualsLiteral("public-key")) {
    if (!IsSameOriginWithAncestors(mParent) || !IsInActiveTab(mParent)) {
      promise->MaybeRejectWithNotAllowedError(
          "CredentialsContainer request is not allowed."_ns);
      return promise.forget();
    }

    EnsureWebAuthnHandler();
    mWebAuthnHandler->Store(aCredential, promise);
    return promise.forget();
  }

  promise->MaybeRejectWithNotSupportedError(
      "CredentialsContainer request is not supported."_ns);
  return promise.forget();
}

already_AddRefed<Promise> CredentialsContainer::PreventSilentAccess(
    ErrorResult& aRv) {
  nsCOMPtr<nsIGlobalObject> global = do_QueryInterface(mParent);
  if (NS_WARN_IF(!global)) {
    aRv.Throw(NS_ERROR_FAILURE);
    return nullptr;
  }

  RefPtr<Promise> promise = Promise::Create(global, aRv);
  if (NS_WARN_IF(aRv.Failed())) {
    return nullptr;
  }

  WebIdentityHandler* identityHandler =
      mParent->GetOrCreateWebIdentityHandler();
  if (!identityHandler) {
    promise->MaybeRejectWithOperationError("");
    return promise.forget();
  }

  identityHandler->PreventSilentAccess(promise);
  return promise.forget();
}

}  // namespace mozilla::dom
