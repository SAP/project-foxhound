/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_U2FTokenTransport_h
#define mozilla_dom_U2FTokenTransport_h

#include "mozilla/dom/PWebAuthnTransaction.h"
#include "mozilla/MozPromise.h"

/*
 * Abstract class representing a transport manager for U2F Keys (software,
 * bluetooth, usb, etc.). Hides the implementation details for specific key
 * transport types.
 */

struct rust_ctap2_status_update_res;

namespace mozilla::dom {

class WebAuthnGetAssertionResultWrapper {
 public:
  WebAuthnGetAssertionResult assertion;
  mozilla::Maybe<nsCString> username;
};

typedef MozPromise<WebAuthnMakeCredentialResult, nsresult, true>
    U2FRegisterPromise;
typedef MozPromise<nsTArray<WebAuthnGetAssertionResultWrapper>, nsresult, true>
    U2FSignPromise;

class U2FTokenTransport {
 public:
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(U2FTokenTransport);
  U2FTokenTransport() = default;

  virtual RefPtr<U2FRegisterPromise> Register(
      const WebAuthnMakeCredentialInfo& aInfo, bool aForceNoneAttestation,
      void status_callback(rust_ctap2_status_update_res*)) = 0;

  virtual RefPtr<U2FSignPromise> Sign(
      const WebAuthnGetAssertionInfo& aInfo,
      void status_callback(rust_ctap2_status_update_res*)) = 0;

  virtual void Cancel() = 0;

  virtual void Drop() {}

 protected:
  virtual ~U2FTokenTransport() = default;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_U2FTokenTransport_h
