/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSMatrixComponent.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSMatrixComponentBinding.h"
#include "nsString.h"

namespace mozilla::dom {

CSSMatrixComponent::CSSMatrixComponent(nsCOMPtr<nsISupports> aParent)
    : CSSTransformComponent(std::move(aParent),
                            TransformComponentType::MatrixComponent) {}

JSObject* CSSMatrixComponent::WrapObject(JSContext* aCx,
                                         JS::Handle<JSObject*> aGivenProto) {
  return CSSMatrixComponent_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSMatrixComponent Web IDL implementation

//  static
already_AddRefed<CSSMatrixComponent> CSSMatrixComponent::Constructor(
    const GlobalObject& aGlobal, DOMMatrixReadOnly& aMatrix,
    const CSSMatrixComponentOptions& aOptions) {
  return MakeAndAddRef<CSSMatrixComponent>(aGlobal.GetAsSupports());
}

DOMMatrix* CSSMatrixComponent::GetMatrix(ErrorResult& aRv) const {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
  return nullptr;
}

void CSSMatrixComponent::SetMatrix(DOMMatrix& aArg) {}

// end of CSSMatrixComponent Web IDL implementation

void CSSMatrixComponent::ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                                               nsACString& aDest) const {
  // XXX: This is not yet fully implemented.

  aDest.Append("matrix()"_ns);
}

const CSSMatrixComponent& CSSTransformComponent::GetAsCSSMatrixComponent()
    const {
  MOZ_DIAGNOSTIC_ASSERT(mTransformComponentType ==
                        TransformComponentType::MatrixComponent);

  return *static_cast<const CSSMatrixComponent*>(this);
}

CSSMatrixComponent& CSSTransformComponent::GetAsCSSMatrixComponent() {
  MOZ_DIAGNOSTIC_ASSERT(mTransformComponentType ==
                        TransformComponentType::MatrixComponent);

  return *static_cast<CSSMatrixComponent*>(this);
}

}  // namespace mozilla::dom
