/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSSkewX.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSSkewXBinding.h"
#include "nsString.h"

namespace mozilla::dom {

CSSSkewX::CSSSkewX(nsCOMPtr<nsISupports> aParent)
    : CSSTransformComponent(std::move(aParent), TransformComponentType::SkewX) {
}

JSObject* CSSSkewX::WrapObject(JSContext* aCx,
                               JS::Handle<JSObject*> aGivenProto) {
  return CSSSkewX_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSSkewX Web IDL implementation

// static
already_AddRefed<CSSSkewX> CSSSkewX::Constructor(const GlobalObject& aGlobal,
                                                 CSSNumericValue& aAx,
                                                 ErrorResult& aRv) {
  return MakeAndAddRef<CSSSkewX>(aGlobal.GetAsSupports());
}

CSSNumericValue* CSSSkewX::GetAx(ErrorResult& aRv) const {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
  return nullptr;
}

void CSSSkewX::SetAx(CSSNumericValue& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

// end of CSSSkewX Web IDL implementation

void CSSSkewX::ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                                     nsACString& aDest) const {
  // XXX: This is not yet fully implemented.

  aDest.Append("skewX()"_ns);
}

const CSSSkewX& CSSTransformComponent::GetAsCSSSkewX() const {
  MOZ_DIAGNOSTIC_ASSERT(mTransformComponentType ==
                        TransformComponentType::SkewX);

  return *static_cast<const CSSSkewX*>(this);
}

CSSSkewX& CSSTransformComponent::GetAsCSSSkewX() {
  MOZ_DIAGNOSTIC_ASSERT(mTransformComponentType ==
                        TransformComponentType::SkewX);

  return *static_cast<CSSSkewX*>(this);
}

}  // namespace mozilla::dom
