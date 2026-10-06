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

#include "gfxScriptItemizer.h"
#include "mozilla/intl/UnicodeProperties.h"
#include "nsCharTraits.h"
#include "nsUnicodeProperties.h"
#include "harfbuzz/hb.h"

using namespace mozilla::intl;
using namespace mozilla::unicode;

#define MOD(sp) ((sp) % PAREN_STACK_DEPTH)
#define LIMIT_INC(sp) \
  (((sp) < PAREN_STACK_DEPTH) ? (sp) + 1 : PAREN_STACK_DEPTH)
#define INC(sp, count) (MOD((sp) + (count)))
#define INC1(sp) (INC(sp, 1))
#define DEC(sp, count) (MOD((sp) + PAREN_STACK_DEPTH - (count)))
#define DEC1(sp) (DEC(sp, 1))
#define STACK_IS_EMPTY() (pushCount <= 0)
#define STACK_IS_NOT_EMPTY() (!STACK_IS_EMPTY())
#define TOP() (parenStack[parenSP])
#define SYNC_FIXUP() (fixupCount = 0)

void gfxScriptItemizer::push(uint32_t endPairChar, Script newScriptCode) {
  pushCount = LIMIT_INC(pushCount);
  fixupCount = LIMIT_INC(fixupCount);

  parenSP = INC1(parenSP);
  parenStack[parenSP].endPairChar = endPairChar;
  parenStack[parenSP].scriptCode = newScriptCode;
}

void gfxScriptItemizer::pop() {
  if (STACK_IS_EMPTY()) {
    return;
  }

  if (fixupCount > 0) {
    fixupCount -= 1;
  }

  pushCount -= 1;
  parenSP = DEC1(parenSP);

  /* If the stack is now empty, reset the stack
     pointers to their initial values.
   */
  if (STACK_IS_EMPTY()) {
    parenSP = -1;
  }
}

void gfxScriptItemizer::fixup(Script newScriptCode) {
  int32_t fixupSP = DEC(parenSP, fixupCount);

  while (fixupCount-- > 0) {
    fixupSP = INC1(fixupSP);
    parenStack[fixupSP].scriptCode = newScriptCode;
  }
}

static inline bool CanMergeWithContext(Script aScript) {
  return aScript <= Script::INHERITED || aScript == Script::UNKNOWN;
}

// We regard the current char as having the same script as the in-progress run
// if either script is Common/Inherited/Unknown, or if the run script appears
// in the character's ScriptExtensions, or if the char is a cluster extender.
static inline bool SameScript(Script runScript, Script currCharScript,
                              uint32_t aCurrCh) {
  return CanMergeWithContext(runScript) ||
         CanMergeWithContext(currCharScript) || currCharScript == runScript ||
         IsClusterExtender(aCurrCh) ||
         UnicodeProperties::HasScript(aCurrCh, runScript);
}

