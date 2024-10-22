/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/Services.h"
#include "mozilla/StaticPrefs_security.h"
#include "nsIObserverService.h"
#include "nsThreadUtils.h"
#include "WebAuthnService.h"
#include "WebAuthnTransportIdentifiers.h"

namespace mozilla::dom {

already_AddRefed<nsIWebAuthnService> NewWebAuthnService() {
  nsCOMPtr<nsIWebAuthnService> webauthnService(new WebAuthnService());
  return webauthnService.forget();
}

NS_IMPL_ISUPPORTS(WebAuthnService, nsIWebAuthnService)

NS_IMETHODIMP
WebAuthnService::MakeCredential(uint64_t aTransactionId,
                                uint64_t browsingContextId,
                                nsIWebAuthnRegisterArgs* aArgs,
                                nsIWebAuthnRegisterPromise* aPromise) {
  auto guard = mTransactionState.Lock();
  if (guard->isSome()) {
    guard->ref().service->Reset();
    *guard = Nothing();
  }
  *guard = Some(TransactionState{DefaultService()});
  return guard->ref().service->MakeCredential(aTransactionId, browsingContextId,
                                              aArgs, aPromise);
}

NS_IMETHODIMP
WebAuthnService::GetAssertion(uint64_t aTransactionId,
                              uint64_t browsingContextId,
                              nsIWebAuthnSignArgs* aArgs,
                              nsIWebAuthnSignPromise* aPromise) {
  auto guard = mTransactionState.Lock();
  if (guard->isSome()) {
    guard->ref().service->Reset();
    *guard = Nothing();
  }
  *guard = Some(TransactionState{DefaultService()});
  nsresult rv;

#if defined(XP_MACOSX)
  // The macOS security key API doesn't handle the AppID extension. So we'll
  // use authenticator-rs if it's likely that the request requires AppID. We
  // consider it likely if 1) the AppID extension is present, 2) the allow list
  // is non-empty, and 3) none of the allowed credentials use the
  // "internal" or "hybrid" transport.
  nsString appId;
  rv = aArgs->GetAppId(appId);
  if (rv == NS_OK) {  // AppID is set
    uint8_t transportSet = 0;
    nsTArray<uint8_t> allowListTransports;
    Unused << aArgs->GetAllowListTransports(allowListTransports);
    for (const uint8_t& transport : allowListTransports) {
      transportSet |= transport;
    }
    uint8_t passkeyTransportMask =
        MOZ_WEBAUTHN_AUTHENTICATOR_TRANSPORT_ID_INTERNAL |
        MOZ_WEBAUTHN_AUTHENTICATOR_TRANSPORT_ID_HYBRID;
    if (allowListTransports.Length() > 0 &&
        (transportSet & passkeyTransportMask) == 0) {
      guard->ref().service = AuthrsService();
    }
  }
#endif

  rv = guard->ref().service->GetAssertion(aTransactionId, browsingContextId,
                                          aArgs, aPromise);
  if (NS_FAILED(rv)) {
    return rv;
  }

  // If this is a conditionally mediated request, notify observers that there
  // is a pending transaction. This is mainly useful in tests.
  bool conditionallyMediated;
  Unused << aArgs->GetConditionallyMediated(&conditionallyMediated);
  if (conditionallyMediated) {
    nsCOMPtr<nsIRunnable> runnable(NS_NewRunnableFunction(__func__, []() {
      nsCOMPtr<nsIObserverService> os = mozilla::services::GetObserverService();
      if (os) {
        os->NotifyObservers(nullptr, "webauthn:conditional-get-pending",
                            nullptr);
      }
    }));
    NS_DispatchToMainThread(runnable.forget());
  }

  return NS_OK;
}

NS_IMETHODIMP
WebAuthnService::GetIsUVPAA(bool* aAvailable) {
  return DefaultService()->GetIsUVPAA(aAvailable);
}

NS_IMETHODIMP
WebAuthnService::HasPendingConditionalGet(uint64_t aBrowsingContextId,
                                          const nsAString& aOrigin,
                                          uint64_t* aRv) {
  return SelectedService()->HasPendingConditionalGet(aBrowsingContextId,
                                                     aOrigin, aRv);
}

NS_IMETHODIMP
WebAuthnService::GetAutoFillEntries(
    uint64_t aTransactionId, nsTArray<RefPtr<nsIWebAuthnAutoFillEntry>>& aRv) {
  return SelectedService()->GetAutoFillEntries(aTransactionId, aRv);
}

NS_IMETHODIMP
WebAuthnService::SelectAutoFillEntry(uint64_t aTransactionId,
                                     const nsTArray<uint8_t>& aCredentialId) {
  return SelectedService()->SelectAutoFillEntry(aTransactionId, aCredentialId);
}

NS_IMETHODIMP
WebAuthnService::ResumeConditionalGet(uint64_t aTransactionId) {
  return SelectedService()->ResumeConditionalGet(aTransactionId);
}

NS_IMETHODIMP
WebAuthnService::Reset() {
  auto guard = mTransactionState.Lock();
  if (guard->isSome()) {
    guard->ref().service->Reset();
  }
  *guard = Nothing();
  return NS_OK;
}

NS_IMETHODIMP
WebAuthnService::Cancel(uint64_t aTransactionId) {
  return SelectedService()->Cancel(aTransactionId);
}

NS_IMETHODIMP
WebAuthnService::PinCallback(uint64_t aTransactionId, const nsACString& aPin) {
  return SelectedService()->PinCallback(aTransactionId, aPin);
}

NS_IMETHODIMP
WebAuthnService::ResumeMakeCredential(uint64_t aTransactionId,
                                      bool aForceNoneAttestation) {
  return SelectedService()->ResumeMakeCredential(aTransactionId,
                                                 aForceNoneAttestation);
}

NS_IMETHODIMP
WebAuthnService::SelectionCallback(uint64_t aTransactionId, uint64_t aIndex) {
  return SelectedService()->SelectionCallback(aTransactionId, aIndex);
}

NS_IMETHODIMP
WebAuthnService::AddVirtualAuthenticator(
    const nsACString& protocol, const nsACString& transport,
    bool hasResidentKey, bool hasUserVerification, bool isUserConsenting,
    bool isUserVerified, uint64_t* retval) {
  return SelectedService()->AddVirtualAuthenticator(
      protocol, transport, hasResidentKey, hasUserVerification,
      isUserConsenting, isUserVerified, retval);
}

NS_IMETHODIMP
WebAuthnService::RemoveVirtualAuthenticator(uint64_t authenticatorId) {
  return SelectedService()->RemoveVirtualAuthenticator(authenticatorId);
}

NS_IMETHODIMP
WebAuthnService::AddCredential(uint64_t authenticatorId,
                               const nsACString& credentialId,
                               bool isResidentCredential,
                               const nsACString& rpId,
                               const nsACString& privateKey,
                               const nsACString& userHandle,
                               uint32_t signCount) {
  return SelectedService()->AddCredential(authenticatorId, credentialId,
                                          isResidentCredential, rpId,
                                          privateKey, userHandle, signCount);
}

NS_IMETHODIMP
WebAuthnService::GetCredentials(
    uint64_t authenticatorId,
    nsTArray<RefPtr<nsICredentialParameters>>& retval) {
  return SelectedService()->GetCredentials(authenticatorId, retval);
}

NS_IMETHODIMP
WebAuthnService::RemoveCredential(uint64_t authenticatorId,
                                  const nsACString& credentialId) {
  return SelectedService()->RemoveCredential(authenticatorId, credentialId);
}

NS_IMETHODIMP
WebAuthnService::RemoveAllCredentials(uint64_t authenticatorId) {
  return SelectedService()->RemoveAllCredentials(authenticatorId);
}

NS_IMETHODIMP
WebAuthnService::SetUserVerified(uint64_t authenticatorId,
                                 bool isUserVerified) {
  return SelectedService()->SetUserVerified(authenticatorId, isUserVerified);
}

NS_IMETHODIMP
WebAuthnService::Listen() { return SelectedService()->Listen(); }

NS_IMETHODIMP
WebAuthnService::RunCommand(const nsACString& cmd) {
  return SelectedService()->RunCommand(cmd);
}

}  // namespace mozilla::dom
