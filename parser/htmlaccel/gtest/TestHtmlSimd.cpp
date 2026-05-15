/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"
#include "mozilla/htmlaccel/htmlaccelNotInline.h"

// Match in the first half
const char16_t HTML_SIMD_TEST_INPUT_LOW[16] = {
    'a',
    0xD834,  // Surrogate pair
    0xDD65, '\n', '<', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p',
};

// Match in the second half
const char16_t HTML_SIMD_TEST_INPUT_HIGH[16] = {
    'i',    'j',  'k', 'l', 'm', 'n', 'o', 'p', 'a',
    0xD834,  // Surrogate pair
    0xDD65, '\n', '<', 'f', 'g', 'h',
};

TEST(HtmlSimd, TestTextNodeAllowSurrogatesAndLf)
{
  int32_t index = mozilla::htmlaccel::AccelerateDataFastest(
      HTML_SIMD_TEST_INPUT_LOW, HTML_SIMD_TEST_INPUT_LOW + 16);
  ASSERT_EQ(index, 4);
}

TEST(HtmlSimd, TestTextNodeAllowSurrogatesDisallowLf)
{
  int32_t index = mozilla::htmlaccel::AccelerateDataViewSource(
      HTML_SIMD_TEST_INPUT_LOW, HTML_SIMD_TEST_INPUT_LOW + 16);
  ASSERT_EQ(index, 3);
}

TEST(HtmlSimd, TestTextNodeDisallowSurrogatesAndLf)
{
  int32_t index = mozilla::htmlaccel::AccelerateDataLineCol(
      HTML_SIMD_TEST_INPUT_LOW, HTML_SIMD_TEST_INPUT_LOW + 16);
  ASSERT_EQ(index, 1);
}

TEST(HtmlSimd, TestTextNodeAllowSurrogatesAndLfHigh)
{
  int32_t index = mozilla::htmlaccel::AccelerateDataFastest(
      HTML_SIMD_TEST_INPUT_HIGH, HTML_SIMD_TEST_INPUT_HIGH + 16);
  ASSERT_EQ(index, 4 + 8);
}

TEST(HtmlSimd, TestTextNodeAllowSurrogatesDisallowLfHigh)
{
  int32_t index = mozilla::htmlaccel::AccelerateDataViewSource(
      HTML_SIMD_TEST_INPUT_HIGH, HTML_SIMD_TEST_INPUT_HIGH + 16);
  ASSERT_EQ(index, 3 + 8);
}

TEST(HtmlSimd, TestTextNodeDisallowSurrogatesAndLfHigh)
{
  int32_t index = mozilla::htmlaccel::AccelerateDataLineCol(
      HTML_SIMD_TEST_INPUT_HIGH, HTML_SIMD_TEST_INPUT_HIGH + 16);
  ASSERT_EQ(index, 1 + 8);
}
