/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// IWYU pragma: private, include "nsString.h"

#ifndef nsAString_h_
#define nsAString_h_

#include "nsStringFwd.h"
#include "nsStringIterator.h"

#include "nsStringFlags.h"
#include "nsTStringRepr.h"
#include "nsTSubstring.h"
#include "nsTSubstringTuple.h"

/**
 * ASCII case-insensitive comparator.  (for Unicode case-insensitive
 * comparision, see nsUnicharUtils.h)
 */
int nsCaseInsensitiveCStringComparator(const char*, const char*, size_t,
                                       size_t);

class nsCaseInsensitiveCStringArrayComparator {
 public:
  template <class A, class B>
  bool Equals(const A& aStrA, const B& aStrB) const {
    return aStrA.Equals(aStrB, nsCaseInsensitiveCStringComparator);
  }
};

#endif  // !defined(nsAString_h_)
