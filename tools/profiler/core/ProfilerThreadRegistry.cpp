/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/ProfilerThreadRegistry.h"

namespace mozilla::profiler {

/* static */
MOZ_RUNINIT ThreadRegistry::RegistryContainer
    ThreadRegistry::sRegistryContainer;

/* static */
MOZ_RUNINIT ThreadRegistry::RegistryMutex ThreadRegistry::sRegistryMutex;

}  // namespace mozilla::profiler
