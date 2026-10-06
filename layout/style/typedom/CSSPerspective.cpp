/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSPerspective.h"

#include "TypedOMUtils.h"
#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/ServoStyleConsts.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSKeywordValue.h"
#include "mozilla/dom/CSSKeywordValueBinding.h"
#include "mozilla/dom/CSSNumericValue.h"
#include "nsCOMPtr.h"
#include "nsReadableUtils.h"
#include "nsString.h"

namespace mozilla::dom {

CSSPerspective::CSSPerspective(nsCOMPtr<nsISupports> aParent, bool aIs2D,
                               OwningCSSPerspectiveValue aLength)
    : CSSTransformComponent(std::move(aParent), aIs2D,
                            TransformComponentType::Perspective),
      mLength(std::move(aLength)) {}

// static
RefPtr<CSSPerspective> CSSPerspective::Create(
    nsCOMPtr<nsISupports> aParent,
    const StylePerspectiveComponent& aPerspectiveComponent) {
  const auto& styleLength = aPerspectiveComponent.length;

  OwningCSSPerspectiveValue length;

  if (styleLength.IsNumeric()) {
    length.SetAsCSSNumericValue() =
        CSSNumericValue::Create(aParent, styleLength.AsNumeric());
  } else {
    length.SetAsCSSKeywordValue() =
        CSSKeywordValue::Create(aParent, styleLength.AsKeyword());
  }

  return MakeAndAddRef<CSSPerspective>(std::move(aParent), /* aIs2Da */ false,
                                       std::move(length));
}

NS_IMPL_ISUPPORTS_CYCLE_COLLECTION_INHERITED_0(CSSPerspective,
                                               CSSTransformComponent)
NS_IMPL_CYCLE_COLLECTION_INHERITED(CSSPerspective, CSSTransformComponent,
                                   mLength)

JSObject* CSSPerspective::WrapObject(JSContext* aCx,
                                     JS::Handle<JSObject*> aGivenProto) {
  return CSSPerspective_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSPerspective Web IDL implementation

// https://drafts.css-houdini.org/css-typed-om-1/#dom-cssperspective-cssperspective
//
// XXX This is not yet fully implemented!
//
//  static
already_AddRefed<CSSPerspective> CSSPerspective::Constructor(
    const GlobalObject& aGlobal, const CSSPerspectiveValue& aLength,
    ErrorResult& aRv) {
  nsCOMPtr<nsISupports> global = aGlobal.GetAsSupports();

  OwningCSSPerspectiveValue length;

  // Step 1 & 2.
  if (aLength.IsCSSNumericValue()) {
    length.SetAsCSSNumericValue() = aLength.GetAsCSSNumericValue();
  } else {
    CSSKeywordish keywordish;
    ToCSSKeywordish(aLength, keywordish);

    length.SetAsCSSKeywordValue() = CSSKeywordValue::Create(global, keywordish);
  }

  // Step 3.
  return MakeAndAddRef<CSSPerspective>(std::move(global), /* aIs2D */ false,
                                       std::move(length));
}

void CSSPerspective::GetLength(OwningCSSPerspectiveValue& aRetVal) const {
  aRetVal = mLength;
}

void CSSPerspective::SetLength(const CSSPerspectiveValue& aArg,
                               ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

// end of CSSPerspective Web IDL implementation

void CSSPerspective::ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                                           nsACString& aDest) const {
  aDest.Append("perspective("_ns);

  if (mLength.IsCSSNumericValue()) {
    mLength.GetAsCSSNumericValue()->ToCssTextWithProperty(aPropertyId, aDest);
  } else {
    mLength.GetAsCSSKeywordValue()->ToCssTextWithProperty(aPropertyId, aDest);
  }

  aDest.Append(")"_ns);
}

const CSSPerspective& CSSTransformComponent::GetAsCSSPerspective() const {
  MOZ_DIAGNOSTIC_ASSERT(mTransformComponentType ==
                        TransformComponentType::Perspective);

  return *static_cast<const CSSPerspective*>(this);
}

CSSPerspective& CSSTransformComponent::GetAsCSSPerspective() {
  MOZ_DIAGNOSTIC_ASSERT(mTransformComponentType ==
                        TransformComponentType::Perspective);

  return *static_cast<CSSPerspective*>(this);
}

}  // namespace mozilla::dom
