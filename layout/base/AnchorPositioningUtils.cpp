/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "AnchorPositioningUtils.h"

#include "DisplayPortUtils.h"
#include "ScrollContainerFrame.h"
#include "mozilla/Maybe.h"
#include "mozilla/OverflowChangedTracker.h"
#include "mozilla/PresShell.h"
#include "mozilla/StaticPrefs_apz.h"
#include "mozilla/dom/DOMIntersectionObserver.h"
#include "mozilla/dom/Document.h"
#include "mozilla/dom/Element.h"
#include "nsCanvasFrame.h"
#include "nsContainerFrame.h"
#include "nsDisplayList.h"
#include "nsIContent.h"
#include "nsIFrame.h"
#include "nsIFrameInlines.h"
#include "nsINode.h"
#include "nsLayoutUtils.h"
#include "nsPlaceholderFrame.h"
#include "nsStyleStruct.h"
#include "nsTArray.h"

namespace mozilla {

namespace {

bool IsScrolled(const nsIFrame* aFrame) {
  switch (aFrame->Style()->GetPseudoType()) {
    case PseudoStyleType::MozScrolledContent:
    case PseudoStyleType::MozScrolledCanvas:
      return true;
    default:
      return false;
  }
}

dom::ShadowRoot* GetTreeForCascadeLevel(const nsIContent& aContent,
                                        int8_t aCascadeOrder) {
  if (aCascadeOrder < 0) {
    // First, walk through the slot chain for ::slotted() rules
    auto* slot = aContent.GetAssignedSlot();
    while (slot) {
      ++aCascadeOrder;
      if (aCascadeOrder == 0) {
        return slot->GetContainingShadow();
      }
      slot = slot->GetAssignedSlot();
    }
    // If cascadeOrder is still -1 after processing all slots, this is a :host
    // rule The element receiving the style is the shadow host, and we need to
    // return the shadow root attached to this element (where the :host rule is
    // defined)
    const int8_t for_outermost_shadow_tree = -1;
    if (aCascadeOrder != for_outermost_shadow_tree) {
      return nullptr;
    }

    // For tree-like pseudo-elements (::before, ::after, ::marker), aContent
    // is a generated content node. We need to get the parent (the originating
    // element) to find the shadow root where the :host rule is defined.
    if (aContent.IsGeneratedContentContainerForAfter() ||
        aContent.IsGeneratedContentContainerForBefore() ||
        aContent.IsGeneratedContentContainerForMarker()) {
      if (const auto* parent = aContent.GetParent()) {
        return parent->GetShadowRoot();
      }
    }

    return aContent.GetShadowRoot();
  }

  auto* containingShadow = aContent.GetContainingShadow();
  while (containingShadow) {
    if (aCascadeOrder == 0) {
      return containingShadow;
    }
    --aCascadeOrder;
    // Walk up through the shadow host to get to the containing tree
    const auto* host = containingShadow->GetHost();
    if (!host) {
      break;
    }
    containingShadow = host->GetContainingShadow();
  }

  return containingShadow;
}

// Helper to extract shadow_cascade_order from a TreeScope
int8_t GetShadowCascadeOrder(const StyleCascadeLevel& aScope) {
  if (aScope.IsAuthorNormal()) {
    return aScope.AsAuthorNormal().shadow_cascade_order;
  }
  if (aScope.IsAuthorImportant()) {
    return aScope.AsAuthorImportant().shadow_cascade_order;
  }
  return 0;
}

// Helper to get shadow root for a property's tree scope
dom::ShadowRoot* GetShadowRootForTreeScope(
    const nsIContent& aContent, const StyleCascadeLevel& aTreeScope) {
  const int8_t cascadeOrder = GetShadowCascadeOrder(aTreeScope);
  return GetTreeForCascadeLevel(aContent, cascadeOrder);
}

bool DoTreeScopedPropertiesOfElementApplyToContent(
    const ScopedNameRef& aAnchorName, const nsIFrame* aReferencingFrame,
    const nsIFrame* aMaybeReferencedFrame) {
  const auto* referencingContent = aReferencingFrame->GetContent();

  const auto& referencingTreeScope =
      aReferencingFrame->StyleDisplay()->mAnchorName.scope;

  const auto* referencingShadowRoot =
      GetShadowRootForTreeScope(*referencingContent, referencingTreeScope);

  const auto* maybeReferencedContent = aMaybeReferencedFrame->GetContent();
  const auto& maybeReferencedScope = aAnchorName.mTreeScope;

  const auto* maybeReferencedShadowRoot =
      GetShadowRootForTreeScope(*maybeReferencedContent, maybeReferencedScope);
  const auto* currentShadowRoot = maybeReferencedShadowRoot;
  while (currentShadowRoot) {
    if (referencingShadowRoot == currentShadowRoot) {
      return true;
    }

    const auto* containingHost = currentShadowRoot->GetContainingShadowHost();
    if (!containingHost) {
      break;
    }
    currentShadowRoot = containingHost->GetContainingShadow();
  }

  // Original maybeReferencedShadowRoot, currentShadowRoot becomes eventually
  // null
  return !referencingShadowRoot && !maybeReferencedShadowRoot;
}

/**
 * Checks for the implementation of `anchor-scope`:
 * https://drafts.csswg.org/css-anchor-position-1/#anchor-scope
 *
 * TODO: Consider caching the ancestors, see bug 1986347
 */
bool IsAnchorInScopeForPositionedElement(const ScopedNameRef& aName,
                                         const nsIFrame* aPossibleAnchorFrame,
                                         const nsIFrame* aPositionedFrame) {
  // We don't need to look beyond positioned element's containing block.
  const auto* positionedContainingBlockContent =
      aPositionedFrame->GetParent()->GetContent();

  const nsIContent* positionedContent = aPositionedFrame->GetContent();

  const auto& positionAnchorScope = aName.mTreeScope;

  const dom::ShadowRoot* positionAnchorShadowRoot =
      GetShadowRootForTreeScope(*positionedContent, positionAnchorScope);

  auto getAnchorPosNearestScope =
      [&](const nsAtom* aName, const nsIFrame* aFrame,
          const dom::ShadowRoot* aShadowRoot) -> const nsIContent* {
    // We need to traverse the DOM, not the frame tree, since `anchor-scope`
    // may be present on elements with `display: contents` (in which case its
    // frame is in the `::before` list and won't be found by walking the frame
    // tree parent chain).
    for (nsIContent* cp = aFrame->GetContent();
         cp && cp != positionedContainingBlockContent;
         cp = cp->GetFlattenedTreeParentElementForStyle()) {
      const auto* anchorScope = [&]() -> const StyleAnchorScope* {
        const nsIFrame* f = nsLayoutUtils::GetStyleFrame(cp);
        if (MOZ_LIKELY(f)) {
          return &f->StyleDisplay()->mAnchorScope;
        }
        if (cp->AsElement()->IsDisplayContents()) {
          const auto* style =
              Servo_Element_GetMaybeOutOfDateStyle(cp->AsElement());
          MOZ_ASSERT(style);
          return &style->StyleDisplay()->mAnchorScope;
        }
        return nullptr;
      }();

      if (!anchorScope || anchorScope->value.IsNone()) {
        continue;
      }

      if (anchorScope->value.IsAll()) {
        const dom::ShadowRoot* shadowRoot = GetTreeForCascadeLevel(
            *cp, GetShadowCascadeOrder(anchorScope->scope));
        if (shadowRoot == aShadowRoot) {
          return cp;
        }
        continue;
      }

      MOZ_ASSERT(anchorScope->value.IsIdents());
      for (const StyleAtom& ident : anchorScope->value.AsIdents().AsSpan()) {
        if (aName == ident.AsAtom()) {
          const dom::ShadowRoot* shadowRoot = GetTreeForCascadeLevel(
              *cp, GetShadowCascadeOrder(anchorScope->scope));
          if (shadowRoot == aShadowRoot) {
            return cp;
          }
        }
      }
    }
    return nullptr;
  };

  const auto& possibleAnchorName =
      aPossibleAnchorFrame->StyleDisplay()->mAnchorName;
  const dom::ShadowRoot* possibleAnchorShadowRoot = GetShadowRootForTreeScope(
      *aPossibleAnchorFrame->GetContent(), possibleAnchorName.scope);
  const auto* nearestScopeForAnchor = getAnchorPosNearestScope(
      aName.mName, aPossibleAnchorFrame, possibleAnchorShadowRoot);

  const auto* nearestScopeForPositioned = getAnchorPosNearestScope(
      aName.mName, aPositionedFrame, positionAnchorShadowRoot);
  if (!nearestScopeForAnchor) {
    // Anchor is not scoped and positioned element also should
    // not be gated by a scope.
    return !nearestScopeForPositioned ||
           aPossibleAnchorFrame->GetContent() == nearestScopeForPositioned;
  }

  // There may not be any other scopes between the positioned element
  // and the nearest scope of the anchor.
  return nearestScopeForAnchor == nearestScopeForPositioned;
};

bool IsFullyStyleableTreeAbidingOrNotPseudoElement(const nsIFrame* aFrame) {
  if (!aFrame->Style()->IsPseudoElement()) {
    return true;
  }

  const PseudoStyleType pseudoElementType = aFrame->Style()->GetPseudoType();

  // See https://www.w3.org/TR/css-pseudo-4/#treelike
  return pseudoElementType == PseudoStyleType::Before ||
         pseudoElementType == PseudoStyleType::After ||
         pseudoElementType == PseudoStyleType::Marker;
}

size_t GetTopLayerIndex(const nsIFrame* aFrame) {
  MOZ_ASSERT(aFrame);

  const nsIContent* frameContent = aFrame->GetContent();

  if (!frameContent) {
    return 0;
  }

  // Within the array returned by Document::GetTopLayer,
  // a higher index means the layer sits higher in the stack,
  // matching Document::GetTopLayerTop()’s top-to-bottom logic.
  // See https://drafts.csswg.org/css-position-4/#in-a-higher-top-layer
  const nsTArray<dom::Element*>& topLayers =
      frameContent->OwnerDoc()->GetTopLayer();

  for (size_t index = 0; index < topLayers.Length(); ++index) {
    const auto& topLayer = topLayers.ElementAt(index);
    if (nsContentUtils::ContentIsFlattenedTreeDescendantOfForStyle(
            /* aPossibleDescendant */ frameContent,
            /* aPossibleAncestor */ topLayer)) {
      return 1 + index;
    }
  }

  return 0;
}

bool IsInitialContainingBlock(const nsIFrame* aContainingBlock) {
  // Initial containing block: The containing block of the root element.
  // https://drafts.csswg.org/css-display-4/#initial-containing-block
  return aContainingBlock == aContainingBlock->PresShell()
                                 ->FrameConstructor()
                                 ->GetDocElementContainingBlock();
}

bool IsContainingBlockGeneratedByElement(const nsIFrame* aContainingBlock) {
  // 2.1. Containing Blocks of Positioned Boxes
  // https://www.w3.org/TR/css-position-3/#def-cb
  return !(!aContainingBlock || aContainingBlock->IsViewportFrame() ||
           IsInitialContainingBlock(aContainingBlock));
}

bool IsAnchorLaidOutStrictlyBeforeElement(
    const nsIFrame* aPossibleAnchorFrame, const nsIFrame* aPositionedFrame,
    const nsTArray<const nsIFrame*>& aPositionedFrameAncestors) {
  // 1. positioned el is in a higher top layer than possible anchor,
  // see https://drafts.csswg.org/css-position-4/#in-a-higher-top-layer
  const size_t positionedTopLayerIndex = GetTopLayerIndex(aPositionedFrame);
  const size_t anchorTopLayerIndex = GetTopLayerIndex(aPossibleAnchorFrame);

  if (anchorTopLayerIndex != positionedTopLayerIndex) {
    return anchorTopLayerIndex < positionedTopLayerIndex;
  }

  // Note: The containing block of an absolutely positioned element
  // is just the parent frame.
  const nsIFrame* positionedContainingBlock = aPositionedFrame->GetParent();
  // Note(dshin, bug 1985654): Spec strictly uses the term "containing block,"
  // corresponding to `GetContainingBlock()`. However, this leads to cases
  // where an anchor's non-inline containing block prevents it from being a
  // valid anchor for a absolutely positioned element (Which can explicitly
  // have inline elements as a containing block). Some WPT rely on inline
  // containing blocks as well.
  // See also: https://github.com/w3c/csswg-drafts/issues/12674
  const nsIFrame* anchorContainingBlock = aPossibleAnchorFrame->GetParent();

  // 2. Both elements are in the same top layer but have different
  // containing blocks and positioned el's containing block is an
  // ancestor of possible anchor's containing block in the containing
  // block chain, aka one of the following:
  if (anchorContainingBlock->FirstContinuation() !=
      positionedContainingBlock->FirstContinuation()) {
    // 2.1 positioned el's containing block is the viewport, and
    // possible anchor's containing block isn't.
    if (positionedContainingBlock->IsViewportFrame() &&
        !anchorContainingBlock->IsViewportFrame()) {
      return !nsLayoutUtils::IsProperAncestorFrame(aPositionedFrame,
                                                   aPossibleAnchorFrame);
    }

    auto isLastContainingBlockOrderable =
        [&aPositionedFrame, &aPositionedFrameAncestors, &anchorContainingBlock,
         &positionedContainingBlock]() -> bool {
      const nsIFrame* it = anchorContainingBlock;
      while (it) {
        const nsIFrame* parentContainingBlock = it->GetParent();
        if (!parentContainingBlock) {
          return false;
        }

        if (parentContainingBlock->FirstContinuation() ==
            positionedContainingBlock->FirstContinuation()) {
          return !it->IsAbsolutelyPositioned() ||
                 nsLayoutUtils::CompareTreePosition(it, aPositionedFrame,
                                                    aPositionedFrameAncestors,
                                                    nullptr) < 0;
        }

        it = parentContainingBlock;
      }

      return false;
    };

    // 2.2 positioned el's containing block is the initial containing
    // block, and possible anchor's containing block is generated by an
    // element, and the last containing block in possible anchor's containing
    // block chain before reaching positioned el's containing block is either
    // not absolutely positioned or precedes positioned el in the tree order,
    const bool isAnchorContainingBlockGenerated =
        IsContainingBlockGeneratedByElement(anchorContainingBlock);
    if (isAnchorContainingBlockGenerated &&
        IsInitialContainingBlock(positionedContainingBlock)) {
      return isLastContainingBlockOrderable();
    }

    // 2.3 both elements' containing blocks are generated by elements,
    // and positioned el's containing block is an ancestor in the flat
    // tree to that of possible anchor's containing block, and the last
    // containing block in possible anchor’s containing block chain before
    // reaching positioned el’s containing block is either not absolutely
    // positioned or precedes positioned el in the tree order.
    if (isAnchorContainingBlockGenerated &&
        IsContainingBlockGeneratedByElement(positionedContainingBlock)) {
      return isLastContainingBlockOrderable();
    }

    return false;
  }

  // 3. Both elements are in the same top layer and have the same
  // containing block, and are both absolutely positioned, and possible
  // anchor is earlier in flat tree order than positioned el.
  const bool isAnchorAbsolutelyPositioned =
      aPossibleAnchorFrame->IsAbsolutelyPositioned();
  if (isAnchorAbsolutelyPositioned) {
    // We must have checked that the positioned element is absolutely
    // positioned by now.
    return nsLayoutUtils::CompareTreePosition(
               aPossibleAnchorFrame, aPositionedFrame,
               aPositionedFrameAncestors, nullptr) < 0;
  }

  // 4. Both elements are in the same top layer and have the same
  // containing block, but possible anchor isn't absolutely positioned.
  return !isAnchorAbsolutelyPositioned;
}

/**
 * https://drafts.csswg.org/css-contain-2/#skips-its-contents
 */
bool IsPositionedElementAlsoSkippedWhenAnchorIsSkipped(
    const nsIFrame* aPossibleAnchorFrame, const nsIFrame* aPositionedFrame) {
  // If potential anchor is skipped and a root of a visibility subtree,
  // it can never be acceptable.
  if (aPossibleAnchorFrame->HidesContentForLayout()) {
    return false;
  }

  // If possible anchor is in the skipped contents of another element,
  // then positioned el shall be in the skipped contents of that same element.
  const nsIFrame* visibilityAncestor = aPossibleAnchorFrame->GetParent();
  while (visibilityAncestor) {
    // If anchor is skipped via auto or hidden, it cannot be acceptable,
    // be it a root or a non-root of a visibility subtree.
    if (visibilityAncestor->HidesContentForLayout()) {
      break;
    }

    visibilityAncestor = visibilityAncestor->GetParent();
  }

  // If positioned el is skipped and a root of a visibility subtree,
  // an anchor can never be acceptable.
  if (aPositionedFrame->HidesContentForLayout()) {
    return false;
  }

  const nsIFrame* ancestor = aPositionedFrame;
  while (ancestor) {
    if (ancestor->HidesContentForLayout()) {
      return ancestor == visibilityAncestor;
    }

    ancestor = ancestor->GetParent();
  }

  return true;
}

class LazyAncestorHolder {
  const nsIFrame* mFrame;
  AutoTArray<const nsIFrame*, 8> mAncestors;
  bool mFilled = false;

