/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

use thiserror::Error;

use crate::{errors::IPCError, platform::PlatformError};

/*****************************************************************************
 * Error definitions                                                         *
 *****************************************************************************/

#[derive(Debug, Error)]
pub enum IPCListenerError {
    #[error("Could not accept incoming connection: {0}")]
    AcceptError(PlatformError),
    #[error("Issue with an underlying connector: {0}")]
    ConnectorError(#[from] IPCError),
    #[error("Could not create listener: {0}")]
    CreationError(PlatformError),
    #[error("Could not deserialize a listener: {0}")]
    Deserialize(PlatformError),
    #[error("Could not listen for incoming connections: {0}")]
    ListenError(PlatformError),
    #[error("Could not serialize listener for use in another process: {0}")]
    Serialize(PlatformError),
}

/*****************************************************************************
 * Windows                                                                   *
 *****************************************************************************/

#[cfg(target_os = "windows")]
pub use windows::IPCListener;

#[cfg(target_os = "windows")]
pub(crate) mod windows;

/*****************************************************************************
 * Android, macOS & Linux                                                    *
 *****************************************************************************/

#[cfg(any(target_os = "android", target_os = "linux", target_os = "macos"))]
pub use unix::IPCListener;

#[cfg(any(target_os = "android", target_os = "linux", target_os = "macos"))]
pub(crate) mod unix;
