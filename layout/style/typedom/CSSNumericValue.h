/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSNUMERICVALUE_H_
#define LAYOUT_STYLE_TYPEDOM_CSSNUMERICVALUE_H_

#include "js/TypeDecls.h"
#include "mozilla/dom/CSSMathSumBindingFwd.h"
#include "mozilla/dom/CSSNumericValueBindingFwd.h"
#include "mozilla/dom/CSSStyleValue.h"
#include "mozilla/dom/CSSUnitValueBindingFwd.h"
#include "nsStringFwd.h"

template <class T>
struct already_AddRefed;
template <class T>
class nsCOMPtr;
class nsISupports;

namespace mozilla {

struct CSSPropertyId;
class ErrorResult;
struct StyleNumericValue;
struct StyleNumericValueResult;

namespace dom {

class GlobalObject;
template <typename T>
class Sequence;

class CSSNumericValue : public CSSStyleValue {
 public:
  enum class NumericValueType {
    Uninitialized,  // TODO: Remove once the implementation is complete.
    UnitValue,
    MathSum,
  };

  explicit CSSNumericValue(nsCOMPtr<nsISupports> aParent);

  CSSNumericValue(nsCOMPtr<nsISupports> aParent,
                  NumericValueType aNumericValueType);

  static RefPtr<CSSNumericValue> Create(nsCOMPtr<nsISupports> aParent,
                                        const StyleNumericValue& aNumericValue);

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSNumbericValue Web IDL declarations

  already_AddRefed<CSSNumericValue> Add(
      const Sequence<OwningCSSNumberish>& aValues, ErrorResult& aRv);

  already_AddRefed<CSSNumericValue> Sub(
      const Sequence<OwningCSSNumberish>& aValues, ErrorResult& aRv);

  already_AddRefed<CSSNumericValue> Mul(
      const Sequence<OwningCSSNumberish>& aValues, ErrorResult& aRv);

  already_AddRefed<CSSNumericValue> Div(
      const Sequence<OwningCSSNumberish>& aValues, ErrorResult& aRv);

  already_AddRefed<CSSNumericValue> Min(
      const Sequence<OwningCSSNumberish>& aValues, ErrorResult& aRv);

  already_AddRefed<CSSNumericValue> Max(
      const Sequence<OwningCSSNumberish>& aValues, ErrorResult& aRv);

  bool Equals(const Sequence<OwningCSSNumberish>& aValue);

  // https://drafts.css-houdini.org/css-typed-om-1/#dom-cssnumericvalue-to
  already_AddRefed<CSSUnitValue> To(const nsACString& aUnit, ErrorResult& aRv);

  already_AddRefed<CSSMathSum> ToSum(const Sequence<nsCString>& aUnits,
                                     ErrorResult& aRv);

  void Type(CSSNumericType& aRetVal);

  // https://drafts.css-houdini.org/css-typed-om-1/#dom-cssnumericvalue-parse
  static already_AddRefed<CSSNumericValue> Parse(const GlobalObject& aGlobal,
                                                 const nsACString& aCssText,
                                                 ErrorResult& aRv);

  // end of CSSNumbericValue Web IDL declarations

  NumericValueType GetNumericValueType() const { return mNumericValueType; }

  bool IsCSSUnitValue() const;

  // Defined in CSSUnitValue.cpp
  const CSSUnitValue& GetAsCSSUnitValue() const;

  // Defined in CSSUnitValue.cpp
  CSSUnitValue& GetAsCSSUnitValue();

  bool IsCSSMathSum() const;

  // Defined in CSSMathSum.cpp
  const CSSMathSum& GetAsCSSMathSum() const;

  // Defined in CSSMathSum.cpp
  CSSMathSum& GetAsCSSMathSum();

  void ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                             nsACString& aDest) const;

  // TODO: This can be changed to return StyleNumericValue directly once the
  // Unitialized type is removed.
  StyleNumericValueResult ToStyleNumericValue() const;

 protected:
  virtual ~CSSNumericValue() = default;

  const NumericValueType mNumericValueType;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSNUMERICVALUE_H_
