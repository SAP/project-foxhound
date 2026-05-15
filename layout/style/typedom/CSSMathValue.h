/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSMATHVALUE_H_
#define LAYOUT_STYLE_TYPEDOM_CSSMATHVALUE_H_

#include "mozilla/dom/CSSNumericValue.h"

template <class T>
class nsCOMPtr;
class nsISupports;

namespace mozilla {

namespace dom {

enum class CSSMathOperator : uint8_t;

class CSSMathValue : public CSSNumericValue {
 public:
  explicit CSSMathValue(nsCOMPtr<nsISupports> aParent);

  CSSMathValue(nsCOMPtr<nsISupports> aParent,
               NumericValueType aNumericValueType);

  // start of CSSMathValue Web IDL declarations

  CSSMathOperator Operator() const;

  // end of CSSMathValue Web IDL declarations

 protected:
  virtual ~CSSMathValue() = default;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSMATHVALUE_H_
