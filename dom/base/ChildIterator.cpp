/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ChildIterator.h"

#include "mozilla/dom/Document.h"
#include "mozilla/dom/HTMLSlotElement.h"
#include "mozilla/dom/ShadowRoot.h"
#include "nsContentUtils.h"
#include "nsIAnonymousContentCreator.h"
#include "nsIFrame.h"
#include "nsLayoutUtils.h"

namespace mozilla::dom {

FlattenedChildIterator::FlattenedChildIterator(const nsIContent* aParent,
                                               bool aStartAtBeginning)
    : mParent(aParent), mOriginalParent(aParent), mIsFirst(aStartAtBeginning) {
  if (!mParent->IsElement()) {
    // TODO(emilio): I think it probably makes sense to only allow constructing
    // FlattenedChildIterators with Element.
    return;
  }

  if (ShadowRoot* shadow = mParent->AsElement()->GetShadowRoot()) {
    mParent = shadow;
    mShadowDOMInvolved = true;
    return;
  }

  if (const auto* slot = HTMLSlotElement::FromNode(mParent)) {
    if (!slot->AssignedNodes().IsEmpty()) {
      mParentAsSlot = slot;
      if (!aStartAtBeginning) {
        mIndexInInserted = slot->AssignedNodes().Length();
      }
      mShadowDOMInvolved = true;
    }
  }
}

uint32_t FlattenedChildIterator::GetLength(const nsINode* aParent) {
  if (const auto* element = Element::FromNode(aParent)) {
    if (const auto* slot = HTMLSlotElement::FromNode(element)) {
      if (uint32_t len = slot->AssignedNodes().Length()) {
        return len;
      }
    } else if (auto* shadowRoot = element->GetShadowRoot()) {
      return shadowRoot->GetChildCount();
    }
  }
  return aParent->GetChildCount();
}

Maybe<uint32_t> FlattenedChildIterator::GetIndexOf(
    const nsINode* aParent, const nsINode* aPossibleChild) {
  if (const auto* element = Element::FromNode(aParent)) {
    if (const auto* slot = HTMLSlotElement::FromNode(element)) {
      const Span assigned = slot->AssignedNodes();
      if (!assigned.IsEmpty()) {
        auto index = assigned.IndexOf(aPossibleChild);
        if (index == assigned.npos) {
          return Nothing();
        }
        return Some(index);
      }
    } else if (auto* shadowRoot = element->GetShadowRoot()) {
      return shadowRoot->ComputeIndexOf(aPossibleChild);
    }
  }
  return aParent->ComputeIndexOf(aPossibleChild);
}

nsIContent* FlattenedChildIterator::GetNextChild() {
  // If we're already in the inserted-children array, look there first
  if (mParentAsSlot) {
    const Span assignedNodes = mParentAsSlot->AssignedNodes();
    if (mIsFirst) {
      mIsFirst = false;
      MOZ_ASSERT(mIndexInInserted == 0);
      mChild = assignedNodes[0]->AsContent();
      return mChild;
    }
    MOZ_ASSERT(mIndexInInserted <= assignedNodes.Length());
    if (mIndexInInserted + 1 >= assignedNodes.Length()) {
      mIndexInInserted = assignedNodes.Length();
      return nullptr;
    }
    mChild = assignedNodes[++mIndexInInserted]->AsContent();
    return mChild;
  }

  if (mIsFirst) {  // at the beginning of the child list
    mChild = mParent->GetFirstChild();
    mIsFirst = false;
  } else if (mChild) {  // in the middle of the child list
    mChild = mChild->GetNextSibling();
  }

  return mChild;
}

bool FlattenedChildIterator::Seek(const nsIContent* aChildToFind) {
  if (!mParentAsSlot && aChildToFind->GetParent() == mParent &&
      !aChildToFind->IsRootOfNativeAnonymousSubtree()) {
    // Fast path: just point ourselves to aChildToFind, which is a
    // normal DOM child of ours.
    mChild = const_cast<nsIContent*>(aChildToFind);
    mIndexInInserted = 0;
    mIsFirst = false;
    return true;
  }

  // Can we add more fast paths here based on whether the parent of aChildToFind
  // is a This version can take shortcuts that the two-argument version
  // can't, so can be faster (and in fact cshadow insertion point or content
  // insertion point?

  // It would be nice to assert that we find aChildToFind, but bz thinks that
  // we might not find aChildToFind when called from ContentInserted
  // if first-letter frames are about.
  while (nsIContent* child = GetNextChild()) {
    if (child == aChildToFind) {
      return true;
    }
  }

  return false;
}

nsIContent* FlattenedChildIterator::GetPreviousChild() {
  if (mIsFirst) {  // at the beginning of the child list
    return nullptr;
  }
  if (mParentAsSlot) {
    const Span assignedNodes = mParentAsSlot->AssignedNodes();
    MOZ_ASSERT(mIndexInInserted <= assignedNodes.Length());
    if (mIndexInInserted == 0) {
      mIsFirst = true;
      return nullptr;
    }
    mChild = assignedNodes[--mIndexInInserted]->AsContent();
    return mChild;
  }
  if (mChild) {  // in the middle of the child list
    mChild = mChild->GetPreviousSibling();
  } else {  // at the end of the child list
    mChild = mParent->GetLastChild();
  }
  if (!mChild) {
    mIsFirst = true;
  }

  return mChild;
}

nsIContent* AllChildrenIterator::Get() const {
  switch (mPhase) {
    case Phase::AtBackdropKid: {
      Element* backdrop = nsLayoutUtils::GetBackdropPseudo(Parent());
      MOZ_ASSERT(backdrop, "No content marker frame at AtBackdropKid phase");
      return backdrop;
    }

    case Phase::AtMarkerKid: {
      Element* marker = nsLayoutUtils::GetMarkerPseudo(Parent());
      MOZ_ASSERT(marker, "No content marker frame at AtMarkerKid phase");
      return marker;
    }

    case Phase::AtBeforeKid: {
      Element* before = nsLayoutUtils::GetBeforePseudo(Parent());
      MOZ_ASSERT(before, "No content before frame at AtBeforeKid phase");
      return before;
    }

    case Phase::AtFlatTreeKids:
      return FlattenedChildIterator::Get();

    case Phase::AtAnonKids:
      return mAnonKids[mAnonKidsIdx];

    case Phase::AtAfterKid: {
      Element* after = nsLayoutUtils::GetAfterPseudo(Parent());
      MOZ_ASSERT(after, "No content after frame at AtAfterKid phase");
      return after;
    }

    default:
      return nullptr;
  }
}

bool AllChildrenIterator::Seek(const nsIContent* aChildToFind) {
  while (mPhase != Phase::AtEnd) {
    if (mPhase == Phase::AtFlatTreeKids) {
      if (FlattenedChildIterator::Seek(aChildToFind)) {
        return true;
      }
      mPhase = Phase::AtAnonKids;
    }
    if (GetNextChild() == aChildToFind) {
      return true;
    }
  }
  return false;
}

void AllChildrenIterator::AppendNativeAnonymousChildren() {
  nsContentUtils::AppendNativeAnonymousChildren(Parent(), mAnonKids, mFlags);
}

nsIContent* AllChildrenIterator::GetNextChild() {
  switch (mPhase) {
    case Phase::AtBegin:
      if (Element* backdropPseudo =
              nsLayoutUtils::GetBackdropPseudo(Parent())) {
        mPhase = Phase::AtBackdropKid;
        return backdropPseudo;
      }
      [[fallthrough]];
    case Phase::AtBackdropKid:
      if (Element* markerContent = nsLayoutUtils::GetMarkerPseudo(Parent())) {
        mPhase = Phase::AtMarkerKid;
        return markerContent;
      }
      [[fallthrough]];
    case Phase::AtMarkerKid:
      if (Element* beforeContent = nsLayoutUtils::GetBeforePseudo(Parent())) {
        mPhase = Phase::AtBeforeKid;
        return beforeContent;
      }
      [[fallthrough]];
    case Phase::AtBeforeKid:
      [[fallthrough]];
    case Phase::AtFlatTreeKids:
      if (nsIContent* kid = FlattenedChildIterator::GetNextChild()) {
        mPhase = Phase::AtFlatTreeKids;
        return kid;
      }
      [[fallthrough]];
    case Phase::AtAnonKids:
      if (mAnonKids.IsEmpty()) {
        MOZ_ASSERT(mAnonKidsIdx == UINT32_MAX);
        AppendNativeAnonymousChildren();
        mAnonKidsIdx = 0;
      } else if (mAnonKidsIdx == UINT32_MAX) {
        mAnonKidsIdx = 0;
      } else {
        mAnonKidsIdx++;
      }
      if (mAnonKidsIdx < mAnonKids.Length()) {
        mPhase = Phase::AtAnonKids;
        return mAnonKids[mAnonKidsIdx];
      }
      if (Element* afterContent = nsLayoutUtils::GetAfterPseudo(Parent())) {
        mPhase = Phase::AtAfterKid;
        return afterContent;
      }
      [[fallthrough]];
    case Phase::AtAfterKid:
    case Phase::AtEnd:
      break;
  }

  mPhase = Phase::AtEnd;
  return nullptr;
}

nsIContent* AllChildrenIterator::GetPreviousChild() {
  switch (mPhase) {
    case Phase::AtEnd:
      if (Element* afterContent = nsLayoutUtils::GetAfterPseudo(Parent())) {
        mPhase = Phase::AtAfterKid;
        return afterContent;
      }
      [[fallthrough]];
    case Phase::AtAfterKid:
      MOZ_ASSERT(mAnonKidsIdx == mAnonKids.Length());
      [[fallthrough]];
    case Phase::AtAnonKids:
      if (mAnonKids.IsEmpty()) {
        AppendNativeAnonymousChildren();
        mAnonKidsIdx = mAnonKids.Length();
      }
      // If 0 then it turns into UINT32_MAX, which indicates the iterator is
      // before the anonymous children.
      --mAnonKidsIdx;
      if (mAnonKidsIdx < mAnonKids.Length()) {
        mPhase = Phase::AtAnonKids;
        return mAnonKids[mAnonKidsIdx];
      }
      [[fallthrough]];
    case Phase::AtFlatTreeKids:
      if (nsIContent* kid = FlattenedChildIterator::GetPreviousChild()) {
        mPhase = Phase::AtFlatTreeKids;
        return kid;
      }
      if (Element* beforeContent = nsLayoutUtils::GetBeforePseudo(Parent())) {
        mPhase = Phase::AtBeforeKid;
        return beforeContent;
      }
      [[fallthrough]];
    case Phase::AtBeforeKid:
      if (Element* markerContent = nsLayoutUtils::GetMarkerPseudo(Parent())) {
        mPhase = Phase::AtMarkerKid;
        return markerContent;
      }
      [[fallthrough]];
    case Phase::AtMarkerKid:
      if (Element* backdrop = nsLayoutUtils::GetBackdropPseudo(Parent())) {
        mPhase = Phase::AtBackdropKid;
        return backdrop;
      }
      [[fallthrough]];
    case Phase::AtBackdropKid:
    case Phase::AtBegin:
      break;
  }

  mPhase = Phase::AtBegin;
  return nullptr;
}

}  // namespace mozilla::dom
