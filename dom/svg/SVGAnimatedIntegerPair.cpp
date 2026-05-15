/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SVGAnimatedIntegerPair.h"

#include "SVGAttrTearoffTable.h"
#include "SVGIntegerPairSMILType.h"
#include "mozAutoDocUpdate.h"
#include "mozilla/SMILValue.h"
#include "mozilla/SVGContentUtils.h"
#include "nsCharSeparatedTokenizer.h"
#include "nsError.h"
#include "nsMathUtils.h"

using namespace mozilla::dom;

namespace mozilla {

//----------------------------------------------------------------------
// Helper class: AutoChangeIntegerPairNotifier
// Stack-based helper class to pair calls to WillChangeIntegerPair and
// DidChangeIntegerPair.
class MOZ_RAII AutoChangeIntegerPairNotifier {
 public:
  AutoChangeIntegerPairNotifier(SVGAnimatedIntegerPair* aIntegerPair,
                                SVGElement* aSVGElement, bool aDoSetAttr = true)
      : mIntegerPair(aIntegerPair),
        mSVGElement(aSVGElement),
        mDoSetAttr(aDoSetAttr) {
    MOZ_ASSERT(mIntegerPair, "Expecting non-null integerPair");
    MOZ_ASSERT(mSVGElement, "Expecting non-null element");

    if (mDoSetAttr) {
      mUpdateBatch.emplace(aSVGElement->GetComposedDoc(), true);
      mSVGElement->WillChangeIntegerPair(mIntegerPair->mAttrEnum,
                                         mUpdateBatch.ref());
    }
  }

  ~AutoChangeIntegerPairNotifier() {
    if (mDoSetAttr) {
      mSVGElement->DidChangeIntegerPair(mIntegerPair->mAttrEnum,
                                        mUpdateBatch.ref());
    }
    if (mIntegerPair->mIsAnimated) {
      mSVGElement->AnimationNeedsResample();
    }
  }

