/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_RangeBoundary_h
#define mozilla_RangeBoundary_h

#include <fmt/format.h>

#include "mozilla/Assertions.h"
#include "mozilla/Maybe.h"
#include "mozilla/StaticPrefs_dom.h"
#include "mozilla/ToString.h"
#include "mozilla/dom/HTMLSlotElement.h"
#include "mozilla/dom/ShadowRoot.h"
#include "nsCOMPtr.h"
#include "nsFmtString.h"
#include "nsIContent.h"

class nsRange;

namespace mozilla {
namespace dom {
class CrossShadowBoundaryRange;
}

template <typename T, typename U>
class EditorDOMPointBase;

// This class will maintain a reference to the child immediately
// before the boundary's offset. We try to avoid computing the
// offset as much as possible and just ensure mRef points to the
// correct child.
//
// mParent
//    |
// [child0] [child1] [child2]
//            /      |
//         mRef    mOffset=2
//
// If mOffset == 0, mRef is null.
// For text nodes, mRef will always be null and the offset will
// be kept up-to-date.
//
// One special case is when mTreeKind is TreeKind::Flat and
// mParent is slot and slot has assigned nodes, it'll use
// the assigned nodes to determine the reference with the
// same idea as above.
//
// Users of RangeBoundary should be extra careful about comparing
// range boundaries with different kinds, as it tends to lead to
// unexpected results.

template <typename ParentType, typename RefType>
class RangeBoundaryBase;

using RangeBoundary =
    RangeBoundaryBase<nsCOMPtr<nsINode>, nsCOMPtr<nsIContent>>;
using RawRangeBoundary = RangeBoundaryBase<nsINode*, nsIContent*>;
using ConstRawRangeBoundary =
    RangeBoundaryBase<const nsINode*, const nsIContent*>;

/**
 * There are two ways of ensuring that `mRef` points to the correct node.
 * In most cases, the `RangeBoundary` is used by an object that is a
 * `MutationObserver` (i.e. `nsRange`) and replaces its `RangeBoundary`
 * objects when its parent chain changes.
 * However, there are Ranges which are not `MutationObserver`s (i.e.
 * `StaticRange`). `mRef` may become invalid when a DOM mutation happens.
 * Therefore, it needs to be recomputed using `mOffset` before it is being
 * accessed.
 * Because recomputing / validating of `mRef` could be an expensive operation,
 * it should be ensured that `Ref()` is called as few times as possible, i.e.
 * only once per method of `RangeBoundaryBase`.
 *
 * Furthermore, there are special implications when the `RangeBoundary` is not
 * used by an `MutationObserver`:
 * After a DOM mutation, the Boundary may point to something that is not valid
 * anymore, i.e. the `mOffset` is larger than `Container()->Length()`. In this
 * case, `Ref()` and `Get*ChildAtOffset()` return `nullptr` as an indication
 * that this RangeBoundary is not valid anymore. Also, `IsSetAndValid()`
 * returns false. However, `IsSet()` will still return true.
 *
 */
enum class RangeBoundarySetBy : bool { Offset = false, Ref = true };

enum class RangeBoundaryFor {
  // Use Start if the boundary is start of a non-collapsed range.
  Start,
  // Use End if the boundary is end of a non-collapsed range.
  End,
  // Use Collapsed if the boundary is for collapsed range start/end.
  Collapsed,
};

// This class has two types of specializations, one using reference counting
// pointers and one using raw pointers (both non-const and const versions). The
// latter help us avoid unnecessary AddRef/Release calls.
template <typename ParentType, typename RefType>
class RangeBoundaryBase {
  template <typename T, typename U>
  friend class RangeBoundaryBase;
  template <typename T, typename U>
  friend class EditorDOMPointBase;

  friend nsRange;

  friend class mozilla::dom::CrossShadowBoundaryRange;

  friend void ImplCycleCollectionTraverse(nsCycleCollectionTraversalCallback&,
                                          RangeBoundary&, const char*,
                                          uint32_t);
  friend void ImplCycleCollectionUnlink(RangeBoundary&);

  static const uint32_t kFallbackOffset = 0;

  template <typename T, typename Enable = void>
  struct GetNodeType;
  template <typename T>
  struct GetNodeType<T, std::enable_if_t<std::is_pointer_v<T>>> {
    using type = std::remove_pointer_t<T>;
  };
  template <typename T>
  struct GetNodeType<T, std::enable_if_t<!std::is_pointer_v<T>>> {
    using type = typename T::element_type;
  };

 public:
  using RawParentType = typename GetNodeType<ParentType>::type;
  static_assert(std::is_same_v<RawParentType, nsINode> ||
                std::is_same_v<RawParentType, const nsINode>);
  using RawRefType = typename GetNodeType<RefType>::type;
  static_assert(std::is_same_v<RawRefType, nsIContent> ||
                std::is_same_v<RawRefType, const nsIContent>);

 private:
  /**
   * Make an instance from "ref" which is the previous sibling of what the
   * instance will point to.
   */
  [[nodiscard]] static RangeBoundaryBase FromRef(
      RawRefType& aRef, TreeKind aTreeKind = TreeKind::DOM) {
    nsINode* const parentNode = ComputeParentNode(&aRef, aTreeKind);
    if (MOZ_UNLIKELY(!parentNode)) {
      return RangeBoundaryBase(aTreeKind);
    }
    return RangeBoundaryBase(parentNode, &aRef, aTreeKind);
  }

 public:
  /**
   * Make an instance from a child node which the instance will point to.
   */
  [[nodiscard]] static RangeBoundaryBase FromChild(
      RawRefType& aChild, TreeKind aTreeKind = TreeKind::DOM) {
    nsINode* const parentNode = ComputeParentNode(&aChild, aTreeKind);
    if (MOZ_UNLIKELY(!parentNode)) {
      return RangeBoundaryBase(aTreeKind);
    }
    nsIContent* const ref = ComputeRef(parentNode, &aChild, aTreeKind);
    return RangeBoundaryBase(parentNode, ref, aTreeKind);
  }

