/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"
#include "mozilla/intl/LineBreaker.h"
#include "mozilla/intl/WordBreaker.h"
#include "nsISupports.h"
#include "nsServiceManagerUtils.h"
#include "nsString.h"
#include "nsTArray.h"
#include "nsXPCOM.h"

using mozilla::intl::LineBreaker;
using mozilla::intl::WordBreaker;

//                         012345678901234
static const char wb0[] = "T";
static const char wb1[] = "h";
static const char wb2[] = "";
static const char wb3[] = "is   is a int";
static const char wb4[] = "";
static const char wb5[] = "";
static const char wb6[] = "ernationali";
static const char wb7[] = "zation work.";

static const char* wb[] = {wb0, wb1, wb2, wb3, wb4, wb5, wb6, wb7};

// This function searches a complete word starting from |offset| in wb[fragN].
// If it reaches the end of wb[fragN], and there is no word break opportunity
// between wb[fragN] and wb[fragN+1], it will continue the search in wb[fragN+1]
// until a word break.
void TestFindWordBreakFromPosition(uint32_t fragN, uint32_t offset,
                                   const char* expected) {
  uint32_t numOfFragment = sizeof(wb) / sizeof(char*);

  NS_ConvertASCIItoUTF16 fragText(wb[fragN]);

  mozilla::intl::WordRange res = WordBreaker::FindWord(fragText, offset);

  nsAutoString result(Substring(fragText, res.mBegin, res.mEnd - res.mBegin));

  if ((uint32_t)fragText.Length() <= res.mEnd) {
    // if we hit the end of the fragment
    for (uint32_t p = fragN + 1; p < numOfFragment; p++) {
      NS_ConvertASCIItoUTF16 nextFragText(wb[p]);
      if (nextFragText.IsEmpty()) {
        // If nextFragText is empty, there's no new possible word break
        // opportunity between previous word and nextFragText.
        continue;
      }

      mozilla::intl::WordRange r = WordBreaker::FindWord(nextFragText, 0);

      result.Append(Substring(nextFragText, r.mBegin, r.mEnd - r.mBegin));

      if ((uint32_t)nextFragText.Length() != r.mEnd) {
        break;
      }
    }
  }

  ASSERT_STREQ(expected, NS_ConvertUTF16toUTF8(result).get())
      << "FindWordBreakFromPosition(" << fragN << ", " << offset << ")";
}

TEST(WordBreak, TestFindWordWithEmptyString)
{
  mozilla::intl::WordRange expect{0, 0};
  mozilla::intl::WordRange result = WordBreaker::FindWord(EmptyString(), 0);
  ASSERT_EQ(expect.mBegin, result.mBegin);
  ASSERT_EQ(expect.mEnd, result.mEnd);
}

TEST(WordBreak, TestFindWordBreakFromPosition)
{
  TestFindWordBreakFromPosition(0, 0, "This");
  TestFindWordBreakFromPosition(1, 0, "his");
  TestFindWordBreakFromPosition(2, 0, "is");
  TestFindWordBreakFromPosition(3, 0, "is");
  TestFindWordBreakFromPosition(3, 1, "is");
  TestFindWordBreakFromPosition(3, 9, " ");
  TestFindWordBreakFromPosition(3, 10, "internationalization");
  TestFindWordBreakFromPosition(4, 0, "ernationalization");
  TestFindWordBreakFromPosition(5, 0, "ernationalization");
  TestFindWordBreakFromPosition(6, 4, "ernationalization");
  TestFindWordBreakFromPosition(6, 8, "ernationalization");
  TestFindWordBreakFromPosition(7, 6, " ");
  TestFindWordBreakFromPosition(7, 7, "work");
}

// Test for StopAtPunctuation option.
TEST(WordBreak, TestFindBreakWithStopAtPunctuation)
{
  nsString fragText(u"one.two");

  mozilla::intl::WordRange result4 = WordBreaker::FindWord(
      fragText, 0, WordBreaker::FindWordOptions::StopAtPunctuation);
  ASSERT_EQ(0u, result4.mBegin);
  ASSERT_EQ(3u, result4.mEnd);
  mozilla::intl::WordRange result5 = WordBreaker::FindWord(
      fragText, 3, WordBreaker::FindWordOptions::StopAtPunctuation);
  ASSERT_EQ(3u, result5.mBegin);
  ASSERT_EQ(4u, result5.mEnd);
  mozilla::intl::WordRange result6 = WordBreaker::FindWord(
      fragText, 4, WordBreaker::FindWordOptions::StopAtPunctuation);
  ASSERT_EQ(4u, result6.mBegin);
  ASSERT_EQ(7u, result6.mEnd);

  // Default (without StopAtPunctuation)
  mozilla::intl::WordRange result7 = WordBreaker::FindWord(fragText, 0);
  ASSERT_EQ(0u, result7.mBegin);
  ASSERT_EQ(7u, result7.mEnd);
  mozilla::intl::WordRange result8 = WordBreaker::FindWord(fragText, 3);
  ASSERT_EQ(0u, result8.mBegin);
  ASSERT_EQ(7u, result8.mEnd);
  mozilla::intl::WordRange result9 = WordBreaker::FindWord(fragText, 4);
  ASSERT_EQ(0u, result9.mBegin);
  ASSERT_EQ(7u, result9.mEnd);
}
