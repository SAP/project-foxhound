/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSMathSum.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/Assertions.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/ServoStyleConsts.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSMathNegate.h"
#include "mozilla/dom/CSSMathSumBinding.h"
#include "mozilla/dom/CSSNumericArray.h"
#include "mozilla/dom/CSSNumericValue.h"
#include "mozilla/dom/CSSNumericValueBinding.h"
#include "nsString.h"

namespace mozilla::dom {

CSSMathSum::CSSMathSum(nsCOMPtr<nsISupports> aParent,
                       RefPtr<CSSNumericArray> aValues)
    : CSSMathValue(std::move(aParent), MathValueType::MathSum),
      mValues(std::move(aValues)) {}

// static
RefPtr<CSSMathSum> CSSMathSum::Create(nsCOMPtr<nsISupports> aParent,
                                      const StyleMathSum& aMathSum) {
  nsTArray<RefPtr<CSSNumericValue>> values;

  for (const auto& value : aMathSum) {
    values.AppendElement(CSSNumericValue::Create(aParent, value));
  }

  auto array = MakeRefPtr<CSSNumericArray>(aParent, std::move(values));

  return MakeRefPtr<CSSMathSum>(std::move(aParent), std::move(array));
}

NS_IMPL_ISUPPORTS_CYCLE_COLLECTION_INHERITED_0(CSSMathSum, CSSMathValue)
NS_IMPL_CYCLE_COLLECTION_INHERITED(CSSMathSum, CSSMathValue, mValues)

JSObject* CSSMathSum::WrapObject(JSContext* aCx,
                                 JS::Handle<JSObject*> aGivenProto) {
  return CSSMathSum_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSMathSum Web IDL implementation

// https://www.w3.org/TR/css-typed-om-1/#dom-cssmathsum-cssmathsum
//
// static
already_AddRefed<CSSMathSum> CSSMathSum::Constructor(
    const GlobalObject& aGlobal, const Sequence<OwningCSSNumberish>& aArgs,
    ErrorResult& aRv) {
  nsCOMPtr<nsISupports> global = aGlobal.GetAsSupports();

  // Step 1.

  nsTArray<RefPtr<CSSNumericValue>> values;

  for (const OwningCSSNumberish& arg : aArgs) {
    RefPtr<CSSNumericValue> value = CSSNumericValue::Create(global, arg);

    values.AppendElement(std::move(value));
  }

  // Step 2.

  if (values.IsEmpty()) {
    aRv.ThrowSyntaxError("Arguments can't be empty");
    return nullptr;
  }

  // XXX Step 3 is not yet implemented!

  // Step 4.

  auto array = MakeRefPtr<CSSNumericArray>(global, std::move(values));

  return MakeAndAddRef<CSSMathSum>(global, std::move(array));
}

CSSNumericArray* CSSMathSum::Values() const { return mValues; }

// end of CSSMathSum Web IDL implementation

void CSSMathSum::ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                                       const SerializationContext& aContext,
                                       nsACString& aDest) const {
  if (!aContext.IsParenLess()) {
    aDest.Append(aContext.IsNested() ? "("_ns : "calc("_ns);
  }

  const auto& values = mValues->GetValues();
  MOZ_DIAGNOSTIC_ASSERT(!values.IsEmpty());

  values[0]->ToCssTextWithProperty(aPropertyId, SerializationContext(Nested{}),
                                   aDest);

  for (size_t index = 1; index < values.Length(); ++index) {
    const RefPtr<CSSNumericValue>& value = values[index];

    if (value->IsCSSMathValue()) {
      CSSMathValue& mathValue = value->GetAsCSSMathValue();
      if (mathValue.IsCSSMathNegate()) {
        CSSMathNegate& mathNegate = mathValue.GetAsCSSMathNegate();

        aDest.Append(" - "_ns);
        mathNegate.Value()->ToCssTextWithProperty(
            aPropertyId, SerializationContext(Nested{}), aDest);
        continue;
      }
    }

    aDest.Append(" + "_ns);
    value->ToCssTextWithProperty(aPropertyId, SerializationContext(Nested{}),
                                 aDest);
  }

  if (!aContext.IsParenLess()) {
    aDest.Append(")"_ns);
  }
}

StyleMathSum CSSMathSum::ToStyleMathSum() const {
  nsTArray<StyleNumericValue> values;

  for (const RefPtr<CSSNumericValue>& value : mValues->GetValues()) {
    values.AppendElement(value->ToStyleNumericValue());
  }

  return StyleMathSum{std::move(values)};
}

const CSSMathSum& CSSMathValue::GetAsCSSMathSum() const {
  MOZ_DIAGNOSTIC_ASSERT(mMathValueType == MathValueType::MathSum);

  return *static_cast<const CSSMathSum*>(this);
}

CSSMathSum& CSSMathValue::GetAsCSSMathSum() {
  MOZ_DIAGNOSTIC_ASSERT(mMathValueType == MathValueType::MathSum);

  return *static_cast<CSSMathSum*>(this);
}

}  // namespace mozilla::dom
