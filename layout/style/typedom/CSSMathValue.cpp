/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSMathValue.h"

#include "mozilla/dom/CSSMathValueBinding.h"

namespace mozilla::dom {

CSSMathValue::CSSMathValue(nsCOMPtr<nsISupports> aParent)
    : CSSNumericValue(std::move(aParent)) {}

CSSMathValue::CSSMathValue(nsCOMPtr<nsISupports> aParent,
                           NumericValueType aNumericValueType)
    : CSSNumericValue(std::move(aParent), aNumericValueType) {}

// start of CSSMathtValue Web IDL implementation

CSSMathOperator CSSMathValue::Operator() const { return CSSMathOperator::Sum; }

// end of CSSMathtValue Web IDL implementation

}  // namespace mozilla::dom
