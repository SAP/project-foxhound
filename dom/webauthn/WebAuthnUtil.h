/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_WebAuthnUtil_h
#define mozilla_dom_WebAuthnUtil_h

#include "ipc/IPCMessageUtils.h"
#include "mozilla/dom/WebAuthenticationBinding.h"

namespace mozilla::dom {

class WindowGlobalParent;

bool IsValidAppId(const nsCOMPtr<nsIPrincipal>& aPrincipal,
                  const nsCString& aAppId);

bool IsWebAuthnAllowedInDocument(const nsCOMPtr<Document>& aDoc);

bool IsWebAuthnAllowedInContext(WindowGlobalParent* aContext);

bool IsWebAuthnAllowedForTransportSecurityInfo(
    nsITransportSecurityInfo* aSecurityInfo);

nsresult DefaultRpId(const nsCOMPtr<nsIPrincipal>& aPrincipal,
                     /* out */ nsACString& aRpId);

bool IsValidRpId(const nsCOMPtr<nsIPrincipal>& aPrincipal,
                 const nsACString& aRpId);

nsresult HashCString(const nsACString& aIn, /* out */ nsTArray<uint8_t>& aOut);

uint32_t WebAuthnTimeout(const Optional<uint32_t>& aTimeout);

nsresult SerializeWebAuthnCreationOptions(
    JSContext* aCx, const nsString& aRpId,
    const PublicKeyCredentialCreationOptions& aOptions,
    /* out */ nsString& aOut);

nsresult SerializeWebAuthnRequestOptions(
    JSContext* aCx, const nsString& aRpId,
    const PublicKeyCredentialRequestOptions& aOptions,
    /* out */ nsString& aOut);

}  // namespace mozilla::dom

#endif  // mozilla_dom_WebAuthnUtil_h
