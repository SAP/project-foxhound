/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ScriptLoadRequestList.h"

#include "ScriptLoadRequest.h"

namespace JS::loader {

//////////////////////////////////////////////////////////////
// ScriptLoadRequestList
//////////////////////////////////////////////////////////////

ScriptLoadRequestList::~ScriptLoadRequestList() { CancelRequestsAndClear(); }

void ScriptLoadRequestList::CancelRequestsAndClear() {
  while (!isEmpty()) {
    RefPtr<ScriptLoadRequest> first = StealFirst();
    first->Cancel();
    // And just let it go out of scope and die.
  }
}

#ifdef DEBUG
bool ScriptLoadRequestList::Contains(ScriptLoadRequest* aElem) const {
  for (const ScriptLoadRequest* req = getFirst(); req; req = req->getNext()) {
    if (req == aElem) {
      return true;
    }
  }

  return false;
}
#endif  // DEBUG

void ScriptLoadRequestList::AppendElement(ScriptLoadRequest* aElem) {
  MOZ_ASSERT(!aElem->isInList());
  NS_ADDREF(aElem);
  insertBack(aElem);
}

already_AddRefed<ScriptLoadRequest> ScriptLoadRequestList::Steal(
    ScriptLoadRequest* aElem) {
  aElem->removeFrom(*this);
  return dont_AddRef(aElem);
}

already_AddRefed<ScriptLoadRequest> ScriptLoadRequestList::StealFirst() {
  MOZ_ASSERT(!isEmpty());
  return Steal(getFirst());
}

void ScriptLoadRequestList::Remove(ScriptLoadRequest* aElem) {
  aElem->removeFrom(*this);
  NS_RELEASE(aElem);
}

void ImplCycleCollectionUnlink(ScriptLoadRequestList& aField) {
  while (!aField.isEmpty()) {
    RefPtr<ScriptLoadRequest> first = aField.StealFirst();
  }
}

void ImplCycleCollectionTraverse(nsCycleCollectionTraversalCallback& aCallback,
                                 ScriptLoadRequestList& aField,
                                 const char* aName, uint32_t aFlags) {
  for (ScriptLoadRequest* request = aField.getFirst(); request;
       request = request->getNext()) {
    CycleCollectionNoteChild(aCallback, request, aName, aFlags);
  }
}

}  // namespace JS::loader
