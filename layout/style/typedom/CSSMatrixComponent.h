/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSMATRIXCOMPONENT_H_
#define LAYOUT_STYLE_TYPEDOM_CSSMATRIXCOMPONENT_H_

#include "js/TypeDecls.h"
#include "mozilla/dom/CSSMatrixComponentBindingFwd.h"
#include "mozilla/dom/CSSTransformComponent.h"
#include "mozilla/dom/DOMMatrixBindingFwd.h"

template <class T>
struct already_AddRefed;
template <class T>
class nsCOMPtr;
class nsISupports;

namespace mozilla {

class ErrorResult;

namespace dom {

class GlobalObject;

class CSSMatrixComponent final : public CSSTransformComponent {
 public:
  explicit CSSMatrixComponent(nsCOMPtr<nsISupports> aParent);

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSMatrixComponent Web IDL declarations

  static already_AddRefed<CSSMatrixComponent> Constructor(
      const GlobalObject& aGlobal, DOMMatrixReadOnly& aMatrix,
      const CSSMatrixComponentOptions& aOptions);

  DOMMatrix* GetMatrix(ErrorResult& aRv) const;

  void SetMatrix(DOMMatrix& aArg);

  // end of CSSMatrixComponent Web IDL declarations

  void ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                             nsACString& aDest) const;

 protected:
  virtual ~CSSMatrixComponent() = default;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSMATRIXCOMPONENT_H_
