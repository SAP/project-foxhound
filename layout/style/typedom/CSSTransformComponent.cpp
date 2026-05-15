/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSTransformComponent.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/Assertions.h"
#include "mozilla/CSSPropertyId.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/dom/CSSMatrixComponent.h"
#include "mozilla/dom/CSSPerspective.h"
#include "mozilla/dom/CSSRotate.h"
#include "mozilla/dom/CSSScale.h"
#include "mozilla/dom/CSSSkew.h"
#include "mozilla/dom/CSSSkewX.h"
#include "mozilla/dom/CSSSkewY.h"
#include "mozilla/dom/CSSTransformComponentBinding.h"
#include "mozilla/dom/CSSTranslate.h"
#include "nsCycleCollectionParticipant.h"

namespace mozilla::dom {

CSSTransformComponent::CSSTransformComponent(
    nsCOMPtr<nsISupports> aParent,
    TransformComponentType aTransformComponentType)
    : mParent(std::move(aParent)),
      mTransformComponentType(aTransformComponentType) {
  MOZ_ASSERT(mParent);
}

NS_IMPL_CYCLE_COLLECTING_ADDREF(CSSTransformComponent)
NS_IMPL_CYCLE_COLLECTING_RELEASE(CSSTransformComponent)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(CSSTransformComponent)
  NS_WRAPPERCACHE_INTERFACE_MAP_ENTRY
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END
NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE(CSSTransformComponent, mParent)

nsISupports* CSSTransformComponent::GetParentObject() const { return mParent; }

JSObject* CSSTransformComponent::WrapObject(JSContext* aCx,
                                            JS::Handle<JSObject*> aGivenProto) {
  return CSSTransformComponent_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSTransformComponent Web IDL implementation
bool CSSTransformComponent::Is2D() const { return false; }

void CSSTransformComponent::SetIs2D(bool aArg) {}

already_AddRefed<DOMMatrix> CSSTransformComponent::ToMatrix(ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_INITIALIZED);
  return nullptr;
}

void CSSTransformComponent::Stringify(nsACString& aRetVal) {
  ToCssTextWithProperty(CSSPropertyId(eCSSProperty_UNKNOWN), aRetVal);
}

// end of CSSTransformComponent Web IDL implementation

bool CSSTransformComponent::IsCSSTranslate() const {
  return mTransformComponentType == TransformComponentType::Translate;
}

bool CSSTransformComponent::IsCSSRotate() const {
  return mTransformComponentType == TransformComponentType::Rotate;
}

bool CSSTransformComponent::IsCSSScale() const {
  return mTransformComponentType == TransformComponentType::Scale;
}

bool CSSTransformComponent::IsCSSSkew() const {
  return mTransformComponentType == TransformComponentType::Skew;
}

bool CSSTransformComponent::IsCSSSkewX() const {
  return mTransformComponentType == TransformComponentType::SkewX;
}

bool CSSTransformComponent::IsCSSSkewY() const {
  return mTransformComponentType == TransformComponentType::SkewY;
}

bool CSSTransformComponent::IsCSSPerspective() const {
  return mTransformComponentType == TransformComponentType::Perspective;
}

bool CSSTransformComponent::IsCSSMatrixComponent() const {
  return mTransformComponentType == TransformComponentType::MatrixComponent;
}

void CSSTransformComponent::ToCssTextWithProperty(
    const CSSPropertyId& aPropertyId, nsACString& aDest) const {
  switch (GetTransformComponentType()) {
    case TransformComponentType::MatrixComponent: {
      const CSSMatrixComponent& matrixComponent = GetAsCSSMatrixComponent();

      matrixComponent.ToCssTextWithProperty(aPropertyId, aDest);
      break;
    }

    case TransformComponentType::Perspective: {
      const CSSPerspective& perspective = GetAsCSSPerspective();

      perspective.ToCssTextWithProperty(aPropertyId, aDest);
      break;
    }

    case TransformComponentType::SkewY: {
      const CSSSkewY& skewY = GetAsCSSSkewY();

      skewY.ToCssTextWithProperty(aPropertyId, aDest);
      break;
    }

    case TransformComponentType::SkewX: {
      const CSSSkewX& skewX = GetAsCSSSkewX();

      skewX.ToCssTextWithProperty(aPropertyId, aDest);
      break;
    }

    case TransformComponentType::Skew: {
      const CSSSkew& skew = GetAsCSSSkew();

      skew.ToCssTextWithProperty(aPropertyId, aDest);
      break;
    }

    case TransformComponentType::Scale: {
      const CSSScale& scale = GetAsCSSScale();

      scale.ToCssTextWithProperty(aPropertyId, aDest);
      break;
    }

    case TransformComponentType::Rotate: {
      const CSSRotate& rotate = GetAsCSSRotate();

      rotate.ToCssTextWithProperty(aPropertyId, aDest);
      break;
    }

    case TransformComponentType::Translate: {
      const CSSTranslate& translate = GetAsCSSTranslate();

      translate.ToCssTextWithProperty(aPropertyId, aDest);
      break;
    }
  }
}

}  // namespace mozilla::dom
