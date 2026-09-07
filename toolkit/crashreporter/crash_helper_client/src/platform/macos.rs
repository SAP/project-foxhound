/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

use crash_helper_common::{
    messages::ProcessRendezVous, GeckoChildId, MachPortRight, Pid, SendRightRef,
};
use mach2::traps::mach_task_self;
use std::process;

use crate::CrashHelperClient;

impl CrashHelperClient {
    pub(crate) fn prepare_for_minidump(
        _crash_helper_pid: Option<Pid>,
        id: GeckoChildId,
    ) -> Option<ProcessRendezVous> {
        // SAFETY: `mach_task_self()` is always safe to call and always yields
        // a valid port send right.
        let send_right = unsafe { SendRightRef::from_raw_port(mach_task_self()) };
        let task_right = MachPortRight::SendRef(send_right);

        Some(ProcessRendezVous::new(
            /* dumpable */ true,
            process::id() as Pid,
            id,
            [task_right],
        ))
    }
}
