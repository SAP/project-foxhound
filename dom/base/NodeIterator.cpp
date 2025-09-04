/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Implementation of DOM Traversal's NodeIterator
 */

#include "mozilla/dom/NodeIterator.h"

#include "nsError.h"

#include "nsIContent.h"
#include "mozilla/dom/Document.h"
#include "nsContentUtils.h"
#include "nsCOMPtr.h"
#include "mozilla/dom/NodeFilterBinding.h"
#include "mozilla/dom/NodeIteratorBinding.h"

namespace mozilla::dom {

/*
 * NodePointer implementation
 */
NodeIterator::NodePointer::NodePointer(nsINode* aNode, bool aBeforeNode)
    : mNode(aNode), mBeforeNode(aBeforeNode) {}

bool NodeIterator::NodePointer::MoveToNext(nsINode* aRoot) {
  if (!mNode) return false;

  if (mBeforeNode) {
    mBeforeNode = false;
    return true;
  }

  nsINode* child = mNode->GetFirstChild();
  if (child) {
    mNode = child;
    return true;
  }

  return MoveForward(aRoot, mNode);
}

bool NodeIterator::NodePointer::MoveToPrevious(nsINode* aRoot) {
  if (!mNode) return false;

  if (!mBeforeNode) {
    mBeforeNode = true;
    return true;
  }

  if (mNode == aRoot) {
    return false;
  }

  MoveBackward(mNode->GetParentNode(), mNode->GetPreviousSibling());

  return true;
}

void NodeIterator::NodePointer::AdjustForRemoval(nsINode* aRoot,
                                                 nsINode* aContainer,
                                                 nsIContent* aChild) {
  // If mNode is null or the root there is nothing to do.
  if (!mNode || mNode == aRoot) {
    return;
  }

  // check if ancestor was removed
  if (!mNode->IsInclusiveDescendantOf(aChild)) {
    return;
  }

  if (mBeforeNode) {
    // Try the next sibling
    nsINode* nextSibling = aChild->GetNextSibling();
    if (nextSibling) {
      mNode = nextSibling;
      return;
    }

    // Next try siblings of ancestors
    if (MoveForward(aRoot, aContainer)) {
      return;
    }

    // No suitable node was found so try going backwards
    mBeforeNode = false;
  }

  MoveBackward(aContainer, aChild->GetPreviousSibling());
}

bool NodeIterator::NodePointer::MoveForward(nsINode* aRoot, nsINode* aNode) {
  while (1) {
    if (aNode == aRoot) break;

    nsINode* sibling = aNode->GetNextSibling();
    if (sibling) {
      mNode = sibling;
      return true;
    }
    aNode = aNode->GetParentNode();
  }

  return false;
}

void NodeIterator::NodePointer::MoveBackward(nsINode* aParent, nsINode* aNode) {
  if (aNode) {
    do {
      mNode = aNode;
      aNode = aNode->GetLastChild();
    } while (aNode);
  } else {
    mNode = aParent;
  }
}

/*
 * Factories, constructors and destructors
 */

NodeIterator::NodeIterator(nsINode* aRoot, uint32_t aWhatToShow,
                           NodeFilter* aFilter)
    : nsTraversal(aRoot, aWhatToShow, aFilter), mPointer(mRoot, true) {
  aRoot->AddMutationObserver(this);
}

NodeIterator::~NodeIterator() {
  /* destructor code */
  if (mRoot) mRoot->RemoveMutationObserver(this);
}

/*
 * nsISupports and cycle collection stuff
 */

NS_IMPL_CYCLE_COLLECTION_CLASS(NodeIterator)

NS_IMPL_CYCLE_COLLECTION_UNLINK_BEGIN(NodeIterator)
  if (tmp->mRoot) tmp->mRoot->RemoveMutationObserver(tmp);
  NS_IMPL_CYCLE_COLLECTION_UNLINK(mRoot)
  NS_IMPL_CYCLE_COLLECTION_UNLINK(mFilter)
NS_IMPL_CYCLE_COLLECTION_UNLINK_END
NS_IMPL_CYCLE_COLLECTION_TRAVERSE_BEGIN(NodeIterator)
  NS_IMPL_CYCLE_COLLECTION_TRAVERSE(mRoot)
  NS_IMPL_CYCLE_COLLECTION_TRAVERSE(mFilter)
NS_IMPL_CYCLE_COLLECTION_TRAVERSE_END

// QueryInterface implementation for NodeIterator
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(NodeIterator)
  NS_INTERFACE_MAP_ENTRY(nsIMutationObserver)
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END

NS_IMPL_CYCLE_COLLECTING_ADDREF(NodeIterator)
NS_IMPL_CYCLE_COLLECTING_RELEASE(NodeIterator)

already_AddRefed<nsINode> NodeIterator::NextOrPrevNode(
    NodePointer::MoveToMethodType aMove, ErrorResult& aResult) {
  if (mInAcceptNode) {
    aResult.Throw(NS_ERROR_DOM_INVALID_STATE_ERR);
    return nullptr;
  }

  mWorkingPointer = mPointer;

  struct AutoClear {
    NodePointer* mPtr;
    explicit AutoClear(NodePointer* ptr) : mPtr(ptr) {}
    ~AutoClear() { mPtr->Clear(); }
  } ac(&mWorkingPointer);

  while ((mWorkingPointer.*aMove)(mRoot)) {
    nsCOMPtr<nsINode> testNode;
    int16_t filtered = TestNode(mWorkingPointer.mNode, aResult, &testNode);
    if (aResult.Failed()) {
      return nullptr;
    }

    if (filtered == NodeFilter_Binding::FILTER_ACCEPT) {
      mPointer = mWorkingPointer;
      return testNode.forget();
    }
  }

  return nullptr;
}

void NodeIterator::Detach() {
  if (mRoot) {
    mRoot->OwnerDoc()->WarnOnceAbout(DeprecatedOperations::eNodeIteratorDetach);
  }
}

/*
 * nsIMutationObserver interface
 */

void NodeIterator::ContentWillBeRemoved(nsIContent* aChild,
                                        const BatchRemovalState*) {
  nsINode* container = aChild->GetParentNode();
  mPointer.AdjustForRemoval(mRoot, container, aChild);
  mWorkingPointer.AdjustForRemoval(mRoot, container, aChild);
}

bool NodeIterator::WrapObject(JSContext* cx, JS::Handle<JSObject*> aGivenProto,
                              JS::MutableHandle<JSObject*> aReflector) {
  return NodeIterator_Binding::Wrap(cx, this, aGivenProto, aReflector);
}

}  // namespace mozilla::dom
