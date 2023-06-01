/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ScrollTimeline.h"

#include "mozilla/dom/Animation.h"
#include "mozilla/dom/ElementInlines.h"
#include "mozilla/AnimationTarget.h"
#include "mozilla/DisplayPortUtils.h"
#include "mozilla/PresShell.h"
#include "nsIFrame.h"
#include "nsIScrollableFrame.h"
#include "nsLayoutUtils.h"

namespace mozilla::dom {

// ---------------------------------
// Methods of ScrollTimeline
// ---------------------------------

NS_IMPL_CYCLE_COLLECTION_CLASS(ScrollTimeline)
NS_IMPL_CYCLE_COLLECTION_UNLINK_BEGIN_INHERITED(ScrollTimeline,
                                                AnimationTimeline)
  tmp->Teardown();
  NS_IMPL_CYCLE_COLLECTION_UNLINK(mDocument)
  NS_IMPL_CYCLE_COLLECTION_UNLINK(mSource.mElement)
NS_IMPL_CYCLE_COLLECTION_UNLINK_END
NS_IMPL_CYCLE_COLLECTION_TRAVERSE_BEGIN_INHERITED(ScrollTimeline,
                                                  AnimationTimeline)
  NS_IMPL_CYCLE_COLLECTION_TRAVERSE(mDocument)
  NS_IMPL_CYCLE_COLLECTION_TRAVERSE(mSource.mElement)
NS_IMPL_CYCLE_COLLECTION_TRAVERSE_END

NS_IMPL_CYCLE_COLLECTION_TRACE_BEGIN_INHERITED(ScrollTimeline,
                                               AnimationTimeline)
NS_IMPL_CYCLE_COLLECTION_TRACE_END

NS_IMPL_ISUPPORTS_CYCLE_COLLECTION_INHERITED_0(ScrollTimeline,
                                               AnimationTimeline)

ScrollTimeline::ScrollTimeline(Document* aDocument, const Scroller& aScroller,
                               StyleScrollAxis aAxis)
    : AnimationTimeline(aDocument->GetParentObject(),
                        aDocument->GetScopeObject()->GetRTPCallerType()),
      mDocument(aDocument),
      mSource(aScroller),
      mAxis(aAxis) {
  MOZ_ASSERT(aDocument);
}

/* static */
already_AddRefed<ScrollTimeline> ScrollTimeline::GetOrCreateScrollTimeline(
    Document* aDocument, const Scroller& aScroller,
    const StyleScrollAxis& aAxis) {
  MOZ_ASSERT(aScroller);

  RefPtr<ScrollTimeline> timeline;
  auto* set =
      ScrollTimelineSet::GetOrCreateScrollTimelineSet(aScroller.mElement);
  auto key = ScrollTimelineSet::Key{aScroller.mType, aAxis};
  auto p = set->LookupForAdd(key);
  if (!p) {
    timeline = new ScrollTimeline(aDocument, aScroller, aAxis);
    set->Add(p, key, timeline);
  } else {
    timeline = p->value();
  }
  return timeline.forget();
}

/* static */
already_AddRefed<ScrollTimeline> ScrollTimeline::FromAnonymousScroll(
    Document* aDocument, const NonOwningAnimationTarget& aTarget,
    StyleScrollAxis aAxis, StyleScroller aScroller) {
  MOZ_ASSERT(aTarget);
  Scroller scroller;
  switch (aScroller) {
    case StyleScroller::Root:
      scroller = Scroller::Root(aTarget.mElement->OwnerDoc());
      break;
    case StyleScroller::Nearest: {
      Element* curr = aTarget.mElement->GetFlattenedTreeParentElement();
      Element* root = aTarget.mElement->OwnerDoc()->GetDocumentElement();
      while (curr && curr != root) {
        const ComputedStyle* style = Servo_Element_GetMaybeOutOfDateStyle(curr);
        MOZ_ASSERT(style, "The ancestor should be styled.");
        if (style->StyleDisplay()->IsScrollableOverflow()) {
          break;
        }
        curr = curr->GetFlattenedTreeParentElement();
      }
      // If there is no scroll container, we use root.
      scroller = Scroller::Nearest(curr ? curr : root);
    }
  }
  return GetOrCreateScrollTimeline(aDocument, scroller, aAxis);
}

/* static*/ already_AddRefed<ScrollTimeline> ScrollTimeline::FromNamedScroll(
    Document* aDocument, const NonOwningAnimationTarget& aTarget,
    const nsAtom* aName) {
  MOZ_ASSERT(NS_IsMainThread());
  MOZ_ASSERT(aTarget);

  // A named scroll progress timeline is referenceable in animation-timeline by:
  // 1. the declaring element itself
  // 2. that element’s descendants
  // 3. that element’s following siblings and their descendants
  // https://drafts.csswg.org/scroll-animations-1/#timeline-scope
  Element* result = nullptr;
  StyleScrollAxis axis = StyleScrollAxis::Block;
  for (Element* curr = aTarget.mElement; curr;
       curr = curr->GetParentElement()) {
    // If multiple elements have declared the same timeline name, the matching
    // timeline is the one declared on the nearest element in tree order, which
    // considers siblings closer than parents.
    // Note: This should be fine for parallel traversal because we update
    // animations by SequentialTask.
    for (Element* e = curr; e; e = e->GetPreviousElementSibling()) {
      const ComputedStyle* style = Servo_Element_GetMaybeOutOfDateStyle(e);
      // The elements in the shadow dom might not be in the flat tree.
      if (!style) {
        continue;
      }

      const nsStyleUIReset* ui = style->StyleUIReset();
      // Note: scroll-timeline is a coordinated property list, so we use the
      // count of the base property, scroll-timeline-name, as the max length.
      for (uint32_t i = 0; i < ui->mScrollTimelineNameCount; ++i) {
        const auto& timeline = ui->mScrollTimelines[i];
        if (timeline.GetName() == aName) {
          result = e;
          axis = timeline.GetAxis();
          break;
        }
      }

      if (result) {
        break;
      }
    }

    if (result) {
      break;
    }
  }

  // If we cannot find a matched scroll-timeline-name, this animation is not
  // associated with a timeline.
  // https://drafts.csswg.org/css-animations-2/#typedef-timeline-name
  if (!result) {
    return nullptr;
  }
  Scroller scroller = Scroller::Named(result);
  return GetOrCreateScrollTimeline(aDocument, scroller, axis);
}

Nullable<TimeDuration> ScrollTimeline::GetCurrentTimeAsDuration() const {
  // If no layout box, this timeline is inactive.
  if (!mSource || !mSource.mElement->GetPrimaryFrame()) {
    return nullptr;
  }

  // if this is not a scroller container, this timeline is inactive.
  const nsIScrollableFrame* scrollFrame = GetScrollFrame();
  if (!scrollFrame) {
    return nullptr;
  }

  const auto orientation = Axis();

  // If this orientation is not ready for scrolling (i.e. the scroll range is
  // not larger than or equal to one device pixel), we make it 100%.
  if (!scrollFrame->GetAvailableScrollingDirections().contains(orientation)) {
    return TimeDuration::FromMilliseconds(PROGRESS_TIMELINE_DURATION_MILLISEC);
  }

  const nsPoint& scrollOffset = scrollFrame->GetScrollPosition();
  const nsRect& scrollRange = scrollFrame->GetScrollRange();
  const bool isHorizontal = orientation == layers::ScrollDirection::eHorizontal;

  // Note: For RTL, scrollOffset.x or scrollOffset.y may be negative, e.g. the
  // range of its value is [0, -range], so we have to use the absolute value.
  double position = std::abs(isHorizontal ? scrollOffset.x : scrollOffset.y);
  double range = isHorizontal ? scrollRange.width : scrollRange.height;
  MOZ_ASSERT(range > 0.0);
  // Use the definition of interval progress to compute the progress.
  // Note: We simplify the scroll offsets to [0%, 100%], so offset weight and
  // offset index are ignored here.
  // https://drafts.csswg.org/scroll-animations-1/#progress-calculation-algorithm
  double progress = position / range;
  return TimeDuration::FromMilliseconds(progress *
                                        PROGRESS_TIMELINE_DURATION_MILLISEC);
}

layers::ScrollDirection ScrollTimeline::Axis() const {
  MOZ_ASSERT(mSource && mSource.mElement->GetPrimaryFrame());

  const WritingMode wm = mSource.mElement->GetPrimaryFrame()->GetWritingMode();
  return mAxis == StyleScrollAxis::Horizontal ||
                 (!wm.IsVertical() && mAxis == StyleScrollAxis::Inline) ||
                 (wm.IsVertical() && mAxis == StyleScrollAxis::Block)
             ? layers::ScrollDirection::eHorizontal
             : layers::ScrollDirection::eVertical;
}

StyleOverflow ScrollTimeline::SourceScrollStyle() const {
  MOZ_ASSERT(mSource && mSource.mElement->GetPrimaryFrame());

  const nsIScrollableFrame* scrollFrame = GetScrollFrame();
  MOZ_ASSERT(scrollFrame);

  const ScrollStyles scrollStyles = scrollFrame->GetScrollStyles();

  return Axis() == layers::ScrollDirection::eHorizontal
             ? scrollStyles.mHorizontal
             : scrollStyles.mVertical;
}

bool ScrollTimeline::APZIsActiveForSource() const {
  MOZ_ASSERT(mSource);
  return gfxPlatform::AsyncPanZoomEnabled() &&
         !nsLayoutUtils::ShouldDisableApzForElement(mSource.mElement) &&
         DisplayPortUtils::HasNonMinimalNonZeroDisplayPort(mSource.mElement);
}

bool ScrollTimeline::ScrollingDirectionIsAvailable() const {
  const nsIScrollableFrame* scrollFrame = GetScrollFrame();
  MOZ_ASSERT(scrollFrame);
  return scrollFrame->GetAvailableScrollingDirections().contains(Axis());
}

void ScrollTimeline::UnregisterFromScrollSource() {
  if (!mSource) {
    return;
  }

  if (ScrollTimelineSet* scrollTimelineSet =
          ScrollTimelineSet::GetScrollTimelineSet(mSource.mElement)) {
    scrollTimelineSet->Remove(ScrollTimelineSet::Key{mSource.mType, mAxis});
    if (scrollTimelineSet->IsEmpty()) {
      ScrollTimelineSet::DestroyScrollTimelineSet(mSource.mElement);
    }
  }
}

const nsIScrollableFrame* ScrollTimeline::GetScrollFrame() const {
  if (!mSource) {
    return nullptr;
  }

  switch (mSource.mType) {
    case Scroller::Type::Root:
      if (const PresShell* presShell =
              mSource.mElement->OwnerDoc()->GetPresShell()) {
        return presShell->GetRootScrollFrameAsScrollable();
      }
      return nullptr;
    case Scroller::Type::Nearest:
    case Scroller::Type::Name:
      return nsLayoutUtils::FindScrollableFrameFor(mSource.mElement);
  }

  MOZ_ASSERT_UNREACHABLE("Unsupported scroller type");
  return nullptr;
}

// ---------------------------------
// Methods of ScrollTimelineSet
// ---------------------------------

/* static */ ScrollTimelineSet* ScrollTimelineSet::GetScrollTimelineSet(
    Element* aElement) {
  return aElement ? static_cast<ScrollTimelineSet*>(aElement->GetProperty(
                        nsGkAtoms::scrollTimelinesProperty))
                  : nullptr;
}

/* static */ ScrollTimelineSet* ScrollTimelineSet::GetOrCreateScrollTimelineSet(
    Element* aElement) {
  MOZ_ASSERT(aElement);
  ScrollTimelineSet* scrollTimelineSet = GetScrollTimelineSet(aElement);
  if (scrollTimelineSet) {
    return scrollTimelineSet;
  }

  scrollTimelineSet = new ScrollTimelineSet();
  nsresult rv = aElement->SetProperty(
      nsGkAtoms::scrollTimelinesProperty, scrollTimelineSet,
      nsINode::DeleteProperty<ScrollTimelineSet>, true);
  if (NS_FAILED(rv)) {
    NS_WARNING("SetProperty failed");
    delete scrollTimelineSet;
    return nullptr;
  }
  return scrollTimelineSet;
}

/* static */ void ScrollTimelineSet::DestroyScrollTimelineSet(
    Element* aElement) {
  aElement->RemoveProperty(nsGkAtoms::scrollTimelinesProperty);
}

}  // namespace mozilla::dom
