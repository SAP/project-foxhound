/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ContentRange.h"
#include "nsContentUtils.h"

mozilla::net::ContentRange::ContentRange(
    const nsContentUtils::ParsedRange& aRangeHeader, uint64_t aSize) {
  // Sanity check: ParseSingleRangeRequest should handle these two cases.
  // If rangeEndValue and rangeStartValue are null, then return failure.
  MOZ_ASSERT(aRangeHeader.Start().isSome() || aRangeHeader.End().isSome());
  // If rangeStartValue and rangeEndValue are numbers, and rangeStartValue
  // is greater than rangeEndValue, then return failure.
  MOZ_ASSERT(aRangeHeader.Start().isNothing() ||
             aRangeHeader.End().isNothing() ||
             *aRangeHeader.Start() <= *aRangeHeader.End());

  // https://fetch.spec.whatwg.org/#ref-for-simple-range-header-value%E2%91%A1
  // If rangeStart is null:
  if (aRangeHeader.Start().isNothing()) {
    // Set rangeStart to fullLength − rangeEnd.
    mStart = aSize - *aRangeHeader.End();

    // Set rangeEnd to rangeStart + rangeEnd − 1.
    mEnd = mStart + *aRangeHeader.End() - 1;

    // Otherwise:
  } else {
    // If rangeStart is greater than or equal to fullLength, then return a
    // network error.
    if (*aRangeHeader.Start() >= aSize) {
      return;
    }
    mStart = *aRangeHeader.Start();

    // If rangeEnd is null or rangeEnd is greater than or equal to fullLength,
    // then set rangeEnd to fullLength − 1.
    if (aRangeHeader.End().isNothing() || *aRangeHeader.End() >= aSize) {
      mEnd = aSize - 1;
    } else {
      mEnd = *aRangeHeader.End();
    }
  }
  mSize = aSize;
}

void mozilla::net::ContentRange::AsHeader(nsACString& aOutString) const {
  aOutString.Assign("bytes "_ns);
  aOutString.AppendInt(mStart);
  aOutString.AppendLiteral("-");
  aOutString.AppendInt(mEnd);
  aOutString.AppendLiteral("/");
  aOutString.AppendInt(mSize);
}
