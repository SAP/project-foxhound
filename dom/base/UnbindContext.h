/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* State that is passed down to UnbindToTree. */

#ifndef mozilla_dom_UnbindContext_h_
#define mozilla_dom_UnbindContext_h_

#include "mozilla/Attributes.h"
#include "nsINode.h"

namespace mozilla::dom {

struct MOZ_STACK_CLASS UnbindContext final {
  // The root of the subtree being unbound.
  nsINode& Root() const { return mRoot; }
  // Whether we're the root of the subtree being unbound.
  bool IsUnbindRoot(const nsINode* aNode) const { return &mRoot == aNode; }
  // The parent node of the subtree we're unbinding from.
  nsINode* GetOriginalSubtreeParent() const { return mOriginalParent; }

  // The document that owns the tree we're getting unbound from.
  Document& OwnerDoc() const { return mDoc; }

  // Whether we were connected.
  bool WasInComposedDoc() const { return mWasInComposedDoc; }

  // Whether we were in the document.
  bool WasInUncomposedDoc() const { return mWasInUncomposedDoc; }

  explicit UnbindContext(nsINode& aRoot, const BatchRemovalState* aBatchState)
      : mRoot(aRoot),
        mOriginalParent(aRoot.GetParentNode()),
        mDoc(*aRoot.OwnerDoc()),
        mBatchState(aBatchState),
        mWasInComposedDoc(aRoot.IsInComposedDoc()),
        mWasInUncomposedDoc(aRoot.IsInUncomposedDoc()) {}

  void SetIsMove(bool aIsMove) { mIsMove = aIsMove; }

  bool IsMove() const { return mIsMove; }

  const BatchRemovalState* GetBatchRemovalState() const { return mBatchState; }

 private:
  nsINode& mRoot;
  nsINode* const mOriginalParent;
  Document& mDoc;
  const BatchRemovalState* const mBatchState = nullptr;

  const bool mWasInComposedDoc;
  const bool mWasInUncomposedDoc;

  // If set, we're moving the shadow-including inclusive ancestor.
  bool mIsMove = false;
};

}  // namespace mozilla::dom

#endif
