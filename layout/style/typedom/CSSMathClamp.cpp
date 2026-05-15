/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSMathClamp.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSMathClampBinding.h"

namespace mozilla::dom {

CSSMathClamp::CSSMathClamp(nsCOMPtr<nsISupports> aParent)
    : CSSMathValue(std::move(aParent)) {}

JSObject* CSSMathClamp::WrapObject(JSContext* aCx,
                                   JS::Handle<JSObject*> aGivenProto) {
  return CSSMathClamp_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSMathClamp Web IDL implementation

// static
already_AddRefed<CSSMathClamp> CSSMathClamp::Constructor(
    const GlobalObject& aGlobal, const CSSNumberish& aLower,
    const CSSNumberish& aValue, const CSSNumberish& aUpper, ErrorResult& aRv) {
  return MakeAndAddRef<CSSMathClamp>(aGlobal.GetAsSupports());
}

CSSNumericValue* CSSMathClamp::GetLower(ErrorResult& aRv) const {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
  return nullptr;
}

CSSNumericValue* CSSMathClamp::GetValue(ErrorResult& aRv) const {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
  return nullptr;
}

CSSNumericValue* CSSMathClamp::GetUpper(ErrorResult& aRv) const {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
  return nullptr;
}

// end of CSSMathClamp Web IDL implementation

}  // namespace mozilla::dom
