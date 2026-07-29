/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSScale.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/ServoStyleConsts.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSNumericValue.h"
#include "mozilla/dom/CSSNumericValueBinding.h"
#include "mozilla/dom/CSSScaleBinding.h"
#include "mozilla/dom/CSSUnitValue.h"
#include "nsCOMPtr.h"
#include "nsString.h"

namespace mozilla::dom {

CSSScale::CSSScale(nsCOMPtr<nsISupports> aParent, bool aIs2D,
                   RefPtr<CSSNumericValue> aX, RefPtr<CSSNumericValue> aY,
                   RefPtr<CSSNumericValue> aZ)
    : CSSTransformComponent(std::move(aParent), aIs2D,
                            TransformComponentType::Scale),
      mX(std::move(aX)),
      mY(std::move(aY)),
      mZ(std::move(aZ)) {}

// static
RefPtr<CSSScale> CSSScale::Create(nsCOMPtr<nsISupports> aParent,
                                  const StyleScaleComponent& aScaleComponent) {
  RefPtr<CSSNumericValue> x =
      CSSNumericValue::Create(aParent, aScaleComponent.x);
  RefPtr<CSSNumericValue> y =
      CSSNumericValue::Create(aParent, aScaleComponent.y);
  RefPtr<CSSNumericValue> z =
      CSSNumericValue::Create(aParent, aScaleComponent.z);

  return MakeAndAddRef<CSSScale>(std::move(aParent), aScaleComponent.is_2d,
                                 std::move(x), std::move(y), std::move(z));
}

NS_IMPL_ISUPPORTS_CYCLE_COLLECTION_INHERITED_0(CSSScale, CSSTransformComponent)
NS_IMPL_CYCLE_COLLECTION_INHERITED(CSSScale, CSSTransformComponent, mX, mY, mZ)

JSObject* CSSScale::WrapObject(JSContext* aCx,
                               JS::Handle<JSObject*> aGivenProto) {
  return CSSScale_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSScale Web IDL implementation

// https://drafts.css-houdini.org/css-typed-om-1/#dom-cssscale-cssscale
//
// XXX This is not yet fully implemented!
//
//  static
already_AddRefed<CSSScale> CSSScale::Constructor(
    const GlobalObject& aGlobal, const CSSNumberish& aX, const CSSNumberish& aY,
    const Optional<CSSNumberish>& aZ, ErrorResult& aRv) {
  nsCOMPtr<nsISupports> global = aGlobal.GetAsSupports();

  // TODO: The spec step ordering could be adjusted to better match typical
  // implementations, which usually initialize all slots at once.

  // Step 1-6.
  RefPtr<CSSNumericValue> x = CSSNumericValue::Create(global, aX);
  RefPtr<CSSNumericValue> y = CSSNumericValue::Create(global, aY);

  if (aZ.WasPassed()) {
    RefPtr<CSSNumericValue> z = CSSNumericValue::Create(global, aZ.Value());

    return MakeAndAddRef<CSSScale>(std::move(global), /* aIs2D */ false,
                                   std::move(x), std::move(y), std::move(z));
  }

  RefPtr<CSSUnitValue> z = CSSUnitValue::Create(global, 1.0);

  return MakeAndAddRef<CSSScale>(std::move(global), /* aIs2D */ true,
                                 std::move(x), std::move(y), std::move(z));
}

void CSSScale::GetX(OwningCSSNumberish& aRetVal) const {
  aRetVal.SetAsCSSNumericValue() = mX;
}

void CSSScale::SetX(const CSSNumberish& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSScale::GetY(OwningCSSNumberish& aRetVal) const {
  aRetVal.SetAsCSSNumericValue() = mY;
}

void CSSScale::SetY(const CSSNumberish& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSScale::GetZ(OwningCSSNumberish& aRetVal) const {
  aRetVal.SetAsCSSNumericValue() = mZ;
}

void CSSScale::SetZ(const CSSNumberish& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

// end of CSSScale Web IDL implementation

void CSSScale::ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                                     nsACString& aDest) const {
  aDest.Append(mIs2D ? "scale("_ns : "scale3d("_ns);

  mX->ToCssTextWithProperty(aPropertyId, aDest);

  aDest.Append(", "_ns);
  mY->ToCssTextWithProperty(aPropertyId, aDest);

  if (!mIs2D) {
    aDest.Append(", "_ns);
    mZ->ToCssTextWithProperty(aPropertyId, aDest);
  }

  aDest.Append(")"_ns);
}

const CSSScale& CSSTransformComponent::GetAsCSSScale() const {
  MOZ_DIAGNOSTIC_ASSERT(mTransformComponentType ==
                        TransformComponentType::Scale);

  return *static_cast<const CSSScale*>(this);
}

CSSScale& CSSTransformComponent::GetAsCSSScale() {
  MOZ_DIAGNOSTIC_ASSERT(mTransformComponentType ==
                        TransformComponentType::Scale);

  return *static_cast<CSSScale*>(this);
}

}  // namespace mozilla::dom
