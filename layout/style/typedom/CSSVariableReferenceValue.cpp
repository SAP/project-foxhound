/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSVariableReferenceValue.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/Assertions.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/ServoStyleConsts.h"
#include "mozilla/dom/CSSUnparsedValue.h"
#include "mozilla/dom/CSSVariableReferenceValueBinding.h"
#include "nsCSSProps.h"
#include "nsCycleCollectionParticipant.h"

namespace mozilla::dom {

CSSVariableReferenceValue::CSSVariableReferenceValue(
    nsCOMPtr<nsISupports> aParent, const nsACString& aVariable,
    RefPtr<CSSUnparsedValue> aFallback)
    : mParent(std::move(aParent)),
      mVariable(aVariable),
      mFallback(std::move(aFallback)) {
  MOZ_ASSERT(mParent);
}

// static
RefPtr<CSSVariableReferenceValue> CSSVariableReferenceValue::Create(
    nsCOMPtr<nsISupports> aParent,
    const StyleVariableReferenceValue& aVariableReferenceValue) {
  RefPtr<CSSUnparsedValue> fallback;
  if (aVariableReferenceValue.has_fallback) {
    fallback =
        CSSUnparsedValue::Create(aParent, aVariableReferenceValue.fallback);
  }

  return MakeRefPtr<CSSVariableReferenceValue>(std::move(aParent),
                                               aVariableReferenceValue.variable,
                                               std::move(fallback));
}

NS_IMPL_CYCLE_COLLECTING_ADDREF(CSSVariableReferenceValue)
NS_IMPL_CYCLE_COLLECTING_RELEASE(CSSVariableReferenceValue)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(CSSVariableReferenceValue)
  NS_WRAPPERCACHE_INTERFACE_MAP_ENTRY
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END
NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE(CSSVariableReferenceValue, mParent,
                                      mFallback)

nsISupports* CSSVariableReferenceValue::GetParentObject() const {
  return mParent;
}

JSObject* CSSVariableReferenceValue::WrapObject(
    JSContext* aCx, JS::Handle<JSObject*> aGivenProto) {
  return CSSVariableReferenceValue_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSVariableReferenceValue Web IDL implementation

// https://drafts.css-houdini.org/css-typed-om-1/#dom-cssvariablereferencevalue-cssvariablereferencevalue
//
// static
already_AddRefed<CSSVariableReferenceValue>
CSSVariableReferenceValue::Constructor(const GlobalObject& aGlobal,
                                       const nsACString& aVariable,
                                       CSSUnparsedValue* aFallback,
                                       ErrorResult& aRv) {
  // Step 1.
  NonCustomCSSPropertyId id = nsCSSProps::LookupProperty(aVariable);
  if (id != eCSSPropertyExtra_variable) {
    aRv.ThrowTypeError("Invalid custom property name");
    return nullptr;
  }

  // Step 2.
  return MakeAndAddRef<CSSVariableReferenceValue>(aGlobal.GetAsSupports(),
                                                  aVariable, aFallback);
}

// https://drafts.css-houdini.org/css-typed-om-1/#dom-cssvariablereferencevalue-variable
void CSSVariableReferenceValue::GetVariable(nsCString& aRetVal) const {
  aRetVal = mVariable;
}

// https://drafts.css-houdini.org/css-typed-om-1/#dom-cssvariablereferencevalue-variable
void CSSVariableReferenceValue::SetVariable(const nsACString& aArg,
                                            ErrorResult& aRv) {
  // Step 1.
  NonCustomCSSPropertyId id = nsCSSProps::LookupProperty(aArg);
  if (id != eCSSPropertyExtra_variable) {
    aRv.ThrowTypeError("Invalid custom property name");
    return;
  }

  // Step 2.
  mVariable = aArg;
}

// https://drafts.css-houdini.org/css-typed-om-1/#dom-cssvariablereferencevalue-fallback
CSSUnparsedValue* CSSVariableReferenceValue::GetFallback() const {
  return mFallback;
}

// end of CSSVariableReferenceValue Web IDL implementation

}  // namespace mozilla::dom
