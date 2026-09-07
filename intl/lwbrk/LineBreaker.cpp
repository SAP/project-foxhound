/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/intl/LineBreaker.h"

#include "icu4x/diplomat_runtime.hpp"
#include "icu4x/LineBreakIteratorLatin1.hpp"
#include "icu4x/LineBreakIteratorUtf16.hpp"
#include "icu4x/LineSegmenter.hpp"
#include "icu4x/Locale.hpp"
#include "LineBreakCache.h"
#include "nsTArray.h"
#include "nsThreadUtils.h"
#include "mozilla/CheckedInt.h"
#include "mozilla/ClearOnShutdown.h"
#include "mozilla/intl/Segmenter.h"
#include "mozilla/intl/UnicodeProperties.h"

#include <mutex>

using namespace icu4x;
using namespace mozilla;
using namespace mozilla::intl;

static LineBreakStrictness ConvertLineBreakRuleToICU4X(LineBreakRule aLevel) {
  switch (aLevel) {
    case LineBreakRule::Auto:
      return LineBreakStrictness::Strict;
    case LineBreakRule::Strict:
      return LineBreakStrictness::Strict;
    case LineBreakRule::Loose:
      return LineBreakStrictness::Loose;
    case LineBreakRule::Normal:
      return LineBreakStrictness::Normal;
    case LineBreakRule::Anywhere:
      return LineBreakStrictness::Anywhere;
  }
  MOZ_ASSERT_UNREACHABLE("should have been handled already");
  return LineBreakStrictness::Normal;
}

static LineBreakWordOption ConvertWordBreakRuleToICU4X(
    WordBreakRule aWordBreak) {
  switch (aWordBreak) {
    case WordBreakRule::Normal:
      return LineBreakWordOption::Normal;
    case WordBreakRule::BreakAll:
      return LineBreakWordOption::BreakAll;
    case WordBreakRule::KeepAll:
      return LineBreakWordOption::KeepAll;
  }
  MOZ_ASSERT_UNREACHABLE("should have been handled already");
  return LineBreakWordOption::Normal;
}

static capi::LineSegmenter* sLineSegmenter = nullptr;
static capi::Locale* sZhLocale = nullptr;

static capi::LineSegmenter* GetDefaultLineSegmenter() {
  static std::once_flag sOnce;

  std::call_once(sOnce, [] {
    sLineSegmenter = capi::icu4x_LineSegmenter_create_auto_mv1();
  });

  return sLineSegmenter;
}

static bool UseDefaultLineSegmenter(WordBreakRule aWordBreak,
                                    LineBreakRule aLevel,
                                    bool aIsChineseOrJapanese) {
  return aWordBreak == WordBreakRule::Normal &&
         (aLevel == LineBreakRule::Strict || aLevel == LineBreakRule::Auto) &&
         !aIsChineseOrJapanese;
}

static void InitDefaultLocale() {
  static std::once_flag sOnce;
  std::call_once(sOnce, [] {
    auto locale = capi::icu4x_Locale_from_string_mv1(
        diplomat::capi::DiplomatStringView{"zh", 2});
    if (locale.is_ok) {
      sZhLocale = locale.ok;
    }
  });
}

static capi::LineSegmenter* GetLineSegmenter(bool aUseDefault,
                                             WordBreakRule aWordBreak,
                                             LineBreakRule aLevel,
                                             bool aIsChineseOrJapanese) {
  if (aUseDefault) {
    MOZ_ASSERT(
        UseDefaultLineSegmenter(aWordBreak, aLevel, aIsChineseOrJapanese));
    return GetDefaultLineSegmenter();
  }

  if (!sZhLocale && aIsChineseOrJapanese) {
    InitDefaultLocale();
  }

  LineBreakOptionsV2 options;
  options.word_option = ConvertWordBreakRuleToICU4X(aWordBreak);
  options.strictness = ConvertLineBreakRuleToICU4X(aLevel);
  auto locale = aIsChineseOrJapanese ? sZhLocale : nullptr;

  return capi::icu4x_LineSegmenter_create_lstm_with_options_v2_mv1(
      locale, options.AsFFI());
}

