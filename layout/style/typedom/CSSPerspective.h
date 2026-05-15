/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSPERSPECTIVE_H_
#define LAYOUT_STYLE_TYPEDOM_CSSPERSPECTIVE_H_

#include "js/TypeDecls.h"
#include "mozilla/dom/CSSPerspectiveBindingFwd.h"
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

class CSSPerspective final : public CSSTransformComponent {
 public:
  explicit CSSPerspective(nsCOMPtr<nsISupports> aParent);

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSPerspective Web IDL declarations

  static already_AddRefed<CSSPerspective> Constructor(
      const GlobalObject& aGlobal, const CSSPerspectiveValue& aLength,
      ErrorResult& aRv);

  void GetLength(OwningCSSPerspectiveValue& aRetVal) const;

  void SetLength(const CSSPerspectiveValue& aArg, ErrorResult& aRv);

  // end of CSSPerspective Web IDL declarations

  void ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                             nsACString& aDest) const;

 protected:
  virtual ~CSSPerspective() = default;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSPERSPECTIVE_H_