  /**
   * Make an instance pointing after aChild.
   */
  [[nodiscard]] static RangeBoundaryBase After(
      RawRefType& aChild, TreeKind aTreeKind = TreeKind::DOM) {
    // If the caller wants a point after aChild, we can use aChild as the ref.
    return FromRef(aChild, aTreeKind);
  }

  /**
   * Make an instance which points to the start of aParent.
   */
  [[nodiscard]] static RangeBoundaryBase StartOfParent(
      RawParentType& aParent,
      RangeBoundarySetBy aPointTo = RangeBoundarySetBy::Ref,
      TreeKind aTreeKind = TreeKind::DOM) {
    if (MOZ_UNLIKELY(aParent.NodeType() == nsINode::DOCUMENT_TYPE_NODE)) {
      return RangeBoundaryBase(aTreeKind);
    }
    return RangeBoundaryBase(&aParent, nullptr, 0, aPointTo, aTreeKind);
  }

  /**
   * Make an instance which points to the end of aParent.
   */
  [[nodiscard]] static RangeBoundaryBase EndOfParent(
      RawParentType& aParent,
      RangeBoundarySetBy aSetBy = RangeBoundarySetBy::Ref,
      TreeKind aTreeKind = TreeKind::DOM) {
    if (MOZ_UNLIKELY(aParent.NodeType() == nsINode::DOCUMENT_TYPE_NODE)) {
      return RangeBoundaryBase(aTreeKind);
    }
    if (aSetBy == RangeBoundarySetBy::Ref && aParent.IsContainerNode()) {
      MOZ_ASSERT(!aParent.IsCharacterData());
      nsIContent* const lastChild = ComputeLastChild(&aParent, aTreeKind);
      return RangeBoundaryBase(&aParent, lastChild, aTreeKind);
    }
    const uint32_t length = ComputeLength(&aParent, aTreeKind);
    return RangeBoundaryBase(&aParent, length, aSetBy, aTreeKind);
  }

  RangeBoundaryBase(RawParentType* aContainer, RawRefType* aRef,
                    TreeKind aTreeKind = TreeKind::DOM)
      : mParent(aContainer),
        mRef(aRef),
        mSetBy(RangeBoundarySetBy::Ref),
        mTreeKind(aTreeKind) {
    MOZ_ASSERT(
        aTreeKind == TreeKind::DOM || aTreeKind == TreeKind::Flat,
        "Only TreeKind::DOM and TreeKind::Flat are valid at the moment.");
    if (mRef) {
      NS_WARNING_ASSERTION(
          IsValidParent(mParent, mRef),
          nsFmtCString(
              FMT_STRING(
                  "Constructing RangeBoundary with invalid value:\nthis={}"),
              *this)
              .get());
      MOZ_ASSERT(IsValidParent(mParent, mRef),
                 "Initializing RangeBoundary with invalid value");
    } else {
      mOffset.emplace(0);
    }
  }

  [[nodiscard]] static RangeBoundaryBase MakeIfValidRef(
      RawParentType* aContainer, RawRefType* aRef,
      TreeKind aTreeKind = TreeKind::DOM) {
    if (MOZ_UNLIKELY(!aContainer ||
                     aContainer->NodeType() == nsINode::DOCUMENT_TYPE_NODE ||
                     (aRef && !IsValidParent(aContainer, aRef, aTreeKind)))) {
      return RangeBoundaryBase(aTreeKind);
    }
    return RangeBoundaryBase(aContainer, aRef, aTreeKind);
  }

  RangeBoundaryBase(RawParentType* aContainer, uint32_t aOffset,
                    RangeBoundarySetBy aSetBy = RangeBoundarySetBy::Ref,
                    TreeKind aTreeKind = TreeKind::DOM)
      : mParent(aContainer),
        mRef(nullptr),
        mOffset(mozilla::Some(aOffset)),
        mSetBy(aSetBy),
        mTreeKind(aTreeKind) {
    MOZ_ASSERT(
        aTreeKind == TreeKind::DOM || aTreeKind == TreeKind::Flat,
        "Only TreeKind::DOM and TreeKind::Flat are valid at the moment.");
    if (IsSetByOffset()) {
      // If aPointTo is "Offset", this may be created for a StaticRange so that
      // we may not need to warn invalid boundary.
      return;
    }
    if (mParent && mParent->IsContainerNode()) {
      // Find a reference node
      if (aOffset == GetLength(mParent)) {
        mRef = GetLastChild(mParent);
      } else if (aOffset > 0) {
        mRef = GetChildAt(mParent, aOffset - 1);
      }
      NS_WARNING_ASSERTION(
          mRef || aOffset == 0,
          nsFmtCString(
              FMT_STRING(
                  "Constructing RangeBoundary with invalid value:\nthis={}"),
              *this)
              .get());
      MOZ_ASSERT(mRef || aOffset == 0);
      return;
    }
    NS_WARNING_ASSERTION(
        !mRef || IsValidParent(mParent, mRef),
        nsFmtCString(
            FMT_STRING(
                "Constructing RangeBoundary with invalid value:\nthis={}"),
            *this)
            .get());
    MOZ_ASSERT(!mRef || IsValidParent(mParent, mRef));
  }

  [[nodiscard]] static RangeBoundaryBase MakeIfValidOffset(
      RawParentType* aContainer, uint32_t aOffset,
      RangeBoundarySetBy aSetBy = RangeBoundarySetBy::Ref,
      TreeKind aTreeKind = TreeKind::DOM) {
    if (MOZ_UNLIKELY(!aContainer ||
                     aContainer->NodeType() == nsINode::DOCUMENT_TYPE_NODE ||
                     aOffset > ComputeLength(aContainer, aTreeKind))) {
      return RangeBoundaryBase(aTreeKind);
    }
    return RangeBoundaryBase(aContainer, aOffset, aSetBy, aTreeKind);
  }

  [[nodiscard]] TreeKind GetTreeKind() const { return mTreeKind; }

  RangeBoundaryBase AsRangeBoundaryInFlatTree(RangeBoundaryFor aFor) const {
    if (mTreeKind == TreeKind::Flat) {
      return *this;
    }
    MOZ_ASSERT(IsSet());
    if (!mParent->IsContainerNode()) {
      MOZ_ASSERT(mOffset);
      return RangeBoundaryBase(mParent, *mOffset, mSetBy, TreeKind::Flat);
    }
    enum class ChildKind : bool { ChildAtOffset, Ref };
    // The child node which we're pointing may have different parent node in the
    // flat tree.  E.g., the child node is slotted into a <slot>, the child node
    // is a child of ShadowRoot.  Therefore, we need to compute proper container
    // from the pointing child.
    const auto ComputeRangeBoundaryInFlatTreeFromChildNode =
        [&](RawRefType* aChild, ChildKind aChildKind) {
          RangeBoundaryBase ret = aChildKind == ChildKind::ChildAtOffset
                                      ? FromChild(*aChild, TreeKind::Flat)
                                      : FromRef(*aChild, TreeKind::Flat);
          if (MOZ_LIKELY(ret.IsSet())) {
            return ret;
          }
          // If we're pointing a node which won't appear in the flat tree, the
          // parent must be a shadow host.  Let's return start or end of the
          // shadow root.
          dom::ShadowRoot* const shadowRoot =
              mParent->GetShadowRootForSelection();
          MOZ_ASSERT(shadowRoot);
          MOZ_ASSERT(aChild->GetContainingShadow() != shadowRoot);
          // See nsContentUtils::ComparePointsWithIndices(), we treat the offset
          // of `ShadowRoot` as `0.5`.  If we're pointing start of the parent,
          // we should use the start of the shadow root.  Otherwise, we should
          // use the end of the shadow root.
          return IsStartOfContainer()
                     ? StartOfParent(*shadowRoot, mSetBy, TreeKind::Flat)
                     : EndOfParent(*shadowRoot, mSetBy, TreeKind::Flat);
        };
    // Each RangeBoundaryBase instance may have implicit "direction".  There are
    // following scenarios:
    // 1. Created for start boundary of a non-collapsed range
    // 2. Created for end boundary of a non-collapsed range
    // 3. Created for a collapsed range
    // 4. Created for the other purposes to point a child node or an offset.
    // In #1, the child node at the offset is what the setter focuses.
    // On the other hand, in #2 and #3, the previous sibling of the child node
    // at the offset is what the setter focus.  Unfortunately, a child node
    // and its previous sibling may keep the relation in the flat tree.
    // Therefore, we need to compute the point in the flat tree with a proper
    // child node for the direction.
    // In #4, the caller should consider how this instance should be treated as.
    if (aFor == RangeBoundaryFor::Start) {
      // If we're pointing a child node, return the point in the flat tree
      // parent of the child node at the offset because the setter wanted the
      // point at the offset.
      if (RawRefType* const child = GetChildAtOffset()) {
        return ComputeRangeBoundaryInFlatTreeFromChildNode(
            child, ChildKind::ChildAtOffset);
      }
      // Otherwise, we're pointing the end of the container in the DOM tree.
      // If there is a ref, we should use it because we can guess that the
      // setter wanted to point AFTER the last child rather than the end of the
      // container.
      if (RawRefType* const lastChild = Ref()) {
        return ComputeRangeBoundaryInFlatTreeFromChildNode(lastChild,
                                                           ChildKind::Ref);
      }
    } else {
      MOZ_ASSERT(aFor == RangeBoundaryFor::End ||
                 aFor == RangeBoundaryFor::Collapsed);
      // If we're for an end boundary of a range (or the boundary is for a
      // collapsed range) and we are not pointing the start of the container,
      // return the point in the flat tree parent of the ref because the setter
      // must have wanted the point AFTER the ref.
      if (RawRefType* const ref = Ref()) {
        return ComputeRangeBoundaryInFlatTreeFromChildNode(ref, ChildKind::Ref);
      }
      // Otherwise, we're pointing the start of the container in the DOM tree.
      // If there is the first child node, return the point in the flat tree
      // parent of the first child node because we can guess that the setter
      // wanted to point BEFORE the first child rather than the start of the
      // container.
      if (RawRefType* const child = GetChildAtOffset()) {
        return ComputeRangeBoundaryInFlatTreeFromChildNode(
            child, ChildKind::ChildAtOffset);
      }
    }
    // Otherwise, return the point in the empty parent.
    MOZ_ASSERT(!mParent->HasChildNodes());
    return EndOfParent(*mParent, mSetBy, TreeKind::Flat);
  }

  RangeBoundaryBase AsRangeBoundaryInDOMTree() const {
    if (mTreeKind == TreeKind::DOM) {
      return *this;
    }
    MOZ_ASSERT(IsSet());
    if (!mParent->IsContainerNode()) {
      MOZ_ASSERT(mOffset);
      return RangeBoundaryBase(mParent, *mOffset, mSetBy, TreeKind::DOM);
    }
    // If we're pointing a child node, let's recompute the point in the non-flat
    // tree from the child node.
    if (nsIContent* const child = GetChildAtOffset()) {
      return FromChild(*child, TreeKind::DOM);
    }
    // Otherwise, we're pointing the end of the container in the flat tree.
    // If the last children are assigned to a slot, let's return after the last
    // assigned node.
    if (nsIContent* const lastChild = GetLastChild(mParent)) {
      return FromRef(*lastChild, TreeKind::DOM);
    }
    // Okay, there is no child in mParent, let's return end of it.
    return EndOfParent(*mParent, mSetBy, TreeKind::DOM);
  }

  /**
   * Special constructor to create RangeBoundaryBase which stores both mRef
   * and mOffset.  This can make the instance provide both mRef and mOffset
   * without computation, but the creator needs to guarantee that this is
   * valid at least at construction.
   */
  RangeBoundaryBase(RawParentType* aContainer, RawRefType* aRef,
                    uint32_t aOffset,
                    RangeBoundarySetBy aSetBy = RangeBoundarySetBy::Ref,
                    TreeKind aTreeKind = TreeKind::DOM)
      : mParent(const_cast<nsINode*>(aContainer)),
        mRef(const_cast<nsIContent*>(aRef)),
        mOffset(mozilla::Some(aOffset)),
        mSetBy(aSetBy),
        mTreeKind(aTreeKind) {
    MOZ_ASSERT(IsSetAndValid());
  }

  explicit RangeBoundaryBase(TreeKind aTreeKind = TreeKind::DOM)
      : mParent(nullptr),
        mRef(nullptr),
        mSetBy(RangeBoundarySetBy::Ref),
        mTreeKind(aTreeKind) {}

  // Convert from RawRangeBoundary or RangeBoundary.
  template <typename PT, typename RT,
            typename = std::enable_if_t<!std::is_const_v<RawParentType> ||
                                        std::is_const_v<PT>>>
  RangeBoundaryBase(const RangeBoundaryBase<PT, RT>& aOther,
                    RangeBoundarySetBy aSetBy)
      : mParent(aOther.mParent),
        mRef(aOther.mRef),
        mOffset(aOther.mOffset),
        mSetBy(aSetBy),
        mTreeKind(aOther.mTreeKind) {}

  /**
   * This method may return `nullptr` in two cases:
   *  1. `mPointingToChildNode` is true and the boundary points to the first
   *      child of `mParent`.
   *  2. `mPointingToChildNode` is false and `mOffset` is out of bounds for
   *     `mParent`s child list.
   * If `mPointingToChildNode` is false, this method may do some significant
   * computation. Therefore it is advised to call it as seldom as possible.
   * Code inside of this class should call this method exactly one time and
   * afterwards refer to `mRef` directly.
   */
  RawRefType* Ref() const {
    if (IsSetByRef()) {
      return mRef;
    }
    MOZ_ASSERT(mParent);
    MOZ_ASSERT(mOffset);

    // `mRef` may have become invalid due to some DOM mutation,
    // which is not monitored here. Therefore, we need to validate `mRef`
    // manually.
    const uint32_t parentLength = GetLength(mParent);
    if (*mOffset > parentLength) {
      // offset > child count means that the range boundary has become invalid
      // due to a DOM mutation.
      mRef = nullptr;
    } else if (*mOffset == parentLength) {
      mRef = GetLastChild(mParent);
    } else if (*mOffset) {
      // validate and update `mRef`.
      // If `ComputeIndexOf()` returns `Nothing`, then `mRef` is not a child of
      // `mParent` anymore.
      // If the returned index for `mRef` does not match to `mOffset`, `mRef`
      // needs to be updated.
      const Maybe<uint32_t> indexOfRefObject =
          mRef ? ComputeIndexOf(mParent, mRef, mTreeKind) : Nothing();
      if (indexOfRefObject.isNothing() || *mOffset != *indexOfRefObject + 1) {
        mRef = GetChildAt(mParent, *mOffset - 1);
      }
    } else {
      mRef = nullptr;
    }
    return mRef;
  }

  RawParentType* GetContainer() const { return mParent; }

  dom::Document* GetComposedDoc() const {
    return mParent ? mParent->GetComposedDoc() : nullptr;
  }

  /**
   * This method may return `nullptr` if `mPointingToChildNode` is false and
   * `mOffset` is out of bounds.
   */
  RawRefType* GetChildAtOffset() const {
    if (!mParent || !mParent->IsContainerNode()) {
      return nullptr;
    }
    RawRefType* const ref = Ref();
    if (!ref) {
      if (!MaybeMutationObserved() && *mOffset != 0) {
        // This means that this boundary is invalid.
        // `mOffset` is out of bounds.
        return nullptr;
      }
      MOZ_ASSERT_IF(mTreeKind == TreeKind::DOM,
                    *Offset(OffsetFilter::kValidOrInvalidOffsets) == 0);
      NS_ASSERTION(
          *Offset(OffsetFilter::kValidOrInvalidOffsets) == 0,
          nsFmtCString(FMT_STRING("Invalid range boundary:\nthis=%{}"), *this)
              .get());
      return GetFirstChild(mParent);
    }
    NS_ASSERTION(
        GetChildAt(mParent, *Offset(OffsetFilter::kValidOrInvalidOffsets)) ==
            GetNextSibling(ref),
        nsFmtCString(
            "Invalid range "
            "boundary:\nthis={}\nGetChildAt()={}\nGetNextSibling(ref)={}\n",
            *this,
            ToString(
                RefPtr{GetChildAt(
                    mParent, *Offset(OffsetFilter::kValidOrInvalidOffsets))})
                .c_str(),
            ToString(RefPtr{GetNextSibling(ref)}).c_str())
            .get());
    return GetNextSibling(ref);
  }

