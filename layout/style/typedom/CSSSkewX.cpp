/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSSkewX.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/ServoStyleConsts.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSNumericValue.h"
#include "mozilla/dom/CSSSkewXBinding.h"
#include "nsString.h"

namespace mozilla::dom {

CSSSkewX::CSSSkewX(nsCOMPtr<nsISupports> aParent, bool aIs2D,
                   RefPtr<CSSNumericValue> aAx)
    : CSSTransformComponent(std::move(aParent), aIs2D,
                            TransformComponentType::SkewX),
      mAx(std::move(aAx)) {}

// static
RefPtr<CSSSkewX> CSSSkewX::Create(nsCOMPtr<nsISupports> aParent,
                                  const StyleSkewXComponent& aSkewXComponent) {
  RefPtr<CSSNumericValue> ax =
      CSSNumericValue::Create(aParent, aSkewXComponent);

  return MakeAndAddRef<CSSSkewX>(std::move(aParent), /* aIs2Da */ true,
                                 std::move(ax));
}

NS_IMPL_ISUPPORTS_CYCLE_COLLECTION_INHERITED_0(CSSSkewX, CSSTransformComponent)
NS_IMPL_CYCLE_COLLECTION_INHERITED(CSSSkewX, CSSTransformComponent, mAx)

JSObject* CSSSkewX::WrapObject(JSContext* aCx,
                               JS::Handle<JSObject*> aGivenProto) {
  return CSSSkewX_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSSkewX Web IDL implementation

// https://drafts.css-houdini.org/css-typed-om-1/#dom-cssskewx-cssskewx
//
// XXX This is not yet fully implemented!
//
// static
already_AddRefed<CSSSkewX> CSSSkewX::Constructor(const GlobalObject& aGlobal,
                                                 CSSNumericValue& aAx,
                                                 ErrorResult& aRv) {
  // Step 2.
  return MakeAndAddRef<CSSSkewX>(aGlobal.GetAsSupports(), /* aIs2D */ true,
                                 &aAx);
}

CSSNumericValue* CSSSkewX::Ax() const { return mAx; }

void CSSSkewX::SetAx(CSSNumericValue& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

// end of CSSSkewX Web IDL implementation

void CSSSkewX::ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                                     nsACString& aDest) const {
  aDest.Append("skewX("_ns);

  mAx->ToCssTextWithProperty(aPropertyId, aDest);

  aDest.Append(")"_ns);
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
