/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Regression tests for Bug 2034094: dragging from LibreOffice Calc yields
// garbled text/html and missing text/plain data on Linux/X11.

#include "gtest/gtest.h"
#include "mozilla/widget/nsGtkHtmlUtils.h"
#include "nsString.h"
#include "mozilla/Span.h"

using namespace mozilla;
using namespace mozilla::widget;

// GetHTMLCharset unit tests

TEST(GtkDragDropUtils, GetHTMLCharsetUTF8)
{
  const char html[] =
      R"(<meta http-equiv="content-type" content="text/html; charset=utf-8">)"
      "<body>test</body>";
  nsCString charset;
  EXPECT_TRUE(GetHTMLCharset(MakeStringSpan(html), charset));
  EXPECT_STREQ(charset.get(), "UTF-8");
}

TEST(GtkDragDropUtils, GetHTMLCharsetISO88591)
{
  const char html[] =
      R"(<meta http-equiv="content-type" content="text/html; charset=ISO-8859-1">)"
      "<body>test</body>";
  nsCString charset;
  EXPECT_TRUE(GetHTMLCharset(MakeStringSpan(html), charset));
  EXPECT_STREQ(charset.get(), "ISO-8859-1");
}

TEST(GtkDragDropUtils, GetHTMLCharsetNotFound)
{
  const char html[] = "<body>no charset here</body>";
  nsCString charset;
  EXPECT_FALSE(GetHTMLCharset(MakeStringSpan(html), charset));
}

// DecodeHTMLData unit tests

TEST(GtkDragDropUtils, DecodeHTMLDataUTF8NonAscii)
{
  // U+00E9 (e-acute) encoded as UTF-8: 0xC3 0xA9
  const char html[] =
      R"(<meta http-equiv="content-type" content="text/html; charset=utf-8">)"
      "<body>\xC3\xA9</body>";
  nsString decoded;
  EXPECT_TRUE(DecodeHTMLData(MakeStringSpan(html), decoded));
  EXPECT_NE(decoded.Find(u"é"_ns), kNotFound);
}

TEST(GtkDragDropUtils, DecodeHTMLDataFallbackUTF8)
{
  const char html[] = "<body>\xC3\xA9</body>";
  nsString decoded;
  EXPECT_TRUE(DecodeHTMLData(MakeStringSpan(html), decoded));
  EXPECT_NE(decoded.Find(u"é"_ns), kNotFound);
}

// Firefox prepends kHTMLMarkupPrefix when writing HTML to the clipboard or
// drag source.  DecodeHTMLData must strip it so it doesn't appear in the
// output (Firefox-to-Firefox round-trip path).
TEST(GtkDragDropUtils, DecodeHTMLDataStripsFirefoxPrefix)
{
  nsAutoCString html;
  html.AppendLiteral(kHTMLMarkupPrefix);
  html.AppendLiteral("<body>hello</body>");
  nsString decoded;
  EXPECT_TRUE(
      DecodeHTMLData(Span<const char>(html.get(), html.Length()), decoded));
  EXPECT_NE(decoded.Find(u"hello"_ns), kNotFound);
  // The meta prefix must not appear in the decoded output.
  EXPECT_EQ(decoded.Find(u"http-equiv"_ns), kNotFound);
}

// ISO-8859-1 is the encoding LibreOffice Calc can use for HTML on X11.
// e-acute (U+00E9) in ISO-8859-1 is byte 0xE9.
TEST(GtkDragDropUtils, DecodeHTMLDataISO88591)
{
  const char html[] =
      R"(<meta http-equiv="content-type" content="text/html; charset=ISO-8859-1">)"
      "<body>\xE9</body>";
  nsString decoded;
  EXPECT_TRUE(DecodeHTMLData(MakeStringSpan(html), decoded));
  EXPECT_NE(decoded.Find(u"é"_ns), kNotFound);
}

// LibreOffice Calc (and similar X11 apps) emit text/html as raw UTF-8 bytes
// with a charset meta tag that is not the Firefox-specific kHTMLMarkupPrefix.
// DecodeHTMLData must detect the charset and decode correctly without stripping
// the foreign meta tag.

TEST(GtkDragDropBug2034094, LibreOfficeShapedHTMLDecodesCorrectly)
{
  // UTF-8 encoded HTML as LibreOffice Calc would send it over X11 DnD.
  // U+00E9 (e-acute) is 0xC3 0xA9 in UTF-8.
  const char html[] =
      "<html><head>"
      R"(<meta http-equiv="content-type" content="text/html; charset=UTF-8">)"
      "</head><body>\xC3\xA9</body></html>";
  nsString decoded;
  ASSERT_TRUE(DecodeHTMLData(MakeStringSpan(html), decoded));
  EXPECT_NE(decoded.Find(u"é"_ns), kNotFound);
}
