/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

use std::process;

#[cfg(any(target_os = "android", target_os = "linux"))]
use crate::platform::linux::unix_socketpair;
use crate::{ipc_channel::IPCChannelError, IPCConnector, IPCListener, Pid};

pub struct IPCChannel {
    listener: IPCListener,
    client_endpoint: IPCConnector,
    server_endpoint: IPCConnector,
}

impl IPCChannel {
    /// Create a new IPC channel for use between the browser main process and
    /// the crash helper. This includes a dummy listener and two connected
    /// endpoints. The the server-side endpoint can be inherited by a child
    /// process, the client-side endpoint cannot.
    pub fn new() -> Result<IPCChannel, IPCChannelError> {
        let listener = IPCListener::new(process::id() as Pid)?;

        // Only the server-side socket will be left open after an exec().
        let pair = unix_socketpair()?;
        let client_endpoint = IPCConnector::from_fd(pair.0)?;
        let server_endpoint = IPCConnector::from_fd_inheritable(pair.1)?;

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
        let pair = unix_socketpair()?;
        let client_endpoint = IPCConnector::from_fd(pair.0)?;
        let server_endpoint = IPCConnector::from_fd(pair.1)?;

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
