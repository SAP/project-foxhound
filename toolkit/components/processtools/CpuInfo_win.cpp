/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "CpuInfo.h"

#include <windows.h>

namespace mozilla {

int GetCpuFrequencyMHz() {
  static const int frequency = []() {
    // Get the nominal CPU frequency.
    DWORD data;
    DWORD len = sizeof(data);
    if (::RegGetValueW(HKEY_LOCAL_MACHINE,
                       LR"(HARDWARE\DESCRIPTION\System\CentralProcessor\0)",
                       L"~Mhz", RRF_RT_REG_DWORD, nullptr, &data,
                       &len) == ERROR_SUCCESS) {
      return static_cast<int>(data);
    }

    return 0;
  }();

  return frequency;
}

}  // namespace mozilla
