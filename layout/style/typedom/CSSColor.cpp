/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSColor.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSColorBinding.h"
#include "mozilla/dom/CSSColorValueBinding.h"
#include "mozilla/dom/CSSKeywordValueBinding.h"
#include "mozilla/dom/CSSNumericValueBinding.h"
#include "nsReadableUtils.h"

namespace mozilla::dom {

CSSColor::CSSColor(nsCOMPtr<nsISupports> aParent)
    : CSSColorValue(std::move(aParent)) {}

JSObject* CSSColor::WrapObject(JSContext* aCx,
                               JS::Handle<JSObject*> aGivenProto) {
  return CSSColor_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSColor Web IDL implementation

// static
already_AddRefed<CSSColor> CSSColor::Constructor(
    const GlobalObject& aGlobal, const CSSKeywordish& aColorSpace,
    const Sequence<OwningCSSColorPercent>& aChannels,
    const CSSNumberish& aAlpha, ErrorResult& aRv) {
  return MakeAndAddRef<CSSColor>(aGlobal.GetAsSupports());
}

void CSSColor::GetColorSpace(OwningCSSKeywordish& aRetVal) const {
  aRetVal.SetAsUTF8String() = EmptyCString();
}

void CSSColor::SetColorSpace(const CSSKeywordish& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSColor::OnSetChannels(CSSNumericValue& aValue, uint32_t aIndex,
                             ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSColor::OnDeleteChannels(CSSNumericValue& aValue, uint32_t aIndex,
                                ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

void CSSColor::GetAlpha(OwningCSSNumberish& aRetVal) const {
  aRetVal.SetAsDouble() = 0;
}

void CSSColor::SetAlpha(const CSSNumberish& aArg, ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

// end of CSSColor Web IDL implementation

}  // namespace mozilla::dom
