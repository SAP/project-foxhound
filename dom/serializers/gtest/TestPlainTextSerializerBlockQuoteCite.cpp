/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "Common.h"
#include "gtest/gtest.h"
#include "nsCRT.h"
#include "nsIDocumentEncoder.h"
#include "nsIParserUtils.h"
#include "nsServiceManagerUtils.h"
#include "nsString.h"

TEST(PlainTextSerializerBlockQuoteCite, BlockQuoteCiteWrap)
{
  nsAutoString test;
  test.AppendLiteral(u"<blockquote type=cite>hello world</blockquote>");

  const uint32_t wrapColumn = 10;
  ConvertBufToPlainText(test,
                        nsIDocumentEncoder::OutputFormatted |
                            nsIDocumentEncoder::OutputFormatFlowed |
                            nsIDocumentEncoder::OutputCRLineBreak |
                            nsIDocumentEncoder::OutputLFLineBreak,
                        wrapColumn);

  constexpr auto expect = NS_LITERAL_STRING_FROM_CSTRING(
      "> hello \r\n"
      "> world\r\n");

  ASSERT_EQ(test, expect) << "Wrong blockquote cite to text serialization";
}

TEST(PlainTextSerializerBlockQuoteCite, BlockQuoteCiteNested)
{
  nsAutoString test;
  test.AppendLiteral(
      u"<blockquote type=cite>aaa"
      u"<blockquote type=cite>bbb"
      u"<blockquote type=cite>ccc"
      u"</blockquote><pre>ddd</pre>"
      u"</blockquote>eee"
      u"</blockquote>");

  const uint32_t wrapColumn = 20;
  ConvertBufToPlainText(test,
                        nsIDocumentEncoder::OutputFormatted |
                            nsIDocumentEncoder::OutputFormatFlowed |
                            nsIDocumentEncoder::OutputCRLineBreak |
                            nsIDocumentEncoder::OutputLFLineBreak,
                        wrapColumn);

  constexpr auto expect = NS_LITERAL_STRING_FROM_CSTRING(
      "> aaa\r\n"
      ">> bbb\r\n"
      ">>> ccc\r\n"
      ">> ddd\r\n"
      "> eee\r\n");

  ASSERT_EQ(test, expect)
      << "Wrong nested blockquote cite to text serialization";
}

TEST(PlainTextSerializerBlockQuoteCite, LineBreakAfterBlockQuoteCite)
{
  nsAutoString test;
  test.AppendLiteral(
      u"<blockquote type=cite>hello world</blockquote>\n<pre>aaa</pre>bbb");

  const uint32_t wrapColumn = 20;
  ConvertBufToPlainText(test,
                        nsIDocumentEncoder::OutputFormatted |
                            nsIDocumentEncoder::OutputFormatFlowed |
                            nsIDocumentEncoder::OutputCRLineBreak |
                            nsIDocumentEncoder::OutputLFLineBreak,
                        wrapColumn);

  constexpr auto expect = NS_LITERAL_STRING_FROM_CSTRING(
      "> hello world\r\n"
      "aaa\r\n\r\n"
      "bbb\r\n");

  ASSERT_EQ(test, expect) << "Wrong blockquote cite to text serialization";
}

TEST(PlainTextSerializerBlockQuoteCite, TextAfterBlockQuoteCite)
{
  nsAutoString test;
  test.AppendLiteral(
      u"<blockquote type=cite>hello world</blockquote>aaa<pre>bbb</pre>ccc");

  const uint32_t wrapColumn = 20;
  ConvertBufToPlainText(test,
                        nsIDocumentEncoder::OutputFormatted |
                            nsIDocumentEncoder::OutputFormatFlowed |
                            nsIDocumentEncoder::OutputCRLineBreak |
                            nsIDocumentEncoder::OutputLFLineBreak,
                        wrapColumn);

  constexpr auto expect = NS_LITERAL_STRING_FROM_CSTRING(
      "> hello world\r\n"
      "aaa\r\n\r\n"
      "bbb\r\n\r\n"
      "ccc\r\n");

  ASSERT_EQ(test, expect) << "Wrong blockquote cite to text serialization";
}

TEST(PlainTextSerializerBlockQuoteCite, SelectAfterBlockQuoteCite)
{
  nsAutoString test;
  test.AppendLiteral(
      u"<blockquote type=cite>first blockquote</blockquote>"
      u"<select><option>aaa</option></select><pre>bbb</pre>"
      u"<blockquote type=cite>second blockquote</blockquote>"
      u"<select><option>\r\n</option></select><pre>ccc</pre>");

  const uint32_t wrapColumn = 20;
  ConvertBufToPlainText(test,
                        nsIDocumentEncoder::OutputFormatted |
                            nsIDocumentEncoder::OutputFormatFlowed |
                            nsIDocumentEncoder::OutputCRLineBreak |
                            nsIDocumentEncoder::OutputLFLineBreak,
                        wrapColumn);

  constexpr auto expect = NS_LITERAL_STRING_FROM_CSTRING(
      "> first blockquote\r\n\r\n"
      "bbb\r\n"
      "> second blockquote\r\n\r\n"
      "ccc\r\n");

  ASSERT_EQ(test, expect) << "Wrong blockquote cite to text serialization";
}
