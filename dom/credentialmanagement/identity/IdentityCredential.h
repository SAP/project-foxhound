/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_IdentityCredential_h
#define mozilla_dom_IdentityCredential_h

#include "mozilla/dom/CanonicalBrowsingContext.h"
#include "mozilla/dom/Credential.h"
#include "mozilla/dom/IPCIdentityCredential.h"
#include "mozilla/MozPromise.h"
#include "mozilla/Tuple.h"

namespace mozilla::dom {

// This is the primary starting point for FedCM in the platform.
// This class is the implementation of the IdentityCredential object
// that is the value returned from the navigator.credentials.get call
// with an "identity" argument. It also includes static functions that
// perform operations that are used in constructing the credential.
class IdentityCredential final : public Credential {
 public:
  // These are promise types, all used to support the async implementation of
  // this API. All are of the form MozPromise<RefPtr<T>, nsresult>.
  // Tuples are included to shuffle additional values along, so that the
  // intermediate state is entirely in the promise chain and we don't have to
  // capture an early step's result into a callback for a subsequent promise.
  typedef MozPromise<RefPtr<IdentityCredential>, nsresult, true>
      GetIdentityCredentialPromise;
  typedef MozPromise<IPCIdentityCredential, nsresult, true>
      GetIPCIdentityCredentialPromise;
  typedef MozPromise<IdentityProvider, nsresult, true>
      GetIdentityProviderPromise;
  typedef MozPromise<bool, nsresult, true> ValidationPromise;
  typedef MozPromise<IdentityInternalManifest, nsresult, true>
      GetManifestPromise;
  typedef MozPromise<Tuple<IdentityInternalManifest, IdentityAccountList>,
                     nsresult, true>
      GetAccountListPromise;
  typedef MozPromise<Tuple<IdentityToken, IdentityAccount>, nsresult, true>
      GetTokenPromise;
  typedef MozPromise<Tuple<IdentityInternalManifest, IdentityAccount>, nsresult,
                     true>
      GetAccountPromise;
  typedef MozPromise<IdentityClientMetadata, nsresult, true> GetMetadataPromise;

  // This needs to be constructed in the context of a window
  explicit IdentityCredential(nsPIDOMWindowInner* aParent);

 protected:
  ~IdentityCredential() override;

 public:
  virtual JSObject* WrapObject(JSContext* aCx,
                               JS::Handle<JSObject*> aGivenProto) override;

  // This builds a value from an IPC-friendly version. This type is returned
  // to the caller of navigator.credentials.get, however we get an IPC friendly
  // version back from the main process to the content process.
  // This is a deep copy of the token, ID, and type.
  void CopyValuesFrom(const IPCIdentityCredential& aOther);

  // This is the inverse of CopyValuesFrom. Included for completeness.
  IPCIdentityCredential MakeIPCIdentityCredential();

  // Getter and setter for the token member of this class
  void GetToken(nsAString& aToken) const;
  void SetToken(const nsAString& aToken);

  // This function allows a relying party to send one last credentialed request
  // to the IDP when logging out. This only works if the current account state
  // in the IdentityCredentialStorageService allows logouts and clears that bit
  // when a request is sent.
  //
  //  Arguments:
  //    aGlobal: the global of the window calling this function
  //    aLogoutRequest: all of the logout requests to try to send.
  //        This is pairs of the IDP's logout url and the account
  //        ID for that IDP.
  //  Return value:
  //    a promise resolving to undefined
  //  Side effects:
  //    Will send a network request to each IDP that have a state allowing
  //        logouts and disables that bit.
  static already_AddRefed<Promise> LogoutRPs(
      GlobalObject& aGlobal,
      const Sequence<IdentityCredentialLogoutRPsRequest>& aLogoutRequests,
      ErrorResult& aRv);

  // This is the main static function called when a credential needs to be
  // fetched from the IDP. Called in the content process.
  // This is mostly a passthrough to `DiscoverFromExternalSourceInMainProcess`.
  static RefPtr<GetIdentityCredentialPromise> DiscoverFromExternalSource(
      nsPIDOMWindowInner* aParent, const CredentialRequestOptions& aOptions,
      bool aSameOriginWithAncestors);

