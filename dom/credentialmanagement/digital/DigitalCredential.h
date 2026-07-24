/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_DigitalCredential_h
#define mozilla_dom_DigitalCredential_h

#include "js/TypeDecls.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/Credential.h"
#include "nsCycleCollectionParticipant.h"
#include "nsWrapperCache.h"

namespace mozilla::dom {

class GlobalObject;

class DigitalCredential final : public Credential {
 public:
  explicit DigitalCredential(nsPIDOMWindowInner* aParent);

  virtual JSObject* WrapObject(JSContext* aCx,
                               JS::Handle<JSObject*> aGivenProto) override;

  void ToJSON(JSContext* cx, JS::MutableHandle<JSObject*> aRetVal);

  void GetProtocol(nsString& aRetVal) const;

  void GetData(JSContext* cx, JS::MutableHandle<JSObject*> aRetVal) const;

  static bool UserAgentAllowsProtocol(const GlobalObject& global,
                                      const nsAString& protocol);

 protected:
  ~DigitalCredential() override;

 private:
  nsString mProtocol;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_DigitalCredential_h
