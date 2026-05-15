/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_SVG_SVGANIMATEDVIEWBOX_H_
#define DOM_SVG_SVGANIMATEDVIEWBOX_H_

#include <memory>

#include "SVGAttrTearoffTable.h"
#include "mozilla/SMILAttr.h"
#include "mozilla/dom/SVGAnimatedRect.h"
#include "mozilla/gfx/Point.h"
#include "nsCycleCollectionParticipant.h"
#include "nsError.h"

namespace mozilla {

class SMILValue;

namespace dom {
class SVGRect;
class SVGAnimationElement;
class SVGElement;
}  // namespace dom

struct SVGViewBox {
  float x, y;
  float width, height;
  bool none;

  SVGViewBox() : x(0.0), y(0.0), width(0.0), height(0.0), none(true) {}
  SVGViewBox(float aX, float aY, float aWidth, float aHeight)
      : x(aX), y(aY), width(aWidth), height(aHeight), none(false) {}
  bool operator==(const SVGViewBox& aOther) const;
  SVGViewBox operator*(const float m) const {
    return SVGViewBox(x * m, y * m, width * m, height * m);
  }

  gfx::Size Size() const { return gfx::Size(width, height); }

  bool IsFinite() const {
    if (none) {
      return true;
    }
    return std::isfinite(x) && std::isfinite(y) && std::isfinite(width) &&
           std::isfinite(height);
  }

  bool IsEmpty() const { return !none && (width <= .0f || height <= .0f); }

  bool IsValid() const { return IsFinite() && !IsEmpty(); }

  friend std::ostream& operator<<(std::ostream& stream,
                                  const SVGViewBox& aViewBox) {
    if (aViewBox.none) {
      return stream << "(none)";
    }
    return stream << "(x=" << aViewBox.x << ", y=" << aViewBox.y
                  << ", w=" << aViewBox.width << ", h=" << aViewBox.height
                  << ')';
  }

  static nsresult FromString(const nsAString& aStr, SVGViewBox* aViewBox);
};

class SVGAnimatedViewBox {
 public:
  friend class AutoChangeViewBoxNotifier;
  using SVGElement = dom::SVGElement;

  SVGAnimatedViewBox& operator=(const SVGAnimatedViewBox& aOther) {
    mBaseVal = aOther.mBaseVal;
    if (aOther.mAnimVal) {
      mAnimVal = std::make_unique<SVGViewBox>(*aOther.mAnimVal);
    }
    mHasBaseVal = aOther.mHasBaseVal;
    return *this;
  }

  void Init();

  /**
   * Returns true if the corresponding "viewBox" attribute defined a rectangle
   * with finite values and nonnegative width/height.
   * Returns false if the viewBox was set to an invalid
   * string, or if any of the four rect values were too big to store in a
   * float, or the width/height are negative.
   */
  bool HasRect() const;

  /**
   * Returns true if the corresponding "viewBox" attribute either defined a
   * rectangle with finite values or the special "none" value.
   */
  bool IsExplicitlySet() const {
    if (mAnimVal || mHasBaseVal) {
      return GetAnimValue().IsValid();
    }
    return false;
  }

  const SVGViewBox& GetBaseValue() const { return mBaseVal; }
  void SetBaseX(float aX, SVGElement* aSVGElement) {
    SetBaseField(aX, aSVGElement, mBaseVal.x);
  }
  void SetBaseY(float aY, SVGElement* aSVGElement) {
    SetBaseField(aY, aSVGElement, mBaseVal.y);
  }
  void SetBaseWidth(float aWidth, SVGElement* aSVGElement) {
    SetBaseField(aWidth, aSVGElement, mBaseVal.width);
  }
  void SetBaseHeight(float aHeight, SVGElement* aSVGElement) {
    SetBaseField(aHeight, aSVGElement, mBaseVal.height);
  }
  void SetBaseValue(const SVGViewBox& aRect, SVGElement* aSVGElement,
                    bool aDoSetAttr);
  const SVGViewBox& GetAnimValue() const {
    return mAnimVal ? *mAnimVal : mBaseVal;
  }
  void SetAnimValue(const SVGViewBox& aRect, SVGElement* aSVGElement);

  nsresult SetBaseValueString(const nsAString& aValue, SVGElement* aSVGElement,
                              bool aDoSetAttr);
  void GetBaseValueString(nsAString& aValue) const;

  already_AddRefed<dom::SVGAnimatedRect> ToSVGAnimatedRect(
      SVGElement* aSVGElement);

  already_AddRefed<dom::SVGRect> ToDOMBaseVal(SVGElement* aSVGElement);

  already_AddRefed<dom::SVGRect> ToDOMAnimVal(SVGElement* aSVGElement);

  std::unique_ptr<SMILAttr> ToSMILAttr(SVGElement* aSVGElement);

 private:
  void SetBaseField(float aHeight, SVGElement* aSVGElement, float& aElement);

  std::unique_ptr<SVGViewBox> mAnimVal;
  SVGViewBox mBaseVal;
  bool mHasBaseVal;

 public:
  struct SMILViewBox : public SMILAttr {
   public:
    SMILViewBox(SVGAnimatedViewBox* aVal, SVGElement* aSVGElement)
        : mVal(aVal), mSVGElement(aSVGElement) {}

    // These will stay alive because a SMILAttr only lives as long
    // as the Compositing step, and DOM elements don't get a chance to
    // die during that.
    SVGAnimatedViewBox* mVal;
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

  static SVGAttrTearoffTable<SVGAnimatedViewBox, dom::SVGAnimatedRect>
      sSVGAnimatedRectTearoffTable;
};

}  // namespace mozilla

#endif  // DOM_SVG_SVGANIMATEDVIEWBOX_H_
