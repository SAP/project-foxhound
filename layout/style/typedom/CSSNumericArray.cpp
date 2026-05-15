/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSNumericArray.h"

#include "mozilla/Assertions.h"
#include "mozilla/dom/CSSNumericArrayBinding.h"
#include "mozilla/dom/CSSNumericValue.h"
#include "nsCycleCollectionParticipant.h"

namespace mozilla::dom {

CSSNumericArray::CSSNumericArray(nsCOMPtr<nsISupports> aParent,
                                 nsTArray<RefPtr<CSSNumericValue>> aValues)
    : mParent(std::move(aParent)), mValues(std::move(aValues)) {
  MOZ_ASSERT(mParent);
}

NS_IMPL_CYCLE_COLLECTING_ADDREF(CSSNumericArray)
NS_IMPL_CYCLE_COLLECTING_RELEASE(CSSNumericArray)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(CSSNumericArray)
  NS_WRAPPERCACHE_INTERFACE_MAP_ENTRY
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END
NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE(CSSNumericArray, mParent, mValues)

nsISupports* CSSNumericArray::GetParentObject() const { return mParent; }

JSObject* CSSNumericArray::WrapObject(JSContext* aCx,
                                      JS::Handle<JSObject*> aGivenProto) {
  return CSSNumericArray_Binding::Wrap(aCx, this, aGivenProto);
}

// start of CSSNumericArray Web IDL implementation

// https://drafts.css-houdini.org/css-typed-om-1/#dom-cssnumericarray-length
uint32_t CSSNumericArray::Length() const { return mValues.Length(); }

// https://drafts.css-houdini.org/css-typed-om-1/#cssnumericarray-indexed-property-getter
CSSNumericValue* CSSNumericArray::IndexedGetter(uint32_t aIndex, bool& aFound) {
  if (aIndex < mValues.Length()) {
    aFound = true;
    return mValues[aIndex];
  }

  aFound = false;
  return nullptr;
}

// end of CSSNumericArray Web IDL implementation

}  // namespace mozilla::dom
