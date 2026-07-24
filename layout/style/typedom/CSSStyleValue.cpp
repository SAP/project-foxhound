/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSStyleValue.h"

#include "CSSUnsupportedValue.h"
#include "mozilla/Assertions.h"
#include "mozilla/CSSPropertyId.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/dom/CSSKeywordValue.h"
#include "mozilla/dom/CSSNumericValue.h"
#include "mozilla/dom/CSSStyleValueBinding.h"
#include "mozilla/dom/CSSTransformValue.h"
#include "nsCycleCollectionParticipant.h"
#include "nsString.h"

namespace mozilla::dom {

CSSStyleValue::CSSStyleValue(nsCOMPtr<nsISupports> aParent)
    : mParent(std::move(aParent)),
      mStyleValueType(StyleValueType::Uninitialized) {
  MOZ_ASSERT(mParent);
}

CSSStyleValue::CSSStyleValue(nsCOMPtr<nsISupports> aParent,
                             StyleValueType aStyleValueType)
    : mParent(std::move(aParent)), mStyleValueType(aStyleValueType) {
  MOZ_ASSERT(mParent);
}

NS_IMPL_CYCLE_COLLECTING_ADDREF(CSSStyleValue)
NS_IMPL_CYCLE_COLLECTING_RELEASE(CSSStyleValue)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(CSSStyleValue)
  NS_WRAPPERCACHE_INTERFACE_MAP_ENTRY
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END
NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE(CSSStyleValue, mParent)

nsISupports* CSSStyleValue::GetParentObject() const { return mParent; }

JSObject* CSSStyleValue::WrapObject(JSContext* aCx,
                                    JS::Handle<JSObject*> aGivenProto) {
  return CSSStyleValue_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSStyleValue Web IDL implementation

// static
RefPtr<CSSStyleValue> CSSStyleValue::Parse(const GlobalObject& aGlobal,
                                           const nsACString& aProperty,
                                           const nsACString& aCssText,
                                           ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
  return nullptr;
}

// static
void CSSStyleValue::ParseAll(const GlobalObject& aGlobal,
                             const nsACString& aProperty,
                             const nsACString& aCssText,
                             nsTArray<RefPtr<CSSStyleValue>>& aRetVal,
                             ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSStyleValue::Stringify(nsACString& aRetVal) const {
  const CSSPropertyId* propertyId = GetPropertyId();
  ToCssTextWithProperty(
      propertyId ? *propertyId : CSSPropertyId(eCSSProperty_UNKNOWN), aRetVal);
}

// end of CSSStyleValue Web IDL implementation

bool CSSStyleValue::IsCSSUnsupportedValue() const {
  return mStyleValueType == StyleValueType::UnsupportedValue;
}

bool CSSStyleValue::IsCSSKeywordValue() const {
  return mStyleValueType == StyleValueType::KeywordValue;
}

bool CSSStyleValue::IsCSSNumericValue() const {
  return mStyleValueType == StyleValueType::NumericValue;
}

bool CSSStyleValue::IsCSSTransformValue() const {
  return mStyleValueType == StyleValueType::TransformValue;
}

void CSSStyleValue::ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                                          nsACString& aDest) const {
  switch (GetStyleValueType()) {
    case StyleValueType::TransformValue: {
      const CSSTransformValue& transformValue = GetAsCSSTransformValue();

      transformValue.ToCssTextWithProperty(aPropertyId, aDest);
      break;
    }

    case StyleValueType::NumericValue: {
      const CSSNumericValue& numericValue = GetAsCSSNumericValue();

      numericValue.ToCssTextWithProperty(aPropertyId, aDest);
      break;
    }

    case StyleValueType::KeywordValue: {
      const CSSKeywordValue& keywordValue = GetAsCSSKeywordValue();

      keywordValue.ToCssTextWithProperty(aPropertyId, aDest);
      break;
    }

    case StyleValueType::UnsupportedValue: {
      const CSSUnsupportedValue& unsupportedValue = GetAsCSSUnsupportedValue();

      unsupportedValue.ToCssTextWithProperty(aPropertyId, aDest);
      break;
    }

    case StyleValueType::Uninitialized:
      break;
  }
}

}  // namespace mozilla::dom
