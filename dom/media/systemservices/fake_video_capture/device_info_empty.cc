/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "device_info_empty.h"

#include <string.h>

namespace webrtc::videocapturemodule {

int32_t DeviceInfoEmpty::GetDeviceName(
    uint32_t aDeviceNumber, char* aDeviceNameUTF8, uint32_t aDeviceNameLength,
    char* aDeviceUniqueIdUTF8, uint32_t aDeviceUniqueIdUTF8Length,
    char* aProductUniqueIdUTF8, uint32_t aProductUniqueIdUTF8Length,
    pid_t* aPid, bool* deviceIsPlaceholder) {
  if (aDeviceNumber != 0) {
    return -1;
  }

  strncpy(aDeviceNameUTF8, kName, aDeviceNameLength - 1);
  aDeviceNameUTF8[aDeviceNameLength - 1] = '\0';

  strncpy(aDeviceUniqueIdUTF8, kId, aDeviceUniqueIdUTF8Length - 1);
  aDeviceUniqueIdUTF8[aDeviceUniqueIdUTF8Length - 1] = '\0';

  return 0;
}

}  // namespace webrtc::videocapturemodule
