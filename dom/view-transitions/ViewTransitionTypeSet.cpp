/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/ViewTransitionTypeSet.h"

#include "mozilla/ErrorResult.h"
#include "mozilla/dom/ViewTransition.h"
#include "mozilla/dom/ViewTransitionBinding.h"
#include "nsISupportsImpl.h"

namespace mozilla::dom {

using namespace ViewTransitionTypeSet_Binding;

// Only needed for refcounted objects.
NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE(ViewTransitionTypeSet, mTransition)
NS_IMPL_CYCLE_COLLECTING_ADDREF(ViewTransitionTypeSet)
NS_IMPL_CYCLE_COLLECTING_RELEASE(ViewTransitionTypeSet)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(ViewTransitionTypeSet)
  NS_WRAPPERCACHE_INTERFACE_MAP_ENTRY
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END

ViewTransitionTypeSet::ViewTransitionTypeSet(ViewTransition& aVt)
    : mTransition(&aVt) {}

ViewTransitionTypeSet::~ViewTransitionTypeSet() = default;

nsISupports* ViewTransitionTypeSet::GetParentObject() const {
  return mTransition.get();
}

ViewTransitionTypeSet* ViewTransitionTypeSet::Add(const nsAString& aValue,
                                                  ErrorResult& aRv) {
  if (SetlikeHelpers::Has(this, aValue, aRv) || aRv.Failed()) {
    return this;
  }
  SetlikeHelpers::Add(this, aValue, aRv);
  if (aRv.Failed()) {
    return this;
  }
  RefPtr atom = NS_AtomizeMainThread(aValue);
  MOZ_ASSERT(!mTransition->GetTypeList().Contains(atom));
  mTransition->GetTypeList().AppendElement(std::move(atom));
  return this;
}
void ViewTransitionTypeSet::Clear(ErrorResult& aRv) {
  SetlikeHelpers::Clear(this, aRv);
  if (aRv.Failed()) {
    return;
  }
  mTransition->GetTypeList().Clear();
}
bool ViewTransitionTypeSet::Delete(const nsAString& aValue, ErrorResult& aRv) {
  if (!SetlikeHelpers::Delete(this, aValue, aRv) || aRv.Failed()) {
    return false;
  }
  RefPtr atom = NS_AtomizeMainThread(aValue);
  MOZ_ASSERT(mTransition->GetTypeList().Contains(atom));
  mTransition->GetTypeList().RemoveElement(atom);
  return true;
}

JSObject* ViewTransitionTypeSet::WrapObject(JSContext* aCx,
                                            JS::Handle<JSObject*> aGivenProto) {
  return ViewTransitionTypeSet_Binding::Wrap(aCx, this, aGivenProto);
}

}  // namespace mozilla::dom
