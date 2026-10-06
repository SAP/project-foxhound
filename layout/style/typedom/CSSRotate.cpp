/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSRotate.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/ServoStyleConsts.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSNumericValue.h"
#include "mozilla/dom/CSSNumericValueBinding.h"
#include "mozilla/dom/CSSRotateBinding.h"
#include "mozilla/dom/CSSUnitValue.h"
#include "nsCOMPtr.h"
#include "nsString.h"

namespace mozilla::dom {

CSSRotate::CSSRotate(nsCOMPtr<nsISupports> aParent, bool aIs2D,
                     RefPtr<CSSNumericValue> aX, RefPtr<CSSNumericValue> aY,
                     RefPtr<CSSNumericValue> aZ, RefPtr<CSSNumericValue> aAngle)
    : CSSTransformComponent(std::move(aParent), aIs2D,
                            TransformComponentType::Rotate),
      mX(std::move(aX)),
      mY(std::move(aY)),
      mZ(std::move(aZ)),
      mAngle(std::move(aAngle)) {}

// static
RefPtr<CSSRotate> CSSRotate::Create(
    nsCOMPtr<nsISupports> aParent,
    const StyleRotateComponent& aRotateComponent) {
  RefPtr<CSSNumericValue> x =
      CSSNumericValue::Create(aParent, aRotateComponent.x);
  RefPtr<CSSNumericValue> y =
      CSSNumericValue::Create(aParent, aRotateComponent.y);
  RefPtr<CSSNumericValue> z =
      CSSNumericValue::Create(aParent, aRotateComponent.z);
  RefPtr<CSSNumericValue> angle =
      CSSNumericValue::Create(aParent, aRotateComponent.angle);

  return MakeAndAddRef<CSSRotate>(std::move(aParent), aRotateComponent.is_2d,
                                  std::move(x), std::move(y), std::move(z),
                                  std::move(angle));
}

NS_IMPL_ISUPPORTS_CYCLE_COLLECTION_INHERITED_0(CSSRotate, CSSTransformComponent)
NS_IMPL_CYCLE_COLLECTION_INHERITED(CSSRotate, CSSTransformComponent, mX, mY, mZ,
                                   mAngle)

JSObject* CSSRotate::WrapObject(JSContext* aCx,
                                JS::Handle<JSObject*> aGivenProto) {
  return CSSRotate_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSRotate Web IDL implementation

// https://drafts.css-houdini.org/css-typed-om-1/#dom-cssrotate-cssrotate
//
// XXX This is not yet fully implemented!
//
// static
already_AddRefed<CSSRotate> CSSRotate::Constructor(const GlobalObject& aGlobal,
                                                   CSSNumericValue& aAngle,
                                                   ErrorResult& aRv) {
  nsCOMPtr<nsISupports> global = aGlobal.GetAsSupports();

  // Step 2.
  RefPtr<CSSNumericValue> x = CSSUnitValue::Create(global, 0.0);
  RefPtr<CSSNumericValue> y = CSSUnitValue::Create(global, 0.0);
  RefPtr<CSSNumericValue> z = CSSUnitValue::Create(global, 1.0);

  return MakeAndAddRef<CSSRotate>(std::move(global), /* aIs2D */ true,
                                  std::move(x), std::move(y), std::move(z),
                                  &aAngle);
}

// https://drafts.css-houdini.org/css-typed-om-1/#dom-cssrotate-cssrotate-x-y-z-angle
//
// XXX This is not yet fully implemented!
//
// static
already_AddRefed<CSSRotate> CSSRotate::Constructor(
    const GlobalObject& aGlobal, const CSSNumberish& aX, const CSSNumberish& aY,
    const CSSNumberish& aZ, CSSNumericValue& aAngle, ErrorResult& aRv) {
  nsCOMPtr<nsISupports> global = aGlobal.GetAsSupports();

  // Step 2.
  RefPtr<CSSNumericValue> x = CSSNumericValue::Create(global, aX);
  RefPtr<CSSNumericValue> y = CSSNumericValue::Create(global, aY);
  RefPtr<CSSNumericValue> z = CSSNumericValue::Create(global, aZ);

  // Step 4.
  return MakeAndAddRef<CSSRotate>(std::move(global), /* aIs2D */ false,
                                  std::move(x), std::move(y), std::move(z),
                                  &aAngle);
}

void CSSRotate::GetX(OwningCSSNumberish& aRetVal) const {
  aRetVal.SetAsCSSNumericValue() = mX;
}

void CSSRotate::SetX(const CSSNumberish& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSRotate::GetY(OwningCSSNumberish& aRetVal) const {
  aRetVal.SetAsCSSNumericValue() = mY;
}

void CSSRotate::SetY(const CSSNumberish& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSRotate::GetZ(OwningCSSNumberish& aRetVal) const {
  aRetVal.SetAsCSSNumericValue() = mZ;
}

void CSSRotate::SetZ(const CSSNumberish& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

CSSNumericValue* CSSRotate::Angle() const { return mAngle; }

void CSSRotate::SetAngle(CSSNumericValue& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

// end of CSSRotate Web IDL implementation

void CSSRotate::ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                                      nsACString& aDest) const {
  aDest.Append(mIs2D ? "rotate("_ns : "rotate3d("_ns);

  if (!mIs2D) {
    mX->ToCssTextWithProperty(aPropertyId, aDest);
    aDest.Append(", "_ns);

    mY->ToCssTextWithProperty(aPropertyId, aDest);
    aDest.Append(", "_ns);

    mZ->ToCssTextWithProperty(aPropertyId, aDest);
    aDest.Append(", "_ns);
  }

  mAngle->ToCssTextWithProperty(aPropertyId, aDest);

  aDest.Append(")"_ns);
}

const CSSRotate& CSSTransformComponent::GetAsCSSRotate() const {
  MOZ_DIAGNOSTIC_ASSERT(mTransformComponentType ==
                        TransformComponentType::Rotate);

  return *static_cast<const CSSRotate*>(this);
}

CSSRotate& CSSTransformComponent::GetAsCSSRotate() {
  MOZ_DIAGNOSTIC_ASSERT(mTransformComponentType ==
                        TransformComponentType::Rotate);

  return *static_cast<CSSRotate*>(this);
}

}  // namespace mozilla::dom
