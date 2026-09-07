/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSSkewY.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/ServoStyleConsts.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSNumericValue.h"
#include "mozilla/dom/CSSSkewYBinding.h"
#include "nsString.h"

namespace mozilla::dom {

CSSSkewY::CSSSkewY(nsCOMPtr<nsISupports> aParent, bool aIs2D,
                   RefPtr<CSSNumericValue> aAy)
    : CSSTransformComponent(std::move(aParent), aIs2D,
                            TransformComponentType::SkewY),
      mAy(std::move(aAy)) {}

// static
RefPtr<CSSSkewY> CSSSkewY::Create(nsCOMPtr<nsISupports> aParent,
                                  const StyleSkewYComponent& aSkewYComponent) {
  RefPtr<CSSNumericValue> ay =
      CSSNumericValue::Create(aParent, aSkewYComponent);

  return MakeAndAddRef<CSSSkewY>(std::move(aParent), /* aIs2Da */ true,
                                 std::move(ay));
}

NS_IMPL_ISUPPORTS_CYCLE_COLLECTION_INHERITED_0(CSSSkewY, CSSTransformComponent)
NS_IMPL_CYCLE_COLLECTION_INHERITED(CSSSkewY, CSSTransformComponent, mAy)

JSObject* CSSSkewY::WrapObject(JSContext* aCx,
                               JS::Handle<JSObject*> aGivenProto) {
  return CSSSkewY_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSSkewY Web IDL implementation

// https://drafts.css-houdini.org/css-typed-om-1/#dom-cssskewy-cssskewy
//
// XXX This is not yet fully implemented!
//
// static
already_AddRefed<CSSSkewY> CSSSkewY::Constructor(const GlobalObject& aGlobal,
                                                 CSSNumericValue& aAy,
                                                 ErrorResult& aRv) {
  // Step 2.
  return MakeAndAddRef<CSSSkewY>(aGlobal.GetAsSupports(), /* aIs2D */ true,
                                 &aAy);
}

CSSNumericValue* CSSSkewY::Ay() const { return mAy; }

void CSSSkewY::SetAy(CSSNumericValue& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

// end of CSSSkewY Web IDL implementation

void CSSSkewY::ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                                     nsACString& aDest) const {
  aDest.Append("skewY("_ns);

  mAy->ToCssTextWithProperty(aPropertyId, aDest);

  aDest.Append(")"_ns);
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
