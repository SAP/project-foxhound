/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_PerformanceEventTiming_h_
#define mozilla_dom_PerformanceEventTiming_h_

#include "Performance.h"
#include "mozilla/EventForwards.h"
#include "mozilla/dom/PerformanceEntry.h"
#include "nsINode.h"
#include "nsIWeakReferenceUtils.h"
#include "nsRFPService.h"

namespace mozilla {
class WidgetEvent;
namespace dom {

class PerformanceEventTiming final
    : public PerformanceEntry,
      public LinkedListElement<RefPtr<PerformanceEventTiming>> {
 public:
  NS_DECL_ISUPPORTS_INHERITED

  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(PerformanceEventTiming,
                                           PerformanceEntry)

  static already_AddRefed<PerformanceEventTiming> TryGenerateEventTiming(
      const EventTarget* aTarget, const WidgetEvent* aEvent);

  already_AddRefed<PerformanceEventTiming> Clone() {
    RefPtr<PerformanceEventTiming> eventTiming =
        new PerformanceEventTiming(*this);
    return eventTiming.forget();
  }

  JSObject* WrapObject(JSContext* cx,
                       JS::Handle<JSObject*> aGivenProto) override;

  DOMHighResTimeStamp ProcessingStart() const {
    if (mCachedProcessingStart.isNothing()) {
      mCachedProcessingStart.emplace(nsRFPService::ReduceTimePrecisionAsMSecs(
          mProcessingStart, mPerformance->GetRandomTimelineSeed(),
          mPerformance->GetRTPCallerType()));
    }
    return mCachedProcessingStart.value();
  }

  DOMHighResTimeStamp ProcessingEnd() const {
    if (mCachedProcessingEnd.isNothing()) {
      mCachedProcessingEnd.emplace(nsRFPService::ReduceTimePrecisionAsMSecs(
          mProcessingEnd, mPerformance->GetRandomTimelineSeed(),
          mPerformance->GetRTPCallerType()));
    }
    return mCachedProcessingEnd.value();
  }

  bool Cancelable() const { return mCancelable; }

  uint64_t InteractionId() const { return mInteractionId.valueOr(0); }
  bool HasKnownInteractionId() const { return mInteractionId.isSome(); }

  void SetInteractionId(Maybe<uint64_t> aInteractionId) {
    mInteractionId = aInteractionId;
  }

  void SetInteractionId(uint64_t aInteractionId) {
    mInteractionId = Some(aInteractionId);
  }

  nsINode* GetTarget() const;

  void SetDuration(const DOMHighResTimeStamp aDuration) {
    mDuration = Some(aDuration);
  }

  // nsRFPService::ReduceTimePrecisionAsMSecs might causes
  // some memory overhead, using the raw timestamp internally
  // to avoid calling in unnecessarily.
  Maybe<DOMHighResTimeStamp> RawDuration() const { return mDuration; }

  DOMHighResTimeStamp Duration() const override {
    if (mCachedDuration.isNothing()) {
      // Round the duration to the nearest 8ms.
      // https://w3c.github.io/event-timing/#set-event-timing-entry-duration
      DOMHighResTimeStamp roundedDuration =
          std::round(mDuration.valueOr(0) / 8) * 8;
      mCachedDuration.emplace(nsRFPService::ReduceTimePrecisionAsMSecs(
          roundedDuration, mPerformance->GetRandomTimelineSeed(),
          mPerformance->GetRTPCallerType()));
    }
    return mCachedDuration.value();
  }

  // Similar as RawDuration; Used to avoid calling
  // nsRFPService::ReduceTimePrecisionAsMSecs unnecessarily.
  DOMHighResTimeStamp RawStartTime() const { return mStartTime; }

  DOMHighResTimeStamp StartTime() const override {
    if (mCachedStartTime.isNothing()) {
      mCachedStartTime.emplace(nsRFPService::ReduceTimePrecisionAsMSecs(
          mStartTime, mPerformance->GetRandomTimelineSeed(),
          mPerformance->GetRTPCallerType()));
    }
    return mCachedStartTime.value();
  }

  bool ShouldAddEntryToBuffer(double aDuration) const;
  bool ShouldAddEntryToObserverBuffer(PerformanceObserverInit&) const override;

  void BufferEntryIfNeeded() override;

  void FinalizeEventTiming(const WidgetEvent* aEvent);

  EventMessage GetMessage() const { return mMessage; }

 private:
  PerformanceEventTiming(Performance* aPerformance, const nsAString& aName,
                         const TimeStamp& aStartTime, bool aIsCancelable,
                         EventMessage aMessage);

  PerformanceEventTiming(const PerformanceEventTiming& aEventTimingEntry);

  ~PerformanceEventTiming() = default;

  RefPtr<Performance> mPerformance;

  DOMHighResTimeStamp mProcessingStart;
  mutable Maybe<DOMHighResTimeStamp> mCachedProcessingStart;

  DOMHighResTimeStamp mProcessingEnd;
  mutable Maybe<DOMHighResTimeStamp> mCachedProcessingEnd;

  nsWeakPtr mTarget;

  DOMHighResTimeStamp mStartTime;
  mutable Maybe<DOMHighResTimeStamp> mCachedStartTime;

  Maybe<DOMHighResTimeStamp> mDuration;
  mutable Maybe<DOMHighResTimeStamp> mCachedDuration;

  bool mCancelable;

  Maybe<uint64_t> mInteractionId;

  EventMessage mMessage;
};
}  // namespace dom
}  // namespace mozilla

#endif
