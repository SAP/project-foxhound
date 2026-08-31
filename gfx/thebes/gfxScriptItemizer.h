/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * This file is based on usc_impl.c from ICU 4.2.0.1, slightly adapted
 * for use within Mozilla Gecko, separate from a standard ICU build.
 *
 * The original ICU license of the code follows:
 *
 * ICU License - ICU 1.8.1 and later
 *
 * COPYRIGHT AND PERMISSION NOTICE
 *
 * Copyright (c) 1995-2009 International Business Machines Corporation and
 * others
 *
 * All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, provided that the above copyright notice(s) and this
 * permission notice appear in all copies of the Software and that both the
 * above copyright notice(s) and this permission notice appear in supporting
 * documentation.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT OF THIRD PARTY RIGHTS.
 * IN NO EVENT SHALL THE COPYRIGHT HOLDER OR HOLDERS INCLUDED IN THIS NOTICE
 * BE LIABLE FOR ANY CLAIM, OR ANY SPECIAL INDIRECT OR CONSEQUENTIAL DAMAGES,
 * OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS,
 * WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION,
 * ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS
 * SOFTWARE.
 *
 * Except as contained in this notice, the name of a copyright holder shall
 * not be used in advertising or otherwise to promote the sale, use or other
 * dealings in this Software without prior written authorization of the
 * copyright holder.
 *
 * All trademarks and registered trademarks mentioned herein are the property
 * of their respective owners.
 */

#ifndef GFX_SCRIPTITEMIZER_H
#define GFX_SCRIPTITEMIZER_H

#include <stdint.h>
#include "mozilla/Assertions.h"
#include "mozilla/intl/UnicodeScriptCodes.h"

#define PAREN_STACK_DEPTH 32

class gfxScriptItemizer {
 public:
  using Script = mozilla::intl::Script;

  gfxScriptItemizer(const char16_t* aText, uint32_t aLength)
      : textPtr(aText), textLength(aLength) {}
  gfxScriptItemizer(const gfxScriptItemizer& aOther) = delete;
  gfxScriptItemizer(gfxScriptItemizer&& aOther) = delete;

  struct Run {
    uint32_t mOffset = 0;
    uint32_t mLength = 0;
    Script mScript = Script::COMMON;
  };

  bool Done() const { return scriptLimit >= textLength; }

  Run Next();

  // clang-format off
  // Extracted from UCD Scripts.txt data file:
  // These are all the codepoints with Script=LATIN codepoints in the range from
  // U+0000 to the first non-COMMON, non-LATIN code at U+02EA. Note that some of
  // these ranges are contiguous, so we can use fewer range checks.
  //
  // 0041..005A    ; Latin # L&  [26] LATIN CAPITAL LETTER A..LATIN CAPITAL LETTER Z
  // 0061..007A    ; Latin # L&  [26] LATIN SMALL LETTER A..LATIN SMALL LETTER Z
  // 00AA          ; Latin # Lo       FEMININE ORDINAL INDICATOR
  // 00BA          ; Latin # Lo       MASCULINE ORDINAL INDICATOR
  // 00C0..00D6    ; Latin # L&  [23] LATIN CAPITAL LETTER A WITH GRAVE..LATIN CAPITAL LETTER O WITH DIAERESIS
  // 00D8..00F6    ; Latin # L&  [31] LATIN CAPITAL LETTER O WITH STROKE..LATIN SMALL LETTER O WITH DIAERESIS
  // 00F8..01BA    ; Latin # L& [195] LATIN SMALL LETTER O WITH STROKE..LATIN SMALL LETTER EZH WITH TAIL
  // 01BB          ; Latin # Lo       LATIN LETTER TWO WITH STROKE
  // 01BC..01BF    ; Latin # L&   [4] LATIN CAPITAL LETTER TONE FIVE..LATIN LETTER WYNN
  // 01C0..01C3    ; Latin # Lo   [4] LATIN LETTER DENTAL CLICK..LATIN LETTER RETROFLEX CLICK
  // 01C4..0293    ; Latin # L& [208] LATIN CAPITAL LETTER DZ WITH CARON..LATIN SMALL LETTER EZH WITH CURL
  // 0294..0295    ; Latin # Lo   [2] LATIN LETTER GLOTTAL STOP..LATIN LETTER PHARYNGEAL VOICED FRICATIVE
  // 0296..02AF    ; Latin # L&  [26] LATIN LETTER INVERTED GLOTTAL STOP..LATIN SMALL LETTER TURNED H WITH FISHHOOK AND TAIL
  // 02B0..02B8    ; Latin # Lm   [9] MODIFIER LETTER SMALL H..MODIFIER LETTER SMALL Y
  // 02E0..02E4    ; Latin # Lm   [5] MODIFIER LETTER SMALL GAMMA..MODIFIER LETTER SMALL REVERSED GLOTTAL STOP
  // clang-format on
  static constexpr uint32_t kFirstNonCommonOrLatin = 0x02EA;
  static inline Script FastGetScriptCode(uint32_t aChar) {
    MOZ_ASSERT(aChar < kFirstNonCommonOrLatin);
    // Use the fact that unsigned underflow will wrap to a large number to
    // handle each range with a single comparison, and reduce branching.
    return ((aChar & ~0x0020) - 0x0041 <= 0x005A - 0x0041) ||  // ASCII uc & lc
                   (aChar - 0x00C0 <= 0x00D6 - 0x00C0) ||
                   (aChar - 0x00D8 <= 0x00F6 - 0x00D8) ||
                   (aChar - 0x00F8 <= 0x02B8 - 0x00F8) ||
                   ((aChar & ~0x0010) == 0x00AA) ||  // 0x00AA and 0x00BA
                   (aChar - 0x02E0 <= 0x02E4 - 0x02E0)
               ? Script::LATIN
               : Script::COMMON;
  }

 protected:
  void push(uint32_t endPairChar, Script newScriptCode);
  void pop();
  void fixup(Script newScriptCode);

  struct ParenStackEntry {
    uint32_t endPairChar;
    Script scriptCode;
  };

  const char16_t* const textPtr;
  uint32_t const textLength;

  uint32_t scriptStart = 0;
  uint32_t scriptLimit = 0;
  Script scriptCode = Script::INVALID;

  struct ParenStackEntry parenStack[PAREN_STACK_DEPTH];
  uint32_t parenSP = -1;
  uint32_t pushCount = 0;
  uint32_t fixupCount = 0;
};

#endif /* GFX_SCRIPTITEMIZER_H */
