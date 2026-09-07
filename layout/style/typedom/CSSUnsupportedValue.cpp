/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "CSSUnsupportedValue.h"

#include "mozilla/Assertions.h"
#include "mozilla/DeclarationBlock.h"
#include "mozilla/ServoStyleConsts.h"

namespace mozilla::dom {

CSSUnsupportedValue::CSSUnsupportedValue(nsCOMPtr<nsISupports> aParent,
                                         const CSSPropertyId& aPropertyId,
                                         RefPtr<DeclarationBlock> aDeclarations)
    : CSSStyleValue(std::move(aParent), StyleValueType::UnsupportedValue),
      mPropertyId(aPropertyId),
      mDeclarations(std::move(aDeclarations)) {}

// static
RefPtr<CSSUnsupportedValue> CSSUnsupportedValue::Create(
    nsCOMPtr<nsISupports> aParent, const CSSPropertyId& aPropertyId,
    StyleUnsupportedValue&& aUnsupportedValue) {
  auto block = MakeRefPtr<DeclarationBlock>(aUnsupportedValue._0.Consume());

  return MakeRefPtr<CSSUnsupportedValue>(std::move(aParent), aPropertyId,
                                         std::move(block));
}

void CSSUnsupportedValue::ToCssTextWithProperty(
    const CSSPropertyId& aPropertyId, nsACString& aDest) const {
  MOZ_ASSERT(aPropertyId == mPropertyId);

  if (aDest.IsEmpty()) {
    mDeclarations->GetPropertyValueById(mPropertyId, aDest);
    return;
  }

  nsAutoCString value;
  mDeclarations->GetPropertyValueById(mPropertyId, value);

  aDest.Append(value);
}

const CSSUnsupportedValue& CSSStyleValue::GetAsCSSUnsupportedValue() const {
  MOZ_DIAGNOSTIC_ASSERT(mStyleValueType == StyleValueType::UnsupportedValue);

  return *static_cast<const CSSUnsupportedValue*>(this);
}

CSSUnsupportedValue& CSSStyleValue::GetAsCSSUnsupportedValue() {
  MOZ_DIAGNOSTIC_ASSERT(mStyleValueType == StyleValueType::UnsupportedValue);

  return *static_cast<CSSUnsupportedValue*>(this);
}

const CSSPropertyId* CSSStyleValue::GetPropertyId() const {
  if (!IsCSSUnsupportedValue()) {
    return nullptr;
  }

  const CSSUnsupportedValue& unsupportedValue = GetAsCSSUnsupportedValue();

  return &unsupportedValue.GetPropertyId();
}

CSSPropertyId* CSSStyleValue::GetPropertyId() {
  if (!IsCSSUnsupportedValue()) {
    return nullptr;
  }

  CSSUnsupportedValue& unsupportedValue = GetAsCSSUnsupportedValue();

  return &unsupportedValue.GetPropertyId();
}

}  // namespace mozilla::dom
