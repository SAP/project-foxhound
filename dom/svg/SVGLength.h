/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_SVG_SVGLENGTH_H_
#define DOM_SVG_SVGLENGTH_H_

#include "mozilla/dom/SVGLengthBinding.h"
#include "nsDebug.h"

enum nsCSSUnit : uint32_t;

namespace mozilla {

namespace dom {
class SVGElement;
class UserSpaceMetrics;
}  // namespace dom

/**
 * This SVGLength class is currently used for SVGLength *list* attributes only.
 * The class that is currently used for <length> attributes is
 * SVGAnimatedLength.
 *
 * The member mUnit should always be valid, but the member mValue may be
 * numeric_limits<float>::quiet_NaN() under one circumstances (see the comment
 * in SetValueAndUnit below). Even if mValue is valid, some methods may return
 * numeric_limits<float>::quiet_NaN() if they involve a unit conversion that
 * fails - see comments below.
 *
 * The DOM wrapper class for this class is DOMSVGLength.
 */
class SVGLength {
 public:
  SVGLength()
      : mValue(0.0f), mUnit(dom::SVGLength_Binding::SVG_LENGTHTYPE_UNKNOWN) {}

  SVGLength(float aValue, uint16_t aUnit)
      : mValue(aValue), mUnit(uint8_t(aUnit)) {
    MOZ_ASSERT(aUnit <= std::numeric_limits<uint8_t>::max(),
               "Length unit-type enums should fit in 8 bits");
  }

  // Coordinate direction for ObjectSpace/UserSpace.
  enum class Axis : uint8_t { X, Y, XY };

  bool operator==(const SVGLength& rhs) const {
    return mValue == rhs.mValue && mUnit == rhs.mUnit;
  }

  void GetValueAsString(nsAString& aValue) const;

  /**
   * This method returns true, unless there was a parse failure, in which
   * case it returns false (and the length is left unchanged).
   */
  bool SetValueFromString(const nsAString& aString);

  /**
   * This will usually return a valid, finite number. There is one exception
   * though. If SVGLengthListSMILType has to convert between unit types and the
   * unit conversion is undefined, it will end up passing in and setting
   * numeric_limits<float>::quiet_NaN(). The painting code has to be
   * able to handle NaN anyway, since conversion to user units may fail in
   * general.
   */
  float GetValueInCurrentUnits() const { return mValue; }

  uint16_t GetUnit() const { return mUnit; }

  void SetValueInCurrentUnits(float aValue) {
    NS_ASSERTION(std::isfinite(aValue), "Set invalid SVGLength");
    mValue = aValue;
  }

  void SetValueAndUnit(float aValue, uint16_t aUnit) {
    MOZ_ASSERT(aUnit <= std::numeric_limits<uint8_t>::max(),
               "Length unit-type enums should fit in 8 bits");
    mValue = aValue;
    mUnit = uint8_t(aUnit);
  }

  /**
   * If it's not possible to convert this length's value to pixels, then
   * this method will return numeric_limits<float>::quiet_NaN().
   */
  float GetValueInPixels(const dom::SVGElement* aElement, Axis aAxis) const;

  float GetValueInPixelsWithZoom(const dom::SVGElement* aElement,
                                 Axis aAxis) const;

  /**
   * Get this length's value in the units specified.
   *
   * This method returns numeric_limits<float>::quiet_NaN() if it is not
   * possible to convert the value to the specified unit.
   */
  float GetValueInSpecifiedUnit(uint16_t aUnit, const dom::SVGElement* aElement,
                                Axis aAxis) const;

  bool IsPercentage() const { return IsPercentageUnit(mUnit); }

  float GetPixelsPerUnitWithZoom(const dom::UserSpaceMetrics& aMetrics,
                                 Axis aAxis) const {
    return GetPixelsPerUnit(aMetrics, mUnit, aAxis, true);
  }

  float GetPixelsPerUnit(const dom::UserSpaceMetrics& aMetrics,
                         Axis aAxis) const {
    return GetPixelsPerUnit(aMetrics, mUnit, aAxis, false);
  }

  static bool IsValidUnitType(uint16_t aUnitType) {
    return aUnitType > dom::SVGLength_Binding::SVG_LENGTHTYPE_UNKNOWN &&
           aUnitType <= dom::SVGLength_Binding::SVG_LENGTHTYPE_PC;
  }

  static bool IsPercentageUnit(uint16_t aUnit) {
    return aUnit == dom::SVGLength_Binding::SVG_LENGTHTYPE_PERCENTAGE;
  }

  static bool IsAbsoluteUnit(uint16_t aUnit);

  static bool IsFontRelativeUnit(uint16_t aUnit);

  static float GetAbsUnitsPerAbsUnit(uint16_t aUnits, uint16_t aPerUnit);

  static nsCSSUnit SpecifiedUnitTypeToCSSUnit(uint16_t aSpecifiedUnit);

  static void GetUnitString(nsAString& aUnit, uint16_t aUnitType);

  static uint16_t GetUnitTypeForString(const nsAString& aUnit);

  /**
   * Returns the number of pixels per given unit.
   */
  static float GetPixelsPerUnit(const dom::UserSpaceMetrics& aMetrics,
                                uint16_t aUnitType, Axis aAxis,
                                bool aApplyZoom);

  static float GetPixelsPerCSSUnit(const dom::UserSpaceMetrics& aMetrics,
                                   nsCSSUnit aCSSUnit, Axis aAxis,
                                   bool aApplyZoom);

 private:
  float mValue;
  uint8_t mUnit;
};

}  // namespace mozilla

#endif  // DOM_SVG_SVGLENGTH_H_
