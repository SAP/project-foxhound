/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/DigitalCredential.h"

#include "mozilla/dom/DigitalCredentialBinding.h"

namespace mozilla::dom {

DigitalCredential::~DigitalCredential() = default;

DigitalCredential::DigitalCredential(nsPIDOMWindowInner* aParent)
    : Credential(aParent) {}

JSObject* DigitalCredential::WrapObject(JSContext* aCx,
                                        JS::Handle<JSObject*> aGivenProto) {
  return DigitalCredential_Binding::Wrap(aCx, this, aGivenProto);
}

void DigitalCredential::ToJSON(JSContext* cx,
                               JS::MutableHandle<JSObject*> aRetVal) {}

void DigitalCredential::GetProtocol(nsString& aRetVal) const {
  aRetVal.Assign(mProtocol);
}

void DigitalCredential::GetData(JSContext* cx,
                                JS::MutableHandle<JSObject*> aRetVal) const {}

/* static */
bool DigitalCredential::UserAgentAllowsProtocol(const GlobalObject& global,
                                                const nsAString& protocol) {
  return false;
}

}  // namespace mozilla::dom
