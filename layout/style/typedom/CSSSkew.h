/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSSKEW_H_
#define LAYOUT_STYLE_TYPEDOM_CSSSKEW_H_

#include "js/TypeDecls.h"
#include "mozilla/dom/CSSNumericValueBindingFwd.h"
#include "mozilla/dom/CSSTransformComponent.h"

template <class T>
struct already_AddRefed;
template <class T>
class nsCOMPtr;
class nsISupports;

namespace mozilla {

class ErrorResult;

namespace dom {

class GlobalObject;

class CSSSkew final : public CSSTransformComponent {
 public:
  explicit CSSSkew(nsCOMPtr<nsISupports> aParent);

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSSkew Web IDL declarations

  static already_AddRefed<CSSSkew> Constructor(const GlobalObject& aGlobal,
                                               CSSNumericValue& aAx,
                                               CSSNumericValue& aAy,
                                               ErrorResult& aRv);

  CSSNumericValue* GetAx(ErrorResult& aRv) const;

  void SetAx(CSSNumericValue& aArg, ErrorResult& aRv);

  CSSNumericValue* GetAy(ErrorResult& aRv) const;

  void SetAy(CSSNumericValue& aArg, ErrorResult& aRv);

  // end of CSSSkew Web IDL declarations

  void ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                             nsACString& aDest) const;

 protected:
  virtual ~CSSSkew() = default;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSSKEW_H_
