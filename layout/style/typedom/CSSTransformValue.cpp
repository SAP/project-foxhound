/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSTransformValue.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSTransformComponent.h"
#include "mozilla/dom/CSSTransformValueBinding.h"
#include "nsString.h"

namespace mozilla::dom {

CSSTransformValue::CSSTransformValue(
    nsCOMPtr<nsISupports> aParent,
    nsTArray<RefPtr<CSSTransformComponent>> aValues)
    : CSSStyleValue(std::move(aParent), StyleValueType::TransformValue),
      mValues(std::move(aValues)) {}

NS_IMPL_ISUPPORTS_CYCLE_COLLECTION_INHERITED_0(CSSTransformValue, CSSStyleValue)
NS_IMPL_CYCLE_COLLECTION_INHERITED(CSSTransformValue, CSSStyleValue, mValues)

JSObject* CSSTransformValue::WrapObject(JSContext* aCx,
                                        JS::Handle<JSObject*> aGivenProto) {
  return CSSTransformValue_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSTransformValue Web IDL implementation

// https://drafts.css-houdini.org/css-typed-om-1/#dom-csstransformvalue-csstransformvalue
//
// static
already_AddRefed<CSSTransformValue> CSSTransformValue::Constructor(
    const GlobalObject& aGlobal,
    const Sequence<OwningNonNull<CSSTransformComponent>>& aTransforms,
    ErrorResult& aRv) {
  // Step 1.

  if (aTransforms.IsEmpty()) {
    aRv.ThrowTypeError("Transforms can't be empty");
    return nullptr;
  }

  // Step 2.

  nsTArray<RefPtr<CSSTransformComponent>> values;
  values.AppendElements(aTransforms);

  return MakeAndAddRef<CSSTransformValue>(aGlobal.GetAsSupports(),
                                          std::move(values));
}

// https://drafts.css-houdini.org/css-typed-om-1/#dom-csstransformvalue-length
uint32_t CSSTransformValue::Length() const { return mValues.Length(); }

bool CSSTransformValue::Is2D() const { return true; }

already_AddRefed<DOMMatrix> CSSTransformValue::ToMatrix(ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
  return nullptr;
}

CSSTransformComponent* CSSTransformValue::IndexedGetter(uint32_t aIndex,
                                                        bool& aFound) {
  if (aIndex < mValues.Length()) {
    aFound = true;
    return mValues[aIndex];
  }

  aFound = false;
  return nullptr;
}

void CSSTransformValue::IndexedSetter(uint32_t aIndex,
                                      CSSTransformComponent& aVal,
                                      ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

// end of CSSTransformValue Web IDL implementation

void CSSTransformValue::ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                                              nsACString& aDest) const {
  bool written = false;

  for (const RefPtr<CSSTransformComponent>& value : mValues) {
    if (written) {
      aDest.Append(" "_ns);
    }

    value->ToCssTextWithProperty(aPropertyId, aDest);
    written = true;
  }
}

const CSSTransformValue& CSSStyleValue::GetAsCSSTransformValue() const {
  MOZ_DIAGNOSTIC_ASSERT(mStyleValueType == StyleValueType::TransformValue);

  return *static_cast<const CSSTransformValue*>(this);
}

CSSTransformValue& CSSStyleValue::GetAsCSSTransformValue() {
  MOZ_DIAGNOSTIC_ASSERT(mStyleValueType == StyleValueType::TransformValue);

  return *static_cast<CSSTransformValue*>(this);
}

}  // namespace mozilla::dom
