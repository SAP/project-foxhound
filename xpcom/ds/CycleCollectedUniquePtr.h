/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_CycleCollectedUniquePtr_h_
#define mozilla_CycleCollectedUniquePtr_h_

#include "nsCycleCollectionContainerParticipant.h"

namespace mozilla {

namespace dom {

template <typename T>
inline void ImplCycleCollectionUnlink(std::unique_ptr<T>& aField) {
  aField.reset();
}
template <typename T>
inline void ImplCycleCollectionTraverse(
    nsCycleCollectionTraversalCallback& aCallback,
    const std::unique_ptr<T>& aPtr, const char* aName, uint32_t aFlags = 0) {
  if (aPtr) {
    ImplCycleCollectionTraverse(aCallback, *aPtr, aName, aFlags);
  }
}

}  // namespace dom

template <typename Container, typename Callback,
          EnableCycleCollectionIf<Container, std::unique_ptr> = nullptr>
inline void ImplCycleCollectionContainer(Container&& aField,
                                         Callback&& aCallback) {
  if (aField) {
    aCallback(*aField);
  }
}
}  // namespace mozilla

#endif  // mozilla_CycleCollectedUniquePtr_h_
