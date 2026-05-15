/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SMILTimeValue.h"

#include "nsMathUtils.h"

namespace mozilla {

const SMILTime SMILTimeValue::kUnresolvedMillis =
    std::numeric_limits<SMILTime>::max();

//----------------------------------------------------------------------
// SMILTimeValue methods:

static inline int8_t Cmp(int64_t aA, int64_t aB) {
  return aA == aB ? 0 : (aA > aB ? 1 : -1);
}

int8_t SMILTimeValue::CompareTo(const SMILTimeValue& aOther) const {
  int8_t result;

  if (mState == State::Definite) {
    result = (aOther.mState == State::Definite)
                 ? Cmp(mMilliseconds, aOther.mMilliseconds)
                 : -1;
  } else if (mState == State::Indefinite) {
    if (aOther.mState == State::Definite)
      result = 1;
    else if (aOther.mState == State::Indefinite)
      result = 0;
    else
      result = -1;
  } else {
    result = (aOther.mState != State::Unresolved) ? 1 : 0;
  }

  return result;
}

void SMILTimeValue::SetMillis(double aMillis, Rounding aRounding) {
  mState = State::Definite;
  mMilliseconds = NS_round(aMillis);
  if (aRounding == Rounding::EnsureNonZero && !mMilliseconds && aMillis) {
    // Ensure we don't round small values to zero.
    mMilliseconds = std::copysign(1.0, aMillis);
  }
}

}  // namespace mozilla
