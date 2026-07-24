/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_OverflowChangedTracker_h
#define mozilla_OverflowChangedTracker_h

#include "mozilla/HashTable.h"
#include "nsContainerFrame.h"
#include "nsIFrame.h"
#include "nsTArray.h"

namespace mozilla {

/**
 * Helper class that collects a list of frames that need
 * UpdateOverflow() called on them, and coalesces them
 * to avoid walking up the same ancestor tree multiple times.
 */
class OverflowChangedTracker {
 public:
  enum ChangeKind {
    /**
     * The frame was explicitly added as a result of
     * nsChangeHint_UpdatePostTransformOverflow and hence may have had a style
     * change that changes its geometry relative to parent, without reflowing.
     */
    TRANSFORM_CHANGED,
    /**
     * The overflow areas of children have changed
     * and we need to call UpdateOverflow on the frame.
     */
    CHILDREN_CHANGED,
  };

  OverflowChangedTracker() : mSubtreeRoot(nullptr) {}

  ~OverflowChangedTracker() {
    NS_ASSERTION(mEntries.empty(), "Need to flush before destroying!");
  }

  /**
   * Add a frame that has had a style change, and needs its
   * overflow updated.
   *
   * If there are pre-transform overflow areas stored for this
   * frame, then we will call FinishAndStoreOverflow with those
   * areas instead of UpdateOverflow().
   *
   * If the overflow area changes, then UpdateOverflow will also
   * be called on the parent.
   */
  void AddFrame(nsIFrame* aFrame, ChangeKind aChangeKind) {
    MOZ_ASSERT(
        aFrame->FrameMaintainsOverflow(),
        "Why add a frame that doesn't maintain overflow to the tracker?");
    if (auto p = mEntries.lookupForAdd(aFrame)) {
      p->value() = std::max(p->value(), aChangeKind);
    } else {
      // Ignore failure to add an entry; this could result in cosmetic
      // errors but is non-fatal.
      (void)mEntries.add(p, aFrame, aChangeKind);
    }
  }

  /**
   * Remove a frame.
   */
  void RemoveFrame(nsIFrame* aFrame) {
    if (!mEntries.empty()) {
      mEntries.remove(aFrame);
    }
  }

  /**
   * Set the subtree root to limit overflow updates. This must be set if and
   * only if currently reflowing aSubtreeRoot, to ensure overflow changes will
   * still propagate correctly.
   */
  void SetSubtreeRoot(const nsIFrame* aSubtreeRoot) {
    mSubtreeRoot = aSubtreeRoot;
  }

  /**
   * Update the overflow of all added frames, and clear the entry list.
   *
   * Start from those deepest in the frame tree and works upwards. This stops
   * us from processing the same frame twice.
   */
  void Flush() {
    // Collect all the entries into an array, sort by depth, and process them
    // from the deepest upwards.

    AutoTArray<Entry, 8> sortedEntries;
    // We use fallible allocations to avoid crashing on OOM; in the event that
    // of allocation failure, we'll effectively ignore the entries that weren't
    // added to the array, which could result in painting glitches but should
    // be otherwise harmless.
    (void)sortedEntries.SetCapacity(mEntries.count(), fallible);
    for (auto iter = mEntries.iter(); !iter.done(); iter.next()) {
      nsIFrame* frame = iter.get().key();
      uint32_t depth = frame->GetDepthInFrameTree();
      ChangeKind kind = iter.get().value();
      if (!sortedEntries.AppendElement(Entry(frame, depth, kind), fallible)) {
        break;
      }
    }
    mEntries.clearAndCompact();
    sortedEntries.Sort();

    while (!sortedEntries.IsEmpty()) {
      Entry entry = sortedEntries.PopLastElement();
      nsIFrame* frame = entry.mFrame;

      bool overflowChanged = false;
      if (entry.mChangeKind == CHILDREN_CHANGED) {
        // Need to union the overflow areas of the children.
        // Only update the parent if the overflow changes.
        overflowChanged = frame->UpdateOverflow();
      } else {
        // Take a faster path that doesn't require unioning the overflow areas
        // of our children.

        NS_ASSERTION(
            frame->GetProperty(nsIFrame::DebugInitialOverflowPropertyApplied()),
            "InitialOverflowProperty must be set first.");

        OverflowAreas* overflow =
            frame->GetProperty(nsIFrame::InitialOverflowProperty());
        if (overflow) {
          // FinishAndStoreOverflow will change the overflow areas passed in,
          // so make a copy.
          OverflowAreas overflowCopy = *overflow;
          frame->FinishAndStoreOverflow(overflowCopy, frame->GetSize());
        } else {
          nsRect bounds(nsPoint(0, 0), frame->GetSize());
          OverflowAreas boundsOverflow;
          boundsOverflow.SetAllTo(bounds);
          frame->FinishAndStoreOverflow(boundsOverflow, bounds.Size());
        }

        // We can't tell if the overflow changed, so be conservative
        overflowChanged = true;
      }

      // If the frame style changed (e.g. positioning offsets)
      // then we need to update the parent with the overflow areas of its
      // children.
      if (overflowChanged) {
        nsIFrame* parent = frame->GetParent();

        // It's possible that the parent is already in a nondisplay context,
        // should not add it to the list if that's true.
        if (parent && parent != mSubtreeRoot &&
            parent->FrameMaintainsOverflow()) {
          Entry parentEntry(parent, entry.mDepth - 1, CHILDREN_CHANGED);
          auto index = sortedEntries.IndexOfFirstElementGt(parentEntry);
          if (index > 0 && sortedEntries[index - 1] == parentEntry) {
            // Update the existing entry if the new value is stronger.
            Entry& existing = sortedEntries[index - 1];
            existing.mChangeKind =
                std::max(existing.mChangeKind, CHILDREN_CHANGED);
          } else {
            // Add new entry. We ignore failure here; we'll just potentially
            // miss some updates that ought to happen.
            // (Allocation failure seems unlikely here anyhow, as we just
            // popped an element off the array at the top of the loop.)
            (void)sortedEntries.InsertElementAt(index, parentEntry, fallible);
          }
        }
      }
    }
  }

 private:
  /* Entry type used for the sorted array in Flush(). */
  struct Entry {
    Entry(nsIFrame* aFrame, uint32_t aDepth,
          ChangeKind aChangeKind = CHILDREN_CHANGED)
        : mFrame(aFrame), mDepth(aDepth), mChangeKind(aChangeKind) {}

    /**
     * Note that "equality" tests only the frame pointer.
     */
    bool operator==(const Entry& aOther) const {
      return mFrame == aOther.mFrame;
    }

    /**
     * Sort by depth in the tree, and break ties with the frame pointer.
     */
    bool operator<(const Entry& aOther) const {
      if (mDepth == aOther.mDepth) {
        return mFrame < aOther.mFrame;
      }
      return mDepth < aOther.mDepth;
    }

    nsIFrame* mFrame;
    /* Depth in the frame tree */
    uint32_t mDepth;
    ChangeKind mChangeKind;
  };

  /* A collection of frames to be processed. */
  HashMap<nsIFrame*, ChangeKind> mEntries;

  /* Don't update overflow of this frame or its ancestors. */
  const nsIFrame* mSubtreeRoot;
};

}  // namespace mozilla

#endif
