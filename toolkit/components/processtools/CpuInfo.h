/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef TOOLKIT_COMPONENTS_PROCESSTOOLS_CPUINFO_H_
#define TOOLKIT_COMPONENTS_PROCESSTOOLS_CPUINFO_H_

namespace mozilla {

// Get the CPU frequency to use to convert cycle time values to actual time.
int GetCpuFrequencyMHz();

}  // namespace mozilla

#endif  // TOOLKIT_COMPONENTS_PROCESSTOOLS_CPUINFO_H_
