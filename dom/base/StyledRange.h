/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_BASE_STYLED_RANGE_H_
#define DOM_BASE_STYLED_RANGE_H_

#include "mozilla/RefPtr.h"
#include "mozilla/TextRange.h"
#include "nsTArray.h"
#include "nsTHashMap.h"

class nsCycleCollectionTraversalCallback;

namespace mozilla::dom {
class AbstractRange;

struct StyledRange {
  explicit StyledRange(AbstractRange* aRange, TextRangeStyle aStyle = {});

  RefPtr<AbstractRange> mRange;
  TextRangeStyle mTextRangeStyle;
};

/**
 * An container of ranges with associated styles, containing both a sorted array
 * of ranges and an optimized lookup for the associated `TextRangeStyle`.
 */
class StyledRangeCollection {
  friend void ImplCycleCollectionTraverse(
      nsCycleCollectionTraversalCallback& aCallback,
      StyledRangeCollection& aField, const char* aName, uint32_t aFlags);
  friend void ImplCycleCollectionUnlink(StyledRangeCollection& aField);

 public:
  StyledRangeCollection() = default;
  ~StyledRangeCollection() = default;

  StyledRangeCollection(StyledRangeCollection&& aOther) = default;
  StyledRangeCollection& operator=(StyledRangeCollection&& aOther) = default;

  StyledRangeCollection(const StyledRangeCollection&) = delete;
  StyledRangeCollection& operator=(const StyledRangeCollection&) = delete;

  size_t Length() const { return mRanges.Length(); }
  bool IsEmpty() const { return mRanges.IsEmpty(); }

  /**
   * Returns the `AbstractRange` at the given index.
   * Release asserts if out of bounds.
   */
  AbstractRange* GetAbstractRangeAt(size_t aIndex) const {
    return mRanges[aIndex];
  }

  /**
   * Returns the `StyledRange` at the given index.
   * Release asserts if out of bounds.
   * Note that each call creates a new object, which increments the refcount
   * of the underlying `AbstractRange` and copies the `TextRangeStyle`.
   */
  StyledRange GetStyledRangeAt(size_t aIndex) {
    AbstractRange* range = GetAbstractRangeAt(aIndex);
    const TextRangeStyle* style = GetTextRangeStyleIfNotDefault(range);
    if (style) {
      return StyledRange{range, *style};
    }
    return StyledRange{range};
  }

  /**
   * Returns a span of the `AbstractRange`s, ordered by start point.
   */
  Span<RefPtr<AbstractRange>> Ranges() { return mRanges; }
  Span<const RefPtr<AbstractRange>> Ranges() const { return mRanges; }

  // Add, insert, remove elements.
  void AppendElement(StyledRange&& aRange);
  void InsertElementAt(size_t aIndex, StyledRange&& aRange);
  void AppendElement(const StyledRange& aRange);
  void InsertElementAt(size_t aIndex, const StyledRange& aRange);

  void InsertElementsAt(size_t aIndex,
                        const nsTArray<StyledRange>& aStyledRanges);

  /**
   * Removes the element associated with the given `AbstractRange`.
   * Returns true if an element was removed, false otherwise.
   */
  bool RemoveElement(const AbstractRange* aRange);
  void RemoveElementAt(size_t aIndex);
  void RemoveElementsAt(size_t aStart, size_t aCount);

  /**
   * Removes the element at `aIndex` and returns its value (including style
   * data) as `StyledRange`.
   */
  StyledRange ExtractElementAt(size_t aIndex);

  void Clear();

  /**
   * Sorts ranges by the given comparator.
   * This does not invalidate the style lookup.
   */
  template <typename Comparator>
  void Sort(const Comparator& aComp) {
    mRanges.Sort(aComp);
  }

  // O(1) style lookup.
  const TextRangeStyle* GetTextRangeStyleIfNotDefault(
      const AbstractRange* aRange);

  // Sets the style data associated with `aRange`.
  void SetTextRangeStyle(const AbstractRange* aRange,
                         const TextRangeStyle& aStyle);

 private:
  // Removes any style associated with `aRange`.
  void RemoveStyle(const AbstractRange* aRange);
  // Ranges, sorted by start point.
  AutoTArray<RefPtr<AbstractRange>, 1> mRanges;

  // Lookup table for the TextRangeStyle associated with each range.
  nsTHashMap<const AbstractRange*, TextRangeStyle> mRangeStyleData;
};

inline void ImplCycleCollectionUnlink(StyledRangeCollection& aField) {
  aField.Clear();
}

void ImplCycleCollectionTraverse(nsCycleCollectionTraversalCallback& aCallback,
                                 StyledRangeCollection& aField,
                                 const char* aName, uint32_t aFlags);
}  // namespace mozilla::dom

#endif  // DOM_BASE_STYLED_RANGE_H_