  /**
   * GetNextSiblingOfChildOffset() returns next sibling of a child at offset.
   * If this refers after the last child or the container cannot have children,
   * this returns nullptr with warning.
   */
  RawRefType* GetNextSiblingOfChildAtOffset() const {
    if (NS_WARN_IF(!mParent) || NS_WARN_IF(!mParent->IsContainerNode())) {
      return nullptr;
    }
    RawRefType* const ref = Ref();
    if (!ref) {
      if (!MaybeMutationObserved() && *mOffset != 0) {
        // This means that this boundary is invalid.
        // `mOffset` is out of bounds.
        return nullptr;
      }
      MOZ_ASSERT(*Offset(OffsetFilter::kValidOffsets) == 0,
                 "invalid RangeBoundary");
      nsIContent* firstChild = GetFirstChild(mParent);
      if (!firstChild) {
        // Already referring the end of the container.
        return nullptr;
      }
      return GetNextSibling(firstChild);
    }
    if (!GetNextSibling(ref)) {
      // Already referring the end of the container.
      return nullptr;
    }
    return GetNextSibling(GetNextSibling(ref));
  }

  /**
   * GetPreviousSiblingOfChildAtOffset() returns previous sibling of a child
   * at offset.  If this refers the first child or the container cannot have
   * children, this returns nullptr with warning.
   */
  RawRefType* GetPreviousSiblingOfChildAtOffset() const {
    if (NS_WARN_IF(!mParent) || NS_WARN_IF(!mParent->IsContainerNode())) {
      return nullptr;
    }
    RawRefType* const ref = Ref();
    if (!ref) {
      // Already referring the start of the container.
      return nullptr;
    }
    return ref;
  }

  /**
   * Return true if this has already computed/set offset.
   */
  [[nodiscard]] bool HasOffset() const { return mOffset.isSome(); }

  enum class OffsetFilter { kValidOffsets, kValidOrInvalidOffsets };

  /**
   * @return maybe an offset, depending on aOffsetFilter. If it is:
   *         kValidOffsets: if the offset is valid, it, Nothing{} otherwise.
   *         kValidOrInvalidOffsets: the internally stored offset, even if
   *                                 invalid, or if not available, a defined
   *                                 default value. That is, always some value.
   */
  Maybe<uint32_t> Offset(const OffsetFilter aOffsetFilter) const {
    switch (aOffsetFilter) {
      case OffsetFilter::kValidOffsets: {
        if (IsSetAndValid()) {
          MOZ_ASSERT_IF(IsSetByOffset(), mOffset);
          if (!mOffset && IsSetByRef()) {
            DetermineOffsetFromReference();
          }
        }
        return IsSetByOffset() && *mOffset > GetLength(mParent) ? Nothing{}
                                                                : mOffset;
      }
      case OffsetFilter::kValidOrInvalidOffsets: {
        MOZ_ASSERT_IF(IsSetByOffset(), mOffset.isSome());
        if (mOffset.isSome()) {
          return mOffset;
        }
        if (mParent && IsSetByRef()) {
          DetermineOffsetFromReference();
          if (mOffset.isSome()) {
            return mOffset;
          }
        }

        return Some(kFallbackOffset);
      }
    }

    // Needed to calm the compiler. There was deliberately no default case added
    // to the above switch-statement, because it would prevent build-errors when
    // not all enumerators are handled.
    MOZ_ASSERT_UNREACHABLE();
    return Some(kFallbackOffset);
  }

  [[nodiscard]] static Maybe<uint32_t> ComputeIndexOf(const nsINode* aParent,
                                                      const nsIContent* aChild,
                                                      TreeKind aKind) {
    MOZ_ASSERT(aParent);
    MOZ_ASSERT(aChild);
    if (aKind == TreeKind::DOM) {
      return aParent->ComputeIndexOf(aChild);
    }
    // If aParent has a shadow root which is for <use> or a UI widget, we
    // shouldn't treat it as a shadow host.
    if (aParent->GetShadowRoot() && !aParent->GetShadowRootForSelection()) {
      return aParent->ComputeIndexOf(aChild);
    }
    return aParent->ComputeFlatTreeIndexOf(aChild);
  }

  friend std::ostream& operator<<(
      std::ostream& aStream,
      const RangeBoundaryBase<ParentType, RefType>& aRangeBoundary) {
    aStream << "{ mParent=" << aRangeBoundary.GetContainer();
    if (aRangeBoundary.GetContainer()) {
      aStream << " (" << *aRangeBoundary.GetContainer() << ", Length="
              << aRangeBoundary.GetLength(aRangeBoundary.GetContainer()) << ")";
    }
    if (aRangeBoundary.IsSetByRef()) {
      aStream << ", mRef=" << aRangeBoundary.mRef;
      if (aRangeBoundary.mRef) {
        aStream << " (" << *aRangeBoundary.mRef << ")";
      }
    }

    aStream << ", mOffset=" << aRangeBoundary.mOffset;
    aStream << ", mSetBy=" << (aRangeBoundary.IsSetByRef() ? "Ref" : "Offset");
    aStream << ", mTreeKind=" << aRangeBoundary.mTreeKind;
    aStream << " }";
    return aStream;
  }

  friend auto format_as(
      const RangeBoundaryBase<ParentType, RefType>& aRangeBoundary) {
    return ToString(aRangeBoundary);
  }

 private:
  void DetermineOffsetFromReference() const {
    MOZ_ASSERT(mParent);
    MOZ_ASSERT(mRef);
    MOZ_ASSERT(IsValidParent(mParent, mRef));
    MOZ_ASSERT(IsSetByRef());
    MOZ_ASSERT(mOffset.isNothing());

    if (mRef->IsBeingRemoved()) {
      // ComputeIndexOf would return nothing because mRef has already been
      // removed from the child node chain of mParent.
      return;
    }

    const Maybe<uint32_t> index = ComputeIndexOf(mParent, mRef, mTreeKind);
    NS_WARNING_ASSERTION(
        index.isSome(),
        nsFmtCString(
            FMT_STRING("mRef is not a child of mParent:\nthis={}\nmRef is in "
                       "shadow tree={}\n"),
            *this, YesOrNo(mRef && mRef->IsInShadowTree()))
            .get());
    MOZ_ASSERT(*index != UINT32_MAX);
    mOffset.emplace(MOZ_LIKELY(index.isSome()) ? *index + 1u : 0u);
  }

