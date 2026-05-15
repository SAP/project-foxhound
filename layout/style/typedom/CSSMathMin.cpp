/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSMathMin.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSMathMinBinding.h"

namespace mozilla::dom {

CSSMathMin::CSSMathMin(nsCOMPtr<nsISupports> aParent)
    : CSSMathValue(std::move(aParent)) {}

JSObject* CSSMathMin::WrapObject(JSContext* aCx,
                                 JS::Handle<JSObject*> aGivenProto) {
  return CSSMathMin_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSMathMin Web IDL implementation

// static
already_AddRefed<CSSMathMin> CSSMathMin::Constructor(
    const GlobalObject& aGlobal, const Sequence<OwningCSSNumberish>& aArgs,
    ErrorResult& aRv) {
  return MakeAndAddRef<CSSMathMin>(aGlobal.GetAsSupports());
}

CSSNumericArray* CSSMathMin::GetValues(ErrorResult& aRv) const {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
  return nullptr;
}

// end of CSSMathMin Web IDL implementation

}  // namespace mozilla::dom
