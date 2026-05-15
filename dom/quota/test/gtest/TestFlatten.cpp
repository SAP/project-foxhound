/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "Flatten.h"
#include "gtest/gtest.h"
#include "nsTArray.h"

namespace mozilla::dom::quota {

#ifdef __clang__
#  pragma clang diagnostic push
#  pragma clang diagnostic ignored "-Wunreachable-code-loop-increment"
#endif
TEST(DOM_Quota_Flatten, FlatEmpty)
{
  auto range = Flatten<int>(nsTArray<int>{});

  EXPECT_EQ(std::distance(range.begin(), range.end()), 0);

  for (const auto& item : range) {
    (void)item;
    FAIL();  // should never execute
  }
}

TEST(DOM_Quota_Flatten, NestedOuterEmpty)
{
  auto range = Flatten<int>(nsTArray<CopyableTArray<int>>{});

  EXPECT_EQ(std::distance(range.begin(), range.end()), 0);

  for (const auto& item : range) {
    (void)item;
    FAIL();
  }
}

TEST(DOM_Quota_Flatten, NestedInnerEmpty)
{
  auto range =
      Flatten<int>(nsTArray<CopyableTArray<int>>{CopyableTArray<int>{}});

  EXPECT_EQ(std::distance(range.begin(), range.end()), 0);

  for (const auto& item : range) {
    (void)item;
    FAIL();
  }
}
#ifdef __clang__
#  pragma clang diagnostic pop
#endif

TEST(DOM_Quota_Flatten, NestedInnerSingular)
{
  auto range =
      Flatten<int>(nsTArray<CopyableTArray<int>>{CopyableTArray<int>{1}});

  EXPECT_EQ(std::distance(range.begin(), range.end()), 1);

  nsTArray<int> flattened;
  for (const auto& item : range) {
    flattened.AppendElement(item);
  }

  EXPECT_EQ(nsTArray{1}, flattened);
}

TEST(DOM_Quota_Flatten, NestedInnerSingulars)
{
  auto range = Flatten<int>(nsTArray<CopyableTArray<int>>{
      CopyableTArray<int>{1}, CopyableTArray<int>{2}});

  EXPECT_EQ(std::distance(range.begin(), range.end()), 2);

  nsTArray<int> flattened;
  for (const auto& item : range) {
    flattened.AppendElement(item);
  }

  EXPECT_EQ((nsTArray<int>{{1, 2}}), flattened);
}

TEST(DOM_Quota_Flatten, NestedInnerNonSingulars)
{
  auto range = Flatten<int>(nsTArray<CopyableTArray<int>>{
      CopyableTArray<int>{1, 2}, CopyableTArray<int>{3, 4}});

  EXPECT_EQ(std::distance(range.begin(), range.end()), 4);

  nsTArray<int> flattened;
  for (const auto& item : range) {
    flattened.AppendElement(item);
  }

  EXPECT_EQ((nsTArray<int>{{1, 2, 3, 4}}), flattened);
}

}  // namespace mozilla::dom::quota