  // FIXME: HTMLSlotElement should have this as an API.
  static bool SlotElementIsForSelection(const dom::HTMLSlotElement& aSlot) {
    dom::ShadowRoot* const shadowRoot = aSlot.GetContainingShadow();
    if (MOZ_UNLIKELY(!shadowRoot)) {
      return true;  // XXX Correct?
    }
    if (shadowRoot->IsUAWidget()) {
      return false;  // <details>, <video>, etc.
    }
    dom::Element* const host = shadowRoot->GetHost();
    if (!host) {
      return true;
    }
    return host->CanAttachShadowDOM();  // Not an SVG <use>, etc.
  }

  // FIXME: nsINode should have this as an API.
  static const dom::HTMLSlotElement* GetAsSlotForSelection(
      const nsINode* aNode) {
    const dom::HTMLSlotElement* const slot =
        dom::HTMLSlotElement::FromNode(aNode);
    return slot && SlotElementIsForSelection(*slot) ? slot : nullptr;
  }

  RawRefType* GetNextSibling(const nsIContent* aCurrentNode) const {
    MOZ_ASSERT(mParent);
    MOZ_ASSERT(aCurrentNode);

    if (mTreeKind == TreeKind::Flat) {
      if (const auto* slot = GetAsSlotForSelection(mParent)) {
        const Span assigned = slot->AssignedNodes();
        if (!assigned.IsEmpty()) {
          const auto index = assigned.IndexOf(aCurrentNode);
          if (NS_WARN_IF(index == decltype(assigned)::npos)) {
            return nullptr;  // The node is not in the flat tree.
          }
          if (index + 1 < assigned.Length()) {
            return RawRefType::FromNode(assigned[index + 1]);
          }
          return nullptr;
        }
      }
    }
    return aCurrentNode->GetNextSibling();
  }

  [[nodiscard]] static nsIContent* ComputeRef(const nsINode* aParent,
                                              const nsIContent* aChild,
                                              TreeKind aKind) {
    MOZ_ASSERT(aParent);
    MOZ_ASSERT(aChild);
    MOZ_ASSERT(aParent == ComputeParentNode(aChild, aKind));
    if (aKind == TreeKind::Flat) {
      if (const auto* slot = GetAsSlotForSelection(aParent)) {
        const Span assigned = slot->AssignedNodes();
        if (!assigned.IsEmpty()) {
          const auto index = assigned.IndexOf(aChild);
          if (NS_WARN_IF(index == decltype(assigned)::npos)) {
            return nullptr;  // The node is not in the flat tree.
          }
          if (index) {
            return nsIContent::FromNode(assigned[index - 1]);
          }
          return nullptr;
        }
      }
    }
    nsIContent* const prevSibling = aChild->GetPreviousSibling();
    NS_ASSERTION(
        !prevSibling || aParent == ComputeParentNode(prevSibling, aKind),
        nsFmtCString(
            FMT_STRING("Invalid previous "
                       "sibling:\npreviousSibling={}\naChild={}\naParent={}"),
            ToString(RefPtr{prevSibling}).c_str(),
            ToString(RefPtr{aChild}).c_str(), ToString(RefPtr{aParent}).c_str())
            .get());
    return prevSibling;
  }

  RawRefType* GetFirstChild(const nsINode* aNode) const {
    MOZ_ASSERT(aNode);
    if (mTreeKind == TreeKind::Flat) {
      if (const auto* slot = GetAsSlotForSelection(aNode)) {
        const Span assigned = slot->AssignedNodes();
        if (!assigned.IsEmpty()) {
          if (RawRefType* child = RawRefType::FromNode(assigned[0])) {
            return child;
          }
          return nullptr;
        }
      }

      if (const auto* shadowRoot = aNode->GetShadowRootForSelection()) {
        return shadowRoot->GetFirstChild();
      }
    }
    return aNode->GetFirstChild();
  }

  [[nodiscard]] static nsINode* ComputeParentNode(const nsIContent* aChild,
                                                  TreeKind aKind) {
    MOZ_ASSERT(aChild);
    if (aKind == TreeKind::DOM) {
      return aChild->GetParentNode();
    }

    if (dom::HTMLSlotElement* const slot = aChild->GetAssignedSlot()) {
      if (SlotElementIsForSelection(*slot)) {
        return slot;
      }
    }

    nsINode* const parentNode = aChild->GetParentNode();
    if (!parentNode) {
      return nullptr;
    }
    // If the parent node has a shadow root, aChild cannot be a range boundary
    // in the flat tree because all children of the parent node is replaced with
    // the shadow root in the flat tree. So, it can appears in the flat tree
    // only when it's slotted.
    if (parentNode->GetShadowRootForSelection()) {
      return nullptr;
    }
    // If aChild is a child of a ShadowRoot which is for <use> or a UA widget,
    // we want to put it into the host because the ShadowRoot is a native one,
    // not visible from the web.
    if (const dom::ShadowRoot* const shadowRoot = parentNode->GetShadowRoot()) {
      return shadowRoot->GetHost();
    }
    // Don't use shadow host as parent node if aChild is a child of a
    // ShadowRoot even though we allow the relation in IsValidParent().
    // If we return the host, `Selection` will make wrong composed range.
    return parentNode;
  }

