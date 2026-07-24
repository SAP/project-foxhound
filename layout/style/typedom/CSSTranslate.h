/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSTRANSLATE_H_
#define LAYOUT_STYLE_TYPEDOM_CSSTRANSLATE_H_

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
template <typename T>
class NonNull;
template <typename T>
class Optional;

class CSSTranslate final : public CSSTransformComponent {
 public:
  explicit CSSTranslate(nsCOMPtr<nsISupports> aParent);

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSTranslate Web IDL declarations

  static already_AddRefed<CSSTranslate> Constructor(
      const GlobalObject& aGlobal, CSSNumericValue& aX, CSSNumericValue& aY,
      const Optional<NonNull<CSSNumericValue>>& aZ, ErrorResult& aRv);

  CSSNumericValue* GetX(ErrorResult& aRv) const;

  void SetX(CSSNumericValue& aArg, ErrorResult& aRv);

  CSSNumericValue* GetY(ErrorResult& aRv) const;

  void SetY(CSSNumericValue& aArg, ErrorResult& aRv);

  CSSNumericValue* GetZ(ErrorResult& aRv) const;

  void SetZ(CSSNumericValue& aArg, ErrorResult& aRv);

  // end of CSSTranslate Web IDL declarations

  void ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                             nsACString& aDest) const;

 protected:
  virtual ~CSSTranslate() = default;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSTRANSLATE_H_
