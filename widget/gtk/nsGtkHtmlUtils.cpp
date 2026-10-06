/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/widget/nsGtkHtmlUtils.h"
#include "mozilla/Encoding.h"
#include "mozilla/Logging.h"
#include "nsReadableUtils.h"

using namespace mozilla;

static mozilla::LazyLogModule sGtkHtmlLog("GtkHtmlUtils");
#define GTK_HTML_LOG(...) \
  MOZ_LOG(sGtkHtmlLog, mozilla::LogLevel::Debug, (__VA_ARGS__))

namespace mozilla::widget {

/*
 * This function extracts the encoding label from the subset of HTML internal
 * encoding declaration syntax that uses the old long form with double quotes
 * and without spaces around the equals sign between the "content" attribute
 * name and the attribute value.
 *
 * This was added for the sake of an ancient version of StarOffice
 * in the pre-UTF-8 era in bug 123389. It is unclear if supporting
 * non-UTF-8 encodings is still necessary and if this function
 * still needs to exist.
 *
 * As of December 2022, both Gecko and LibreOffice emit an UTF-8
 * declaration that this function successfully extracts "UTF-8" from,
 * but that's also the default that we fall back on if this function
 * fails to extract a label.
 */
bool GetHTMLCharset(Span<const char> aData, nsCString& aFoundCharset) {
  // Assume ASCII first to find "charset" info
  const nsDependentCSubstring htmlStr(aData);
  nsACString::const_iterator start, end;
  htmlStr.BeginReading(start);
  htmlStr.EndReading(end);
  nsACString::const_iterator valueStart(start), valueEnd(start);

  if (CaseInsensitiveFindInReadable("CONTENT=\"text/html;"_ns, start, end)) {
    start = end;
    htmlStr.EndReading(end);

    if (CaseInsensitiveFindInReadable("charset="_ns, start, end)) {
      valueStart = end;
      start = end;
      htmlStr.EndReading(end);

      if (FindCharInReadable('"', start, end)) {
        valueEnd = start;
      }
    }
  }
  // find "charset" in HTML
  if (valueStart != valueEnd) {
    aFoundCharset = Substring(valueStart, valueEnd);
    ToUpperCase(aFoundCharset);
    return true;
  }
  return false;
}

bool DecodeHTMLData(Span<const char> aData, nsString& aOutDecoded) {
  nsAutoCString charset;
  if (!GetHTMLCharset(aData, charset)) {
    GTK_HTML_LOG("DecodeHTMLData: charset not found, falling back to utf-8");
    charset.AssignLiteral("utf-8");
  } else {
    GTK_HTML_LOG("DecodeHTMLData: detected charset %s", charset.get());
  }

  auto encoding = Encoding::ForLabelNoReplacement(charset);
  if (!encoding) {
    GTK_HTML_LOG("DecodeHTMLData: unrecognised charset label \"%s\"",
                 charset.get());
    return false;
  }

  // Per spec, UTF-16BE/LE in HTML should be treated as UTF-8.
  // https://html.spec.whatwg.org/#determining-the-character-encoding:utf-16-encoding-2
  if (encoding == UTF_16LE_ENCODING || encoding == UTF_16BE_ENCODING) {
    GTK_HTML_LOG("DecodeHTMLData: UTF-16LE/BE overridden to UTF-8 per spec");
    encoding = UTF_8_ENCODING;
  }

  // Remove kHTMLMarkupPrefix again, it won't necessarily cause any
  // issues, but might confuse other users.
  const size_t prefixLen = std::size(kHTMLMarkupPrefix) - 1;
  if (aData.Length() >= prefixLen && nsDependentCSubstring(aData.To(prefixLen))
                                         .EqualsLiteral(kHTMLMarkupPrefix)) {
    aData = aData.From(prefixLen);
  }

  auto [rv, enc] = encoding->Decode(AsBytes(aData), aOutDecoded);
  if (enc != UTF_8_ENCODING &&
      MOZ_LOG_TEST(sGtkHtmlLog, mozilla::LogLevel::Debug)) {
    nsCString decoderName;
    enc->Name(decoderName);
    GTK_HTML_LOG("DecodeHTMLData: expected UTF-8 decoder but got %s",
                 decoderName.get());
  }
  if (NS_FAILED(rv)) {
    GTK_HTML_LOG("DecodeHTMLData: decoding failed");
  }
  return NS_SUCCEEDED(rv);
}

}  // namespace mozilla::widget

#undef GTK_HTML_LOG