  [[nodiscard]] static bool IsValidParent(const nsINode* aParent,
                                          const nsIContent* aChild,
                                          TreeKind aKind) {
    MOZ_ASSERT(aParent);
    MOZ_ASSERT(aChild);
    if (aParent == ComputeParentNode(aChild, aKind)) {
      return true;
    }
    if (aKind == TreeKind::Flat) {
      // It's okay if aParent is a host of a shadow tree and aChild is a child
      // of the ShadowRoot.
      if (aParent->GetShadowRootForSelection() == aChild->GetParentNode()) {
        return true;
      }
    }
    return false;
  }

  [[nodiscard]] bool IsValidParent(const nsINode* aParent,
                                   const nsIContent* aChild) const {
    return IsValidParent(aParent, aChild, mTreeKind);
  }

  [[nodiscard]] static uint32_t ComputeLength(const nsINode* aNode,
                                              TreeKind aKind) {
    MOZ_ASSERT(aNode);
    if (aKind == TreeKind::Flat) {
      if (const auto* slot = GetAsSlotForSelection(aNode)) {
        const Span assigned = slot->AssignedNodes();
        if (!assigned.IsEmpty()) {
          return assigned.Length();
        }
      }

      if (const auto* shadowRoot = aNode->GetShadowRootForSelection()) {
        return shadowRoot->Length();
      }
    }
    return aNode->Length();
  }

  [[nodiscard]] uint32_t GetLength(const nsINode* aNode) const {
    return ComputeLength(aNode, mTreeKind);
  }

  RawRefType* GetChildAt(const nsINode* aParent, uint32_t aOffset) const {
    MOZ_ASSERT(aParent);
    if (mTreeKind == TreeKind::DOM) {
      return aParent->GetChildAt_Deprecated(aOffset);
    }
    if (aParent->GetShadowRoot() && !aParent->GetShadowRootForSelection()) {
      return aParent->GetChildAt_Deprecated(aOffset);
    }
    return nsIContent::FromNodeOrNull(aParent->GetChildAtInFlatTree(aOffset));
  }

  [[nodiscard]] static nsIContent* ComputeLastChild(const nsINode* aParent,
                                                    TreeKind aKind) {
    MOZ_ASSERT(aParent);
    if (aKind == TreeKind::Flat) {
      if (const auto* slot = GetAsSlotForSelection(aParent)) {
        const Span assigned = slot->AssignedNodes();
        if (!assigned.IsEmpty()) {
          return RawRefType::FromNode(assigned[assigned.Length() - 1]);
        }
      }
      if (const auto* shadowRoot = aParent->GetShadowRootForSelection()) {
        return shadowRoot->GetLastChild();
      }
    }
    return aParent->GetLastChild();
  }

  [[nodiscard]] nsIContent* GetLastChild(const nsINode* aParent) const {
    return ComputeLastChild(aParent, mTreeKind);
  }

  void InvalidateOffset() {
    MOZ_ASSERT(mParent);
    MOZ_ASSERT(mParent->IsContainerNode(),
               "Range is positioned on a text node!");
    if (IsSetByOffset()) {
      // RangeBoundaries that are not used in the context of a
      // `MutationObserver` use the offset as main source of truth to compute
      // `mRef`. Therefore, it must not be updated or invalidated.
      return;
    }
    if (!mRef) {
      MOZ_ASSERT(mOffset.isSome() && mOffset.value() == 0,
                 "Invalidating offset of invalid RangeBoundary?");
      return;
    }
    mOffset.reset();
  }

 public:
  void NotifyParentBecomesShadowHost() {
    MOZ_ASSERT(mParent);
    MOZ_ASSERT(mParent->IsContainerNode(),
               "Range is positioned on a text node!");
    if (!StaticPrefs::dom_shadowdom_selection_across_boundary_enabled()) {
      return;
    }

    if (!MaybeMutationObserved()) {
      // RangeBoundaries that are not used in the context of a
      // `MutationObserver` use the offset as main source of truth to compute
      // `mRef`. Therefore, it must not be updated or invalidated.
      return;
    }

    if (!mRef) {
      MOZ_ASSERT(mOffset.isSome() && mOffset.value() == 0,
                 "Invalidating offset of invalid RangeBoundary?");
      return;
    }

    if (dom::ShadowRoot* shadowRoot = mParent->GetShadowRootForSelection()) {
      mParent = shadowRoot;
    }

    mOffset = Some(0);
  }

  bool IsSet() const { return mParent && (mRef || mOffset.isSome()); }

  [[nodiscard]] bool IsSetAndInComposedDoc() const {
    return IsSet() && mParent->IsInComposedDoc();
  }

  bool IsSetAndValid() const {
    if (!IsSet() ||
        MOZ_UNLIKELY(mParent->NodeType() == nsINode::DOCUMENT_TYPE_NODE)) {
      return false;
    }

    if (IsSetByRef() && Ref()) {
      // XXX mRef refers previous sibling of pointing child.  Therefore, it
      //     seems odd that this becomes invalid due to its removal.  Should we
      //     change RangeBoundaryBase to refer child at offset directly?
      return IsValidParent(GetContainer(), Ref()) && !Ref()->IsBeingRemoved();
    }

    MOZ_ASSERT(mOffset.isSome());
    return *mOffset <= GetContainer()->Length();
  }

  bool IsStartOfContainer() const {
    // We're at the first point in the container if we don't have a reference,
    // and our offset is 0. If we don't have a Ref, we should already have an
    // offset, so we can just directly fetch it.
    return IsSetByRef() ? !Ref() && mOffset.value() == 0 : mOffset.value() == 0;
  }

  bool IsEndOfContainer() const {
    // We're at the last point in the container if Ref is a pointer to the last
    // child in GetContainer(), or our Offset() is the same as the length of our
    // container. If we don't have a Ref, then we should already have an offset,
    // so we can just directly fetch it.
    return IsSetByRef() && Ref() ? !GetNextSibling(Ref())
                                 : mOffset.value() == GetLength(mParent);
  }

