/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

use std::process;

use crate::{
    ipc_channel::IPCChannelError, platform::mach::ReceiveRight, IPCConnector, IPCListener, Pid,
};

pub struct IPCChannel {
    listener: IPCListener,
    client_endpoint: IPCConnector,
    server_endpoint: IPCConnector,
}

impl IPCChannel {
    /// Create a new IPC channel for use between the browser main process and
    /// the crash helper. This includes a dummy listener endpoint and two
    /// connected endpoints.
    pub fn new() -> Result<IPCChannel, IPCChannelError> {
        let listener = IPCListener::new(process::id() as Pid)?;
        let client_recv = ReceiveRight::new()?;
        let helper_recv = ReceiveRight::new()?;
        let client_send = helper_recv.insert_send_right()?;
        let helper_send = client_recv.insert_send_right()?;

        let client_endpoint = IPCConnector::from_rights(client_send, client_recv)?;
        let server_endpoint = IPCConnector::from_rights(helper_send, helper_recv)?;

        Ok(IPCChannel {
            listener,
            client_endpoint,
            server_endpoint,
        })
    }

    /// Deconstruct the IPC channel, returning the listener, the connected
    /// server-side endpoint and the connected client-side endpoint.
    pub fn deconstruct(self) -> (IPCListener, IPCConnector, IPCConnector) {
        (self.listener, self.server_endpoint, self.client_endpoint)
    }
}

pub struct IPCClientChannel {
    client_endpoint: IPCConnector,
    server_endpoint: IPCConnector,
}

impl IPCClientChannel {
    /// Create a new IPC channel for use between one of the browser's child
    /// processes and the crash helper.
    pub fn new() -> Result<IPCClientChannel, IPCChannelError> {
        let client_recv = ReceiveRight::new()?;
        let helper_recv = ReceiveRight::new()?;
        let client_send = helper_recv.insert_send_right()?;
        let helper_send = client_recv.insert_send_right()?;

        let client_endpoint = IPCConnector::from_rights(client_send, client_recv)?;
        let server_endpoint = IPCConnector::from_rights(helper_send, helper_recv)?;

        Ok(IPCClientChannel {
            client_endpoint,
            server_endpoint,
        })
    }

    /// Deconstruct the IPC channel, returning the connected server-side
    /// endpoint and the connected client-side endpoint.
    pub fn deconstruct(self) -> (IPCConnector, IPCConnector) {
        (self.server_endpoint, self.client_endpoint)
    }
}