void LineBreaker::ComputeBreakPositions(
    const char16_t* aChars, uint32_t aLength, WordBreakRule aWordBreak,
    LineBreakRule aLevel, bool aIsChineseOrJapanese, uint8_t* aBreakBefore) {
  if (aLength == 1) {
    // Although UAX#14 LB2 rule requires never breaking at the start of text
    // (SOT), ICU4X line segmenter API is designed to match other segmenter in
    // UAX#29 to always break at the start of text. Hence the optimization
    // here to avoid calling into ICU4X line segmenter.
    aBreakBefore[0] = 1;
    return;
  }

  // We only cache line-breaks if we think the text is likely to hit the slow
  // (LSTM) codepath in icu_segmenter. To avoid scanning the entire text just
  // to make that decision, we probe every /kStride/ characters.
  bool useCache = [=]() {
    const uint32_t kStride = 8;
    for (uint32_t i = 0; i < aLength; i += kStride) {
      if (intl::UnicodeProperties::IsScriptioContinua(aChars[i])) {
        return true;
      }
    }
    return false;
  }();
  Maybe<LineBreakCache::Entry> entry;
  if (useCache) {
    LineBreakCache::KeyType key{aChars, aLength, aWordBreak, aLevel,
                                aIsChineseOrJapanese};
    entry.emplace(LineBreakCache::Cache()->Lookup(key));
    if (*entry) {
      auto& breakBefore = entry->Data().mBreaks;
      LineBreakCache::CopyAndFill(breakBefore, aBreakBefore,
                                  aBreakBefore + aLength);
      return;
    }
  }

  memset(aBreakBefore, 0, aLength);

  CheckedInt<int32_t> length = aLength;
  if (length.isValid()) {
    const bool useDefault =
        UseDefaultLineSegmenter(aWordBreak, aLevel, aIsChineseOrJapanese);
    auto lineSegmenter =
        GetLineSegmenter(useDefault, aWordBreak, aLevel, aIsChineseOrJapanese);
    auto segmenter = LineSegmenter::FromFFI(lineSegmenter);
    auto iterator = segmenter->segment16(std::u16string_view{aChars, aLength});

    while (true) {
      const int32_t nextPos = iterator->next();
      if (nextPos < 0 || nextPos >= length.value()) {
        break;
      }
      aBreakBefore[nextPos] = 1;
    }

    if (!useDefault) {
      capi::icu4x_LineSegmenter_destroy_mv1(lineSegmenter);
    }
  }

  if (useCache) {
    // As a very simple memory saving measure we trim off trailing elements
    // that are false before caching.
    auto* afterLastTrue = aBreakBefore + aLength;
    while (!*(afterLastTrue - 1)) {
      if (--afterLastTrue == aBreakBefore) {
        break;
      }
    }

    entry->Set(LineBreakCache::EntryType{
        nsString(aChars, aLength),
        nsTArray<uint8_t>(aBreakBefore, afterLastTrue - aBreakBefore),
        aWordBreak, aLevel, aIsChineseOrJapanese});
  }
}

void LineBreaker::ComputeBreakPositions(const uint8_t* aChars, uint32_t aLength,
                                        WordBreakRule aWordBreak,
                                        LineBreakRule aLevel,
                                        bool aIsChineseOrJapanese,
                                        uint8_t* aBreakBefore) {
  if (aLength == 1) {
    // Although UAX#14 LB2 rule requires never breaking at the start of text
    // (SOT), ICU4X line segmenter API is designed to match other segmenter in
    // UAX#29 to always break at the start of text. Hence the optimization
    // here to avoid calling into ICU4X line segmenter.
    aBreakBefore[0] = 1;
    return;
  }

  memset(aBreakBefore, 0, aLength);

  CheckedInt<int32_t> length = aLength;
  if (!length.isValid()) {
    return;
  }

  const bool useDefault =
      UseDefaultLineSegmenter(aWordBreak, aLevel, aIsChineseOrJapanese);
  auto lineSegmenter =
      GetLineSegmenter(useDefault, aWordBreak, aLevel, aIsChineseOrJapanese);
  auto segmenter = icu4x::LineSegmenter::FromFFI(lineSegmenter);
  auto iterator =
      segmenter->segment_latin1(diplomat::span<const uint8_t>{aChars, aLength});

  while (true) {
    const int32_t nextPos = iterator->next();
    if (nextPos < 0 || nextPos >= length.value()) {
      break;
    }
    aBreakBefore[nextPos] = 1;
  }

  if (!useDefault) {
    capi::icu4x_LineSegmenter_destroy_mv1(lineSegmenter);
  }
}

void LineBreaker::Shutdown() {
  if (sLineSegmenter) {
    capi::icu4x_LineSegmenter_destroy_mv1(sLineSegmenter);
  }
  if (sZhLocale) {
    capi::icu4x_Locale_destroy_mv1(sZhLocale);
  }

  sLineSegmenter = nullptr;
  sZhLocale = nullptr;
}