  // Start the FedCM flow. This will start the timeout timer, fire initial
  // network requests, prompt the user, and call into CreateCredential.
  //
  //   Arguments:
  //     aPrincipal: the caller of navigator.credentials.get()'s principal
  //     aBrowsingContext: the BC of the caller of navigator.credentials.get()
  //     aOptions: argument passed to navigator.credentials.get()
  //  Return value:
  //    a promise resolving to an IPC credential with type "identity", id
  //    constructed to identify it, and token corresponding to the token
  //    fetched in FetchToken. This promise may reject with nsresult errors.
  //  Side effects:
  //    Will send network requests to the IDP. The details of which are in the
  //    other static methods here.
  static RefPtr<GetIPCIdentityCredentialPromise>
  DiscoverFromExternalSourceInMainProcess(
      nsIPrincipal* aPrincipal, CanonicalBrowsingContext* aBrowsingContext,
      const IdentityCredentialRequestOptions& aOptions);

  // Create an IPC credential that can be passed back to the content process.
  // This calls a lot of helpers to do the logic of going from a single provider
  // to a bearer token for an account at that provider.
  //
  //  Arguments:
  //    aPrincipal: the caller of navigator.credentials.get()'s principal
  //    aBrowsingContext: the BC of the caller of navigator.credentials.get()
  //    aProvider: the provider to validate the root manifest of
  //  Return value:
  //    a promise resolving to an IPC credential with type "identity", id
  //    constructed to identify it, and token corresponding to the token
  //    fetched in FetchToken. This promise may reject with nsresult errors.
  //  Side effects:
  //    Will send network requests to the IDP. The details of which are in the
  //    other static methods here.
  static RefPtr<GetIPCIdentityCredentialPromise> CreateCredential(
      nsIPrincipal* aPrincipal, BrowsingContext* aBrowsingContext,
      const IdentityProvider& aProvider);

  // Performs a Fetch for the root manifest of the provided identity provider
  // and validates it as correct. The returned promise resolves with a bool
  // that is true if everything is valid.
  //
  //  Arguments:
  //    aPrincipal: the caller of navigator.credentials.get()'s principal
  //    aProvider: the provider to validate the root manifest of
  //  Return value:
  //    promise that resolves to a bool that indicates success. Will reject
  //    when there are network or other errors.
  //  Side effects:
  //    Network request to the IDP's well-known from inside a NullPrincipal
  //    sandbox
  //
  static RefPtr<ValidationPromise> CheckRootManifest(
      nsIPrincipal* aPrincipal, const IdentityProvider& aProvider);

  // Performs a Fetch for the internal manifest of the provided identity
  // provider. The returned promise resolves with the manifest retrieved.
  //
  //  Arguments:
  //    aPrincipal: the caller of navigator.credentials.get()'s principal
  //    aProvider: the provider to fetch the root manifest
  //  Return value:
  //    promise that resolves to the internal manifest. Will reject
  //    when there are network or other errors.
  //  Side effects:
  //    Network request to the URL in aProvider as the manifest from inside a
  //    NullPrincipal sandbox
  //
  static RefPtr<GetManifestPromise> FetchInternalManifest(
      nsIPrincipal* aPrincipal, const IdentityProvider& aProvider);

  // Performs a Fetch for the account list from the provided identity
  // provider. The returned promise resolves with the manifest and the fetched
  // account list in a tuple of objects. We put the argument manifest in the
  // tuple to facilitate clean promise chaining.
  //
  //  Arguments:
  //    aPrincipal: the caller of navigator.credentials.get()'s principal
  //    aProvider: the provider to get account lists from
  //    aManifest: the provider's internal manifest
  //  Return value:
  //    promise that resolves to a Tuple of the passed manifest and the fetched
  //    account list. Will reject when there are network or other errors.
  //  Side effects:
  //    Network request to the provider supplied account endpoint with
  //    credentials but without any indication of aPrincipal.
  //
  static RefPtr<GetAccountListPromise> FetchAccountList(
      nsIPrincipal* aPrincipal, const IdentityProvider& aProvider,
      const IdentityInternalManifest& aManifest);

