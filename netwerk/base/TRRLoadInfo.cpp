/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "TRRLoadInfo.h"
#include "mozilla/dom/ClientSource.h"
#include "mozilla/dom/FeaturePolicy.h"
#include "mozilla/dom/DOMTypes.h"
#include "nsContentUtils.h"
#include "nsIRedirectHistoryEntry.h"
#include "LoadInfo.h"

using namespace mozilla::dom;

namespace mozilla {
namespace net {

NS_IMPL_ISUPPORTS(TRRLoadInfo, nsILoadInfo)

TRRLoadInfo::TRRLoadInfo(nsIURI* aResultPrincipalURI,
                         nsContentPolicyType aContentPolicyType)
    : mResultPrincipalURI(aResultPrincipalURI),
      mInternalContentPolicyType(aContentPolicyType) {}

already_AddRefed<nsILoadInfo> TRRLoadInfo::Clone() const {
  nsCOMPtr<nsILoadInfo> loadInfo =
      new TRRLoadInfo(mResultPrincipalURI, mInternalContentPolicyType);

  return loadInfo.forget();
}

NS_IMETHODIMP
TRRLoadInfo::GetLoadingPrincipal(nsIPrincipal** aLoadingPrincipal) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

nsIPrincipal* TRRLoadInfo::VirtualGetLoadingPrincipal() { return nullptr; }

NS_IMETHODIMP
TRRLoadInfo::GetTriggeringPrincipal(nsIPrincipal** aTriggeringPrincipal) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::SetTriggeringPrincipalForTesting(
    nsIPrincipal* aTriggeringPrincipal) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

nsIPrincipal* TRRLoadInfo::TriggeringPrincipal() { return nullptr; }

NS_IMETHODIMP
TRRLoadInfo::GetPrincipalToInherit(nsIPrincipal** aPrincipalToInherit) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::SetPrincipalToInherit(nsIPrincipal* aPrincipalToInherit) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetUserNavigationInvolvement(uint8_t* aUserNavigationInvolvement) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::SetUserNavigationInvolvement(uint8_t aUserNavigationInvolvement) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

nsIPrincipal* TRRLoadInfo::PrincipalToInherit() { return nullptr; }

nsIPrincipal* TRRLoadInfo::FindPrincipalToInherit(nsIChannel* aChannel) {
  return nullptr;
}

const nsID& TRRLoadInfo::GetSandboxedNullPrincipalID() {
  return mSandboxedNullPrincipalID;
}

void TRRLoadInfo::ResetSandboxedNullPrincipalID() {}

nsIPrincipal* TRRLoadInfo::GetTopLevelPrincipal() { return nullptr; }

NS_IMETHODIMP
TRRLoadInfo::GetTriggeringRemoteType(nsACString& aTriggeringRemoteType) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::SetTriggeringRemoteType(const nsACString& aTriggeringRemoteType) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetLoadingDocument(Document** aResult) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

nsINode* TRRLoadInfo::LoadingNode() { return nullptr; }

already_AddRefed<nsISupports> TRRLoadInfo::ContextForTopLevelLoad() {
  return nullptr;
}

already_AddRefed<nsISupports> TRRLoadInfo::GetLoadingContext() {
  return nullptr;
}

NS_IMETHODIMP
TRRLoadInfo::GetLoadingContextXPCOM(nsISupports** aResult) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetSecurityFlags(nsSecurityFlags* aResult) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetSandboxFlags(uint32_t* aResult) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetSecurityMode(uint32_t* aFlags) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetIsInThirdPartyContext(bool* aIsInThirdPartyContext) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::SetIsInThirdPartyContext(bool aIsInThirdPartyContext) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetIsThirdPartyContextToTopWindow(
    bool* aIsThirdPartyContextToTopWindow) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::SetIsThirdPartyContextToTopWindow(
    bool aIsThirdPartyContextToTopWindow) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetCookiePolicy(uint32_t* aResult) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetCookieJarSettings(nsICookieJarSettings** aCookieJarSettings) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::SetCookieJarSettings(nsICookieJarSettings* aCookieJarSettings) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

const Maybe<RFPTargetSet>& TRRLoadInfo::GetOverriddenFingerprintingSettings() {
  return mOverriddenFingerprintingSettings;
}

void TRRLoadInfo::SetOverriddenFingerprintingSettings(RFPTargetSet aTargets) {}

NS_IMETHODIMP
TRRLoadInfo::GetForceInheritPrincipal(bool* aInheritPrincipal) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetForceInheritPrincipalOverruleOwner(bool* aInheritPrincipal) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetLoadingSandboxed(bool* aLoadingSandboxed) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetAboutBlankInherits(bool* aResult) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetAllowChrome(bool* aResult) { return NS_ERROR_NOT_IMPLEMENTED; }

NS_IMETHODIMP
TRRLoadInfo::GetDisallowScript(bool* aResult) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetDontFollowRedirects(bool* aResult) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetLoadErrorPage(bool* aResult) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetExternalContentPolicyType(nsContentPolicyType* aResult) {
  // We have to use nsContentPolicyType because ExtContentPolicyType is not
  // visible from xpidl.
  *aResult = static_cast<nsContentPolicyType>(
      nsContentUtils::InternalContentPolicyTypeToExternal(
          mInternalContentPolicyType));
  return NS_OK;
}

nsContentPolicyType TRRLoadInfo::InternalContentPolicyType() {
  return mInternalContentPolicyType;
}

#define DEFINE_GETTER(type, name, _n, _d)               \
  NS_IMETHODIMP TRRLoadInfo::Get##name(type* a##name) { \
    return NS_ERROR_NOT_IMPLEMENTED;                    \
  }

#define DEFINE_SETTER(type, name)                      \
  NS_IMETHODIMP TRRLoadInfo::Set##name(type a##name) { \
    return NS_ERROR_NOT_IMPLEMENTED;                   \
  }

