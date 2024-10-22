/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_SECURITY_TRUSTED_TYPES_TRUSTEDTYPEPOLICY_H_
#define DOM_SECURITY_TRUSTED_TYPES_TRUSTEDTYPEPOLICY_H_

#include "js/TypeDecls.h"
#include "js/Value.h"
#include "mozilla/RefPtr.h"
#include "mozilla/UniquePtr.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/DOMString.h"
#include "mozilla/dom/TrustedHTML.h"
#include "mozilla/dom/TrustedScript.h"
#include "mozilla/dom/TrustedScriptURL.h"
#include "nsISupportsImpl.h"
#include "nsStringFwd.h"
#include "nsWrapperCache.h"

namespace mozilla::dom {

class TrustedTypePolicyFactory;

// https://w3c.github.io/trusted-types/dist/spec/#trusted-type-policy
class TrustedTypePolicy : public nsWrapperCache {
 public:
  NS_INLINE_DECL_CYCLE_COLLECTING_NATIVE_REFCOUNTING(TrustedTypePolicy)
  NS_DECL_CYCLE_COLLECTION_NATIVE_WRAPPERCACHE_CLASS(TrustedTypePolicy)

  explicit TrustedTypePolicy(TrustedTypePolicyFactory* aParentObject)
      : mParentObject{aParentObject} {}

  // Required for Web IDL binding.
  TrustedTypePolicyFactory* GetParentObject() const { return mParentObject; }

  // Required for Web IDL binding.
  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // https://w3c.github.io/trusted-types/dist/spec/#trustedtypepolicy-name
  void GetName(DOMString& aResult) const {
    // TODO: impl.
  }

  // https://w3c.github.io/trusted-types/dist/spec/#dom-trustedtypepolicy-createhtml
  UniquePtr<TrustedHTML> CreateHTML(
      JSContext* aJSContext, const nsAString& aInput,
      const Sequence<JS::Value>& aArguments) const;

  // https://w3c.github.io/trusted-types/dist/spec/#dom-trustedtypepolicy-createscript
  UniquePtr<TrustedScript> CreateScript(
      JSContext* aJSContext, const nsAString& aInput,
      const Sequence<JS::Value>& aArguments) const;

  // https://w3c.github.io/trusted-types/dist/spec/#dom-trustedtypepolicy-createscripturl
  UniquePtr<TrustedScriptURL> CreateScriptURL(
      JSContext* aJSContext, const nsAString& aInput,
      const Sequence<JS::Value>& aArguments) const;

 private:
  // Required because this class is ref-counted.
  virtual ~TrustedTypePolicy() = default;

  RefPtr<TrustedTypePolicyFactory> mParentObject;
};

}  // namespace mozilla::dom

#endif  // DOM_SECURITY_TRUSTED_TYPES_TRUSTEDTYPEPOLICY_H_
