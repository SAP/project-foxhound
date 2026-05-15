/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

use std::{
    ffi::{c_int, CStr, CString},
    thread,
};

use mach2::{
    bootstrap::{bootstrap_port, name_t, BOOTSTRAP_SUCCESS},
    kern_return::{kern_return_t, KERN_SUCCESS},
    mach_types::ipc_space_t,
    message::{
        mach_msg_id_t, mach_msg_port_descriptor_t, mach_msg_type_name_t, MACH_MSGH_BITS,
        MACH_MSGH_BITS_REMOTE_MASK, MACH_MSG_TYPE_COPY_SEND, MACH_MSG_TYPE_MAKE_SEND,
        MACH_MSG_TYPE_MAKE_SEND_ONCE, MACH_MSG_TYPE_MOVE_RECEIVE, MACH_MSG_TYPE_MOVE_SEND,
    },
    port::{mach_port_name_t, mach_port_t, MACH_PORT_NULL},
    traps::mach_task_self,
};

use crate::{
    errors::IPCError,
    mach_msg_recv,
    messages::{self, Message, MessageError},
    platform::{
        mach::{mach_msg_send, AsRawPort, MachMessageWrapper, ReceiveRight, SendRight},
        OwnedRight, PlatformError,
    },
    ProcessHandle,
};

#[allow(non_camel_case_types)]
type mach_port_mscount_t = u32;

unsafe extern "C" {
    fn bootstrap_register(
        bp: mach_port_t,
        service_name: *const i8,
        sp: mach_port_t,
    ) -> kern_return_t;
    fn bootstrap_look_up(
        bp: mach_port_t,
        service_name: *const i8,
        sp: *mut mach_port_t,
    ) -> kern_return_t;

    fn mach_port_request_notification(
        task: ipc_space_t,
        name: mach_port_name_t,
        variant: mach_msg_id_t,
        sync: mach_port_mscount_t,
        notify: mach_port_t,
        notifyPoly: mach_msg_type_name_t,
        previous: *mut mach_port_t,
    ) -> kern_return_t;
}

const MACH_NOTIFY_NO_SENDERS: c_int = 0o106;

pub type AncillaryData = OwnedRight;
pub const CONNECTOR_ANCILLARY_DATA_LEN: usize = 2;

#[repr(C)]
pub struct RawIPCConnector {
    pub send: mach_port_t,
    pub recv: mach_port_t,
}

pub type IPCConnectorKey = mach_port_t;

pub struct IPCConnector {
    send: SendRight,
    recv: ReceiveRight,
}

impl IPCConnector {
    pub(crate) fn from_rights(
        send: SendRight,
        recv: ReceiveRight,
    ) -> Result<IPCConnector, IPCError> {
        let connector = IPCConnector { send, recv };
        connector
            .notify_disconnect()
            .map_err(IPCError::CreationFailure)?;
        Ok(connector)
    }

    pub fn from_ancillary(
        ancillary_data: [AncillaryData; CONNECTOR_ANCILLARY_DATA_LEN],
    ) -> Result<IPCConnector, IPCError> {
        let mut iter = ancillary_data.into_iter();
        let OwnedRight::Send(send) = iter.next().unwrap() else {
            return Err(IPCError::InvalidAncillary);
        };
        let OwnedRight::Receive(recv) = iter.next().unwrap() else {
            return Err(IPCError::InvalidAncillary);
        };

        IPCConnector::from_rights(send, recv)
    }

    /// Create a connector from a raw connector structure holding a couple of
    /// send and receive rights.
    ///
    /// # Safety
    ///
    /// The `connector` argument must point to a `RawIPCConnector` object and
    /// the `send` and `recv` fields of this structure must be valid send and
    /// receive rights to a mach port.
    pub unsafe fn from_raw_connector(connector: RawIPCConnector) -> Result<IPCConnector, IPCError> {
        let send = SendRight::from_raw_port(connector.send);
        let recv = ReceiveRight::from_raw_port(connector.recv);
        IPCConnector::from_rights(send, recv)
    }

    pub fn set_process(&mut self, _process: ProcessHandle) {}

    // Send a message when the last send right for this port is dropped
    fn notify_disconnect(&self) -> Result<(), PlatformError> {
        let mut previous = MACH_PORT_NULL;
        let recv = self.recv.as_raw_port();

        // SAFETY: The `recv` right is a valid receive right as it's owned by
        // this connector, the pointer to `notifyPoly` is also valid as it's a
        // reference to the `previous` variable we just declared.
        let rv = unsafe {
            mach_port_request_notification(
                mach_task_self(),
                recv,
                MACH_NOTIFY_NO_SENDERS,
                /* sync */ 0,
                recv,
                MACH_MSG_TYPE_MAKE_SEND_ONCE,
                &mut previous,
            )
        };

        if rv != KERN_SUCCESS {
            Err(PlatformError::RequestNotification(rv))
        } else {
            Ok(())
        }
    }

