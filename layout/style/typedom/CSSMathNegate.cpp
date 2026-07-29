/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSMathNegate.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/Assertions.h"
#include "mozilla/ServoStyleConsts.h"
#include "mozilla/UniquePtr.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSMathNegateBinding.h"
#include "mozilla/dom/CSSNumericValue.h"
#include "mozilla/dom/CSSNumericValueBinding.h"
#include "nsString.h"

namespace mozilla::dom {

CSSMathNegate::CSSMathNegate(nsCOMPtr<nsISupports> aParent,
                             RefPtr<CSSNumericValue> aValue)
    : CSSMathValue(std::move(aParent), MathValueType::MathNegate),
      mValue(std::move(aValue)) {}

// static
RefPtr<CSSMathNegate> CSSMathNegate::Create(
    nsCOMPtr<nsISupports> aParent, const StyleMathNegate& aMathNegate) {
  RefPtr<CSSNumericValue> value =
      CSSNumericValue::Create(aParent, *aMathNegate);

  return MakeRefPtr<CSSMathNegate>(std::move(aParent), std::move(value));
}

NS_IMPL_ISUPPORTS_CYCLE_COLLECTION_INHERITED_0(CSSMathNegate, CSSMathValue)
NS_IMPL_CYCLE_COLLECTION_INHERITED(CSSMathNegate, CSSMathValue, mValue)

JSObject* CSSMathNegate::WrapObject(JSContext* aCx,
                                    JS::Handle<JSObject*> aGivenProto) {
  return CSSMathNegate_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSMathNegate Web IDL implementation

// https://drafts.css-houdini.org/css-typed-om-1/#dom-cssmathnegate-cssmathnegate
//
// static
already_AddRefed<CSSMathNegate> CSSMathNegate::Constructor(
    const GlobalObject& aGlobal, const CSSNumberish& aArg) {
  nsCOMPtr<nsISupports> global = aGlobal.GetAsSupports();

  // Step 1.
  RefPtr<CSSNumericValue> value = CSSNumericValue::Create(global, aArg);

  // Step 2.

  return MakeAndAddRef<CSSMathNegate>(std::move(global), std::move(value));
}

CSSNumericValue* CSSMathNegate::Value() const { return mValue; }

// end of CSSMathNegate Web IDL implementation

void CSSMathNegate::ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                                          const SerializationContext& aContext,
                                          nsACString& aDest) const {
  if (!aContext.IsParenLess()) {
    aDest.Append(aContext.IsNested() ? "("_ns : "calc("_ns);
  }

  aDest.Append("-"_ns);

  mValue->ToCssTextWithProperty(aPropertyId, SerializationContext(Nested{}),
                                aDest);

  if (!aContext.IsParenLess()) {
    aDest.Append(")"_ns);
  }
}

StyleMathNegate CSSMathNegate::ToStyleMathNegate() const {
  auto value = MakeUnique<StyleNumericValue>(mValue->ToStyleNumericValue());

  return StyleMathNegate{std::move(value)};
}

const CSSMathNegate& CSSMathValue::GetAsCSSMathNegate() const {
  MOZ_DIAGNOSTIC_ASSERT(mMathValueType == MathValueType::MathNegate);

  return *static_cast<const CSSMathNegate*>(this);
}

CSSMathNegate& CSSMathValue::GetAsCSSMathNegate() {
  MOZ_DIAGNOSTIC_ASSERT(mMathValueType == MathValueType::MathNegate);

  return *static_cast<CSSMathNegate*>(this);
}

}  // namespace mozilla::dom
