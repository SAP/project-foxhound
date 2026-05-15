/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

use crate::{
    errors::IPCError,
    ipc_listener::IPCListenerError,
    platform::windows::{get_last_error, server_addr, OverlappedOperation, PlatformError},
    IPCConnector, Pid,
};

use std::{
    cell::RefCell,
    ffi::{CStr, CString, OsString},
    os::windows::io::{AsRawHandle, FromRawHandle, OwnedHandle, RawHandle},
    ptr::null_mut,
    rc::Rc,
    str::FromStr,
};
use windows_sys::Win32::{
    Foundation::{HANDLE, INVALID_HANDLE_VALUE, TRUE},
    Security::SECURITY_ATTRIBUTES,
    Storage::FileSystem::{
        FILE_FLAG_FIRST_PIPE_INSTANCE, FILE_FLAG_OVERLAPPED, PIPE_ACCESS_DUPLEX,
    },
    System::Pipes::{
        CreateNamedPipeA, PIPE_READMODE_MESSAGE, PIPE_TYPE_MESSAGE, PIPE_UNLIMITED_INSTANCES,
        PIPE_WAIT,
    },
};

pub struct IPCListener {
    /// The name of the pipe this listener will be bound to
    server_addr: CString,
    /// A named pipe handle listening for incoming connections
    handle: RefCell<Rc<OwnedHandle>>,
    /// Stores the only listen operation that might be pending
    overlapped: Option<OverlappedOperation>,
}

impl IPCListener {
    pub(crate) fn new(server_addr: CString) -> Result<IPCListener, IPCListenerError> {
        let pipe = create_named_pipe(&server_addr, /* first_instance */ true)
            .map_err(IPCListenerError::CreationError)?;

        Ok(IPCListener {
            server_addr,
            handle: RefCell::new(Rc::new(pipe)),
            overlapped: None,
        })
    }

    pub(crate) fn as_raw(&self) -> HANDLE {
        self.handle.borrow().as_raw_handle() as HANDLE
    }

    pub(crate) fn address(&self) -> &CStr {
        &self.server_addr
    }

    pub(crate) fn sched_listen(&self) -> Result<OverlappedOperation, IPCListenerError> {
        OverlappedOperation::listen(&self.handle.borrow()).map_err(IPCListenerError::ListenError)
    }

    pub(crate) fn listen(&mut self) -> Result<(), IPCListenerError> {
        self.overlapped = Some(self.sched_listen()?);
        Ok(())
    }

    pub fn accept(&mut self) -> Result<IPCConnector, IPCListenerError> {
        let overlapped = self
            .overlapped
            .take()
            .expect("Accepting a connection without listening first");
        overlapped.accept().map_err(IPCListenerError::AcceptError)?;
        self.replace_pipe()
    }

    pub(crate) fn replace_pipe(&self) -> Result<IPCConnector, IPCListenerError> {
        let new_pipe = create_named_pipe(&self.server_addr, /* first_instance */ false)
            .map_err(IPCListenerError::AcceptError)?;
        let connected_pipe = self.handle.replace(Rc::new(new_pipe));

        // We can guarantee that there's only one reference to this handle at
        // this point in time.
        Ok(IPCConnector::from_handle(
            Rc::<OwnedHandle>::try_unwrap(connected_pipe).unwrap(),
        )?)
    }

    /// Serialize this listener into a string that can be passed on the
    /// command-line to a child process. This only works for newly
    /// created listeners because they are explicitly created as inheritable.
    pub fn serialize(&self) -> Result<OsString, IPCListenerError> {
        let raw_handle = self.handle.borrow().as_raw_handle() as usize;
        OsString::from_str(raw_handle.to_string().as_ref())
            .map_err(|_e| IPCListenerError::Serialize(PlatformError::InvalidString))
    }

    /// Deserialize a listener from an argument passed on the command-line.
    /// The resulting listener is ready to accept new connections.
    pub fn deserialize(string: &CStr, pid: Pid) -> Result<IPCListener, IPCListenerError> {
        let server_addr = server_addr(pid);
        let string = string
            .to_str()
            .map_err(|_e| IPCError::Deserialize(PlatformError::InvalidString))?;
        let handle = usize::from_str(string)
            .map_err(|_e| IPCError::Deserialize(PlatformError::ParseHandle))?;
        // SAFETY: This is a handle we passed in ourselves.
        let handle = unsafe { OwnedHandle::from_raw_handle(handle as RawHandle) };

        Ok(IPCListener {
            server_addr,
            handle: RefCell::new(Rc::new(handle)),
            overlapped: None,
        })
    }
}

// SAFETY: The listener can be transferred across threads in spite of the
// raw pointer contained in the OVERLAPPED structure because it is only
// used internally and never visible externally.
unsafe impl Send for IPCListener {}

fn create_named_pipe(
    server_addr: &CStr,
    first_instance: bool,
) -> Result<OwnedHandle, PlatformError> {
    const PIPE_BUFFER_SIZE: u32 = 4096;

    let open_mode = PIPE_ACCESS_DUPLEX
        | FILE_FLAG_OVERLAPPED
        | if first_instance {
            FILE_FLAG_FIRST_PIPE_INSTANCE
        } else {
            0
        };

    let security_attributes = SECURITY_ATTRIBUTES {
        nLength: size_of::<SECURITY_ATTRIBUTES>() as u32,
        lpSecurityDescriptor: null_mut(),
        bInheritHandle: TRUE,
    };

    // SAFETY: We pass a pointer to the server name which we guarantee to be
    // valid, and null for all the other pointer arguments.
    let pipe = unsafe {
        CreateNamedPipeA(
            server_addr.as_ptr() as *const _,
            open_mode,
            PIPE_TYPE_MESSAGE | PIPE_READMODE_MESSAGE | PIPE_WAIT,
            PIPE_UNLIMITED_INSTANCES,
            PIPE_BUFFER_SIZE,
            PIPE_BUFFER_SIZE,
            0, // nDefaultTimeout, default is 50ms
            &security_attributes,
        )
    };

    if pipe == INVALID_HANDLE_VALUE {
        return Err(PlatformError::CreatePipeFailure(get_last_error()));
    }

    // SAFETY: We just verified that the handle is valid.
    Ok(unsafe { OwnedHandle::from_raw_handle(pipe as RawHandle) })
}
