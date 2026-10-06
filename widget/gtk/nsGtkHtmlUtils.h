/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsGtkHtmlUtils_h_
#define nsGtkHtmlUtils_h_

#include "mozilla/Span.h"
#include "nsString.h"

namespace mozilla::widget {

// Prepended by Firefox when writing text/html to the clipboard or drag source
// so that GetHTMLCharset always finds a UTF-8 declaration.  Stripped on
// read-back by DecodeHTMLData.
inline constexpr char kHTMLMarkupPrefix[] =
    R"(<meta http-equiv="content-type" content="text/html; charset=utf-8">)";

// Detect the character encoding from an HTML fragment.  Looks for a
// <meta http-equiv="content-type" content="text/html; charset=..."> tag.
// Returns true and sets aFoundCharset when a charset is found; returns false
// otherwise.  This parser exists for StarOffice/LibreOffice compatibility
// (bug 123389) and supports a narrow subset of HTML meta-charset syntax.
bool GetHTMLCharset(Span<const char> aData, nsCString& aFoundCharset);

// Decode an HTML byte sequence to a UTF-16 string.  The charset is detected
// from the HTML content itself via GetHTMLCharset; if none is found, UTF-8 is
// assumed.  Returns true on success.
bool DecodeHTMLData(Span<const char> aData, nsString& aOutDecoded);

}  // namespace mozilla::widget

#endif  // nsGtkHtmlUtils_h_
