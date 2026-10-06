/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

use std::{
    collections::HashMap,
    mem::zeroed,
    os::fd::{AsRawFd, FromRawFd, OwnedFd},
    ptr::{null, null_mut},
    rc::Rc,
};

use mach2::port::mach_port_t;
use nix::{
    errno::Errno,
    libc::{kevent, kqueue, EVFILT_MACHPORT, EV_ADD, EV_ENABLE},
};

use crate::{
    errors::IPCError, ipc_queue::IPCQueueError, platform::PlatformError, IPCConnector,
    IPCConnectorKey, IPCEvent, IPCListener,
};

pub struct IPCQueue {
    queue: OwnedFd,
    connectors: HashMap<IPCConnectorKey, Rc<IPCConnector>>,
}

impl IPCQueue {
    pub fn new(_listener: IPCListener) -> Result<IPCQueue, IPCQueueError> {
        let queue = unsafe {
            let fd = kqueue();

            if fd < 0 {
                return Err(IPCQueueError::CreationFailure(
                    PlatformError::KernelQueueError(Errno::last()),
                ));
            }

            OwnedFd::from_raw_fd(fd)
        };
        let connectors = HashMap::with_capacity(10);

        Ok(IPCQueue { queue, connectors })
    }

    pub fn add_connector(&mut self, connector: &Rc<IPCConnector>) -> Result<(), IPCQueueError> {
        let event = kevent {
            ident: connector.raw_recv_right() as usize,
            filter: EVFILT_MACHPORT,
            flags: EV_ADD | EV_ENABLE,
            fflags: 0,
            data: 0,
            udata: null_mut(),
        };
        let res = unsafe { kevent(self.queue.as_raw_fd(), &event, 1, null_mut(), 0, null()) };
        if res < 0 {
            return Err(IPCQueueError::RegistrationFailure(
                PlatformError::KernelEventError(Errno::last()),
            ));
        }

        let res = self.connectors.insert(connector.key(), connector.clone());
        debug_assert!(res.is_none());

        Ok(())
    }

    pub fn wait_for_events(&mut self) -> Result<Vec<IPCEvent>, IPCQueueError> {
        // SAFETY: This must be zeroed as it will be populated by `kqueue()`
        let mut event = kevent {
            ..unsafe { zeroed() }
        };

        let res = unsafe { kevent(self.queue.as_raw_fd(), null(), 0, &mut event, 1, null()) };
        if res < 0 {
            return Err(IPCQueueError::WaitError(PlatformError::KernelEventError(
                Errno::last(),
            )));
        }

        let raw_mach_port: mach_port_t = event
            .data
            .try_into()
            .expect("event.data must contain a valid Mach port");
        let connector = self
            .connectors
            .get(&raw_mach_port)
            .expect("Event did not match a known connector");

        let header = match connector.recv_header() {
            Ok(header) => header,
            Err(_error @ IPCError::ReceptionFailure(PlatformError::NoMoreSenders)) => {
                return Ok(vec![IPCEvent::Disconnect(raw_mach_port)]);
            }
            Err(error) => return Err(IPCQueueError::IPCError(error)),
        };

        let payload = match connector.recv(header.size) {
            Ok(payload) => payload,
            Err(_error @ IPCError::ReceptionFailure(PlatformError::NoMoreSenders)) => {
                return Ok(vec![IPCEvent::Disconnect(raw_mach_port)]);
            }
            Err(error) => return Err(IPCQueueError::IPCError(error)),
        };

        Ok(vec![IPCEvent::Message(
            raw_mach_port,
            header,
            payload.0,
            payload.1,
        )])
    }
}
