/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSRGB.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSColorValueBinding.h"
#include "mozilla/dom/CSSRGBBinding.h"

namespace mozilla::dom {

CSSRGB::CSSRGB(nsCOMPtr<nsISupports> aParent)
    : CSSColorValue(std::move(aParent)) {}

JSObject* CSSRGB::WrapObject(JSContext* aCx,
                             JS::Handle<JSObject*> aGivenProto) {
  return CSSRGB_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSRGB Web IDL implementation

// static
already_AddRefed<CSSRGB> CSSRGB::Constructor(const GlobalObject& aGlobal,
                                             const CSSColorRGBComp& aR,
                                             const CSSColorRGBComp& aG,
                                             const CSSColorRGBComp& aB,
                                             const CSSColorPercent& aAlpha,
                                             ErrorResult& aRv) {
  return MakeAndAddRef<CSSRGB>(aGlobal.GetAsSupports());
}

void CSSRGB::GetR(OwningCSSColorRGBComp& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSRGB::SetR(const CSSColorRGBComp& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSRGB::GetG(OwningCSSColorRGBComp& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSRGB::SetG(const CSSColorRGBComp& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSRGB::GetB(OwningCSSColorRGBComp& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSRGB::SetB(const CSSColorRGBComp& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSRGB::GetAlpha(OwningCSSColorPercent& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSRGB::SetAlpha(const CSSColorPercent& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

// end of CSSRGB Web IDL implementation

}  // namespace mozilla::dom