    // This creates a temporary service that will be used to transfer the port
    // right to the receiving process. The value returned by this function is
    // the name of this service. Note that the service will be spawned in this
    // function and run asynchronously, the function will return as soon as it
    // has been launched, so that the other process is sure to find it.
    //
    // Once the connector's rights are transferred, or if receiving the message
    // from the other process times out, the service is torn down.
    pub fn serialize(self) -> Result<CString, IPCError> {
        let send_right = self.send;
        let recv_right = self.recv;
        let service_receive_right = ReceiveRight::new().map_err(IPCError::Serialize)?;

        const ATTEMPTS: u32 = 5;

        // We pick the service name at random so that it cannot be predicted by
        // a different process. There could be name clashes even though it's
        // unlikely, so try a few times before giving up.

        let mut i = ATTEMPTS;
        loop {
            // The `getrandom` crate documentation states that if a call fails
            // then it's likely that all following calls will fail, so just bail
            // out if we cannot get a random number.
            let random_id =
                getrandom::u64().map_err(|e| IPCError::Serialize(PlatformError::GetRandom(e)))?;
            let name = format!("org.mozilla.crashhelper.{}", random_id);

            // Names longer than 128 bytes are truncated by the kernel, make sure
            // we don't accidentally make one that is too long.
            assert!(name.len() < size_of::<name_t>());

            // SAFETY: We just created this string and it has no interior nuls.
            let cname = unsafe { CString::from_vec_unchecked(name.clone().into_bytes()) };
            // SAFETY: We control all the pointers and rights going into the
            // `bootstrap_register()` call and guarantee that they are valid.
            let rv = unsafe {
                bootstrap_register(
                    bootstrap_port,
                    cname.as_ptr(),
                    service_receive_right.as_raw_port(),
                )
            };

            if rv as u32 != BOOTSTRAP_SUCCESS {
                if i == 0 {
                    return Err(IPCError::Serialize(PlatformError::BootstrapRegister(rv)));
                } else {
                    i -= 1;
                    continue;
                }
            }

            // We won't wait on this thread, its purpose is precisely not to
            // block startup while we launch the crash helper.
            let _ = thread::spawn(move || {
                let msg = match mach_msg_recv(&service_receive_right, 0, 0) {
                    Ok(msg) => msg,
                    Err(err) => {
                        log::error!(
                            "No reply from crash helper, mach_msg_recv() failed with = {err}",
                        );
                        return;
                    }
                };

                let header = msg.header();

                if (header.msgh_bits & MACH_MSGH_BITS_REMOTE_MASK) != MACH_MSG_TYPE_MOVE_SEND {
                    log::error!("Wrong or no send rend right received from the crash helper");
                    return;
                }

                // SAFETY: We just verified that the remote port contains a send right.
                let reply_port = unsafe { SendRight::from_raw_port(header.msgh_remote_port) };
                let mut msg = MachMessageWrapper::for_send(0, 2);
                let descriptors = msg.descriptors_mut();
                descriptors[0] = mach_msg_port_descriptor_t::new(
                    send_right.into_raw_port(),
                    MACH_MSG_TYPE_MOVE_SEND,
                );
                descriptors[1] = mach_msg_port_descriptor_t::new(
                    recv_right.into_raw_port(),
                    MACH_MSG_TYPE_MOVE_RECEIVE,
                );

                if let Err(err) = mach_msg_send(&reply_port, &mut msg) {
                    log::error!(
                            "Could not send right to the crash helper, mach_msg_recv() failed with = {err}",
                        );
                }
            });

            return Ok(cname);
        }
    }

    // Looks up the service we set up in `IPCConnector::deserialize()` and
    // receives the actual port rights of this connector from it.
    pub fn deserialize(string: &CStr) -> Result<IPCConnector, IPCError> {
        let mut service_port = MACH_PORT_NULL;
        let rv = unsafe { bootstrap_look_up(bootstrap_port, string.as_ptr(), &mut service_port) };

        if rv as u32 != BOOTSTRAP_SUCCESS {
            return Err(IPCError::Deserialize(PlatformError::BootstrapLookUp(rv)));
        }

        // SAFETY: This is a valid send right we just obtained from `bootstrap_look_up()`
        let service_port = unsafe { SendRight::from_raw_port(service_port) };
        let reply_port = ReceiveRight::new().map_err(IPCError::Deserialize)?;

        // Send a message that will carry the send right to the temporary port
        // we just created. This will be used by the main process to contact us.
        let mut msg = MachMessageWrapper::for_send(0, 0);
        let header = msg.header_mut();
        header.msgh_bits |= MACH_MSGH_BITS(0, MACH_MSG_TYPE_MAKE_SEND);
        header.msgh_local_port = reply_port.as_raw_port();
        mach_msg_send(&service_port, &mut msg).map_err(IPCError::CreationFailure)?;

        // Wait for the main process to reply with the connector.
        let res = mach_msg_recv(&reply_port, 0, 2).map_err(IPCError::CreationFailure)?;
        let descriptors = res.descriptors();
        veryify_descriptors(descriptors)?;

        // SAFETY: We've just verified that this is a valid send right.
        let send_right = unsafe { SendRight::from_raw_port(descriptors[0].name) };
        // SAFETY: We've just verified that this is a valid receive right.
        let recv_right = unsafe { ReceiveRight::from_raw_port(descriptors[1].name) };
        IPCConnector::from_rights(send_right, recv_right)
    }

