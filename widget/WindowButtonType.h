/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_WindowButtonType_h
#define mozilla_WindowButtonType_h

#include <cstdint>

namespace mozilla {

enum class WindowButtonType : uint8_t {
  Minimize,
  Maximize,  // Also covers restore.
  Close,
  Count,
};

}

#endif
