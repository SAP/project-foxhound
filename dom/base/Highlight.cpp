/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "Highlight.h"

#include "AbstractRange.h"
#include "Document.h"
#include "HighlightRegistry.h"
#include "Selection.h"
#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/StaticAnalysisFunctions.h"
#include "mozilla/dom/HighlightBinding.h"
#include "nsFrameSelection.h"
#include "nsLayoutUtils.h"
#include "nsPIDOMWindow.h"
#include "nsPresContext.h"

namespace mozilla::dom {

NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE(Highlight, mRanges, mWindow)

NS_IMPL_CYCLE_COLLECTING_ADDREF(Highlight)
NS_IMPL_CYCLE_COLLECTING_RELEASE(Highlight)

NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(Highlight)
  NS_WRAPPERCACHE_INTERFACE_MAP_ENTRY
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END

Highlight::Highlight(
    const Sequence<OwningNonNull<AbstractRange>>& aInitialRanges,
    nsPIDOMWindowInner* aWindow, ErrorResult& aRv)
    : mWindow(aWindow) {
  for (RefPtr<AbstractRange> range : aInitialRanges) {
    Add(*range, aRv);
    if (aRv.Failed()) {
      return;
    }
  }
}

already_AddRefed<Highlight> Highlight::Constructor(
    const GlobalObject& aGlobal,
    const Sequence<OwningNonNull<AbstractRange>>& aInitialRanges,
    ErrorResult& aRv) {
  MOZ_ASSERT(NS_IsMainThread());
  nsCOMPtr<nsPIDOMWindowInner> window =
      do_QueryInterface(aGlobal.GetAsSupports());
  if (!window) {
    aRv.ThrowUnknownError(
        "There is no window associated to "
        "this highlight object!");
    return nullptr;
  }

  RefPtr<Highlight> highlight = new Highlight(aInitialRanges, window, aRv);
  return aRv.Failed() ? nullptr : highlight.forget();
}

void Highlight::AddToHighlightRegistry(HighlightRegistry& aHighlightRegistry,
                                       nsAtom& aHighlightName) {
  mHighlightRegistries.LookupOrInsert(&aHighlightRegistry)
      .Insert(&aHighlightName);
}

void Highlight::RemoveFromHighlightRegistry(
    HighlightRegistry& aHighlightRegistry, nsAtom& aHighlightName) {
  if (auto entry = mHighlightRegistries.Lookup(&aHighlightRegistry)) {
    auto& highlightNames = entry.Data();
    highlightNames.Remove(&aHighlightName);
    if (highlightNames.IsEmpty()) {
      entry.Remove();
    }
  }
}

void Highlight::Repaint() {
  for (const RefPtr<HighlightRegistry>& registry :
       mHighlightRegistries.Keys()) {
    registry->RepaintHighlightSelection(*this);
  }
}

void Highlight::SetPriority(int32_t aPriority) {
  if (mPriority == aPriority) {
    return;
  }
  mPriority = aPriority;
  Repaint();
}

void Highlight::SetType(HighlightType aHighlightType) {
  if (mHighlightType == aHighlightType) {
    return;
  }
  mHighlightType = aHighlightType;
  Repaint();
}

Highlight* Highlight::Add(AbstractRange& aRange, ErrorResult& aRv) {
  // Manually check if the range `aKey` is already present in this highlight,
  // because `SetlikeHelpers::Add()` doesn't indicate this.
  // To keep the setlike and the mirrored array in sync, the range must not
  // be added to `mRanges` if it was already present.
  // `SetlikeHelpers::Has()` is much faster in checking this than
  // `nsTArray<>::Contains()`.
  if (Highlight_Binding::SetlikeHelpers::Has(this, aRange, aRv) ||
      aRv.Failed()) {
    return this;
  }
  Highlight_Binding::SetlikeHelpers::Add(this, aRange, aRv);
  if (aRv.Failed()) {
    return this;
  }

  MOZ_ASSERT(!mRanges.Contains(&aRange),
             "setlike and DOM mirror are not in sync");

  mRanges.AppendElement(&aRange);
  AutoFrameSelectionBatcher selectionBatcher(__FUNCTION__,
                                             mHighlightRegistries.Count());
  for (const RefPtr<HighlightRegistry>& registry :
       mHighlightRegistries.Keys()) {
    auto frameSelection = registry->GetFrameSelection();
    selectionBatcher.AddFrameSelection(frameSelection);
    // since this is run in a context guarded by a selection batcher,
    // no strong reference is needed to keep `registry` alive.
    MOZ_KnownLive(registry)->MaybeAddRangeToHighlightSelection(aRange, *this);
    if (aRv.Failed()) {
      return this;
    }
  }
  return this;
}

void Highlight::Clear(ErrorResult& aRv) {
  Highlight_Binding::SetlikeHelpers::Clear(this, aRv);
  if (!aRv.Failed()) {
    mRanges.Clear();
    AutoFrameSelectionBatcher selectionBatcher(__FUNCTION__,
                                               mHighlightRegistries.Count());

    for (const RefPtr<HighlightRegistry>& registry :
         mHighlightRegistries.Keys()) {
      auto frameSelection = registry->GetFrameSelection();
      selectionBatcher.AddFrameSelection(frameSelection);
      // since this is run in a context guarded by a selection batcher,
      // no strong reference is needed to keep `registry` alive.
      MOZ_KnownLive(registry)->RemoveHighlightSelection(*this);
    }
  }
}

bool Highlight::Delete(AbstractRange& aRange, ErrorResult& aRv) {
  if (Highlight_Binding::SetlikeHelpers::Delete(this, aRange, aRv)) {
    mRanges.RemoveElement(&aRange);
    AutoFrameSelectionBatcher selectionBatcher(__FUNCTION__,
                                               mHighlightRegistries.Count());

    for (const RefPtr<HighlightRegistry>& registry :
         mHighlightRegistries.Keys()) {
      auto frameSelection = registry->GetFrameSelection();
      selectionBatcher.AddFrameSelection(frameSelection);
      // since this is run in a context guarded by a selection batcher,
      // no strong reference is needed to keep `registry` alive.
      MOZ_KnownLive(registry)->MaybeRemoveRangeFromHighlightSelection(aRange,
                                                                      *this);
    }
    return true;
  }
  return false;
}

// Callback that sets mHit if any rect covers (xAppUnits, yAppUnits).
struct PointHitCallback : public RectCallback {
  const nscoord mX, mY;
  bool mHit = false;
  PointHitCallback(nscoord aX, nscoord aY) : mX(aX), mY(aY) {}
  void AddRect(const nsRect& aRect) override {
    if (!mHit) {
      mHit = aRect.Contains(mX, mY);
    }
  }
};

// https://drafts.csswg.org/css-highlight-api-1/#dom-highlightregistry-highlightsfrompoint
nsTArray<RefPtr<AbstractRange>> Highlight::RangesAtPoint(
    float aX, float aY,
    const Sequence<OwningNonNull<mozilla::dom::ShadowRoot>>& aShadowRoots,
    ShadowRoot* aPointShadowRoot) const {
  AutoTArray<RefPtr<AbstractRange>, 4> rangesAtPoint;

  // Convert once; all client rects from CollectClientRects() are in app units.
  const nscoord xAppUnits = nsPresContext::CSSPixelsToAppUnits(aX);
  const nscoord yAppUnits = nsPresContext::CSSPixelsToAppUnits(aY);

  // 3.2. For each AbstractRange abstractRange in highlight:
  for (const auto& range : mRanges) {
    // 3.2.1. If abstractRange is an invalid StaticRange, then continue.
    if (range->IsStaticRange() && !range->AsStaticRange()->IsValid()) {
      continue;
    }
    if (!range->IsPositioned()) {
      continue;
    }

    // The spec leaves hit-testing details out of scope. As an implementation
    // choice we filter ranges by shadow tree membership relative to the point:
    //  - If the point is in shadow tree T (aPointShadowRoot), only include
    //    ranges whose closestCommonAncestorContainer is also in T. Highlights
    //    rooted in the light DOM don’t paint over shadow DOM content, even if
    //    their client rects happen to cover the shadow host’s layout box.
    //  - If the point is in the light DOM, skip ranges whose
    //    closestCommonAncestorContainer is in a shadow tree not listed in
    //    options.shadowRoots.
    const nsINode* closestCommonAncestor =
        range->GetClosestCommonInclusiveAncestor();
    if (!closestCommonAncestor) {
      continue;
    }
    if (aPointShadowRoot) {
      if (closestCommonAncestor->GetContainingShadow() != aPointShadowRoot) {
        continue;
      }
    } else if (closestCommonAncestor->IsInShadowTree() &&
               !aShadowRoots.Contains(
                   closestCommonAncestor->GetContainingShadow())) {
      continue;
    }

    // 3.2.2. Let range be a new Range whose start/end nodes and offsets are
    //        set to abstractRange’s.
    // Omitted: getClientRects() is implemented directly on AbstractRange, so no
    // temporary Range object is needed.
    // 3.2.3. If the coordinates x,y fall inside at least one of the DOMRects
    //        returned by calling getClientRects() on range, then append
    //        abstractRange to result.ranges.
    // Note: Layout was already flushed at the callsite.
    PointHitCallback hitTest(xAppUnits, yAppUnits);
    range->CollectClientRects(hitTest, /* aClampToEdge */ true);
    if (hitTest.mHit) {
      rangesAtPoint.AppendElement(range);
    }
  }
  return std::move(rangesAtPoint);
}

JSObject* Highlight::WrapObject(JSContext* aCx,
                                JS::Handle<JSObject*> aGivenProto) {
  return Highlight_Binding::Wrap(aCx, this, aGivenProto);
}

}  // namespace mozilla::dom
