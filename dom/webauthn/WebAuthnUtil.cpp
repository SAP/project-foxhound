/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/WebAuthnUtil.h"

#include "hasht.h"
#include "js/Exception.h"
#include "mozilla/Base64.h"
#include "mozilla/BasePrincipal.h"
#include "mozilla/Components.h"
#include "mozilla/StaticPrefs_security.h"
#include "mozilla/dom/WebAuthenticationBinding.h"
#include "mozilla/dom/WindowGlobalParent.h"
#include "mozilla/dom/nsMixedContentBlocker.h"
#include "mozilla/extensions/MatchPattern.h"
#include "mozilla/extensions/WebExtensionPolicy.h"
#include "mozilla/net/DNS.h"
#include "mozpkix/pkixutil.h"
#include "nsComponentManagerUtils.h"
#include "nsContentUtils.h"
#include "nsHTMLDocument.h"
#include "nsICryptoHash.h"
#include "nsIEffectiveTLDService.h"
#include "nsIURIMutator.h"
#include "nsNetUtil.h"

namespace mozilla::dom {

bool IsValidAppId(const nsCOMPtr<nsIPrincipal>& aPrincipal,
                  const nsCString& aAppId) {
  // An AppID is a substitute for the RP ID that allows the caller to assert
  // credentials that were created using the legacy U2F protocol. While an RP ID
  // is the caller origin's effective domain, or a registrable suffix thereof,
  // an AppID is a URL (with a scheme and a possibly non-empty path) that is
  // same-site with the caller's origin.
  //
  // The U2F protocol nominally uses Algorithm 3.1.2 of [1] to validate AppIDs.
  // However, the WebAuthn spec [2] notes that it is not necessary to "implement
  // steps four and onward of" Algorithm 3.1.2. Instead, in step three, "the
  // comparison on the host is relaxed to accept hosts on the same site." Step
  // two is best seen as providing a default value for the AppId when one is not
  // provided. That leaves step 1 and the same-site check, which is what we
  // implement here.
  //
  // [1]
  // https://fidoalliance.org/specs/fido-v2.0-id-20180227/fido-appid-and-facets-v2.0-id-20180227.html#determining-if-a-caller-s-facetid-is-authorized-for-an-appid
  // [2] https://w3c.github.io/webauthn/#sctn-appid-extension

  auto* principal = BasePrincipal::Cast(aPrincipal);
  bool reqIsFromExtension = !!principal->AddonPolicy();
  if (reqIsFromExtension) {
    // AppIDs are not allowed from extensions.
    return false;
  }

  nsCOMPtr<nsIURI> callerUri;
  nsresult rv = principal->GetURI(getter_AddRefs(callerUri));
  if (NS_FAILED(rv)) {
    return false;
  }

  nsCOMPtr<nsIURI> appIdUri;
  rv = NS_NewURI(getter_AddRefs(appIdUri), aAppId);
  if (NS_FAILED(rv)) {
    return false;
  }

  // Step 1 of Algorithm 3.1.2. "If the AppID is not an HTTPS URL, and matches
  // the FacetID of the caller, no additional processing is necessary and the
  // operation may proceed." In the web context, the "FacetID" is defined as
  // "the Web Origin [RFC6454] of the web page triggering the FIDO operation,
  // written as a URI with an empty path. Default ports are omitted and any path
  // component is ignored."
  if (!appIdUri->SchemeIs("https")) {
    nsCString facetId;
    rv = principal->GetWebExposedOriginSerialization(facetId);
    return NS_SUCCEEDED(rv) && facetId == aAppId;
  }

  // Same site check
  nsCOMPtr<nsIEffectiveTLDService> tldService =
      do_GetService(NS_EFFECTIVETLDSERVICE_CONTRACTID);
  if (!tldService) {
    return false;
  }

  nsAutoCString baseDomainCaller;
  rv = tldService->GetBaseDomain(callerUri, 0, baseDomainCaller);
  if (NS_FAILED(rv)) {
    return false;
  }

  nsAutoCString baseDomainAppId;
  rv = tldService->GetBaseDomain(appIdUri, 0, baseDomainAppId);
  if (NS_FAILED(rv)) {
    return false;
  }

  if (baseDomainCaller == baseDomainAppId) {
    return true;
  }

  // Exceptions for Google Accounts from Bug 1436078. These were supposed to be
  // temporary, but users reported breakage when we tried to remove them (Bug
  // 1822703). We will need to keep them indefinitely.
  if (baseDomainCaller.EqualsLiteral("google.com") &&
      (aAppId.Equals("https://www.gstatic.com/securitykey/origins.json"_ns) ||
       aAppId.Equals(
           "https://www.gstatic.com/securitykey/a/google.com/origins.json"_ns))) {
    return true;
  }

  return false;
}

nsresult DefaultRpId(const nsCOMPtr<nsIPrincipal>& aPrincipal,
                     /* out */ nsACString& aRpId) {
  // [https://w3c.github.io/webauthn/#rp-id]
  // "By default, the RP ID for a WebAuthn operation is set to the caller's
  // origin's effective domain."
  auto* basePrin = BasePrincipal::Cast(aPrincipal);
  nsCOMPtr<nsIURI> uri;
  if (NS_FAILED(basePrin->GetURI(getter_AddRefs(uri)))) {
    return NS_ERROR_FAILURE;
  }
  return uri->GetAsciiHost(aRpId);
}

bool IsWebAuthnAllowedInDocument(const nsCOMPtr<Document>& aDoc) {
  MOZ_ASSERT(aDoc);
  return aDoc->IsHTMLOrXHTML();
}

bool IsWebAuthnAllowedInContext(WindowGlobalParent* aContext) {
  nsIPrincipal* principal = aContext->DocumentPrincipal();
  MOZ_ASSERT(principal);

  if (principal->GetIsNullPrincipal()) {
    return false;
  }

  if (principal->GetIsIpAddress()) {
    return false;
  }
  // This next test is not strictly necessary since CredentialsContainer is
  // [SecureContext] in our webidl.
  if (!principal->GetIsOriginPotentiallyTrustworthy()) {
    return false;
  }

  if (principal->GetIsLoopbackHost()) {
    return true;
  }

  if (StaticPrefs::security_webauthn_allow_with_certificate_override()) {
    return true;
  }

  WindowGlobalParent* windowContext = aContext;
  while (windowContext) {
    if (nsCOMPtr<nsIChannel> chan = windowContext->GetDocumentChannel()) {
      nsCOMPtr<nsITransportSecurityInfo> securityInfo;
      nsresult rv = chan->GetSecurityInfo(getter_AddRefs(securityInfo));
      if (NS_SUCCEEDED(rv) && securityInfo &&
          !IsWebAuthnAllowedForTransportSecurityInfo(securityInfo)) {
        return false;
      }
    }
    windowContext = windowContext->GetParentWindowContext();
  }

  return true;
}

bool IsWebAuthnAllowedForTransportSecurityInfo(
    nsITransportSecurityInfo* aSecurityInfo) {
  nsITransportSecurityInfo::OverridableErrorCategory overridableErrorCategory;
  if (!aSecurityInfo || NS_FAILED(aSecurityInfo->GetOverridableErrorCategory(
                            &overridableErrorCategory))) {
    return false;
  }

  switch (overridableErrorCategory) {
    case nsITransportSecurityInfo::OverridableErrorCategory::ERROR_UNSET:
      return true;
    case nsITransportSecurityInfo::OverridableErrorCategory::ERROR_TIME:
      return true;
    case nsITransportSecurityInfo::OverridableErrorCategory::ERROR_TRUST:
      return false;
    case nsITransportSecurityInfo::OverridableErrorCategory::ERROR_DOMAIN:
      return false;
    default:
      return false;
  }
}

// The "is a registrable domain suffix of or is equal to" condition is defined
// in https://html.spec.whatwg.org/multipage/browsers.html#dom-document-domain
// as a subroutine of the document.domain setter, and it is exposed in XUL as
// the Document::IsValidDomain function. Unfortunately Document::IsValidDomain
// takes URIs, and to support web extensions we need to compare directly with
// ASCII host names.
bool IsRegistrableDomainSuffixOfOrEqualTo(const nsACString& aQuery,
                                          const nsACString& aReference) {
  nsCOMPtr<nsIEffectiveTLDService> tldService =
      mozilla::components::EffectiveTLD::Service();
  if (!tldService) {
    return false;
  }

  // exclude values that are themselves in the public suffix list.
  nsAutoCString queryPublicSuffix;
  nsresult rv =
      tldService->GetKnownPublicSuffixFromHost(aQuery, queryPublicSuffix);
  if (NS_FAILED(rv) || aQuery == queryPublicSuffix) {
    return false;
  }

  if (aQuery.Equals(aReference)) {
    return true;
  }

  if (aQuery.Length() > aReference.Length() &&
      StringEndsWith(aQuery, aReference) &&
      aQuery.CharAt(aQuery.Length() - aReference.Length() - 1) == '.') {
    // The query string ends with '.' followed by the reference string. It is a
    // registrable domain suffix of the reference string if and only if its base
    // domain is entirely contained in `aReference`.
    nsAutoCString queryBaseDomain;
    rv = tldService->GetBaseDomainFromHost(aQuery, 0, queryBaseDomain);
    if (NS_FAILED(rv)) {
      return false;
    }

    return aReference.Length() >= queryBaseDomain.Length();
  }

  return false;
}

static bool OriginCanClaimRpId(const nsCOMPtr<nsIPrincipal>& aPrincipal,
                               const nsACString& aRpId) {
  // This checks two of the conditions defined in
  // https://w3c.github.io/webauthn/#rp-id, namely that the RP ID value is
  //  (1) "a valid domain string", and
  //  (2) "a registrable domain suffix of or is equal to the caller's origin's
  //      effective domain"
  //
  // The specification also requires
  //  (3) Either "the origin's scheme is https" or "the origin's host is
  //      localhost and its scheme is http".
  // We relax this third condition slightly and expose WebAuthn in all secure
  // contexts (https://www.w3.org/TR/secure-contexts/).

  // Condition (1)
  nsAutoCString normalizedRpId;
  nsresult rv = NS_DomainToASCII(aRpId, normalizedRpId);
  if (NS_FAILED(rv)) {
    return false;
  }
  if (normalizedRpId != aRpId) {
    return false;
  }

  // Condition (2)
  auto* basePrin = BasePrincipal::Cast(aPrincipal);
  nsAutoCString current;
  if (NS_FAILED(basePrin->GetAsciiHost(current))) {
    return false;
  }
  if (!IsRegistrableDomainSuffixOfOrEqualTo(current, aRpId)) {
    return false;
  }

  // Condition (3)
  if (!aPrincipal->GetIsOriginPotentiallyTrustworthy()) {
    return false;
  }

  return true;
}

static bool ExtensionCanClaimRpId(const nsCOMPtr<nsIPrincipal>& aPrincipal,
                                  const nsACString& aRpId) {
  // The conditions here are largely the same as in OriginCanClaimRpId. However,
  // rather than making direct comparisons with the caller's origin, we check
  // whether the extension has host permissions for a suitable origin via
  // WebExtensionPolicy::CanAccessURI (which checks the restricted URI list).
  //
  // The conditions that we enforce are:
  // (1) The RP ID must be a valid domain string.
  // (2) The RP ID must not be a single-label non-loopback hostname or a known
  //     public suffix.
  // (3) The extension must have host permissions for either
  //     - https://<aRpId>, or
  //     - http://<aRpId>, if aRpId is a loopback hostname (per
  //     mozilla::net::IsLoopbackHostname).

  // Condition (1)
  nsAutoCString normalizedRpId;
  nsresult rv = NS_DomainToASCII(aRpId, normalizedRpId);
  if (NS_FAILED(rv)) {
    return false;
  }
  if (normalizedRpId != aRpId) {
    return false;
  }

  // Condition (2)
  nsCOMPtr<nsIEffectiveTLDService> tldService =
      mozilla::components::EffectiveTLD::Service();
  if (!tldService) {
    return false;
  }

  nsAutoCString rpIdPublicSuffix;
  if (NS_FAILED(
          tldService->GetKnownPublicSuffixFromHost(aRpId, rpIdPublicSuffix))) {
    return false;
  }

  if (aRpId == rpIdPublicSuffix) {
    return false;
  }

  // Exclude single-label non-loopback hostnames.
  int32_t firstDot = aRpId.FindChar('.');
  if ((firstDot < 0 || firstDot == (int32_t)aRpId.Length() - 1) &&
      !mozilla::net::IsLoopbackHostname(aRpId)) {
    return false;
  }

  // Condition (3)
  auto* basePrin = BasePrincipal::Cast(aPrincipal);
  MOZ_ASSERT(basePrin->AddonPolicy());

  nsAutoCString httpsUriSpec("https://"_ns);
  httpsUriSpec.Append(aRpId);
  httpsUriSpec.AppendLiteral("/");
  nsCOMPtr<nsIURI> uri;
  rv = NS_NewURI(getter_AddRefs(uri), httpsUriSpec);
  if (NS_FAILED(rv)) {
    return false;
  }

  if (basePrin->AddonPolicy()->CanAccessURI(uri.get())) {
    return true;
  }

  if (mozilla::net::IsLoopbackHostname(aRpId)) {
    nsCOMPtr<nsIURI> httpUri;
    rv = NS_MutateURI(uri).SetScheme("http"_ns).Finalize(
        getter_AddRefs(httpUri));
    if (NS_SUCCEEDED(rv) &&
        basePrin->AddonPolicy()->CanAccessURI(httpUri.get())) {
      return true;
    }
  }

  return false;
}

bool IsValidRpId(const nsCOMPtr<nsIPrincipal>& aPrincipal,
                 const nsACString& aRpId) {
  auto* basePrincipal = BasePrincipal::Cast(aPrincipal);
  bool reqIsFromExtension = !!basePrincipal->AddonPolicy();
  if (reqIsFromExtension) {
    return ExtensionCanClaimRpId(aPrincipal, aRpId);
  }
  return OriginCanClaimRpId(aPrincipal, aRpId);
}

nsresult GetWebAuthnClientDataOrigin(nsIPrincipal* aPrincipal,
                                     /* out */ nsACString& aOrigin) {
  auto* basePrincipal = BasePrincipal::Cast(aPrincipal);

  bool reqIsFromExtension = !!basePrincipal->AddonPolicy();
  if (reqIsFromExtension) {
    nsAutoCString extensionId;
    basePrincipal->AddonPolicy()->Id()->ToUTF8String(extensionId);

    nsTArray<uint8_t> hashedId;
    nsresult rv = HashCString(extensionId, hashedId);
    if (NS_FAILED(rv)) {
      return rv;
    }

    // The extension ID may not be a valid host string. So we use the sha256
    // hash of the extension ID encoded in base 16 with the digits [a-p].
    aOrigin.Assign("moz-extension://");
    for (uint8_t byte : hashedId) {
      aOrigin.Append(char('a' + ((byte >> 4) & 0x0F)));
      aOrigin.Append(char('a' + (byte & 0x0F)));
    }

    return NS_OK;
  }

  return basePrincipal->GetWebExposedOriginSerialization(aOrigin);
}

static nsresult HashCString(nsICryptoHash* aHashService, const nsACString& aIn,
                            /* out */ nsTArray<uint8_t>& aOut) {
  MOZ_ASSERT(aHashService);

  nsresult rv = aHashService->Init(nsICryptoHash::SHA256);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return rv;
  }

