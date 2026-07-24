/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSMATHMIN_H_
#define LAYOUT_STYLE_TYPEDOM_CSSMATHMIN_H_

#include "js/TypeDecls.h"
#include "mozilla/dom/CSSMathValue.h"
#include "mozilla/dom/CSSNumericArrayBindingFwd.h"
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
template <typename T>
class Sequence;

class CSSMathMin final : public CSSMathValue {
 public:
  explicit CSSMathMin(nsCOMPtr<nsISupports> aParent);

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSMathMin Web IDL declarations

  static already_AddRefed<CSSMathMin> Constructor(
      const GlobalObject& aGlobal, const Sequence<OwningCSSNumberish>& aArgs,
      ErrorResult& aRv);

  CSSNumericArray* GetValues(ErrorResult& aRv) const;

  // end of CSSMathMin Web IDL declarations

 private:
  virtual ~CSSMathMin() = default;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSMATHMIN_H_
