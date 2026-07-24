/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSKEYWORDVALUE_H_
#define LAYOUT_STYLE_TYPEDOM_CSSKEYWORDVALUE_H_

#include "js/TypeDecls.h"
#include "mozilla/dom/CSSStyleValue.h"
#include "nsString.h"

template <class T>
struct already_AddRefed;
template <class T>
class nsCOMPtr;
class nsISupports;

namespace mozilla {

struct CSSPropertyId;
class ErrorResult;

namespace dom {

class GlobalObject;

class CSSKeywordValue final : public CSSStyleValue {
 public:
  CSSKeywordValue(nsCOMPtr<nsISupports> aParent, const nsACString& aValue);

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSKeywordValue Web IDL declarations

  // https://drafts.css-houdini.org/css-typed-om-1/#dom-csskeywordvalue-csskeywordvalue
  static already_AddRefed<CSSKeywordValue> Constructor(
      const GlobalObject& aGlobal, const nsACString& aValue, ErrorResult& aRv);

  void GetValue(nsCString& aRetVal) const;

  // https://drafts.css-houdini.org/css-typed-om-1/#dom-csskeywordvalue-value
  void SetValue(const nsACString& aArg, ErrorResult& aRv);

  // end of CSSKeywordValue Web IDL declarations

  void ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                             nsACString& aDest) const;

 private:
  virtual ~CSSKeywordValue() = default;

  nsCString mValue;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSKEYWORDVALUE_H_
