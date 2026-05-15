/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSLCH.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSColorValueBinding.h"
#include "mozilla/dom/CSSLCHBinding.h"

namespace mozilla::dom {

CSSLCH::CSSLCH(nsCOMPtr<nsISupports> aParent)
    : CSSColorValue(std::move(aParent)) {}

JSObject* CSSLCH::WrapObject(JSContext* aCx,
                             JS::Handle<JSObject*> aGivenProto) {
  return CSSLCH_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSLCH Web IDL implementation

// static
already_AddRefed<CSSLCH> CSSLCH::Constructor(const GlobalObject& aGlobal,
                                             const CSSColorPercent& aL,
                                             const CSSColorPercent& aC,
                                             const CSSColorAngle& aH,
                                             const CSSColorPercent& aAlpha,
                                             ErrorResult& aRv) {
  return MakeAndAddRef<CSSLCH>(aGlobal.GetAsSupports());
}

void CSSLCH::GetL(OwningCSSColorPercent& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSLCH::SetL(const CSSColorPercent& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSLCH::GetC(OwningCSSColorPercent& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSLCH::SetC(const CSSColorPercent& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSLCH::GetH(OwningCSSColorAngle& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSLCH::SetH(const CSSColorAngle& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSLCH::GetAlpha(OwningCSSColorPercent& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSLCH::SetAlpha(const CSSColorPercent& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

// end of CSSLCH Web IDL implementation

}  // namespace mozilla::dom
