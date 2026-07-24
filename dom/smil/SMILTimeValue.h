/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_SMIL_SMILTIMEVALUE_H_
#define DOM_SMIL_SMILTIMEVALUE_H_

#include "mozilla/SMILTypes.h"
#include "nsDebug.h"

namespace mozilla {

/*----------------------------------------------------------------------
 * SMILTimeValue class
 *
 * A tri-state time value.
 *
 * First a quick overview of the SMIL time data types:
 *
 * SMILTime          -- a timestamp in milliseconds.
 * SMILTimeValue     -- (this class) a timestamp that can take the additional
 *                      states 'indefinite' and 'unresolved'
 * SMILInstanceTime  -- an SMILTimeValue used for constructing intervals. It
 *                      contains additional fields to govern reset behavior
 *                      and track timing dependencies (e.g. syncbase timing).
 * SMILInterval      -- a pair of SMILInstanceTimes that defines a begin and
 *                      an end time for animation.
 * SMILTimeValueSpec -- a component of a begin or end attribute, such as the
 *                      '5s' or 'a.end+2m' in begin="5s; a.end+2m". Acts as
 *                      a broker between an SMILTimedElement and its
 *                      SMILInstanceTimes by generating new instance times
 *                      and handling changes to existing times.
 *
 * Objects of this class may be in one of three states:
 *
 * 1) The time is resolved and has a definite millisecond value
 * 2) The time is resolved and indefinite
 * 3) The time is unresolved
 *
 * In summary:
 *
 * State      | GetMillis     | IsDefinite | IsIndefinite | IsResolved
 * -----------+---------------+------------+--------------+------------
 * Definite   | SMILTimeValue | true       | false        | true
 * -----------+---------------+------------+--------------+------------
 * Indefinite | --            | false      | true         | true
 * -----------+---------------+------------+--------------+------------
 * Unresolved | --            | false      | false        | false
 *
 */

class SMILTimeValue {
 public:
  // Creates an unresolved time value
  SMILTimeValue()
      : mMilliseconds(kUnresolvedMillis), mState(State::Unresolved) {}

  // Creates a resolved time value
  explicit SMILTimeValue(SMILTime aMillis)
      : mMilliseconds(aMillis), mState(State::Definite) {}

  // Named constructor to create an indefinite time value
  static SMILTimeValue Indefinite() {
    SMILTimeValue value;
    value.SetIndefinite();
    return value;
  }

  static SMILTimeValue Zero() { return SMILTimeValue(SMILTime(0L)); }

  bool IsIndefinite() const { return mState == State::Indefinite; }
  void SetIndefinite() {
    mState = State::Indefinite;
    mMilliseconds = kUnresolvedMillis;
  }

  bool IsResolved() const { return mState != State::Unresolved; }
  void SetUnresolved() {
    mState = State::Unresolved;
    mMilliseconds = kUnresolvedMillis;
  }

  bool IsDefinite() const { return mState == State::Definite; }
  SMILTime GetMillis() const {
    MOZ_ASSERT(mState == State::Definite,
               "GetMillis() called for unresolved or indefinite time");

    return mState == State::Definite ? mMilliseconds : kUnresolvedMillis;
  }

  bool IsZero() const {
    return mState == State::Definite ? mMilliseconds == 0 : false;
  }

  void SetMillis(SMILTime aMillis) {
    mState = State::Definite;
    mMilliseconds = aMillis;
  }

  /*
   * EnsureNonZero ensures values such as 0.0001s are not represented as 0
   * for values where 0 is invalid.
   */
  enum class Rounding : uint8_t { EnsureNonZero, Nearest };

  void SetMillis(double aMillis, Rounding aRounding);

  int8_t CompareTo(const SMILTimeValue& aOther) const;

  bool operator==(const SMILTimeValue& aOther) const {
    return CompareTo(aOther) == 0;
  }

  bool operator!=(const SMILTimeValue& aOther) const {
    return CompareTo(aOther) != 0;
  }

  bool operator<(const SMILTimeValue& aOther) const {
    return CompareTo(aOther) < 0;
  }

  bool operator>(const SMILTimeValue& aOther) const {
    return CompareTo(aOther) > 0;
  }

  bool operator<=(const SMILTimeValue& aOther) const {
    return CompareTo(aOther) <= 0;
  }

  bool operator>=(const SMILTimeValue& aOther) const {
    return CompareTo(aOther) >= 0;
  }

 private:
  static const SMILTime kUnresolvedMillis;

  SMILTime mMilliseconds;
  enum class State : uint8_t { Definite, Indefinite, Unresolved } mState;
};

}  // namespace mozilla

#endif  // DOM_SMIL_SMILTIMEVALUE_H_
