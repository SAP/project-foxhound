/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSTranslate.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/ServoStyleConsts.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSNumericValue.h"
#include "mozilla/dom/CSSTranslateBinding.h"
#include "mozilla/dom/CSSUnitValue.h"
#include "nsCOMPtr.h"
#include "nsString.h"

namespace mozilla::dom {

CSSTranslate::CSSTranslate(nsCOMPtr<nsISupports> aParent, bool aIs2D,
                           RefPtr<CSSNumericValue> aX,
                           RefPtr<CSSNumericValue> aY,
                           RefPtr<CSSNumericValue> aZ)
    : CSSTransformComponent(std::move(aParent), aIs2D,
                            TransformComponentType::Translate),
      mX(std::move(aX)),
      mY(std::move(aY)),
      mZ(std::move(aZ)) {}

// static
RefPtr<CSSTranslate> CSSTranslate::Create(
    nsCOMPtr<nsISupports> aParent,
    const StyleTranslateComponent& aTranslateComponent) {
  RefPtr<CSSNumericValue> x =
      CSSNumericValue::Create(aParent, aTranslateComponent.x);
  RefPtr<CSSNumericValue> y =
      CSSNumericValue::Create(aParent, aTranslateComponent.y);
  RefPtr<CSSNumericValue> z =
      CSSNumericValue::Create(aParent, aTranslateComponent.z);

  return MakeAndAddRef<CSSTranslate>(std::move(aParent),
                                     aTranslateComponent.is_2d, std::move(x),
                                     std::move(y), std::move(z));
}

NS_IMPL_ISUPPORTS_CYCLE_COLLECTION_INHERITED_0(CSSTranslate,
                                               CSSTransformComponent)
NS_IMPL_CYCLE_COLLECTION_INHERITED(CSSTranslate, CSSTransformComponent, mX, mY,
                                   mZ)

JSObject* CSSTranslate::WrapObject(JSContext* aCx,
                                   JS::Handle<JSObject*> aGivenProto) {
  return CSSTranslate_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSTranslate Web IDL implementation

// https://drafts.css-houdini.org/css-typed-om-1/#dom-csstranslate-csstranslate
//
// XXX This is not yet fully implemented!
//
// static
already_AddRefed<CSSTranslate> CSSTranslate::Constructor(
    const GlobalObject& aGlobal, CSSNumericValue& aX, CSSNumericValue& aY,
    const Optional<NonNull<CSSNumericValue>>& aZ, ErrorResult& aRv) {
  nsCOMPtr<nsISupports> global = aGlobal.GetAsSupports();

  // TODO: The spec step ordering could be adjusted to better match typical
  // implementations, which usually initialize all slots at once.

  // Step 3-6.
  if (aZ.WasPassed()) {
    return MakeAndAddRef<CSSTranslate>(std::move(global), /* aIs2D */ false,
                                       &aX, &aY, &aZ.Value());
  }

  RefPtr<CSSUnitValue> z = CSSUnitValue::Create(global, 0.0, "px"_ns);

  return MakeAndAddRef<CSSTranslate>(std::move(global), /* aIs2D */ true, &aX,
                                     &aY, std::move(z));
}

CSSNumericValue* CSSTranslate::X() const { return mX; }

void CSSTranslate::SetX(CSSNumericValue& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

CSSNumericValue* CSSTranslate::Y() const { return mY; }

void CSSTranslate::SetY(CSSNumericValue& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

CSSNumericValue* CSSTranslate::Z() const { return mZ; }

void CSSTranslate::SetZ(CSSNumericValue& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

// end of CSSTranslate Web IDL implementation

void CSSTranslate::ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                                         nsACString& aDest) const {
  aDest.Append(mIs2D ? "translate("_ns : "translate3d("_ns);

  mX->ToCssTextWithProperty(aPropertyId, aDest);

  aDest.Append(", "_ns);
  mY->ToCssTextWithProperty(aPropertyId, aDest);

  if (!mIs2D) {
    aDest.Append(", "_ns);
    mZ->ToCssTextWithProperty(aPropertyId, aDest);
  }

  aDest.Append(")"_ns);
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
