/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef js_loader_ScriptLoadRequestList_h
#define js_loader_ScriptLoadRequestList_h

#include "mozilla/LinkedList.h"
#include "nsCOMPtr.h"

namespace JS {
namespace loader {

class ScriptLoadRequest;

class ScriptLoadRequestList : private mozilla::LinkedList<ScriptLoadRequest> {
  using super = mozilla::LinkedList<ScriptLoadRequest>;

 public:
  ~ScriptLoadRequestList();

  void CancelRequestsAndClear();

#ifdef DEBUG
  bool Contains(ScriptLoadRequest* aElem) const;
#endif  // DEBUG

  using super::getFirst;
  using super::isEmpty;

  void AppendElement(ScriptLoadRequest* aElem);

  already_AddRefed<ScriptLoadRequest> Steal(ScriptLoadRequest* aElem);

  already_AddRefed<ScriptLoadRequest> StealFirst();

  void Remove(ScriptLoadRequest* aElem);
};

void ImplCycleCollectionUnlink(ScriptLoadRequestList& aField);

void ImplCycleCollectionTraverse(nsCycleCollectionTraversalCallback& aCallback,
                                 ScriptLoadRequestList& aField,
                                 const char* aName, uint32_t aFlags);

}  // namespace loader
}  // namespace JS

#endif  // js_loader_ScriptLoadRequestList_h
