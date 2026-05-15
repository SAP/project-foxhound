/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSIMAGEVALUE_H_
#define LAYOUT_STYLE_TYPEDOM_CSSIMAGEVALUE_H_

#include "js/TypeDecls.h"
#include "mozilla/dom/CSSStyleValue.h"

template <class T>
class nsCOMPtr;
class nsISupports;

namespace mozilla {

namespace dom {

class CSSImageValue final : public CSSStyleValue {
 public:
  explicit CSSImageValue(nsCOMPtr<nsISupports> aParent);

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSImageValue Web IDL declarations

  // end of CSSImageValue Web IDL declarations

 private:
  virtual ~CSSImageValue() = default;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSIMAGEVALUE_H_
