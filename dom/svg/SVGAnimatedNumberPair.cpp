/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SVGAnimatedNumberPair.h"

#include "SVGAttrTearoffTable.h"
#include "SVGNumberPairSMILType.h"
#include "mozilla/SMILValue.h"
#include "mozilla/SVGContentUtils.h"
#include "nsCharSeparatedTokenizer.h"
#include "nsContentUtils.h"

using namespace mozilla::dom;

namespace mozilla {

//----------------------------------------------------------------------
// Helper class: AutoChangeNumberPairNotifier
// Stack-based helper class to pair calls to WillChangeNumberPair and
// DidChangeNumberPair.
class MOZ_RAII AutoChangeNumberPairNotifier {
 public:
  AutoChangeNumberPairNotifier(SVGAnimatedNumberPair* aNumberPair,
                               SVGElement* aSVGElement, bool aDoSetAttr = true)
      : mNumberPair(aNumberPair),
        mSVGElement(aSVGElement),
        mDoSetAttr(aDoSetAttr) {
    MOZ_ASSERT(mNumberPair, "Expecting non-null numberPair");
    MOZ_ASSERT(mSVGElement, "Expecting non-null element");

    if (mDoSetAttr) {
      mSVGElement->WillChangeNumberPair(mNumberPair->mAttrEnum);
    }
  }

  ~AutoChangeNumberPairNotifier() {
    if (mDoSetAttr) {
      mSVGElement->DidChangeNumberPair(mNumberPair->mAttrEnum);
    }
    if (mNumberPair->mIsAnimated) {
      mSVGElement->AnimationNeedsResample();
    }
  }

