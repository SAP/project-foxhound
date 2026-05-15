/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

use anyhow::{bail, Result};
use crash_helper_common::{
    messages::{self, Header, Message},
    AncillaryData, IPCConnector, IPCConnectorKey, IPCEvent, IPCListener, IPCQueue, Pid,
};
use std::{collections::HashMap, process, rc::Rc};

use crate::crash_generation::CrashGenerator;

#[derive(PartialEq)]
pub enum IPCServerState {
    Running,
    ClientDisconnected,
}

#[derive(PartialEq)]
enum IPCEndpoint {
    /// A connection to the parent process
    Parent,
    /// A connection to the child process
    Child,
    #[allow(dead_code)]
    /// A connection to an external process
    External,
}

struct IPCConnection {
    /// The platform-specific connector used for this connection
    connector: Rc<IPCConnector>,
    /// The type of process on the other side of this connection
    endpoint: IPCEndpoint,
    #[allow(dead_code)]
    /// The pid of the Firefox process this is connected to. This is `None`
    /// when this is a connection to an external process.
    pid: Option<Pid>,
}

pub(crate) struct IPCServer {
    /// Platform-specific mechanism to wait for events. This will contain
    /// references to the connectors so needs to be the first element in
    /// the structure so that it's dropped first.
    queue: IPCQueue,
    connections: HashMap<IPCConnectorKey, IPCConnection>,
}

impl IPCServer {
    pub(crate) fn new(
        client_pid: Pid,
        listener: IPCListener,
        connector: IPCConnector,
    ) -> Result<IPCServer> {
        let connector = Rc::new(connector);
        let mut queue = IPCQueue::new(listener)?;
        queue.add_connector(&connector)?;

        let mut connections = HashMap::with_capacity(10);
        connections.insert(
            connector.key(),
            IPCConnection {
                connector,
                endpoint: IPCEndpoint::Parent,
                pid: Some(client_pid),
            },
        );

        Ok(IPCServer { queue, connections })
    }

    pub(crate) fn run(&mut self, generator: &mut CrashGenerator) -> Result<IPCServerState> {
        let events = self.queue.wait_for_events()?;

        for event in events.into_iter() {
            match event {
                IPCEvent::Connect(connector) => {
                    self.connections.insert(
                        connector.key(),
                        IPCConnection {
                            connector,
                            endpoint: IPCEndpoint::External,
                            pid: None,
                        },
                    );
                }
                IPCEvent::Message(key, header, payload, ancillary_data) => {
                    if let Err(error) =
                        self.handle_message(key, &header, payload, ancillary_data, generator)
                    {
                        log::error!(
                            "Error {error:#} when handling a message of kind {:?}",
                            header.kind
                        );
                    }
                }
                IPCEvent::Disconnect(key) => {
                    let connection = self
                        .connections
                        .remove(&key)
                        .expect("Disconnection event but no corresponding connection");

                    if connection.endpoint == IPCEndpoint::Parent {
                        // The main process disconnected, leave
                        return Ok(IPCServerState::ClientDisconnected);
                    }
                }
            }
        }

        Ok(IPCServerState::Running)
    }

    fn handle_message(
        &mut self,
        key: IPCConnectorKey,
        header: &Header,
        data: Vec<u8>,
        ancillary_data: Vec<AncillaryData>,
        generator: &mut CrashGenerator,
    ) -> Result<()> {
        let connection = self
            .connections
            .get(&key)
            .expect("Event received on non-existing connection");
        let connector = &connection.connector;

        match connection.endpoint {
            IPCEndpoint::Parent => match header.kind {
                messages::Kind::SetCrashReportPath => {
                    let message = messages::SetCrashReportPath::decode(&data, ancillary_data)?;
                    generator.set_path(message.path);
                }
                messages::Kind::TransferMinidump => {
                    let message = messages::TransferMinidump::decode(&data, ancillary_data)?;
                    connector.send_message(generator.retrieve_minidump(message.pid))?;
                }
                messages::Kind::GenerateMinidump => {
                    todo!("Implement all messages");
                }
                messages::Kind::RegisterChildProcess => {
                    let message = messages::RegisterChildProcess::decode(&data, ancillary_data)?;
                    let connector = IPCConnector::from_ancillary(message.ancillary_data)?;
                    connector.send_message(messages::ChildProcessRendezVous::new(
                        process::id() as Pid
                    ))?;
                    let reply = connector.recv_reply::<messages::ChildProcessRendezVousReply>()?;

                    if !reply.dumpable {
                        bail!("Child process {} is not dumpable", reply.child_pid);
                    }

                    let connector = Rc::new(connector);
                    self.queue.add_connector(&connector)?;
                    self.connections.insert(
                        connector.key(),
                        IPCConnection {
                            connector,
                            endpoint: IPCEndpoint::Child,
                            pid: Some(reply.child_pid),
                        },
                    );
                }
                #[cfg(any(target_os = "android", target_os = "linux"))]
                messages::Kind::RegisterAuxvInfo => {
                    let message = messages::RegisterAuxvInfo::decode(&data, ancillary_data)?;
                    generator.register_auxv_info(message)?;
                }
                #[cfg(any(target_os = "android", target_os = "linux"))]
                messages::Kind::UnregisterAuxvInfo => {
                    let message = messages::UnregisterAuxvInfo::decode(&data, ancillary_data)?;
                    generator.unregister_auxv_info(message)?;
                }
                kind => {
                    bail!("Unexpected message {kind:?} from parent process");
                }
            },
            IPCEndpoint::Child => {
                bail!("Unexpected message {:?} from child process", header.kind);
            }
            IPCEndpoint::External => match header.kind {
                #[cfg(target_os = "windows")]
                messages::Kind::WindowsErrorReporting => {
                    let message =
                        messages::WindowsErrorReportingMinidump::decode(&data, ancillary_data)?;
                    let res = generator.generate_wer_minidump(message);
                    match res {
                        Ok(_) => {}
                        Err(error) => log::error!(
                            "Could not generate a minidump requested via WER, error: {error:?}"
                        ),
                    }
                    connector.send_message(messages::WindowsErrorReportingMinidumpReply::new())?;
                }
                kind => {
                    bail!("Unexpected message {kind:?} from external process");
                }
            },
        };

        Ok(())
    }
}