  rv = aHashService->Update(
      reinterpret_cast<const uint8_t*>(aIn.BeginReading()), aIn.Length());
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return rv;
  }

  nsAutoCString fullHash;
  // Passing false below means we will get a binary result rather than a
  // base64-encoded string.
  rv = aHashService->Finish(false, fullHash);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return rv;
  }

  aOut.Clear();
  aOut.AppendElements(reinterpret_cast<uint8_t const*>(fullHash.BeginReading()),
                      fullHash.Length());

  return NS_OK;
}

nsresult HashCString(const nsACString& aIn, /* out */ nsTArray<uint8_t>& aOut) {
  nsresult srv;
  nsCOMPtr<nsICryptoHash> hashService =
      do_CreateInstance(NS_CRYPTO_HASH_CONTRACTID, &srv);
  if (NS_FAILED(srv)) {
    return srv;
  }

  srv = HashCString(hashService, aIn, aOut);
  if (NS_WARN_IF(NS_FAILED(srv))) {
    return NS_ERROR_FAILURE;
  }

  return NS_OK;
}

uint32_t WebAuthnTimeout(const Optional<uint32_t>& aTimeout) {
  uint32_t adjustedTimeout = 30000;
  if (aTimeout.WasPassed()) {
    adjustedTimeout = aTimeout.Value();
    adjustedTimeout = std::max(15000u, adjustedTimeout);
    adjustedTimeout = std::min(120000u, adjustedTimeout);
  }
  return adjustedTimeout;
}

