/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_DocumentTimeline_h
#define mozilla_dom_DocumentTimeline_h

#include "mozilla/dom/Document.h"
#include "mozilla/dom/DocumentTimelineBinding.h"
#include "mozilla/LinkedList.h"
#include "mozilla/TimeStamp.h"
#include "AnimationTimeline.h"
#include "nsDOMNavigationTiming.h"  // for DOMHighResTimeStamp
#include "nsRefreshDriver.h"

struct JSContext;

namespace mozilla::dom {

class DocumentTimeline final : public AnimationTimeline,
                               public LinkedListElement<DocumentTimeline> {
 public:
  DocumentTimeline(Document* aDocument, const TimeDuration& aOriginTime);

 protected:
  virtual ~DocumentTimeline();

 public:
  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_SCRIPT_HOLDER_CLASS_INHERITED(DocumentTimeline,
                                                         AnimationTimeline)

  JSObject* WrapObject(JSContext*, JS::Handle<JSObject*> aGivenProto) override;

  static already_AddRefed<DocumentTimeline> Constructor(
      const GlobalObject& aGlobal, const DocumentTimelineOptions& aOptions,
      ErrorResult& aRv);

  // AnimationTimeline methods

  // This is deliberately _not_ called GetCurrentTime since that would clash
  // with a macro defined in winbase.h
  Nullable<TimeDuration> GetCurrentTimeAsDuration() const override;

  bool TracksWallclockTime() const override;
  Nullable<TimeDuration> ToTimelineTime(
      const TimeStamp& aTimeStamp) const override;
  TimeStamp ToTimeStamp(const TimeDuration& aTimelineTime) const override;

  void NotifyAnimationUpdated(Animation& aAnimation) override;

  void RemoveAnimation(Animation* aAnimation) override;
  void NotifyAnimationContentVisibilityChanged(Animation* aAnimation,
                                               bool aIsVisible) override;

  void TriggerAllPendingAnimationsNow();

  void WillRefresh();

  Document* GetDocument() const override { return mDocument; }

  void UpdateLastRefreshDriverTime();

  bool IsMonotonicallyIncreasing() const override { return true; }

 protected:
  TimeStamp GetCurrentTimeStamp() const;
  nsRefreshDriver* GetRefreshDriver() const;

  RefPtr<Document> mDocument;

  // The most recently used refresh driver time. This is used in cases where
  // we don't have a refresh driver (e.g. because we are in a display:none
  // iframe).
  TimeStamp mLastRefreshDriverTime;
  TimeDuration mOriginTime;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_DocumentTimeline_h
