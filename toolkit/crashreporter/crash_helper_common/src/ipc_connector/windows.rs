/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

use crate::{
    errors::IPCError,
    messages::{self, Message, HEADER_SIZE},
    platform::{
        windows::{create_manual_reset_event, get_last_error, OverlappedOperation},
        PlatformError,
    },
    IO_TIMEOUT,
};

use std::{
    ffi::{CStr, OsString},
    os::windows::io::{
        AsHandle, AsRawHandle, FromRawHandle, IntoRawHandle, OwnedHandle, RawHandle,
    },
    ptr::null_mut,
    rc::Rc,
    str::FromStr,
    time::{Duration, Instant},
};
use windows_sys::Win32::{
    Foundation::{
        DuplicateHandle, DUPLICATE_CLOSE_SOURCE, DUPLICATE_SAME_ACCESS, ERROR_FILE_NOT_FOUND,
        ERROR_PIPE_BUSY, FALSE, HANDLE, INVALID_HANDLE_VALUE,
    },
    Security::SECURITY_ATTRIBUTES,
    Storage::FileSystem::{
        CreateFileA, FILE_FLAG_OVERLAPPED, FILE_READ_DATA, FILE_SHARE_READ, FILE_SHARE_WRITE,
        FILE_WRITE_ATTRIBUTES, FILE_WRITE_DATA, OPEN_EXISTING,
    },
    System::{
        Pipes::{SetNamedPipeHandleState, WaitNamedPipeA, PIPE_READMODE_MESSAGE},
        Threading::GetCurrentProcess,
    },
};

pub type AncillaryData = OwnedHandle;

pub const CONNECTOR_ANCILLARY_DATA_LEN: usize = 1;

const INVALID_ANCILLARY_DATA: HANDLE = 0;
const HANDLE_SIZE: usize = size_of::<HANDLE>();

// We encode handles at the beginning of every transmitted message. This
// function extracts the handle (if present) and returns it together with
// the rest of the buffer.
fn extract_buffer_and_handle(buffer: Vec<u8>) -> Result<(Vec<u8>, Vec<OwnedHandle>), IPCError> {
    let handle_bytes = &buffer[0..HANDLE_SIZE];
    let data = &buffer[HANDLE_SIZE..];
    let handle_bytes: Result<[u8; HANDLE_SIZE], _> = handle_bytes.try_into();
    let Ok(handle_bytes) = handle_bytes else {
        return Err(IPCError::InvalidAncillary);
    };
    let handle = match HANDLE::from_ne_bytes(handle_bytes) {
        INVALID_ANCILLARY_DATA => vec![],
        handle => vec![unsafe { OwnedHandle::from_raw_handle(handle as RawHandle) }],
    };

    Ok((data.to_vec(), handle))
}

pub type IPCConnectorKey = usize;

#[repr(C)]
pub struct RawIPCConnector {
    pub handle: HANDLE,
}

pub struct IPCConnector {
    /// A connected pipe handle
    handle: Rc<OwnedHandle>,
    /// A handle to an event which will be used for overlapped I/O on the pipe
    event: OwnedHandle,
    /// The process at the other end of the pipe, this is needed to send
    /// ancillary data and a send operation will fail if not set.
    process: Option<OwnedHandle>,
}

impl IPCConnector {
    pub(crate) fn from_handle(handle: OwnedHandle) -> Result<IPCConnector, IPCError> {
        let event = create_manual_reset_event().map_err(IPCError::CreationFailure)?;

        Ok(IPCConnector {
            handle: Rc::new(handle),
            event,
            process: None,
        })
    }

    /// Create a connector from a raw handle.
    ///
    /// # Safety
    ///
    /// The `ancillary_data` argument must be a valid HANDLE representing the
    /// endpoint of a named pipe.
    unsafe fn from_raw_handle(handle: HANDLE) -> Result<IPCConnector, IPCError> {
        IPCConnector::from_handle(OwnedHandle::from_raw_handle(handle as RawHandle))
    }

    pub fn from_ancillary(
        ancillary_data: [AncillaryData; CONNECTOR_ANCILLARY_DATA_LEN],
    ) -> Result<IPCConnector, IPCError> {
        IPCConnector::from_handle(ancillary_data.into_iter().next().unwrap())
    }