    pub fn into_ancillary(self) -> [AncillaryData; CONNECTOR_ANCILLARY_DATA_LEN] {
        [OwnedRight::Send(self.send), OwnedRight::Receive(self.recv)]
    }

    pub fn into_raw_connector(self) -> RawIPCConnector {
        RawIPCConnector {
            send: self.send.into_raw_port(),
            recv: self.recv.into_raw_port(),
        }
    }

    pub fn key(&self) -> IPCConnectorKey {
        self.raw_recv_right()
    }

    // Returns the raw value of the receive right of this connector. The right
    // is owned by the connector and remains so.
    pub(crate) fn raw_recv_right(&self) -> mach_port_t {
        self.recv.as_raw_port()
    }

    pub fn send_message<T>(&self, message: T) -> Result<(), IPCError>
    where
        T: Message,
    {
        let expected_payload_len = message.payload_size();
        let expected_ancillary_len = message.ancillary_data_len();
        self.send(&message.header(), vec![])
            .map_err(IPCError::TransmissionFailure)?;
        let (payload, ancillary_data) = message.into_payload();
        assert!(payload.len() == expected_payload_len);
        assert!(ancillary_data.len() == expected_ancillary_len);
        self.send(&payload, ancillary_data)
            .map_err(IPCError::TransmissionFailure)
    }

    pub fn recv_reply<T>(&self) -> Result<T, IPCError>
    where
        T: Message,
    {
        let header = self.recv_header()?;

        if header.kind != T::kind() {
            return Err(IPCError::UnexpectedMessage(header.kind));
        }

        let (data, ancillary_data) = self.recv(header.size)?;
        T::decode(&data, ancillary_data).map_err(IPCError::from)
    }

    // This is a blocking send operation
    fn send(&self, buff: &[u8], rights: Vec<AncillaryData>) -> Result<(), PlatformError> {
        let mut msg = MachMessageWrapper::for_send(
            buff.len(),
            rights
                .len()
                .try_into()
                .map_err(|_| PlatformError::ValueTooLarge)?,
        );

        // Buffers in Mach messages are always multiples of 4 bytes, hence the
        // need for trimming the destination before we copy into it.
        msg.data_mut()[0..buff.len()].copy_from_slice(buff);

        let descriptors = msg.descriptors_mut();

        for (i, right) in rights.into_iter().enumerate() {
            descriptors[i] = match right {
                OwnedRight::Receive(recv) => mach_msg_port_descriptor_t::new(
                    recv.into_raw_port(),
                    MACH_MSG_TYPE_MOVE_RECEIVE,
                ),
                OwnedRight::Send(send) => {
                    mach_msg_port_descriptor_t::new(send.into_raw_port(), MACH_MSG_TYPE_MOVE_SEND)
                }
            };
        }

        mach_msg_send(&self.send, &mut msg)
    }

    pub(crate) fn recv_header(&self) -> Result<messages::Header, IPCError> {
        let (header, _) = self.recv(messages::HEADER_SIZE)?;
        messages::Header::decode(&header).map_err(IPCError::BadMessage)
    }

    // This is a blocking receive
    pub(crate) fn recv(
        &self,
        expected_size: usize,
    ) -> Result<(Vec<u8>, Vec<AncillaryData>), IPCError> {
        let msg = mach_msg_recv(
            &self.recv,
            expected_size,
            CONNECTOR_ANCILLARY_DATA_LEN as u32,
        )
        .map_err(IPCError::ReceptionFailure)?;

        let data = &msg.data()[0..expected_size];
        let mut ancillary_data = vec![];
        for descriptor in msg.descriptors() {
            let name = descriptor.name;
            let right = match descriptor.disposition as u32 {
                MACH_MSG_TYPE_MOVE_RECEIVE => {
                    // SAFETY: This disposition denotes that this is a valid receive right
                    OwnedRight::Receive(unsafe { ReceiveRight::from_raw_port(name) })
                }
                MACH_MSG_TYPE_MOVE_SEND => {
                    // SAFETY: This disposition denotes that this is a valid send right
                    OwnedRight::Send(unsafe { SendRight::from_raw_port(name) })
                }
                MACH_MSG_TYPE_COPY_SEND => {
                    // SAFETY: This disposition denotes that this is a valid send right
                    OwnedRight::Send(unsafe { SendRight::from_raw_port(name) })
                }
                _ => return Err(IPCError::InvalidAncillary),
            };

            ancillary_data.push(right);
        }

        Ok((Vec::from(data), ancillary_data))
    }
}

fn veryify_descriptors(descriptors: &[mach_msg_port_descriptor_t]) -> Result<(), MessageError> {
    if (descriptors[0].disposition == MACH_MSG_TYPE_MOVE_SEND as u8)
        && (descriptors[1].disposition == MACH_MSG_TYPE_MOVE_RECEIVE as u8)
    {
        Ok(())
    } else {
        Err(MessageError::InvalidData)
    }
}
