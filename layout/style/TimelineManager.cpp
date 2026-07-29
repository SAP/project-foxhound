/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "TimelineManager.h"

#include "mozilla/ElementAnimationData.h"
#include "mozilla/dom/Element.h"
#include "mozilla/dom/ElementInlines.h"
#include "mozilla/dom/ScrollTimeline.h"
#include "mozilla/dom/ViewTimeline.h"
#include "nsPresContext.h"

namespace mozilla {
using dom::Element;
using dom::ScrollTimeline;
using dom::ViewTimeline;

TimelineManager::TimelineManager(nsPresContext* aPresContext)
    : mPresContext(aPresContext) {}

template <typename TimelineType>
struct TimelineTargetMatches {
  bool operator()(const TimelineType* aTimeline) {
    const auto target = aTimeline->TimelineTarget();
    return target.mElement == mElement &&
           target.mPseudoRequest == mPseudoRequest;
  }

  const Element* mElement;
  const PseudoStyleRequest& mPseudoRequest;
};

#ifdef DEBUG
template <typename TimelineType>
void TimelineManager::EnsureNoTimelineTarget(
    const TimelineTargetsIter<TimelineType>& aStart,
    const TimelineTargetsIter<TimelineType>& aEnd, const Element* aElement,
    const PseudoStyleRequest& aPseudoRequest) {
  const auto duplicateIt = std::find_if(
      aStart, aEnd,
      TimelineTargetMatches<TimelineType>{aElement, aPseudoRequest});
  // We should have one entry of the name for each target (See
  // `BuildTimelines`).
  MOZ_ASSERT(duplicateIt == aEnd, "Unexpected timeline target entry?");
}
#endif

template <typename TimelineType>
auto TimelineManager::FindInTimelineTargets(
    Timelines<TimelineType>& aTimelineTargets, const Element* aElement,
    const PseudoStyleRequest& aPseudoRequest)
    -> TimelineTargetsIter<TimelineType> {
  return std::find_if(
      aTimelineTargets.cbegin(), aTimelineTargets.cend(),
      TimelineTargetMatches<TimelineType>{aElement, aPseudoRequest});
}

template <typename TimelineType>
void TimelineManager::RemoveTimelineTargetByName(
    const nsAtom* aName, const Element* aElement,
    const PseudoStyleRequest& aPseudoRequest,
    TimelineNameMap<TimelineType>& aTimelineNameMap) {
  auto result = aTimelineNameMap.Lookup(aName);
  if (!result) {
    MOZ_ASSERT_UNREACHABLE("Trying to erase a non-existing timeline");
    return;
  }
  auto& targets = result.Data();
  MOZ_ASSERT(!targets.IsEmpty(), "Keeping an empty timeline list in map?");
  auto foundIt = FindInTimelineTargets(targets, aElement, aPseudoRequest);
  if (foundIt != targets.cend()) {
    DebugOnly<TimelineTargetsIter<TimelineType>> afterIt =
        targets.RemoveElementAt(foundIt);
#ifdef DEBUG
    EnsureNoTimelineTarget<TimelineType>(afterIt.value, targets.cend(),
                                         aElement, aPseudoRequest);
#endif
  }
  if (targets.IsEmpty()) {
    aTimelineNameMap.Remove(aName);
  }
}

template <typename TimelineType>
nsTArray<RefPtr<const nsAtom>> TimelineManager::TryDestroyTimeline(
    Element* aElement, const PseudoStyleRequest& aPseudoRequest,
    TimelineNameMap<TimelineType>& aTimelineNameMap) {
  auto* collection =
      TimelineCollection<TimelineType>::Get(aElement, aPseudoRequest);
  if (!collection) {
    return {};
  }
  nsTArray<RefPtr<const nsAtom>> result{collection->Timelines().Count()};
  for (const auto& name : collection->Timelines().Keys()) {
    result.AppendElement(name);
    RemoveTimelineTargetByName(name, aElement, aPseudoRequest,
                               aTimelineNameMap);
  }
  collection->Destroy();
  return result;
}

nsTArray<RefPtr<const nsAtom>> TimelineManager::UpdateTimelines(
    Element* aElement, const PseudoStyleRequest& aPseudoRequest,
    const ComputedStyle* aComputedStyle, ProgressTimelineType aType) {
  MOZ_ASSERT(
      aElement->IsInComposedDoc(),
      "No need to update timelines that are not attached to the document tree");

  // If we are in a display:none subtree we will have no computed values.
  // However, if we are on the root of display:none subtree, the computed values
  // might not have been cleared yet. In either case, since CSS animations
  // should not run in display:none subtrees, so we don't need timeline, either.
  const bool shouldDestroyTimelines =
      !aComputedStyle ||
      aComputedStyle->StyleDisplay()->mDisplay == StyleDisplay::None;

  switch (aType) {
    case ProgressTimelineType::Scroll:
      if (shouldDestroyTimelines) {
        return TryDestroyTimeline<ScrollTimeline>(aElement, aPseudoRequest,
                                                  mScrollTimelineNameMap);
      }
      return DoUpdateTimelines<ScrollTimeline>(
          mPresContext, aElement, aPseudoRequest,
          aComputedStyle->StyleUIReset(), mScrollTimelineNameMap);

    case ProgressTimelineType::View:
      if (shouldDestroyTimelines) {
        return TryDestroyTimeline<ViewTimeline>(aElement, aPseudoRequest,
                                                mViewTimelineNameMap);
      }
      return DoUpdateTimelines<ViewTimeline>(
          mPresContext, aElement, aPseudoRequest,
          aComputedStyle->StyleUIReset(), mViewTimelineNameMap);
  }
  MOZ_ASSERT_UNREACHABLE("Unhandled timelinetype?");
  return {};
}

void TimelineManager::UpdateTimelineScopes(
    const dom::Element* aElement, const ComputedStyle* aComputedStyle) {
  const auto timelineScope =
      aComputedStyle->StyleUIReset()->mTimelineScope.value.AsSpan();
  auto it = std::find_if(
      mTimelineScopes.begin(), mTimelineScopes.end(),
      [&](const auto& aEntry) { return aEntry.mElement == aElement; });
  if (timelineScope.IsEmpty()) {
    // Delete the entry & we're done.
    MOZ_ASSERT(it != mTimelineScopes.end(), "Timeline scopes out of sync");
    mTimelineScopes.RemoveElementAt(it);
    return;
  }

  TimelineScopeEntry* entry = nullptr;
  if (it == mTimelineScopes.end()) {
    // Skip the scope of the name - timeline names aren't scoped.
    // https://github.com/w3c/csswg-drafts/issues/8135
    entry = mTimelineScopes.AppendElement(TimelineScopeEntry{
        aElement,
        {},
    });
  } else {
    entry = &(*it);
    // Just clear existing names, likely not worth reusing.
    entry->mNames.Clear();
  }

  if (timelineScope[0].AsAtom() == nsGkAtoms::all) {
    MOZ_ASSERT(timelineScope.Length() == 1);
    // We represent "all" with the empty list.
    return;
  }

  for (const auto& name : timelineScope) {
    entry->mNames.AppendElement(name.AsAtom());
  }
}

auto TimelineManager::GetTimelineScope(const dom::Element* aScopeElement,
                                       const nsAtom* aName) const
    -> const TimelineScopeEntry* {
  auto it = std::find_if(mTimelineScopes.cbegin(), mTimelineScopes.cend(),
                         [&](const auto& aEntry) {
                           if (aEntry.mElement != aScopeElement) {
                             return false;
                           }
                           return aEntry.mNames.IsEmpty() ||
                                  std::find_if(aEntry.mNames.cbegin(),
                                               aEntry.mNames.cend(),
                                               [&](const auto& aScopeName) {
                                                 return aScopeName == aName;
                                               }) != aEntry.mNames.cend();
                         });
  if (it == mTimelineScopes.cend()) {
    return nullptr;
  }
  return &(*it);
}

template <typename TimelineType>
TimelineType* TimelineManager::DoGetScopedTimeline(
    const Element* aScopeElement, const nsAtom* aName,
    const TimelineNameMap<TimelineType>& aTimelineNameMap,
    bool& aDuplicateFound) const {
  const auto candidates = aTimelineNameMap.Lookup(aName);
  if (!candidates) {
    return nullptr;
  }
  aDuplicateFound = false;

  auto ScopeIsValid = [&](const Element* aTimelineCandidate,
                          const Element* aExpectedScope) {
    const auto* e = aTimelineCandidate->GetFlattenedTreeParentElement();
    for (; e && e != aExpectedScope; e = e->GetFlattenedTreeParentElement()) {
      if (GetTimelineScope(e, aName)) {
        // This timeline-scope declaring element blocks this timeline from being
        // visible to aExpectedScope.
        // TODO(dshin): This is a lot of linear traversals...
        return false;
      }
    }
    return e == aExpectedScope;
  };

  TimelineType* result = nullptr;
  bool found = false;
  for (const auto& candidate : candidates.Data()) {
    if (!ScopeIsValid(candidate->TimelineTarget().mElement, aScopeElement)) {
      continue;
    }
    if (found) {
      // See comment in `GetScopedTimeline` duplicate handling.
      aDuplicateFound = true;
      return nullptr;
    }
    found = true;
    result = candidate;
  }
  return result;
}

Maybe<already_AddRefed<dom::AnimationTimeline>>
TimelineManager::GetScopedTimeline(const dom::Element* aScopeElement,
                                   const nsAtom* aName) const {
  if (!GetTimelineScope(aScopeElement, aName)) {
    return Nothing{};
  }

  bool duplicateFound = false;
  // Search for a scroll timeline of this name.
  auto* scrollTimeline = DoGetScopedTimeline(
      aScopeElement, aName, mScrollTimelineNameMap, duplicateFound);
  if (duplicateFound) {
    return Some(nullptr);
  }

  // Also search for a view timeline of this name (See below as to why).
  auto* viewTimeline = DoGetScopedTimeline(
      aScopeElement, aName, mViewTimelineNameMap, duplicateFound);
  if (duplicateFound) {
    return Some(nullptr);
  }

  if (viewTimeline && scrollTimeline) {
    // Both timelines exist. Unlike the non-scoped referencing rules [1], we
    // don't care to figure out precedence, and just return the no timeline [2].
    // [1]: https://drafts.csswg.org/scroll-animations-1/#timeline-scoping
    // [2]: https://drafts.csswg.org/scroll-animations-1/#timeline-scope
    return Some(nullptr);
  }

  dom::AnimationTimeline* result =
      scrollTimeline ? scrollTimeline : viewTimeline;
  if (result) {
    result->AddRef();
  }
  return Some(result);
}

template <typename TimelineType>
static already_AddRefed<TimelineType> PopExistingTimeline(
    nsAtom* aName, TimelineCollection<TimelineType>* aCollection) {
  if (!aCollection) {
    return nullptr;
  }
  return aCollection->Extract(aName);
}

// Per-property cycling: when {scroll,view}-timeline-axis (or
// view-timeline-inset) has fewer values than view-timeline-name, the value list
// is repeated to match. See
// https://drafts.csswg.org/css-values-4/#linked-properties
template <typename TimelineType>
struct TimelineBuilder;

template <>
struct TimelineBuilder<ScrollTimeline> {
  static size_t NameCount(const nsStyleUIReset* aUI) {
    return aUI->mScrollTimelineNameCount;
  }
  static nsAtom* Name(const nsStyleUIReset* aUI, size_t aIdx) {
    return aUI->GetScrollTimelineName(aIdx);
  }
  static already_AddRefed<ScrollTimeline> Make(
      nsPresContext* aPC, Element* aElement, const PseudoStyleRequest& aPseudo,
      const nsStyleUIReset* aUI, size_t aIdx) {
    return ScrollTimeline::MakeNamed(aPC->Document(), aElement, aPseudo,
                                     aUI->GetScrollTimelineAxis(aIdx));
  }
  static void Replace(ScrollTimeline* aDest, Element* aElement,
                      const PseudoStyleRequest& aPseudo, nsAtom* aName,
                      const nsStyleUIReset* aUI, size_t aIdx) {
    aDest->ReplacePropertiesWith(aElement, aPseudo, aName,
                                 aUI->GetScrollTimelineAxis(aIdx));
  }
};

template <>
struct TimelineBuilder<ViewTimeline> {
  static size_t NameCount(const nsStyleUIReset* aUI) {
    return aUI->mViewTimelineNameCount;
  }
  static nsAtom* Name(const nsStyleUIReset* aUI, size_t aIdx) {
    return aUI->GetViewTimelineName(aIdx);
  }
  static already_AddRefed<ViewTimeline> Make(nsPresContext* aPC,
                                             Element* aElement,
                                             const PseudoStyleRequest& aPseudo,
                                             const nsStyleUIReset* aUI,
                                             size_t aIdx) {
    return ViewTimeline::MakeNamed(aPC->Document(), aElement, aPseudo,
                                   aUI->GetViewTimelineAxis(aIdx),
                                   aUI->GetViewTimelineInset(aIdx));
  }
  static void Replace(ViewTimeline* aDest, Element* aElement,
                      const PseudoStyleRequest& aPseudo, nsAtom* aName,
                      const nsStyleUIReset* aUI, size_t aIdx) {
    aDest->ReplacePropertiesWith(aElement, aPseudo, aName,
                                 aUI->GetViewTimelineAxis(aIdx),
                                 aUI->GetViewTimelineInset(aIdx));
  }
};

template <typename TimelineType>
static auto BuildTimelines(nsPresContext* aPresContext, Element* aElement,
                           const PseudoStyleRequest& aPseudoRequest,
                           const nsStyleUIReset* aUIReset,
                           TimelineCollection<TimelineType>* aCollection) {
  using Builder = TimelineBuilder<TimelineType>;
  typename TimelineCollection<TimelineType>::TimelineMap result;
  const size_t count = Builder::NameCount(aUIReset);
  // If multiple timelines are attempting to modify the same property, then the
  // timeline closest to the end of the list of names wins [1].
  // [1]: https://drafts.csswg.org/scroll-animations-1/#timeline-scoping
  for (size_t idx = 0; idx < count; ++idx) {
    nsAtom* name = Builder::Name(aUIReset, idx);
    if (name == nsGkAtoms::_empty) {
      continue;
    }

    RefPtr<TimelineType> dest = PopExistingTimeline(name, aCollection);
    if (dest) {
      Builder::Replace(dest, aElement, aPseudoRequest, name, aUIReset, idx);
    } else {
      dest =
          Builder::Make(aPresContext, aElement, aPseudoRequest, aUIReset, idx);
    }
    MOZ_ASSERT(dest);

    // Override the previous one if it is duplicated.
    (void)result.InsertOrUpdate(name, dest);
  }
  return result;
}

template <typename TimelineType>
static TimelineCollection<TimelineType>& EnsureTimelineCollection(
    Element& aElement, const PseudoStyleRequest& aPseudoRequest);

template <>
ScrollTimelineCollection& EnsureTimelineCollection<ScrollTimeline>(
    Element& aElement, const PseudoStyleRequest& aPseudoRequest) {
  return aElement.EnsureAnimationData().EnsureScrollTimelineCollection(
      aElement, aPseudoRequest);
}

template <>
ViewTimelineCollection& EnsureTimelineCollection<ViewTimeline>(
    Element& aElement, const PseudoStyleRequest& aPseudoRequest) {
  return aElement.EnsureAnimationData().EnsureViewTimelineCollection(
      aElement, aPseudoRequest);
}

template <typename TimelineType>
nsTArray<RefPtr<const nsAtom>> TimelineManager::DoUpdateTimelines(
    nsPresContext* aPresContext, Element* aElement,
    const PseudoStyleRequest& aPseudoRequest, const nsStyleUIReset* aUIReset,
    TimelineNameMap<TimelineType>& aTimelineNameMap) {
  using Builder = TimelineBuilder<TimelineType>;
  auto* collection =
      TimelineCollection<TimelineType>::Get(aElement, aPseudoRequest);
  if (!collection && Builder::NameCount(aUIReset) == 1 &&
      Builder::Name(aUIReset, 0) == nsGkAtoms::_empty) {
    return {};
  }

  // We create a new timeline list based on its computed style and the existing
  // timelines.
  auto newTimelines = BuildTimelines<TimelineType>(
      aPresContext, aElement, aPseudoRequest, aUIReset, collection);

  if (newTimelines.IsEmpty()) {
    nsTArray<RefPtr<const nsAtom>> result{
        collection ? collection->Timelines().Count() : 0};
    if (collection) {
      for (const auto& name : collection->Timelines().Keys()) {
        result.AppendElement(name);
        RemoveTimelineTargetByName(name, aElement, aPseudoRequest,
                                   aTimelineNameMap);
      }
      collection->Destroy();
    }
    return result;
  }

  if (!collection) {
    collection =
        &EnsureTimelineCollection<TimelineType>(*aElement, aPseudoRequest);
    if (!collection->isInList()) {
      AddTimelineCollection(collection);
    }
  }

  nsTArray<RefPtr<const nsAtom>> result{collection->Timelines().Count() +
                                        newTimelines.Count()};
  for (const auto& removed : collection->Timelines().Keys()) {
    result.AppendElement(removed);
    RemoveTimelineTargetByName(removed, aElement, aPseudoRequest,
                               aTimelineNameMap);
  }

  // Replace unused timeline with new ones.
  collection->Swap(newTimelines);

  for (auto addedOrExisting = collection->Timelines().ConstIter();
       !addedOrExisting.Done(); addedOrExisting.Next()) {
    auto& targets = aTimelineNameMap.LookupOrInsert(addedOrExisting.Key(),
                                                    Timelines<TimelineType>{});
    auto foundIt = FindInTimelineTargets(targets, aElement, aPseudoRequest);
    if (foundIt != targets.cend()) {
#ifdef DEBUG
      EnsureNoTimelineTarget<TimelineType>(foundIt + 1, targets.cend(),
                                           aElement, aPseudoRequest);
#endif
      continue;
    }
    result.AppendElement(addedOrExisting.Key());
    targets.AppendElement(addedOrExisting.Data());
  }

  // FIXME: Bug 1774060. We may have to restyle the animations which use the
  // dropped timelines. Or rely on restyling the subtree and the following
  // siblings when mutating {scroll|view}-timeline-name.
  return result;
}

}  // namespace mozilla