 private:
  SVGAnimatedNumberPair* const mNumberPair;
  SVGElement* const mSVGElement;
  bool mDoSetAttr;
};

// An array of two tearoff tables, indexed using the enum
// SVGAnimatedNumberPairWhichOne.  Each of the two tables is a map from
// SVGAnimatedNumberPair to a DOM wrapper for the first or second entry in the
// SVGAnimatedNumberPair. (The first table contains wrappers for pairs' first
// entries, and the second table contains wrappers for pairs' second entries.)
constinit static EnumeratedArray<
    SVGAnimatedNumberPairWhichOne,
    SVGAttrTearoffTable<SVGAnimatedNumberPair,
                        SVGAnimatedNumberPair::DOMAnimatedNumber>>
    sSVGAnimatedNumberTearoffTables;

static nsresult ParseNumberOptionalNumber(const nsAString& aValue,
                                          float aValues[2]) {
  nsCharSeparatedTokenizerTemplate<nsContentUtils::IsHTMLWhitespace,
                                   nsTokenizerFlags::SeparatorOptional>
      tokenizer(aValue, ',');
  uint32_t i;
  for (i = 0; i < 2 && tokenizer.hasMoreTokens(); ++i) {
    if (!SVGContentUtils::ParseNumber(tokenizer.nextToken(), aValues[i])) {
      return NS_ERROR_DOM_SYNTAX_ERR;
    }
  }
  if (i == 1) {
    aValues[1] = aValues[0];
  }

  if (i == 0 ||                                  // Too few values.
      tokenizer.hasMoreTokens() ||               // Too many values.
      tokenizer.separatorAfterCurrentToken()) {  // Trailing comma.
    return NS_ERROR_DOM_SYNTAX_ERR;
  }

  return NS_OK;
}

nsresult SVGAnimatedNumberPair::SetBaseValueString(
    const nsAString& aValueAsString, SVGElement* aSVGElement) {
  float val[2];

  nsresult rv = ParseNumberOptionalNumber(aValueAsString, val);
  if (NS_FAILED(rv)) {
    return rv;
  }

  // We don't need to call Will/DidChange* here - we're only called by
  // SVGElement::ParseAttribute under Element::SetAttr,
  // which takes care of notifying.
  AutoChangeNumberPairNotifier notifier(this, aSVGElement, false);

  mBaseVal = PairValues(val[0], val[1]);
  mIsBaseSet = true;
  if (!mIsAnimated) {
    mAnimVal = mBaseVal;
  }

  return NS_OK;
}

void SVGAnimatedNumberPair::GetBaseValueString(
    nsAString& aValueAsString) const {
  aValueAsString.Truncate();
  aValueAsString.AppendFloat(mBaseVal[WhichOneOfPair::First]);
  if (mBaseVal[WhichOneOfPair::First] != mBaseVal[WhichOneOfPair::Second]) {
    aValueAsString.AppendLiteral(", ");
    aValueAsString.AppendFloat(mBaseVal[WhichOneOfPair::Second]);
  }
}

void SVGAnimatedNumberPair::SetBaseValue(float aValue,
                                         WhichOneOfPair aWhichOneOfPair,
                                         SVGElement* aSVGElement) {
  if (mIsBaseSet && mBaseVal[aWhichOneOfPair] == aValue) {
    return;
  }

  AutoChangeNumberPairNotifier notifier(this, aSVGElement);

  mBaseVal[aWhichOneOfPair] = aValue;
  mIsBaseSet = true;
  if (!mIsAnimated) {
    mAnimVal[aWhichOneOfPair] = aValue;
  }
}

void SVGAnimatedNumberPair::SetBaseValues(float aValue1, float aValue2,
                                          SVGElement* aSVGElement) {
  PairValues value(aValue1, aValue2);
  if (mIsBaseSet && std::ranges::equal(mBaseVal, value)) {
    return;
  }

  AutoChangeNumberPairNotifier notifier(this, aSVGElement);

  mBaseVal = value;
  mIsBaseSet = true;
  if (!mIsAnimated) {
    mAnimVal = value;
  }
}

void SVGAnimatedNumberPair::SetAnimValue(const float aValue[2],
                                         SVGElement* aSVGElement) {
  PairValues value(aValue[0], aValue[1]);
  if (mIsAnimated && std::ranges::equal(mAnimVal, value)) {
    return;
  }
  mAnimVal = value;
  mIsAnimated = true;
  aSVGElement->DidAnimateNumberPair(mAttrEnum);
}

already_AddRefed<DOMSVGAnimatedNumber>
SVGAnimatedNumberPair::ToDOMAnimatedNumber(WhichOneOfPair aWhichOneOfPair,
                                           SVGElement* aSVGElement) {
  RefPtr<DOMAnimatedNumber> domAnimatedNumber =
      sSVGAnimatedNumberTearoffTables[aWhichOneOfPair].GetTearoff(this);
  if (!domAnimatedNumber) {
    domAnimatedNumber =
        new DOMAnimatedNumber(this, aWhichOneOfPair, aSVGElement);
    sSVGAnimatedNumberTearoffTables[aWhichOneOfPair].AddTearoff(
        this, domAnimatedNumber);
  }

  return domAnimatedNumber.forget();
}

SVGAnimatedNumberPair::DOMAnimatedNumber::~DOMAnimatedNumber() {
  sSVGAnimatedNumberTearoffTables[mWhichOneOfPair].RemoveTearoff(mVal);
}

std::unique_ptr<SMILAttr> SVGAnimatedNumberPair::ToSMILAttr(
    SVGElement* aSVGElement) {
  return std::make_unique<SMILNumberPair>(this, aSVGElement);
}

nsresult SVGAnimatedNumberPair::SMILNumberPair::ValueFromString(
    const nsAString& aStr, const dom::SVGAnimationElement* /*aSrcElement*/,
    SMILValue& aValue, bool& aPreventCachingOfSandwich) const {
  float values[2];

  nsresult rv = ParseNumberOptionalNumber(aStr, values);
  if (NS_FAILED(rv)) {
    return rv;
  }

  SMILValue val(&SVGNumberPairSMILType::sSingleton);
  val.mU.mNumberPair[0] = values[0];
  val.mU.mNumberPair[1] = values[1];
  aValue = val;

  return NS_OK;
}

SMILValue SVGAnimatedNumberPair::SMILNumberPair::GetBaseValue() const {
  SMILValue val(&SVGNumberPairSMILType::sSingleton);
  val.mU.mNumberPair[0] = mVal->mBaseVal[WhichOneOfPair::First];
  val.mU.mNumberPair[1] = mVal->mBaseVal[WhichOneOfPair::Second];
  return val;
}

void SVGAnimatedNumberPair::SMILNumberPair::ClearAnimValue() {
  if (mVal->mIsAnimated) {
    mVal->mIsAnimated = false;
    mVal->mAnimVal = mVal->mBaseVal;
    mSVGElement->DidAnimateNumberPair(mVal->mAttrEnum);
  }
}

nsresult SVGAnimatedNumberPair::SMILNumberPair::SetAnimValue(
    const SMILValue& aValue) {
  NS_ASSERTION(aValue.mType == &SVGNumberPairSMILType::sSingleton,
               "Unexpected type to assign animated value");
  if (aValue.mType == &SVGNumberPairSMILType::sSingleton) {
    mVal->SetAnimValue(aValue.mU.mNumberPair, mSVGElement);
  }
  return NS_OK;
}

}  // namespace mozilla
