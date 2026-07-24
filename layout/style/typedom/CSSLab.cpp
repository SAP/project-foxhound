/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSLab.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSColorValueBinding.h"
#include "mozilla/dom/CSSLabBinding.h"

namespace mozilla::dom {

CSSLab::CSSLab(nsCOMPtr<nsISupports> aParent)
    : CSSColorValue(std::move(aParent)) {}

JSObject* CSSLab::WrapObject(JSContext* aCx,
                             JS::Handle<JSObject*> aGivenProto) {
  return CSSLab_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSLab Web IDL implementation

// static
already_AddRefed<CSSLab> CSSLab::Constructor(const GlobalObject& aGlobal,
                                             const CSSColorPercent& aL,
                                             const CSSColorNumber& aA,
                                             const CSSColorNumber& aB,
                                             const CSSColorPercent& aAlpha,
                                             ErrorResult& aRv) {
  return MakeAndAddRef<CSSLab>(aGlobal.GetAsSupports());
}

void CSSLab::GetL(OwningCSSColorPercent& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSLab::SetL(const CSSColorPercent& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSLab::GetA(OwningCSSColorNumber& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSLab::SetA(const CSSColorNumber& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSLab::GetB(OwningCSSColorNumber& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSLab::SetB(const CSSColorNumber& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSLab::GetAlpha(OwningCSSColorPercent& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSLab::SetAlpha(const CSSColorPercent& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

// end of CSSLab Web IDL implementation

}  // namespace mozilla::dom
