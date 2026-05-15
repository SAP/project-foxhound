/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"
#include "mozilla/BasePrincipal.h"
#include "mozilla/OriginAttributes.h"
#include "mozilla/dom/CharacterDataBuffer.h"
#include "mozilla/dom/Document.h"
#include "nsCOMPtr.h"
#include "nsIURI.h"
#include "nsNetUtil.h"
#include "nsString.h"
#include "nsTextNode.h"

namespace mozilla::dom {

using WhitespaceOption = CharacterDataBuffer::WhitespaceOption;
using WhitespaceOptions = CharacterDataBuffer::WhitespaceOptions;

static already_AddRefed<Document> CreateHTMLDoc() {
  nsCOMPtr<nsIURI> uri;
  NS_NewURI(getter_AddRefs(uri), "data:text/html,");

  RefPtr<BasePrincipal> principal =
      BasePrincipal::CreateContentPrincipal(uri, OriginAttributes());
  MOZ_RELEASE_ASSERT(principal);

  nsCOMPtr<mozilla::dom::Document> doc;
  MOZ_ALWAYS_SUCCEEDS(NS_NewDOMDocument(getter_AddRefs(doc),
                                        u""_ns,   // aNamespaceURI
                                        u""_ns,   // aQualifiedName
                                        nullptr,  // aDoctype
                                        uri, uri, principal,
                                        LoadedAsData::No,  // aLoadedAsData
                                        nullptr,           // aEventObject
                                        DocumentFlavor::HTML));
  MOZ_RELEASE_ASSERT(doc);
  return doc.forget();
}

struct TestData {
  TestData(const char16_t* aData, const char16_t* aScanData,
           uint32_t aStartOffset, uint32_t aExpectedOffset)
      : mData(aData),
        mScanData(aScanData),
        mStartOffset(aStartOffset),
        mExpectedOffset(aExpectedOffset) {}

  friend std::ostream& operator<<(std::ostream& aStream,
                                  const TestData& aData) {
    return aStream << "Scan \"" << NS_ConvertUTF16toUTF8(aData.mScanData).get()
                   << "\" in \"" << NS_ConvertUTF16toUTF8(aData.mData).get()
                   << "\" starting from " << aData.mStartOffset;
  }

