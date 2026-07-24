/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSMathInvert.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSMathInvertBinding.h"

namespace mozilla::dom {

CSSMathInvert::CSSMathInvert(nsCOMPtr<nsISupports> aParent)
    : CSSMathValue(std::move(aParent)) {}

JSObject* CSSMathInvert::WrapObject(JSContext* aCx,
                                    JS::Handle<JSObject*> aGivenProto) {
  return CSSMathInvert_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSMathInvert Web IDL implementation

// static
already_AddRefed<CSSMathInvert> CSSMathInvert::Constructor(
    const GlobalObject& aGlobal, const CSSNumberish& aArg) {
  return MakeAndAddRef<CSSMathInvert>(aGlobal.GetAsSupports());
}

CSSNumericValue* CSSMathInvert::GetValue(ErrorResult& aRv) const {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
  return nullptr;
}

// end of CSSMathInvert Web IDL implementation

}  // namespace mozilla::dom
