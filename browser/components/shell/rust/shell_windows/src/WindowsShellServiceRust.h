/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef SHELL_WINDOWS_RUST_SRC_LAF_SERVICE_H_
#define SHELL_WINDOWS_RUST_SRC_LAF_SERVICE_H_

#include "ErrorList.h"
#include "nsID.h"

extern "C" {
nsresult new_limited_access_feature_service(REFNSIID iid, void** result);
nsresult shell_windows_new_secondary_tile_service(REFNSIID iid, void** result);
};

#endif  // SHELL_WINDOWS_RUST_SRC_LAF_SERVICE_H_