  const char16_t* const mData;
  const char16_t* const mScanData;
  const uint32_t mStartOffset;
  const uint32_t mExpectedOffset;
};

TEST(CharacterDataBufferTest, FindChar1b)
{
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsTextNode> textNode = doc->CreateTextNode(EmptyString());
  MOZ_RELEASE_ASSERT(textNode);
  const CharacterDataBuffer& characterDataBuffer = textNode->DataBuffer();

  for (const auto& testData : {
           TestData(u"", u"a", 0, CharacterDataBuffer::kNotFound),
           TestData(u"abc", u"a", 0, 0),
           TestData(u"abc", u"A", 0, CharacterDataBuffer::kNotFound),
           TestData(u"abc", u"b", 0, 1),
           TestData(u"abc", u"c", 0, 2),
           TestData(u"abc", u"a", 1, CharacterDataBuffer::kNotFound),
           TestData(u"abc", u"b", 1, 1),
           TestData(u"abc", u"c", 2, 2),
           TestData(u"a\u00A0b", u"\u00A0", 0, 1),
       }) {
    textNode->SetData(nsDependentString(testData.mData), IgnoreErrors());
    MOZ_ASSERT(!characterDataBuffer.Is2b());
    const uint32_t ret = characterDataBuffer.FindChar(testData.mScanData[0],
                                                      testData.mStartOffset);
    EXPECT_EQ(ret, testData.mExpectedOffset) << testData;
  }
}

TEST(CharacterDataBufferTest, FindChar2b)
{
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsTextNode> textNode = doc->CreateTextNode(EmptyString());
  MOZ_RELEASE_ASSERT(textNode);
  textNode->MarkAsMaybeModifiedFrequently();
  const CharacterDataBuffer& characterDataBuffer = textNode->DataBuffer();

  for (const auto& testData : {
           TestData(u"abc", u"a", 0, 0),
           TestData(u"abc", u"A", 0, CharacterDataBuffer::kNotFound),
           TestData(u"abc", u"b", 0, 1),
           TestData(u"abc", u"c", 0, 2),
           TestData(u"abc", u"a", 1, CharacterDataBuffer::kNotFound),
           TestData(u"abc", u"b", 1, 1),
           TestData(u"abc", u"c", 2, 2),
           TestData(u"a\u00A0b", u"\u00A0", 0, 1),
       }) {
    textNode->SetData(nsDependentString(testData.mData), IgnoreErrors());
    MOZ_ASSERT(characterDataBuffer.Is2b());
    const uint32_t ret = characterDataBuffer.FindChar(testData.mScanData[0],
                                                      testData.mStartOffset);
    EXPECT_EQ(ret, testData.mExpectedOffset) << testData;
  }
}

TEST(CharacterDataBufferTest, RFindChar1b)
{
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsTextNode> textNode = doc->CreateTextNode(EmptyString());
  MOZ_RELEASE_ASSERT(textNode);
  const CharacterDataBuffer& characterDataBuffer = textNode->DataBuffer();

  for (const auto& testData : {
           TestData(u"", u"a", UINT32_MAX, CharacterDataBuffer::kNotFound),
           TestData(u"abc", u"a", UINT32_MAX, 0),
           TestData(u"abc", u"A", UINT32_MAX, CharacterDataBuffer::kNotFound),
           TestData(u"abc", u"b", UINT32_MAX, 1),
           TestData(u"abc", u"c", UINT32_MAX, 2),
           TestData(u"abca", u"a", UINT32_MAX, 3),
           TestData(u"abc", u"a", 0, 0),
           TestData(u"abc", u"c", 2, 2),
           TestData(u"a\u00A0b", u"\u00A0", UINT32_MAX, 1),
       }) {
    textNode->SetData(nsDependentString(testData.mData), IgnoreErrors());
    MOZ_ASSERT(!characterDataBuffer.Is2b());
    const uint32_t ret = characterDataBuffer.RFindChar(testData.mScanData[0],
                                                       testData.mStartOffset);
    EXPECT_EQ(ret, testData.mExpectedOffset) << testData;
  }
}

TEST(CharacterDataBufferTest, RFindChar2b)
{
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsTextNode> textNode = doc->CreateTextNode(EmptyString());
  MOZ_RELEASE_ASSERT(textNode);
  textNode->MarkAsMaybeModifiedFrequently();
  const CharacterDataBuffer& characterDataBuffer = textNode->DataBuffer();

  for (const auto& testData : {
           TestData(u"abc", u"a", UINT32_MAX, 0),
           TestData(u"abc", u"A", UINT32_MAX, CharacterDataBuffer::kNotFound),
           TestData(u"abc", u"b", UINT32_MAX, 1),
           TestData(u"abc", u"c", UINT32_MAX, 2),
           TestData(u"abca", u"a", UINT32_MAX, 3),
           TestData(u"abc", u"a", 0, 0),
           TestData(u"abc", u"c", 2, 2),
           TestData(u"a\u00A0b", u"\u00A0", UINT32_MAX, 1),
       }) {
    textNode->SetData(nsDependentString(testData.mData), IgnoreErrors());
    MOZ_ASSERT(characterDataBuffer.Is2b());
    const uint32_t ret = characterDataBuffer.RFindChar(testData.mScanData[0],
                                                       testData.mStartOffset);
    EXPECT_EQ(ret, testData.mExpectedOffset) << testData;
  }
}

TEST(CharacterDataBufferTest, FindFirstDifferentCharOffsetIn1b)
{
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsTextNode> textNode = doc->CreateTextNode(EmptyString());
  MOZ_RELEASE_ASSERT(textNode);
  const CharacterDataBuffer& characterDataBuffer = textNode->DataBuffer();

  for (const auto& testData : {
           TestData(u"abcdef", u"abc", 0, CharacterDataBuffer::kNotFound),
           TestData(u"abcdef", u"Abc", 0, 0),
           TestData(u"abcdef", u"aBc", 0, 1),
           TestData(u"abcdef", u"abC", 0, 2),
           TestData(u"abcdef", u"def", 3, CharacterDataBuffer::kNotFound),
           TestData(u"abcdef", u"Def", 3, 3),
           TestData(u"abcdef", u"dEf", 3, 4),
           TestData(u"abcdef", u"deF", 3, 5),
       }) {
    textNode->SetData(nsDependentString(testData.mData), IgnoreErrors());
    MOZ_ASSERT(!characterDataBuffer.Is2b());
    const uint32_t ret = characterDataBuffer.FindFirstDifferentCharOffset(
        NS_ConvertUTF16toUTF8(testData.mScanData), testData.mStartOffset);
    EXPECT_EQ(ret, testData.mExpectedOffset) << testData;
  }
}

TEST(CharacterDataBufferTest, FindFirstDifferentCharOffsetIn2b)
{
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsTextNode> textNode = doc->CreateTextNode(EmptyString());
  MOZ_RELEASE_ASSERT(textNode);
  textNode->MarkAsMaybeModifiedFrequently();
  const CharacterDataBuffer& characterDataBuffer = textNode->DataBuffer();

  for (const auto& testData : {
           TestData(u"abcdef", u"abc", 0, CharacterDataBuffer::kNotFound),
           TestData(u"abcdef", u"Abc", 0, 0),
           TestData(u"abcdef", u"aBc", 0, 1),
           TestData(u"abcdef", u"abC", 0, 2),
           TestData(u"abcdef", u"def", 3, CharacterDataBuffer::kNotFound),
           TestData(u"abcdef", u"Def", 3, 3),
           TestData(u"abcdef", u"dEf", 3, 4),
           TestData(u"abcdef", u"deF", 3, 5),
       }) {
    textNode->SetData(nsDependentString(testData.mData), IgnoreErrors());
    MOZ_ASSERT(characterDataBuffer.Is2b());
    const uint32_t ret = characterDataBuffer.FindFirstDifferentCharOffset(
        NS_ConvertUTF16toUTF8(testData.mScanData), testData.mStartOffset);
    EXPECT_EQ(ret, testData.mExpectedOffset) << testData;
  }
}

TEST(CharacterDataBufferTest, RFindFirstDifferentCharOffsetIn1b)
{
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsTextNode> textNode = doc->CreateTextNode(EmptyString());
  MOZ_RELEASE_ASSERT(textNode);
  const CharacterDataBuffer& characterDataBuffer = textNode->DataBuffer();

  for (const auto& testData : {
           TestData(u"abcdef", u"abc", 3, CharacterDataBuffer::kNotFound),
           TestData(u"abcdef", u"Abc", 3, 0),
           TestData(u"abcdef", u"aBc", 3, 1),
           TestData(u"abcdef", u"abC", 3, 2),
           TestData(u"abcdef", u"def", 6, CharacterDataBuffer::kNotFound),
           TestData(u"abcdef", u"Def", 6, 3),
           TestData(u"abcdef", u"dEf", 6, 4),
           TestData(u"abcdef", u"deF", 6, 5),
       }) {
    textNode->SetData(nsDependentString(testData.mData), IgnoreErrors());
    MOZ_ASSERT(!characterDataBuffer.Is2b());
    const uint32_t ret = characterDataBuffer.RFindFirstDifferentCharOffset(
        NS_ConvertUTF16toUTF8(testData.mScanData), testData.mStartOffset);
    EXPECT_EQ(ret, testData.mExpectedOffset) << testData;
  }
}

TEST(CharacterDataBufferTest, RFindFirstDifferentCharOffsetIn2b)
{
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsTextNode> textNode = doc->CreateTextNode(EmptyString());
  MOZ_RELEASE_ASSERT(textNode);
  textNode->MarkAsMaybeModifiedFrequently();
  const CharacterDataBuffer& characterDataBuffer = textNode->DataBuffer();

  for (const auto& testData : {
           TestData(u"abcdef", u"abc", 3, CharacterDataBuffer::kNotFound),
           TestData(u"abcdef", u"Abc", 3, 0),
           TestData(u"abcdef", u"aBc", 3, 1),
           TestData(u"abcdef", u"abC", 3, 2),
           TestData(u"abcdef", u"def", 6, CharacterDataBuffer::kNotFound),
           TestData(u"abcdef", u"Def", 6, 3),
           TestData(u"abcdef", u"dEf", 6, 4),
           TestData(u"abcdef", u"deF", 6, 5),
       }) {
    textNode->SetData(nsDependentString(testData.mData), IgnoreErrors());
    MOZ_ASSERT(characterDataBuffer.Is2b());
    const uint32_t ret = characterDataBuffer.RFindFirstDifferentCharOffset(
        NS_ConvertUTF16toUTF8(testData.mScanData), testData.mStartOffset);
    EXPECT_EQ(ret, testData.mExpectedOffset) << testData;
  }
}

struct TestDataForFindNonWhitespace {
  TestDataForFindNonWhitespace(const char16_t* aData, uint32_t aOffset,
                               const WhitespaceOptions& aOptions,
                               uint32_t aExpectedOffset)
      : mData(aData),
        mOffset(aOffset),
        mExpectedOffset(aExpectedOffset),
        mOptions(aOptions) {}