  // Convenience methods for switching between the two types
  // of RangeBoundary.
  template <typename PT = RawParentType,
            typename = std::enable_if_t<!std::is_const_v<PT>>>
  RawRangeBoundary AsRaw() const {
    return RawRangeBoundary(*this, mSetBy);
  }
  ConstRawRangeBoundary AsConstRaw() const {
    return ConstRawRangeBoundary(*this, mSetBy);
  }

  RangeBoundaryBase& operator=(const RangeBoundaryBase& aOther) {
    MOZ_ASSERT(mTreeKind == aOther.mTreeKind);
    if (this != &aOther) {
      mParent = aOther.mParent;
      mRef = aOther.mRef;
      mOffset = aOther.mOffset;
      mSetBy = aOther.mSetBy;
    }
    return *this;
  }

  template <
      typename PT, typename RT, typename RPT = RawParentType,
      typename = std::enable_if_t<!std::is_const_v<PT> || std::is_const_v<RPT>>>
  RangeBoundaryBase& CopyFrom(const RangeBoundaryBase<PT, RT>& aOther,
                              RangeBoundarySetBy aSetBy) {
    MOZ_ASSERT(mTreeKind == aOther.mTreeKind);
    // mParent and mRef can be strong pointers, so better to try to avoid any
    // extra AddRef/Release calls.
    if (mParent != aOther.mParent) {
      mParent = aOther.mParent;
    }
    if (mRef != aOther.mRef) {
      mRef = aOther.mRef;
    }

    mSetBy = aSetBy;
    if (IsSetByOffset() && aOther.mOffset.isNothing()) {
      // "Fix" the offset from mRef if and only if we won't be updated for
      // further mutations and aOther has not computed the offset of its mRef.
      // XXX What should we do if aOther is not updated for mutations and
      // mOffset has already been invalid?
      mOffset = aOther.Offset(
          RangeBoundaryBase<PT, RT>::OffsetFilter::kValidOrInvalidOffsets);
      MOZ_DIAGNOSTIC_ASSERT(mOffset.isSome());
    } else {
      mOffset = aOther.mOffset;
    }
    // If the mutation will be observed but the other does not have proper
    // mRef for its mOffset, we need to compute mRef like the constructor
    // which takes aOffset.
    if (IsSetByRef() && !mRef && mParent && mOffset.isSome() && *mOffset) {
      if (*mOffset == mParent->GetChildCount()) {
        mRef = GetLastChild(mParent);
      } else {
        mRef = GetChildAt(mParent, *mOffset - 1);
      }
    }
    return *this;
  }

  bool Equals(const RawParentType* aNode, uint32_t aOffset) const {
    if (mParent != aNode) {
      return false;
    }

    const Maybe<uint32_t> offset = Offset(OffsetFilter::kValidOffsets);
    return offset && (*offset == aOffset);
  }

  template <typename A, typename B>
  [[nodiscard]] bool operator==(const RangeBoundaryBase<A, B>& aOther) const {
    if (!mParent && !aOther.mParent) {
      return true;
    }
    if (mParent != aOther.mParent) {
      return false;
    }
    if (RefIsFixed() && aOther.RefIsFixed()) {
      return mRef == aOther.mRef;
    }

    if (mTreeKind != aOther.mTreeKind) {
      return false;
    }

    return Offset(OffsetFilter::kValidOrInvalidOffsets) ==
           aOther.Offset(
               RangeBoundaryBase<A, B>::OffsetFilter::kValidOrInvalidOffsets);
  }

  template <typename A, typename B>
  bool operator!=(const RangeBoundaryBase<A, B>& aOther) const {
    return !(*this == aOther);
  }

 private:
  [[nodiscard]] bool RefIsFixed() const {
    return mParent &&
           (
               // If mutation is observed, mRef is the base of mOffset unless
               // it's not a container node like `Text` node.
               (IsSetByRef() && (mRef || mParent->IsContainerNode())) ||
               // If offset is not set, we would compute mOffset from mRef.
               // So, mRef is "fixed" for now.
               mOffset.isNothing());
  }

  [[nodiscard]] bool IsSetByOffset() const {
    return !static_cast<bool>(mSetBy);
  }
  [[nodiscard]] bool IsSetByRef() const { return static_cast<bool>(mSetBy); }

  /**
   * If nsRange stores mutations for RangeBoundary instances, mSetBy is always
   * "Ref".  However, it's the default behavior of RangeBoundaryBase so that
   * even if this returns true, the mutations may not be observed actually.
   */
  [[nodiscard]] bool MaybeMutationObserved() const { return IsSetByRef(); }

  ParentType mParent;
  mutable RefType mRef;

  mutable mozilla::Maybe<uint32_t> mOffset;
  RangeBoundarySetBy mSetBy;
  const TreeKind mTreeKind;
};

template <typename ParentType, typename RefType>
const uint32_t RangeBoundaryBase<ParentType, RefType>::kFallbackOffset;

inline void ImplCycleCollectionUnlink(RangeBoundary& aField) {
  ImplCycleCollectionUnlink(aField.mParent);
  ImplCycleCollectionUnlink(aField.mRef);
}

inline void ImplCycleCollectionTraverse(
    nsCycleCollectionTraversalCallback& aCallback, RangeBoundary& aField,
    const char* aName, uint32_t aFlags) {
  ImplCycleCollectionTraverse(aCallback, aField.mParent, "mParent", 0);
  ImplCycleCollectionTraverse(aCallback, aField.mRef, "mRef", 0);
}

}  // namespace mozilla

#endif  // defined(mozilla_RangeBoundary_h)