 private:
  SVGAnimatedIntegerPair* const mIntegerPair;
  SVGElement* const mSVGElement;
  Maybe<mozAutoDocUpdate> mUpdateBatch;
  bool mDoSetAttr;
};

// An array of two tearoff tables, indexed using the enum
// SVGAnimatedIntegerPairWhichOne.  Each of the two tables is a map from
// SVGAnimatedIntegerPair to a DOM wrapper for the first or second entry in the
// SVGAnimatedIntegerPair. (The first table contains wrappers for pairs' first
// entries, and the second table contains wrappers for pairs' second entries.)
constinit static EnumeratedArray<
    SVGAnimatedIntegerPairWhichOne,
    SVGAttrTearoffTable<SVGAnimatedIntegerPair,
                        SVGAnimatedIntegerPair::DOMAnimatedInteger>>
    sSVGAnimatedIntegerTearoffTables;

/* Implementation */

static nsresult ParseIntegerOptionalInteger(const nsAString& aValue,
                                            int32_t aValues[2]) {
  nsCharSeparatedTokenizerTemplate<nsContentUtils::IsHTMLWhitespace,
                                   nsTokenizerFlags::SeparatorOptional>
      tokenizer(aValue, ',');
  uint32_t i;
  for (i = 0; i < 2 && tokenizer.hasMoreTokens(); ++i) {
    if (!SVGContentUtils::ParseInteger(tokenizer.nextToken(), aValues[i])) {
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

nsresult SVGAnimatedIntegerPair::SetBaseValueString(
    const nsAString& aValueAsString, SVGElement* aSVGElement) {
  int32_t val[2];

  nsresult rv = ParseIntegerOptionalInteger(aValueAsString, val);

  if (NS_FAILED(rv)) {
    return rv;
  }

  // We don't need to call DidChange* here - we're only called by
  // SVGElement::ParseAttribute under Element::SetAttr,
  // which takes care of notifying.
  AutoChangeIntegerPairNotifier notifier(this, aSVGElement, false);

  mBaseVal = PairValues(val[0], val[1]);
  mIsBaseSet = true;
  if (!mIsAnimated) {
    mAnimVal = mBaseVal;
  }
  return NS_OK;
}

void SVGAnimatedIntegerPair::GetBaseValueString(
    nsAString& aValueAsString) const {
  aValueAsString.Truncate();
  aValueAsString.AppendInt(mBaseVal[WhichOneOfPair::First]);
  if (mBaseVal[WhichOneOfPair::First] != mBaseVal[WhichOneOfPair::Second]) {
    aValueAsString.AppendLiteral(", ");
    aValueAsString.AppendInt(mBaseVal[WhichOneOfPair::Second]);
  }
}

void SVGAnimatedIntegerPair::SetBaseValue(int32_t aValue,
                                          WhichOneOfPair aWhichOneOfPair,
                                          SVGElement* aSVGElement) {
  if (mIsBaseSet && mBaseVal[aWhichOneOfPair] == aValue) {
    return;
  }

  AutoChangeIntegerPairNotifier notifier(this, aSVGElement);

  mBaseVal[aWhichOneOfPair] = aValue;
  mIsBaseSet = true;
  if (!mIsAnimated) {
    mAnimVal[aWhichOneOfPair] = aValue;
  }
}

void SVGAnimatedIntegerPair::SetAnimValue(const int32_t aValue[2],
                                          SVGElement* aSVGElement) {
  PairValues value(aValue[0], aValue[1]);
  if (mIsAnimated && std::ranges::equal(mAnimVal, value)) {
    return;
  }
  mAnimVal = value;
  mIsAnimated = true;
  aSVGElement->DidAnimateIntegerPair(mAttrEnum);
}

already_AddRefed<DOMSVGAnimatedInteger>
SVGAnimatedIntegerPair::ToDOMAnimatedInteger(WhichOneOfPair aWhichOneOfPair,
                                             SVGElement* aSVGElement) {
  RefPtr<DOMAnimatedInteger> domAnimatedInteger =
      sSVGAnimatedIntegerTearoffTables[aWhichOneOfPair].GetTearoff(this);
  if (!domAnimatedInteger) {
    domAnimatedInteger =
        new DOMAnimatedInteger(this, aWhichOneOfPair, aSVGElement);
    sSVGAnimatedIntegerTearoffTables[aWhichOneOfPair].AddTearoff(
        this, domAnimatedInteger);
  }

  return domAnimatedInteger.forget();
}

SVGAnimatedIntegerPair::DOMAnimatedInteger::~DOMAnimatedInteger() {
  sSVGAnimatedIntegerTearoffTables[mWhichOneOfPair].RemoveTearoff(mVal);
}

std::unique_ptr<SMILAttr> SVGAnimatedIntegerPair::ToSMILAttr(
    SVGElement* aSVGElement) {
  return std::make_unique<SMILIntegerPair>(this, aSVGElement);
}

nsresult SVGAnimatedIntegerPair::SMILIntegerPair::ValueFromString(
    const nsAString& aStr, const dom::SVGAnimationElement* /*aSrcElement*/,
    SMILValue& aValue, bool& aPreventCachingOfSandwich) const {
  int32_t values[2];

  nsresult rv = ParseIntegerOptionalInteger(aStr, values);
  if (NS_FAILED(rv)) {
    return rv;
  }

  SMILValue val(SVGIntegerPairSMILType::Singleton());
  val.mU.mIntPair[0] = values[0];
  val.mU.mIntPair[1] = values[1];
  aValue = val;

  return NS_OK;
}

SMILValue SVGAnimatedIntegerPair::SMILIntegerPair::GetBaseValue() const {
  SMILValue val(SVGIntegerPairSMILType::Singleton());
  val.mU.mIntPair[0] = mVal->mBaseVal[WhichOneOfPair::First];
  val.mU.mIntPair[1] = mVal->mBaseVal[WhichOneOfPair::Second];
  return val;
}

void SVGAnimatedIntegerPair::SMILIntegerPair::ClearAnimValue() {
  if (mVal->mIsAnimated) {
    mVal->mIsAnimated = false;
    mVal->mAnimVal = mVal->mBaseVal;
    mSVGElement->DidAnimateIntegerPair(mVal->mAttrEnum);
  }
}

nsresult SVGAnimatedIntegerPair::SMILIntegerPair::SetAnimValue(
    const SMILValue& aValue) {
  NS_ASSERTION(aValue.mType == SVGIntegerPairSMILType::Singleton(),
               "Unexpected type to assign animated value");
  if (aValue.mType == SVGIntegerPairSMILType::Singleton()) {
    mVal->SetAnimValue(aValue.mU.mIntPair, mSVGElement);
  }
  return NS_OK;
}

}  // namespace mozilla
