/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef StaticXREAppData_h
#define StaticXREAppData_h

#include <stdint.h>

namespace mozilla {

#define NS_XRE_ENABLE_PROFILE_MIGRATOR (1 << 1)
#define NS_XRE_ENABLE_CRASH_REPORTER (1 << 3)

/**
 * A static version of the XRE app data is compiled into the application
 * so that it is not necessary to read application.ini at startup.
 *
 * This structure is initialized into and matches nsXREAppData
 */
struct StaticXREAppData {
  const char* vendor;
  const char* name;
  const char* remotingName;
  const char* version;
  const char* buildID;
  const char* ID;
  const char* copyright;
  uint32_t flags;
  const char* minVersion;
  const char* maxVersion;
  const char* crashReporterURL;
  const char* profile;
  const char* UAName;
  const char* sourceURL;
  const char* sourceRevision;
  const char* updateURL;
};

}  // namespace mozilla

#endif  // StaticXREAppData_h
