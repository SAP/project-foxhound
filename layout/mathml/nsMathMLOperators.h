/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsMathMLOperators_h_
#define nsMathMLOperators_h_

#include <stdint.h>

#include "mozilla/EnumSet.h"
#include "mozilla/FloatingPoint.h"
#include "nsStringFwd.h"

enum class StretchDirection : uint8_t {
  Unsupported,
  Default,
  Horizontal,
  Vertical,
};

enum class OperatorBoolean : uint16_t {
  ForcesMathMLChar,
  Mutable,
  HasEmbellishAncestor,
  EmbellishIsIsolated,
  Invisible,
  Stretchy,
  Fence,
  Accent,
  LargeOperator,
  Separator,
  MovableLimits,
  Symmetric,
  MinSizeIsAbsolute,
  MaxSizeIsAbsolute,
  HasLSpaceAttribute,
  HasRSpaceAttribute,
};
using OperatorBooleans = mozilla::EnumSet<OperatorBoolean>;

enum class OperatorForm : uint8_t {
  Unknown,
  Infix,
  Prefix,
  Postfix,
};
constexpr uint8_t OperatorFormMask = 0x3;

enum class OperatorDirection : uint8_t {
  Unknown,
  Horizontal,
  Vertical,
};
constexpr uint8_t OperatorDirectionShift = 2;
constexpr uint8_t OperatorDirectionMask = 0x3 << OperatorDirectionShift;

class nsOperatorFlags {
 public:
  OperatorBooleans& Booleans() { return mBooleans; }
  const OperatorBooleans& Booleans() const { return mBooleans; }
  OperatorForm Form() const {
    return static_cast<OperatorForm>(mFormAndDirection & OperatorFormMask);
  }
  OperatorDirection Direction() const {
    return static_cast<OperatorDirection>(
        (mFormAndDirection & OperatorDirectionMask) >> OperatorDirectionShift);
  }
  void SetForm(OperatorForm aForm) {
    mFormAndDirection &= ~OperatorFormMask;
    mFormAndDirection |= static_cast<uint8_t>(aForm);
  }
  void SetDirection(OperatorDirection aDirection) {
    mFormAndDirection &= ~OperatorDirectionMask;
    mFormAndDirection |= static_cast<uint8_t>(aDirection)
                         << OperatorDirectionShift;
  }
  void Clear() {
    mBooleans.clear();
    mFormAndDirection = 0;
  }

 private:
  OperatorBooleans mBooleans;
  uint8_t mFormAndDirection = 0;
};

constexpr inline float kMathMLOperatorSizeInfinity =
    mozilla::PositiveInfinity<float>();

class nsMathMLOperators {
 public:
  static void AddRefTable(void);
  static void ReleaseTable(void);
  static void CleanUp();

  // LookupOperator:
  // Given the string value of an operator and its form (last two bits of
  // flags), this method returns attributes of the operator in the output
  // parameters. The return value indicates whether an entry was found.
  static bool LookupOperator(const nsString& aOperator,
                             const OperatorForm aForm, nsOperatorFlags* aFlags,
                             float* aLeadingSpace, float* aTrailingSpace);

  // LookupOperatorWithFallback:
  // Same as LookupOperator but if the operator is not found under the supplied
  // form, then the other forms are tried in the following order: infix, postfix
  // prefix. The caller can test the output parameter aFlags to know exactly
  // under which form the operator was found in the Operator Dictionary.
  static bool LookupOperatorWithFallback(const nsString& aOperator,
                                         const OperatorForm aForm,
                                         nsOperatorFlags* aFlags,
                                         float* aLeadingSpace,
                                         float* aTrailingSpace);

  // Helper functions used by the nsMathMLChar class.
  static bool IsMirrorableOperator(const nsString& aOperator);
  static nsString GetMirroredOperator(const nsString& aOperator);

  // Helper functions used by the nsMathMLChar class to determine whether
  // aOperator corresponds to an integral operator.
  static bool IsIntegralOperator(const nsString& aOperator);

  // Helper function used by the nsMathMLChar class.
  static StretchDirection GetStretchyDirection(const nsString& aOperator);
};

#endif /* nsMathMLOperators_h_ */
