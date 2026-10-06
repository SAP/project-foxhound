/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsHtml5TokenizerLoopPoliciesSIMD_h
#define nsHtml5TokenizerLoopPoliciesSIMD_h

#include "mozilla/Attributes.h"
#include "mozilla/htmlaccel/htmlaccelNotInline.h"

/**
 * This policy does not report tokenizer transitions anywhere and does not
 * track line and column numbers. To be used for innerHTML.
 *
 * This the SIMD version for aarch64 and SSSE3-enabled x86/x86_64.
 */
struct nsHtml5FastestPolicySIMD {
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
    // We need to check bounds for the `buf[pos]` access below to be OK.
    // Instead of just checking that `pos` isn't equal to `endPos`, let's
    // check that have at least one SIMD stride of data in the same branch,
    // since if we don't have at least one SIMD stride of data, we don't
    // need to proceed.
    if (endPos - pos < 16) {
      return 0;
    }
    if (buf[pos] == '<') {
      // Quickly handle the case where there is one tag immediately
      // after another and the very first thing in the data state is a
      // less-than sign.
      return 0;
    }
    return mozilla::htmlaccel::AccelerateDataFastest(buf + pos, buf + endPos);
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t accelerateAdvancementRawtext(
      nsHtml5Tokenizer* aTokenizer, char16_t* buf, int32_t pos,
      int32_t endPos) {
    // We need to check bounds for the `buf[pos]` access below to be OK.
    // Instead of just checking that `pos` isn't equal to `endPos`, let's
    // check that have at least one SIMD stride of data in the same branch,
    // since if we don't have at least one SIMD stride of data, we don't
    // need to proceed.
    if (endPos - pos < 16) {
      return 0;
    }
    if (buf[pos] == '<') {
      // Quickly handle the <iframe></iframe> case.
      return 0;
    }
    return mozilla::htmlaccel::AccelerateRawtextFastest(buf + pos,
                                                        buf + endPos);
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t
  accelerateAdvancementScriptDataEscaped(nsHtml5Tokenizer* aTokenizer,
                                         char16_t* buf, int32_t pos,
                                         int32_t endPos) {
    // This state shares the SIMD part with the comment state, but this
    // wrapper needs to differ!
    return mozilla::htmlaccel::AccelerateCommentFastest(buf + pos,
                                                        buf + endPos);
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t accelerateAdvancementComment(
      nsHtml5Tokenizer* aTokenizer, char16_t* buf, int32_t pos,
      int32_t endPos) {
    int32_t len = endPos - pos;
    int32_t strBufAvailable = aTokenizer->strBuf.length - aTokenizer->strBufLen;
    if (len > strBufAvailable) {
      MOZ_DIAGNOSTIC_ASSERT(false, "strBuf has not been extended correctly.");
      len = strBufAvailable;
    }
    int32_t advance = mozilla::htmlaccel::AccelerateCommentFastest(
        buf + pos, buf + pos + len);
    // States that on the non-SIMD path copy characters to strBuf also
    // need to do that in the SIMD case.
    nsHtml5ArrayCopy::arraycopy(buf, pos, aTokenizer->strBuf,
                                aTokenizer->strBufLen, advance);
    aTokenizer->strBufLen += advance;
    return advance;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t
  accelerateAdvancementAttributeValueSingleQuoted(nsHtml5Tokenizer* aTokenizer,
                                                  char16_t* buf, int32_t pos,
                                                  int32_t endPos) {
    int32_t len = endPos - pos;
    int32_t strBufAvailable = aTokenizer->strBuf.length - aTokenizer->strBufLen;
    if (len > strBufAvailable) {
      MOZ_DIAGNOSTIC_ASSERT(false, "strBuf has not been extended correctly.");
      len = strBufAvailable;
    }
    int32_t advance =
        mozilla::htmlaccel::AccelerateAttributeValueSingleQuotedFastest(
            buf + pos, buf + pos + len);
    // States that on the non-SIMD path copy characters to strBuf also
    // need to do that in the SIMD case.
    nsHtml5ArrayCopy::arraycopy(buf, pos, aTokenizer->strBuf,
                                aTokenizer->strBufLen, advance);
    aTokenizer->strBufLen += advance;
    return advance;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t
  accelerateAdvancementAttributeValueDoubleQuoted(nsHtml5Tokenizer* aTokenizer,
                                                  char16_t* buf, int32_t pos,
                                                  int32_t endPos) {
    int32_t len = endPos - pos;
    int32_t strBufAvailable = aTokenizer->strBuf.length - aTokenizer->strBufLen;
    if (len > strBufAvailable) {
      MOZ_DIAGNOSTIC_ASSERT(false, "strBuf has not been extended correctly.");
      len = strBufAvailable;
    }
    int32_t advance =
        mozilla::htmlaccel::AccelerateAttributeValueDoubleQuotedFastest(
            buf + pos, buf + pos + len);
    // States that on the non-SIMD path copy characters to strBuf also
    // need to do that in the SIMD case.
    nsHtml5ArrayCopy::arraycopy(buf, pos, aTokenizer->strBuf,
                                aTokenizer->strBufLen, advance);
    aTokenizer->strBufLen += advance;
    return advance;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t accelerateAdvancementCdataSection(
      nsHtml5Tokenizer* aTokenizer, char16_t* buf, int32_t pos,
      int32_t endPos) {
    return mozilla::htmlaccel::AccelerateCdataSectionFastest(buf + pos,
                                                             buf + endPos);
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t accelerateAdvancementPlaintext(
      nsHtml5Tokenizer* aTokenizer, char16_t* buf, int32_t pos,
      int32_t endPos) {
    return mozilla::htmlaccel::AcceleratePlaintextFastest(buf + pos,
                                                          buf + endPos);
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
struct nsHtml5LineColPolicySIMD {
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
    // We need to check bounds for the `buf[pos]` access below to be OK.
    // Instead of just checking that `pos` isn't equal to `endPos`, let's
    // check that have at least one SIMD stride of data in the same branch,
    // since if we don't have at least one SIMD stride of data, we don't
    // need to proceed.
    if (endPos - pos < 16) {
      return 0;
    }
    char16_t c = buf[pos];
    if (c == '<' || c == '\n') {
      // Quickly handle the case where there is one tag immediately
      // after another and the very first thing in the data state is a
      // less-than sign and the case where a tag is immediately followed
      // by a line feed.
      return 0;
    }
    int32_t advance =
        mozilla::htmlaccel::AccelerateDataLineCol(buf + pos, buf + endPos);
    if (!advance) {
      // When the SIMD advance is zero, don't touch the line and col tracking.
      return 0;
    }
    if (MOZ_UNLIKELY(aTokenizer->nextCharOnNewLine)) {
      // By changing the line and column here instead
      // of doing so eagerly when seeing the line break
      // causes the line break itself to be considered
      // column-wise at the end of a line.
      aTokenizer->line++;
      aTokenizer->col = advance;
      aTokenizer->nextCharOnNewLine = false;
    } else {
      aTokenizer->col += advance;
    }
    return advance;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t accelerateAdvancementRawtext(
      nsHtml5Tokenizer* aTokenizer, char16_t* buf, int32_t pos,
      int32_t endPos) {
    // We need to check bounds for the `buf[pos]` access below to be OK.
    // Instead of just checking that `pos` isn't equal to `endPos`, let's
    // check that have at least one SIMD stride of data in the same branch,
    // since if we don't have at least one SIMD stride of data, we don't
    // need to proceed.
    if (endPos - pos < 16) {
      return 0;
    }
    char16_t c = buf[pos];
    if (c == '<' || c == '\n') {
      // Quickly handle the case where there is one tag immediately
      // after another and the very first thing in the data is a
      // less-than sign and the case where a tag is immediately followed
      // by a line feed.
      return 0;
    }
    int32_t advance =
        mozilla::htmlaccel::AccelerateRawtextLineCol(buf + pos, buf + endPos);
    if (!advance) {
      // When the SIMD advance is zero, don't touch the line and col tracking.
      return 0;
    }
    if (MOZ_UNLIKELY(aTokenizer->nextCharOnNewLine)) {
      // By changing the line and column here instead
      // of doing so eagerly when seeing the line break
      // causes the line break itself to be considered
      // column-wise at the end of a line.
      aTokenizer->line++;
      aTokenizer->col = advance;
      aTokenizer->nextCharOnNewLine = false;
    } else {
      aTokenizer->col += advance;
    }
    return advance;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t
  accelerateAdvancementScriptDataEscaped(nsHtml5Tokenizer* aTokenizer,
                                         char16_t* buf, int32_t pos,
                                         int32_t endPos) {
    // This state shares the SIMD part with the comment state, but this
    // wrapper needs to differ!
    int32_t advance =
        mozilla::htmlaccel::AccelerateCommentLineCol(buf + pos, buf + endPos);
    if (!advance) {
      // When the SIMD advance is zero, don't touch the line and col tracking.
      return 0;
    }
    if (MOZ_UNLIKELY(aTokenizer->nextCharOnNewLine)) {
      // By changing the line and column here instead
      // of doing so eagerly when seeing the line break
      // causes the line break itself to be considered
      // column-wise at the end of a line.
      aTokenizer->line++;
      aTokenizer->col = advance;
      aTokenizer->nextCharOnNewLine = false;
    } else {
      aTokenizer->col += advance;
    }
    return advance;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t accelerateAdvancementComment(
      nsHtml5Tokenizer* aTokenizer, char16_t* buf, int32_t pos,
      int32_t endPos) {
    int32_t len = endPos - pos;
    int32_t strBufAvailable = aTokenizer->strBuf.length - aTokenizer->strBufLen;
    if (len > strBufAvailable) {
      MOZ_DIAGNOSTIC_ASSERT(false, "strBuf has not been extended correctly.");
      len = strBufAvailable;
    }
    int32_t advance = mozilla::htmlaccel::AccelerateCommentLineCol(
        buf + pos, buf + pos + len);
    if (!advance) {
      // When the SIMD advance is zero, don't touch the line and col tracking.
      return 0;
    }
    if (MOZ_UNLIKELY(aTokenizer->nextCharOnNewLine)) {
      // By changing the line and column here instead
      // of doing so eagerly when seeing the line break
      // causes the line break itself to be considered
      // column-wise at the end of a line.
      aTokenizer->line++;
      aTokenizer->col = advance;
      aTokenizer->nextCharOnNewLine = false;
    } else {
      aTokenizer->col += advance;
    }
    // States that on the non-SIMD path copy characters to strBuf also
    // need to do that in the SIMD case.
    nsHtml5ArrayCopy::arraycopy(buf, pos, aTokenizer->strBuf,
                                aTokenizer->strBufLen, advance);
    aTokenizer->strBufLen += advance;
    return advance;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t
  accelerateAdvancementAttributeValueSingleQuoted(nsHtml5Tokenizer* aTokenizer,
                                                  char16_t* buf, int32_t pos,
                                                  int32_t endPos) {
    int32_t len = endPos - pos;
    int32_t strBufAvailable = aTokenizer->strBuf.length - aTokenizer->strBufLen;
    if (len > strBufAvailable) {
      MOZ_DIAGNOSTIC_ASSERT(false, "strBuf has not been extended correctly.");
      len = strBufAvailable;
    }
    int32_t advance =
        mozilla::htmlaccel::AccelerateAttributeValueSingleQuotedLineCol(
            buf + pos, buf + pos + len);
    if (!advance) {
      // When the SIMD advance is zero, don't touch the line and col tracking.
      return 0;
    }
    if (MOZ_UNLIKELY(aTokenizer->nextCharOnNewLine)) {
      // By changing the line and column here instead
      // of doing so eagerly when seeing the line break
      // causes the line break itself to be considered
      // column-wise at the end of a line.
      aTokenizer->line++;
      aTokenizer->col = advance;
      aTokenizer->nextCharOnNewLine = false;
    } else {
      aTokenizer->col += advance;
    }
    // States that on the non-SIMD path copy characters to strBuf also
    // need to do that in the SIMD case.
    nsHtml5ArrayCopy::arraycopy(buf, pos, aTokenizer->strBuf,
                                aTokenizer->strBufLen, advance);
    aTokenizer->strBufLen += advance;
    return advance;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t
  accelerateAdvancementAttributeValueDoubleQuoted(nsHtml5Tokenizer* aTokenizer,
                                                  char16_t* buf, int32_t pos,
                                                  int32_t endPos) {
    int32_t len = endPos - pos;
    int32_t strBufAvailable = aTokenizer->strBuf.length - aTokenizer->strBufLen;
    if (len > strBufAvailable) {
      MOZ_DIAGNOSTIC_ASSERT(false, "strBuf has not been extended correctly.");
      len = strBufAvailable;
    }
    int32_t advance =
        mozilla::htmlaccel::AccelerateAttributeValueDoubleQuotedLineCol(
            buf + pos, buf + pos + len);
    if (!advance) {
      // When the SIMD advance is zero, don't touch the line and col tracking.
      return 0;
    }
    if (MOZ_UNLIKELY(aTokenizer->nextCharOnNewLine)) {
      // By changing the line and column here instead
      // of doing so eagerly when seeing the line break
      // causes the line break itself to be considered
      // column-wise at the end of a line.
      aTokenizer->line++;
      aTokenizer->col = advance;
      aTokenizer->nextCharOnNewLine = false;
    } else {
      aTokenizer->col += advance;
    }
    // States that on the non-SIMD path copy characters to strBuf also
    // need to do that in the SIMD case.
    nsHtml5ArrayCopy::arraycopy(buf, pos, aTokenizer->strBuf,
                                aTokenizer->strBufLen, advance);
    aTokenizer->strBufLen += advance;
    return advance;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t accelerateAdvancementCdataSection(
      nsHtml5Tokenizer* aTokenizer, char16_t* buf, int32_t pos,
      int32_t endPos) {
    int32_t advance = mozilla::htmlaccel::AccelerateCdataSectionLineCol(
        buf + pos, buf + endPos);
    if (!advance) {
      // When the SIMD advance is zero, don't touch the line and col tracking.
      return 0;
    }
    if (MOZ_UNLIKELY(aTokenizer->nextCharOnNewLine)) {
      // By changing the line and column here instead
      // of doing so eagerly when seeing the line break
      // causes the line break itself to be considered
      // column-wise at the end of a line.
      aTokenizer->line++;
      aTokenizer->col = advance;
      aTokenizer->nextCharOnNewLine = false;
    } else {
      aTokenizer->col += advance;
    }
    return advance;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t accelerateAdvancementPlaintext(
      nsHtml5Tokenizer* aTokenizer, char16_t* buf, int32_t pos,
      int32_t endPos) {
    int32_t advance =
        mozilla::htmlaccel::AcceleratePlaintextLineCol(buf + pos, buf + endPos);
    if (!advance) {
      // When the SIMD advance is zero, don't touch the line and col tracking.
      return 0;
    }
    if (MOZ_UNLIKELY(aTokenizer->nextCharOnNewLine)) {
      // By changing the line and column here instead
      // of doing so eagerly when seeing the line break
      // causes the line break itself to be considered
      // column-wise at the end of a line.
      aTokenizer->line++;
      aTokenizer->col = advance;
      aTokenizer->nextCharOnNewLine = false;
    } else {
      aTokenizer->col += advance;
    }
    return advance;
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
struct nsHtml5ViewSourcePolicySIMD {
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
    // We need to check bounds for the `buf[pos]` access below to be OK.
    // Instead of just checking that `pos` isn't equal to `endPos`, let's
    // check that have at least one SIMD stride of data in the same branch,
    // since if we don't have at least one SIMD stride of data, we don't
    // need to proceed.
    if (endPos - pos < 16) {
      return 0;
    }
    char16_t c = buf[pos];
    if (c == '<' || c == '\n') {
      // Quickly handle the case where there is one tag immediately
      // after another and the very first thing in the data state is a
      // less-than sign and the case where a tag is immediately followed
      // by a line feed.
      return 0;
    }
    return mozilla::htmlaccel::AccelerateDataViewSource(buf + pos,
                                                        buf + endPos);
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t accelerateAdvancementRawtext(
      nsHtml5Tokenizer* aTokenizer, char16_t* buf, int32_t pos,
      int32_t endPos) {
    // We need to check bounds for the `buf[pos]` access below to be OK.
    // Instead of just checking that `pos` isn't equal to `endPos`, let's
    // check that have at least one SIMD stride of data in the same branch,
    // since if we don't have at least one SIMD stride of data, we don't
    // need to proceed.
    if (endPos - pos < 16) {
      return 0;
    }
    char16_t c = buf[pos];
    if (c == '<' || c == '\n') {
      // Quickly handle the case where there is one tag immediately
      // after another and the very first thing in the state is a
      // less-than sign and the case where a tag is immediately followed
      // by a line feed.
      return 0;
    }
    return mozilla::htmlaccel::AccelerateRawtextViewSource(buf + pos,
                                                           buf + endPos);
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t
  accelerateAdvancementScriptDataEscaped(nsHtml5Tokenizer* aTokenizer,
                                         char16_t* buf, int32_t pos,
                                         int32_t endPos) {
    // This state shares the SIMD part with the comment state, but this
    // wrapper needs to differ!
    return mozilla::htmlaccel::AccelerateCommentViewSource(buf + pos,
                                                           buf + endPos);
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t accelerateAdvancementComment(
      nsHtml5Tokenizer* aTokenizer, char16_t* buf, int32_t pos,
      int32_t endPos) {
    int32_t len = endPos - pos;
    int32_t strBufAvailable = aTokenizer->strBuf.length - aTokenizer->strBufLen;
    if (len > strBufAvailable) {
      MOZ_DIAGNOSTIC_ASSERT(false, "strBuf has not been extended correctly.");
      len = strBufAvailable;
    }
    int32_t advance = mozilla::htmlaccel::AccelerateCommentViewSource(
        buf + pos, buf + pos + len);
    // States that on the non-SIMD path copy characters to strBuf also
    // need to do that in the SIMD case.
    nsHtml5ArrayCopy::arraycopy(buf, pos, aTokenizer->strBuf,
                                aTokenizer->strBufLen, advance);
    aTokenizer->strBufLen += advance;
    return advance;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t
  accelerateAdvancementAttributeValueSingleQuoted(nsHtml5Tokenizer* aTokenizer,
                                                  char16_t* buf, int32_t pos,
                                                  int32_t endPos) {
    int32_t len = endPos - pos;
    int32_t strBufAvailable = aTokenizer->strBuf.length - aTokenizer->strBufLen;
    if (len > strBufAvailable) {
      MOZ_DIAGNOSTIC_ASSERT(false, "strBuf has not been extended correctly.");
      len = strBufAvailable;
    }
    int32_t advance =
        mozilla::htmlaccel::AccelerateAttributeValueSingleQuotedViewSource(
            buf + pos, buf + pos + len);
    // States that on the non-SIMD path copy characters to strBuf also
    // need to do that in the SIMD case.
    nsHtml5ArrayCopy::arraycopy(buf, pos, aTokenizer->strBuf,
                                aTokenizer->strBufLen, advance);
    aTokenizer->strBufLen += advance;
    return advance;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t
  accelerateAdvancementAttributeValueDoubleQuoted(nsHtml5Tokenizer* aTokenizer,
                                                  char16_t* buf, int32_t pos,
                                                  int32_t endPos) {
    int32_t len = endPos - pos;
    int32_t strBufAvailable = aTokenizer->strBuf.length - aTokenizer->strBufLen;
    if (len > strBufAvailable) {
      MOZ_DIAGNOSTIC_ASSERT(false, "strBuf has not been extended correctly.");
      len = strBufAvailable;
    }
    int32_t advance =
        mozilla::htmlaccel::AccelerateAttributeValueDoubleQuotedViewSource(
            buf + pos, buf + pos + len);
    // States that on the non-SIMD path copy characters to strBuf also
    // need to do that in the SIMD case.
    nsHtml5ArrayCopy::arraycopy(buf, pos, aTokenizer->strBuf,
                                aTokenizer->strBufLen, advance);
    aTokenizer->strBufLen += advance;
    return advance;
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t accelerateAdvancementCdataSection(
      nsHtml5Tokenizer* aTokenizer, char16_t* buf, int32_t pos,
      int32_t endPos) {
    return mozilla::htmlaccel::AccelerateCdataSectionViewSource(buf + pos,
                                                                buf + endPos);
  }

  MOZ_ALWAYS_INLINE_EVEN_DEBUG static int32_t accelerateAdvancementPlaintext(
      nsHtml5Tokenizer* aTokenizer, char16_t* buf, int32_t pos,
      int32_t endPos) {
    return mozilla::htmlaccel::AcceleratePlaintextViewSource(buf + pos,
                                                             buf + endPos);
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

#endif  // nsHtml5TokenizerLoopPoliciesSIMD_h