 public:
  const nsTArray<const nsIFrame*>& GetAncestors() {
    if (!mFilled) {
      nsLayoutUtils::FillAncestors(mFrame, nullptr, &mAncestors);
      mFilled = true;
    }
    return mAncestors;
  }

  explicit LazyAncestorHolder(const nsIFrame* aFrame) : mFrame(aFrame) {}
};

bool IsAcceptableAnchorElement(
    const nsIFrame* aPossibleAnchorFrame, const ScopedNameRef* aName,
    const nsIFrame* aPositionedFrame,
    LazyAncestorHolder& aPositionedFrameAncestorHolder) {
  MOZ_ASSERT(aPossibleAnchorFrame);
  MOZ_ASSERT(aPositionedFrame);

  // An element possible anchor is an acceptable anchor element for an
  // absolutely positioned element positioned el if all of the following are
  // true:
  // - possible anchor is either an element or a fully styleable
  // tree-abiding pseudo-element.
  // - possible anchor is in scope for positioned el, per the effects of
  // anchor-scope on positioned el or its ancestors.
  // - possible anchor is laid out strictly before positioned el
  //
  // Note: Frames having an anchor name contain elements.
  // The phrase "element or a fully styleable tree-abiding pseudo-element"
  // used by the spec is taken to mean
  // "either not a pseudo-element or a pseudo-element of a specific kind".
  if (!IsFullyStyleableTreeAbidingOrNotPseudoElement(aPossibleAnchorFrame)) {
    return false;
  }
  if (!IsAnchorLaidOutStrictlyBeforeElement(
          aPossibleAnchorFrame, aPositionedFrame,
          aPositionedFrameAncestorHolder.GetAncestors())) {
    return false;
  }
  if (aName && !IsAnchorInScopeForPositionedElement(
                   *aName, aPossibleAnchorFrame, aPositionedFrame)) {
    return false;
  }
  if (!IsPositionedElementAlsoSkippedWhenAnchorIsSkipped(aPossibleAnchorFrame,
                                                         aPositionedFrame)) {
    return false;
  }
  return true;
}

}  // namespace

AnchorPosReferenceData::Result AnchorPosReferenceData::InsertOrModify(
    const ScopedNameRef& aKey, const bool aNeedOffset) {
  MOZ_ASSERT(aKey.mName);
  bool exists = true;
  auto* result = &mMap.LookupOrInsertWith(aKey, [&exists]() {
    exists = false;
    return Nothing{};
  });

  if (!exists) {
    return {false, result};
  }

  // We tried to resolve before.
  if (result->isNothing()) {
    // We know this reference is invalid.
    return {true, result};
  }
  // Previous resolution found a valid anchor.
  if (!aNeedOffset) {
    // Size is guaranteed to be populated on resolution.
    return {true, result};
  }

  // Previous resolution may have been for size only, in which case another
  // anchor resolution is still required.
  return {result->ref().mOffsetData.isSome(), result};
}

const AnchorPosReferenceData::Value* AnchorPosReferenceData::Lookup(
    const ScopedNameRef& aKey) const {
  return mMap.Lookup(aKey).DataPtrOrNull();
}

AnchorPosDefaultAnchorCache::AnchorPosDefaultAnchorCache(
    const nsIFrame* aAnchor, const nsIFrame* aScrollContainer)
    : mAnchor{aAnchor}, mScrollContainer{aScrollContainer} {
  MOZ_ASSERT_IF(
      aAnchor,
      nsLayoutUtils::GetNearestScrollContainerFrame(
          const_cast<nsContainerFrame*>(aAnchor->GetParent()),
          nsLayoutUtils::SCROLLABLE_SAME_DOC |
              nsLayoutUtils::SCROLLABLE_INCLUDE_HIDDEN) == mScrollContainer);
}

nsIFrame* AnchorPositioningUtils::FindFirstAcceptableAnchor(
    const ScopedNameRef& aName, const nsIFrame* aPositionedFrame,
    const nsTArray<nsIFrame*>& aPossibleAnchorFrames) {
  LazyAncestorHolder positionedFrameAncestorHolder(aPositionedFrame);

  for (auto it = aPossibleAnchorFrames.rbegin();
       it != aPossibleAnchorFrames.rend(); ++it) {
    const nsIFrame* possibleAnchorFrame = *it;
    if (!DoTreeScopedPropertiesOfElementApplyToContent(
            aName, possibleAnchorFrame, aPositionedFrame)) {
      // Skip anchors in different shadow trees.
      continue;
    }

    // Check if the possible anchor is an acceptable anchor element.
    if (IsAcceptableAnchorElement(*it, &aName, aPositionedFrame,
                                  positionedFrameAncestorHolder)) {
      return *it;
    }
  }

  // If we reach here, we didn't find any acceptable anchor.
  return nullptr;
}

// Find the aContainer's child that is the ancestor of aDescendant.
static const nsIFrame* TraverseUpToContainerChild(const nsIFrame* aContainer,
                                                  const nsIFrame* aDescendant) {
  const auto* current = aDescendant;
  while (true) {
    const auto* parent = current->GetParent();
    if (!parent) {
      return nullptr;
    }
    if (parent == aContainer) {
      return current;
    }
    current = parent;
  }
}

static const nsIFrame* GetAnchorOf(const nsIFrame* aPositioned,
                                   const ScopedNameRef& aAnchorName) {
  const auto* presShell = aPositioned->PresShell();
  MOZ_ASSERT(presShell, "No PresShell for frame?");
  return presShell->GetAnchorPosAnchor(aAnchorName, aPositioned);
}

Maybe<nsRect> AnchorPositioningUtils::GetAnchorPosRect(
    const nsIFrame* aAbsoluteContainingBlock, const nsIFrame* aAnchor,
    bool aCBRectIsvalid) {
  auto rect = [&]() -> Maybe<nsRect> {
    if (aCBRectIsvalid) {
      const nsRect result =
          nsLayoutUtils::GetCombinedFragmentRects(aAnchor).mRect;
      const auto offset =
          aAnchor->GetOffsetToIgnoringScrolling(aAbsoluteContainingBlock);
      // Easy, just use the existing function.
      return Some(result + offset);
    }

    // Ok, containing block doesn't have its rect fully resolved. Figure out
    // rect relative to the child of containing block that is also the ancestor
    // of the anchor, and manually compute the offset.
    // TODO(dshin): This wouldn't handle anchor in a previous top layer.
    const auto* containerChild =
        TraverseUpToContainerChild(aAbsoluteContainingBlock, aAnchor);
    if (!containerChild) {
      return Nothing{};
    }

    if (aAnchor == containerChild) {
      // Anchor is the direct child of anchor's CBWM.
      return Some(nsLayoutUtils::GetCombinedFragmentRects(aAnchor).mRect +
                  aAnchor->GetPositionIgnoringScrolling());
    }

    // TODO(dshin): Already traversed up to find `containerChild`, and we're
    // going to do it again here, which feels a little wasteful.
    const nsRect rectToContainerChild =
        nsLayoutUtils::GetCombinedFragmentRects(aAnchor).mRect;
    const auto offset = aAnchor->GetOffsetToIgnoringScrolling(containerChild);
    return Some(rectToContainerChild + offset + containerChild->GetPosition());
  }();
  return rect.map([&](const nsRect& aRect) {
    // We need to position the border box of the anchor within the abspos
    // containing block's size - So the rectangle's size (i.e. Anchor size)
    // stays the same, while "the outer rectangle" (i.e. The abspos cb size)
    // "shrinks" by shifting the position.
    const auto border = aAbsoluteContainingBlock->GetUsedBorder();
    const nsPoint borderTopLeft{border.left, border.top};
    const auto rect = aRect - borderTopLeft;
    return rect;
  });
}

Maybe<AnchorPosInfo> AnchorPositioningUtils::ResolveAnchorPosRect(
    const nsIFrame* aPositioned, const nsIFrame* aAbsoluteContainingBlock,
    const ScopedNameRef& aAnchorName, bool aCBRectIsvalid,
    AnchorPosResolutionCache* aResolutionCache) {
  if (!aPositioned) {
    return Nothing{};
  }

  if (!aPositioned->HasAnyStateBits(NS_FRAME_OUT_OF_FLOW)) {
    return Nothing{};
  }

  MOZ_ASSERT(aPositioned->GetParent() == aAbsoluteContainingBlock);

  const auto anchorName = GetUsedAnchorName(aPositioned, aAnchorName);
  if (!anchorName) {
    return Nothing{};
  }

  Maybe<AnchorPosResolutionData>* entry = nullptr;
  if (aResolutionCache) {
    const auto result =
        aResolutionCache->mReferenceData->InsertOrModify(*anchorName, true);
    if (result.mAlreadyResolved) {
      MOZ_ASSERT(result.mEntry, "Entry exists but null?");
      return result.mEntry->map([&](const AnchorPosResolutionData& aData) {
        MOZ_ASSERT(aData.mOffsetData, "Missing anchor offset resolution.");
        const auto& offsetData = aData.mOffsetData.ref();
        return AnchorPosInfo{nsRect{offsetData.mOrigin, aData.mSize},
                             offsetData.mCompensatesForScroll};
      });
    }
    entry = result.mEntry;
  }

  const auto* anchor = GetAnchorOf(aPositioned, *anchorName);
  if (!anchor) {
    // If we have a cached entry, just check that it resolved to nothing last
    // time as well.
    MOZ_ASSERT_IF(entry, entry->isNothing());
    return Nothing{};
  }

  const auto result =
      GetAnchorPosRect(aAbsoluteContainingBlock, anchor, aCBRectIsvalid);
  return result.map([&](const nsRect& aRect) {
    bool compensatesForScroll = false;
    DistanceToNearestScrollContainer distanceToNearestScrollContainer;
    if (aResolutionCache) {
      MOZ_ASSERT(entry);
      // Update the cache.
      compensatesForScroll = [&]() {
        auto& defaultAnchorCache = aResolutionCache->mDefaultAnchorCache;
        if (!aAnchorName.mName) {
          // Explicitly resolved default anchor for the first time - populate
          // the cache.
          defaultAnchorCache.mAnchor = anchor;
          const auto [scrollContainer, distance] =
              AnchorPositioningUtils::GetNearestScrollFrame(anchor);
          distanceToNearestScrollContainer = distance;
          defaultAnchorCache.mScrollContainer = scrollContainer;
          aResolutionCache->mReferenceData->mDistanceToDefaultScrollContainer =
              distance;
          aResolutionCache->mReferenceData->mDefaultAnchorName =
              anchorName->mName;
          aResolutionCache->mReferenceData->mAnchorTreeScope =
              anchorName->mTreeScope;
          // This is the default anchor, so scroll compensated by definition.
          return true;
        }
        if (defaultAnchorCache.mAnchor == anchor) {
          // This is referring to the default anchor, so scroll compensated by
          // definition.
          return true;
        }
        const auto [scrollContainer, distance] =
            AnchorPositioningUtils::GetNearestScrollFrame(anchor);
        distanceToNearestScrollContainer = distance;
        return scrollContainer ==
               aResolutionCache->mDefaultAnchorCache.mScrollContainer;
      }();
      // If a partially resolved entry exists, make sure that it matches what we
      // have now.
      MOZ_ASSERT_IF(*entry, entry->ref().mSize == aRect.Size());
      *entry = Some(AnchorPosResolutionData{
          aRect.Size(),
          Some(AnchorPosOffsetData{aRect.TopLeft(), compensatesForScroll,
                                   distanceToNearestScrollContainer}),
          aAnchorName.mTreeScope});
    }
    return AnchorPosInfo{aRect, compensatesForScroll};
  });
}

Maybe<nsSize> AnchorPositioningUtils::ResolveAnchorPosSize(
    const nsIFrame* aPositioned, const ScopedNameRef& aAnchorName,
    AnchorPosResolutionCache* aResolutionCache) {
  auto anchorName = GetUsedAnchorName(aPositioned, aAnchorName);
  if (!anchorName) {
    return Nothing{};
  }
  Maybe<AnchorPosResolutionData>* entry = nullptr;
  auto* referencedAnchors =
      aResolutionCache ? aResolutionCache->mReferenceData : nullptr;
  if (referencedAnchors) {
    const auto result = referencedAnchors->InsertOrModify(*anchorName, false);
    if (result.mAlreadyResolved) {
      MOZ_ASSERT(result.mEntry, "Entry exists but null?");
      return result.mEntry->map(
          [](const AnchorPosResolutionData& aData) { return aData.mSize; });
    }
    entry = result.mEntry;
  }
  const auto* anchor = GetAnchorOf(aPositioned, *anchorName);
  if (!anchor) {
    return Nothing{};
  }
  const auto size =
      nsLayoutUtils::GetCombinedFragmentRects(anchor).mRect.Size();
  if (entry) {
    *entry =
        Some(AnchorPosResolutionData{size, Nothing{}, aAnchorName.mTreeScope});
  }
  return Some(size);
}

/**
 * Returns an equivalent StylePositionArea that contains:
 * [
 *   [ left | center | right | span-left | span-right | span-all]
 *   [ top | center | bottom | span-top | span-bottom | span-all]
 * ]
 */
static StylePositionArea ToPhysicalPositionArea(StylePositionArea aPosArea,
                                                WritingMode aCbWM,
                                                WritingMode aPosWM) {
  StyleWritingMode cbwm{aCbWM.GetBits()};
  StyleWritingMode wm{aPosWM.GetBits()};
  Servo_PhysicalizePositionArea(&aPosArea, &cbwm, &wm);
  return aPosArea;
}

StylePositionArea AnchorPositioningUtils::PhysicalizePositionArea(
    StylePositionArea aPosArea, const nsIFrame* aPositioned) {
  return ToPhysicalPositionArea(aPosArea,
                                aPositioned->GetParent()->GetWritingMode(),
                                aPositioned->GetWritingMode());
}

nsRect AnchorPositioningUtils::AdjustAbsoluteContainingBlockRectForPositionArea(
    const nsRect& aAnchorRect, const nsRect& aCBRect, WritingMode aPositionedWM,
    WritingMode aCBWM, const StylePositionArea& aPosArea,
    StylePositionArea* aOutResolvedArea) {
  // Get the boundaries of 3x3 grid in CB's frame space. The edges of the
  // default anchor box are clamped to the bounds of the CB, even if that
  // results in zero width/height cells.
  //
  //          ltrEdges[0]  ltrEdges[1]  ltrEdges[2]  ltrEdges[3]
  //              |            |            |            |
  // ttbEdges[0]  +------------+------------+------------+
  //              |            |            |            |
  // ttbEdges[1]  +------------+------------+------------+
  //              |            |            |            |
  // ttbEdges[2]  +------------+------------+------------+
  //              |            |            |            |
  // ttbEdges[3]  +------------+------------+------------+

  const nsRect gridRect = aCBRect.Union(aAnchorRect);
  nscoord ltrEdges[4] = {gridRect.x, aAnchorRect.x,
                         aAnchorRect.x + aAnchorRect.width,
                         gridRect.x + gridRect.width};
  nscoord ttbEdges[4] = {gridRect.y, aAnchorRect.y,
                         aAnchorRect.y + aAnchorRect.height,
                         gridRect.y + gridRect.height};
  ltrEdges[1] = std::clamp(ltrEdges[1], ltrEdges[0], ltrEdges[3]);
  ltrEdges[2] = std::clamp(ltrEdges[2], ltrEdges[0], ltrEdges[3]);
  ttbEdges[1] = std::clamp(ttbEdges[1], ttbEdges[0], ttbEdges[3]);
  ttbEdges[2] = std::clamp(ttbEdges[2], ttbEdges[0], ttbEdges[3]);

  nsRect res = gridRect;

  // PositionArea, resolved to only contain Left/Right/Top/Bottom values.
  StylePositionArea posArea =
      ToPhysicalPositionArea(aPosArea, aCBWM, aPositionedWM);
  *aOutResolvedArea = posArea;

  nscoord right = ltrEdges[3];
  if (posArea.first == StylePositionAreaKeyword::Left) {
    right = ltrEdges[1];
  } else if (posArea.first == StylePositionAreaKeyword::SpanLeft) {
    right = ltrEdges[2];
  } else if (posArea.first == StylePositionAreaKeyword::Center) {
    res.x = ltrEdges[1];
    right = ltrEdges[2];
  } else if (posArea.first == StylePositionAreaKeyword::SpanRight) {
    res.x = ltrEdges[1];
  } else if (posArea.first == StylePositionAreaKeyword::Right) {
    res.x = ltrEdges[2];
  } else if (posArea.first == StylePositionAreaKeyword::SpanAll) {
    // no adjustment
  } else {
    MOZ_ASSERT_UNREACHABLE("Bad value from ToPhysicalPositionArea");
  }
  res.width = right - res.x;

  nscoord bottom = ttbEdges[3];
  if (posArea.second == StylePositionAreaKeyword::Top) {
    bottom = ttbEdges[1];
  } else if (posArea.second == StylePositionAreaKeyword::SpanTop) {
    bottom = ttbEdges[2];
  } else if (posArea.second == StylePositionAreaKeyword::Center) {
    res.y = ttbEdges[1];
    bottom = ttbEdges[2];
  } else if (posArea.second == StylePositionAreaKeyword::SpanBottom) {
    res.y = ttbEdges[1];
  } else if (posArea.second == StylePositionAreaKeyword::Bottom) {
    res.y = ttbEdges[2];
  } else if (posArea.second == StylePositionAreaKeyword::SpanAll) {
    // no adjustment
  } else {
    MOZ_ASSERT_UNREACHABLE("Bad value from ToPhysicalPositionArea");
  }
  res.height = bottom - res.y;

  return res;
}

AnchorPositioningUtils::NearestScrollFrameInfo
AnchorPositioningUtils::GetNearestScrollFrame(const nsIFrame* aFrame) {
  if (!aFrame) {
    return {nullptr, {}};
  }
  uint32_t distance = 1;
  // `GetNearestScrollContainerFrame` will return the incoming frame if it's a
  // scroll frame, so nudge to parent.
  for (const nsIFrame* f = aFrame->GetParent(); f; f = f->GetParent()) {
    if (f->IsScrollContainerOrSubclass()) {
      return {f, DistanceToNearestScrollContainer{distance}};
    }
    distance++;
  }
  return {nullptr, {}};
}

nsPoint AnchorPositioningUtils::GetScrollOffsetFor(
    PhysicalAxes aAxes, const nsIFrame* aPositioned,
    const AnchorPosDefaultAnchorCache& aDefaultAnchorCache) {
  MOZ_ASSERT(aPositioned);
  if (!aDefaultAnchorCache.mAnchor || aAxes.isEmpty()) {
    return nsPoint{};
  }
  nsPoint offset;
  const bool trackHorizontal = aAxes.contains(PhysicalAxis::Horizontal);
  const bool trackVertical = aAxes.contains(PhysicalAxis::Vertical);
  // TODO(dshin, bug 1991489): Traverse properly, in case anchor and positioned
  // elements are in different continuation frames of the absolute containing
  // block.
  const auto* absoluteContainingBlock = aPositioned->GetParent();
  if (GetNearestScrollFrame(aPositioned).mScrollContainer ==
      aDefaultAnchorCache.mScrollContainer) {
    // Would scroll together anyway, skip.
    return nsPoint{};
  }
  // Grab the accumulated offset up to, but not including, the abspos
  // container.
  for (const auto* f = aDefaultAnchorCache.mScrollContainer;
       f && f != absoluteContainingBlock; f = f->GetParent()) {
    if (const ScrollContainerFrame* scrollFrame = do_QueryFrame(f)) {
      const auto o = scrollFrame->GetScrollPosition();
      if (trackHorizontal) {
        offset.x += o.x;
      }
      if (trackVertical) {
        offset.y += o.y;
      }
    }
  }
  return offset;
}

// Out of line to avoid having to include AnchorPosReferenceData from nsIFrame.h
void DeleteAnchorPosReferenceData(AnchorPosReferenceData* aData) {
  delete aData;
}

void DeleteLastSuccessfulPositionData(LastSuccessfulPositionData* aData) {
  delete aData;
}

Maybe<ScopedNameRef> AnchorPositioningUtils::GetUsedAnchorName(
    const nsIFrame* aPositioned, const ScopedNameRef& aAnchorName) {
  if (aAnchorName.mName && !aAnchorName.mName->IsEmpty()) {
    return Some(aAnchorName);
  }

  const auto& defaultAnchor = aPositioned->StylePosition()->mPositionAnchor;
  if (defaultAnchor.value.IsNone()) {
    return Nothing{};
  }

  if (defaultAnchor.value.IsIdent()) {
    return Some(ScopedNameRef(defaultAnchor.value.AsIdent().AsAtom(),
                              defaultAnchor.scope));
  }

  if (aPositioned->Style()->IsPseudoElement()) {
    return Some(ScopedNameRef(nsGkAtoms::AnchorPosImplicitAnchor,
                              StyleCascadeLevel::Default()));
  }

  if (const nsIContent* content = aPositioned->GetContent()) {
    if (const auto* element = content->AsElement()) {
      if (element->GetPopoverData()) {
        return Some(ScopedNameRef(nsGkAtoms::AnchorPosImplicitAnchor,
                                  StyleCascadeLevel::Default()));
      }
    }
  }

  return Nothing{};
}

static std::pair<nsIContent*, AnchorPositioningUtils::ImplicitAnchorKind>
GetImplicitAnchorContent(const nsIFrame* aFrame) {
  const auto* element = dom::Element::FromNodeOrNull(aFrame->GetContent());
  if (!element) [[unlikely]] {
    return {};
  }
  if (const auto* popoverData = element->GetPopoverData()) [[unlikely]] {
    if (RefPtr invoker = popoverData->GetInvoker()) {
      return {invoker.get(),
              AnchorPositioningUtils::ImplicitAnchorKind::Popover};
    }
  }
  if (!aFrame->Style()->IsPseudoElement()) {
    return {};
  }
  return {element->GetClosestNativeAnonymousSubtreeRootParentOrHost(),
          AnchorPositioningUtils::ImplicitAnchorKind::PseudoElement};
}

auto AnchorPositioningUtils::GetAnchorPosImplicitAnchor(const nsIFrame* aFrame)
    -> ImplicitAnchorResult {
  auto [implicitAnchor, kind] = GetImplicitAnchorContent(aFrame);
  if (!implicitAnchor) {
    return {};
  }
  auto* anchorFrame = implicitAnchor->GetPrimaryFrame();
  if (!anchorFrame) {
    return {};
  }
  LazyAncestorHolder ancestorHolder(aFrame);
  if (!IsAcceptableAnchorElement(anchorFrame, /* aName = */ nullptr, aFrame,
                                 ancestorHolder)) {
    return {};
  }
  return {anchorFrame, kind};
}

AnchorPositioningUtils::ContainingBlockInfo
AnchorPositioningUtils::ContainingBlockInfo::ExplicitCBFrameSize(
    const nsRect& aContainingBlockRect) {
  // TODO(dshin, bug 1989292): Ideally, this takes both local containing rect +
  // scrollable containing rect, and one is picked here.
  return ContainingBlockInfo{aContainingBlockRect};
}

AnchorPositioningUtils::ContainingBlockInfo
AnchorPositioningUtils::ContainingBlockInfo::UseCBFrameSize(
    const nsIFrame* aPositioned) {
  // TODO(dshin, bug 1989292): This just gets local containing block.
  const auto* cb = aPositioned->GetParent();
  MOZ_ASSERT(cb);
  if (IsScrolled(cb)) {
    cb = aPositioned->GetParent();
  }
  return ContainingBlockInfo{cb->GetPaddingRectRelativeToSelf()};
}

bool AnchorPositioningUtils::FitsInContainingBlock(
    const nsIFrame* aPositioned, const AnchorPosReferenceData& aReferenceData) {
  MOZ_ASSERT(aPositioned->FirstInFlow()->GetProperty(
                 nsIFrame::AnchorPosReferences()) == &aReferenceData);

  const auto& scrollShift = aReferenceData.mDefaultScrollShift;
  const auto scrollCompensatedSides = aReferenceData.mScrollCompensatedSides;
  nsSize checkSize = [&]() {
    const auto& adjustedCB = aReferenceData.mAdjustedContainingBlock;
    if (scrollShift == nsPoint{} || scrollCompensatedSides == SideBits::eNone) {
      return adjustedCB.Size();
    }

    // We now know that this frame's anchor has moved in relation to
    // the original containing block, and that at least one side of our
    // IMCB is attached to it.

    // Scroll shift the adjusted containing block.
    const auto shifted = aReferenceData.mAdjustedContainingBlock - scrollShift;
    const auto& originalCB = aReferenceData.mOriginalContainingBlockRect;

    // Now, move edges that are not attached to the anchors and pin it
    // to the original containing block.
    const nsPoint pt{
        scrollCompensatedSides & SideBits::eLeft ? shifted.X() : originalCB.X(),
        scrollCompensatedSides & SideBits::eTop ? shifted.Y() : originalCB.Y()};
    const nsPoint ptMost{
        scrollCompensatedSides & SideBits::eRight ? shifted.XMost()
                                                  : originalCB.XMost(),
        scrollCompensatedSides & SideBits::eBottom ? shifted.YMost()
                                                   : originalCB.YMost()};

    return nsSize{ptMost.x - pt.x, ptMost.y - pt.y};
  }();

  // Finally, reduce by inset.
  checkSize -= nsSize{aReferenceData.mInsets.LeftRight(),
                      aReferenceData.mInsets.TopBottom()};

  return aPositioned->GetMarginRectRelativeToSelf().Size() <= checkSize;
}

nsIFrame* AnchorPositioningUtils::GetAnchorThatFrameScrollsWith(
    nsIFrame* aFrame, nsDisplayListBuilder* aBuilder,
    bool aSkipAsserts /* = false */) {
#ifdef DEBUG
  if (!aSkipAsserts) {
    MOZ_ASSERT(!aBuilder || aBuilder->IsPaintingToWindow());
    MOZ_ASSERT_IF(!aBuilder, aFrame->PresContext()->LayoutPhaseCount(
                                 nsLayoutPhase::DisplayListBuilding) == 0);
  }
#endif

  if (!StaticPrefs::apz_async_scroll_css_anchor_pos_AtStartup()) {
    return nullptr;
  }
  PhysicalAxes axes = aFrame->GetAnchorPosCompensatingForScroll();
  if (axes.isEmpty()) {
    return nullptr;
  }

  const auto* pos = aFrame->StylePosition();
  if (!pos->mPositionAnchor.value.IsIdent()) {
    return nullptr;
  }

  const nsAtom* defaultAnchorName =
      pos->mPositionAnchor.value.AsIdent().AsAtom();
  StyleCascadeLevel anchorTreeScope = pos->mPositionAnchor.scope;
  nsIFrame* anchor =
      const_cast<nsIFrame*>(aFrame->PresShell()->GetAnchorPosAnchor(
          {defaultAnchorName, anchorTreeScope}, aFrame));
  // TODO Bug 1997026 We need to update the anchor finding code so this can't
  // happen. For now we just detect it and reject it.
  if (anchor && !nsLayoutUtils::IsProperAncestorFrameConsideringContinuations(
                    aFrame->GetParent(), anchor)) {
    return nullptr;
  }
  if (!aBuilder) {
    return anchor;
  }
  // TODO for now ShouldAsyncScrollWithAnchor will return false if we are
  // compensating in only one axis and there is a scroll frame between the
  // anchor and the positioned's containing block that can scroll in the "wrong"
  // axis so that we don't async scroll in the wrong axis because ASRs/APZ only
  // support scrolling in both axes. This is not fully spec compliant, bug
  // 1988034 tracks this.
  return DisplayPortUtils::ShouldAsyncScrollWithAnchor(aFrame, anchor, aBuilder,
                                                       axes)
             ? anchor
             : nullptr;
}

using AffectedAnchor = AnchorPosDefaultAnchorCache;
using AppliedShifts = nsTHashMap<nsIFrame*, nsPoint>;
struct ScrollShifts {
  nsPoint mScrollCompensatedDelta;
  nsPoint mChainedDelta;

