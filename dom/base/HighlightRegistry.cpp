/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "HighlightRegistry.h"

#include "Document.h"
#include "Highlight.h"
#include "PresShell.h"
#include "mozilla/CompactPair.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/dom/HighlightBinding.h"
#include "mozilla/dom/HighlightRegistryBinding.h"
#include "nsAtom.h"
#include "nsCycleCollectionParticipant.h"
#include "nsFrameSelection.h"

namespace mozilla::dom {

NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE_CLASS(HighlightRegistry)

NS_IMPL_CYCLE_COLLECTION_UNLINK_BEGIN(HighlightRegistry)
  NS_IMPL_CYCLE_COLLECTION_UNLINK(mDocument)
  for (auto const& iter : tmp->mHighlightsOrdered) {
    iter.second()->RemoveFromHighlightRegistry(*tmp, *iter.first());
  }
  NS_IMPL_CYCLE_COLLECTION_UNLINK(mHighlightsOrdered)
  NS_IMPL_CYCLE_COLLECTION_UNLINK_PRESERVED_WRAPPER
NS_IMPL_CYCLE_COLLECTION_UNLINK_END

NS_IMPL_CYCLE_COLLECTION_TRAVERSE_BEGIN(HighlightRegistry)
  NS_IMPL_CYCLE_COLLECTION_TRAVERSE(mDocument)
  for (size_t i = 0; i < tmp->mHighlightsOrdered.Length(); ++i) {
    NS_IMPL_CYCLE_COLLECTION_TRAVERSE(mHighlightsOrdered[i].second())
  }
NS_IMPL_CYCLE_COLLECTION_TRAVERSE_END

NS_IMPL_CYCLE_COLLECTING_ADDREF(HighlightRegistry)
NS_IMPL_CYCLE_COLLECTING_RELEASE(HighlightRegistry)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(HighlightRegistry)
  NS_WRAPPERCACHE_INTERFACE_MAP_ENTRY
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END

HighlightRegistry::HighlightRegistry(Document* aDocument)
    : mDocument(aDocument) {}

HighlightRegistry::~HighlightRegistry() {
  for (auto const& iter : mHighlightsOrdered) {
    iter.second()->RemoveFromHighlightRegistry(*this, *iter.first());
  }
}

JSObject* HighlightRegistry::WrapObject(JSContext* aCx,
                                        JS::Handle<JSObject*> aGivenProto) {
  return HighlightRegistry_Binding::Wrap(aCx, this, aGivenProto);
}

void HighlightRegistry::MaybeAddRangeToHighlightSelection(
    AbstractRange& aRange, Highlight& aHighlight) {
  RefPtr<nsFrameSelection> frameSelection = GetFrameSelection();
  if (!frameSelection) {
    return;
  }
  MOZ_ASSERT(frameSelection->GetPresShell());
  Document* rangeDoc = aRange.GetComposedDocOfContainers();
  if (rangeDoc && rangeDoc != frameSelection->GetPresShell()->GetDocument()) {
    // Ranges in a different document must not be added. Detached ranges
    // (rangeDoc == null) are allowed so they are found by the painting code
    // once their nodes enter the document.
    return;
  }
  for (auto const& iter : mHighlightsOrdered) {
    if (iter.second() != &aHighlight) {
      continue;
    }

    const RefPtr<nsAtom> highlightName = iter.first();
    frameSelection->AddHighlightSelectionRange(highlightName, aHighlight,
                                               aRange);
  }
}

void HighlightRegistry::MaybeRemoveRangeFromHighlightSelection(
    AbstractRange& aRange, Highlight& aHighlight) {
  RefPtr<nsFrameSelection> frameSelection = GetFrameSelection();
  if (!frameSelection) {
    return;
  }
  MOZ_ASSERT(frameSelection->GetPresShell());

  for (auto const& iter : mHighlightsOrdered) {
    if (iter.second() != &aHighlight) {
      continue;
    }

    const RefPtr<nsAtom> highlightName = iter.first();
    frameSelection->RemoveHighlightSelectionRange(highlightName, aRange);
  }
}

void HighlightRegistry::RemoveHighlightSelection(Highlight& aHighlight) {
  RefPtr<nsFrameSelection> frameSelection = GetFrameSelection();
  if (!frameSelection) {
    return;
  }
  for (auto const& iter : mHighlightsOrdered) {
    if (iter.second() != &aHighlight) {
      continue;
    }

    const RefPtr<nsAtom> highlightName = iter.first();
    frameSelection->RemoveHighlightSelection(highlightName);
  }
}

void HighlightRegistry::RepaintHighlightSelection(Highlight& aHighlight) {
  RefPtr<nsFrameSelection> frameSelection = GetFrameSelection();
  if (!frameSelection) {
    return;
  }
  for (auto const& iter : mHighlightsOrdered) {
    if (iter.second() != &aHighlight) {
      continue;
    }

    const RefPtr<nsAtom> highlightName = iter.first();
    frameSelection->RepaintHighlightSelection(highlightName);
  }
}

void HighlightRegistry::RepaintAllHighlightSelections() {
  if (mHighlightsOrdered.IsEmpty()) {
    return;
  }
  RefPtr<nsFrameSelection> frameSelection = GetFrameSelection();
  if (!frameSelection) {
    return;
  }
  for (auto const& iter : mHighlightsOrdered) {
    frameSelection->RepaintHighlightSelection(iter.first());
  }
}

void HighlightRegistry::AddHighlightSelectionsToFrameSelection() {
  if (mHighlightsOrdered.IsEmpty()) {
    return;
  }
  RefPtr<nsFrameSelection> frameSelection = GetFrameSelection();
  if (!frameSelection) {
    return;
  }
  for (auto const& iter : mHighlightsOrdered) {
    RefPtr<nsAtom> highlightName = iter.first();
    RefPtr<Highlight> highlight = iter.second();
    frameSelection->AddHighlightSelection(highlightName, *highlight);
  }
}

HighlightRegistry* HighlightRegistry::Set(const nsAString& aKey,
                                          Highlight& aValue, ErrorResult& aRv) {
  // manually check if the highlight `aKey` is already registered to be able to
  // provide a fast path later that avoids calling `std::find_if()`.
  const bool highlightAlreadyPresent =
      HighlightRegistry_Binding::MaplikeHelpers::Has(this, aKey, aRv);
  if (aRv.Failed()) {
    return this;
  }
  HighlightRegistry_Binding::MaplikeHelpers::Set(this, aKey, aValue, aRv);
  if (aRv.Failed()) {
    return this;
  }
  RefPtr<nsFrameSelection> frameSelection = GetFrameSelection();
  RefPtr<nsAtom> highlightNameAtom = NS_AtomizeMainThread(aKey);
  if (highlightAlreadyPresent) {
    // If the highlight named `aKey` was present before, replace its value.
    auto foundIter =
        std::find_if(mHighlightsOrdered.begin(), mHighlightsOrdered.end(),
                     [&highlightNameAtom](auto const& aElm) {
                       return aElm.first() == highlightNameAtom;
                     });
    MOZ_ASSERT(foundIter != mHighlightsOrdered.end(),
               "webIDL maplike and DOM mirror are not in sync");
    foundIter->second()->RemoveFromHighlightRegistry(*this, *highlightNameAtom);
    if (frameSelection) {
      frameSelection->RemoveHighlightSelection(highlightNameAtom);
    }
    foundIter->second() = &aValue;
  } else {
    mHighlightsOrdered.AppendElement(
        CompactPair<RefPtr<nsAtom>, RefPtr<Highlight>>(highlightNameAtom,
                                                       &aValue));
  }
  aValue.AddToHighlightRegistry(*this, *highlightNameAtom);
  if (frameSelection) {
    frameSelection->AddHighlightSelection(highlightNameAtom, aValue);
  }
  return this;
}

void HighlightRegistry::Clear(ErrorResult& aRv) {
  HighlightRegistry_Binding::MaplikeHelpers::Clear(this, aRv);
  if (aRv.Failed()) {
    return;
  }
  auto frameSelection = GetFrameSelection();
  AutoFrameSelectionBatcher batcher(__FUNCTION__);
  batcher.AddFrameSelection(frameSelection);
  for (auto const& iter : mHighlightsOrdered) {
    const RefPtr<nsAtom>& highlightName = iter.first();
    const RefPtr<Highlight>& highlight = iter.second();
    highlight->RemoveFromHighlightRegistry(*this, *highlightName);
    if (frameSelection) {
      // The selection batcher makes sure that no script is run in this call.
      // However, `nsFrameSelection::RemoveHighlightSelection` is marked
      // `MOZ_CAN_RUN_SCRIPT`, therefore `MOZ_KnownLive` is needed regardless.
      frameSelection->RemoveHighlightSelection(MOZ_KnownLive(highlightName));
    }
  }

  mHighlightsOrdered.Clear();
}

bool HighlightRegistry::Delete(const nsAString& aKey, ErrorResult& aRv) {
  if (!HighlightRegistry_Binding::MaplikeHelpers::Delete(this, aKey, aRv)) {
    return false;
  }
  RefPtr<nsAtom> highlightNameAtom = NS_AtomizeMainThread(aKey);
  auto foundIter =
      std::find_if(mHighlightsOrdered.cbegin(), mHighlightsOrdered.cend(),
                   [&highlightNameAtom](auto const& aElm) {
                     return aElm.first() == highlightNameAtom;
                   });
  MOZ_ASSERT(foundIter != mHighlightsOrdered.cend(),
             "HighlightRegistry: maplike and internal data are out of sync!");

  RefPtr<Highlight> highlight = foundIter->second();
  mHighlightsOrdered.RemoveElementAt(foundIter);

  if (auto frameSelection = GetFrameSelection()) {
    frameSelection->RemoveHighlightSelection(highlightNameAtom);
  }
  highlight->RemoveFromHighlightRegistry(*this, *highlightNameAtom);
  return true;
}

// https://drafts.csswg.org/css-highlight-api-1/#dom-highlightregistry-highlightsfrompoint
void HighlightRegistry::HighlightsFromPoint(
    float aX, float aY, const HighlightsFromPointOptions& aOptions,
    nsTArray<HighlightHitResult>& aResult) {
  MOZ_ASSERT(mDocument);
  if (mHighlightsOrdered.IsEmpty()) {
    return;
  }

  // 1. If any of the following are true, return the empty sequence:
  //  - x is negative
  //  - y is negative
  if (aX < 0.0 || aY < 0.0) {
    return;
  }
  //  - x is greater than the viewport width excluding the size of a rendered
  //    scroll bar (if any)
  //  - y is greater than the viewport height excluding the size of a rendered
  //    scroll bar (if any)
  if (const auto* presShell = mDocument->GetPresShell()) {
    const nscoord xAsAppUnit = nsPresContext::CSSPixelsToAppUnits(aX);
    const nscoord yAsAppUnit = nsPresContext::CSSPixelsToAppUnits(aY);
    if (xAsAppUnit > presShell->GetLayoutViewportSize().Width() ||
        yAsAppUnit > presShell->GetLayoutViewportSize().Height()) {
      return;
    }
  } else {
    return;
  }

  // Layout must be flushed before the topmost-box check below and before
  // getClientRects() calls in RangesAtPoint(), to avoid flushing (which can
  // run script) from within those calls.
  mDocument->FlushPendingNotifications(FlushType::Layout);

  //  - The topmost box in the viewport in paint order that would be a target
  //    for hit testing at coordinates x,y has an element associated to it
  //    that's in a shadow tree whose shadow root is not contained by
  //    options.shadowRoots.
  ShadowRoot* pointShadowRoot = nullptr;
  if (RefPtr<Element> topmostElement = mDocument->ElementFromPointHelper(
          aX, aY, /* aIgnoreRootScrollFrame */ false,
          /* aFlushLayout */ false, ViewportType::Layout,
          /* aPerformRetargeting */ false)) {
    if (topmostElement->IsInShadowTree()) {
      pointShadowRoot = topmostElement->GetContainingShadow();
      if (!aOptions.mShadowRoots.Contains(pointShadowRoot)) {
        return;
      }
    }
  }

  // 2. Otherwise, let results be an empty sequence.
  // 3. For each Highlight highlight in this HighlightRegistry:
  for (const auto& namedHighlight : Reversed(mHighlightsOrdered)) {
    const auto& highlight = namedHighlight.second();
    // Note: Step 3.2 (iterate ranges) is implemented in RangesAtPoint().
    nsTArray<RefPtr<AbstractRange>> rangesAtPoint = highlight->RangesAtPoint(
        aX, aY, aOptions.mShadowRoots, pointShadowRoot);
    if (!rangesAtPoint.IsEmpty()) {
      HighlightHitResult highlightHitResult;
      highlightHitResult.mHighlight.Construct(*highlight);
      highlightHitResult.mRanges.Construct();
      const bool success = highlightHitResult.mRanges.Value().SetCapacity(
          rangesAtPoint.Length(), mozilla::fallible);
      if (!success) {
        return;
      }
      for (auto& range : rangesAtPoint) {
        (void)highlightHitResult.mRanges.Value().EmplaceBack(mozilla::fallible,
                                                             *range);
      }
      // 3.3. If result.ranges is not empty, append result to results.
      aResult.AppendElement(highlightHitResult);
    }
  }
  // 4. Sort results by descending order of priority of its HighlightHitResult's
  //    highlight attribute.

  // For equal priorities, the most recently registered highlight has higher
  // effective priority (see: https://github.com/w3c/csswg-drafts/issues/12002).
  // The iteration above is in reverse insertion order, so StableSort preserves
  // that ordering for equal-priority highlights.
  aResult.StableSort(
      [](const HighlightHitResult& el1, const HighlightHitResult& el2) {
        const int32_t p1 = el1.mHighlight.Value().Priority();
        const int32_t p2 = el2.mHighlight.Value().Priority();
        if (p2 > p1) return 1;
        if (p2 < p1) return -1;
        return 0;
      });
  // 5. Return results.
}

RefPtr<nsFrameSelection> HighlightRegistry::GetFrameSelection() {
  return RefPtr<nsFrameSelection>(
      mDocument->GetPresShell() ? mDocument->GetPresShell()->FrameSelection()
                                : nullptr);
}

}  // namespace mozilla::dom
