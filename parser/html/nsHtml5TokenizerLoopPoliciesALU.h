/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsHtml5TokenizerLoopPoliciesALU_h
#define nsHtml5TokenizerLoopPoliciesALU_h

/**
 * This policy does not report tokenizer transitions anywhere and does not
 * track line and column numbers. To be used for innerHTML. Non-SIMD version.
 */
struct nsHtml5FastestPolicyALU {
  static const bool reportErrors = false;
  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t transition(
      nsHtml5Highlighter* aHighlighter, int32_t aState, bool aReconsume,
      int32_t aPos) {
    return aState;
  }
  MOZ_ALWAYS_INLINE_EVEN_DEBUG static void completedNamedCharacterReference(
      nsHtml5Highlighter* aHighlighter) {}

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t accelerateAdvancementData(
      nsHtml5Tokenizer* aTokenizer, char16_t* buf, int32_t pos,
      int32_t endPos) {
    return 0;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t accelerateAdvancementRawtext(
      nsHtml5Tokenizer* aTokenizer, char16_t* buf, int32_t pos,
      int32_t endPos) {
    return 0;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t
  accelerateAdvancementScriptDataEscaped(nsHtml5Tokenizer* aTokenizer,
                                         char16_t* buf, int32_t pos,
                                         int32_t endPos) {
    return 0;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t accelerateAdvancementComment(
      nsHtml5Tokenizer* aTokenizer, char16_t* buf, int32_t pos,
      int32_t endPos) {
    return 0;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t
  accelerateAdvancementAttributeValueSingleQuoted(nsHtml5Tokenizer* aTokenizer,
                                                  char16_t* buf, int32_t pos,
                                                  int32_t endPos) {
    return 0;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t
  accelerateAdvancementAttributeValueDoubleQuoted(nsHtml5Tokenizer* aTokenizer,
                                                  char16_t* buf, int32_t pos,
                                                  int32_t endPos) {
    return 0;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t accelerateAdvancementCdataSection(
      nsHtml5Tokenizer* aTokenizer, char16_t* buf, int32_t pos,
      int32_t endPos) {
    return 0;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t accelerateAdvancementPlaintext(
      nsHtml5Tokenizer* aTokenizer, char16_t* buf, int32_t pos,
      int32_t endPos) {
    return 0;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static char16_t checkChar(
      nsHtml5Tokenizer* aTokenizer, char16_t* buf, int32_t pos) {
    return buf[pos];
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static void silentCarriageReturn(
      nsHtml5Tokenizer* aTokenizer) {
    aTokenizer->lastCR = true;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static void silentLineFeed(
      nsHtml5Tokenizer* aTokenizer) {}
};

/**
 * This policy does not report tokenizer transitions anywhere. To be used
 * when _not_ viewing source and when not parsing innerHTML (or other
 * script execution-preventing fragment).
 */
struct nsHtml5LineColPolicyALU {
  static const bool reportErrors = false;
  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t transition(
      nsHtml5Highlighter* aHighlighter, int32_t aState, bool aReconsume,
      int32_t aPos) {
    return aState;
  }
  MOZ_ALWAYS_INLINE_EVEN_DEBUG static void completedNamedCharacterReference(
      nsHtml5Highlighter* aHighlighter) {}

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t accelerateAdvancementData(
      nsHtml5Tokenizer* aTokenizer, char16_t* buf, int32_t pos,
      int32_t endPos) {
    return 0;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t accelerateAdvancementRawtext(
      nsHtml5Tokenizer* aTokenizer, char16_t* buf, int32_t pos,
      int32_t endPos) {
    return 0;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t
  accelerateAdvancementScriptDataEscaped(nsHtml5Tokenizer* aTokenizer,
                                         char16_t* buf, int32_t pos,
                                         int32_t endPos) {
    return 0;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t accelerateAdvancementComment(
      nsHtml5Tokenizer* aTokenizer, char16_t* buf, int32_t pos,
      int32_t endPos) {
    return 0;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t
  accelerateAdvancementAttributeValueSingleQuoted(nsHtml5Tokenizer* aTokenizer,
                                                  char16_t* buf, int32_t pos,
                                                  int32_t endPos) {
    return 0;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t
  accelerateAdvancementAttributeValueDoubleQuoted(nsHtml5Tokenizer* aTokenizer,
                                                  char16_t* buf, int32_t pos,
                                                  int32_t endPos) {
    return 0;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t accelerateAdvancementCdataSection(
      nsHtml5Tokenizer* aTokenizer, char16_t* buf, int32_t pos,
      int32_t endPos) {
    return 0;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t accelerateAdvancementPlaintext(
      nsHtml5Tokenizer* aTokenizer, char16_t* buf, int32_t pos,
      int32_t endPos) {
    return 0;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static char16_t checkChar(
      nsHtml5Tokenizer* aTokenizer, char16_t* buf, int32_t pos) {
    // The name of this method comes from the validator.
    // We aren't checking a char here. We read the next
    // UTF-16 code unit and, before returning it, adjust
    // the line and column numbers.
    char16_t c = buf[pos];
    if (MOZ_UNLIKELY(aTokenizer->nextCharOnNewLine)) {
      // By changing the line and column here instead
      // of doing so eagerly when seeing the line break
      // causes the line break itself to be considered
      // column-wise at the end of a line.
      aTokenizer->line++;
      aTokenizer->col = 1;
      aTokenizer->nextCharOnNewLine = false;
    } else if (MOZ_LIKELY(!NS_IS_LOW_SURROGATE(c))) {
      // SpiderMonkey wants to count scalar values
      // instead of UTF-16 code units. We omit low
      // surrogates from the count so that only the
      // high surrogate increments the count for
      // two-code-unit scalar values.
      //
      // It's somewhat questionable from the performance
      // perspective to make the human-perceivable column
      // count correct for non-BMP characters in the case
      // where there is a single scalar value per extended
      // grapheme cluster when even on the BMP there are
      // various cases where the scalar count doesn't make
      // much sense as a human-perceived "column count" due
      // to extended grapheme clusters consisting of more
      // than one scalar value.
      aTokenizer->col++;
    }
    return c;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static void silentCarriageReturn(
      nsHtml5Tokenizer* aTokenizer) {
    aTokenizer->nextCharOnNewLine = true;
    aTokenizer->lastCR = true;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static void silentLineFeed(
      nsHtml5Tokenizer* aTokenizer) {
    aTokenizer->nextCharOnNewLine = true;
  }
};

/**
 * This policy reports the tokenizer transitions to a highlighter. To be used
 * when viewing source.
 */
struct nsHtml5ViewSourcePolicyALU {
  static const bool reportErrors = true;
  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t transition(
      nsHtml5Highlighter* aHighlighter, int32_t aState, bool aReconsume,
      int32_t aPos) {
    return aHighlighter->Transition(aState, aReconsume, aPos);
  }
  MOZ_ALWAYS_INLINE_EVEN_DEBUG static void completedNamedCharacterReference(
      nsHtml5Highlighter* aHighlighter) {
    aHighlighter->CompletedNamedCharacterReference();
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t accelerateAdvancementData(
      nsHtml5Tokenizer* aTokenizer, char16_t* buf, int32_t pos,
      int32_t endPos) {
    return 0;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t accelerateAdvancementRawtext(
      nsHtml5Tokenizer* aTokenizer, char16_t* buf, int32_t pos,
      int32_t endPos) {
    return 0;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t
  accelerateAdvancementScriptDataEscaped(nsHtml5Tokenizer* aTokenizer,
                                         char16_t* buf, int32_t pos,
                                         int32_t endPos) {
    return 0;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t accelerateAdvancementComment(
      nsHtml5Tokenizer* aTokenizer, char16_t* buf, int32_t pos,
      int32_t endPos) {
    return 0;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t
  accelerateAdvancementAttributeValueSingleQuoted(nsHtml5Tokenizer* aTokenizer,
                                                  char16_t* buf, int32_t pos,
                                                  int32_t endPos) {
    return 0;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t
  accelerateAdvancementAttributeValueDoubleQuoted(nsHtml5Tokenizer* aTokenizer,
                                                  char16_t* buf, int32_t pos,
                                                  int32_t endPos) {
    return 0;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t accelerateAdvancementCdataSection(
      nsHtml5Tokenizer* aTokenizer, char16_t* buf, int32_t pos,
      int32_t endPos) {
    return 0;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t accelerateAdvancementPlaintext(
      nsHtml5Tokenizer* aTokenizer, char16_t* buf, int32_t pos,
      int32_t endPos) {
    return 0;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static char16_t checkChar(
      nsHtml5Tokenizer* aTokenizer, char16_t* buf, int32_t pos) {
    return buf[pos];
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static void silentCarriageReturn(
      nsHtml5Tokenizer* aTokenizer) {
    aTokenizer->line++;
    aTokenizer->lastCR = true;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static void silentLineFeed(
      nsHtml5Tokenizer* aTokenizer) {
    aTokenizer->line++;
  }
};

#endif  // nsHtml5TokenizerLoopPoliciesALU_h
