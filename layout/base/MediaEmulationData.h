/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* Common data for media query emulation by DevTools, hanging off nsPresContext
 */

#ifndef mozilla_MediaEmulationData_h
#define mozilla_MediaEmulationData_h

#include "nsAtom.h"

namespace mozilla {

struct MediaEmulationData final {
  MediaEmulationData() = default;

  RefPtr<nsAtom> mMedium;
  float mDPPX = 0.0;
};

}  // namespace mozilla

#endif
