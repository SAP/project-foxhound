/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* Classes to iterate over grapheme, word, sentence, or line. */

#include "mozilla/intl/Segmenter.h"

#include "icu4x/GraphemeClusterSegmenter.hpp"
#include "icu4x/LineSegmenter.hpp"
#include "icu4x/SentenceSegmenter.hpp"
#include "icu4x/WordSegmenter.hpp"
#include "mozilla/ClearOnShutdown.h"
#include "mozilla/intl/UnicodeProperties.h"
#include "nsUnicodeProperties.h"
#include "nsCharTraits.h"
#include "nsThreadUtils.h"

#include <mutex>

using namespace icu4x;
using namespace mozilla::unicode;

namespace mozilla::intl {

SegmentIteratorUtf16::SegmentIteratorUtf16(Span<const char16_t> aText)
    : mText(aText) {}

Maybe<uint32_t> SegmentIteratorUtf16::Seek(uint32_t aPos) {
  if (mPos < aPos) {
    mPos = aPos;
  }
  return Next();
}

LineBreakIteratorUtf16::LineBreakIteratorUtf16(Span<const char16_t> aText,
                                               const LineBreakOptions& aOptions)
    : SegmentIteratorUtf16(aText), mOptions(aOptions) {
  mSegmenter = capi::icu4x_LineSegmenter_create_auto_mv1();
  mIterator = capi::icu4x_LineSegmenter_segment_utf16_mv1(
      mSegmenter, {mText.Elements(), mText.Length()});
}

LineBreakIteratorUtf16::~LineBreakIteratorUtf16() {
  capi::icu4x_LineBreakIteratorUtf16_destroy_mv1(mIterator);
  capi::icu4x_LineSegmenter_destroy_mv1(mSegmenter);
}

Maybe<uint32_t> LineBreakIteratorUtf16::Next() {
  MOZ_ASSERT(mIterator);

  const int32_t nextPos =
      capi::icu4x_LineBreakIteratorUtf16_next_mv1(mIterator);
  if (nextPos < 0) {
    return Nothing();
  }
  if (!nextPos) {
    return Next();
  }
  mPos = nextPos;
  return Some(mPos);
}

Maybe<uint32_t> LineBreakIteratorUtf16::Seek(uint32_t aPos) {
  MOZ_ASSERT(mIterator);

  if (mPos >= aPos) {
    return Next();
  }

  while (mPos < aPos) {
    const int32_t nextPos =
        capi::icu4x_LineBreakIteratorUtf16_next_mv1(mIterator);
    if (nextPos < 0) {
      return Nothing();
    }
    mPos = static_cast<uint32_t>(nextPos);
  }

  if (aPos < mPos) {
    return Some(mPos);
  }

  return Next();
}

WordBreakIteratorUtf16::WordBreakIteratorUtf16(Span<const char16_t> aText)
    : SegmentIteratorUtf16(aText) {
  mSegmenter = capi::icu4x_WordSegmenter_create_auto_mv1();
  mIterator = capi::icu4x_WordSegmenter_segment_utf16_mv1(
      mSegmenter, {mText.Elements(), mText.Length()});
}

WordBreakIteratorUtf16::~WordBreakIteratorUtf16() {
  capi::icu4x_WordBreakIteratorUtf16_destroy_mv1(mIterator);
  capi::icu4x_WordSegmenter_destroy_mv1(mSegmenter);
}

void WordBreakIteratorUtf16::Reset(Span<const char16_t> aText) {
  mPos = 0;
  mText = aText;
  if (mIterator) {
    capi::icu4x_WordBreakIteratorUtf16_destroy_mv1(mIterator);
    mIterator = nullptr;
  }
  mIterator = capi::icu4x_WordSegmenter_segment_utf16_mv1(
      mSegmenter, {mText.Elements(), mText.Length()});
}

Maybe<uint32_t> WordBreakIteratorUtf16::Next() {
  MOZ_ASSERT(mIterator);

  const int32_t nextPos =
      capi::icu4x_WordBreakIteratorUtf16_next_mv1(mIterator);
  if (nextPos < 0) {
    return Nothing();
  }
  if (!nextPos) {
    return Next();
  }
  mPos = nextPos;
  return Some(mPos);
}

Maybe<uint32_t> WordBreakIteratorUtf16::Seek(uint32_t aPos) {
  MOZ_ASSERT(mIterator);

  if (mPos >= aPos) {
    return Next();
  }

  while (mPos < aPos) {
    const int32_t nextPos =
        capi::icu4x_WordBreakIteratorUtf16_next_mv1(mIterator);
    if (nextPos < 0) {
      return Nothing();
    }
    mPos = static_cast<uint32_t>(nextPos);
  }

  if (aPos < mPos) {
    return Some(mPos);
  }

  return Next();
}

capi::GraphemeClusterSegmenter* GraphemeClusterBreakIteratorUtf16::sSegmenter =
    nullptr;

GraphemeClusterBreakIteratorUtf16::GraphemeClusterBreakIteratorUtf16(
    Span<const char16_t> aText)
    : SegmentIteratorUtf16(aText) {
  static std::once_flag sOnce;

  std::call_once(sOnce, [] {
    auto result = capi::icu4x_GraphemeClusterSegmenter_create_mv1();
    sSegmenter = result;

    NS_DispatchToMainThread(
        NS_NewRunnableFunction("GraphemeClusterBreakIteratorUtf16", [] {
          RunOnShutdown([] {
            capi::icu4x_GraphemeClusterSegmenter_destroy_mv1(sSegmenter);
            sSegmenter = nullptr;
          });
        }));
  });

  MOZ_RELEASE_ASSERT(sSegmenter);
  mIterator = capi::icu4x_GraphemeClusterSegmenter_segment_utf16_mv1(
      sSegmenter, {mText.Elements(), mText.Length()});
}

GraphemeClusterBreakIteratorUtf16::~GraphemeClusterBreakIteratorUtf16() {
  capi::icu4x_GraphemeClusterBreakIteratorUtf16_destroy_mv1(mIterator);
}

Maybe<uint32_t> GraphemeClusterBreakIteratorUtf16::Next() {
  MOZ_ASSERT(mIterator);

  const int32_t nextPos =
      capi::icu4x_GraphemeClusterBreakIteratorUtf16_next_mv1(mIterator);
  if (nextPos < 0) {
    return Nothing();
  }
  if (!nextPos) {
    return Next();
  }
  mPos = nextPos;
  return Some(mPos);
}

Maybe<uint32_t> GraphemeClusterBreakIteratorUtf16::Seek(uint32_t aPos) {
  MOZ_ASSERT(mIterator);

  if (mPos >= aPos) {
    return Next();
  }

  while (mPos < aPos) {
    const int32_t nextPos =
        capi::icu4x_GraphemeClusterBreakIteratorUtf16_next_mv1(mIterator);
    if (nextPos < 0) {
      return Nothing();
    }
    mPos = static_cast<uint32_t>(nextPos);
  }

  if (aPos < mPos) {
    return Some(mPos);
  }

  return Next();
}

GraphemeClusterBreakReverseIteratorUtf16::
    GraphemeClusterBreakReverseIteratorUtf16(Span<const char16_t> aText)
    : SegmentIteratorUtf16(aText) {
  mPos = mText.Length();
}

Maybe<uint32_t> GraphemeClusterBreakReverseIteratorUtf16::Next() {
  if (mPos == 0) {
    return Nothing();
  }

  uint32_t ch;
  do {
    ch = mText[--mPos];

    if (mPos > 0 && NS_IS_SURROGATE_PAIR(mText[mPos - 1], ch)) {
      ch = SURROGATE_TO_UCS4(mText[--mPos], ch);
    }

    if (!IsClusterExtender(ch)) {
      break;
    }
  } while (mPos > 0);

  // XXX May need to handle conjoining Jamo

  return Some(mPos);
}

Maybe<uint32_t> GraphemeClusterBreakReverseIteratorUtf16::Seek(uint32_t aPos) {
  if (mPos > aPos) {
    mPos = aPos;
  }
  return Next();
}

SentenceBreakIteratorUtf16::SentenceBreakIteratorUtf16(
    Span<const char16_t> aText)
    : SegmentIteratorUtf16(aText) {
  mSegmenter = capi::icu4x_SentenceSegmenter_create_mv1();
  mIterator = capi::icu4x_SentenceSegmenter_segment_utf16_mv1(
      mSegmenter, {mText.Elements(), mText.Length()});
}

SentenceBreakIteratorUtf16::~SentenceBreakIteratorUtf16() {
  capi::icu4x_SentenceBreakIteratorUtf16_destroy_mv1(mIterator);
  capi::icu4x_SentenceSegmenter_destroy_mv1(mSegmenter);
}

Maybe<uint32_t> SentenceBreakIteratorUtf16::Seek(uint32_t aPos) {
  MOZ_ASSERT(mIterator);

  if (mPos >= aPos) {
    return Next();
  }

  while (mPos < aPos) {
    const int32_t nextPos =
        capi::icu4x_SentenceBreakIteratorUtf16_next_mv1(mIterator);
    if (nextPos < 0) {
      return Nothing();
    }
    mPos = static_cast<uint32_t>(nextPos);
  }

  if (aPos < mPos) {
    return Some(mPos);
  }

  return Next();
}

Maybe<uint32_t> SentenceBreakIteratorUtf16::Next() {
  MOZ_ASSERT(mIterator);

  const int32_t nextPos =
      capi::icu4x_SentenceBreakIteratorUtf16_next_mv1(mIterator);
  if (nextPos < 0) {
    return Nothing();
  }
  if (!nextPos) {
    return Next();
  }
  mPos = nextPos;
  return Some(mPos);
}

Result<UniquePtr<Segmenter>, ICUError> Segmenter::TryCreate(
    Span<const char> aLocale, const SegmenterOptions& aOptions) {
  return MakeUnique<Segmenter>(aLocale, aOptions);
}

UniquePtr<SegmentIteratorUtf16> Segmenter::Segment(
    Span<const char16_t> aText) const {
  switch (mOptions.mGranularity) {
    case SegmenterGranularity::Grapheme:
      return MakeUnique<GraphemeClusterBreakIteratorUtf16>(aText);
    case SegmenterGranularity::Sentence:
      return MakeUnique<SentenceBreakIteratorUtf16>(aText);
    case SegmenterGranularity::Word:
      return MakeUnique<WordBreakIteratorUtf16>(aText);
    case SegmenterGranularity::Line:
      return MakeUnique<LineBreakIteratorUtf16>(aText);
  }
  MOZ_ASSERT_UNREACHABLE("All granularities must be handled!");
  return nullptr;
}

}  // namespace mozilla::intl
