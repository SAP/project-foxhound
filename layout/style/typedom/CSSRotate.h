/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSROTATE_H_
#define LAYOUT_STYLE_TYPEDOM_CSSROTATE_H_

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

class CSSRotate final : public CSSTransformComponent {
 public:
  explicit CSSRotate(nsCOMPtr<nsISupports> aParent);

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSRotate Web IDL declarations

  static already_AddRefed<CSSRotate> Constructor(const GlobalObject& aGlobal,
                                                 CSSNumericValue& aAngle,
                                                 ErrorResult& aRv);

  static already_AddRefed<CSSRotate> Constructor(const GlobalObject& aGlobal,
                                                 const CSSNumberish& aX,
                                                 const CSSNumberish& aY,
                                                 const CSSNumberish& aZ,
                                                 CSSNumericValue& aAngle,
                                                 ErrorResult& aRv);

  void GetX(OwningCSSNumberish& aRetVal) const;

  void SetX(const CSSNumberish& aArg, ErrorResult& aRv);

  void GetY(OwningCSSNumberish& aRetVal) const;

  void SetY(const CSSNumberish& aArg, ErrorResult& aRv);

  void GetZ(OwningCSSNumberish& aRetVal) const;

  void SetZ(const CSSNumberish& aArg, ErrorResult& aRv);

  CSSNumericValue* GetAngle(ErrorResult& aRv) const;

  void SetAngle(CSSNumericValue& aArg, ErrorResult& aRv);

  // end of CSSRotate Web IDL declarations

  void ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                             nsACString& aDest) const;

 protected:
  virtual ~CSSRotate() = default;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSROTATE_H_