    /// Create a connector from a raw connector structure holding a HANDLE.
    ///
    /// # Safety
    ///
    /// The `connector` argument must point to a `RawIPCConnector` object and
    /// the `handle` field of this structure must be a valid HANDLE representing
    /// a connected pipe.
    pub unsafe fn from_raw_connector(connector: RawIPCConnector) -> Result<IPCConnector, IPCError> {
        IPCConnector::from_raw_handle(connector.handle)
    }

    pub fn set_process(&mut self, process: OwnedHandle) {
        self.process = Some(process);
    }

    pub(crate) fn as_raw(&self) -> HANDLE {
        self.handle.as_raw_handle() as HANDLE
    }

    pub fn key(&self) -> IPCConnectorKey {
        self.handle.as_raw_handle() as IPCConnectorKey
    }

    pub fn connect(server_addr: &CStr) -> Result<IPCConnector, IPCError> {
        let now = Instant::now();
        let timeout = Duration::from_millis(IO_TIMEOUT.into());
        let mut pipe;
        loop {
            // Connectors must not be inherited
            let security_attributes = SECURITY_ATTRIBUTES {
                nLength: size_of::<SECURITY_ATTRIBUTES>() as u32,
                lpSecurityDescriptor: null_mut(),
                bInheritHandle: FALSE,
            };

            // SAFETY: The `server_addr` pointer is guaranteed to be valid,
            // all other pointer arguments are null.
            pipe = unsafe {
                CreateFileA(
                    server_addr.as_ptr() as *const _,
                    FILE_READ_DATA | FILE_WRITE_DATA | FILE_WRITE_ATTRIBUTES,
                    FILE_SHARE_READ | FILE_SHARE_WRITE,
                    &security_attributes,
                    OPEN_EXISTING,
                    FILE_FLAG_OVERLAPPED,
                    /* hTemplateFile */ 0 as HANDLE,
                )
            };

            if pipe != INVALID_HANDLE_VALUE {
                break;
            }

            let elapsed = now.elapsed();

            if elapsed >= timeout {
                return Err(IPCError::Timeout);
            }

            let error = get_last_error();

            // The pipe might have not been created yet or it might be busy.
            if (error == ERROR_FILE_NOT_FOUND) || (error == ERROR_PIPE_BUSY) {
                // SAFETY: The `server_addr` pointer is guaranteed to be valid.
                let res = unsafe {
                    WaitNamedPipeA(
                        server_addr.as_ptr() as *const _,
                        (timeout - elapsed).as_millis() as u32,
                    )
                };
                let error = get_last_error();

                // If the pipe hasn't been created yet loop over and try again
                if (res == FALSE) && (error != ERROR_FILE_NOT_FOUND) {
                    return Err(IPCError::ConnectionFailure(
                        PlatformError::WaitNamedPipeFailed(error),
                    ));
                }
            } else {
                return Err(IPCError::ConnectionFailure(
                    PlatformError::CreatePipeFailure(error),
                ));
            }
        }

        // Change to message-read mode
        let pipe_mode: u32 = PIPE_READMODE_MESSAGE;
        // SAFETY: We pass a pointer to a local variable which guarantees it
        // is valid, we use null for all the other pointer parameters.
        let res = unsafe {
            SetNamedPipeHandleState(
                pipe,
                &pipe_mode,
                /* lpMaxCollectionCount */ null_mut(),
                /* lpCollectDataTimeout */ null_mut(),
            )
        };
        if res == FALSE {
            return Err(IPCError::ConnectionFailure(
                PlatformError::SetNamedPipeHandleState(get_last_error()),
            ));
        }

        // SAFETY: We've verified above that the pipe handle is valid
        unsafe { IPCConnector::from_raw_handle(pipe) }
    }

    /// Serialize this connector into a string that can be passed on the
    /// command-line to a child process. This only works for newly
    /// created connectors because they are explicitly created as inheritable.
    pub fn serialize(&self) -> Result<OsString, IPCError> {
        let raw_handle = self.handle.as_raw_handle() as usize;
        OsString::from_str(raw_handle.to_string().as_ref())
            .map_err(|_e| IPCError::Serialize(PlatformError::InvalidString))
    }

    /// Deserialize a connector from an argument passed on the command-line.
    pub fn deserialize(string: &CStr) -> Result<IPCConnector, IPCError> {
        let string = string
            .to_str()
            .map_err(|_e| IPCError::Deserialize(PlatformError::ParseHandle))?;
        let handle = usize::from_str(string)
            .map_err(|_e| IPCError::Deserialize(PlatformError::ParseHandle))?;

        // SAFETY: This is a handle we passed in ourselves.
        unsafe { IPCConnector::from_raw_handle(handle as HANDLE) }
    }

