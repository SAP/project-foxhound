/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSKeywordValue.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSKeywordValueBinding.h"

namespace mozilla::dom {

CSSKeywordValue::CSSKeywordValue(nsCOMPtr<nsISupports> aParent,
                                 const nsACString& aValue)
    : CSSStyleValue(std::move(aParent), StyleValueType::KeywordValue),
      mValue(aValue) {}

JSObject* CSSKeywordValue::WrapObject(JSContext* aCx,
                                      JS::Handle<JSObject*> aGivenProto) {
  return CSSKeywordValue_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSKeywordValue Web IDL implementation

// https://drafts.css-houdini.org/css-typed-om-1/#dom-csskeywordvalue-csskeywordvalue
//
// static
already_AddRefed<CSSKeywordValue> CSSKeywordValue::Constructor(
    const GlobalObject& aGlobal, const nsACString& aValue, ErrorResult& aRv) {
  // Step 1.

  if (aValue.IsEmpty()) {
    aRv.ThrowTypeError("CSSKeywordValue does not support empty strings");
    return nullptr;
  }

  // Step 2.

  return MakeAndAddRef<CSSKeywordValue>(aGlobal.GetAsSupports(), aValue);
}

void CSSKeywordValue::GetValue(nsCString& aRetVal) const { aRetVal = mValue; }

// https://drafts.css-houdini.org/css-typed-om-1/#dom-csskeywordvalue-value
void CSSKeywordValue::SetValue(const nsACString& aArg, ErrorResult& aRv) {
  // Step 1.

  if (aArg.IsEmpty()) {
    aRv.ThrowTypeError("CSSKeywordValue does not support empty strings");
    return;
  }

  // Step 2.

  mValue = aArg;
}

// end of CSSKeywordValue Web IDL implementation

void CSSKeywordValue::ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                                            nsACString& aDest) const {
  aDest.Append(mValue);
}

const CSSKeywordValue& CSSStyleValue::GetAsCSSKeywordValue() const {
  MOZ_DIAGNOSTIC_ASSERT(mStyleValueType == StyleValueType::KeywordValue);

  return *static_cast<const CSSKeywordValue*>(this);
}

CSSKeywordValue& CSSStyleValue::GetAsCSSKeywordValue() {
  MOZ_DIAGNOSTIC_ASSERT(mStyleValueType == StyleValueType::KeywordValue);

  return *static_cast<CSSKeywordValue*>(this);
}

}  // namespace mozilla::dom
