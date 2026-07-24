/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
// vim:cindent:ts=4:et:sw=4:
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Code to sort cells by their colspan, used by BasicTableLayoutStrategy.
 */

#include "SpanningCellSorter.h"

#include "nsTArray.h"

using namespace mozilla;

// #define DEBUG_SPANNING_CELL_SORTER

SpanningCellSorter::SpanningCellSorter() = default;

SpanningCellSorter::~SpanningCellSorter() = default;

bool SpanningCellSorter::AddCell(int32_t aColSpan, int32_t aRow, int32_t aCol) {
  NS_ASSERTION(mState == ADDING, "cannot call AddCell after GetNext");
  NS_ASSERTION(aColSpan >= ARRAY_BASE, "cannot add cells with colspan<2");

  Item* i = (Item*)mozilla::AutoStackArena::Allocate(sizeof(Item));
  NS_ENSURE_TRUE(i != nullptr, false);

  i->row = aRow;
  i->col = aCol;

  if (UseArrayForSpan(aColSpan)) {
    int32_t index = SpanToIndex(aColSpan);
    i->next = mArray[index];
    mArray[index] = i;
  } else {
    Item*& entryItems = mHashTable.LookupOrInsert(aColSpan, nullptr);

    i->next = entryItems;
    entryItems = i;
  }

  return true;
}

SpanningCellSorter::Item* SpanningCellSorter::GetNext(int32_t* aColSpan) {
  NS_ASSERTION(mState != DONE, "done enumerating, stop calling");

  // Our comparator needs the SpanningCellSorter private HashTableEntry
  class HashTableEntryComparator {
   public:
    bool Equals(HashTableEntry* left, HashTableEntry* right) const {
      return left->GetKey() == right->GetKey();
    }
    bool LessThan(HashTableEntry* left, HashTableEntry* right) const {
      return left->GetKey() < right->GetKey();
    }
  };

  switch (mState) {
    case ADDING:
      /* prepare to enumerate the array */
      mState = ENUMERATING_ARRAY;
      mEnumerationIndex = 0;
      [[fallthrough]];
    case ENUMERATING_ARRAY:
      while (mEnumerationIndex < ARRAY_SIZE && !mArray[mEnumerationIndex]) {
        ++mEnumerationIndex;
      }
      if (mEnumerationIndex < ARRAY_SIZE) {
        Item* result = mArray[mEnumerationIndex];
        *aColSpan = IndexToSpan(mEnumerationIndex);
        NS_ASSERTION(result, "logic error");
#ifdef DEBUG_SPANNING_CELL_SORTER
        printf(
            "SpanningCellSorter[%p]:"
            " returning list for colspan=%d from array\n",
            static_cast<void*>(this), *aColSpan);
#endif
        ++mEnumerationIndex;
        return result;
      }
      /* prepare to enumerate the hash */
      mState = ENUMERATING_HASH;
      mEnumerationIndex = 0;
      if (!mHashTable.IsEmpty()) {
        // This clear is a no-op if the array is empty and it makes us
        // resilient against re-entrance.
        mSortedHashTable.ClearAndRetainStorage();
        mSortedHashTable.SetCapacity(mHashTable.Count());
        for (HashTableEntry& entry : mHashTable) {
          mSortedHashTable.AppendElement(&entry);
        }
        mSortedHashTable.Sort(HashTableEntryComparator());
      }
      [[fallthrough]];
    case ENUMERATING_HASH:
      if (mEnumerationIndex < mSortedHashTable.Length()) {
        Item* result = mSortedHashTable[mEnumerationIndex]->GetData();
        *aColSpan = mSortedHashTable[mEnumerationIndex]->GetKey();
        NS_ASSERTION(result, "holes in hash table");
#ifdef DEBUG_SPANNING_CELL_SORTER
        printf(
            "SpanningCellSorter[%p]:"
            " returning list for colspan=%d from hash\n",
            static_cast<void*>(this), *aColSpan);
#endif
        ++mEnumerationIndex;
        return result;
      }
      mState = DONE;
      [[fallthrough]];
    case DONE:;
  }
  return nullptr;
}
