/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSTranslate.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSTranslateBinding.h"
#include "nsString.h"

namespace mozilla::dom {

CSSTranslate::CSSTranslate(nsCOMPtr<nsISupports> aParent)
    : CSSTransformComponent(std::move(aParent),
                            TransformComponentType::Translate) {}

JSObject* CSSTranslate::WrapObject(JSContext* aCx,
                                   JS::Handle<JSObject*> aGivenProto) {
  return CSSTranslate_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSTranslate Web IDL implementation

// static
already_AddRefed<CSSTranslate> CSSTranslate::Constructor(
    const GlobalObject& aGlobal, CSSNumericValue& aX, CSSNumericValue& aY,
    const Optional<NonNull<CSSNumericValue>>& aZ, ErrorResult& aRv) {
  return MakeAndAddRef<CSSTranslate>(aGlobal.GetAsSupports());
}

CSSNumericValue* CSSTranslate::GetX(ErrorResult& aRv) const {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
  return nullptr;
}

void CSSTranslate::SetX(CSSNumericValue& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

CSSNumericValue* CSSTranslate::GetY(ErrorResult& aRv) const {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
  return nullptr;
}

void CSSTranslate::SetY(CSSNumericValue& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

CSSNumericValue* CSSTranslate::GetZ(ErrorResult& aRv) const {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
  return nullptr;
}

void CSSTranslate::SetZ(CSSNumericValue& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

// end of CSSTranslate Web IDL implementation

void CSSTranslate::ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                                         nsACString& aDest) const {
  // XXX: This is not yet fully implemented.

  aDest.Append("translate3d()"_ns);
}

const CSSTranslate& CSSTransformComponent::GetAsCSSTranslate() const {
  MOZ_DIAGNOSTIC_ASSERT(mTransformComponentType ==
                        TransformComponentType::Translate);

  return *static_cast<const CSSTranslate*>(this);
}

CSSTranslate& CSSTransformComponent::GetAsCSSTranslate() {
  MOZ_DIAGNOSTIC_ASSERT(mTransformComponentType ==
                        TransformComponentType::Translate);

  return *static_cast<CSSTranslate*>(this);
}

}  // namespace mozilla::dom
