/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSImageValue.h"

#include "mozilla/dom/CSSImageValueBinding.h"

namespace mozilla::dom {

CSSImageValue::CSSImageValue(nsCOMPtr<nsISupports> aParent)
    : CSSStyleValue(std::move(aParent)) {}

JSObject* CSSImageValue::WrapObject(JSContext* aCx,
                                    JS::Handle<JSObject*> aGivenProto) {
  return CSSImageValue_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSImageValue Web IDL implementation

// end of CSSImageValue Web IDL implementation

}  // namespace mozilla::dom
