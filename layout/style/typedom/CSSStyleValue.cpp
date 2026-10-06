/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSStyleValue.h"

#include "CSSUnsupportedValue.h"
#include "mozilla/Assertions.h"
#include "mozilla/CSSPropertyId.h"
#include "mozilla/DeclarationBlock.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/ServoStyleConsts.h"
#include "mozilla/dom/CSSImageValue.h"
#include "mozilla/dom/CSSKeywordValue.h"
#include "mozilla/dom/CSSNumericValue.h"
#include "mozilla/dom/CSSStyleValueBinding.h"
#include "mozilla/dom/CSSTransformValue.h"
#include "mozilla/dom/CSSUnparsedValue.h"
#include "mozilla/dom/Document.h"
#include "nsContentUtils.h"
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

// static
void CSSStyleValue::Create(nsCOMPtr<nsISupports> aParent,
                           const CSSPropertyId& aPropertyId,
                           StylePropertyTypedValueList&& aTypedValueList,
                           nsTArray<RefPtr<CSSStyleValue>>& aRetVal) {
  switch (aTypedValueList.tag) {
    case StylePropertyTypedValueList::Tag::Typed: {
      const auto& typedValueList = aTypedValueList.AsTyped();

      aRetVal.SetCapacity(typedValueList.values.Length());

      for (const auto& typedValue : typedValueList.values) {
        RefPtr<CSSStyleValue> styleValue;

        switch (typedValue.tag) {
          case StyleTypedValue::Tag::Unparsed: {
            const auto& unparsedValue = typedValue.AsUnparsed();

            styleValue = CSSUnparsedValue::Create(aParent, unparsedValue);

            break;
          }

          case StyleTypedValue::Tag::Keyword: {
            const auto& keywordValue = typedValue.AsKeyword();

            styleValue = CSSKeywordValue::Create(aParent, keywordValue);

            break;
          }

          case StyleTypedValue::Tag::Numeric: {
            const auto& numericValue = typedValue.AsNumeric();

            styleValue = CSSNumericValue::Create(aParent, numericValue);

            break;
          }

          case StyleTypedValue::Tag::Transform: {
            const auto& transformValue = typedValue.AsTransform();

            styleValue = CSSTransformValue::Create(aParent, transformValue);

            break;
          }

          case StyleTypedValue::Tag::Image: {
            const auto& imageValue = typedValue.AsImage();

            styleValue = CSSImageValue::Create(aParent, imageValue);

            break;
          }
        }

        aRetVal.AppendElement(std::move(styleValue));
      }

      break;
    }

    case StylePropertyTypedValueList::Tag::Unsupported: {
      auto unsupportedValue = std::move(aTypedValueList).ExtractUnsupported();

      RefPtr<CSSStyleValue> styleValue = CSSUnsupportedValue::Create(
          std::move(aParent), aPropertyId, std::move(unsupportedValue));

      aRetVal.AppendElement(std::move(styleValue));

      break;
    }

    case StylePropertyTypedValueList::Tag::None:
      break;
  }
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

// https://drafts.css-houdini.org/css-typed-om-1/#dom-cssstylevalue-parse
//
// static
RefPtr<CSSStyleValue> CSSStyleValue::Parse(const GlobalObject& aGlobal,
                                           const nsACString& aProperty,
                                           const nsACString& aCssText,
                                           ErrorResult& aRv) {
  nsCOMPtr<nsISupports> global = aGlobal.GetAsSupports();

  RefPtr<Document> document =
      nsContentUtils::TryGetDocumentFromWindowGlobal(global);
  if (!document) {
    aRv.Throw(NS_ERROR_UNEXPECTED);
    return nullptr;
  }

  return ParseStyleValue(std::move(global), aProperty, aCssText,
                         document->DefaultStyleAttrURLData(),
                         /* aStyleValues */ nullptr, aRv);
}

// https://drafts.css-houdini.org/css-typed-om-1/#dom-cssstylevalue-parseall
//
// static
void CSSStyleValue::ParseAll(const GlobalObject& aGlobal,
                             const nsACString& aProperty,
                             const nsACString& aCssText,
                             nsTArray<RefPtr<CSSStyleValue>>& aRetVal,
                             ErrorResult& aRv) {
  nsCOMPtr<nsISupports> global = aGlobal.GetAsSupports();

  RefPtr<Document> document =
      nsContentUtils::TryGetDocumentFromWindowGlobal(global);
  if (!document) {
    aRv.Throw(NS_ERROR_UNEXPECTED);
    return;
  }

  ParseStyleValue(std::move(global), aProperty, aCssText,
                  document->DefaultStyleAttrURLData(),
                  /* aStyleValues */ &aRetVal, aRv);
}

void CSSStyleValue::Stringify(nsACString& aRetVal) const {
  const CSSPropertyId* propertyId = GetPropertyId();
  ToCssTextWithProperty(
      propertyId ? *propertyId : CSSPropertyId(eCSSProperty_UNKNOWN), aRetVal);
}

// end of CSSStyleValue Web IDL implementation

// https://drafts.css-houdini.org/css-typed-om-1/#parse-a-cssstylevalue
//
// static
RefPtr<CSSStyleValue> CSSStyleValue::ParseStyleValue(
    nsCOMPtr<nsISupports> aGlobal, const nsACString& aProperty,
    const nsACString& aCssText, URLExtraData* aURLExtraData,
    nsTArray<RefPtr<CSSStyleValue>>* aStyleValues, ErrorResult& aRv) {
  // Step 2.
  NonCustomCSSPropertyId id = nsCSSProps::LookupProperty(aProperty);
  if (id == eCSSProperty_UNKNOWN) {
    aRv.ThrowTypeError("Invalid property "_ns + aProperty);
    return nullptr;
  }

  auto propertyId = CSSPropertyId::FromIdOrCustomProperty(id, aProperty);

  // Step 3.
  RefPtr<StyleLockedDeclarationBlock> rawBlock =
      Servo_DeclarationBlock_Parse(&propertyId, &aCssText, aURLExtraData)
          .Consume();
  if (!rawBlock) {
    aRv.ThrowTypeError(aCssText + "cannot be parsed"_ns);
    return nullptr;
  }

  auto block = MakeRefPtr<DeclarationBlock>(rawBlock.forget());

  // Step 4 & 5.
  auto valueList = StylePropertyTypedValueList::None();
  if (!block->GetPropertyTypedValueList(propertyId, valueList)) {
    aRv.ThrowTypeError("Invalid property "_ns + aProperty);
    return nullptr;
  }
  MOZ_DIAGNOSTIC_ASSERT(!valueList.IsNone());

  nsTArray<RefPtr<CSSStyleValue>> styleValues;
  CSSStyleValue::Create(std::move(aGlobal), propertyId, std::move(valueList),
                        styleValues);
  MOZ_DIAGNOSTIC_ASSERT(!styleValues.IsEmpty());

  // Step 6.
  if (!aStyleValues) {
    return styleValues[0];
  }
  *aStyleValues = std::move(styleValues);
  return nullptr;
}

bool CSSStyleValue::IsCSSUnsupportedValue() const {
  return mStyleValueType == StyleValueType::UnsupportedValue;
}

bool CSSStyleValue::IsCSSUnparsedValue() const {
  return mStyleValueType == StyleValueType::UnparsedValue;
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

bool CSSStyleValue::IsCSSImageValue() const {
  return mStyleValueType == StyleValueType::ImageValue;
}

void CSSStyleValue::ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                                          nsACString& aDest) const {
  switch (GetStyleValueType()) {
    case StyleValueType::ImageValue: {
      const CSSImageValue& imageValue = GetAsCSSImageValue();

      imageValue.ToCssTextWithProperty(aPropertyId, aDest);
      break;
    }

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

    case StyleValueType::UnparsedValue: {
      const CSSUnparsedValue& unparsedValue = GetAsCSSUnparsedValue();

      unparsedValue.ToCssTextWithProperty(aPropertyId, aDest);
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
