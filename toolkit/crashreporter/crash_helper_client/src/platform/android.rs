/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

use anyhow::Result;
use crash_helper_common::{IPCConnector, Pid, RawIPCConnector};

use crate::CrashHelperClient;

impl CrashHelperClient {
    pub(crate) fn new(server_socket: RawIPCConnector) -> Result<CrashHelperClient> {
        // SAFETY: The `server_socket` passed in from the application is valid
        let connector = unsafe { IPCConnector::from_raw_connector(server_socket)? };

        Ok(CrashHelperClient {
            connector,
            spawner_thread: None,
        })
    }

    pub(crate) fn prepare_for_minidump(_crash_helper_pid: Pid) -> bool {
        // On Android this is currently a no-op
        true
    }
}
