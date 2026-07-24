/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSSkewY.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSSkewYBinding.h"
#include "nsString.h"

namespace mozilla::dom {

CSSSkewY::CSSSkewY(nsCOMPtr<nsISupports> aParent)
    : CSSTransformComponent(std::move(aParent), TransformComponentType::SkewY) {
}

JSObject* CSSSkewY::WrapObject(JSContext* aCx,
                               JS::Handle<JSObject*> aGivenProto) {
  return CSSSkewY_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSSkewY Web IDL implementation

// static
already_AddRefed<CSSSkewY> CSSSkewY::Constructor(const GlobalObject& aGlobal,
                                                 CSSNumericValue& aAy,
                                                 ErrorResult& aRv) {
  return MakeAndAddRef<CSSSkewY>(aGlobal.GetAsSupports());
}

CSSNumericValue* CSSSkewY::GetAy(ErrorResult& aRv) const {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
  return nullptr;
}

void CSSSkewY::SetAy(CSSNumericValue& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

// end of CSSSkewY Web IDL implementation

void CSSSkewY::ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                                     nsACString& aDest) const {
  // XXX: This is not yet fully implemented.

  aDest.Append("skewY()"_ns);
}

const CSSSkewY& CSSTransformComponent::GetAsCSSSkewY() const {
  MOZ_DIAGNOSTIC_ASSERT(mTransformComponentType ==
                        TransformComponentType::SkewY);

  return *static_cast<const CSSSkewY*>(this);
}

CSSSkewY& CSSTransformComponent::GetAsCSSSkewY() {
  MOZ_DIAGNOSTIC_ASSERT(mTransformComponentType ==
                        TransformComponentType::SkewY);

  return *static_cast<CSSSkewY*>(this);
}

}  // namespace mozilla::dom
