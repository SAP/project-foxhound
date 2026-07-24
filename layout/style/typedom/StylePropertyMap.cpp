/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/StylePropertyMap.h"

#include "CSSUnsupportedValue.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSKeywordValue.h"
#include "mozilla/dom/CSSMathSum.h"
#include "mozilla/dom/CSSStyleValue.h"
#include "mozilla/dom/CSSTransformValue.h"
#include "mozilla/dom/CSSUnitValue.h"
#include "mozilla/dom/StylePropertyMapBinding.h"
#include "nsCOMPtr.h"
#include "nsCSSProps.h"
#include "nsDOMCSSDeclaration.h"
#include "nsQueryObject.h"
#include "nsString.h"
#include "nsStyledElement.h"

namespace mozilla::dom {

StylePropertyMap::StylePropertyMap(Element* aElement, bool aComputed)
    : StylePropertyMapReadOnly(aElement, aComputed) {
  MOZ_DIAGNOSTIC_ASSERT(!aComputed);
}

StylePropertyMap::StylePropertyMap(CSSStyleRule* aRule)
    : StylePropertyMapReadOnly(aRule) {}

JSObject* StylePropertyMap::WrapObject(JSContext* aCx,
                                       JS::Handle<JSObject*> aGivenProto) {
  return StylePropertyMap_Binding::Wrap(aCx, this, aGivenProto);
}

// start of StylePropertyMap Web IDL implementation

// https://drafts.css-houdini.org/css-typed-om/#dom-stylepropertymap-set
//
// XXX This is not yet fully implemented and optimized!
void StylePropertyMap::Set(
    const nsACString& aProperty,
    const Sequence<OwningCSSStyleValueOrUTF8String>& aValues,
    ErrorResult& aRv) {
  // Step 2.

  NonCustomCSSPropertyId id = nsCSSProps::LookupProperty(aProperty);
  if (id == eCSSProperty_UNKNOWN) {
    aRv.ThrowTypeError("Invalid property: "_ns + aProperty);
    return;
  }

  auto propertyId = CSSPropertyId::FromIdOrCustomProperty(id, aProperty);

  if (aValues.Length() != 1) {
    aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
    return;
  }

  const auto& styleValueOrString = aValues[0];

  if (!styleValueOrString.IsCSSStyleValue()) {
    aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
    return;
  }

  CSSStyleValue& styleValue = styleValueOrString.GetAsCSSStyleValue();

  // Step 4

  const auto* valuePropertyId = styleValue.GetPropertyId();

  if (valuePropertyId && *valuePropertyId != propertyId) {
    aRv.ThrowTypeError("Invalid type for property"_ns);
    return;
  }

  nsAutoCString cssText;

  switch (styleValue.GetStyleValueType()) {
    case CSSStyleValue::StyleValueType::TransformValue: {
      CSSTransformValue& transformValue = styleValue.GetAsCSSTransformValue();

      transformValue.ToCssTextWithProperty(propertyId, cssText);
      break;
    }

    case CSSStyleValue::StyleValueType::NumericValue: {
      CSSNumericValue& numericValue = styleValue.GetAsCSSNumericValue();

      numericValue.ToCssTextWithProperty(propertyId, cssText);
      break;
    }

    case CSSStyleValue::StyleValueType::KeywordValue: {
      CSSKeywordValue& keywordValue = styleValue.GetAsCSSKeywordValue();

      keywordValue.ToCssTextWithProperty(propertyId, cssText);
      break;
    }

    case CSSStyleValue::StyleValueType::UnsupportedValue: {
      CSSUnsupportedValue& unsupportedValue =
          styleValue.GetAsCSSUnsupportedValue();

      unsupportedValue.ToCssTextWithProperty(propertyId, cssText);
      break;
    }

    case CSSStyleValue::StyleValueType::Uninitialized:
      break;
  }

  if (cssText.IsEmpty()) {
    aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
    return;
  }

  // Step 6.

  RefPtr<nsStyledElement> styledElement = do_QueryObject(mParent);
  if (!styledElement) {
    aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
    return;
  }

  nsCOMPtr<nsDOMCSSDeclaration> declaration = styledElement->Style();

  declaration->SetProperty(aProperty, cssText, ""_ns, aRv);
}

void StylePropertyMap::Append(
    const nsACString& aProperty,
    const Sequence<OwningCSSStyleValueOrUTF8String>& aValues,
    ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void StylePropertyMap::Delete(const nsACString& aProperty, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void StylePropertyMap::Clear() {}

// end of StylePropertyMap Web IDL implementation

size_t StylePropertyMap::SizeOfIncludingThis(MallocSizeOf aMallocSizeOf) const {
  return StylePropertyMapReadOnly::SizeOfExcludingThis(aMallocSizeOf) +
         aMallocSizeOf(this);
}

}  // namespace mozilla::dom
