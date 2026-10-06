/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSMathMax.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/Assertions.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/ServoStyleConsts.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSMathMaxBinding.h"
#include "mozilla/dom/CSSNumericArray.h"
#include "mozilla/dom/CSSNumericValue.h"
#include "mozilla/dom/CSSNumericValueBinding.h"
#include "nsString.h"

namespace mozilla::dom {

CSSMathMax::CSSMathMax(nsCOMPtr<nsISupports> aParent,
                       RefPtr<CSSNumericArray> aValues)
    : CSSMathValue(std::move(aParent), MathValueType::MathMax),
      mValues(std::move(aValues)) {}

// static
RefPtr<CSSMathMax> CSSMathMax::Create(nsCOMPtr<nsISupports> aParent,
                                      const StyleMathMax& aMathMax) {
  nsTArray<RefPtr<CSSNumericValue>> values;

  for (const auto& value : aMathMax) {
    values.AppendElement(CSSNumericValue::Create(aParent, value));
  }

  auto array = MakeRefPtr<CSSNumericArray>(aParent, std::move(values));

  return MakeRefPtr<CSSMathMax>(std::move(aParent), std::move(array));
}

NS_IMPL_ISUPPORTS_CYCLE_COLLECTION_INHERITED_0(CSSMathMax, CSSMathValue)
NS_IMPL_CYCLE_COLLECTION_INHERITED(CSSMathMax, CSSMathValue, mValues)

JSObject* CSSMathMax::WrapObject(JSContext* aCx,
                                 JS::Handle<JSObject*> aGivenProto) {
  return CSSMathMax_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSMathMax Web IDL implementation

// https://drafts.css-houdini.org/css-typed-om-1/#dom-cssmathmax-cssmathmax
//
// static
already_AddRefed<CSSMathMax> CSSMathMax::Constructor(
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

  return MakeAndAddRef<CSSMathMax>(global, std::move(array));
}

CSSNumericArray* CSSMathMax::Values() const { return mValues; }

// end of CSSMathMax Web IDL implementation

void CSSMathMax::ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                                       const SerializationContext& aContext,
                                       nsACString& aDest) const {
  aDest.Append("max("_ns);

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

StyleMathMin CSSMathMax::ToStyleMathMax() const {
  nsTArray<StyleNumericValue> values;

  for (const RefPtr<CSSNumericValue>& value : mValues->GetValues()) {
    values.AppendElement(value->ToStyleNumericValue());
  }

  return StyleMathMax{std::move(values)};
}

const CSSMathMax& CSSMathValue::GetAsCSSMathMax() const {
  MOZ_DIAGNOSTIC_ASSERT(mMathValueType == MathValueType::MathMax);

  return *static_cast<const CSSMathMax*>(this);
}

CSSMathMax& CSSMathValue::GetAsCSSMathMax() {
  MOZ_DIAGNOSTIC_ASSERT(mMathValueType == MathValueType::MathMax);

  return *static_cast<CSSMathMax*>(this);
}

}  // namespace mozilla::dom
