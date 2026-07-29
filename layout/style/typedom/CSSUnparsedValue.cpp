/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSUnparsedValue.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/ServoStyleConsts.h"
#include "mozilla/dom/CSSUnparsedValueBinding.h"
#include "mozilla/dom/CSSVariableReferenceValue.h"
#include "nsFmtString.h"
#include "nsTArray.h"

namespace mozilla::dom {

CSSUnparsedValue::CSSUnparsedValue(nsCOMPtr<nsISupports> aParent,
                                   Sequence<OwningCSSUnparsedSegment> aTokens)
    : CSSStyleValue(std::move(aParent), StyleValueType::UnparsedValue),
      mTokens(std::move(aTokens)) {}

// static
RefPtr<CSSUnparsedValue> CSSUnparsedValue::Create(
    nsCOMPtr<nsISupports> aParent, const StyleUnparsedValue& aUnparsedValue) {
  nsTArray<OwningCSSUnparsedSegment> tokens;

  for (const auto& value : aUnparsedValue) {
    OwningCSSUnparsedSegment token;

    if (value.IsString()) {
      const auto& stringValue = value.AsString();

      token.SetAsUTF8String() = stringValue;
    } else {
      const auto& variableReferenceValue = value.AsVariableReference();

      token.SetAsCSSVariableReferenceValue() =
          CSSVariableReferenceValue::Create(aParent, variableReferenceValue);
    }

    tokens.AppendElement(std::move(token));
  }

  return MakeRefPtr<CSSUnparsedValue>(std::move(aParent), std::move(tokens));
}

NS_IMPL_ISUPPORTS_CYCLE_COLLECTION_INHERITED_0(CSSUnparsedValue, CSSStyleValue)
NS_IMPL_CYCLE_COLLECTION_INHERITED(CSSUnparsedValue, CSSStyleValue, mTokens)

JSObject* CSSUnparsedValue::WrapObject(JSContext* aCx,
                                       JS::Handle<JSObject*> aGivenProto) {
  return CSSUnparsedValue_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSUnparsedValue Web IDL implementation

// https://drafts.css-houdini.org/css-typed-om-1/#dom-cssunparsedvalue-cssunparsedvalue
//
// static
already_AddRefed<CSSUnparsedValue> CSSUnparsedValue::Constructor(
    const GlobalObject& aGlobal,
    const Sequence<OwningCSSUnparsedSegment>& aMembers) {
  return MakeAndAddRef<CSSUnparsedValue>(aGlobal.GetAsSupports(), aMembers);
}

// https://drafts.css-houdini.org/css-typed-om-1/#dom-cssunparsedvalue-length
uint32_t CSSUnparsedValue::Length() const { return mTokens.Length(); }

// https://www.w3.org/publications/spec-generator/#cssunparsedvalue-indexed-property-getter
void CSSUnparsedValue::IndexedGetter(uint32_t aIndex, bool& aFound,
                                     OwningCSSUnparsedSegment& aRetVal) {
  // Step 1.
  const auto& tokens = mTokens;

  // Step 2.
  if (aIndex < tokens.Length()) {
    aFound = true;
    aRetVal = tokens[aIndex];
    return;
  }

  aFound = false;
}

// https://www.w3.org/publications/spec-generator/#cssunparsedvalue-indexed-property-setter
void CSSUnparsedValue::IndexedSetter(uint32_t aIndex,
                                     const CSSUnparsedSegment& aVal,
                                     ErrorResult& aRv) {
  // Step 1.
  auto& tokens = mTokens;

  // Step 2.
  if (aIndex > tokens.Length()) {
    auto message = nsFmtCString(
        "Index {} exceeds index range for unparsed segments.", aIndex);
    aRv.ThrowRangeError(message);
    return;
  }

  OwningUTF8StringOrCSSVariableReferenceValue val;
  if (aVal.IsUTF8String()) {
    val.SetAsUTF8String() = aVal.GetAsUTF8String();
  } else {
    val.SetAsCSSVariableReferenceValue() =
        aVal.GetAsCSSVariableReferenceValue();
  }

  // Step 3.
  if (aIndex < tokens.Length()) {
    tokens[aIndex] = std::move(val);
    return;
  }

  // Step 4.
  if (!tokens.AppendElement(std::move(val), fallible)) {
    aRv.Throw(NS_ERROR_OUT_OF_MEMORY);
    return;
  }
}

// end of CSSUnparsedValue Web IDL implementation

void CSSUnparsedValue::ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                                             nsACString& aDest) const {
  nsTHashSet<const CSSUnparsedValue*> values;
  nsAutoCString dest;
  if (!ToCssTextWithPropertyInternal(aPropertyId, dest, values)) {
    // For now we just append nothing to aDest without throwing an exception.
    // See also https://github.com/w3c/css-houdini-drafts/issues/1158
    return;
  }
  aDest.Append(dest);
}

bool CSSUnparsedValue::ToCssTextWithPropertyInternal(
    const CSSPropertyId& aPropertyId, nsACString& aDest,
    nsTHashSet<const CSSUnparsedValue*>& aValues) const {
  if (!aValues.EnsureInserted(this)) {
    return false;
  }

  for (const auto& token : mTokens) {
    if (token.IsUTF8String()) {
      aDest.Append(token.GetAsUTF8String());
      continue;
    }

    const auto& variableReferenceValue = token.GetAsCSSVariableReferenceValue();

    aDest.Append("var("_ns);

    aDest.Append(variableReferenceValue->GetVariable());

    if (auto* fallback = variableReferenceValue->GetFallback()) {
      aDest.Append(",");

      if (!fallback->ToCssTextWithPropertyInternal(aPropertyId, aDest,
                                                   aValues)) {
        return false;
      }
    }

    aDest.Append(")"_ns);
  }

  aValues.Remove(this);

  return true;
}

const CSSUnparsedValue& CSSStyleValue::GetAsCSSUnparsedValue() const {
  MOZ_DIAGNOSTIC_ASSERT(mStyleValueType == StyleValueType::UnparsedValue);

  return *static_cast<const CSSUnparsedValue*>(this);
}

CSSUnparsedValue& CSSStyleValue::GetAsCSSUnparsedValue() {
  MOZ_DIAGNOSTIC_ASSERT(mStyleValueType == StyleValueType::UnparsedValue);

  return *static_cast<CSSUnparsedValue*>(this);
}

}  // namespace mozilla::dom
