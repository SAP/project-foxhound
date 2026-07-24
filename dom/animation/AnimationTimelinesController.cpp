/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "AnimationTimelinesController.h"

#include "mozilla/dom/DocumentTimeline.h"
#include "mozilla/dom/ScrollTimeline.h"

namespace mozilla::dom {

void AnimationTimelinesController::AddDocumentTimeline(
    DocumentTimeline& aTimeline) {
  mDocumentTimelines.insertBack(&aTimeline);
}

void AnimationTimelinesController::AddScrollTimeline(
    ScrollTimeline& aTimeline) {
  mScrollTimelines.insertBack(&aTimeline);
}

void AnimationTimelinesController::WillRefresh() {
  for (DocumentTimeline* tl :
       ToTArray<AutoTArray<RefPtr<DocumentTimeline>, 32>>(mDocumentTimelines)) {
    tl->WillRefresh();
  }

  for (ScrollTimeline* tl :
       ToTArray<AutoTArray<RefPtr<ScrollTimeline>, 32>>(mScrollTimelines)) {
    tl->WillRefresh();
  }
}

void AnimationTimelinesController::UpdateLastRefreshDriverTime() {
  for (DocumentTimeline* timeline : mDocumentTimelines) {
    timeline->UpdateLastRefreshDriverTime();
  }
  // We don't use refresh driver time stamp for scroll timelines.
}

void AnimationTimelinesController::TriggerAllPendingAnimationsNow() {
  for (DocumentTimeline* timeline : mDocumentTimelines) {
    timeline->TriggerAllPendingAnimationsNow();
  }

  // FIXME: Bug 1805950. This is used for testing and printing. We may have to
  // revisit there when supporting printing for scroll-timelines ()
}

void AnimationTimelinesController::UpdateHiddenByContentVisibility() {
  for (AnimationTimeline* timeline : mDocumentTimelines) {
    timeline->UpdateHiddenByContentVisibility();
  }

  for (AnimationTimeline* timeline : mScrollTimelines) {
    timeline->UpdateHiddenByContentVisibility();
  }
}

void AnimationTimelinesController::TrySampleScrollTimelines() {
  for (ScrollTimeline* timeline : mScrollTimelines) {
    timeline->UpdateCachedCurrentTime();
  }
}

}  // namespace mozilla::dom