static nsresult SerializeWebAuthnData(
    const OwningArrayBufferViewOrArrayBuffer& aData, nsString& aOut) {
  return ProcessTypedArrays(
      aData, [&](const Span<uint8_t>& aData, JS::AutoCheckCannotGC&&) {
        nsAutoCString result;
        nsresult rv = mozilla::Base64URLEncode(
            aData.Length(), aData.Elements(),
            Base64URLEncodePaddingPolicy::Omit, result);
        if (NS_SUCCEEDED(rv)) {
          aOut.Assign(NS_ConvertUTF8toUTF16(result));
        }
        return rv;
      });
}

nsresult SerializeWebAuthnCreationOptions(
    JSContext* aCx, const nsString& aRpId,
    const PublicKeyCredentialCreationOptions& aOptions, nsString& aOut) {
  nsresult rv;
  PublicKeyCredentialCreationOptionsJSON json;

  json.mRp.mId.Construct(aRpId);

  json.mRp.mName.Assign(aOptions.mRp.mName);

  json.mUser.mName.Assign(aOptions.mUser.mName);

  rv = SerializeWebAuthnData(aOptions.mUser.mId, json.mUser.mId);
  NS_ENSURE_SUCCESS(rv, rv);

  json.mUser.mDisplayName.Assign(aOptions.mUser.mDisplayName);

  rv = SerializeWebAuthnData(aOptions.mChallenge, json.mChallenge);
  NS_ENSURE_SUCCESS(rv, rv);

  json.mPubKeyCredParams = aOptions.mPubKeyCredParams;

  json.mTimeout.Construct(WebAuthnTimeout(aOptions.mTimeout));

  for (const auto& excludeCredential : aOptions.mExcludeCredentials) {
    PublicKeyCredentialDescriptorJSON* excludeCredentialJSON =
        json.mExcludeCredentials.AppendElement(fallible);
    if (!excludeCredentialJSON) {
      return NS_ERROR_OUT_OF_MEMORY;
    }
    excludeCredentialJSON->mType = excludeCredential.mType;
    rv = SerializeWebAuthnData(excludeCredential.mId,
                               excludeCredentialJSON->mId);
    NS_ENSURE_SUCCESS(rv, rv);

    if (excludeCredential.mTransports.WasPassed()) {
      excludeCredentialJSON->mTransports.Construct(
          excludeCredential.mTransports.Value());
    }
  }

  json.mAuthenticatorSelection.Construct(aOptions.mAuthenticatorSelection);

  json.mHints = aOptions.mHints;

  json.mAttestation = aOptions.mAttestation;

  AuthenticationExtensionsClientInputsJSON& extensionsJSON =
      json.mExtensions.Construct();

  if (aOptions.mExtensions.mAppid.WasPassed()) {
    extensionsJSON.mAppid.Construct(aOptions.mExtensions.mAppid.Value());
  }

  if (aOptions.mExtensions.mCredentialProtectionPolicy.WasPassed()) {
    extensionsJSON.mCredentialProtectionPolicy.Construct(
        aOptions.mExtensions.mCredentialProtectionPolicy.Value());
  }

  if (aOptions.mExtensions.mEnforceCredentialProtectionPolicy.WasPassed()) {
    extensionsJSON.mEnforceCredentialProtectionPolicy.Construct(
        aOptions.mExtensions.mEnforceCredentialProtectionPolicy.Value());
  }

  if (aOptions.mExtensions.mCredProps.WasPassed()) {
    extensionsJSON.mCredProps.Construct(
        aOptions.mExtensions.mCredProps.Value());
  }

  if (aOptions.mExtensions.mHmacCreateSecret.WasPassed()) {
    extensionsJSON.mHmacCreateSecret.Construct(
        aOptions.mExtensions.mHmacCreateSecret.Value());
  }

  if (aOptions.mExtensions.mMinPinLength.WasPassed()) {
    extensionsJSON.mMinPinLength.Construct(
        aOptions.mExtensions.mMinPinLength.Value());
  }

  if (aOptions.mExtensions.mLargeBlob.WasPassed()) {
    const AuthenticationExtensionsLargeBlobInputs& largeBlobInputs =
        aOptions.mExtensions.mLargeBlob.Value();
    AuthenticationExtensionsLargeBlobInputsJSON& largeBlobInputsJSON =
        extensionsJSON.mLargeBlob.Construct();

    if (largeBlobInputs.mSupport.WasPassed()) {
      largeBlobInputsJSON.mSupport.Construct(largeBlobInputs.mSupport.Value());
    }

    if (largeBlobInputs.mRead.WasPassed()) {
      largeBlobInputsJSON.mRead.Construct(largeBlobInputs.mRead.Value());
    }

    if (largeBlobInputs.mWrite.WasPassed()) {
      nsString write;
      rv = SerializeWebAuthnData(largeBlobInputs.mWrite.Value(), write);
      NS_ENSURE_SUCCESS(rv, rv);
      largeBlobInputsJSON.mWrite.Construct(write);
    }
  }

  if (aOptions.mExtensions.mPrf.WasPassed()) {
    const AuthenticationExtensionsPRFInputs& prfInputs =
        aOptions.mExtensions.mPrf.Value();
    AuthenticationExtensionsPRFInputsJSON& prfInputsJSON =
        extensionsJSON.mPrf.Construct();

    if (prfInputs.mEval.WasPassed()) {
      AuthenticationExtensionsPRFValuesJSON& evalJSON =
          prfInputsJSON.mEval.Construct();
      rv = SerializeWebAuthnData(prfInputs.mEval.Value().mFirst,
                                 evalJSON.mFirst);
      NS_ENSURE_SUCCESS(rv, rv);

      if (prfInputs.mEval.Value().mSecond.WasPassed()) {
        nsString second;
        rv = SerializeWebAuthnData(prfInputs.mEval.Value().mSecond.Value(),
                                   second);
        NS_ENSURE_SUCCESS(rv, rv);
        evalJSON.mSecond.Construct(second);
      }
    }

    if (prfInputs.mEvalByCredential.WasPassed()) {
      auto& evalByCredentialJSON = prfInputsJSON.mEvalByCredential.Construct();
      for (const auto& entry : prfInputs.mEvalByCredential.Value().Entries()) {
        auto* jsonEntry =
            evalByCredentialJSON.Entries().AppendElement(fallible);
        if (!jsonEntry) {
          return NS_ERROR_OUT_OF_MEMORY;
        }

        jsonEntry->mKey = entry.mKey;
        AuthenticationExtensionsPRFValuesJSON& valuesJSON = jsonEntry->mValue;

        rv = SerializeWebAuthnData(entry.mValue.mFirst, valuesJSON.mFirst);
        NS_ENSURE_SUCCESS(rv, rv);

        if (entry.mValue.mSecond.WasPassed()) {
          nsString second;
          rv = SerializeWebAuthnData(entry.mValue.mSecond.Value(), second);
          NS_ENSURE_SUCCESS(rv, rv);
          valuesJSON.mSecond.Construct(second);
        }
      }
    }
  }

  JS::Rooted<JS::Value> value(aCx);
  if (!ToJSValue(aCx, json, &value)) {
    // Callers reject the promise with a fixed error code and have no way to
    // forward a pending exception, so we must not leave one set.
    JS_ClearPendingException(aCx);
    return NS_ERROR_FAILURE;
  }

  nsAutoString jsonString;
  if (!nsContentUtils::StringifyJSON(aCx, value, jsonString,
                                     UndefinedIsNullStringLiteral)) {
    JS_ClearPendingException(aCx);
    return NS_ERROR_FAILURE;
  }

  aOut = std::move(jsonString);
  return NS_OK;
}

