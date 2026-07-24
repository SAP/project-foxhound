/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_TreeOrderedArrayInlines_h
#define mozilla_dom_TreeOrderedArrayInlines_h

#include <type_traits>

#include "mozilla/BinarySearch.h"
#include "mozilla/dom/TreeOrderedArray.h"
#include "nsContentUtils.h"

namespace mozilla::dom {

template <typename Node, TreeKind K>
size_t TreeOrderedArray<Node, K>::Insert(Node& aNode,
                                         nsINode* aCommonAncestor) {
  static_assert(std::is_base_of_v<nsINode, Node>, "Should be a node");

  auto span = Base::AsSpan();
  auto len = span.Length();
  if (!len) {
    Base::AppendElement(&aNode);
    return 0;
  }

  struct PositionComparator {
    Node& mNode;
    nsINode* mCommonAncestor = nullptr;
    mutable nsContentUtils::NodeIndexCache mCache;

    int operator()(void* aNode) const {
      auto* curNode = static_cast<Node*>(aNode);
      MOZ_DIAGNOSTIC_ASSERT(curNode != &mNode,
                            "Tried to insert a node already in the list");
      return nsContentUtils::CompareTreePosition<K>(&mNode, curNode,
                                                    mCommonAncestor, &mCache);
    }
  };

  PositionComparator cmp{aNode, aCommonAncestor};
  if (cmp(span[len - 1]) > 0) {
    // Appending is a really common case, optimize for it.
    Base::AppendElement(&aNode);
    return len;
  }

  size_t idx;
  BinarySearchIf(span, 0, len, cmp, &idx);
  Base::InsertElementAt(idx, &aNode);
  return idx;
}

}  // namespace mozilla::dom
#endif
