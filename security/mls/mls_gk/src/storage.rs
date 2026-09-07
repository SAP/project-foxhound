/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use nsstring::nsACString;
use std::fs;
use std::io;
use std::io::Write;

pub fn get_storage_path(storage_prefix: &nsACString) -> String {
    format!("{storage_prefix}.sqlite.enc")
}

pub fn get_key_path(storage_prefix: &nsACString) -> String {
    format!("{storage_prefix}.key")
}

/// Read an existing storage key from disk.
///
/// Returns `Ok(None)` if the key file does not exist, `Ok(Some(key))` if it
/// exists and is valid, and `Err(_)` if it exists but cannot be read or
/// decoded. Callers MUST distinguish these cases: a missing key is recoverable
/// only when there is no encrypted data left to access.
pub fn read_storage_key(key_path: &str) -> io::Result<Option<[u8; 32]>> {
    let key_hex = match fs::read_to_string(key_path) {
        Ok(s) => s,
        Err(e) if e.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(e) => return Err(e),
    };
    let bytes = hex::decode(&key_hex).map_err(io::Error::other)?;
    let key: [u8; 32] = bytes[..].try_into().map_err(io::Error::other)?;
    Ok(Some(key))
}

/// Generate a fresh storage key and persist it to `key_path`.
///
/// Fails if the file already exists, to prevent silently overwriting a key
/// that protects existing encrypted data.
pub fn generate_storage_key(key_path: &str) -> io::Result<[u8; 32]> {
    nss_rs::init().map_err(|e| io::Error::other(e.to_string()))?;
    let key: [u8; 32] = nss_rs::p11::random();
    let mut file = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(key_path)?;
    file.write_all(hex::encode(key).as_bytes())?;
    Ok(key)
}
