/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_ScrollTimeline_h
#define mozilla_dom_ScrollTimeline_h

#include "mozilla/LinkedList.h"
#include "mozilla/ServoStyleConsts.h"
#include "mozilla/WritingModes.h"
#include "mozilla/dom/AnimationTimeline.h"

#define PROGRESS_TIMELINE_DURATION_MILLISEC 100000

namespace mozilla {
class ScrollContainerFrame;
class ElementAnimationData;
struct NonOwningAnimationTarget;
namespace dom {
class Document;
class Element;

/**
 * Implementation notes
 * --------------------
 *
 * ScrollTimelines do not observe refreshes the way DocumentTimelines do.
 * This is because the refresh driver keeps ticking while it has registered
 * refresh observers. For a DocumentTimeline, it's appropriate to keep the
 * refresh driver ticking as long as there are active animations, since the
 * animations need to be sampled on every frame. Scroll-linked animations,
 * however, only need to be sampled when scrolling has occurred, so keeping
 * the refresh driver ticking is wasteful.
 *
 * As a result, we schedule an animation restyle when
 * 1) there are any scroll offsets updated (from APZ or script), via
 *    ScrollContainerFrame, or
 * 2) there are any possible scroll range updated during the frame reflow.
 *
 * -------------
 * | Animation |
 * -------------
 *   ^
 *   | Call Animation::Tick() if there are any scroll updates.
 *   |
 * ------------------
 * | ScrollTimeline |
 * ------------------
 *   ^
 *   | Try schedule the scroll-driven animations, if there are any scroll
 *   | offsets changed or the scroll range changed [1].
 *   |
 * ------------------------
 * | ScrollContainerFrame |
 * ------------------------
 *
 * [1] ScrollContainerFrame uses its associated dom::Element to lookup the
 *     ScrollTimelineSet, and iterates the set to schedule the animations
 *     linked to the ScrollTimelines.
 */
class ScrollTimeline : public AnimationTimeline,
                       public LinkedListElement<ScrollTimeline> {
  template <typename T, typename... Args>
  friend already_AddRefed<T> mozilla::MakeAndAddRef(Args&&... aArgs);

 public:
  struct Scroller {
    // FIXME: Bug 1765211. Perhaps we only need root and a specific element.
    // This depends on how we fix this bug.
    enum class Type : uint8_t {
      Root,
      Nearest,
      Name,
      Self,
    };
    Type mType = Type::Root;
    RefPtr<Element> mElement;
    // FIXME: Bug 1928437. We have to update mPseudoType to use
    // PseudoStyleRequest.
    PseudoStyleType mPseudoType;

    static Scroller Root(Element* aDocumentElement) {
      return {Type::Root, aDocumentElement, PseudoStyleType::NotPseudo};
    }

    static Scroller Nearest(Element* aElement, PseudoStyleType aPseudoType) {
      return {Type::Nearest, aElement, aPseudoType};
    }

    static Scroller Named(Element* aElement, PseudoStyleType aPseudoType) {
      return {Type::Name, aElement, aPseudoType};
    }

    static Scroller Self(Element* aElement, PseudoStyleType aPseudoType) {
      return {Type::Self, aElement, aPseudoType};
    }

    explicit operator bool() const { return mElement; }
    bool operator==(const Scroller& aOther) const {
      return mType == aOther.mType && mElement == aOther.mElement &&
             mPseudoType == aOther.mPseudoType;
    }
  };

  static already_AddRefed<ScrollTimeline> MakeAnonymous(
      Document* aDocument, const NonOwningAnimationTarget& aTarget,
      StyleScrollAxis aAxis, StyleScroller aScroller);

  // Note: |aReferfenceElement| is used as the scroller which specifies
  // scroll-timeline-name property.
  static already_AddRefed<ScrollTimeline> MakeNamed(
      Document* aDocument, Element* aReferenceElement,
      const PseudoStyleRequest& aPseudoRequest,
      const StyleScrollTimeline& aStyleTimeline);

  bool operator==(const ScrollTimeline& aOther) const {
    return mDocument == aOther.mDocument && mSource == aOther.mSource &&
           mAxis == aOther.mAxis;
  }

  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(ScrollTimeline, AnimationTimeline)

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override {
    // FIXME: Bug 1676794: Implement ScrollTimeline interface.
    return nullptr;
  }

  // AnimationTimeline methods.
  Nullable<TimeDuration> GetCurrentTimeAsDuration() const override;
  bool TracksWallclockTime() const override { return false; }
  Nullable<TimeDuration> ToTimelineTime(
      const TimeStamp& aTimeStamp) const override {
    // It's unclear to us what should we do for this function now, so return
    // nullptr.
    return nullptr;
  }
  TimeStamp ToTimeStamp(const TimeDuration& aTimelineTime) const override {
    // It's unclear to us what should we do for this function now, so return
    // zero time.
    return {};
  }
  Document* GetDocument() const override { return mDocument; }
  bool IsMonotonicallyIncreasing() const override { return false; }
  bool IsScrollTimeline() const override { return true; }
  const ScrollTimeline* AsScrollTimeline() const override { return this; }
  bool IsViewTimeline() const override { return false; }

  Nullable<TimeDuration> TimelineDuration() const override {
    // We are using this magic number for progress-based timeline duration
    // because we don't support percentage for duration.
    return TimeDuration::FromMilliseconds(PROGRESS_TIMELINE_DURATION_MILLISEC);
  }

  void WillRefresh();

  // If the source of a ScrollTimeline is an element whose principal box does
  // not exist or is not a scroll container, then its phase is the timeline
  // inactive phase. It is otherwise in the active phase. This returns true if
  // the timeline is in active phase.
  // https://drafts.csswg.org/web-animations-1/#inactive-timeline
  // Note: This function is called only for compositor animations, so we must
  // have the primary frame (principal box) for the source element if it exists.
  bool IsActive() const { return GetScrollContainerFrame(); }

  Element* SourceElement() const {
    MOZ_ASSERT(mSource);
    return mSource.mElement;
  }

  // A helper to get the physical orientation of this scroll-timeline.
  layers::ScrollDirection Axis() const;

  StyleOverflow SourceScrollStyle() const;

  bool APZIsActiveForSource() const;

  bool ScrollingDirectionIsAvailable() const;

  void ReplacePropertiesWith(const Element* aReferenceElement,
                             const PseudoStyleRequest& aPseudoRequest,
                             const StyleScrollTimeline& aNew);

  void NotifyAnimationUpdated(Animation& aAnimation) override;

  void NotifyAnimationContentVisibilityChanged(Animation* aAnimation,
                                               bool aIsVisible) override;

  void UpdateCachedCurrentTime();

 protected:
  virtual ~ScrollTimeline();
  ScrollTimeline() = delete;
  ScrollTimeline(Document* aDocument, const Scroller& aScroller,
                 StyleScrollAxis aAxis);

  struct ScrollOffsets {
    nscoord mStart = 0;
    nscoord mEnd = 0;
  };
  virtual Maybe<ScrollOffsets> ComputeOffsets(
      const ScrollContainerFrame* aScrollFrame,
      layers::ScrollDirection aOrientation) const;

  // Note: This function is required to be idempotent, as it can be called from
  // both cycleCollection::Unlink() and ~ScrollTimeline(). When modifying this
  // function, be sure to preserve this property.
  void Teardown() {
    if (isInList()) {
      remove();
    }
  }

  const ScrollContainerFrame* GetScrollContainerFrame() const;

  static std::pair<const Element*, PseudoStyleRequest> FindNearestScroller(
      Element* aSubject, const PseudoStyleRequest& aPseudoRequest);

  RefPtr<Document> mDocument;

  // FIXME: Bug 1765211: We may have to update the source element once the
  // overflow property of the scroll-container is updated when we are using
  // nearest scroller.
  Scroller mSource;
  StyleScrollAxis mAxis;

  struct CurrentTimeData {
    // The position of the scroller, and this may be negative for RTL or
    // sideways, e.g. the range of its value could be [0, -range]. The user
    // needs to take care of that.
    nscoord mPosition;
    ScrollOffsets mOffsets;
  };
  Maybe<CurrentTimeData> mCachedCurrentTime;
};

}  // namespace dom
}  // namespace mozilla

#endif  // mozilla_dom_ScrollTimeline_h
