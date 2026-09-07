/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

use std::rc::Rc;

use crate::messages::Header;

pub enum IPCEvent {
    Connect(Rc<IPCConnector>),
    Message(IPCConnectorKey, Header, Vec<u8>, Vec<AncillaryData>),
    Disconnect(IPCConnectorKey),
}

/*****************************************************************************
 * Windows                                                                   *
 *****************************************************************************/

#[cfg(target_os = "windows")]
pub use windows::{
    AncillaryData, IPCConnector, IPCConnectorKey, RawIPCConnector, CONNECTOR_ANCILLARY_DATA_LEN,
};

#[cfg(target_os = "windows")]
pub(crate) mod windows;

/*****************************************************************************
 * Android & Linux                                                           *
 *****************************************************************************/

#[cfg(any(target_os = "android", target_os = "linux"))]
pub use unix::{
    AncillaryData, IPCConnector, IPCConnectorKey, RawIPCConnector, CONNECTOR_ANCILLARY_DATA_LEN,
};

#[cfg(any(target_os = "android", target_os = "linux"))]
pub(crate) mod unix;

/*****************************************************************************
 * iOS & macOS                                                               *
 *****************************************************************************/

#[cfg(any(target_os = "ios", target_os = "macos"))]
pub use mach::{
    AncillaryData, IPCConnector, IPCConnectorKey, RawIPCConnector, CONNECTOR_ANCILLARY_DATA_LEN,
};

#[cfg(any(target_os = "ios", target_os = "macos"))]
pub(crate) mod mach;
