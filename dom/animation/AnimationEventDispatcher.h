/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_AnimationEventDispatcher_h
#define mozilla_AnimationEventDispatcher_h

#include "mozilla/AnimationComparator.h"
#include "mozilla/Attributes.h"
#include "mozilla/EventDispatcher.h"
#include "mozilla/ProfilerMarkers.h"
#include "mozilla/Variant.h"
#include "mozilla/dom/Document.h"
#include "mozilla/dom/KeyframeEffect.h"
#include "nsCycleCollectionParticipant.h"
#include "nsPresContext.h"

class nsRefreshDriver;

namespace mozilla {

struct AnimationEventInfo {
  struct CssAnimationOrTransitionData {
    OwningAnimationTarget mTarget;
    const EventMessage mMessage;
    const double mElapsedTime;
    // The transition generation or animation relative position in the global
    // animation list. We use this information to determine the order of
    // cancelled transitions or animations. (i.e. We override the animation
    // index of the cancelled transitions/animations because their animation
    // indexes have been changed.)
    const uint64_t mAnimationIndex;
    // FIXME(emilio): is this needed? This preserves behavior from before
    // bug 1847200, but it's unclear what the timeStamp of the event should be.
    // See also https://github.com/w3c/csswg-drafts/issues/9167
    const TimeStamp mEventEnqueueTimeStamp{TimeStamp::Now()};
  };

  struct CssAnimationData : public CssAnimationOrTransitionData {
    const RefPtr<nsAtom> mAnimationName;
  };

  struct CssTransitionData : public CssAnimationOrTransitionData {
    // For transition events only.
    const CSSPropertyId mProperty;
  };

  struct WebAnimationData {
    const RefPtr<nsAtom> mOnEvent;
    const dom::Nullable<double> mCurrentTime;
    const dom::Nullable<double> mTimelineTime;
    const TimeStamp mEventEnqueueTimeStamp{TimeStamp::Now()};
  };

  using Data = Variant<CssAnimationData, CssTransitionData, WebAnimationData>;

  RefPtr<dom::Animation> mAnimation;
  TimeStamp mScheduledEventTimeStamp;
  Data mData;

  OwningAnimationTarget* GetOwningAnimationTarget() {
    if (mData.is<CssAnimationData>()) {
      return &mData.as<CssAnimationData>().mTarget;
    }
    if (mData.is<CssTransitionData>()) {
      return &mData.as<CssTransitionData>().mTarget;
    }
    return nullptr;
  }

  // Return the event context if the event is animationcancel or
  // transitioncancel.
  Maybe<dom::Animation::EventContext> GetEventContext() const {
    if (mData.is<CssAnimationData>()) {
      const auto& data = mData.as<CssAnimationData>();
      return Some(dom::Animation::EventContext{
          NonOwningAnimationTarget(data.mTarget), data.mAnimationIndex});
    }
    if (mData.is<CssTransitionData>()) {
      const auto& data = mData.as<CssTransitionData>();
      return Some(dom::Animation::EventContext{
          NonOwningAnimationTarget(data.mTarget), data.mAnimationIndex});
    }
    return Nothing();
  }

  void MaybeAddMarker() const;

  // For CSS animation events
  AnimationEventInfo(RefPtr<nsAtom> aAnimationName,
                     const NonOwningAnimationTarget& aTarget,
                     EventMessage aMessage, double aElapsedTime,
                     uint64_t aAnimationIndex,
                     const TimeStamp& aScheduledEventTimeStamp,
                     dom::Animation* aAnimation)
      : mAnimation(aAnimation),
        mScheduledEventTimeStamp(aScheduledEventTimeStamp),
        mData(CssAnimationData{
            {OwningAnimationTarget(aTarget.mElement, aTarget.mPseudoRequest),
             aMessage, aElapsedTime, aAnimationIndex},
            std::move(aAnimationName)}) {
    if (profiler_thread_is_being_profiled_for_markers()) {
      MaybeAddMarker();
    }
  }

  // For CSS transition events
  AnimationEventInfo(const CSSPropertyId& aProperty,
                     const NonOwningAnimationTarget& aTarget,
                     EventMessage aMessage, double aElapsedTime,
                     uint64_t aTransitionGeneration,
                     const TimeStamp& aScheduledEventTimeStamp,
                     dom::Animation* aAnimation)
      : mAnimation(aAnimation),
        mScheduledEventTimeStamp(aScheduledEventTimeStamp),
        mData(CssTransitionData{
            {OwningAnimationTarget(aTarget.mElement, aTarget.mPseudoRequest),
             aMessage, aElapsedTime, aTransitionGeneration},
            aProperty}) {
    if (profiler_thread_is_being_profiled_for_markers()) {
      MaybeAddMarker();
    }
  }

