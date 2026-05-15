/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSUnparsedValue.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSUnparsedValueBinding.h"

namespace mozilla::dom {

CSSUnparsedValue::CSSUnparsedValue(nsCOMPtr<nsISupports> aParent)
    : CSSStyleValue(std::move(aParent)) {}

JSObject* CSSUnparsedValue::WrapObject(JSContext* aCx,
                                       JS::Handle<JSObject*> aGivenProto) {
  return CSSUnparsedValue_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSUnparsedValue Web IDL implementation

// static
already_AddRefed<CSSUnparsedValue> CSSUnparsedValue::Constructor(
    const GlobalObject& aGlobal,
    const Sequence<OwningCSSUnparsedSegment>& aMembers) {
  return MakeAndAddRef<CSSUnparsedValue>(aGlobal.GetAsSupports());
}

uint32_t CSSUnparsedValue::Length() const { return 0; }

void CSSUnparsedValue::IndexedGetter(uint32_t aIndex, bool& aFound,
                                     OwningCSSUnparsedSegment& aRetVal) {}

void CSSUnparsedValue::IndexedSetter(uint32_t aIndex,
                                     const CSSUnparsedSegment& aVal,
                                     ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

// end of CSSUnparsedValue Web IDL implementation

}  // namespace mozilla::dom
