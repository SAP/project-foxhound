/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#ifndef mozilla_intl_LineBreaker_h_
#define mozilla_intl_LineBreaker_h_

#include <cstdint>

#define NS_LINEBREAKER_NEED_MORE_TEXT -1

namespace mozilla {
namespace intl {
enum class LineBreakRule : uint8_t;
enum class WordBreakRule : uint8_t;

class LineBreaker final {
 public:
  // LineBreaker is a utility class with only static methods. No need to
  // instantiate it.
  LineBreaker() = delete;
  ~LineBreaker() = delete;

  // Call this on a word with whitespace at either end. We will apply UAX#29
  // rules to find breaks inside the word. aBreakBefore is set to the break-
  // before status of each character; aBreakBefore[0] will always be false
  // because we never return a break before the first character.
  // aLength is the length of the aText array and also the length of the
  // aBreakBefore output array.
  static void ComputeBreakPositions(const char16_t* aText, uint32_t aLength,
                                    WordBreakRule aWordBreak,
                                    LineBreakRule aLevel,
                                    bool aIsChineseOrJapanese,
                                    uint8_t* aBreakBefore);
  static void ComputeBreakPositions(const uint8_t* aText, uint32_t aLength,
                                    WordBreakRule aWordBreak,
                                    LineBreakRule aLevel,
                                    bool aIsChineseOrJapanese,
                                    uint8_t* aBreakBefore);

  static void Shutdown();
};

static inline bool NS_IsSpace(char16_t u) {
  return u == 0x0020 ||                   // SPACE
         u == 0x0009 ||                   // CHARACTER TABULATION
         u == 0x000D ||                   // CARRIAGE RETURN
         (0x2000 <= u && u <= 0x2006) ||  // EN QUAD, EM QUAD, EN SPACE,
                                          // EM SPACE, THREE-PER-EM SPACE,
                                          // FOUR-PER-SPACE, SIX-PER-EM SPACE,
         (0x2008 <= u && u <= 0x200B) ||  // PUNCTUATION SPACE, THIN SPACE,
                                          // HAIR SPACE, ZERO WIDTH SPACE
         u == 0x1361 ||                   // ETHIOPIC WORDSPACE
         u == 0x1680 ||                   // OGHAM SPACE MARK
         u == 0x205F;                     // MEDIUM MATHEMATICAL SPACE
}

}  // namespace intl
}  // namespace mozilla

#endif /* mozilla_intl_LineBreaker_h_ */
