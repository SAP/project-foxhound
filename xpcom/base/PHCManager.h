/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_PHCManager_h
#define mozilla_PHCManager_h

namespace mozilla {

// Read the PHC pref and potentially initialise PHC.  Also register a
// callback for the pref to update PHC as the pref changes.
void InitPHCState();

void ReportPHCTelemetry();

};  // namespace mozilla

#endif  // mozilla_PHCManager_h
