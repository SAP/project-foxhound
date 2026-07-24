/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

use nix::{
    errno::Errno,
    fcntl::{
        fcntl,
        FcntlArg::{F_GETFL, F_SETFD, F_SETFL},
        FdFlag, OFlag,
    },
    sys::socket::{socketpair, AddressFamily, SockFlag, SockType},
};
use std::{
    ffi::NulError,
    os::fd::{BorrowedFd, OwnedFd},
};
use thiserror::Error;

pub type ProcessHandle = ();

#[derive(Error, Debug)]
pub enum PlatformError {
    #[error("A C string contained an interior NUL character")]
    InteriorNul(#[from] NulError),
    #[error("Could not parse file descriptor")]
    ParseFileDescriptor,
    #[error("poll() call failed with error: {0}")]
    PollFailure(Errno),
    #[error("Could not set socket in non-blocking mode: {0}")]
    SocketNonBlockError(Errno),
    #[error("Could not flag socket as close-after-exec: {0}")]
    SocketCloexecError(Errno),
    #[error("Could not create a socket pair: {0}")]
    SocketpairFailure(Errno),
    #[error("sendmsg() call failed with error: {0}")]
    SendFailure(Errno),
    #[error("Sending {expected} bytes failed, only {sent} bytes sent")]
    SendTooShort { expected: usize, sent: usize },
    #[error("recvmsg() call failed with error: {0}")]
    ReceiveFailure(Errno),
    #[error("Missing SCM credentials")]
    ReceiveMissingCredentials,
    #[error("Receiving {expected} bytes failed, only {received} bytes received")]
    ReceiveTooShort { expected: usize, received: usize },
}

pub(crate) fn unix_socketpair() -> Result<(OwnedFd, OwnedFd), PlatformError> {
    socketpair(
        AddressFamily::Unix,
        SockType::SeqPacket,
        None,
        SockFlag::empty(),
    )
    .map_err(PlatformError::SocketpairFailure)
}

pub(crate) fn set_socket_default_flags(socket: BorrowedFd) -> Result<(), PlatformError> {
    // All our sockets are in non-blocking mode.
    let flags = OFlag::from_bits_retain(
        fcntl(socket, F_GETFL).map_err(PlatformError::SocketNonBlockError)?,
    );
    fcntl(socket, F_SETFL(flags.union(OFlag::O_NONBLOCK)))
        .map(|_res| ())
        .map_err(PlatformError::SocketNonBlockError)
}

pub(crate) fn set_socket_cloexec(socket: BorrowedFd) -> Result<(), PlatformError> {
    fcntl(socket, F_SETFD(FdFlag::FD_CLOEXEC))
        .map(|_res| ())
        .map_err(PlatformError::SocketCloexecError)
}
