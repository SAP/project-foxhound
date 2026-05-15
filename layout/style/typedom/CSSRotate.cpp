/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSRotate.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSNumericValueBinding.h"
#include "mozilla/dom/CSSRotateBinding.h"
#include "nsString.h"

namespace mozilla::dom {

CSSRotate::CSSRotate(nsCOMPtr<nsISupports> aParent)
    : CSSTransformComponent(std::move(aParent),
                            TransformComponentType::Rotate) {}

JSObject* CSSRotate::WrapObject(JSContext* aCx,
                                JS::Handle<JSObject*> aGivenProto) {
  return CSSRotate_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSRotate Web IDL implementation

//  static
already_AddRefed<CSSRotate> CSSRotate::Constructor(const GlobalObject& aGlobal,
                                                   CSSNumericValue& aAngle,
                                                   ErrorResult& aRv) {
  return MakeAndAddRef<CSSRotate>(aGlobal.GetAsSupports());
}

//  static
already_AddRefed<CSSRotate> CSSRotate::Constructor(
    const GlobalObject& aGlobal, const CSSNumberish& aX, const CSSNumberish& aY,
    const CSSNumberish& aZ, CSSNumericValue& aAngle, ErrorResult& aRv) {
  return MakeAndAddRef<CSSRotate>(aGlobal.GetAsSupports());
}

void CSSRotate::GetX(OwningCSSNumberish& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSRotate::SetX(const CSSNumberish& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSRotate::GetY(OwningCSSNumberish& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSRotate::SetY(const CSSNumberish& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSRotate::GetZ(OwningCSSNumberish& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSRotate::SetZ(const CSSNumberish& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

CSSNumericValue* CSSRotate::GetAngle(ErrorResult& aRv) const {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
  return nullptr;
}

void CSSRotate::SetAngle(CSSNumericValue& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

// end of CSSRotate Web IDL implementation

void CSSRotate::ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                                      nsACString& aDest) const {
  // XXX: This is not yet fully implemented.

  aDest.Append("rotate3d()"_ns);
}

const CSSRotate& CSSTransformComponent::GetAsCSSRotate() const {
  MOZ_DIAGNOSTIC_ASSERT(mTransformComponentType ==
                        TransformComponentType::Rotate);

  return *static_cast<const CSSRotate*>(this);
}

CSSRotate& CSSTransformComponent::GetAsCSSRotate() {
  MOZ_DIAGNOSTIC_ASSERT(mTransformComponentType ==
                        TransformComponentType::Rotate);

  return *static_cast<CSSRotate*>(this);
}

}  // namespace mozilla::dom
