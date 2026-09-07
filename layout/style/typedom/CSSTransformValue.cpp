/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSTransformValue.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/ServoStyleConsts.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSMatrixComponent.h"
#include "mozilla/dom/CSSPerspective.h"
#include "mozilla/dom/CSSRotate.h"
#include "mozilla/dom/CSSScale.h"
#include "mozilla/dom/CSSSkew.h"
#include "mozilla/dom/CSSSkewX.h"
#include "mozilla/dom/CSSSkewY.h"
#include "mozilla/dom/CSSTransformComponent.h"
#include "mozilla/dom/CSSTransformValueBinding.h"
#include "mozilla/dom/CSSTranslate.h"
#include "nsString.h"

namespace mozilla::dom {

CSSTransformValue::CSSTransformValue(
    nsCOMPtr<nsISupports> aParent,
    nsTArray<RefPtr<CSSTransformComponent>> aValues)
    : CSSStyleValue(std::move(aParent), StyleValueType::TransformValue),
      mValues(std::move(aValues)) {}

// static
RefPtr<CSSTransformValue> CSSTransformValue::Create(
    nsCOMPtr<nsISupports> aParent, const StyleTransformValue& aTransformValue) {
  nsTArray<RefPtr<CSSTransformComponent>> values;
  values.SetCapacity(aTransformValue.Length());

  for (const auto& transformValue : aTransformValue) {
    RefPtr<CSSTransformComponent> transformComponent;

    switch (transformValue.tag) {
      case StyleTransformComponent::Tag::Translate: {
        const auto& translateComponent = transformValue.AsTranslate();

        transformComponent = CSSTranslate::Create(aParent, translateComponent);
        break;
      }

      case StyleTransformComponent::Tag::Rotate: {
        const auto& rotateComponent = transformValue.AsRotate();

        transformComponent = CSSRotate::Create(aParent, rotateComponent);
        break;
      }

      case StyleTransformComponent::Tag::Scale: {
        const auto& scaleComponent = transformValue.AsScale();

        transformComponent = CSSScale::Create(aParent, scaleComponent);
        break;
      }

      case StyleTransformComponent::Tag::Skew: {
        const auto& skewComponent = transformValue.AsSkew();

        transformComponent = CSSSkew::Create(aParent, skewComponent);
        break;
      }

      case StyleTransformComponent::Tag::SkewX: {
        const auto& skewXComponent = transformValue.AsSkewX();

        transformComponent = CSSSkewX::Create(aParent, skewXComponent);
        break;
      }

      case StyleTransformComponent::Tag::SkewY: {
        const auto& skewYComponent = transformValue.AsSkewY();

        transformComponent = CSSSkewY::Create(aParent, skewYComponent);
        break;
      }

      case StyleTransformComponent::Tag::Perspective: {
        const auto& perspectiveComponent = transformValue.AsPerspective();

        transformComponent =
            CSSPerspective::Create(aParent, perspectiveComponent);
        break;
      }

      case StyleTransformComponent::Tag::Matrix: {
        const auto& matrixComponent = transformValue.AsMatrix();

        transformComponent =
            CSSMatrixComponent::Create(aParent, matrixComponent);
        break;
      }
    }

    values.AppendElement(std::move(transformComponent));
  }

  return MakeAndAddRef<CSSTransformValue>(std::move(aParent),
                                          std::move(values));
}

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
