/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

use anyhow::Result;
use crash_helper_common::{
    messages::ProcessRendezVous, GeckoChildId, IPCConnector, Pid, RawIPCConnector,
};
use std::process;

use crate::CrashHelperClient;

impl CrashHelperClient {
    pub(crate) fn new(server_socket: RawIPCConnector) -> Result<CrashHelperClient> {
        // SAFETY: The `server_socket` passed in from the application is valid
        let connector = unsafe { IPCConnector::from_raw_connector(server_socket)? };

        let rendezvous =
            Self::prepare_for_minidump(/* crash_helper_pid */ None, /* id */ 0).unwrap();
        connector.send_message(rendezvous)?;

        Ok(CrashHelperClient {
            connector,
            spawner_thread: None,
            pid: 0, // Unused on Android
        })
    }

    pub(crate) fn prepare_for_minidump(
        _crash_helper_pid: Option<Pid>,
        id: GeckoChildId,
    ) -> Option<ProcessRendezVous> {
        Some(ProcessRendezVous::new(
            /* dumpable */ true,
            process::id() as Pid,
            id,
            [],
        ))
    }
}
