/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

use crash_helper_common::{messages::ProcessRendezVous, GeckoChildId, Pid};
use nix::libc::{prctl, PR_SET_PTRACER};
use std::process;

use crate::CrashHelperClient;

impl CrashHelperClient {
    pub(crate) fn prepare_for_minidump(
        crash_helper_pid: Option<Pid>,
        id: GeckoChildId,
    ) -> Option<ProcessRendezVous> {
        let dumpable = if let Some(crash_helper_pid) = crash_helper_pid {
            // SAFETY: Calling `prctl()` is always safe.
            unsafe { prctl(PR_SET_PTRACER, crash_helper_pid) >= 0 }
        } else {
            false
        };

        Some(ProcessRendezVous::new(
            dumpable,
            process::id() as Pid,
            id,
            [],
        ))
    }
}
