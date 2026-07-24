/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSPerspective.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSPerspectiveBinding.h"
#include "nsReadableUtils.h"
#include "nsString.h"

namespace mozilla::dom {

CSSPerspective::CSSPerspective(nsCOMPtr<nsISupports> aParent)
    : CSSTransformComponent(std::move(aParent),
                            TransformComponentType::Perspective) {}

JSObject* CSSPerspective::WrapObject(JSContext* aCx,
                                     JS::Handle<JSObject*> aGivenProto) {
  return CSSPerspective_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSPerspective Web IDL implementation

//  static
already_AddRefed<CSSPerspective> CSSPerspective::Constructor(
    const GlobalObject& aGlobal, const CSSPerspectiveValue& aLength,
    ErrorResult& aRv) {
  return MakeAndAddRef<CSSPerspective>(aGlobal.GetAsSupports());
}

void CSSPerspective::GetLength(OwningCSSPerspectiveValue& aRetVal) const {
  aRetVal.SetAsUTF8String() = EmptyCString();
}

void CSSPerspective::SetLength(const CSSPerspectiveValue& aArg,
                               ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

// end of CSSPerspective Web IDL implementation

void CSSPerspective::ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                                           nsACString& aDest) const {
  // XXX: This is not yet fully implemented.

  aDest.Append("perspective()"_ns);
}

const CSSPerspective& CSSTransformComponent::GetAsCSSPerspective() const {
  MOZ_DIAGNOSTIC_ASSERT(mTransformComponentType ==
                        TransformComponentType::Perspective);

  return *static_cast<const CSSPerspective*>(this);
}

CSSPerspective& CSSTransformComponent::GetAsCSSPerspective() {
  MOZ_DIAGNOSTIC_ASSERT(mTransformComponentType ==
                        TransformComponentType::Perspective);

  return *static_cast<CSSPerspective*>(this);
}

}  // namespace mozilla::dom
