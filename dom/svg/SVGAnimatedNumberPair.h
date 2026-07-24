/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_SVG_SVGANIMATEDNUMBERPAIR_H_
#define DOM_SVG_SVGANIMATEDNUMBERPAIR_H_

#include <memory>

#include "DOMSVGAnimatedNumber.h"
#include "mozilla/EnumeratedArray.h"
#include "mozilla/SMILAttr.h"
#include "nsCycleCollectionParticipant.h"
#include "nsError.h"
#include "nsMathUtils.h"

namespace mozilla {

class SMILValue;

namespace dom {
class SVGAnimationElement;
class SVGElement;
}  // namespace dom

enum class SVGAnimatedNumberPairWhichOne { First, Second };

// Glue to make EnumeratedArray work with SVGAnimatedNumberPairWhichOne.
template <>
struct MaxContiguousEnumValue<SVGAnimatedNumberPairWhichOne> {
  static constexpr auto value = SVGAnimatedNumberPairWhichOne::Second;
};

class SVGAnimatedNumberPair {
 public:
  friend class AutoChangeNumberPairNotifier;
  using SVGElement = dom::SVGElement;

  using WhichOneOfPair = SVGAnimatedNumberPairWhichOne;
  using PairValues = EnumeratedArray<WhichOneOfPair, float>;

  void Init(uint8_t aAttrEnum = 0xff, float aValue = 0) {
    mAnimVal = mBaseVal = PairValues(aValue, aValue);
    mAttrEnum = aAttrEnum;
    mIsAnimated = false;
    mIsBaseSet = false;
  }

  nsresult SetBaseValueString(const nsAString& aValue, SVGElement* aSVGElement);
  void GetBaseValueString(nsAString& aValue) const;

  void SetBaseValue(float aValue, WhichOneOfPair aWhichOneOfPair,
                    SVGElement* aSVGElement);
  void SetBaseValues(float aValue1, float aValue2, SVGElement* aSVGElement);
  float GetBaseValue(WhichOneOfPair aWhichOneOfPair) const {
    return mBaseVal[aWhichOneOfPair];
  }
  void SetAnimValue(const float aValue[2], SVGElement* aSVGElement);
  float GetAnimValue(WhichOneOfPair aWhichOneOfPair) const {
    return mAnimVal[aWhichOneOfPair];
  }

  // Returns true if the animated value of this number has been explicitly
  // set (either by animation, or by taking on the base value which has been
  // explicitly set by markup or a DOM call), false otherwise.
  // If this returns false, the animated value is still valid, that is,
  // usable, and represents the default base value of the attribute.
  bool IsExplicitlySet() const { return mIsAnimated || mIsBaseSet; }

  already_AddRefed<dom::DOMSVGAnimatedNumber> ToDOMAnimatedNumber(
      WhichOneOfPair aWhichOneOfPair, SVGElement* aSVGElement);
  std::unique_ptr<SMILAttr> ToSMILAttr(SVGElement* aSVGElement);

 private:
  PairValues mAnimVal;
  PairValues mBaseVal;
  uint8_t mAttrEnum;  // element specified tracking for attribute
  bool mIsAnimated;
  bool mIsBaseSet;

 public:
  // DOM wrapper class for the (DOM)SVGAnimatedNumber interface where the
  // wrapped class is SVGAnimatedNumberPair.
  struct DOMAnimatedNumber final : public dom::DOMSVGAnimatedNumber {
    DOMAnimatedNumber(SVGAnimatedNumberPair* aVal,
                      WhichOneOfPair aWhichOneOfPair, SVGElement* aSVGElement)
        : dom::DOMSVGAnimatedNumber(aSVGElement),
          mVal(aVal),
          mWhichOneOfPair(aWhichOneOfPair) {}
    virtual ~DOMAnimatedNumber();

    SVGAnimatedNumberPair* mVal;     // kept alive because it belongs to content
    WhichOneOfPair mWhichOneOfPair;  // are we the first or second number

    float BaseVal() override { return mVal->GetBaseValue(mWhichOneOfPair); }
    void SetBaseVal(float aValue) override {
      MOZ_ASSERT(std::isfinite(aValue));
      mVal->SetBaseValue(aValue, mWhichOneOfPair, mSVGElement);
    }

    // Script may have modified animation parameters or timeline -- DOM getters
    // need to flush any resample requests to reflect these modifications.
    float AnimVal() override {
      mSVGElement->FlushAnimations();
      return mVal->GetAnimValue(mWhichOneOfPair);
    }
  };

  struct SMILNumberPair : public SMILAttr {
   public:
    SMILNumberPair(SVGAnimatedNumberPair* aVal, SVGElement* aSVGElement)
        : mVal(aVal), mSVGElement(aSVGElement) {}

    // These will stay alive because a SMILAttr only lives as long
    // as the Compositing step, and DOM elements don't get a chance to
    // die during that.
    SVGAnimatedNumberPair* mVal;
    SVGElement* mSVGElement;

    // SMILAttr methods
    nsresult ValueFromString(const nsAString& aStr,
                             const dom::SVGAnimationElement* aSrcElement,
                             SMILValue& aValue,
                             bool& aPreventCachingOfSandwich) const override;
    SMILValue GetBaseValue() const override;
    void ClearAnimValue() override;
    nsresult SetAnimValue(const SMILValue& aValue) override;
  };
};

}  // namespace mozilla

#endif  // DOM_SVG_SVGANIMATEDNUMBERPAIR_H_
