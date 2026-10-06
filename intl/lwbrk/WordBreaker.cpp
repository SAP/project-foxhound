/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/intl/WordBreaker.h"

#include "icu4x/WordSegmenter.hpp"
#include "mozilla/CheckedInt.h"
#include "nsUnicharUtils.h"

using mozilla::intl::WordBreaker;
using mozilla::intl::WordRange;

WordRange WordBreaker::FindWord(const nsAString& aText, uint32_t aPos,
                                const FindWordOptions aOptions) {
  const CheckedInt<uint32_t> len = aText.Length();
  MOZ_RELEASE_ASSERT(len.isValid());

  if (aPos >= len.value()) {
    return {len.value(), len.value()};
  }

  WordRange range{0, len.value()};

  auto segmenter = icu4x::WordSegmenter::create_auto();
  auto iterator = segmenter->segment16(
      std::u16string_view(aText.BeginReading(), aText.Length()));

  uint32_t previousPos = 0;
  while (true) {
    const int32_t nextPos = iterator->next();
    if (nextPos < 0) {
      range.mBegin = previousPos;
      range.mEnd = len.value();
      break;
    }
    if ((uint32_t)nextPos > aPos) {
      range.mBegin = previousPos;
      range.mEnd = (uint32_t)nextPos;
      break;
    }

    previousPos = nextPos;
  }

  if (aOptions != FindWordOptions::StopAtPunctuation) {
    return range;
  }

  for (uint32_t i = range.mBegin; i < range.mEnd; i++) {
    if (mozilla::IsPunctuationForWordSelect(aText[i])) {
      if (i > aPos) {
        range.mEnd = i;
        break;
      }
      if (i == aPos) {
        range.mBegin = i;
        range.mEnd = i + 1;
        break;
      }
      if (i < aPos) {
        range.mBegin = i + 1;
      }
    }
  }

  return range;
}