    pub fn into_ancillary(self) -> [AncillaryData; CONNECTOR_ANCILLARY_DATA_LEN] {
        let handle =
            Rc::try_unwrap(self.handle).expect("Multiple references to the underlying handle");
        [handle]
    }

    pub fn into_raw_connector(self) -> RawIPCConnector {
        let handle =
            Rc::try_unwrap(self.handle).expect("Multiple references to the underlying handle");
        let handle = handle.into_raw_handle() as HANDLE;
        RawIPCConnector { handle }
    }

    pub fn send_message<T>(&self, message: T) -> Result<(), IPCError>
    where
        T: Message,
    {
        self.send_message_internal(message)
            .map_err(IPCError::TransmissionFailure)
    }

    fn send_message_internal<T>(&self, message: T) -> Result<(), PlatformError>
    where
        T: Message,
    {
        let expected_payload_len = message.payload_size();
        let expected_ancillary_data_len = message.ancillary_data_len();
        let header = message.header();
        let (payload, mut ancillary_data) = message.into_payload();
        assert!(payload.len() == expected_payload_len);
        assert!(ancillary_data.len() == expected_ancillary_data_len);

        // Send the message header
        OverlappedOperation::send(&self.handle, self.event.as_handle(), header)?;

        // Send the message payload plus the optional handles
        let handle = if let Some(handle) = ancillary_data.pop() {
            self.clone_handle(handle)?
        } else {
            INVALID_ANCILLARY_DATA
        };

        let mut buffer = Vec::<u8>::with_capacity(HANDLE_SIZE + payload.len());
        buffer.extend(handle.to_ne_bytes());
        buffer.extend(payload);

        OverlappedOperation::send(&self.handle, self.event.as_handle(), buffer)
    }

    pub fn recv_reply<T>(&self) -> Result<T, IPCError>
    where
        T: Message,
    {
        let header = self
            .recv_buffer(HEADER_SIZE)
            .map_err(IPCError::ReceptionFailure)?;
        let header = messages::Header::decode(&header).map_err(IPCError::BadMessage)?;

        if header.kind != T::kind() {
            return Err(IPCError::UnexpectedMessage(header.kind));
        }

        let (buffer, handle) = self.recv(header.size)?;
        T::decode(&buffer, handle).map_err(IPCError::from)
    }

    pub(crate) fn sched_recv_header(&self) -> Result<OverlappedOperation, IPCError> {
        OverlappedOperation::sched_recv(&self.handle, HEADER_SIZE)
            .map_err(IPCError::ReceptionFailure)
    }

    pub(crate) fn recv(
        &self,
        expected_size: usize,
    ) -> Result<(Vec<u8>, Vec<AncillaryData>), IPCError> {
        let buffer = self
            .recv_buffer(HANDLE_SIZE + expected_size)
            .map_err(IPCError::ReceptionFailure)?;
        extract_buffer_and_handle(buffer)
    }

    fn recv_buffer(&self, expected_size: usize) -> Result<Vec<u8>, PlatformError> {
        OverlappedOperation::recv(&self.handle, self.event.as_handle(), expected_size)
    }

    /// Clone a handle in the destination process, this is required to
    /// transfer handles over this connector. Note that this consumes the
    /// incoming handle because we want it to be closed after it's been cloned
    /// over to the other process.
    fn clone_handle(&self, handle: OwnedHandle) -> Result<HANDLE, PlatformError> {
        let Some(dst_process) = self.process.as_ref() else {
            return Err(PlatformError::MissingProcessHandle);
        };
        let mut dst_handle: HANDLE = INVALID_ANCILLARY_DATA;
        let res = unsafe {
            DuplicateHandle(
                GetCurrentProcess(),
                handle.into_raw_handle() as HANDLE,
                dst_process.as_raw_handle() as HANDLE,
                &mut dst_handle,
                /* dwDesiredAccess */ 0,
                /* bInheritHandle */ FALSE,
                DUPLICATE_CLOSE_SOURCE | DUPLICATE_SAME_ACCESS,
            )
        };

        if res == 0 {
            return Err(PlatformError::DuplicateHandleFailed(get_last_error()));
        }

        Ok(dst_handle)
    }
}

// SAFETY: The connector can be transferred across threads in spite of the raw
// pointer contained in the OVERLAPPED structure because it is only used
// internally and never visible externally.
unsafe impl Send for IPCConnector {}
