/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "TextDirectiveUtil.h"
#include "gtest/gtest.h"

using namespace mozilla::dom;

TEST(TestTextDirective, ComputeWordBoundaryDistancesLTR)
{
  nsString text(u"Hello, world! This is a test.");
  nsTArray<uint32_t> wordEndDistances =
      TextDirectiveUtil::ComputeWordBoundaryDistances<TextScanDirection::Right>(
          text);
  EXPECT_EQ(wordEndDistances.Length(), 7u);
  EXPECT_EQ(wordEndDistances[0], 5u);   // "Hello"
  EXPECT_EQ(wordEndDistances[1], 12u);  // "Hello, world"
  EXPECT_EQ(wordEndDistances[2], 18u);  // "Hello, world! This"
  EXPECT_EQ(wordEndDistances[3], 21u);  // "Hello, world! This is"
  EXPECT_EQ(wordEndDistances[4], 23u);  // "Hello, world! This is a"
  EXPECT_EQ(wordEndDistances[5], 28u);  // "Hello, world! This is a test"
  EXPECT_EQ(wordEndDistances[6], 29u);  // "Hello, world! This is a test."
}

TEST(TestTextDirective, ComputeWordBoundaryDistancesRTL)
{
  nsString text(u"Hello, world! This is a test.");
  nsTArray<uint32_t> wordBeginDistances =
      TextDirectiveUtil::ComputeWordBoundaryDistances<TextScanDirection::Left>(
          text);
  EXPECT_EQ(wordBeginDistances.Length(), 6u);
  EXPECT_EQ(wordBeginDistances[0], 5u);   // "test."
  EXPECT_EQ(wordBeginDistances[1], 7u);   // "a test."
  EXPECT_EQ(wordBeginDistances[2], 10u);  // "is a test."
  EXPECT_EQ(wordBeginDistances[3], 15u);  // "This is a test."
  EXPECT_EQ(wordBeginDistances[4], 22u);  // "world! This is a test."
  EXPECT_EQ(wordBeginDistances[5], 29u);  // "Hello, world! This is a test."
}

TEST(TestTextDirective, ComputeWordBoundaryDistancesPunctuationOnly)
{
  nsString text(u": , .");
  nsTArray<uint32_t> wordEndDistances =
      TextDirectiveUtil::ComputeWordBoundaryDistances<TextScanDirection::Right>(
          text);
  EXPECT_EQ(wordEndDistances.Length(), 1u);
  EXPECT_EQ(wordEndDistances[0], 5u);
}

TEST(TestTextDirective,
     ComputeWordBoundaryDistancesWithPunctuationSeparatedByWhitespace)
{
  nsString text(u"foo ... bar");
  nsTArray<uint32_t> wordEndDistances =
      TextDirectiveUtil::ComputeWordBoundaryDistances<TextScanDirection::Right>(
          text);
  EXPECT_EQ(wordEndDistances.Length(), 2u);
  EXPECT_EQ(wordEndDistances[0], 3u);   // "foo"
  EXPECT_EQ(wordEndDistances[1], 11u);  // "foo ... bar"
}

TEST(TestTextDirective, ComputeWordBoundaryDistancesEndingInPunctuation)
{
  nsString text(u"foo ...");
  nsTArray<uint32_t> wordEndDistances =
      TextDirectiveUtil::ComputeWordBoundaryDistances<TextScanDirection::Right>(
          text);
  EXPECT_EQ(wordEndDistances.Length(), 2u);
  EXPECT_EQ(wordEndDistances[0], 3u);  // "foo"
  EXPECT_EQ(wordEndDistances[1], 7u);  // "foo ..."
}

TEST(TestTextDirective, ComputeWordBoundaryDistancesWithEmptyString)
{
  nsString text(u"");
  nsTArray<uint32_t> wordEndDistances =
      TextDirectiveUtil::ComputeWordBoundaryDistances<TextScanDirection::Right>(
          text);
  EXPECT_EQ(wordEndDistances.Length(), 1u);
  EXPECT_EQ(wordEndDistances[0], 0u);
}

TEST(TestTextDirective,
     RemoveFirstWordFromStringAndDistanceArrayPunctuationAfterFirstWordLTR)
{
  nsString text(u"Hello, world! This is a test.");
  nsTArray<uint32_t> wordEndDistances =
      TextDirectiveUtil::ComputeWordBoundaryDistances<TextScanDirection::Right>(
          text);
  EXPECT_EQ(wordEndDistances.Length(), 7u);
  uint32_t firstWordLength =
      TextDirectiveUtil::RemoveFirstWordFromStringAndDistanceArray<
          TextScanDirection::Right>(text, wordEndDistances);
  EXPECT_EQ(firstWordLength, 7u);  // "Hello, "
  EXPECT_EQ(text, u"world! This is a test.");
  EXPECT_EQ(wordEndDistances.Length(), 6u);
  EXPECT_EQ(wordEndDistances[0], 5u);   // "world"
  EXPECT_EQ(wordEndDistances[1], 11u);  // "world! This"
  EXPECT_EQ(wordEndDistances[2], 14u);  // "world! This is"
  EXPECT_EQ(wordEndDistances[3], 16u);  // "world! This is a"
  EXPECT_EQ(wordEndDistances[4], 21u);  // "world! This is a test"
  EXPECT_EQ(wordEndDistances[5], 22u);  // "world! This is a test."
}

