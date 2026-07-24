/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef toolkit_breakpad_linux_utils_h_
#define toolkit_breakpad_linux_utils_h_

#include <stdint.h>

bool ElfFileSoVersion(const char* mapping_name, uint32_t* version);

#endif /* toolkit_breakpad_linux_utils_h_ */
