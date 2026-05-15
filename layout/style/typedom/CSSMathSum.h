/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSMATHSUM_H_
#define LAYOUT_STYLE_TYPEDOM_CSSMATHSUM_H_

#include "js/TypeDecls.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/CSSMathValue.h"
#include "mozilla/dom/CSSNumericArrayBindingFwd.h"
#include "mozilla/dom/CSSNumericValueBindingFwd.h"
#include "nsCycleCollectionParticipant.h"
#include "nsISupportsImpl.h"

template <class T>
class nsCOMPtr;
class nsISupports;

namespace mozilla {

struct CSSPropertyId;
class ErrorResult;
struct StyleMathSum;

namespace dom {

class CSSNumericArray;
class GlobalObject;
template <typename T>
class Sequence;

class CSSMathSum final : public CSSMathValue {
 public:
  CSSMathSum(nsCOMPtr<nsISupports> aParent, RefPtr<CSSNumericArray> aValues);

  static RefPtr<CSSMathSum> Create(nsCOMPtr<nsISupports> aParent,
                                   const StyleMathSum& aMathSum);

  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(CSSMathSum, CSSMathValue)

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSMathSum Web IDL declarations

  // https://www.w3.org/TR/css-typed-om-1/#dom-cssmathsum-cssmathsum
  static already_AddRefed<CSSMathSum> Constructor(
      const GlobalObject& aGlobal, const Sequence<OwningCSSNumberish>& aArgs,
      ErrorResult& aRv);

  CSSNumericArray* Values() const;

  // end of CSSMathSum Web IDL declarations

  void ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                             nsACString& aDest) const;

  StyleMathSum ToStyleMathSum() const;

 private:
  virtual ~CSSMathSum() = default;

  RefPtr<CSSNumericArray> mValues;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSMATHSUM_H_
