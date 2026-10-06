/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSMathProduct.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/Assertions.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/ServoStyleConsts.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSMathInvert.h"
#include "mozilla/dom/CSSMathProductBinding.h"
#include "mozilla/dom/CSSNumericArray.h"
#include "mozilla/dom/CSSNumericValue.h"
#include "mozilla/dom/CSSNumericValueBinding.h"
#include "nsString.h"

namespace mozilla::dom {

CSSMathProduct::CSSMathProduct(nsCOMPtr<nsISupports> aParent,
                               RefPtr<CSSNumericArray> aValues)
    : CSSMathValue(std::move(aParent), MathValueType::MathProduct),
      mValues(std::move(aValues)) {}

// static
RefPtr<CSSMathProduct> CSSMathProduct::Create(
    nsCOMPtr<nsISupports> aParent, const StyleMathProduct& aMathProduct) {
  nsTArray<RefPtr<CSSNumericValue>> values;

  for (const auto& value : aMathProduct) {
    values.AppendElement(CSSNumericValue::Create(aParent, value));
  }

  auto array = MakeRefPtr<CSSNumericArray>(aParent, std::move(values));

  return MakeRefPtr<CSSMathProduct>(std::move(aParent), std::move(array));
}

NS_IMPL_ISUPPORTS_CYCLE_COLLECTION_INHERITED_0(CSSMathProduct, CSSMathValue)
NS_IMPL_CYCLE_COLLECTION_INHERITED(CSSMathProduct, CSSMathValue, mValues)

JSObject* CSSMathProduct::WrapObject(JSContext* aCx,
                                     JS::Handle<JSObject*> aGivenProto) {
  return CSSMathProduct_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSMathProduct Web IDL implementation

// https://drafts.css-houdini.org/css-typed-om-1/#dom-cssmathproduct-cssmathproduct
// static
already_AddRefed<CSSMathProduct> CSSMathProduct::Constructor(
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

  return MakeAndAddRef<CSSMathProduct>(global, std::move(array));
}

CSSNumericArray* CSSMathProduct::Values() const { return mValues; }

// end of CSSMathProduct Web IDL implementation

void CSSMathProduct::ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
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
      if (mathValue.IsCSSMathInvert()) {
        CSSMathInvert& mathInvert = mathValue.GetAsCSSMathInvert();

        aDest.Append(" / "_ns);
        mathInvert.Value()->ToCssTextWithProperty(
            aPropertyId, SerializationContext(Nested{}), aDest);
        continue;
      }
    }

    aDest.Append(" * "_ns);
    value->ToCssTextWithProperty(aPropertyId, SerializationContext(Nested{}),
                                 aDest);
  }

  if (!aContext.IsParenLess()) {
    aDest.Append(")"_ns);
  }
}

StyleMathSum CSSMathProduct::ToStyleMathProduct() const {
  nsTArray<StyleNumericValue> values;

  for (const RefPtr<CSSNumericValue>& value : mValues->GetValues()) {
    values.AppendElement(value->ToStyleNumericValue());
  }

  return StyleMathProduct{std::move(values)};
}

const CSSMathProduct& CSSMathValue::GetAsCSSMathProduct() const {
  MOZ_DIAGNOSTIC_ASSERT(mMathValueType == MathValueType::MathProduct);

  return *static_cast<const CSSMathProduct*>(this);
}

CSSMathProduct& CSSMathValue::GetAsCSSMathProduct() {
  MOZ_DIAGNOSTIC_ASSERT(mMathValueType == MathValueType::MathProduct);

  return *static_cast<CSSMathProduct*>(this);
}

}  // namespace mozilla::dom
