/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSHWB.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSHWBBinding.h"
#include "mozilla/dom/CSSNumericValueBinding.h"

namespace mozilla::dom {

CSSHWB::CSSHWB(nsCOMPtr<nsISupports> aParent)
    : CSSColorValue(std::move(aParent)) {}

JSObject* CSSHWB::WrapObject(JSContext* aCx,
                             JS::Handle<JSObject*> aGivenProto) {
  return CSSHWB_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSHWB Web IDL implementation

// static
already_AddRefed<CSSHWB> CSSHWB::Constructor(
    const GlobalObject& aGlobal, CSSNumericValue& aH, const CSSNumberish& aW,
    const CSSNumberish& aB, const CSSNumberish& aAlpha, ErrorResult& aRv) {
  return MakeAndAddRef<CSSHWB>(aGlobal.GetAsSupports());
}

CSSNumericValue* CSSHWB::GetH(ErrorResult& aRv) const {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
  return nullptr;
}

void CSSHWB::SetH(CSSNumericValue& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSHWB::GetW(OwningCSSNumberish& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSHWB::SetW(const CSSNumberish& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSHWB::GetB(OwningCSSNumberish& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSHWB::SetB(const CSSNumberish& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSHWB::GetAlpha(OwningCSSNumberish& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSHWB::SetAlpha(const CSSNumberish& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

// end of CSSHWB Web IDL implementation

}  // namespace mozilla::dom
