/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSHSL.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSColorValueBinding.h"
#include "mozilla/dom/CSSHSLBinding.h"

namespace mozilla::dom {

CSSHSL::CSSHSL(nsCOMPtr<nsISupports> aParent)
    : CSSColorValue(std::move(aParent)) {}

JSObject* CSSHSL::WrapObject(JSContext* aCx,
                             JS::Handle<JSObject*> aGivenProto) {
  return CSSHSL_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSHSL Web IDL implementation

// static
already_AddRefed<CSSHSL> CSSHSL::Constructor(const GlobalObject& aGlobal,
                                             const CSSColorAngle& aH,
                                             const CSSColorPercent& aS,
                                             const CSSColorPercent& aL,
                                             const CSSColorPercent& aAlpha,
                                             ErrorResult& aRv) {
  return MakeAndAddRef<CSSHSL>(aGlobal.GetAsSupports());
}

void CSSHSL::GetH(OwningCSSColorAngle& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSHSL::SetH(const CSSColorAngle& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSHSL::GetS(OwningCSSColorPercent& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSHSL::SetS(const CSSColorPercent& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSHSL::GetL(OwningCSSColorPercent& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSHSL::SetL(const CSSColorPercent& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSHSL::GetAlpha(OwningCSSColorPercent& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSHSL::SetAlpha(const CSSColorPercent& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

// end of CSSHSL Web IDL implementation

}  // namespace mozilla::dom