  // Performs a Fetch for a bearer token to the provided identity
  // provider for a given account. The returned promise resolves with the
  // account argument and the fetched token in a tuple of objects.
  // We put the argument account in the
  // tuple to facilitate clean promise chaining.
  //
  //  Arguments:
  //    aPrincipal: the caller of navigator.credentials.get()'s principal
  //    aProvider: the provider to get account lists from
  //    aManifest: the provider's internal manifest
  //    aAccount: the account to request
  //  Return value:
  //    promise that resolves to a Tuple of the passed account and the fetched
  //    token. Will reject when there are network or other errors.
  //  Side effects:
  //    Network request to the provider supplied token endpoint with
  //    credentials and including information about the requesting principal.
  //
  static RefPtr<GetTokenPromise> FetchToken(
      nsIPrincipal* aPrincipal, const IdentityProvider& aProvider,
      const IdentityInternalManifest& aManifest,
      const IdentityAccount& aAccount);

  // Performs a Fetch for links to legal info about the identity provider.
  // The returned promise resolves with the information in an object.
  //
  //  Arguments:
  //    aPrincipal: the caller of navigator.credentials.get()'s principal
  //    aProvider: the identity provider to get information from
  //    aManfiest: the identity provider's manifest
  //  Return value:
  //    promise that resolves with an object containing legal information for
  //    aProvider
  //  Side effects:
  //    Network request to the provider supplied token endpoint with
  //    credentials and including information about the requesting principal.
  //
  static RefPtr<GetMetadataPromise> FetchMetadata(
      nsIPrincipal* aPrincipal, const IdentityProvider& aProvider,
      const IdentityInternalManifest& aManifest);

  // Show the user a dialog to select what identity provider they would like
  // to try to log in with.
  //
  //   Arguments:
  //    aBrowsingContext: the BC of the caller of navigator.credentials.get()
  //    aProviders: the providers to let the user select from
  //  Return value:
  //    a promise resolving to an identity provider that the user took action
  //    to select. This promise may reject with nsresult errors.
  //  Side effects:
  //    Will show a dialog to the user.
  static RefPtr<GetIdentityProviderPromise> PromptUserToSelectProvider(
      BrowsingContext* aBrowsingContext,
      const Sequence<IdentityProvider>& aProviders);

  // Show the user a dialog to select what account they would like
  // to try to log in with.
  //
  //   Arguments:
  //    aBrowsingContext: the BC of the caller of navigator.credentials.get()
  //    aAccounts: the accounts to let the user select from
  //    aManifest: the identity provider that was chosen's manifest
  //  Return value:
  //    a promise resolving to an account that the user took action
  //    to select (and aManifest). This promise may reject with nsresult errors.
  //  Side effects:
  //    Will show a dialog to the user.
  static RefPtr<GetAccountPromise> PromptUserToSelectAccount(
      BrowsingContext* aBrowsingContext, const IdentityAccountList& aAccounts,
      const IdentityInternalManifest& aManifest);

  // Show the user a dialog to select what account they would like
  // to try to log in with.
  //
  //   Arguments:
  //    aBrowsingContext: the BC of the caller of navigator.credentials.get()
  //    aAccount: the accounts the user chose
  //    aManifest: the identity provider that was chosen's manifest
  //    aProvider: the identity provider that was chosen
  //  Return value:
  //    a promise resolving to an account that the user agreed to use (and
  //    aManifest). This promise may reject with nsresult errors. This includes
  //    if the user denied the terms and privacy policy
  //  Side effects:
  //    Will show a dialog to the user. Will send a network request to the
  //    identity provider. Modifies the IdentityCredentialStorageService state
  //    for this account.
  static RefPtr<GetAccountPromise> PromptUserWithPolicy(
      BrowsingContext* aBrowsingContext, nsIPrincipal* aPrincipal,
      const IdentityAccount& aAccount,
      const IdentityInternalManifest& aManifest,
      const IdentityProvider& aProvider);

  // Close all dialogs associated with IdentityCredential generation on the
  // provided browsing context
  //
  //   Arguments:
  //    aBrowsingContext: the BC of the caller of navigator.credentials.get()
  //  Side effects:
  //    Will close a dialog shown to the user.
  static void CloseUserInterface(BrowsingContext* aBrowsingContext);

 private:
  nsAutoString mToken;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_IdentityCredential_h
