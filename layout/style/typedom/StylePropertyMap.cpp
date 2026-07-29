/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/StylePropertyMap.h"

#include "mozilla/CSSPropertyId.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/URLExtraData.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSStyleRule.h"
#include "mozilla/dom/CSSStyleValue.h"
#include "mozilla/dom/StylePropertyMapBinding.h"
#include "nsCOMPtr.h"
#include "nsCSSProps.h"
#include "nsDOMCSSDeclaration.h"
#include "nsQueryObject.h"
#include "nsString.h"
#include "nsStyledElement.h"

namespace mozilla::dom {

namespace {

template <typename Source>
struct DeclarationTraits;

// Specialization for inline style (specified values)
struct MutableInlineStyleDeclarations {};

template <>
struct DeclarationTraits<MutableInlineStyleDeclarations> {
  static void Set(nsStyledElement* aStyledElement,
                  const CSSPropertyId& aPropertyId, const nsACString& aValue,
                  ErrorResult& aRv) {
    MOZ_ASSERT(aStyledElement);

    nsCOMPtr<nsDOMCSSDeclaration> declaration = aStyledElement->Style();

    declaration->SetPropertyTypedValue(aPropertyId, aValue, aRv);
  }
};

// Specialization for style rule
struct MutableStyleRuleDeclarations {};

template <>
struct DeclarationTraits<MutableStyleRuleDeclarations> {
  static void Set(CSSStyleRule* aRule, const CSSPropertyId& aPropertyId,
                  const nsACString& aValue, ErrorResult& aRv) {
    MOZ_ASSERT(aRule);

    nsCOMPtr<nsDOMCSSDeclaration> declaration = aRule->Style();

    declaration->SetPropertyTypedValue(aPropertyId, aValue, aRv);
  }
};

}  // namespace

StylePropertyMap::StylePropertyMap(nsStyledElement* aStyledElement)
    : StylePropertyMapReadOnly(aStyledElement) {}

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

  RefPtr<CSSStyleValue> styleValue;

  if (styleValueOrString.IsCSSStyleValue()) {
    styleValue = styleValueOrString.GetAsCSSStyleValue();
  } else {
    RefPtr<URLExtraData> urlExtraData = mDeclarations.GetURLExtraData();
    if (!urlExtraData) {
      aRv.Throw(NS_ERROR_NOT_AVAILABLE);
      return;
    }

    styleValue = CSSStyleValue::ParseStyleValue(
        mParent, aProperty, styleValueOrString.GetAsUTF8String(), urlExtraData,
        /* aStyleValues */ nullptr, aRv);
    if (aRv.Failed()) {
      return;
    }
  }

  // Step 4

  const auto* valuePropertyId = styleValue->GetPropertyId();

  if (valuePropertyId && *valuePropertyId != propertyId) {
    aRv.ThrowTypeError("Invalid type for property"_ns);
    return;
  }

  nsAutoCString cssText;
  styleValue->ToCssTextWithProperty(propertyId, cssText);
  if (cssText.IsEmpty()) {
    aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
    return;
  }

  // Step 6.
  Declarations& declarations = mDeclarations;

  // Step 7 & 8 & 9 & 10.
  declarations.Set(propertyId, cssText, aRv);
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

void StylePropertyMapReadOnly::Declarations::Set(
    const CSSPropertyId& aPropertyId, const nsACString& aValue,
    ErrorResult& aRv) {
  switch (mKind) {
    case Kind::Inline:
      DeclarationTraits<MutableInlineStyleDeclarations>::Set(
          mStyledElement, aPropertyId, aValue, aRv);
      return;

    case Kind::Computed:
      aRv.Throw(NS_ERROR_UNEXPECTED);
      return;

    case Kind::Rule:
      DeclarationTraits<MutableStyleRuleDeclarations>::Set(mRule, aPropertyId,
                                                           aValue, aRv);
      return;
  }
}

}  // namespace mozilla::dom
