/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SVGPointList.h"

#include "SVGContentUtils.h"
#include "nsCharSeparatedTokenizer.h"
#include "nsContentUtils.h"
#include "nsTextFormatter.h"

namespace mozilla {

nsresult SVGPointList::CopyFrom(const SVGPointList& rhs) {
  if (!mItems.Assign(rhs.mItems, fallible)) {
    return NS_ERROR_OUT_OF_MEMORY;
  }
  return NS_OK;
}

void SVGPointList::GetValueAsString(nsAString& aValue) const {
  aValue.Truncate();
  char16_t buf[50];
  uint32_t last = mItems.Length() - 1;
  for (uint32_t i = 0; i < mItems.Length(); ++i) {
    // Would like to use aValue.AppendPrintf("%f,%f", item.X(), item.Y()),
    // but it's not possible to always avoid trailing zeros.
    nsTextFormatter::snprintf(buf, std::size(buf), u"%g,%g",
                              double(mItems[i].X()), double(mItems[i].Y()));
    // We ignore OOM, since it's not useful for us to return an error.
    aValue.Append(buf);
    if (i != last) {
      aValue.Append(' ');
    }
  }
}

nsresult SVGPointList::SetValueFromString(const nsAString& aValue) {
  SVGPointList temp;
  bool oddNumberOfValues = false;

  nsCharSeparatedTokenizerTemplate<nsContentUtils::IsHTMLWhitespace,
                                   nsTokenizerFlags::SeparatorOptional>
      tokenizer(aValue, ',');

  while (tokenizer.hasMoreTokens()) {
    const nsAString& token = tokenizer.nextToken();

    nsAString::const_iterator iter, end;
    token.BeginReading(iter);
    token.EndReading(end);

    float x, y;
    if (!SVGContentUtils::ParseNumber(iter, end, x)) {
      return NS_ERROR_DOM_SYNTAX_ERR;
    }

    if (iter == end) {
      if (tokenizer.hasMoreTokens()) {
        if (!SVGContentUtils::ParseNumber(tokenizer.nextToken(), y)) {
          return NS_ERROR_DOM_SYNTAX_ERR;
        }
        temp.AppendItem(Point(x, y));
      } else {
        // Drop the last odd co-ordinate and use the rest.
        oddNumberOfValues = true;
      }
    } else {
      // It's possible for the token to be 10-30 which has
      // no separator but needs to be parsed as 10, -30
      const nsAString& leftOver = Substring(iter, end);
      if (leftOver[0] != '-' || !SVGContentUtils::ParseNumber(leftOver, y)) {
        return NS_ERROR_DOM_SYNTAX_ERR;
      }
      temp.AppendItem(Point(x, y));
    }
  }
  if (!oddNumberOfValues && tokenizer.separatorAfterCurrentToken()) {
    return NS_ERROR_DOM_SYNTAX_ERR;  // trailing comma
  }
  mItems = std::move(temp.mItems);
  return NS_OK;
}

}  // namespace mozilla