LOADINFO_FOR_EACH_FIELD(DEFINE_GETTER, DEFINE_SETTER);

#undef DEFINE_GETTER
#undef DEFINE_SETTER

NS_IMETHODIMP
TRRLoadInfo::GetWorkerAssociatedBrowsingContextID(uint64_t* aResult) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::SetWorkerAssociatedBrowsingContextID(uint64_t aResult) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetTargetBrowsingContextID(uint64_t* aResult) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetBrowsingContext(dom::BrowsingContext** aResult) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetWorkerAssociatedBrowsingContext(
    dom::BrowsingContext** aResult) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetFrameBrowsingContext(dom::BrowsingContext** aResult) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetTargetBrowsingContext(dom::BrowsingContext** aResult) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetScriptableOriginAttributes(
    JSContext* aCx, JS::MutableHandle<JS::Value> aOriginAttributes) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::ResetPrincipalToInheritToNullPrincipal() {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::SetScriptableOriginAttributes(
    JSContext* aCx, JS::Handle<JS::Value> aOriginAttributes) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

nsresult TRRLoadInfo::GetOriginAttributes(
    mozilla::OriginAttributes* aOriginAttributes) {
  NS_ENSURE_ARG(aOriginAttributes);
  *aOriginAttributes = mOriginAttributes;
  return NS_OK;
}

nsresult TRRLoadInfo::SetOriginAttributes(
    const mozilla::OriginAttributes& aOriginAttributes) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::SetInitialSecurityCheckDone(bool aInitialSecurityCheckDone) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetInitialSecurityCheckDone(bool* aResult) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::AppendRedirectHistoryEntry(nsIChannel* aChannelToDeriveFrom,
                                        bool aIsInternalRedirect) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetRedirectChainIncludingInternalRedirects(
    JSContext* aCx, JS::MutableHandle<JS::Value> aChain) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

const nsTArray<nsCOMPtr<nsIRedirectHistoryEntry>>&
TRRLoadInfo::RedirectChainIncludingInternalRedirects() {
  return mEmptyRedirectChain;
}

NS_IMETHODIMP
TRRLoadInfo::GetRedirectChain(JSContext* aCx,
                              JS::MutableHandle<JS::Value> aChain) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

const nsTArray<nsCOMPtr<nsIRedirectHistoryEntry>>&
TRRLoadInfo::RedirectChain() {
  return mEmptyRedirectChain;
}

const nsTArray<nsCOMPtr<nsIPrincipal>>& TRRLoadInfo::AncestorPrincipals() {
  return mEmptyPrincipals;
}

const nsTArray<uint64_t>& TRRLoadInfo::AncestorBrowsingContextIDs() {
  return mEmptyBrowsingContextIDs;
}

void TRRLoadInfo::SetCorsPreflightInfo(const nsTArray<nsCString>& aHeaders,
                                       bool aForcePreflight) {}

const nsTArray<nsCString>& TRRLoadInfo::CorsUnsafeHeaders() {
  return mCorsUnsafeHeaders;
}

NS_IMETHODIMP
TRRLoadInfo::SetLoadTriggeredFromExternal(bool aLoadTriggeredFromExternal) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetLoadTriggeredFromExternal(bool* aLoadTriggeredFromExternal) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetTainting(uint32_t* aTaintingOut) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::MaybeIncreaseTainting(uint32_t aTainting) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

void TRRLoadInfo::SynthesizeServiceWorkerTainting(LoadTainting aTainting) {}

NS_IMETHODIMP
TRRLoadInfo::GetCspNonce(nsAString& aCspNonce) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::SetCspNonce(const nsAString& aCspNonce) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetIntegrityMetadata(nsAString& aIntegrityMetadata) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::SetIntegrityMetadata(const nsAString& aIntegrityMetadata) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetIsTopLevelLoad(bool* aResult) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetResultPrincipalURI(nsIURI** aURI) {
  nsCOMPtr<nsIURI> uri = mResultPrincipalURI;
  uri.forget(aURI);
  return NS_OK;
}

NS_IMETHODIMP
TRRLoadInfo::SetResultPrincipalURI(nsIURI* aURI) {
  mResultPrincipalURI = aURI;
  return NS_OK;
}

NS_IMETHODIMP
TRRLoadInfo::GetChannelCreationOriginalURI(nsIURI** aURI) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::SetChannelCreationOriginalURI(nsIURI* aURI) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

void TRRLoadInfo::SetClientInfo(const ClientInfo& aClientInfo) {}

const Maybe<ClientInfo>& TRRLoadInfo::GetClientInfo() { return mClientInfo; }

void TRRLoadInfo::GiveReservedClientSource(
    UniquePtr<ClientSource>&& aClientSource) {}

UniquePtr<ClientSource> TRRLoadInfo::TakeReservedClientSource() {
  return nullptr;
}

void TRRLoadInfo::SetReservedClientInfo(const ClientInfo& aClientInfo) {}

void TRRLoadInfo::OverrideReservedClientInfoInParent(
    const ClientInfo& aClientInfo) {}

const Maybe<ClientInfo>& TRRLoadInfo::GetReservedClientInfo() {
  return mReservedClientInfo;
}

void TRRLoadInfo::SetInitialClientInfo(const ClientInfo& aClientInfo) {}

const Maybe<ClientInfo>& TRRLoadInfo::GetInitialClientInfo() {
  return mInitialClientInfo;
}

void TRRLoadInfo::SetController(const ServiceWorkerDescriptor& aServiceWorker) {
}

void TRRLoadInfo::ClearController() {}

const Maybe<ServiceWorkerDescriptor>& TRRLoadInfo::GetController() {
  return mController;
}

void TRRLoadInfo::SetPerformanceStorage(
    PerformanceStorage* aPerformanceStorage) {}

PerformanceStorage* TRRLoadInfo::GetPerformanceStorage() { return nullptr; }

NS_IMETHODIMP
TRRLoadInfo::GetCspEventListener(nsICSPEventListener** aCSPEventListener) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::SetCspEventListener(nsICSPEventListener* aCSPEventListener) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

already_AddRefed<nsIContentSecurityPolicy> TRRLoadInfo::GetPreloadCsp() {
  return nullptr;
}

already_AddRefed<nsIPolicyContainer> TRRLoadInfo::GetPolicyContainer() {
  return nullptr;
}

already_AddRefed<nsIPolicyContainer>
TRRLoadInfo::GetPolicyContainerToInherit() {
  return nullptr;
}

Maybe<FeaturePolicyInfo> TRRLoadInfo::GetContainerFeaturePolicyInfo() {
  return Nothing();
}

void TRRLoadInfo::SetContainerFeaturePolicyInfo(
    const FeaturePolicyInfo& aContainerFeaturePolicyInfo) {}

NS_IMETHODIMP
TRRLoadInfo::GetIsSameDocumentNavigation(bool* aTextDirectiveUserActivation) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::SetIsSameDocumentNavigation(bool aTextDirectiveUserActivation) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetInternalContentPolicyType(nsContentPolicyType* aResult) {
  *aResult = mInternalContentPolicyType;
  return NS_OK;
}
NS_IMETHODIMP
TRRLoadInfo::GetIsUserTriggeredSave(bool* aIsUserTriggeredSave) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::SetIsUserTriggeredSave(bool aIsUserTriggeredSave) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetUnstrippedURI(nsIURI** aURI) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::SetUnstrippedURI(nsIURI* aURI) { return NS_ERROR_NOT_IMPLEMENTED; }

nsIInterceptionInfo* TRRLoadInfo::InterceptionInfo() { return nullptr; }
void TRRLoadInfo::SetInterceptionInfo(nsIInterceptionInfo* aPrincipla) {}

NS_IMETHODIMP
TRRLoadInfo::GetSchemelessInput(
    nsILoadInfo::SchemelessInputType* aSchemelessInput) {
  *aSchemelessInput = nsILoadInfo::SchemelessInputTypeUnset;
  return NS_OK;
}

NS_IMETHODIMP
TRRLoadInfo::SetSchemelessInput(
    nsILoadInfo::SchemelessInputType aSchemelessInput) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetSkipHTTPSUpgrade(bool* aSkipHTTPSUpgrade) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::SetSkipHTTPSUpgrade(bool aSkipHTTPSUpgrade) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
TRRLoadInfo::GetFetchDestination(nsACString& aDestination) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

}  // namespace net
}  // namespace mozilla
