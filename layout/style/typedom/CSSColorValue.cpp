/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSColorValue.h"

#include "mozilla/ErrorResult.h"
#include "mozilla/dom/CSSColorValueBinding.h"

namespace mozilla::dom {

CSSColorValue::CSSColorValue(nsCOMPtr<nsISupports> aParent)
    : CSSStyleValue(std::move(aParent)) {}

JSObject* CSSColorValue::WrapObject(JSContext* aCx,
                                    JS::Handle<JSObject*> aGivenProto) {
  return CSSColorValue_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSColorValue Web IDL implementation

// static
void CSSColorValue::Parse(const GlobalObject& aGlobal,
                          const nsACString& aCssText,
                          OwningCSSColorValueOrCSSStyleValue& aRetVal,
                          ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

// end of CSSColorValue Web IDL implementation

}  // namespace mozilla::dom
