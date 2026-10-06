/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

use thiserror::Error;

use crate::{
    messages::{self, MessageError},
    platform::PlatformError,
};

#[derive(Debug, Error)]
pub enum IPCError {
    #[error("Message error")]
    BadMessage(#[from] MessageError),
    #[error("Could not connect to the server: {0}")]
    ConnectionFailure(PlatformError),
    #[error("Failed to create a connector: {0}")]
    CreationFailure(PlatformError),
    #[error("Failed to deserialize connector: {0}")]
    Deserialize(PlatformError),
    #[error("Invalid ancillary data was provided")]
    InvalidAncillary,
    #[error("Could not receive data: {0}")]
    ReceptionFailure(PlatformError),
    #[error("Could not serialize connector for use in another process: {0}")]
    Serialize(PlatformError),
    #[error("An operation timed out")]
    Timeout,
    #[error("Could not send data: {0}")]
    TransmissionFailure(PlatformError),
    #[error("Unexpected message of kind: {0:?}")]
    UnexpectedMessage(messages::Kind),
}
