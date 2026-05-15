/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

use nix::poll::{poll, PollFd, PollFlags, PollTimeout};
use std::{collections::HashMap, os::fd::BorrowedFd, rc::Rc};

use crate::{
    ignore_eintr, ipc_queue::IPCQueueError, platform::PlatformError, IPCConnector, IPCConnectorKey,
    IPCEvent, IPCListener,
};

pub struct IPCQueue {
    connectors: HashMap<IPCConnectorKey, Rc<IPCConnector>>,
}

impl IPCQueue {
    pub fn new(_listener: IPCListener) -> Result<IPCQueue, IPCQueueError> {
        let connectors = HashMap::with_capacity(10);
        Ok(IPCQueue { connectors })
    }

    pub fn add_connector(&mut self, connector: &Rc<IPCConnector>) -> Result<(), IPCQueueError> {
        let res = self.connectors.insert(connector.key(), connector.clone());
        debug_assert!(res.is_none());
        Ok(())
    }

    pub fn add_listener(&self, _listener: &IPCListener) -> Result<(), IPCQueueError> {
        Ok(())
    }

    pub fn wait_for_events(&mut self) -> Result<Vec<IPCEvent>, IPCQueueError> {
        let mut pollfds = Vec::with_capacity(self.connectors.len());
        // SAFETY: All the fds held by the queue are known to be valid.
        pollfds.extend(self.connectors.iter().map(|connector| {
            PollFd::new(
                unsafe { BorrowedFd::borrow_raw(connector.1.as_raw()) },
                PollFlags::POLLIN,
            )
        }));

        let mut events = Vec::<IPCEvent>::new();
        let mut num_events = ignore_eintr!(poll(&mut pollfds, PollTimeout::NONE))
            .map_err(|e| IPCQueueError::WaitError(PlatformError::PollFailure(e)))?;

        for (pollfd, (&key, connector)) in pollfds.iter().zip(&self.connectors) {
            // revents() returns None only if the kernel sends back data
            // that nix does not understand, we can safely assume this
            // never happens in practice hence the unwrap().
            let Some(revents) = pollfd.revents() else {
                // TODO: We should log this error, disconnect the socket or do
                // both things. Probably needs a new event type.
                continue;
            };

            if revents.contains(PollFlags::POLLHUP) {
                events.push(IPCEvent::Disconnect(key));
                // If a process was disconnected then skip all further
                // processing of the socket. This wouldn't matter normally,
                // but on macOS calling recvmsg() on a hung-up socket seems
                // to trigger a kernel panic, one we've already encountered
                // in the past. Doing things this way avoids the panic
                // while having no real downsides.
                continue;
            }

            if revents.contains(PollFlags::POLLIN) {
                let header = connector.recv_header()?;
                let payload = connector
                    .recv(header.size)
                    .map_err(IPCQueueError::IPCError)?;
                events.push(IPCEvent::Message(key, header, payload.0, payload.1));
            }

            if !revents.is_empty() {
                num_events -= 1;

                if num_events == 0 {
                    break;
                }
            }
        }

        // Remove all connectors for which we've received disconnect events.
        for event in &events {
            if let IPCEvent::Disconnect(key) = event {
                self.connectors.remove(key);
            }
        }

        Ok(events)
    }
}
