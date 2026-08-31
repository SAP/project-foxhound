/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSMathValue.h"

#include "mozilla/Assertions.h"
#include "mozilla/RefPtr.h"
#include "mozilla/ServoStyleConsts.h"
#include "mozilla/dom/CSSMathClamp.h"
#include "mozilla/dom/CSSMathInvert.h"
#include "mozilla/dom/CSSMathMax.h"
#include "mozilla/dom/CSSMathMin.h"
#include "mozilla/dom/CSSMathNegate.h"
#include "mozilla/dom/CSSMathProduct.h"
#include "mozilla/dom/CSSMathSum.h"
#include "mozilla/dom/CSSMathValueBinding.h"

namespace mozilla::dom {

CSSMathValue::CSSMathValue(nsCOMPtr<nsISupports> aParent,
                           MathValueType aMathValueType)
    : CSSNumericValue(std::move(aParent), NumericValueType::MathValue),
      mMathValueType(aMathValueType) {}

// static
RefPtr<CSSMathValue> CSSMathValue::Create(nsCOMPtr<nsISupports> aParent,
                                          const StyleMathValue& aMathValue) {
  RefPtr<CSSMathValue> mathValue;

  switch (aMathValue.tag) {
    case StyleMathValue::Tag::Sum: {
      const auto& mathSum = aMathValue.AsSum();

      mathValue = CSSMathSum::Create(std::move(aParent), mathSum);
      break;
    }

    case StyleMathValue::Tag::Product: {
      const auto& mathProduct = aMathValue.AsProduct();

      mathValue = CSSMathProduct::Create(std::move(aParent), mathProduct);
      break;
    }

    case StyleMathValue::Tag::Negate: {
      const auto& mathNegate = aMathValue.AsNegate();

      mathValue = CSSMathNegate::Create(std::move(aParent), mathNegate);
      break;
    }

    case StyleMathValue::Tag::Invert: {
      const auto& mathInvert = aMathValue.AsInvert();

      mathValue = CSSMathInvert::Create(std::move(aParent), mathInvert);
      break;
    }

    case StyleMathValue::Tag::Min: {
      const auto& mathMin = aMathValue.AsMin();

      mathValue = CSSMathMin::Create(std::move(aParent), mathMin);
      break;
    }

    case StyleMathValue::Tag::Max: {
      const auto& mathMax = aMathValue.AsMax();

      mathValue = CSSMathMax::Create(std::move(aParent), mathMax);
      break;
    }

    case StyleMathValue::Tag::Clamp: {
      const auto& mathClamp = aMathValue.AsClamp();

      mathValue = CSSMathClamp::Create(std::move(aParent), mathClamp);
      break;
    }
  }

  return mathValue;
}

// start of CSSMathtValue Web IDL implementation

CSSMathOperator CSSMathValue::Operator() const {
  // TODO: Just return mMathOperator once mMathValueType is replaced with it.

  switch (GetMathValueType()) {
    case MathValueType::MathClamp:
      return CSSMathOperator::Clamp;

    case MathValueType::MathMax:
      return CSSMathOperator::Max;

    case MathValueType::MathMin:
      return CSSMathOperator::Min;

    case MathValueType::MathInvert:
      return CSSMathOperator::Invert;

    case MathValueType::MathNegate:
      return CSSMathOperator::Negate;

    case MathValueType::MathProduct:
      return CSSMathOperator::Product;

    case MathValueType::MathSum:
      return CSSMathOperator::Sum;
  }
  MOZ_MAKE_COMPILER_ASSUME_IS_UNREACHABLE("Bad math value type!");
}

// end of CSSMathtValue Web IDL implementation

bool CSSMathValue::IsCSSMathSum() const {
  return mMathValueType == MathValueType::MathSum;
}

bool CSSMathValue::IsCSSMathProduct() const {
  return mMathValueType == MathValueType::MathProduct;
}

bool CSSMathValue::IsCSSMathNegate() const {
  return mMathValueType == MathValueType::MathNegate;
}

bool CSSMathValue::IsCSSMathInvert() const {
  return mMathValueType == MathValueType::MathInvert;
}

bool CSSMathValue::IsCSSMathMin() const {
  return mMathValueType == MathValueType::MathMin;
}

bool CSSMathValue::IsCSSMathMax() const {
  return mMathValueType == MathValueType::MathMax;
}

bool CSSMathValue::IsCSSMathClamp() const {
  return mMathValueType == MathValueType::MathClamp;
}

void CSSMathValue::ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                                         const SerializationContext& aContext,
                                         nsACString& aDest) const {
  switch (GetMathValueType()) {
    case MathValueType::MathClamp: {
      const CSSMathClamp& mathClamp = GetAsCSSMathClamp();

      mathClamp.ToCssTextWithProperty(aPropertyId, aContext, aDest);
      break;
    }

    case MathValueType::MathMax: {
      const CSSMathMax& mathMax = GetAsCSSMathMax();

      mathMax.ToCssTextWithProperty(aPropertyId, aContext, aDest);
      break;
    }

    case MathValueType::MathMin: {
      const CSSMathMin& mathMin = GetAsCSSMathMin();

      mathMin.ToCssTextWithProperty(aPropertyId, aContext, aDest);
      break;
    }

    case MathValueType::MathInvert: {
      const CSSMathInvert& mathInvert = GetAsCSSMathInvert();

      mathInvert.ToCssTextWithProperty(aPropertyId, aContext, aDest);
      break;
    }

    case MathValueType::MathNegate: {
      const CSSMathNegate& mathNegate = GetAsCSSMathNegate();

      mathNegate.ToCssTextWithProperty(aPropertyId, aContext, aDest);
      break;
    }

    case MathValueType::MathProduct: {
      const CSSMathProduct& mathProduct = GetAsCSSMathProduct();

      mathProduct.ToCssTextWithProperty(aPropertyId, aContext, aDest);
      break;
    }

    case MathValueType::MathSum: {
      const CSSMathSum& mathSum = GetAsCSSMathSum();

      mathSum.ToCssTextWithProperty(aPropertyId, aContext, aDest);
      break;
    }
  }
}

