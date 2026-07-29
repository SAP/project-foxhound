/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_WebAuthnService_h_
#define mozilla_dom_WebAuthnService_h_

#include "AuthrsBridge_ffi.h"
#include "WebAuthnArgs.h"
#include "mozilla/StaticPrefs_security.h"
#include "mozilla/dom/WebAuthnPromiseHolder.h"
#include "nsIWebAuthnService.h"

#ifdef MOZ_WIDGET_ANDROID
#  include "AndroidWebAuthnService.h"
#endif

#ifdef XP_MACOSX
#  include "MacOSWebAuthnService.h"
#endif

#ifdef XP_WIN
#  include "WinWebAuthnService.h"
#endif

namespace mozilla::dom {

already_AddRefed<nsIWebAuthnService> NewWebAuthnService();

class WebAuthnService final : public nsIWebAuthnService {
 public:
  NS_DECL_THREADSAFE_ISUPPORTS
  NS_DECL_NSIWEBAUTHNSERVICE

  WebAuthnService() {
    (void)authrs_service_constructor(getter_AddRefs(mAuthrsService));
#if defined(XP_WIN)
    if (WinWebAuthnService::AreWebAuthNApisAvailable()) {
      mPlatformService = new WinWebAuthnService();
    } else {
      mPlatformService = mAuthrsService;
    }
#elif defined(MOZ_WIDGET_ANDROID)
    mPlatformService = new AndroidWebAuthnService();
#elif defined(XP_MACOSX)
    if (__builtin_available(macos 13.3, *)) {
      mPlatformService = NewMacOSWebAuthnServiceIfAvailable();
    }
    if (!mPlatformService) {
      mPlatformService = mAuthrsService;
    }
#else
    mPlatformService = mAuthrsService;
#endif
  }

 private:
  ~WebAuthnService() = default;

  struct TransactionState {
    nsCOMPtr<nsIWebAuthnService> service;
    uint64_t transactionId;
    Maybe<nsCOMPtr<nsIWebAuthnRegisterPromise>> parentRegisterPromise;
    Maybe<nsCOMPtr<nsIWebAuthnRegisterResult>> registerResult;
    MozPromiseRequestHolder<WebAuthnRegisterPromise> childRegisterRequest;
  };

  struct ConditionalGet {
    uint64_t transactionId;
    uint64_t browsingContextId;
    nsCOMPtr<nsIWebAuthnSignArgs> signArgs;
    nsCOMPtr<nsIWebAuthnSignPromise> signPromise;
  };

  // Main thread only:
  // The current modal operation.
  Maybe<TransactionState> mActiveTransaction;
  // Pending conditional (autofill) GetAssertion requests, at most one per
  // tab.
  nsTArray<ConditionalGet> mConditionalGets;

  void ShowAttestationConsentPrompt(const nsString& aOrigin,
                                    uint64_t aTransactionId,
                                    uint64_t aBrowsingContextId);
  void RejectActiveRegisterPromise();
  void ResetActiveTransaction();
  Maybe<ConditionalGet> TakeConditionalByTid(uint64_t aTransactionId);
  nsresult DispatchConditionalGetAssertion(const ConditionalGet& aPending,
                                           nsIWebAuthnSignArgs* aArgs);

  nsIWebAuthnService* DefaultService() {
    if (StaticPrefs::security_webauth_webauthn_enable_softtoken()) {
      return mAuthrsService;
    }
    return mPlatformService;
  }

  // Returns the authrs_bridge service. This is the default service on some
  // platforms, and it is used as a fallback to workaround platform specific
  // bugs on others. It is also used for all commands related to the WebDriver
  // Virtual Authenticator extension.
  nsIWebAuthnService* AuthrsService() { return mAuthrsService; }

  // Returns the service backing the current active transaction. The caller is
  // responsible for ensuring that there is an active transaction.
  nsIWebAuthnService* ActiveService() {
    MOZ_ASSERT(NS_IsMainThread());
    MOZ_ASSERT(mActiveTransaction.isSome());
    return mActiveTransaction.ref().service;
  }

  nsCOMPtr<nsIWebAuthnService> mAuthrsService;
  nsCOMPtr<nsIWebAuthnService> mPlatformService;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_WebAuthnService_h_
