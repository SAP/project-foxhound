/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_a11y_TextRange_h__
#define mozilla_a11y_TextRange_h__

#include <utility>

#include "nsTArray.h"

class nsRange;

namespace mozilla {
namespace dom {
class Selection;
}  // namespace dom
namespace a11y {

class Accessible;
class LocalAccessible;

/**
 * A text point (HyperText + offset), represents a boundary of text range.
 * In new code, This should only be used when you explicitly need to deal with
 * HyperText containers and offsets, including embedded objects; e.g. for
 * IAccessible2 and ATK. Otherwise, use TextLeafPoint instead.
 */
struct TextPoint final {
  TextPoint(Accessible* aContainer, int32_t aOffset)
      : mContainer(aContainer), mOffset(aOffset) {}
  TextPoint(const TextPoint& aPoint)
      : mContainer(aPoint.mContainer), mOffset(aPoint.mOffset) {}

  Accessible* mContainer;
  int32_t mOffset;

  bool operator==(const TextPoint& aPoint) const {
    return mContainer == aPoint.mContainer && mOffset == aPoint.mOffset;
  }
  bool operator<(const TextPoint& aPoint) const;

  /**
   * Return 0 if the two points are equal, -1 if this is before aOther, 1 if
   * this is after aOther.
   */
  int Compare(const TextPoint& aOther) const {
    if (*this == aOther) {
      return 0;
    }
    if (*this < aOther) {
      return -1;
    }
    return 1;
  }
};

/**
 * Represents a HyperText range within the text control or document.
 * In new code, This should only be used when you explicitly need to deal with
 * HyperText containers and offsets, including embedded objects; e.g. for
 * IAccessible2 and ATK. Otherwise, use TextLeafRange instead.
 */
class TextRange final {
 public:
  TextRange(Accessible* aRoot, Accessible* aStartContainer,
            int32_t aStartOffset, Accessible* aEndContainer,
            int32_t aEndOffset);
  TextRange() : mStartOffset{0}, mEndOffset{0} {}
  TextRange(TextRange&& aRange)
      : mRoot(std::move(aRange.mRoot)),
        mStartContainer(std::move(aRange.mStartContainer)),
        mEndContainer(std::move(aRange.mEndContainer)),
        mStartOffset(aRange.mStartOffset),
        mEndOffset(aRange.mEndOffset) {}

  TextRange& operator=(TextRange&& aRange) {
    mRoot = std::move(aRange.mRoot);
    mStartContainer = std::move(aRange.mStartContainer);
    mEndContainer = std::move(aRange.mEndContainer);
    mStartOffset = aRange.mStartOffset;
    mEndOffset = aRange.mEndOffset;
    return *this;
  }

  Accessible* Root() { return mRoot; }
  Accessible* StartContainer() const { return mStartContainer; }
  int32_t StartOffset() const { return mStartOffset; }
  Accessible* EndContainer() const { return mEndContainer; }
  int32_t EndOffset() const { return mEndOffset; }

  bool operator==(const TextRange& aRange) const {
    return mStartContainer == aRange.mStartContainer &&
           mStartOffset == aRange.mStartOffset &&
           mEndContainer == aRange.mEndContainer &&
           mEndOffset == aRange.mEndOffset;
  }

  TextPoint StartPoint() const {
    return TextPoint(mStartContainer, mStartOffset);
  }
  TextPoint EndPoint() const { return TextPoint(mEndContainer, mEndOffset); }

  /**
   * Return a container containing both start and end points.
   */
  Accessible* Container() const;

  /**
   * Crops the range if it overlaps the given accessible element boundaries,
   * returns true if the range was cropped successfully.
   */
  bool Crop(Accessible* aContainer);

  /**
   * Convert stored hypertext offsets into DOM offsets and assign it to DOM
   * range.
   *
   * Note that if start and/or end accessible offsets are in generated content
   * such as ::before or
   * ::after, the result range excludes the generated content.  See also
   * ClosestNotGeneratedDOMPoint() for more information.
   *
   * @param  aRange        [in, out] the range whose bounds to set
   * @param  aReversed     [out] whether the start/end offsets were reversed.
   * @return true   if conversion was successful
   */
  bool AssignDOMRange(nsRange* aRange, bool* aReversed = nullptr) const;

  /**
   * Return true if this TextRange object represents an actual range of text.
   */
  bool IsValid() const { return mRoot; }

  void SetStartPoint(Accessible* aContainer, int32_t aOffset) {
    mStartContainer = aContainer;
    mStartOffset = aOffset;
  }
  void SetEndPoint(Accessible* aContainer, int32_t aOffset) {
    mStartContainer = aContainer;
    mStartOffset = aOffset;
  }

  static void TextRangesFromSelection(dom::Selection* aSelection,
                                      nsTArray<TextRange>* aRanges);

 private:
  TextRange(const TextRange& aRange) = delete;
  TextRange& operator=(const TextRange& aRange) = delete;

  friend class HyperTextAccessible;
  friend class xpcAccessibleTextRange;

  void Set(Accessible* aRoot, Accessible* aStartContainer, int32_t aStartOffset,
           Accessible* aEndContainer, int32_t aEndOffset);

  /**
   * A helper method returning a common parent for two given accessible
   * elements.
   */
  Accessible* CommonParent(Accessible* aAcc1, Accessible* aAcc2,
                           nsTArray<Accessible*>* aParents1, uint32_t* aPos1,
                           nsTArray<Accessible*>* aParents2,
                           uint32_t* aPos2) const;

  Accessible* mRoot;
  Accessible* mStartContainer;
  Accessible* mEndContainer;
  int32_t mStartOffset;
  int32_t mEndOffset;
};

}  // namespace a11y
}  // namespace mozilla

#endif
