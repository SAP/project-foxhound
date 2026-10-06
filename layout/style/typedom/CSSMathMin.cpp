/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSMathMin.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/Assertions.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/ServoStyleConsts.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSMathMinBinding.h"
#include "mozilla/dom/CSSNumericArray.h"
#include "mozilla/dom/CSSNumericValue.h"
#include "mozilla/dom/CSSNumericValueBinding.h"
#include "nsString.h"

namespace mozilla::dom {

CSSMathMin::CSSMathMin(nsCOMPtr<nsISupports> aParent,
                       RefPtr<CSSNumericArray> aValues)
    : CSSMathValue(std::move(aParent), MathValueType::MathMin),
      mValues(std::move(aValues)) {}

// static
RefPtr<CSSMathMin> CSSMathMin::Create(nsCOMPtr<nsISupports> aParent,
                                      const StyleMathMin& aMathMin) {
  nsTArray<RefPtr<CSSNumericValue>> values;

  for (const auto& value : aMathMin) {
    values.AppendElement(CSSNumericValue::Create(aParent, value));
  }

  auto array = MakeRefPtr<CSSNumericArray>(aParent, std::move(values));

  return MakeRefPtr<CSSMathMin>(std::move(aParent), std::move(array));
}

NS_IMPL_ISUPPORTS_CYCLE_COLLECTION_INHERITED_0(CSSMathMin, CSSMathValue)
NS_IMPL_CYCLE_COLLECTION_INHERITED(CSSMathMin, CSSMathValue, mValues)

JSObject* CSSMathMin::WrapObject(JSContext* aCx,
                                 JS::Handle<JSObject*> aGivenProto) {
  return CSSMathMin_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSMathMin Web IDL implementation

// https://drafts.css-houdini.org/css-typed-om-1/#dom-cssmathmin-cssmathminx
//
// static
already_AddRefed<CSSMathMin> CSSMathMin::Constructor(
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

  return MakeAndAddRef<CSSMathMin>(global, std::move(array));
}

CSSNumericArray* CSSMathMin::Values() const { return mValues; }

// end of CSSMathMin Web IDL implementation

void CSSMathMin::ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                                       const SerializationContext& aContext,
                                       nsACString& aDest) const {
  aDest.Append("min("_ns);

  bool first = true;
  for (const RefPtr<CSSNumericValue>& value : mValues->GetValues()) {
    if (!first) {
      aDest.Append(", "_ns);
    }

    value->ToCssTextWithProperty(
        aPropertyId, SerializationContext(Nested{}, ParenLess{}), aDest);
    first = false;
  }

  aDest.Append(")"_ns);
}

StyleMathMin CSSMathMin::ToStyleMathMin() const {
  nsTArray<StyleNumericValue> values;

  for (const RefPtr<CSSNumericValue>& value : mValues->GetValues()) {
    values.AppendElement(value->ToStyleNumericValue());
  }

  return StyleMathMin{std::move(values)};
}

const CSSMathMin& CSSMathValue::GetAsCSSMathMin() const {
  MOZ_DIAGNOSTIC_ASSERT(mMathValueType == MathValueType::MathMin);

  return *static_cast<const CSSMathMin*>(this);
}

CSSMathMin& CSSMathValue::GetAsCSSMathMin() {
  MOZ_DIAGNOSTIC_ASSERT(mMathValueType == MathValueType::MathMin);

  return *static_cast<CSSMathMin*>(this);
}

}  // namespace mozilla::dom
