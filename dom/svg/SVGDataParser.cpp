/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SVGDataParser.h"

#include "SVGContentUtils.h"
#include "nsContentUtils.h"

namespace mozilla {

SVGDataParser::SVGDataParser(const nsAString& aValue) {
  aValue.BeginReading(mIter);
  aValue.EndReading(mEnd);
}

bool SVGDataParser::SkipCommaWsp() {
  if (!SkipWsp()) {
    // end of string
    return false;
  }
  if (*mIter != ',') {
    return true;
  }
  ++mIter;
  return SkipWsp();
}

bool SVGDataParser::SkipWsp() {
  while (mIter != mEnd) {
    if (!nsContentUtils::IsHTMLWhitespace(*mIter)) {
      return true;
    }
    ++mIter;
  }
  return false;
}

}  // namespace mozilla