  friend std::ostream& operator<<(std::ostream& aStream,
                                  const TestDataForFindNonWhitespace& aData) {
    aStream << "Scan with options={";
    bool isFirstOption = true;
    if (aData.mOptions.contains(WhitespaceOption::FormFeedIsSignificant)) {
      aStream << "WhitespaceOption::FormFeedIsSignificant";
      isFirstOption = false;
    }
    if (aData.mOptions.contains(WhitespaceOption::NewLineIsSignificant)) {
      if (!isFirstOption) {
        aStream << ", ";
      }
      aStream << "WhitespaceOption::NewLineIsSignificant";
      isFirstOption = false;
    }
    if (aData.mOptions.contains(WhitespaceOption::TreatNBSPAsCollapsible)) {
      if (!isFirstOption) {
        aStream << ", ";
      }
      aStream << "WhitespaceOption::TreatNBSPAsCollapsible";
      isFirstOption = false;
    }
    return aStream << "} in \"" << aData.FormatUTF8Data().get()
                   << "\" starting from " << aData.mOffset;
  }

  nsAutoCString FormatUTF8Data() const {
    nsAutoString data(mData);
    data.ReplaceSubstring(u"\n"_ns, u"\\n"_ns);
    data.ReplaceSubstring(u"\t"_ns, u"\\t"_ns);
    data.ReplaceSubstring(u"\r"_ns, u"\\r"_ns);
    data.ReplaceSubstring(u"\f"_ns, u"\\f"_ns);
    data.ReplaceSubstring(u"\u00A0"_ns, u"&nbsp;"_ns);
    return NS_ConvertUTF16toUTF8(data);
  }

