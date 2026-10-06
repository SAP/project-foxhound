/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSNumericValue.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/Assertions.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/ServoStyleConsts.h"
#include "mozilla/UniquePtr.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSMathSum.h"
#include "mozilla/dom/CSSMathValue.h"
#include "mozilla/dom/CSSNumericValueBinding.h"
#include "mozilla/dom/CSSUnitValue.h"

namespace mozilla::dom {

CSSNumericValue::CSSNumericValue(nsCOMPtr<nsISupports> aParent,
                                 NumericValueType aNumericValueType)
    : CSSStyleValue(std::move(aParent), StyleValueType::NumericValue),
      mNumericValueType(aNumericValueType) {}

// https://drafts.css-houdini.org/css-typed-om-1/#rectify-a-numberish-value
//
// static
RefPtr<CSSNumericValue> CSSNumericValue::Create(
    nsCOMPtr<nsISupports> aParent, const CSSNumberish& aNumberish) {
  if (aNumberish.IsCSSNumericValue()) {
    return &aNumberish.GetAsCSSNumericValue();
  }

  MOZ_DIAGNOSTIC_ASSERT(aNumberish.IsDouble());
  return CSSUnitValue::Create(std::move(aParent), aNumberish.GetAsDouble());
}

// https://drafts.css-houdini.org/css-typed-om-1/#rectify-a-numberish-value
//
// static
RefPtr<CSSNumericValue> CSSNumericValue::Create(
    nsCOMPtr<nsISupports> aParent, const OwningCSSNumberish& aOwningNumberish) {
  if (aOwningNumberish.IsCSSNumericValue()) {
    return aOwningNumberish.GetAsCSSNumericValue();
  }

  MOZ_DIAGNOSTIC_ASSERT(aOwningNumberish.IsDouble());
  return CSSUnitValue::Create(std::move(aParent),
                              aOwningNumberish.GetAsDouble());
}

// static
RefPtr<CSSNumericValue> CSSNumericValue::Create(
    nsCOMPtr<nsISupports> aParent, const StyleNumericValue& aNumericValue) {
  RefPtr<CSSNumericValue> numericValue;

  switch (aNumericValue.tag) {
    case StyleNumericValue::Tag::Unit: {
      const auto& unitValue = aNumericValue.AsUnit();

      numericValue = CSSUnitValue::Create(std::move(aParent), unitValue);
      break;
    }

    case StyleNumericValue::Tag::Math: {
      const auto& mathValue = aNumericValue.AsMath();

      numericValue = CSSMathValue::Create(std::move(aParent), mathValue);
      break;
    }
  }

  return numericValue;
}

JSObject* CSSNumericValue::WrapObject(JSContext* aCx,
                                      JS::Handle<JSObject*> aGivenProto) {
  return CSSNumericValue_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSNumericValue Web IDL implementation

already_AddRefed<CSSNumericValue> CSSNumericValue::Add(
    const Sequence<OwningCSSNumberish>& aValues, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
  return nullptr;
}

already_AddRefed<CSSNumericValue> CSSNumericValue::Sub(
    const Sequence<OwningCSSNumberish>& aValues, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
  return nullptr;
}

already_AddRefed<CSSNumericValue> CSSNumericValue::Mul(
    const Sequence<OwningCSSNumberish>& aValues, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
  return nullptr;
}

already_AddRefed<CSSNumericValue> CSSNumericValue::Div(
    const Sequence<OwningCSSNumberish>& aValues, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
  return nullptr;
}

already_AddRefed<CSSNumericValue> CSSNumericValue::Min(
    const Sequence<OwningCSSNumberish>& aValues, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
  return nullptr;
}

already_AddRefed<CSSNumericValue> CSSNumericValue::Max(
    const Sequence<OwningCSSNumberish>& aValues, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
  return nullptr;
}

bool CSSNumericValue::Equals(const Sequence<OwningCSSNumberish>& aValue) {
  return false;
}

// https://drafts.css-houdini.org/css-typed-om-1/#dom-cssnumericvalue-to
already_AddRefed<CSSUnitValue> CSSNumericValue::To(const nsACString& aUnit,
                                                   ErrorResult& aRv) const {
  // Step 1.
  // TODO: Let type be the result of creating a type from unit. If type is
  // failure, throw a SyntaxError.

  // Step 2.
  auto styleNumericValue = ToStyleNumericValue();

  auto sumValue = WrapUnique(Servo_SumValue_Create(&styleNumericValue));
  if (!sumValue) {
    aRv.ThrowTypeError("Failed to create a sum value");
    return nullptr;
  }

  // Step 3.
  auto styleUnitValue = StyleOptional<StyleUnitValue>::None();
  Servo_SumValue_ToUnit(sumValue.get(), &aUnit, &styleUnitValue);
  if (styleUnitValue.IsNone()) {
    aRv.ThrowTypeError("Failed to convert to "_ns + aUnit);
    return nullptr;
  }

  // Step 4.
  RefPtr<CSSUnitValue> unitValue =
      CSSUnitValue::Create(mParent, styleUnitValue.AsSome());
  return unitValue.forget();
}

// https://drafts.css-houdini.org/css-typed-om-1/#dom-cssnumericvalue-tosum
already_AddRefed<CSSMathSum> CSSNumericValue::ToSum(
    const Sequence<nsCString>& aUnits, ErrorResult& aRv) const {
  // Step 1.
  // TODO: For each unit in units, if the result of creating a type from unit
  // is failure, throw a SyntaxError.

  // TODO: The toSum() algorithm should also verify that the requested units
  // are addable with each other (file a spec issue).

  // Step 2.
  auto styleNumericValue = ToStyleNumericValue();

  auto sumValue = WrapUnique(Servo_SumValue_Create(&styleNumericValue));
  if (!sumValue) {
    aRv.ThrowTypeError("Failed to create a sum value");
    return nullptr;
  }

  // Step 3-6.
  auto styleMathSum = StyleOptional<StyleMathSum>::None();
  Servo_SumValue_ToUnits(sumValue.get(),
                         &static_cast<const nsTArray<nsCString>&>(aUnits),
                         &styleMathSum);
  if (styleMathSum.IsNone()) {
    aRv.ThrowTypeError("Failed to convert to requested units");
    return nullptr;
  }

  // Step 7.
  RefPtr<CSSMathSum> mathSum =
      CSSMathSum::Create(mParent, styleMathSum.AsSome());
  return mathSum.forget();
}

void CSSNumericValue::Type(CSSNumericType& aRetVal) {}

// https://drafts.css-houdini.org/css-typed-om-1/#dom-cssnumericvalue-parse
//
// static
already_AddRefed<CSSNumericValue> CSSNumericValue::Parse(
    const GlobalObject& aGlobal, const nsACString& aCssText, ErrorResult& aRv) {
  // Step 1 & 2 & 3.
  auto declaration = WrapUnique(Servo_NumericDeclaration_Parse(&aCssText));
  if (!declaration) {
    aRv.ThrowSyntaxError("Failed to parse CSS text");
    return nullptr;
  }

  // Step 4.
  StyleNumericValueResult result = StyleNumericValueResult::Unsupported();
  Servo_NumericDeclaration_GetValue(declaration.get(), &result);
  if (result.IsUnsupported()) {
    aRv.Throw(NS_ERROR_UNEXPECTED);
    return nullptr;
  }

  RefPtr<CSSNumericValue> numericValue =
      Create(aGlobal.GetAsSupports(), result.AsNumeric());
  return numericValue.forget();
}

// end of CSSNumericValue Web IDL implementation

bool CSSNumericValue::IsCSSUnitValue() const {
  return mNumericValueType == NumericValueType::UnitValue;
}

bool CSSNumericValue::IsCSSMathValue() const {
  return mNumericValueType == NumericValueType::MathValue;
}

void CSSNumericValue::ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                                            nsACString& aDest) const {
  ToCssTextWithProperty(aPropertyId, SerializationContext(), aDest);
}

void CSSNumericValue::ToCssTextWithProperty(
    const CSSPropertyId& aPropertyId, const SerializationContext& aContext,
    nsACString& aDest) const {
  switch (GetNumericValueType()) {
    case NumericValueType::MathValue: {
      const CSSMathValue& mathValue = GetAsCSSMathValue();

      mathValue.ToCssTextWithProperty(aPropertyId, aContext, aDest);
      break;
    }

    case NumericValueType::UnitValue: {
      const CSSUnitValue& unitValue = GetAsCSSUnitValue();

      unitValue.ToCssTextWithProperty(aPropertyId, aDest);
      break;
    }
  }
}

StyleNumericValue CSSNumericValue::ToStyleNumericValue() const {
  switch (GetNumericValueType()) {
    case NumericValueType::MathValue: {
      const CSSMathValue& mathValue = GetAsCSSMathValue();

      return StyleNumericValue::Math(mathValue.ToStyleMathValue());
    }

    case NumericValueType::UnitValue: {
      const CSSUnitValue& unitValue = GetAsCSSUnitValue();

      return StyleNumericValue::Unit(unitValue.ToStyleUnitValue());
    }
  }
  MOZ_MAKE_COMPILER_ASSUME_IS_UNREACHABLE("Bad numeric value type!");
}

const CSSNumericValue& CSSStyleValue::GetAsCSSNumericValue() const {
  MOZ_DIAGNOSTIC_ASSERT(mStyleValueType == StyleValueType::NumericValue);

  return *static_cast<const CSSNumericValue*>(this);
}

CSSNumericValue& CSSStyleValue::GetAsCSSNumericValue() {
  MOZ_DIAGNOSTIC_ASSERT(mStyleValueType == StyleValueType::NumericValue);

  return *static_cast<CSSNumericValue*>(this);
}

}  // namespace mozilla::dom
