/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSScale.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSNumericValueBinding.h"
#include "mozilla/dom/CSSScaleBinding.h"
#include "nsString.h"

namespace mozilla::dom {

CSSScale::CSSScale(nsCOMPtr<nsISupports> aParent)
    : CSSTransformComponent(std::move(aParent), TransformComponentType::Scale) {
}

JSObject* CSSScale::WrapObject(JSContext* aCx,
                               JS::Handle<JSObject*> aGivenProto) {
  return CSSScale_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSScale Web IDL implementation

//  static
already_AddRefed<CSSScale> CSSScale::Constructor(
    const GlobalObject& aGlobal, const CSSNumberish& aX, const CSSNumberish& aY,
    const Optional<CSSNumberish>& aZ, ErrorResult& aRv) {
  return MakeAndAddRef<CSSScale>(aGlobal.GetAsSupports());
}

void CSSScale::GetX(OwningCSSNumberish& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSScale::SetX(const CSSNumberish& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSScale::GetY(OwningCSSNumberish& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSScale::SetY(const CSSNumberish& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSScale::GetZ(OwningCSSNumberish& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSScale::SetZ(const CSSNumberish& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

// end of CSSScale Web IDL implementation

void CSSScale::ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                                     nsACString& aDest) const {
  // XXX: This is not yet fully implemented.

  aDest.Append("scale3d()"_ns);
}

const CSSScale& CSSTransformComponent::GetAsCSSScale() const {
  MOZ_DIAGNOSTIC_ASSERT(mTransformComponentType ==
                        TransformComponentType::Scale);

  return *static_cast<const CSSScale*>(this);
}

CSSScale& CSSTransformComponent::GetAsCSSScale() {
  MOZ_DIAGNOSTIC_ASSERT(mTransformComponentType ==
                        TransformComponentType::Scale);

  return *static_cast<CSSScale*>(this);
}

}  // namespace mozilla::dom