gfxScriptItemizer::Run gfxScriptItemizer::Next() {
  // The caller should have checked !Done() before calling this.
  MOZ_DIAGNOSTIC_ASSERT(scriptLimit < textLength, "already finished!");

  SYNC_FIXUP();
  scriptCode = Script::COMMON;
  Script fallbackScript = Script::UNKNOWN;

  for (scriptStart = scriptLimit; scriptLimit < textLength; scriptLimit += 1) {
    const uint32_t startOfChar = scriptLimit;
    uint32_t ch = textPtr[scriptLimit];
    Script sc;

    // Fast path for most Latin text: avoid GetScriptCode/GetGeneralCategory.
    // Characters below kFirstNonCommonOrLatin are either COMMON or LATIN,
    // and we have a fast-path lookup for these.
    if (ch < kFirstNonCommonOrLatin) {
      sc = FastGetScriptCode(ch);
    } else {
      // decode UTF-16 (may be surrogate pair)
      if (scriptLimit < textLength - 1 &&
          NS_IS_SURROGATE_PAIR(ch, textPtr[scriptLimit + 1])) {
        ch = SURROGATE_TO_UCS4(ch, textPtr[++scriptLimit]);
      }
      sc = UnicodeProperties::GetScriptCode(ch);
    }

    // Initialize gc to UNASSIGNED; we'll only set it to the true GC
    // if the character has script=COMMON, otherwise we don't care.
    uint8_t gc = HB_UNICODE_GENERAL_CATEGORY_UNASSIGNED;

    if (sc == Script::COMMON) {
      // Paired character handling:
      //
      // if it's an open character, push it onto the stack.
      // if it's a close character, find the matching open on the
      // stack, and use that script code. Any non-matching open
      // characters above it on the stack will be popped.
      //
      // We only do this if the script is COMMON; for chars with
      // specific script assignments, we just use them as-is.
      static constexpr uint32_t kFirstNonLatinOpenOrClose = 0x0F3A;
      if (ch < kFirstNonLatinOpenOrClose) {
        // Avoid calling GetGeneralCategory() for common Latin-script cases:
        // there are only 3 pairs of open/close punctuation in the early blocks
        // of Unicode, and those are the only categories we care about.
        if (ch == '(' || ch == '[' || ch == '{') {
          gc = HB_UNICODE_GENERAL_CATEGORY_OPEN_PUNCTUATION;
        } else if (ch == ')' || ch == ']' || ch == '}') {
          gc = HB_UNICODE_GENERAL_CATEGORY_CLOSE_PUNCTUATION;
        }
      } else {
        gc = GetGeneralCategory(ch);
      }
      if (gc == HB_UNICODE_GENERAL_CATEGORY_OPEN_PUNCTUATION) {
        uint32_t endPairChar = UnicodeProperties::CharMirror(ch);
        if (endPairChar != ch) {
          push(endPairChar, scriptCode);
        }
      } else if (gc == HB_UNICODE_GENERAL_CATEGORY_CLOSE_PUNCTUATION &&
                 UnicodeProperties::IsMirrored(ch)) {
        while (STACK_IS_NOT_EMPTY() && TOP().endPairChar != ch) {
          pop();
        }

        if (STACK_IS_NOT_EMPTY()) {
          sc = TOP().scriptCode;
        }
      }
    }

    // Both Hiragana and Katakana are shaped as OpenType 'kana'. Merge them
    // here to avoid script-run breaks and allow kerning to apply between the
    // two alphabets.
    if (sc == Script::HIRAGANA) {
      sc = Script::KATAKANA;
    }

    if (SameScript(scriptCode, sc, ch)) {
      if (scriptCode == Script::COMMON) {
        // If we have not yet resolved a specific scriptCode for the run,
        // check whether this character provides it.
        if (!CanMergeWithContext(sc)) {
          // Use this character's script.
          scriptCode = sc;
          fixup(scriptCode);
        } else if (fallbackScript == Script::UNKNOWN) {
          // See if the character has a ScriptExtensions property we can
          // store for use in the event the run remains unresolved.
          UnicodeProperties::ScriptExtensionVector extensions;
          auto extResult = UnicodeProperties::GetExtensions(ch, extensions);
          if (extResult.isOk()) {
            Script ext = Script(extensions[0]);
            if (!CanMergeWithContext(ext)) {
              fallbackScript = ext;
            }
          }
        }
      }

      // if this character is a close paired character,
      // pop the matching open character from the stack
      if (gc == HB_UNICODE_GENERAL_CATEGORY_CLOSE_PUNCTUATION &&
          UnicodeProperties::IsMirrored(ch)) {
        pop();
      }
    } else {
      // reset scriptLimit in case it was advanced during reading a
      // multiple-code-unit character
      scriptLimit = startOfChar;
      break;
    }
  }

  return Run{scriptStart, scriptLimit - scriptStart,
             (scriptCode == Script::COMMON && fallbackScript != Script::UNKNOWN)
                 ? fallbackScript
                 : scriptCode};
}
