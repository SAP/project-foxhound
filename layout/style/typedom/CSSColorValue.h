/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSCOLORVALUE_H_
#define LAYOUT_STYLE_TYPEDOM_CSSCOLORVALUE_H_

#include "js/TypeDecls.h"
#include "mozilla/dom/CSSStyleValue.h"
#include "nsStringFwd.h"

template <class T>
class nsCOMPtr;
class nsISupports;

namespace mozilla {

class ErrorResult;

namespace dom {

class GlobalObject;
class OwningCSSColorValueOrCSSStyleValue;

class CSSColorValue : public CSSStyleValue {
 public:
  explicit CSSColorValue(nsCOMPtr<nsISupports> aParent);

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSColorValue Web IDL declarations

  static void Parse(const GlobalObject& aGlobal, const nsACString& aCssText,
                    OwningCSSColorValueOrCSSStyleValue& aRetVal,
                    ErrorResult& aRv);

  // end of CSSColorValue Web IDL declarations

 protected:
  virtual ~CSSColorValue() = default;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSCOLORVALUE_H_
