/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSOKLCH.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSColorValueBinding.h"
#include "mozilla/dom/CSSOKLCHBinding.h"

namespace mozilla::dom {

CSSOKLCH::CSSOKLCH(nsCOMPtr<nsISupports> aParent)
    : CSSColorValue(std::move(aParent)) {}

JSObject* CSSOKLCH::WrapObject(JSContext* aCx,
                               JS::Handle<JSObject*> aGivenProto) {
  return CSSOKLCH_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSOKLCH Web IDL implementation

// static
already_AddRefed<CSSOKLCH> CSSOKLCH::Constructor(const GlobalObject& aGlobal,
                                                 const CSSColorPercent& aL,
                                                 const CSSColorPercent& aC,
                                                 const CSSColorAngle& aH,
                                                 const CSSColorPercent& aAlpha,
                                                 ErrorResult& aRv) {
  return MakeAndAddRef<CSSOKLCH>(aGlobal.GetAsSupports());
}

void CSSOKLCH::GetL(OwningCSSColorPercent& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSOKLCH::SetL(const CSSColorPercent& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSOKLCH::GetC(OwningCSSColorPercent& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSOKLCH::SetC(const CSSColorPercent& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSOKLCH::GetH(OwningCSSColorAngle& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSOKLCH::SetH(const CSSColorAngle& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSOKLCH::GetAlpha(OwningCSSColorPercent& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSOKLCH::SetAlpha(const CSSColorPercent& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

// end of CSSOKLCH Web IDL implementation

}  // namespace mozilla::dom