StyleMathValue CSSMathValue::ToStyleMathValue() const {
  switch (GetMathValueType()) {
    case MathValueType::MathClamp: {
      const CSSMathClamp& mathClamp = GetAsCSSMathClamp();

      return StyleMathValue::Clamp(mathClamp.ToStyleMathClamp());
    }

    case MathValueType::MathMax: {
      const CSSMathMax& mathMax = GetAsCSSMathMax();

      return StyleMathValue::Max(mathMax.ToStyleMathMax());
    }

    case MathValueType::MathMin: {
      const CSSMathMin& mathMin = GetAsCSSMathMin();

      return StyleMathValue::Min(mathMin.ToStyleMathMin());
    }

    case MathValueType::MathInvert: {
      const CSSMathInvert& mathInvert = GetAsCSSMathInvert();

      return StyleMathValue::Invert(mathInvert.ToStyleMathInvert());
    }

    case MathValueType::MathNegate: {
      const CSSMathNegate& mathNegate = GetAsCSSMathNegate();

      return StyleMathValue::Negate(mathNegate.ToStyleMathNegate());
    }

    case MathValueType::MathProduct: {
      const CSSMathProduct& mathProduct = GetAsCSSMathProduct();

      return StyleMathValue::Product(mathProduct.ToStyleMathProduct());
    }

    case MathValueType::MathSum: {
      const CSSMathSum& mathSum = GetAsCSSMathSum();

      return StyleMathValue::Sum(mathSum.ToStyleMathSum());
    }
  }
  MOZ_MAKE_COMPILER_ASSUME_IS_UNREACHABLE("Bad math value type!");
}

const CSSMathValue& CSSNumericValue::GetAsCSSMathValue() const {
  MOZ_DIAGNOSTIC_ASSERT(mNumericValueType == NumericValueType::MathValue);

  return *static_cast<const CSSMathValue*>(this);
}

CSSMathValue& CSSNumericValue::GetAsCSSMathValue() {
  MOZ_DIAGNOSTIC_ASSERT(mNumericValueType == NumericValueType::MathValue);

  return *static_cast<CSSMathValue*>(this);
}

}  // namespace mozilla::dom
