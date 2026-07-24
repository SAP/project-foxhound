/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "DepthOrderedFrameList.h"

#include "nsContainerFrame.h"
#include "nsIFrame.h"

namespace mozilla {

void DepthOrderedFrameList::Add(nsIFrame* aFrame) {
  MOZ_ASSERT(aFrame);

  if (auto p = mFrames.lookupForAdd(aFrame)) {
    // We don't expect the depth of a frame in the list to change.
    MOZ_ASSERT(p->value() == aFrame->GetDepthInFrameTree());
  } else {
    if (!mFrames.add(p, aFrame, aFrame->GetDepthInFrameTree())) {
      NS_WARNING("failed to add frame to DepthOrderedFrameList");
    }
    if (mFrames.count() == 1) {
      // We just added the first frame, so can directly set up mSortedFrames.
      // (Lists that only contain a single frame are common.)
      MOZ_ASSERT(mSortedFrames.IsEmpty());
      mSortedFrames.AppendElement(FrameAndDepth{aFrame, p->value()});
    } else {
      // Clear mSortedFrames, so that we'll rebuild it when needed.
      mSortedFrames.ClearAndRetainStorage();
    }
  }
}

nsIFrame* DepthOrderedFrameList::PopShallowestRoot() {
  MOZ_ASSERT(!mFrames.empty(), "no frames in list!");

  EnsureSortedList();

  // List is sorted in order of decreasing depth, so there are no shallower
  // frames than the last one.
  const FrameAndDepth& lastFAD = mSortedFrames.PopLastElement();
  nsIFrame* frame = lastFAD.mFrame;
  // We don't expect frame to change depths.
  MOZ_ASSERT(frame->GetDepthInFrameTree() == lastFAD.mDepth);
  // Keep the hashtable in sync with the sorted list.
  mFrames.remove(frame);
  return frame;
}

bool DepthOrderedFrameList::FrameIsAncestorOfAnyElement(
    nsIFrame* aFrame) const {
  MOZ_ASSERT(aFrame);

  // Look for a path from any element to aFrame, following GetParent(). This
  // check mirrors what FrameNeedsReflow() would have done if the reflow root
  // didn't get in the way.
  for (auto iter = mFrames.iter(); !iter.done(); iter.next()) {
    nsIFrame* f = iter.get().key();
    do {
      if (f == aFrame) {
        return true;
      }
      f = f->GetParent();
    } while (f);
  }

  return false;
}

void DepthOrderedFrameList::BuildSortedList() const {
  MOZ_ASSERT(mSortedFrames.IsEmpty());

  mSortedFrames.SetCapacity(mFrames.count());
  for (auto iter = mFrames.iter(); !iter.done(); iter.next()) {
    mSortedFrames.AppendElement(
        FrameAndDepth{iter.get().key(), iter.get().value()});
  }
  mSortedFrames.Sort();
}

}  // namespace mozilla
