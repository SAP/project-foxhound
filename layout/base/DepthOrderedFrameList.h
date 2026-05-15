/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_DepthOrderedFrameList_h
#define mozilla_DepthOrderedFrameList_h

#include "mozilla/HashTable.h"
#include "mozilla/ReverseIterator.h"
#include "nsTArray.h"

class nsIFrame;

namespace mozilla {

class DepthOrderedFrameList {
 public:
  // Add a frame to the set being tracked.
  void Add(nsIFrame* aFrame);

  // Remove this frame if present.
  void Remove(nsIFrame* aFrame) {
    mFrames.remove(aFrame);
    mSortedFrames.ClearAndRetainStorage();
  }

  // Remove and return one of the shallowest frames from the list.
  // (If two frames are at the same depth, order is indeterminate.)
  nsIFrame* PopShallowestRoot();

  // Remove all frames.
  void Clear() {
    mFrames.clear();
    mSortedFrames.Clear();
  }

  // Is this frame one of the elements in the list?
  bool Contains(nsIFrame* aFrame) const { return mFrames.has(aFrame); }

  // Are there no elements?
  bool IsEmpty() const { return mFrames.empty(); }

  // Is the given frame an ancestor of any dirty root?
  bool FrameIsAncestorOfAnyElement(nsIFrame* aFrame) const;

  auto IterFromShallowest() const {
    EnsureSortedList();
    return Reversed(mSortedFrames);
  }

 private:
  // Set of the frames we're tracking and their depth in the frame tree. This
  // is the primary record maintained by the Add and Remove methods. The sorted
  // list in mSortedFrames is created on demand when we need to iterate in depth
  // order.
  HashMap<nsIFrame*, uint32_t> mFrames;

  struct FrameAndDepth {
    nsIFrame* mFrame;
    uint32_t mDepth;

    // Easy conversion to nsIFrame*, as it's the most likely need.
    operator nsIFrame*() const { return mFrame; }

    // Used to sort by reverse depths, i.e., deeper < shallower.
    bool operator<(const FrameAndDepth& aOther) const {
      // Reverse depth! So '>' instead of '<'.
      return mDepth > aOther.mDepth;
    }
  };

  // The list of frames sorted by decreasing depths; created/updated lazily.
  mutable nsTArray<FrameAndDepth> mSortedFrames;

  void EnsureSortedList() const {
    if (mSortedFrames.IsEmpty() && !mFrames.empty()) {
      BuildSortedList();
    }
  }

  void BuildSortedList() const;
};

}  // namespace mozilla

#endif
