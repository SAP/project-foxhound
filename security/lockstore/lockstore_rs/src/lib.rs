/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

pub mod crypto;
mod datastore;
mod keystore;
mod pbkdf2;
mod utils;

pub use crypto::CipherSuite;
pub use crypto::DEFAULT_CIPHER_SUITE;
pub use datastore::LockstoreDatastore;
pub use keystore::{ConnectionHandle, Keystore};
pub use utils::{bytes_to_value, value_to_bytes};

use kvstore::{DatabaseError, StoreError};
use nss_rs::Error as NssError;
use serde::{Deserialize, Serialize};
use thiserror::Error;

pub const KEYSTORE_FILENAME: &str = "lockstore.keys.sqlite";
pub const DATASTORE_FILENAME_PREFIX: &str = "lockstore.data.";
pub const DATASTORE_FILENAME_SUFFIX: &str = ".sqlite";

pub fn datastore_filename(collection_name: &str) -> String {
    format!(
        "{}{}{}",
        DATASTORE_FILENAME_PREFIX, collection_name, DATASTORE_FILENAME_SUFFIX
    )
}

#[derive(Error, Debug)]
pub enum LockstoreError {
    #[error("Store error: {0}")]
    Store(#[from] StoreError),
    #[error("Database error: {0}")]
    Database(#[from] DatabaseError),
    #[error("Serialization error: {0}")]
    Serialization(String),
    #[error("Key not found: {0}")]
    NotFound(String),
    #[error("Encryption error: {0}")]
    Encryption(String),
    #[error("Decryption error: {0}")]
    Decryption(String),
    #[error("Invalid configuration: {0}")]
    InvalidConfiguration(String),
    #[error("DEK is not extractable: {0}")]
    NotExtractable(String),
    #[error("Authentication cancelled")]
    AuthenticationCancelled,
    #[error("Authentication failed")]
    AuthenticationFailed,
    #[error("Token error: {0}")]
    TokenError(String),
    #[error("Invalid kek_ref: {0}")]
    InvalidKekRef(String),
    #[error("NSS initialization failed: {0}")]
    NssInitialization(String),
    #[error("Password KEK is locked")]
    Locked,
    #[error("Password is incorrect")]
    WrongPassword,
    #[error("Password KEK is not initialized")]
    NotInitialized,
    #[error("Locking failure: {0}")]
    LockingFailure(String),
}

impl From<serde_json::Error> for LockstoreError {
    fn from(err: serde_json::Error) -> Self {
        LockstoreError::Serialization(err.to_string())
    }
}

impl From<NssError> for LockstoreError {
    fn from(err: NssError) -> Self {
        LockstoreError::Encryption(err.to_string())
    }
}

pub const KEK_REF_PREFIX: &str = "lockstore::kek::";
/// Prefix for kek_refs that hold raw software AES key bytes. The suffix
/// is a base64url-encoded random ID minted at `createKek` time, so a
/// profile can host many independent local KEKs.
pub const KEK_REF_LOCAL_PREFIX: &str = "lockstore::kek::local:";
/// Prefix for kek_refs that resolve via a PBKDF2-wrapped password. Each
/// kek_ref carries an independent salt + iteration count + wrapped KEK;
/// a profile can host many independent password KEKs.
pub const KEK_REF_PASSWORD_PREFIX: &str = "lockstore::kek::password:";
/// Prefix for kek_refs that resolve via a PKCS#11 token. The suffix is
/// a base64url-encoded random ID minted at `createKek` time, so a
/// single token can host many independent Lockstore KEKs.
pub const KEK_REF_PKCS11_PREFIX: &str = "lockstore::kek::pkcs11:";

/// The kind of KEK identified by a `kek_ref`. Every `KekType` follows the
/// same multi-instance shape: each KEK is one row at
/// `lockstore::kek::<type>:<base64url(random_id)>`, and there are no
/// canonical singletons.
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum KekType {
    #[default]
    #[serde(rename = "local")]
    LocalKey,
    #[serde(rename = "pkcs11")]
    Pkcs11Token,
    #[serde(rename = "password")]
    Password,
}

impl KekType {
    pub fn as_str(&self) -> &str {
        match self {
            KekType::LocalKey => "local",
            KekType::Pkcs11Token => "pkcs11",
            KekType::Password => "password",
        }
    }

    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "local" => Some(KekType::LocalKey),
            "pkcs11" => Some(KekType::Pkcs11Token),
            "password" => Some(KekType::Password),
            _ => None,
        }
    }

