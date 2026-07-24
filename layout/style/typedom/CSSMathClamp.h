/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSMATHCLAMP_H_
#define LAYOUT_STYLE_TYPEDOM_CSSMATHCLAMP_H_

#include "js/TypeDecls.h"
#include "mozilla/dom/CSSMathValue.h"
#include "mozilla/dom/CSSNumericValueBindingFwd.h"

template <class T>
struct already_AddRefed;
template <class T>
class nsCOMPtr;
class nsISupports;

namespace mozilla {

class ErrorResult;

namespace dom {

class GlobalObject;

class CSSMathClamp final : public CSSMathValue {
 public:
  explicit CSSMathClamp(nsCOMPtr<nsISupports> aParent);

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSMathClamp Web IDL declarations

  static already_AddRefed<CSSMathClamp> Constructor(const GlobalObject& aGlobal,
                                                    const CSSNumberish& aLower,
                                                    const CSSNumberish& aValue,
                                                    const CSSNumberish& aUpper,
                                                    ErrorResult& aRv);

  CSSNumericValue* GetLower(ErrorResult& aRv) const;

  CSSNumericValue* GetValue(ErrorResult& aRv) const;

  CSSNumericValue* GetUpper(ErrorResult& aRv) const;

  // end of CSSMathClamp Web IDL declarations

 private:
  virtual ~CSSMathClamp() = default;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSMATHCLAMP_H_