  // For web animation events
  AnimationEventInfo(nsAtom* aOnEvent,
                     const dom::Nullable<double>& aCurrentTime,
                     const dom::Nullable<double>& aTimelineTime,
                     TimeStamp&& aScheduledEventTimeStamp,
                     dom::Animation* aAnimation)
      : mAnimation(aAnimation),
        mScheduledEventTimeStamp(std::move(aScheduledEventTimeStamp)),
        mData(WebAnimationData{RefPtr{aOnEvent}, aCurrentTime, aTimelineTime}) {
  }

  AnimationEventInfo(const AnimationEventInfo& aOther) = delete;
  AnimationEventInfo& operator=(const AnimationEventInfo& aOther) = delete;

  AnimationEventInfo(AnimationEventInfo&& aOther) = default;
  AnimationEventInfo& operator=(AnimationEventInfo&& aOther) = default;

  int32_t Compare(const AnimationEventInfo& aOther,
                  nsContentUtils::NodeIndexCache& aCache) const {
    if (mScheduledEventTimeStamp != aOther.mScheduledEventTimeStamp) {
      // Null timestamps sort first
      if (mScheduledEventTimeStamp.IsNull()) {
        return -1;
      }
      if (aOther.mScheduledEventTimeStamp.IsNull()) {
        return 1;
      }
      return mScheduledEventTimeStamp < aOther.mScheduledEventTimeStamp ? -1
                                                                        : 1;
    }

    // Events in the Web Animations spec are prior to CSS events.
    if (IsWebAnimationEvent() != aOther.IsWebAnimationEvent()) {
      return IsWebAnimationEvent() ? -1 : 1;
    }

    return mAnimation->CompareCompositeOrder(GetEventContext(),
                                             *aOther.mAnimation,
                                             aOther.GetEventContext(), aCache);
  }

  bool IsWebAnimationEvent() const { return mData.is<WebAnimationData>(); }

  // TODO: Convert this to MOZ_CAN_RUN_SCRIPT (bug 1415230)
  MOZ_CAN_RUN_SCRIPT_BOUNDARY void Dispatch(nsPresContext* aPresContext);
};

class AnimationEventDispatcher final {
 public:
  explicit AnimationEventDispatcher(nsPresContext* aPresContext)
      : mPresContext(aPresContext), mIsSorted(true) {}

  NS_INLINE_DECL_CYCLE_COLLECTING_NATIVE_REFCOUNTING(AnimationEventDispatcher)
  NS_DECL_CYCLE_COLLECTION_NATIVE_CLASS(AnimationEventDispatcher)

  void Disconnect();

  void QueueEvent(AnimationEventInfo&& aEvent);
  void QueueEvents(nsTArray<AnimationEventInfo>&& aEvents);

  // This will call SortEvents automatically if it has not already been
  // called.
  void DispatchEvents() {
    if (!mPresContext || mPendingEvents.IsEmpty()) {
      return;
    }

    SortEvents();

    EventArray events = std::move(mPendingEvents);
    // mIsSorted will be set to true by SortEvents above, and we leave it
    // that way since mPendingEvents is now empty
    for (AnimationEventInfo& info : events) {
      info.Dispatch(mPresContext);

      // Bail out if our mPresContext was nullified due to destroying the pres
      // context.
      if (!mPresContext) {
        break;
      }
    }
  }

  void ClearEventQueue() {
    mPendingEvents.Clear();
    mIsSorted = true;
  }
  bool HasQueuedEvents() const { return !mPendingEvents.IsEmpty(); }

  // There shouldn't be a lot of events in the queue, so linear search should be
  // fine.
  bool HasQueuedEventsFor(const dom::Animation* aAnimation) const {
    for (const AnimationEventInfo& info : mPendingEvents) {
      if (info.mAnimation.get() == aAnimation) {
        return true;
      }
    }
    return false;
  }

 private:
  ~AnimationEventDispatcher() = default;

  // Sort all pending CSS animation/transition events by scheduled event time
  // and composite order.
  // https://drafts.csswg.org/web-animations/#update-animations-and-send-events
  void SortEvents() {
    if (mIsSorted) {
      return;
    }

    struct AnimationEventInfoComparator {
      mutable nsContentUtils::NodeIndexCache mCache;

      bool LessThan(const AnimationEventInfo& aOne,
                    const AnimationEventInfo& aOther) const {
        return aOne.Compare(aOther, mCache) < 0;
      }
    };

    mPendingEvents.StableSort(AnimationEventInfoComparator());
    mIsSorted = true;
  }
  void ScheduleDispatch();

  nsPresContext* mPresContext;
  using EventArray = nsTArray<AnimationEventInfo>;
  EventArray mPendingEvents;
  bool mIsSorted;
};

}  // namespace mozilla

#endif  // mozilla_AnimationEventDispatcher_h
