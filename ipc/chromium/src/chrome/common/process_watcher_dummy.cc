/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "chrome/common/process_watcher.h"

void ProcessWatcher::EnsureProcessTerminated(base::ProcessHandle, bool) {}

mozilla::UniqueFileHandle GetSignalPipe() { return {}; }
