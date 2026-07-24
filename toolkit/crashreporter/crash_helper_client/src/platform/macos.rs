/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

use crash_helper_common::Pid;

use crate::CrashHelperClient;

impl CrashHelperClient {
    pub(crate) fn prepare_for_minidump(_crash_helper_pid: Pid) -> bool {
        // TODO: Send back the right returned by `mach_task_self()` to give the
        // crash helper client the necessary permissions to access this task.
        true
    }
}