    pub fn from_kek_ref(kek_ref: &str) -> Result<Self, LockstoreError> {
        if kek_ref.starts_with(KEK_REF_LOCAL_PREFIX) {
            Ok(KekType::LocalKey)
        } else if kek_ref.starts_with(KEK_REF_PASSWORD_PREFIX) {
            Ok(KekType::Password)
        } else if kek_ref.starts_with(KEK_REF_PKCS11_PREFIX) {
            Ok(KekType::Pkcs11Token)
        } else {
            Err(LockstoreError::InvalidKekRef(kek_ref.to_string()))
        }
    }
}

/// Persistent record for a software-only LocalKey. Stored at row
/// `kek_ref` in `lockstore.keys.sqlite` as JSON.
///
/// The KEK is a freshly-generated AES-256 key stored verbatim in
/// `kek_bytes`. LocalKey has no auth mechanism — there's nothing to
/// "unlock" — so the bytes live plaintext in the row. Confidentiality
/// at rest is provided by the underlying SQLite encryption layer; if
/// the keystore file is exfiltrated without that layer's key, the
/// bytes here are still recoverable only with the SQLite key.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalKekRecord {
    /// Raw AES-256 KEK bytes (32 bytes for the default cipher suite).
    pub kek_bytes: Vec<u8>,
}

/// Persistent record for a password-protected KEK. Stored at row
/// `kek_ref` in `lockstore.keys.sqlite` as JSON.
///
/// The KEK is a freshly-generated AES-256 software key whose plaintext
/// is never persisted. The on-disk `ciphertext` is the output of
/// `AEAD(AES-GCM, KEY = PBKDF2(password, salt, iterations), PLAINTEXT = kek_plaintext)`
/// produced by `crypto::encrypt_with_key`. AEAD tag verification on
/// unwrap doubles as the wrong-password check: a tag failure means the
/// supplied password did not yield the original wrapping key.
///
/// Each password kek_ref carries an independent salt and iteration
/// count, so a profile can host any number of password KEKs (e.g. one
/// per user, or per security boundary) with no shared state.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PasswordKekRecord {
    /// AES-GCM ciphertext of the software KEK, self-describing
    /// (`[cipher_suite_id || nonce || ct+tag]`).
    pub ciphertext: Vec<u8>,
    /// PBKDF2 salt. 16 bytes per `pbkdf2::PBKDF2_SALT_SIZE`.
    pub salt: Vec<u8>,
    /// PBKDF2 iteration count active when this record was minted.
    /// Persisted so a future hardening pass can rotate the global
    /// default without invalidating existing records.
    pub iterations: u32,
    /// Cipher suite used for the AES-GCM wrap. Persisted alongside
    /// the ciphertext so unwrap can pick the matching algorithm even
    /// after the global default changes.
    pub cipher_suite: CipherSuite,
}

/// Persistent record for a PKCS#11-backed KEK. Stored at row `kek_ref`
/// in `lockstore.keys.sqlite` as JSON.
///
/// The KEK is a freshly-generated AES-256 software key whose plaintext
/// is never persisted. The on-disk `ciphertext` is the output of
/// `AEAD(AES-GCM, KEY = wrapping_key, PLAINTEXT = kek_plaintext)`
/// produced by `crypto::encrypt_with_symkey`, where `wrapping_key` is
/// a long-lived AES key resident on the PKCS#11 token (identified by
/// `wrapping_key_nickname`). Recovery therefore requires the
/// authenticated token slot.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pkcs11KekRecord {
    /// AES-GCM ciphertext of the software KEK, self-describing
    /// (`[cipher_suite_id || nonce || ct+tag]`).
    pub ciphertext: Vec<u8>,
    /// PKCS#11 URI naming the slot/token that holds the wrapping key.
    pub pkcs11_uri: String,
    /// Nickname (CKA_LABEL) under which the wrapping key is stored on
    /// the token. A fixed per-token nickname is used today, but the
    /// record persists the name explicitly so a future migration can
    /// rotate it without invalidating existing records.
    pub wrapping_key_nickname: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredValue {
    pub data: Vec<u8>,
    pub timestamp: u64,
}
