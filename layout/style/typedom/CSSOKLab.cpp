/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSOKLab.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSColorValueBinding.h"
#include "mozilla/dom/CSSOKLabBinding.h"

namespace mozilla::dom {

CSSOKLab::CSSOKLab(nsCOMPtr<nsISupports> aParent)
    : CSSColorValue(std::move(aParent)) {}

JSObject* CSSOKLab::WrapObject(JSContext* aCx,
                               JS::Handle<JSObject*> aGivenProto) {
  return CSSOKLab_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSOKLab Web IDL implementation

// static
already_AddRefed<CSSOKLab> CSSOKLab::Constructor(const GlobalObject& aGlobal,
                                                 const CSSColorPercent& aL,
                                                 const CSSColorNumber& aA,
                                                 const CSSColorNumber& aB,
                                                 const CSSColorPercent& aAlpha,
                                                 ErrorResult& aRv) {
  return MakeAndAddRef<CSSOKLab>(aGlobal.GetAsSupports());
}

void CSSOKLab::GetL(OwningCSSColorPercent& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSOKLab::SetL(const CSSColorPercent& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSOKLab::GetA(OwningCSSColorNumber& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSOKLab::SetA(const CSSColorNumber& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSOKLab::GetB(OwningCSSColorNumber& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSOKLab::SetB(const CSSColorNumber& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSOKLab::GetAlpha(OwningCSSColorPercent& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSOKLab::SetAlpha(const CSSColorPercent& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

// end of CSSOKLab Web IDL implementation

}  // namespace mozilla::dom