TEST(TestTextDirective, RemoveFirstWordFromStringInParenthesisLTR)
{
  nsString text(u"(Hello) world");
  nsTArray<uint32_t> wordEndDistances =
      TextDirectiveUtil::ComputeWordBoundaryDistances<TextScanDirection::Right>(
          text);
  EXPECT_EQ(wordEndDistances.Length(), 2u);
  uint32_t firstWordLength =
      TextDirectiveUtil::RemoveFirstWordFromStringAndDistanceArray<
          TextScanDirection::Right>(text, wordEndDistances);
  EXPECT_EQ(firstWordLength, 8u);  // "(Hello) "
  EXPECT_EQ(text, u"world");
  EXPECT_EQ(wordEndDistances.Length(), 1u);
  EXPECT_EQ(wordEndDistances[0], 5u);  // "world"
}

TEST(TestTextDirective, RemoveFirstWordFromStringAndDistanceArrayRTL)
{
  nsString text(u"Hello, world! This is a test.");
  nsTArray<uint32_t> wordEndDistances =
      TextDirectiveUtil::ComputeWordBoundaryDistances<TextScanDirection::Left>(
          text);
  EXPECT_EQ(wordEndDistances.Length(), 6u);
  uint32_t firstWordLength =
      TextDirectiveUtil::RemoveFirstWordFromStringAndDistanceArray<
          TextScanDirection::Left>(text, wordEndDistances);
  EXPECT_EQ(firstWordLength, 6u);  // " test."
  EXPECT_EQ(text, u"Hello, world! This is a");
  EXPECT_EQ(wordEndDistances.Length(), 5u);
  EXPECT_EQ(wordEndDistances[0], 1u);   // "a"
  EXPECT_EQ(wordEndDistances[1], 4u);   // "is a"
  EXPECT_EQ(wordEndDistances[2], 9u);   // "This is a"
  EXPECT_EQ(wordEndDistances[3], 16u);  // "world! This is a"
  EXPECT_EQ(wordEndDistances[4], 23u);  // "Hello, world! This is a"
}

TEST(TestTextDirective, RemoveFirstWordFromStringInParenthesisRTL)
{
  nsString text(u"Hello (world)");
  nsTArray<uint32_t> wordEndDistances =
      TextDirectiveUtil::ComputeWordBoundaryDistances<TextScanDirection::Left>(
          text);
  EXPECT_EQ(wordEndDistances.Length(), 2u);
  uint32_t firstWordLength =
      TextDirectiveUtil::RemoveFirstWordFromStringAndDistanceArray<
          TextScanDirection::Left>(text, wordEndDistances);
  EXPECT_EQ(firstWordLength, 8u);  // " (world)"
  EXPECT_EQ(text, u"Hello");
  EXPECT_EQ(wordEndDistances.Length(), 1u);
  EXPECT_EQ(wordEndDistances[0], 5u);  // "Hello"
}

TEST(TestTextDirective,
     RemoveFirstWordFromStringAndDistanceArrayMultiplePunctuationLTR)
{
  nsString text(u"...foo!!! bar?");
  nsTArray<uint32_t> wordEndDistances =
      TextDirectiveUtil::ComputeWordBoundaryDistances<TextScanDirection::Right>(
          text);
  EXPECT_EQ(wordEndDistances.Length(), 3u);
  uint32_t firstWordLength =
      TextDirectiveUtil::RemoveFirstWordFromStringAndDistanceArray<
          TextScanDirection::Right>(text, wordEndDistances);
  EXPECT_EQ(firstWordLength, 10u);  // "...foo!!! "
  EXPECT_EQ(text, u"bar?");
  EXPECT_EQ(wordEndDistances.Length(), 2u);
  EXPECT_EQ(wordEndDistances[0], 3u);  // "bar"
  EXPECT_EQ(wordEndDistances[1], 4u);  // "bar?"
}

TEST(TestTextDirective,
     RemoveFirstWordFromStringAndDistanceArrayMultiplePunctuationRTL)
{
  nsString text(u"foo!!! ...bar");
  nsTArray<uint32_t> wordEndDistances =
      TextDirectiveUtil::ComputeWordBoundaryDistances<TextScanDirection::Left>(
          text);
  EXPECT_EQ(wordEndDistances.Length(), 2u);
  uint32_t firstWordLength =
      TextDirectiveUtil::RemoveFirstWordFromStringAndDistanceArray<
          TextScanDirection::Left>(text, wordEndDistances);
  EXPECT_EQ(firstWordLength, 10u);  // "!!! ...bar"
  EXPECT_EQ(text, u"foo");
  EXPECT_EQ(wordEndDistances.Length(), 1u);
  EXPECT_EQ(wordEndDistances[0], 3u);  // "foo"
}

TEST(TestTextDirective,
     RemoveFirstWordFromStringAndDistanceArrayEndsInPunctuationLTR)
{
  nsString text(u"foo ...");
  nsTArray<uint32_t> wordEndDistances =
      TextDirectiveUtil::ComputeWordBoundaryDistances<TextScanDirection::Right>(
          text);
  EXPECT_EQ(wordEndDistances.Length(), 2u);
  uint32_t firstWordLength =
      TextDirectiveUtil::RemoveFirstWordFromStringAndDistanceArray<
          TextScanDirection::Right>(text, wordEndDistances);
  EXPECT_EQ(firstWordLength, 7u);  // "foo ..."
  EXPECT_EQ(text, u"foo ...");
  EXPECT_EQ(wordEndDistances.Length(), 0u);
}
