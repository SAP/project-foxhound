/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

use thiserror::Error;

use crate::{errors::IPCError, platform::PlatformError, IPCListenerError};

/*****************************************************************************
 * Error definitions                                                         *
 *****************************************************************************/

#[derive(Debug, Error)]
pub enum IPCChannelError {
    #[error("Could not create connector: {0}")]
    Connector(#[from] IPCError),
    #[error("Could not create a listener: {0}")]
    Listener(#[from] IPCListenerError),
    #[error("Could not create an IPC channel: {0}")]
    Channel(#[from] PlatformError),
}

/*****************************************************************************
 * Windows                                                                   *
 *****************************************************************************/

#[cfg(target_os = "windows")]
pub use windows::{IPCChannel, IPCClientChannel};

#[cfg(target_os = "windows")]
pub(crate) mod windows;

/*****************************************************************************
 * Android & Linux                                                           *
 *****************************************************************************/

#[cfg(any(target_os = "android", target_os = "linux"))]
pub use unix::{IPCChannel, IPCClientChannel};

#[cfg(any(target_os = "android", target_os = "linux"))]
pub(crate) mod unix;

/*****************************************************************************
 * macOS.                                                                    *
 *****************************************************************************/

#[cfg(target_os = "macos")]
pub use mach::{IPCChannel, IPCClientChannel};

#[cfg(target_os = "macos")]
pub(crate) mod mach;
