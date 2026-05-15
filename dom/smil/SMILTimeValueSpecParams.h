/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_SMIL_SMILTIMEVALUESPECPARAMS_H_
#define DOM_SMIL_SMILTIMEVALUESPECPARAMS_H_

#include "mozilla/SMILTimeValue.h"
#include "nsAtom.h"

namespace mozilla {

//----------------------------------------------------------------------
// SMILTimeValueSpecParams
//
// A simple data type for storing the result of parsing a single begin or end
// value (e.g. the '5s' in begin="5s; indefinite; a.begin+2s").

class SMILTimeValueSpecParams {
 public:
  SMILTimeValueSpecParams() = default;

  // A clock value that is added to:
  // - type Offset: the document begin
  // - type Syncbase: the timebase's begin or end time
  // - type Event: the event time
  // - type Repeat: the repeat time
  // It is not used for Wallclock or Indefinite times
  SMILTimeValue mOffset;

  // The base element that this specification refers to.
  // For Syncbase types, this is the timebase
  // For Event and Repeat types, this is the eventbase
  RefPtr<nsAtom> mDependentElemID;

  // The event to respond to.
  // Only used for Event types.
  RefPtr<nsAtom> mEventSymbol;

  // The repeat iteration to respond to.
  // Only used for mType=Repeat.
  uint32_t mRepeatIteration = 0;

  // The type of value this specification describes
  enum class Type : uint8_t {
    Offset,
    Syncbase,
    Event,
    Repeat,
    Wallclock,
    Indefinite
  } mType = Type::Indefinite;

  // Indicates if this specification refers to the begin or end of the dependent
  // element.
  // Only used for SYNCBASE types.
  bool mSyncBegin = false;
};

}  // namespace mozilla

#endif  // DOM_SMIL_SMILTIMEVALUESPECPARAMS_H_
