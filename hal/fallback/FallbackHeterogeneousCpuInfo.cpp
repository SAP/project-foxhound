/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#include "Hal.h"
#include "HalTypes.h"

namespace mozilla::hal_impl {

const Maybe<hal::HeterogeneousCpuInfo>& GetHeterogeneousCpuInfo() {
  static Maybe<hal::HeterogeneousCpuInfo> cpuInfo = Nothing();
  return cpuInfo;
}

}  // namespace mozilla::hal_impl
