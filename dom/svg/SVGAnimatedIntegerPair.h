/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_SVG_SVGANIMATEDINTEGERPAIR_H_
#define DOM_SVG_SVGANIMATEDINTEGERPAIR_H_

#include <memory>

#include "DOMSVGAnimatedInteger.h"
#include "mozilla/EnumeratedArray.h"
#include "mozilla/SMILAttr.h"
#include "nsCycleCollectionParticipant.h"
#include "nsError.h"

namespace mozilla {

class SMILValue;

namespace dom {
class SVGAnimationElement;
class SVGElement;
}  // namespace dom

enum class SVGAnimatedIntegerPairWhichOne { First, Second };

// Glue to make EnumeratedArray work with SVGAnimatedIntegerPairWhichOne.
template <>
struct MaxContiguousEnumValue<SVGAnimatedIntegerPairWhichOne> {
  static constexpr auto value = SVGAnimatedIntegerPairWhichOne::Second;
};

class SVGAnimatedIntegerPair {
 public:
  friend class AutoChangeIntegerPairNotifier;
  using SVGElement = dom::SVGElement;

  using WhichOneOfPair = SVGAnimatedIntegerPairWhichOne;
  using PairValues = EnumeratedArray<WhichOneOfPair, int32_t>;

  void Init(uint8_t aAttrEnum = 0xff, int32_t aValue = 0) {
    mAnimVal = mBaseVal = PairValues(aValue, aValue);
    mAttrEnum = aAttrEnum;
    mIsAnimated = false;
    mIsBaseSet = false;
  }

  nsresult SetBaseValueString(const nsAString& aValue, SVGElement* aSVGElement);
  void GetBaseValueString(nsAString& aValue) const;

  void SetBaseValue(int32_t aValue, WhichOneOfPair aWhichOneOfPair,
                    SVGElement* aSVGElement);
  int32_t GetBaseValue(WhichOneOfPair aWhichOneOfPair) const {
    return mBaseVal[aWhichOneOfPair];
  }
  void SetAnimValue(const int32_t aValue[2], SVGElement* aSVGElement);
  int32_t GetAnimValue(WhichOneOfPair aWhichOneOfPair) const {
    return mAnimVal[aWhichOneOfPair];
  }

  // Returns true if the animated value of this integer has been explicitly
  // set (either by animation, or by taking on the base value which has been
  // explicitly set by markup or a DOM call), false otherwise.
  // If this returns false, the animated value is still valid, that is,
  // usable, and represents the default base value of the attribute.
  bool IsExplicitlySet() const { return mIsAnimated || mIsBaseSet; }

  already_AddRefed<dom::DOMSVGAnimatedInteger> ToDOMAnimatedInteger(
      WhichOneOfPair aWhichOneOfPair, SVGElement* aSVGElement);
  std::unique_ptr<SMILAttr> ToSMILAttr(SVGElement* aSVGElement);

 private:
  PairValues mAnimVal;
  PairValues mBaseVal;
  uint8_t mAttrEnum;  // element specified tracking for attribute
  bool mIsAnimated;
  bool mIsBaseSet;

 public:
  struct DOMAnimatedInteger final : public dom::DOMSVGAnimatedInteger {
    DOMAnimatedInteger(SVGAnimatedIntegerPair* aVal,
                       WhichOneOfPair aWhichOneOfPair, SVGElement* aSVGElement)
        : dom::DOMSVGAnimatedInteger(aSVGElement),
          mVal(aVal),
          mWhichOneOfPair(aWhichOneOfPair) {}
    virtual ~DOMAnimatedInteger();

    SVGAnimatedIntegerPair* mVal;    // kept alive because it belongs to content
    WhichOneOfPair mWhichOneOfPair;  // are we the first or second integer

    int32_t BaseVal() override { return mVal->GetBaseValue(mWhichOneOfPair); }
    void SetBaseVal(int32_t aValue) override {
      mVal->SetBaseValue(aValue, mWhichOneOfPair, mSVGElement);
    }

    // Script may have modified animation parameters or timeline -- DOM getters
    // need to flush any resample requests to reflect these modifications.
    int32_t AnimVal() override {
      mSVGElement->FlushAnimations();
      return mVal->GetAnimValue(mWhichOneOfPair);
    }
  };

  struct SMILIntegerPair : public SMILAttr {
   public:
    SMILIntegerPair(SVGAnimatedIntegerPair* aVal, SVGElement* aSVGElement)
        : mVal(aVal), mSVGElement(aSVGElement) {}

    // These will stay alive because a SMILAttr only lives as long
    // as the Compositing step, and DOM elements don't get a chance to
    // die during that.
    SVGAnimatedIntegerPair* mVal;
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

#endif  // DOM_SVG_SVGANIMATEDINTEGERPAIR_H_
