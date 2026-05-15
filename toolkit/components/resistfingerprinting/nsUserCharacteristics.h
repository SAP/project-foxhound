/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#ifndef _nsUserCharacteristics_h_
#define _nsUserCharacteristics_h_

#include "ErrorList.h"
#include "mozilla/MouseEvents.h"

class nsUserCharacteristics {
 public:
  static void MaybeSubmitPing();

  /*
   * These APIs are public only for testing using the gtest
   * When PopulateDataAndEventuallySubmit is called with aTesting = true
   *   it will not submit the data, and SubmitPing must be called explicitly.
   *   This is perfect because that's what we want for the gtest.
   */
  static bool ShouldSubmit();
  static void PopulateDataAndEventuallySubmit(bool aUpdatePref = true,
                                              bool aTesting = false);
  static void SubmitPing();
};

namespace testing {
extern "C" {  // Needed to call these in the gtest

int MaxTouchPoints();

// Populates only the MathML prefs metric for testing
void PopulateMathMLPrefs();

}  // extern "C"
};  // namespace testing

#endif /*  _nsUserCharacteristics_h_ */