  const char16_t* const mData;
  const uint32_t mOffset;
  const uint32_t mExpectedOffset;
  const WhitespaceOptions mOptions;
};

TEST(CharacterDataBufferTest, FindNonWhitespaceIn1b)
{
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsTextNode> textNode = doc->CreateTextNode(EmptyString());
  MOZ_RELEASE_ASSERT(textNode);
  const CharacterDataBuffer& characterDataBuffer = textNode->DataBuffer();

  for (const auto& testData : {
           TestDataForFindNonWhitespace(u"", 0, {},
                                        CharacterDataBuffer::kNotFound),
           TestDataForFindNonWhitespace(u" ", 0, {},
                                        CharacterDataBuffer::kNotFound),
           TestDataForFindNonWhitespace(u"  ", 0, {},
                                        CharacterDataBuffer::kNotFound),
           TestDataForFindNonWhitespace(u"\t\n\r\f", 0, {},
                                        CharacterDataBuffer::kNotFound),
           TestDataForFindNonWhitespace(u" \t\n\r\f", 0, {},
                                        CharacterDataBuffer::kNotFound),
           TestDataForFindNonWhitespace(u"a", 0, {}, 0),
           TestDataForFindNonWhitespace(u" a", 0, {}, 1),
           TestDataForFindNonWhitespace(u"\u00A0", 0, {}, 0),
           TestDataForFindNonWhitespace(u" \u00A0", 0, {}, 1),
           TestDataForFindNonWhitespace(u"a b", 1, {}, 2),
           TestDataForFindNonWhitespace(u"a b", 2, {}, 2),
           TestDataForFindNonWhitespace(
               u"\fa", 0, {WhitespaceOption::FormFeedIsSignificant}, 0),
           TestDataForFindNonWhitespace(
               u" \fa", 0, {WhitespaceOption::FormFeedIsSignificant}, 1),
           TestDataForFindNonWhitespace(
               u"\n", 0, {WhitespaceOption::NewLineIsSignificant}, 0),
           TestDataForFindNonWhitespace(
               u" \n", 0, {WhitespaceOption::NewLineIsSignificant}, 1),
           TestDataForFindNonWhitespace(
               u"\u00A0", 0, {WhitespaceOption::TreatNBSPAsCollapsible},
               CharacterDataBuffer::kNotFound),
           TestDataForFindNonWhitespace(
               u" \u00A0", 0, {WhitespaceOption::TreatNBSPAsCollapsible},
               CharacterDataBuffer::kNotFound),
       }) {
    textNode->SetData(nsDependentString(testData.mData), IgnoreErrors());
    MOZ_ASSERT(!characterDataBuffer.Is2b());
    const uint32_t ret = characterDataBuffer.FindNonWhitespaceChar(
        testData.mOptions, testData.mOffset);
    EXPECT_EQ(ret, testData.mExpectedOffset) << testData;
  }
}

TEST(CharacterDataBufferTest, FindNonWhitespaceIn2b)
{
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsTextNode> textNode = doc->CreateTextNode(EmptyString());
  MOZ_RELEASE_ASSERT(textNode);
  textNode->MarkAsMaybeModifiedFrequently();
  const CharacterDataBuffer& characterDataBuffer = textNode->DataBuffer();

  for (const auto& testData : {
           TestDataForFindNonWhitespace(u" ", 0, {},
                                        CharacterDataBuffer::kNotFound),
           TestDataForFindNonWhitespace(u"  ", 0, {},
                                        CharacterDataBuffer::kNotFound),
           TestDataForFindNonWhitespace(u"\t\n\r\f", 0, {},
                                        CharacterDataBuffer::kNotFound),
           TestDataForFindNonWhitespace(u" \t\n\r\f", 0, {},
                                        CharacterDataBuffer::kNotFound),
           TestDataForFindNonWhitespace(u"a", 0, {}, 0),
           TestDataForFindNonWhitespace(u" a", 0, {}, 1),
           TestDataForFindNonWhitespace(u"\u00A0", 0, {}, 0),
           TestDataForFindNonWhitespace(u" \u00A0", 0, {}, 1),
           TestDataForFindNonWhitespace(u"a b", 1, {}, 2),
           TestDataForFindNonWhitespace(u"a b", 2, {}, 2),
           TestDataForFindNonWhitespace(
               u"\fa", 0, {WhitespaceOption::FormFeedIsSignificant}, 0),
           TestDataForFindNonWhitespace(
               u" \fa", 0, {WhitespaceOption::FormFeedIsSignificant}, 1),
           TestDataForFindNonWhitespace(
               u"\n", 0, {WhitespaceOption::NewLineIsSignificant}, 0),
           TestDataForFindNonWhitespace(
               u" \n", 0, {WhitespaceOption::NewLineIsSignificant}, 1),
           TestDataForFindNonWhitespace(
               u"\u00A0", 0, {WhitespaceOption::TreatNBSPAsCollapsible},
               CharacterDataBuffer::kNotFound),
           TestDataForFindNonWhitespace(
               u" \u00A0", 0, {WhitespaceOption::TreatNBSPAsCollapsible},
               CharacterDataBuffer::kNotFound),
       }) {
    textNode->SetData(nsDependentString(testData.mData), IgnoreErrors());
    MOZ_ASSERT(characterDataBuffer.Is2b());
    const uint32_t ret = characterDataBuffer.FindNonWhitespaceChar(
        testData.mOptions, testData.mOffset);
    EXPECT_EQ(ret, testData.mExpectedOffset) << testData;
  }
}

TEST(CharacterDataBufferTest, RFindNonWhitespaceIn1b)
{
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsTextNode> textNode = doc->CreateTextNode(EmptyString());
  MOZ_RELEASE_ASSERT(textNode);
  const CharacterDataBuffer& characterDataBuffer = textNode->DataBuffer();

  for (const auto& testData : {
           TestDataForFindNonWhitespace(u"", UINT32_MAX, {},
                                        CharacterDataBuffer::kNotFound),
           TestDataForFindNonWhitespace(u" ", UINT32_MAX, {},
                                        CharacterDataBuffer::kNotFound),
           TestDataForFindNonWhitespace(u"  ", UINT32_MAX, {},
                                        CharacterDataBuffer::kNotFound),
           TestDataForFindNonWhitespace(u"\t\n\r\f", UINT32_MAX, {},
                                        CharacterDataBuffer::kNotFound),
           TestDataForFindNonWhitespace(u"\t\n\r\f ", UINT32_MAX, {},
                                        CharacterDataBuffer::kNotFound),
           TestDataForFindNonWhitespace(u"a", UINT32_MAX, {}, 0),
           TestDataForFindNonWhitespace(u"a ", UINT32_MAX, {}, 0),
           TestDataForFindNonWhitespace(u"ab", UINT32_MAX, {}, 1),
           TestDataForFindNonWhitespace(u"ab ", UINT32_MAX, {}, 1),
           TestDataForFindNonWhitespace(u"a\u00A0", UINT32_MAX, {}, 1),
           TestDataForFindNonWhitespace(u"a\u00A0 ", UINT32_MAX, {}, 1),
           TestDataForFindNonWhitespace(u"a b", 1, {}, 0),
           TestDataForFindNonWhitespace(u"a b", 0, {}, 0),
           TestDataForFindNonWhitespace(
               u"a\f", UINT32_MAX, {WhitespaceOption::FormFeedIsSignificant},
               1),
           TestDataForFindNonWhitespace(
               u"a\f ", UINT32_MAX, {WhitespaceOption::FormFeedIsSignificant},
               1),
           TestDataForFindNonWhitespace(
               u"a\n", UINT32_MAX, {WhitespaceOption::NewLineIsSignificant}, 1),
           TestDataForFindNonWhitespace(
               u"a\n ", UINT32_MAX, {WhitespaceOption::NewLineIsSignificant},
               1),
           TestDataForFindNonWhitespace(
               u"a\u00A0", UINT32_MAX,
               {WhitespaceOption::TreatNBSPAsCollapsible}, 0),
           TestDataForFindNonWhitespace(
               u"a\u00A0 ", UINT32_MAX,
               {WhitespaceOption::TreatNBSPAsCollapsible}, 0),
       }) {
    textNode->SetData(nsDependentString(testData.mData), IgnoreErrors());
    MOZ_ASSERT(!characterDataBuffer.Is2b());
    const uint32_t ret = characterDataBuffer.RFindNonWhitespaceChar(
        testData.mOptions, testData.mOffset);
    EXPECT_EQ(ret, testData.mExpectedOffset) << testData;
  }
}

TEST(CharacterDataBufferTest, RFindNonWhitespaceIn2b)
{
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsTextNode> textNode = doc->CreateTextNode(EmptyString());
  MOZ_RELEASE_ASSERT(textNode);
  textNode->MarkAsMaybeModifiedFrequently();
  const CharacterDataBuffer& characterDataBuffer = textNode->DataBuffer();

  for (const auto& testData : {
           TestDataForFindNonWhitespace(u" ", UINT32_MAX, {},
                                        CharacterDataBuffer::kNotFound),
           TestDataForFindNonWhitespace(u"  ", UINT32_MAX, {},
                                        CharacterDataBuffer::kNotFound),
           TestDataForFindNonWhitespace(u"\t\n\r\f", UINT32_MAX, {},
                                        CharacterDataBuffer::kNotFound),
           TestDataForFindNonWhitespace(u"\t\n\r\f ", UINT32_MAX, {},
                                        CharacterDataBuffer::kNotFound),
           TestDataForFindNonWhitespace(u"a", UINT32_MAX, {}, 0),
           TestDataForFindNonWhitespace(u"a ", UINT32_MAX, {}, 0),
           TestDataForFindNonWhitespace(u"ab", UINT32_MAX, {}, 1),
           TestDataForFindNonWhitespace(u"ab ", UINT32_MAX, {}, 1),
           TestDataForFindNonWhitespace(u"a\u00A0", UINT32_MAX, {}, 1),
           TestDataForFindNonWhitespace(u"a\u00A0 ", UINT32_MAX, {}, 1),
           TestDataForFindNonWhitespace(u"a b", 1, {}, 0),
           TestDataForFindNonWhitespace(u"a b", 0, {}, 0),
           TestDataForFindNonWhitespace(
               u"a\f", UINT32_MAX, {WhitespaceOption::FormFeedIsSignificant},
               1),
           TestDataForFindNonWhitespace(
               u"a\f ", UINT32_MAX, {WhitespaceOption::FormFeedIsSignificant},
               1),
           TestDataForFindNonWhitespace(
               u"a\n", UINT32_MAX, {WhitespaceOption::NewLineIsSignificant}, 1),
           TestDataForFindNonWhitespace(
               u"a\n ", UINT32_MAX, {WhitespaceOption::NewLineIsSignificant},
               1),
           TestDataForFindNonWhitespace(
               u"a\u00A0", UINT32_MAX,
               {WhitespaceOption::TreatNBSPAsCollapsible}, 0),
           TestDataForFindNonWhitespace(
               u"a\u00A0 ", UINT32_MAX,
               {WhitespaceOption::TreatNBSPAsCollapsible}, 0),
       }) {
    textNode->SetData(nsDependentString(testData.mData), IgnoreErrors());
    MOZ_ASSERT(characterDataBuffer.Is2b());
    const uint32_t ret = characterDataBuffer.RFindNonWhitespaceChar(
        testData.mOptions, testData.mOffset);
    EXPECT_EQ(ret, testData.mExpectedOffset) << testData;
  }
}

TEST(CharacterDataBufferTest, SafeAPIsChar1b)
{
  const RefPtr<Document> doc = CreateHTMLDoc();
  const RefPtr<nsTextNode> textNode = doc->CreateTextNode(EmptyString());
  MOZ_RELEASE_ASSERT(textNode);
  const CharacterDataBuffer& characterDataBuffer = textNode->DataBuffer();

  // Test empty data buffer.
  EXPECT_EQ(characterDataBuffer.SafeFirstChar(), u'\0');
  EXPECT_EQ(characterDataBuffer.SafeLastChar(), u'\0');
  EXPECT_EQ(characterDataBuffer.SafeCharAt(100), u'\0');

  // Test non-empty data buffer.
  const char16_t* testStr = u"abcdef";
  textNode->SetData(nsDependentString(testStr), IgnoreErrors());
  MOZ_ASSERT(!characterDataBuffer.Is2b());

  EXPECT_EQ(characterDataBuffer.SafeFirstChar(), u'a');
  EXPECT_EQ(characterDataBuffer.SafeLastChar(), u'f');
  EXPECT_EQ(characterDataBuffer.SafeCharAt(2), u'c');
  EXPECT_EQ(characterDataBuffer.SafeCharAt(100), u'\0');
}

};  // namespace mozilla::dom
