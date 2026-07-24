/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSSkew.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSSkewBinding.h"
#include "nsString.h"

namespace mozilla::dom {

CSSSkew::CSSSkew(nsCOMPtr<nsISupports> aParent)
    : CSSTransformComponent(std::move(aParent), TransformComponentType::Skew) {}

JSObject* CSSSkew::WrapObject(JSContext* aCx,
                              JS::Handle<JSObject*> aGivenProto) {
  return CSSSkew_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSSkew Web IDL implementation

// static
already_AddRefed<CSSSkew> CSSSkew::Constructor(const GlobalObject& aGlobal,
                                               CSSNumericValue& aAx,
                                               CSSNumericValue& aAy,
                                               ErrorResult& aRv) {
  return MakeAndAddRef<CSSSkew>(aGlobal.GetAsSupports());
}

CSSNumericValue* CSSSkew::GetAx(ErrorResult& aRv) const {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
  return nullptr;
}

void CSSSkew::SetAx(CSSNumericValue& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

CSSNumericValue* CSSSkew::GetAy(ErrorResult& aRv) const {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
  return nullptr;
}

void CSSSkew::SetAy(CSSNumericValue& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

// end of CSSSkew Web IDL implementation

void CSSSkew::ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                                    nsACString& aDest) const {
  // XXX: This is not yet fully implemented.

  aDest.Append("skew()"_ns);
}

const CSSSkew& CSSTransformComponent::GetAsCSSSkew() const {
  MOZ_DIAGNOSTIC_ASSERT(mTransformComponentType ==
                        TransformComponentType::Skew);

  return *static_cast<const CSSSkew*>(this);
}

CSSSkew& CSSTransformComponent::GetAsCSSSkew() {
  MOZ_DIAGNOSTIC_ASSERT(mTransformComponentType ==
                        TransformComponentType::Skew);

  return *static_cast<CSSSkew*>(this);
}

}  // namespace mozilla::dom
