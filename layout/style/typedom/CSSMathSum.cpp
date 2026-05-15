/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSMathSum.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/ServoStyleConsts.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSMathSumBinding.h"
#include "mozilla/dom/CSSNumericArray.h"
#include "mozilla/dom/CSSNumericValueBinding.h"
#include "mozilla/dom/CSSUnitValue.h"
#include "nsString.h"

namespace mozilla::dom {

CSSMathSum::CSSMathSum(nsCOMPtr<nsISupports> aParent,
                       RefPtr<CSSNumericArray> aValues)
    : CSSMathValue(std::move(aParent), NumericValueType::MathSum),
      mValues(std::move(aValues)) {}

// static
RefPtr<CSSMathSum> CSSMathSum::Create(nsCOMPtr<nsISupports> aParent,
                                      const StyleMathSum& aMathSum) {
  nsTArray<RefPtr<CSSNumericValue>> values;

  for (const auto& value : aMathSum.values) {
    // XXX Only supporting units for now
    if (value.IsUnit()) {
      auto unitValue = value.AsUnit();

      values.AppendElement(CSSUnitValue::Create(aParent, unitValue));
    }
  }

  auto array = MakeRefPtr<CSSNumericArray>(aParent, std::move(values));

  return MakeRefPtr<CSSMathSum>(aParent, std::move(array));
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
    RefPtr<CSSNumericValue> value;

    if (arg.IsDouble()) {
      value = MakeRefPtr<CSSUnitValue>(global, arg.GetAsDouble(), "number"_ns);
    } else {
      MOZ_ASSERT(arg.IsCSSNumericValue());

      value = arg.GetAsCSSNumericValue();
    }

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
                                       nsACString& aDest) const {
  aDest.Append("calc("_ns);

  bool written = false;

  for (const RefPtr<CSSNumericValue>& value : mValues->GetValues()) {
    if (value->IsCSSUnitValue()) {
      CSSUnitValue& unitValue = value->GetAsCSSUnitValue();

      if (written) {
        aDest.Append(" + "_ns);
      }

      unitValue.ToCssTextWithProperty(aPropertyId, aDest);
      written = true;
    }

    // TODO: Add support for other objects. See bug 2012324.
  }

  aDest.Append(")"_ns);
}

StyleMathSum CSSMathSum::ToStyleMathSum() const {
  nsTArray<StyleNumericValue> values;

  for (const RefPtr<CSSNumericValue>& value : mValues->GetValues()) {
    if (value->IsCSSUnitValue()) {
      CSSUnitValue& unitValue = value->GetAsCSSUnitValue();

      values.AppendElement(
          StyleNumericValue::Unit(unitValue.ToStyleUnitValue()));
    }

    // TODO: Add support for other objects. See bug 2012324.
  }

  return StyleMathSum{std::move(values)};
}

const CSSMathSum& CSSNumericValue::GetAsCSSMathSum() const {
  MOZ_DIAGNOSTIC_ASSERT(mNumericValueType == NumericValueType::MathSum);

  return *static_cast<const CSSMathSum*>(this);
}

CSSMathSum& CSSNumericValue::GetAsCSSMathSum() {
  MOZ_DIAGNOSTIC_ASSERT(mNumericValueType == NumericValueType::MathSum);

  return *static_cast<CSSMathSum*>(this);
}

}  // namespace mozilla::dom