  nsPoint Sum() const { return mChainedDelta + mScrollCompensatedDelta; }
};
static ScrollShifts FindScrollCompensatedAnchorShift(
    const PresShell* aPresShell, const nsIFrame* aPositioned,
    const AnchorPosReferenceData& aReferenceData,
    const AppliedShifts& aAppliedShifts) {
  MOZ_ASSERT(aPositioned->IsAbsolutelyPositioned(),
             "Anchor positioned frame is not absolutely positioned?");
  const auto* defaultAnchorName = aReferenceData.mDefaultAnchorName.get();
  if (!defaultAnchorName) {
    return {};
  }
  const StyleCascadeLevel& anchorTreeScope = aReferenceData.mAnchorTreeScope;
  auto* defaultAnchor = aPresShell->GetAnchorPosAnchor(
      {defaultAnchorName, anchorTreeScope}, aPositioned);
  if (!defaultAnchor) {
    return {};
  }
  const auto compensatingForScroll = aReferenceData.CompensatingForScrollAxes();
  // HACK(dshin, Bug 1999954): This is a workaround. While we try to lay out
  // against the scroll-ignored position of an anchor, chain anchored frames
  // end up containing scroll offset in their position. For now, walk the chain
  // to account for those deltas too.
  const nsPoint chainedDelta = [&]() -> nsPoint {
    if (defaultAnchor->StylePosition()->mPositionAnchor.value.IsNone()) {
      return {};
    }
    const auto* referenceData =
        defaultAnchor->GetProperty(nsIFrame::AnchorPosReferences());
    if (!referenceData) {
      return {};
    }
    if (auto delta = aAppliedShifts.Lookup(defaultAnchor)) {
      // If we've gone through this anchor already, grab the delta we've
      // applied already (if any), since otherwise
      // FindScrollCompensatedAnchorShift will end up being zero anyways.
      return *delta;
    }
    return FindScrollCompensatedAnchorShift(aPresShell, defaultAnchor,
                                            *referenceData, aAppliedShifts)
        .Sum();
  }();

  const nsPoint scrollCompensatedDelta = [&]() -> nsPoint {
    if (compensatingForScroll.isEmpty()) {
      return {};
    }
    const auto* scrollContainer =
        AnchorPositioningUtils::GetNearestScrollFrame(defaultAnchor)
            .mScrollContainer;
    if (!scrollContainer) {
      return nsPoint();
    }
    const auto offset = AnchorPositioningUtils::GetScrollOffsetFor(
        compensatingForScroll, aPositioned,
        AffectedAnchor{defaultAnchor, scrollContainer});
    return offset - aReferenceData.mDefaultScrollShift;
  }();
  return {scrollCompensatedDelta, chainedDelta};
}

// https://drafts.csswg.org/css-anchor-position-1/#default-scroll-shift
static void UpdateScrollShift(PresShell* aPresShell, nsIFrame* aPositioned,
                              AnchorPosReferenceData& aReferenceData,
                              OverflowChangedTracker& aOct,
                              AppliedShifts& aAppliedShifts) {
  const auto scrollShifts = FindScrollCompensatedAnchorShift(
      aPresShell, aPositioned, aReferenceData, aAppliedShifts);
  auto delta = scrollShifts.Sum();
  if (delta == nsPoint()) {
    return;
  }
  aAppliedShifts.InsertOrUpdate(aPositioned, delta);
  // APZ-handled scrolling may skip scheduling of paint for the relevant
  // scroll container - We need to ensure that we schedule a paint for this
  // positioned frame. Could theoretically do this when deciding to skip
  // painting in `ScrollContainerFrame::ScrollToImpl`, that'd be conditional
  // on finding a dependent anchor anyway, we should be as specific as
  // possible as to what gets scheduled to paint.
  aPositioned->SchedulePaint();
  if (!aReferenceData.CompensatingForScrollAxes().isEmpty()) {
    aReferenceData.mDefaultScrollShift += scrollShifts.mScrollCompensatedDelta;
  }
#ifdef ACCESSIBILITY
  if (nsAccessibilityService* accService = GetAccService()) {
    accService->NotifyAnchorPositionedScrollUpdate(aPresShell, aPositioned);
  }
#endif
  // NOTE(emilio): It might be tempting to call MarkPositionedFrameForReflow(),
  // but we don't want to trigger a full reflow as a response to scrolling, and
  // it seems to match other browsers and test expectations, see bug 1950251.
  aPositioned->SetPosition(aPositioned->GetPosition() - delta);
  aPositioned->UpdateOverflow();
  // Ensure that we propagate the overflow change up
  // the ancestor chain.
  // TODO: I think we can just use aPositioned, TRANSFORM_CHANGED and remove the
  // explicit UpdateOverflow() call above.
  aOct.AddFrame(aPositioned->GetParent(),
                OverflowChangedTracker::CHILDREN_CHANGED);
}

static bool TriggerFallbackReflow(PresShell* aPresShell, nsIFrame* aPositioned,
                                  AnchorPosReferenceData& aReferencedAnchors,
                                  bool aEvaluateAllFallbacksIfNeeded) {
  auto totalFallbacks =
      aPositioned->StylePosition()->mPositionTryFallbacks._0.Length();
  if (!totalFallbacks) {
    // No fallbacks specified.
    return false;
  }

  const bool positionedFitsInCB = AnchorPositioningUtils::FitsInContainingBlock(
      aPositioned, aReferencedAnchors);
  if (positionedFitsInCB) {
    return false;
  }

  // TODO(bug 1987964): Try to only do this when the scroll offset changes?
  auto* lastSuccessfulPosition =
      aPositioned->GetProperty(nsIFrame::LastSuccessfulPositionFallback());
  const bool needsRetry =
      aEvaluateAllFallbacksIfNeeded ||
      (lastSuccessfulPosition && !lastSuccessfulPosition->mTriedAllFallbacks);
  if (!needsRetry) {
    return false;
  }
  aPresShell->MarkPositionedFrameForReflow(aPositioned);
  return true;
}

static bool AnchorIsEffectivelyHidden(nsIFrame* aAnchor) {
  if (!aAnchor->StyleVisibility()->IsVisible()) {
    return true;
  }
  for (auto* anchor = aAnchor; anchor; anchor = anchor->GetParent()) {
    if (anchor->HasAnyStateBits(NS_FRAME_POSITION_VISIBILITY_HIDDEN)) {
      return true;
    }
  }
  return false;
}

static bool ComputePositionVisibility(
    PresShell* aPresShell, nsIFrame* aPositioned,
    AnchorPosReferenceData& aReferencedAnchors) {
  auto vis = aPositioned->StylePosition()->mPositionVisibility;
  if (vis & StylePositionVisibility::ALWAYS) {
    MOZ_ASSERT(vis == StylePositionVisibility::ALWAYS,
               "always can't be combined");
    return true;
  }
  if (vis & StylePositionVisibility::ANCHORS_VALID) {
    for (const auto& ref : aReferencedAnchors) {
      if (ref.GetData().isNothing()) {
        return false;
      }
    }
  }
  if (vis & StylePositionVisibility::NO_OVERFLOW) {
    const bool positionedFitsInCB =
        AnchorPositioningUtils::FitsInContainingBlock(aPositioned,
                                                      aReferencedAnchors);
    if (!positionedFitsInCB) {
      return false;
    }
  }
  if (vis & StylePositionVisibility::ANCHORS_VISIBLE) {
    const auto* defaultAnchorName = aReferencedAnchors.mDefaultAnchorName.get();
    auto anchorTreeScope = aReferencedAnchors.mAnchorTreeScope;
    if (defaultAnchorName) {
      auto* defaultAnchor = aPresShell->GetAnchorPosAnchor(
          {defaultAnchorName, anchorTreeScope}, aPositioned);
      if (defaultAnchor && AnchorIsEffectivelyHidden(defaultAnchor)) {
        return false;
      }
      auto* containingBlock = aPositioned->GetParent()->FirstInFlow();
      // If both are in the same cb the expectation is that this doesn't apply
      // because there are no intervening clips. I think that's broken, see
      // https://github.com/w3c/csswg-drafts/issues/13176
      if (defaultAnchor &&
          defaultAnchor->GetParent()->FirstInFlow() != containingBlock) {
        auto* intersectionRoot = containingBlock;
        nsRect rootRect = nsLayoutUtils::GetAllInFlowRectsUnion(
            intersectionRoot, containingBlock,
            nsLayoutUtils::GetAllInFlowRectsFlag::UseInkOverflowAsBox);
        if (IsScrolled(intersectionRoot)) {
          intersectionRoot = intersectionRoot->GetParent();
          ScrollContainerFrame* sc = do_QueryFrame(intersectionRoot);
          rootRect = sc->GetScrollPortRectAccountingForDynamicToolbar();
        }
        const auto* doc = aPositioned->PresContext()->Document();
        const nsINode* root =
            intersectionRoot->GetContent()
                ? static_cast<nsINode*>(intersectionRoot->GetContent())
                : doc;
        rootRect = nsLayoutUtils::TransformFrameRectToAncestor(
            intersectionRoot, rootRect,
            nsLayoutUtils::GetContainingBlockForClientRect(intersectionRoot));
        const auto input = dom::IntersectionInput{
            .mIsImplicitRoot = false,
            .mRootNode = root,
            .mRootFrame = intersectionRoot,
            .mRootRect = rootRect,
            .mRootMargin = {},
            .mScrollMargin = {},
            .mRemoteDocumentVisibleRect = {},
        };
        const auto output =
            dom::DOMIntersectionObserver::Intersect(input, defaultAnchor);
        // NOTE(emilio): It is a bit weird to also check that mIntersectionRect
        // is non-empty, see https://github.com/w3c/csswg-drafts/issues/13176.
        if (!output.Intersects() || (output.mIntersectionRect->IsEmpty() &&
                                     !defaultAnchor->GetRect().IsEmpty())) {
          return false;
        }
      }
    }
  }
  return true;
}

bool AnchorPositioningUtils::TriggerLayoutOnOverflow(PresShell* aPresShell,
                                                     bool aFirstIteration) {
  bool didLayoutPositionedItems = false;

  OverflowChangedTracker oct;
  AppliedShifts appliedShifts;
  for (auto* positioned : aPresShell->GetAnchorPosPositioned()) {
    AnchorPosReferenceData* referencedAnchors =
        positioned->GetProperty(nsIFrame::AnchorPosReferences());
    if (NS_WARN_IF(!referencedAnchors)) {
      continue;
    }

    if (aFirstIteration) {
      UpdateScrollShift(aPresShell, positioned, *referencedAnchors, oct,
                        appliedShifts);
    }

    if (TriggerFallbackReflow(aPresShell, positioned, *referencedAnchors,
                              aFirstIteration)) {
      didLayoutPositionedItems = true;
    }

    if (didLayoutPositionedItems) {
      // We'll come back to evaluate position-visibility later.
      continue;
    }
    const bool shouldBeVisible =
        ComputePositionVisibility(aPresShell, positioned, *referencedAnchors);
    const bool isVisible =
        !positioned->HasAnyStateBits(NS_FRAME_POSITION_VISIBILITY_HIDDEN);
    if (shouldBeVisible != isVisible) {
      positioned->AddOrRemoveStateBits(NS_FRAME_POSITION_VISIBILITY_HIDDEN,
                                       !shouldBeVisible);
      positioned->InvalidateFrameSubtree();
    }
  }
  oct.Flush();
  return didLayoutPositionedItems;
}

static const nsIFrame* GetMatchingContainingBlock(
    const nsIFrame* aAnchor, const nsIFrame* aContainingBlock) {
  MOZ_ASSERT(nsLayoutUtils::IsProperAncestorFrameConsideringContinuations(
      aContainingBlock, aAnchor));
  if ((!aContainingBlock->GetPrevContinuation() &&
       !aContainingBlock->GetNextContinuation()) ||
      nsLayoutUtils::IsProperAncestorFrame(aContainingBlock, aAnchor)) {
    return aContainingBlock;
  }
  for (const auto* f = aContainingBlock->GetPrevContinuation(); f;
       f = f->GetPrevContinuation()) {
    if (nsLayoutUtils::IsProperAncestorFrame(f, aAnchor)) {
      return f;
    }
  }
  for (const auto* f = aContainingBlock->GetNextContinuation(); f;
       f = f->GetNextContinuation()) {
    if (nsLayoutUtils::IsProperAncestorFrame(f, aAnchor)) {
      return f;
    }
  }
  return nullptr;
}

static nsSize InkOverflowSize(const nsIFrame* aFrame) {
  return aFrame->InkOverflowRectRelativeToSelf().Size();
}

static nscoord BSizeFromPhysicalSize(const nsSize& aSize,
                                     WritingMode aWritingMode) {
  return LogicalSize{aWritingMode, aSize}.BSize(aWritingMode);
}

nsRect AnchorPositioningUtils::ReassembleAnchorRect(
    const nsIFrame* aAnchor, const nsIFrame* aContainingBlock) {
  if (!aAnchor->PresContext()->FragmentainerAwarePositioningEnabled()) {
    // We aren't fragmenting abspos elements, with containing block sizes
    // not fit for proper reassembly. Given the context of this function (Anchor
    // positioning), we can safely assume that the containing block contains at
    // least one abspos frame (Anchor positioned frame), so skip reassembly.
    return nsLayoutUtils::GetCombinedFragmentRects(aAnchor, nullptr).mRect +
           aAnchor->GetOffsetToIgnoringScrolling(aContainingBlock);
  }
  aContainingBlock = GetMatchingContainingBlock(aAnchor, aContainingBlock);
  if (!aContainingBlock) {
    MOZ_ASSERT_UNREACHABLE("No matching containing block?");
    return nsRect{};
  }
  // Union fragments of the anchor within this containing block.
  const auto fragRect =
      nsLayoutUtils::GetCombinedFragmentRects(aAnchor, aContainingBlock);
  // This anchor is contained within this CB fragment, or the containing block
  // is inline.
  // TODO(dshin, bug 2014554): Handle inline containing blocks properly. Inline
  // CBs may continue over multiple lines, e.g. when an inline frame has a
  // `<br>`. In this case, stacking of containing blocks should take line height
  // into account.
  if ((!fragRect.mSkippedPrevContinuation &&
       !fragRect.mSkippedNextContinuation) ||
      aContainingBlock->IsInlineOutside()) {
    return fragRect.mRect;
  }
  // Ok, we need to reassemble the unfragmented size and position of the anchor,
  // by stacking up the containing block in block direction.
  const auto cbwm = aContainingBlock->GetWritingMode();
  // Note the use of ink overflow, since the anchor may overflow it.
  const auto cbSize = InkOverflowSize(aContainingBlock);
  LogicalRect unfragmentedAnchorRect{cbwm, fragRect.mRect, cbSize};
  LogicalSize relevantCbSize{cbwm, cbSize};

  const auto* prev = fragRect.mSkippedPrevContinuation;
  const auto* prevCb = aContainingBlock->GetPrevContinuation();
  while (prev) {
    MOZ_ASSERT(unfragmentedAnchorRect.BStart(cbwm) == 0,
               "Prev continuation exists but this continuation didn't hit "
               "block-start?");
    MOZ_ASSERT(nsLayoutUtils::IsProperAncestorFrame(prevCb, prev));

    const auto r = nsLayoutUtils::GetCombinedFragmentRects(prev, prevCb);
    const auto inkOverflowSize = InkOverflowSize(prevCb);
    const auto prevCBBSize = BSizeFromPhysicalSize(inkOverflowSize, cbwm);

    relevantCbSize.BSize(cbwm) += prevCBBSize;
    LogicalRect rect{cbwm, r.mRect, inkOverflowSize};
    MOZ_ASSERT(rect.BEnd(cbwm) == prevCBBSize,
               "Prev contination doesn't end at block-end?");

    // Use the previous continuation's rect as a base, using its origin, and
    // extending its inline/block size
    unfragmentedAnchorRect = LogicalRect{
        cbwm, rect.Origin(cbwm),
        LogicalSize{
            cbwm,
            std::max(unfragmentedAnchorRect.ISize(cbwm), rect.ISize(cbwm)),
            unfragmentedAnchorRect.BSize(cbwm) + rect.BSize(cbwm)}};

    prev = r.mSkippedPrevContinuation;
    prevCb = prevCb->GetPrevContinuation();
  }

  // We need to get through the rest of previous continuations here, since we
  // need block-start offset of the anchor.
  while (prevCb) {
    const auto prevCbBOffset =
        BSizeFromPhysicalSize(InkOverflowSize(prevCb), cbwm);
    relevantCbSize.BSize(cbwm) += prevCbBOffset;
    unfragmentedAnchorRect.MoveBy(cbwm, LogicalPoint{cbwm, 0, prevCbBOffset});

    prevCb = prevCb->GetPrevContinuation();
  }

  // Assemble fragments in the next block flow fragment.
  const auto* next = fragRect.mSkippedNextContinuation;
  const auto* nextCb = aContainingBlock->GetNextContinuation();
  while (next) {
    MOZ_ASSERT(
        unfragmentedAnchorRect.BEnd(cbwm) == relevantCbSize.BSize(cbwm),
        "Next continuation exists this continuation didn't hit block-end?");
    MOZ_ASSERT(nsLayoutUtils::IsProperAncestorFrame(nextCb, next));
    const auto r = nsLayoutUtils::GetCombinedFragmentRects(next, nextCb);

    const auto inkOverflowSize = InkOverflowSize(nextCb);
    relevantCbSize.BSize(cbwm) += BSizeFromPhysicalSize(inkOverflowSize, cbwm);
    LogicalRect rect{cbwm, r.mRect, inkOverflowSize};
    MOZ_ASSERT(rect.BStart(cbwm) == 0,
               "Next continuation doesn't start at block-start?");

    // Use the current combined anchor rect as a base, keeping its origin,
    // extending its inline/block size.
    unfragmentedAnchorRect = LogicalRect{
        cbwm, unfragmentedAnchorRect.Origin(cbwm),
        LogicalSize{
            cbwm,
            std::max(unfragmentedAnchorRect.ISize(cbwm), rect.ISize(cbwm)),
            unfragmentedAnchorRect.BSize(cbwm) + rect.BSize(cbwm)}};

    next = r.mSkippedNextContinuation;
    nextCb = nextCb->GetNextContinuation();
  }

  // Don't need to run through `nextCb` since reassembled anchor rect is fully
  // constrained by the start side.

  return unfragmentedAnchorRect.GetPhysicalRect(
      cbwm, relevantCbSize.GetPhysicalSize(cbwm));
}

}  // namespace mozilla
