/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSSkew.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/ServoStyleConsts.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSNumericValue.h"
#include "mozilla/dom/CSSSkewBinding.h"
#include "nsString.h"

namespace mozilla::dom {

CSSSkew::CSSSkew(nsCOMPtr<nsISupports> aParent, bool aIs2D,
                 RefPtr<CSSNumericValue> aAx, RefPtr<CSSNumericValue> aAy)
    : CSSTransformComponent(std::move(aParent), aIs2D,
                            TransformComponentType::Skew),
      mAx(std::move(aAx)),
      mAy(std::move(aAy)) {}

// static
RefPtr<CSSSkew> CSSSkew::Create(nsCOMPtr<nsISupports> aParent,
                                const StyleSkewComponent& aSkewComponent) {
  RefPtr<CSSNumericValue> ax =
      CSSNumericValue::Create(aParent, aSkewComponent.ax);
  RefPtr<CSSNumericValue> ay =
      CSSNumericValue::Create(aParent, aSkewComponent.ay);

  return MakeAndAddRef<CSSSkew>(std::move(aParent), /* aIs2Da */ true,
                                std::move(ax), std::move(ay));
}

NS_IMPL_ISUPPORTS_CYCLE_COLLECTION_INHERITED_0(CSSSkew, CSSTransformComponent)
NS_IMPL_CYCLE_COLLECTION_INHERITED(CSSSkew, CSSTransformComponent, mAx, mAy)

JSObject* CSSSkew::WrapObject(JSContext* aCx,
                              JS::Handle<JSObject*> aGivenProto) {
  return CSSSkew_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSSkew Web IDL implementation

// https://drafts.css-houdini.org/css-typed-om-1/#dom-cssskew-cssskew
//
// XXX This is not yet fully implemented!
//
// static
already_AddRefed<CSSSkew> CSSSkew::Constructor(const GlobalObject& aGlobal,
                                               CSSNumericValue& aAx,
                                               CSSNumericValue& aAy,
                                               ErrorResult& aRv) {
  // Step 2.
  return MakeAndAddRef<CSSSkew>(aGlobal.GetAsSupports(), /* aIs2D */ true, &aAx,
                                &aAy);
}

CSSNumericValue* CSSSkew::Ax() const { return mAx; }

void CSSSkew::SetAx(CSSNumericValue& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

CSSNumericValue* CSSSkew::Ay() const { return mAy; }

void CSSSkew::SetAy(CSSNumericValue& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

// end of CSSSkew Web IDL implementation

void CSSSkew::ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                                    nsACString& aDest) const {
  aDest.Append("skew("_ns);

  mAx->ToCssTextWithProperty(aPropertyId, aDest);

  aDest.Append(", "_ns);
  mAy->ToCssTextWithProperty(aPropertyId, aDest);

  aDest.Append(")"_ns);
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