nsresult SerializeWebAuthnRequestOptions(
    JSContext* aCx, const nsString& aRpId,
    const PublicKeyCredentialRequestOptions& aOptions, nsString& aOut) {
  nsresult rv;
  PublicKeyCredentialRequestOptionsJSON json;

  rv = SerializeWebAuthnData(aOptions.mChallenge, json.mChallenge);
  NS_ENSURE_SUCCESS(rv, rv);

  json.mTimeout.Construct(WebAuthnTimeout(aOptions.mTimeout));

  json.mRpId.Construct(aRpId);

  for (const auto& allowCredential : aOptions.mAllowCredentials) {
    PublicKeyCredentialDescriptorJSON* allowCredentialJSON =
        json.mAllowCredentials.AppendElement(fallible);
    if (!allowCredentialJSON) {
      return NS_ERROR_OUT_OF_MEMORY;
    }
    allowCredentialJSON->mType = allowCredential.mType;
    rv = SerializeWebAuthnData(allowCredential.mId, allowCredentialJSON->mId);
    NS_ENSURE_SUCCESS(rv, rv);

    if (allowCredential.mTransports.WasPassed()) {
      allowCredentialJSON->mTransports.Construct(
          allowCredential.mTransports.Value());
    }
  }

  json.mUserVerification = aOptions.mUserVerification;

  json.mHints = aOptions.mHints;

  AuthenticationExtensionsClientInputsJSON& extensionsJSON =
      json.mExtensions.Construct();

  if (aOptions.mExtensions.mAppid.WasPassed()) {
    extensionsJSON.mAppid.Construct(aOptions.mExtensions.mAppid.Value());
  }

  if (aOptions.mExtensions.mCredProps.WasPassed()) {
    extensionsJSON.mCredProps.Construct(
        aOptions.mExtensions.mCredProps.Value());
  }

  if (aOptions.mExtensions.mHmacCreateSecret.WasPassed()) {
    extensionsJSON.mHmacCreateSecret.Construct(
        aOptions.mExtensions.mHmacCreateSecret.Value());
  }

  if (aOptions.mExtensions.mMinPinLength.WasPassed()) {
    extensionsJSON.mMinPinLength.Construct(
        aOptions.mExtensions.mMinPinLength.Value());
  }

  if (aOptions.mExtensions.mLargeBlob.WasPassed()) {
    const AuthenticationExtensionsLargeBlobInputs& largeBlobInputs =
        aOptions.mExtensions.mLargeBlob.Value();
    AuthenticationExtensionsLargeBlobInputsJSON& largeBlobInputsJSON =
        extensionsJSON.mLargeBlob.Construct();

    if (largeBlobInputs.mSupport.WasPassed()) {
      largeBlobInputsJSON.mSupport.Construct(largeBlobInputs.mSupport.Value());
    }

    if (largeBlobInputs.mRead.WasPassed()) {
      largeBlobInputsJSON.mRead.Construct(largeBlobInputs.mRead.Value());
    }

    if (largeBlobInputs.mWrite.WasPassed()) {
      nsString write;
      rv = SerializeWebAuthnData(largeBlobInputs.mWrite.Value(), write);
      NS_ENSURE_SUCCESS(rv, rv);
      largeBlobInputsJSON.mWrite.Construct(write);
    }
  }

  if (aOptions.mExtensions.mPrf.WasPassed()) {
    const AuthenticationExtensionsPRFInputs& prfInputs =
        aOptions.mExtensions.mPrf.Value();
    AuthenticationExtensionsPRFInputsJSON& prfInputsJSON =
        extensionsJSON.mPrf.Construct();

    if (prfInputs.mEval.WasPassed()) {
      AuthenticationExtensionsPRFValuesJSON& evalJSON =
          prfInputsJSON.mEval.Construct();
      rv = SerializeWebAuthnData(prfInputs.mEval.Value().mFirst,
                                 evalJSON.mFirst);
      NS_ENSURE_SUCCESS(rv, rv);

      if (prfInputs.mEval.Value().mSecond.WasPassed()) {
        nsString second;
        rv = SerializeWebAuthnData(prfInputs.mEval.Value().mSecond.Value(),
                                   second);
        NS_ENSURE_SUCCESS(rv, rv);
        evalJSON.mSecond.Construct(second);
      }
    }

    if (prfInputs.mEvalByCredential.WasPassed()) {
      auto& evalByCredentialJSON = prfInputsJSON.mEvalByCredential.Construct();
      for (const auto& entry : prfInputs.mEvalByCredential.Value().Entries()) {
        auto* jsonEntry =
            evalByCredentialJSON.Entries().AppendElement(fallible);
        if (!jsonEntry) {
          return NS_ERROR_OUT_OF_MEMORY;
        }

        jsonEntry->mKey = entry.mKey;
        AuthenticationExtensionsPRFValuesJSON& valuesJSON = jsonEntry->mValue;

        rv = SerializeWebAuthnData(entry.mValue.mFirst, valuesJSON.mFirst);
        NS_ENSURE_SUCCESS(rv, rv);

        if (entry.mValue.mSecond.WasPassed()) {
          nsString second;
          rv = SerializeWebAuthnData(entry.mValue.mSecond.Value(), second);
          NS_ENSURE_SUCCESS(rv, rv);
          valuesJSON.mSecond.Construct(second);
        }
      }
    }
  }

  JS::Rooted<JS::Value> value(aCx);
  if (!ToJSValue(aCx, json, &value)) {
    // Callers reject the promise with a fixed error code and have no way to
    // forward a pending exception, so we must not leave one set.
    JS_ClearPendingException(aCx);
    return NS_ERROR_FAILURE;
  }

  nsAutoString jsonString;
  if (!nsContentUtils::StringifyJSON(aCx, value, jsonString,
                                     UndefinedIsNullStringLiteral)) {
    JS_ClearPendingException(aCx);
    return NS_ERROR_FAILURE;
  }

  aOut = std::move(jsonString);
  return NS_OK;
}

}  // namespace mozilla::dom
