/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

use thiserror::Error;

use crate::{errors::IPCError, messages::MessageError, platform::PlatformError, IPCListenerError};

/*****************************************************************************
 * Error definitions                                                         *
 *****************************************************************************/

#[derive(Debug, Error)]
pub enum IPCQueueError {
    #[error("Could not create queue: {0}")]
    CreationFailure(PlatformError),
    #[error("Could not register with queue: {0}")]
    RegistrationFailure(PlatformError),
    #[error("Could not wait for events: {0}")]
    WaitError(PlatformError),
    #[error("Underlying IPC connector error: {0}")]
    IPCError(#[from] IPCError),
    #[error("Underlying IPC listener error: {0}")]
    IPCListenerError(#[from] IPCListenerError),
    #[error("Underlying message error: {0}")]
    MessageError(#[from] MessageError),
}

/*****************************************************************************
 * Windows                                                                   *
 *****************************************************************************/

#[cfg(target_os = "windows")]
pub use windows::IPCQueue;

#[cfg(target_os = "windows")]
pub(crate) mod windows;

/*****************************************************************************
 * Android, macOS & Linux                                                    *
 *****************************************************************************/

#[cfg(any(target_os = "android", target_os = "linux"))]
pub use unix::IPCQueue;

#[cfg(any(target_os = "android", target_os = "linux"))]
pub(crate) mod unix;

/*****************************************************************************
 * macOS & iOS                                                               *
 *****************************************************************************/

#[cfg(any(target_os = "ios", target_os = "macos"))]
pub use mach::IPCQueue;

#[cfg(any(target_os = "ios", target_os = "macos"))]
pub(crate) mod mach;
