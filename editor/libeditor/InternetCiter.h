/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef InternetCiter_h
#define InternetCiter_h

#include "nscore.h"
#include "nsStringFwd.h"

namespace mozilla {

/**
 * Mail citations using standard Internet style.
 */
class InternetCiter final {
 public:
  static void GetCiteString(const nsAString& aInString, nsAString& aOutString);

  static void Rewrap(const nsAString& aInString, uint32_t aWrapCol,
                     uint32_t aFirstLineOffset, bool aRespectNewlines,
                     nsAString& aOutString);

 private:
  struct BodyRange;
  struct PhysicalLine;
  struct QuotedParagraph;

  static uint32_t QuotePrefixLength(uint32_t aQuoteLevel);
  static void AppendQuoteMarkers(nsAString& aOutString, uint32_t aQuoteLevel);
  static bool IsSpace(char16_t aChar);
  static bool IsBodyBoundarySpace(char16_t aChar);
  static void EnsureEndsWithLineBreak(nsAString& aOutString);
  static void StartOutputLine(nsAString& aOutString, uint32_t aQuoteLevel);
  static uint32_t ShortestUsefulQuotedBodyColumn(uint32_t aWrapCol);
  static uint32_t BodyWrapColumn(uint32_t aQuoteLevel, uint32_t aWrapCol);
  static uint32_t FindBodyLineBreak(const nsPromiseFlatString& aString,
                                    const BodyRange& aRange,
                                    uint32_t aBodyWrapColumn);
  static uint32_t AppendBodySlice(nsAString& aOutString,
                                  const nsPromiseFlatString& aString,
                                  uint32_t aBodyStart, uint32_t aLength);
  static void EmitBlankQuotedLine(nsAString& aOutString, uint32_t aQuoteLevel,
                                  bool aEndedWithNewLine,
                                  QuotedParagraph& aParagraph);
  static void EmitUnquotedLine(nsAString& aOutString,
                               const nsPromiseFlatString& aString,
                               const PhysicalLine& aLine,
                               QuotedParagraph& aParagraph);
};

}  // namespace mozilla

#endif  // #ifndef InternetCiter_h
