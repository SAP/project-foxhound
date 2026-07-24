/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSVariableReferenceValue.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/Assertions.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/CSSVariableReferenceValueBinding.h"
#include "nsCycleCollectionParticipant.h"

namespace mozilla::dom {

CSSVariableReferenceValue::CSSVariableReferenceValue(
    nsCOMPtr<nsISupports> aParent)
    : mParent(std::move(aParent)) {
  MOZ_ASSERT(mParent);
}

NS_IMPL_CYCLE_COLLECTING_ADDREF(CSSVariableReferenceValue)
NS_IMPL_CYCLE_COLLECTING_RELEASE(CSSVariableReferenceValue)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(CSSVariableReferenceValue)
  NS_WRAPPERCACHE_INTERFACE_MAP_ENTRY
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END
NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE(CSSVariableReferenceValue, mParent)

nsISupports* CSSVariableReferenceValue::GetParentObject() const {
  return mParent;
}

JSObject* CSSVariableReferenceValue::WrapObject(
    JSContext* aCx, JS::Handle<JSObject*> aGivenProto) {
  return CSSVariableReferenceValue_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSVariableReferenceValue Web IDL implementation

// static
already_AddRefed<CSSVariableReferenceValue>
CSSVariableReferenceValue::Constructor(const GlobalObject& aGlobal,
                                       const nsACString& aVariable,
                                       CSSUnparsedValue* aFallback,
                                       ErrorResult& aRv) {
  return MakeAndAddRef<CSSVariableReferenceValue>(aGlobal.GetAsSupports());
}

void CSSVariableReferenceValue::GetVariable(nsCString& aRetVal) const {}

void CSSVariableReferenceValue::SetVariable(const nsACString& aArg,
                                            ErrorResult& aRv) {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
}

CSSUnparsedValue* CSSVariableReferenceValue::GetFallback() const {
  return nullptr;
}

// end of CSSVariableReferenceValue Web IDL implementation

}  // namespace mozilla::dom
