/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"

#include "nsEscape.h"
#include "nsString.h"
#include "nsURLHelper.h"
#include "Taint.h"

using namespace mozilla;

namespace {

static SafeStringTaint TestTaint(uint32_t aBegin, uint32_t aEnd) {
  TaintOperation op("TestNetworkTaint");
  op.setSource();
  return SafeStringTaint(aBegin, aEnd, op);
}

static void ExpectSingleTaintRange(const nsACString& aStr, uint32_t aBegin,
                                   uint32_t aEnd) {
  ASSERT_TRUE(aStr.Taint().hasTaint());
  auto range = aStr.Taint().begin();
  ASSERT_NE(range, aStr.Taint().end());
  EXPECT_EQ(range->begin(), aBegin);
  EXPECT_EQ(range->end(), aEnd);
  EXPECT_EQ(++range, aStr.Taint().end());
}

}  // namespace

TEST(TestNetworkTaint, FilterURIStringRebasesTaintOnTrimmedSpec)
{
  nsAutoCString input(" javascript:alert(1) "_ns);
  input.AssignTaint(TestTaint(12, 20));  // "alert(1)"

  nsAutoCString result;
  net_FilterURIString(input, result);

  ASSERT_TRUE(result.EqualsLiteral("javascript:alert(1)"));
  ExpectSingleTaintRange(result, 11, 19);
}

TEST(TestNetworkTaint, FilterAndEscapeURIPropagatesTaintOnTrimmedSpec)
{
  nsAutoCString input(" javascript:alert(1) "_ns);
  input.AssignTaint(TestTaint(12, 20));  // "alert(1)"

  nsAutoCString result;
  ASSERT_EQ(net_FilterAndEscapeURI(input, esc_OnlyNonASCII,
                                   ASCIIMask::MaskCRLFTab(), result),
            NS_OK);

  ASSERT_TRUE(result.EqualsLiteral("javascript:alert(1)"));
  ExpectSingleTaintRange(result, 11, 19);
}

TEST(TestNetworkTaint, FilterAndEscapeURIPropagatesTaintOnEscapedSpec)
{
  nsAutoCString input(" javascript:\xC3\xA9 "_ns);
  input.AssignTaint(TestTaint(12, 14));  // the two UTF-8 bytes of e-acute

  nsAutoCString result;
  ASSERT_EQ(net_FilterAndEscapeURI(input, esc_OnlyNonASCII,
                                   ASCIIMask::MaskCRLFTab(), result),
            NS_OK);

  ASSERT_TRUE(result.EqualsLiteral("javascript:%C3%A9"));
  ExpectSingleTaintRange(result, 11, 17);
}
