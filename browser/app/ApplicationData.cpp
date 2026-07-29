/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// This file exists so that changes to application.ini.h (which changes
// on every build due to the build ID) only cause this small file to be
// recompiled, rather than the much larger nsBrowserApp.cpp.

#include "ApplicationData.h"
#include "application.ini.h"

const mozilla::StaticXREAppData* const kStaticAppData = &sAppData;
