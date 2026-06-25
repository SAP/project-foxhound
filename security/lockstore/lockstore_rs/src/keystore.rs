/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

//! # On-disk layout
//!
//! All keystore rows live in `lockstore.keys.sqlite`, in the logical
//! kvstore database `"lockstore.keys"`. Two row families:
//!
//! - **DEK metadata** at row key `"lockstore::dek::<collection>"`.
//!   Value is a JSON `DekMetadata` (via `utils::bytes_to_value`):
//!
//!   ```text
//!   {
//!     "wrapped_deks": [
//!       { "kek_type": "...", "kek_ref": "...", "wrapped_dek": [<bytes>...] },
//!       ...
//!     ],
//!     "cipher_suite": "...",
//!     "extractable": <bool>
//!   }
//!   ```
//!
//! - **KEK records** at row key `"lockstore::kek::<type>:<base64url(random_id)>"`.
//!   Value is a JSON record specific to the `KekType`:
//!   [`LocalKekRecord`](crate::LocalKekRecord) for raw AES bytes,
//!   [`PasswordKekRecord`](crate::PasswordKekRecord) for PBKDF2-wrapped
//!   KEKs, [`Pkcs11KekRecord`](crate::Pkcs11KekRecord) for hardware-
//!   wrapped KEKs.
//!
//! # Threat model for the on-disk layout
//!
//! The `wrapped_dek` bytes are the only piece encrypted at rest (under
//! the KEK named by `kek_ref`). Every structural field — including the
//! `kek_ref` strings — is plaintext on disk, so a plain `sqlite3` dump
//! of `lockstore.keys.sqlite` is enough to enumerate which KEKs wrap
//! each collection. The `nsILockstore.listKeks` API surfaces this same
//! data programmatically; the on-disk format is documented here as a
//! stable contract for offline tooling.

use crate::crypto::{self, CipherSuite, DEFAULT_CIPHER_SUITE};
use crate::pbkdf2;
use crate::utils;
use crate::{
    KekType, LocalKekRecord, LockstoreError, PasswordKekRecord, Pkcs11KekRecord,
    KEK_REF_LOCAL_PREFIX, KEK_REF_PASSWORD_PREFIX, KEK_REF_PKCS11_PREFIX,
};

use base64::Engine;
use kvstore::{Database, GetOptions, Key, Store, StorePath};
use nss_rs::aead::Aead;
use nss_rs::p11;
use nss_rs::SymKey;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use zeroize::Zeroize;

/// Logical kvstore database name under which keystore rows (DEK
/// metadata, KEK records) live within `lockstore.keys.sqlite`. Single
/// physical SQLite file, multiple logical databases keyed by this name.
const DB_NAME: &str = "lockstore.keys";
const DEK_PREFIX: &str = "lockstore::dek::";

/// CKA_LABEL under which Lockstore's per-token AES wrapping key lives.
/// One wrapping key per token slot wraps every PKCS#11-backed
/// Lockstore KEK on that slot; persisting the nickname in
/// `Pkcs11KekRecord.wrapping_key_nickname` lets a future migration
/// rotate it without invalidating existing records.
const PKCS11_WRAPPING_KEY_NICKNAME: &str = "lockstore::pkcs11-wrapping-key";

#[derive(Debug, Clone, Serialize, Deserialize)]
struct WrappedDek {
    kek_type: KekType,
    kek_ref: String,
    wrapped_dek: Vec<u8>,
}

fn default_key_size() -> usize {
    // Pre-existing DekMetadata records on disk predate the explicit
    // `key_size` field: they were minted with `cipher_suite.key_size()`
    // bytes by construction, so fall back to that for back-compat. New
    // records are always written with an explicit size from the caller.
    DEFAULT_CIPHER_SUITE.key_size()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct DekMetadata {
    wrapped_deks: Vec<WrappedDek>,
    cipher_suite: CipherSuite,
    #[serde(default)]
    extractable: bool,
    /// Caller-declared DEK length in bytes. Decoupled from `cipher_suite`
    /// (which governs only the *wrapping* cipher) so the consumer's
    /// expected key size is an explicit contract, not a coincidence
    /// with lockstore's internal cipher choice. Validated against the
    /// unwrapped bytes in `get_dek_internal`.
    #[serde(default = "default_key_size")]
    key_size: usize,
}

/// Exclusive access to the keystore's DEK metadata. Acquired via
/// [`Keystore::acquire_connection`].
///
/// Holding a `ConnectionHandle` is the witness that the caller has
/// exclusive write access to DEK metadata: every operation that walks
/// or mutates collection rows
/// ([`list_deks`](Self::list_deks), `load_metadata`,
/// `save_metadata`) is a method on this type, so the compiler enforces
/// that a thread cannot read the collection list and then load a row
/// without holding the lock across both steps. Single-step mutations
/// on [`Keystore`] (`create_dek`, `add_kek`, `remove_kek`,
/// `delete_dek`, `create_kek`) acquire a connection internally;
/// multi-step operations (rotation, batch maintenance) acquire one
/// explicitly and hold it across the whole pass.
pub struct ConnectionHandle<'a> {
    keystore: &'a Keystore,
    // The guard's `Drop` is what releases the underlying mutex; the
    // leading underscore tells the compiler we're keeping it solely
    // for its drop-time side-effect.
    _guard: std::sync::MutexGuard<'a, ()>,
}

impl<'a> ConnectionHandle<'a> {
    /// Returns the names of every collection that currently has DEK
    /// metadata stored.
    pub fn list_deks(&self) -> Result<Vec<String>, LockstoreError> {
        use kvstore::DatabaseError;

        let reader = self.keystore.store.reader()?;
        let db_name = DB_NAME.to_string();

        let collections = reader
            .read(|conn| {
                let mut stmt = conn
                    .prepare(
                        "SELECT data.key FROM data
                         JOIN dbs ON data.db_id = dbs.id
                         WHERE dbs.name = ?1
                         AND data.key LIKE ?2
                         ORDER BY data.key",
                    )
                    .map_err(DatabaseError::from)?;

                let dek_pattern = format!("{}%", DEK_PREFIX);
                let names: Result<Vec<String>, _> = stmt
                    .query_map([&db_name, &dek_pattern], |row| {
                        let key: String = row.get(0)?;
                        Ok(key.strip_prefix(DEK_PREFIX).unwrap_or(&key).to_string())
                    })
                    .map_err(DatabaseError::from)?
                    .collect();

                names.map_err(DatabaseError::from)
            })
            .map_err(LockstoreError::Database)?;

        Ok(collections)
    }

    fn load_metadata(&self, collection_name: &str) -> Result<DekMetadata, LockstoreError> {
        let dek_key = format!("{}{}", DEK_PREFIX, collection_name);
        let db = Database::new(&self.keystore.store, DB_NAME);
        let key = Key::from(dek_key.as_str());

        let metadata_value = db.get(&key, &GetOptions::default())?.ok_or_else(|| {
            LockstoreError::NotFound(format!("DEK not found for collection: {}", collection_name))
        })?;

        let metadata_bytes = utils::value_to_bytes(&metadata_value)?;
        Ok(serde_json::from_slice(&metadata_bytes)?)
    }

    fn save_metadata(
        &self,
        collection_name: &str,
        metadata: &DekMetadata,
    ) -> Result<(), LockstoreError> {
        let dek_key = format!("{}{}", DEK_PREFIX, collection_name);
        let db = Database::new(&self.keystore.store, DB_NAME);
        let key = Key::from(dek_key.as_str());
        let metadata_bytes = serde_json::to_vec(metadata)?;
        let value = utils::bytes_to_value(&metadata_bytes)?;
        db.put(&[(key, Some(value))])?;
        Ok(())
    }
}

/// Bytes of a plaintext KEK held in memory for a bounded window;
/// `Drop` runs `zeroize::Zeroize`.
struct CachedKek {
    kek: Vec<u8>,
    expires_at: Instant,
}

impl Drop for CachedKek {
    fn drop(&mut self) {
        self.kek.zeroize();
    }
}

#[derive(Clone)]
pub struct Keystore {
    store: Arc<Store>,
    /// Per-`kek_ref` cache of unwrapped password-protected software KEKs.
    /// Populated by `unlock_password_impl` after a successful PBKDF2
    /// derivation + AEAD unwrap, so subsequent DEK operations avoid the
    /// PBKDF2 round (typically ~100 ms for 800k iterations) while the
    /// caller's unlock window is still valid.
    password_kek_cache: Arc<Mutex<HashMap<String, CachedKek>>>,
    /// Per-`kek_ref` cache of unwrapped PKCS#11-backed software KEKs.
    /// Populated by `unlock_pkcs11_impl` after the slot is authenticated
    /// and the wrapped KEK is decrypted against the token's wrapping
    /// key. Each entry carries its own `expires_at`; absence or expiry
    /// is the canonical "this kek_ref is locked" signal.
    pkcs11_kek_cache: Arc<Mutex<HashMap<String, CachedKek>>>,
    /// Backs the `ConnectionHandle` guard: a coarse write-lock
    /// acquired by every operation that walks or mutates DEK metadata.
    /// Callers acquire a handle via [`acquire_connection`](Self::acquire_connection)
    /// rather than touching this directly; the handle's `Drop` releases
    /// the guard. Rotation walks every collection and rewraps each
    /// `Password`-bound DEK under the new KEK; holding the connection
    /// across the whole pass ensures a concurrent `create_dek` cannot
    /// leave a fresh collection wrapped under the about-to-be-stale
    /// KEK only.
    connection_lock: Arc<Mutex<()>>,
}

impl Keystore {
    /// Construct a fresh on-disk keystore. Private; callers go through
    /// `get`, which returns the process-wide `Arc<Keystore>`.
    /// Bypassing `get` and constructing two `Keystore` instances for the
    /// same path would give each one its own per-`KekType` caches, so an
    /// unlock through one would not be visible through the other.
    fn new_on_disk(path: PathBuf) -> Result<Self, LockstoreError> {
        let store = Arc::new(Store::new(StorePath::OnDisk(path)));
        nss_rs::init().map_err(|e| LockstoreError::NssInitialization(e.to_string()))?;
        Ok(Self {
            store,
            password_kek_cache: Arc::new(Mutex::new(HashMap::new())),
            pkcs11_kek_cache: Arc::new(Mutex::new(HashMap::new())),
            connection_lock: Arc::new(Mutex::new(())),
        })
    }

    /// Get the process-wide `Arc<Keystore>` for `path`, opening it on
    /// the first call (or any call after every previous `Arc` has been
    /// dropped). Concurrent callers receive clones of the same `Arc`,
    /// so all in-process consumers share one keystore handle and one
    /// set of per-`KekType` KEK caches.
    ///
    /// `path` is used as the cache key. Two `get` calls return the
    /// same `Arc` iff their `PathBuf`s compare equal; in practice every
    /// in-tree caller routes through `keystore_open` which
    /// constructs `<profile>/lockstore.keys.sqlite` deterministically,
    /// so this is automatic.
    ///
    /// **Process scope.** The cache is parent-process-only. Child
    /// processes (network, content, …) don't open the keystore
    /// directly; they reach it through the `nsILockstore` XPCOM
    /// service hosted in the parent. Cross-Firefox-instance
    /// concurrency on the underlying SQLite file is handled by the
    /// kvstore layer (WAL mode + file locks); Lockstore itself does
    /// not add a profile lock because Firefox already enforces
    /// single-instance-per-profile via the profile lock file.
    ///
    /// The cache stores `Weak<Keystore>`, so once the last `Arc` is
    /// dropped the underlying SQLite connection closes and a
    /// subsequent call against the same path re-opens the keystore
    /// from disk with empty per-`KekType` KEK caches (i.e. fully locked).
    /// This matters for tests that recycle a tempdir path.
    ///
    /// In-memory keystores are *not* shared — `new_in_memory` returns
    /// a fresh per-call instance for test isolation.
    pub fn get(path: PathBuf) -> Result<Arc<Self>, LockstoreError> {
        let map = SHARED_KEYSTORES.get_or_init(|| Mutex::new(HashMap::new()));
        // Surface mutex poisoning as a `LockingFailure`; an earlier
        // holder panicked while mutating the registry, so any state
        // observable through the guard may be inconsistent.
        let mut guard = map
            .lock()
            .map_err(|_| LockstoreError::LockingFailure("SHARED_KEYSTORES poisoned".into()))?;
        if let Some(weak) = guard.get(&path) {
            if let Some(arc) = weak.upgrade() {
                return Ok(arc);
            }
            // Stale entry: every prior consumer dropped its Arc, so the
            // SQLite connection is already closed. Fall through and rebuild.
        }
        let ks = Arc::new(Self::new_on_disk(path.clone())?);
        guard.insert(path, Arc::downgrade(&ks));
        Ok(ks)
    }

    pub fn new_in_memory() -> Result<Self, LockstoreError> {
        let store = Arc::new(Store::new(StorePath::for_in_memory()));
        nss_rs::init().map_err(|e| LockstoreError::NssInitialization(e.to_string()))?;
        Ok(Self {
            store,
            password_kek_cache: Arc::new(Mutex::new(HashMap::new())),
            pkcs11_kek_cache: Arc::new(Mutex::new(HashMap::new())),
            connection_lock: Arc::new(Mutex::new(())),
        })
    }

    pub fn create_dek(
        &self,
        collection_name: &str,
        kek_ref: &str,
        extractable: bool,
        key_size: usize,
    ) -> Result<(), LockstoreError> {
        self.create_dek_with_cipher(
            collection_name,
            kek_ref,
            extractable,
            DEFAULT_CIPHER_SUITE,
            key_size,
        )
    }

    pub fn create_dek_with_cipher(
        &self,
        collection_name: &str,
        kek_ref: &str,
        extractable: bool,
        cipher_suite: CipherSuite,
        key_size: usize,
    ) -> Result<(), LockstoreError> {
        // The caller declares the DEK length here; it has no required
        // relationship to `cipher_suite.key_size()`, which from this
        // commit on governs only the wrapping cipher used to encrypt
        // the DEK under the KEK. Reject obviously bad values early so
        // a typo at the caller doesn't end up in DekMetadata on disk.
        if key_size == 0 || key_size > 1024 {
            return Err(LockstoreError::InvalidConfiguration(format!(
                "key_size {} is out of range (1..=1024 bytes)",
                key_size
            )));
        }

        let kek_type = KekType::from_kek_ref(kek_ref)?;

        // Serialises against concurrent KEK-mutating operations so a
        // brand-new DEK can't be wrapped under an about-to-be-rotated KEK.
        let conn = self.acquire_connection()?;

        let dek_key = format!("{}{}", DEK_PREFIX, collection_name);
        let db = Database::new(&self.store, DB_NAME);
        let key = Key::from(dek_key.as_str());
        let existing = db.get(&key, &GetOptions::default())?;

        if existing.is_some() {
            return Err(LockstoreError::InvalidConfiguration(format!(
                "DEK already exists for collection: {}",
                collection_name
            )));
        }

        let new_dek = crypto::generate_random_bytes(key_size);
        let kek = self.get_kek_symkey(cipher_suite, kek_ref)?;
        let wrapped = crypto::encrypt_with_symkey(&new_dek, &kek, cipher_suite)?;

        let metadata = DekMetadata {
            wrapped_deks: vec![WrappedDek {
                kek_type,
                kek_ref: kek_ref.to_string(),
                wrapped_dek: wrapped,
            }],
            cipher_suite,
            extractable,
            key_size,
        };

        conn.save_metadata(collection_name, &metadata)
    }

    /// Install caller-supplied `dek_bytes` as the DEK for `collection_name`,
    /// wrapped under the existing KEK at `kek_ref`. Migration primitive: use
    /// this to bring data already encrypted under a known external DEK under
    /// keystore management without re-encrypting ciphertexts at rest.
    ///
    /// `dek_bytes` must match the wire length of the default cipher suite
    /// (32 bytes for AES-256-GCM); other lengths are rejected with
    /// `InvalidConfiguration`. The collection must not already have a DEK
    /// and the KEK at `kek_ref` must be unlocked (required so we can wrap
    /// the caller's bytes).
    ///
    /// Imported DEKs are inherently extractable by the caller (the bytes
    /// are already in their hands). The `extractable` flag controls only
    /// whether future `get_dek` calls succeed.
    pub fn import_dek(
        &self,
        collection_name: &str,
        kek_ref: &str,
        dek_bytes: &[u8],
        extractable: bool,
    ) -> Result<(), LockstoreError> {
        let cipher_suite = DEFAULT_CIPHER_SUITE;
        if dek_bytes.len() != cipher_suite.key_size() {
            return Err(LockstoreError::InvalidConfiguration(format!(
                "DEK length {} does not match expected {} bytes for {}",
                dek_bytes.len(),
                cipher_suite.key_size(),
                cipher_suite.as_str()
            )));
        }

        let kek_type = KekType::from_kek_ref(kek_ref)?;

        // Serialises against concurrent KEK-mutating operations for
        // the same reason `create_dek` does (see comment there).
        let conn = self.acquire_connection()?;

        let dek_key = format!("{}{}", DEK_PREFIX, collection_name);
        let db = Database::new(&self.store, DB_NAME);
        let key = Key::from(dek_key.as_str());
        let existing = db.get(&key, &GetOptions::default())?;

        if existing.is_some() {
            return Err(LockstoreError::InvalidConfiguration(format!(
                "DEK already exists for collection: {}",
                collection_name
            )));
        }

        let kek = self.get_kek_symkey(cipher_suite, kek_ref)?;
        let wrapped = crypto::encrypt_with_symkey(dek_bytes, &kek, cipher_suite)?;

        let metadata = DekMetadata {
            wrapped_deks: vec![WrappedDek {
                kek_type,
                kek_ref: kek_ref.to_string(),
                wrapped_dek: wrapped,
            }],
            cipher_suite,
            extractable,
            // Caller's explicit DEK length, mirroring create_dek. The
            // length-validation at import time (above) is the authority.
            key_size: dek_bytes.len(),
        };

        conn.save_metadata(collection_name, &metadata)
    }

    pub(crate) fn get_dek_internal(
        &self,
        collection_name: &str,
        kek_ref: &str,
    ) -> Result<(Vec<u8>, CipherSuite, bool), LockstoreError> {
        // Parse upfront so a malformed kek_ref surfaces as
        // `InvalidKekRef` rather than a generic NotFound after the
        // metadata lookup.
        KekType::from_kek_ref(kek_ref)?;

        let conn = self.acquire_connection()?;
        let metadata = conn.load_metadata(collection_name)?;

        let entry = metadata
            .wrapped_deks
            .iter()
            .find(|w| w.kek_ref == kek_ref)
            .ok_or_else(|| {
                LockstoreError::NotFound(format!(
                    "No DEK for collection '{}' with kek_ref '{}'",
                    collection_name, kek_ref
                ))
            })?;

        let kek = self.get_kek_symkey(metadata.cipher_suite, kek_ref)?;
        let dek = crypto::decrypt_with_symkey(&entry.wrapped_dek, &kek)?;

        // Defense in depth: the stored `key_size` reflects what the
        // creator declared; if the wrapped bytes decrypted to a
        // different length, the metadata and the ciphertext disagree
        // (data corruption, downgrade, or wrong KEK).
        if dek.len() != metadata.key_size {
            return Err(LockstoreError::InvalidConfiguration(format!(
                "DEK length {} does not match stored key_size {} for collection '{}'",
                dek.len(),
                metadata.key_size,
                collection_name
            )));
        }

        Ok((dek, metadata.cipher_suite, metadata.extractable))
    }

    pub fn is_dek_extractable(&self, collection_name: &str) -> Result<bool, LockstoreError> {
        let conn = self.acquire_connection()?;
        let metadata = conn.load_metadata(collection_name)?;
        Ok(metadata.extractable)
    }

    pub fn get_dek(
        &self,
        collection_name: &str,
        kek_ref: &str,
    ) -> Result<(Vec<u8>, CipherSuite), LockstoreError> {
        if !self.is_dek_extractable(collection_name)? {
            return Err(LockstoreError::NotExtractable(format!(
                "DEK for '{}' is not extractable",
                collection_name
            )));
        }

        let (dek, cipher_suite, _) = self.get_dek_internal(collection_name, kek_ref)?;
        Ok((dek, cipher_suite))
    }

    /// Encrypts `plaintext` with the DEK for `(collection, kek_ref)`. The returned
    /// blob is self-describing: `[cipher_suite_id(1)] || [nonce] || [ciphertext+tag]`.
    /// The DEK does not need to be extractable; the DEK bytes never leave Lockstore.
    pub fn encrypt(
        &self,
        collection: &str,
        kek_ref: &str,
        plaintext: &[u8],
    ) -> Result<Vec<u8>, LockstoreError> {
        let (dek, cipher_suite, _) = self.get_dek_internal(collection, kek_ref)?;
        crypto::encrypt_with_key(plaintext, &dek, cipher_suite)
    }

    /// Decrypts a blob produced by `encrypt` using the DEK for
    /// `(collection, kek_ref)`. The cipher suite is encoded in the
    /// blob's leading byte and must match the suite recorded for this
    /// DEK in `DekMetadata.cipher_suite`; a mismatch (e.g. the blob's
    /// prefix was tampered with to point at a different suite) is
    /// rejected as `LockstoreError::Decryption` before the AEAD layer
    /// gets a chance to fail with a less specific error.
    pub fn decrypt(
        &self,
        collection: &str,
        kek_ref: &str,
        ciphertext: &[u8],
    ) -> Result<Vec<u8>, LockstoreError> {
        let (dek, expected_suite, _) = self.get_dek_internal(collection, kek_ref)?;
        let blob_suite = crypto::cipher_suite_of_blob(ciphertext)?;
        if blob_suite != expected_suite {
            return Err(LockstoreError::Decryption(format!(
                "cipher-suite mismatch: blob {} but DEK was created with {}",
                blob_suite.as_str(),
                expected_suite.as_str()
            )));
        }
        crypto::decrypt_with_key(ciphertext, &dek)
    }

    pub fn add_kek(
        &self,
        collection_name: &str,
        source_kek_ref: &str,
        new_kek_ref: &str,
    ) -> Result<(), LockstoreError> {
        let new_kek_type = KekType::from_kek_ref(new_kek_ref)?;

        let conn = self.acquire_connection()?;
        let mut metadata = conn.load_metadata(collection_name)?;

        if metadata
            .wrapped_deks
            .iter()
            .any(|w| w.kek_ref == new_kek_ref)
        {
            return Err(LockstoreError::InvalidConfiguration(format!(
                "kek_ref '{}' already exists for collection '{}'",
                new_kek_ref, collection_name
            )));
        }

        let source_entry = metadata
            .wrapped_deks
            .iter()
            .find(|w| w.kek_ref == source_kek_ref)
            .ok_or_else(|| {
                LockstoreError::NotFound(format!(
                    "No DEK for collection '{}' with kek_ref '{}'",
                    collection_name, source_kek_ref
                ))
            })?;

        let source_kek = self.get_kek_symkey(metadata.cipher_suite, source_kek_ref)?;
        let dek = crypto::decrypt_with_symkey(&source_entry.wrapped_dek, &source_kek)?;

        let new_kek = self.get_kek_symkey(metadata.cipher_suite, new_kek_ref)?;
        let new_wrapped = crypto::encrypt_with_symkey(&dek, &new_kek, metadata.cipher_suite)?;

        metadata.wrapped_deks.push(WrappedDek {
            kek_type: new_kek_type,
            kek_ref: new_kek_ref.to_string(),
            wrapped_dek: new_wrapped,
        });

        conn.save_metadata(collection_name, &metadata)
    }

    pub fn remove_kek(&self, collection_name: &str, kek_ref: &str) -> Result<(), LockstoreError> {
        let conn = self.acquire_connection()?;
        let mut metadata = conn.load_metadata(collection_name)?;

        if metadata.wrapped_deks.len() <= 1 {
            return Err(LockstoreError::InvalidConfiguration(format!(
                "Cannot remove the last KEK from collection '{}'",
                collection_name
            )));
        }

        let entry = metadata
            .wrapped_deks
            .iter()
            .find(|w| w.kek_ref == kek_ref)
            .ok_or_else(|| {
                LockstoreError::NotFound(format!(
                    "No DEK for collection '{}' with kek_ref '{}'",
                    collection_name, kek_ref
                ))
            })?;

        let kek = self.get_kek_symkey(metadata.cipher_suite, kek_ref)?;
        crypto::decrypt_with_symkey(&entry.wrapped_dek, &kek)?;

        metadata.wrapped_deks.retain(|w| w.kek_ref != kek_ref);

        conn.save_metadata(collection_name, &metadata)?;

        // The per-kek_ref record on disk is left intact. Callers that
        // want to drop the record itself must invoke `delete_kek`
        // explicitly — a separate lifecycle step that refuses to act
        // while any collection still wraps under the kek_ref.
        Ok(())
    }

    /// Atomically rewrap the DEK for `collection_name` from `old_kek_ref` to
    /// `new_kek_ref`. The DEK bytes are unchanged, so ciphertexts at rest
    /// under this collection remain valid.
    ///
    /// Equivalent in effect to `add_kek` followed by `remove_kek` but
    /// atomic at the kvstore-row level: a crash mid-operation leaves the
    /// keystore in the old state or the new state, never an intermediate
    /// half-state. The wrapping entry is replaced in place, so the
    /// "collection always has at least one wrapping" invariant is
    /// preserved at every observable disk state.
    ///
    /// `old_kek_ref` must currently wrap the collection and be unlocked.
    /// `new_kek_ref` must not currently wrap the collection.
    pub fn switch_kek(
        &self,
        collection_name: &str,
        old_kek_ref: &str,
        new_kek_ref: &str,
    ) -> Result<(), LockstoreError> {
        if old_kek_ref == new_kek_ref {
            return Err(LockstoreError::InvalidConfiguration(format!(
                "old_kek_ref and new_kek_ref are the same: '{}'",
                old_kek_ref
            )));
        }

        let new_kek_type = KekType::from_kek_ref(new_kek_ref)?;

        let conn = self.acquire_connection()?;
        let mut metadata = conn.load_metadata(collection_name)?;

        let old_entry = metadata
            .wrapped_deks
            .iter()
            .find(|w| w.kek_ref == old_kek_ref)
            .ok_or_else(|| {
                LockstoreError::NotFound(format!(
                    "No DEK for collection '{}' with kek_ref '{}'",
                    collection_name, old_kek_ref
                ))
            })?;

        if metadata
            .wrapped_deks
            .iter()
            .any(|w| w.kek_ref == new_kek_ref)
        {
            return Err(LockstoreError::InvalidConfiguration(format!(
                "new_kek_ref '{}' already wraps collection '{}'",
                new_kek_ref, collection_name
            )));
        }

        let old_kek = self.get_kek_symkey(metadata.cipher_suite, old_kek_ref)?;
        let mut dek = crypto::decrypt_with_symkey(&old_entry.wrapped_dek, &old_kek)?;

        let new_kek = self.get_kek_symkey(metadata.cipher_suite, new_kek_ref)?;
        let new_wrapped = crypto::encrypt_with_symkey(&dek, &new_kek, metadata.cipher_suite)?;
        dek.zeroize();

        // In-place replace preserves the "at least one wrapping" invariant
        // at every observable state — at no point during the metadata
        // mutation is the wrappings vector empty.
        for w in metadata.wrapped_deks.iter_mut() {
            if w.kek_ref == old_kek_ref {
                w.kek_type = new_kek_type;
                w.kek_ref = new_kek_ref.to_string();
                w.wrapped_dek = new_wrapped;
                break;
            }
        }

        conn.save_metadata(collection_name, &metadata)
    }

    pub fn delete_dek(&self, collection_name: &str) -> Result<(), LockstoreError> {
        let _conn = self.acquire_connection()?;

        let dek_key = format!("{}{}", DEK_PREFIX, collection_name);
        let db = Database::new(&self.store, DB_NAME);
        let key = Key::from(dek_key.as_str());

        if !db.has(&key, &GetOptions::default())? {
            return Err(LockstoreError::NotFound(format!(
                "DEK not found for collection: {}",
                collection_name
            )));
        }

        crypto::secure_delete(&self.store, DB_NAME, &dek_key)?;

        // The per-kek_ref records previously wrapped by this DEK are
        // left intact on disk. Callers that want to drop those records
        // must invoke `delete_kek` explicitly for each kek_ref — a
        // separate lifecycle step that refuses to act while any other
        // collection still wraps under the kek_ref.
        Ok(())
    }

    /// Destroy the KEK referenced by `kek_ref` and any cached
    /// plaintext bytes derived from it. Returns `InvalidConfiguration`
    /// if any DEK is still wrapped under `kek_ref`; callers must
    /// remove or rotate those wrappings (via `remove_kek` /
    /// `switch_kek`) before deletion. Returns `NotFound` if the
    /// kek_ref is well-formed but no record exists.
    ///
    /// Deletion is always explicit: `remove_kek` and `delete_dek`
    /// drop wrappings only, never the per-tier KEK record. Callers
    /// that want the record gone must call `delete_kek` themselves.
    pub fn delete_kek(&self, kek_ref: &str) -> Result<(), LockstoreError> {
        let kek_type = KekType::from_kek_ref(kek_ref)?;
        let conn = self.acquire_connection()?;

        // Existence check before the in-use scan: a NotFound result
        // informs the caller of the wrong kek_ref rather than a
        // dangling reference.
        let exists = match kek_type {
            KekType::LocalKey => self.load_local_record(kek_ref)?.is_some(),
            KekType::Password => self.load_password_record(kek_ref)?.is_some(),
            KekType::Pkcs11Token => self.load_pkcs11_record(kek_ref)?.is_some(),
        };
        if !exists {
            return Err(LockstoreError::NotFound(format!(
                "No KEK record for kek_ref: {}",
                kek_ref
            )));
        }

        if let Some(coll) = self.kek_ref_referenced_by_collection(&conn, kek_ref)? {
            return Err(LockstoreError::InvalidConfiguration(format!(
                "kek_ref '{}' is still in use to wrap DEK '{}'; remove the wrapping before deleting the KEK",
                kek_ref, coll
            )));
        }

        match kek_type {
            KekType::LocalKey => self.delete_local_record(kek_ref),
            KekType::Password => self.delete_password_record(kek_ref),
            KekType::Pkcs11Token => self.delete_pkcs11_record(kek_ref),
        }
    }

    /// If any collection wraps a DEK under `kek_ref`, return the name
    /// of the first such collection (used for error messages on
    /// `delete_kek`). Returns `None` if no collection references
    /// `kek_ref`.
    fn kek_ref_referenced_by_collection(
        &self,
        conn: &ConnectionHandle<'_>,
        kek_ref: &str,
    ) -> Result<Option<String>, LockstoreError> {
        for collection in conn.list_deks()? {
            let metadata = conn.load_metadata(&collection)?;
            if metadata.wrapped_deks.iter().any(|w| w.kek_ref == kek_ref) {
                return Ok(Some(collection));
            }
        }
        Ok(None)
    }

    /// Acquire exclusive DEK-ops access on this keystore. Single-step
    /// public methods (`create_dek`, `add_kek`, `remove_kek`,
    /// `delete_dek`, `create_kek`) acquire one internally; multi-step
    /// callers (rotation, batch maintenance) should call this once and
    /// hold the result across the operation. See
    /// [`ConnectionHandle`] for what holding a connection guarantees.
    pub fn acquire_connection(&self) -> Result<ConnectionHandle<'_>, LockstoreError> {
        let guard = self
            .connection_lock
            .lock()
            .map_err(|_| LockstoreError::LockingFailure("connection_lock poisoned".into()))?;
        Ok(ConnectionHandle {
            keystore: self,
            _guard: guard,
        })
    }

    /// Snapshot of all collections that currently have DEK metadata
    /// stored. Internally acquires a short-lived connection; callers
    /// that need a stable view across multiple operations should call
    /// [`acquire_connection`](Self::acquire_connection) and use
    /// [`ConnectionHandle::list_deks`] directly.
    pub fn list_deks(&self) -> Result<Vec<String>, LockstoreError> {
        self.acquire_connection()?.list_deks()
    }

    /// Return the list of `kek_ref`s currently wrapping the DEK named
    /// `dek_name`. Always non-empty for any DEK that exists (the
    /// keystore enforces at least one KEK wrapping); rejects with
    /// `LockstoreError::NotFound` when no DEK by that name exists.
    /// Returns only the `kek_ref` strings, never the wrapped key bytes
    /// themselves — see the `nsILockstore.listKeks` scriptable wrapper
    /// for the JS-side API.
    pub fn list_keks(&self, dek_name: &str) -> Result<Vec<String>, LockstoreError> {
        let conn = self.acquire_connection()?;
        let metadata = conn.load_metadata(dek_name)?;
        Ok(metadata
            .wrapped_deks
            .iter()
            .map(|w| w.kek_ref.clone())
            .collect())
    }

    /// Flush sensitive in-memory state (every per-`KekType` KEK cache) and
    /// close the underlying store eagerly. Takes `&self` so it works on
    /// the `Arc` returned by `get`. Calling this is optional — `Drop`
    /// performs the same flush automatically when the last
    /// `Arc<Keystore>` goes away — but it gives callers a deterministic
    /// flush point (useful for tests and shutdown paths).
    pub fn close(&self) {
        // Best-effort lock on close: if any cache mutex is poisoned we
        // still want to fall through to the SQLite close, since the
        // caller has no way to retry close.
        let _ = self.lock();
        self.store.close();
    }

    // ========================================================================
    // Unified lock/unlock API
    //
    // These dispatch on the KekType derived from `kek_ref`:
    //
    //   LocalKey    → no-op; always reported as unlocked.
    //   Password    → `secret` is the password, fed to PBKDF2; the
    //                 unwrapped KEK is cached per-kek_ref with a
    //                 `now + timeout` deadline. `secret` is required.
    //   Pkcs11Token → `secret` is the PIN. When non-empty, we authenticate
    //                 via PK11_CheckUserPassword — a direct C_Login with
    //                 the caller-supplied PIN, bypassing NSS's password
    //                 callback. When empty, we fall back to
    //                 slot.authenticate() which delegates to whatever
    //                 callback the embedding application has installed.
    //                 A per-kek_ref unlock deadline is cached in either
    //                 case.
    //   Test        → no-op (treated like LocalKey).
    //
    // Callers should supply `secret` matching the KEK type (password for
    // Password, PIN for PKCS#11, or empty to defer to NSS).
    // ========================================================================

    /// Returns true if `kek_ref` is currently unlocked (KEK material available
    /// without further user interaction). Returns `InvalidKekRef` if
    /// `kek_ref` cannot be parsed; mutex poisoning surfaces as
    /// `LockingFailure`.
    pub fn is_kek_unlocked(&self, kek_ref: &str) -> Result<bool, LockstoreError> {
        let kek_type = KekType::from_kek_ref(kek_ref)?;
        match kek_type {
            KekType::LocalKey => Ok(true),
            KekType::Password => self.is_password_unlocked_impl(kek_ref),
            KekType::Pkcs11Token => self.is_pkcs11_unlocked_impl(kek_ref),
        }
    }

    /// Drop any cached authentication for `kek_ref`. No-op for KEK types that
    /// don't require interaction (LocalKey). For PKCS#11, this clears the
    /// Lockstore-side auth cache **and** calls `PK11_Logout` on the slot so
    /// NSS's own authenticated-session state is also cleared. Returns
    /// `InvalidKekRef` if `kek_ref` cannot be parsed.
    pub fn lock_kek(&self, kek_ref: &str) -> Result<(), LockstoreError> {
        let kek_type = KekType::from_kek_ref(kek_ref)?;
        match kek_type {
            KekType::LocalKey => Ok(()),
            KekType::Password => self.lock_password_impl_for(kek_ref),
            KekType::Pkcs11Token => {
                // Recover poisoned mutex so the remove still happens;
                // surface the poisoning after the security-relevant
                // clear completes.
                let poisoned = match self.pkcs11_kek_cache.lock() {
                    Ok(mut g) => {
                        g.remove(kek_ref);
                        false
                    }
                    Err(p) => {
                        p.into_inner().remove(kek_ref);
                        true
                    }
                };
                // Best-effort NSS logout: resolve the slot via the
                // record's stored URI. If the record or slot is gone we
                // still cleared our cache, which is what callers
                // observe.
                if let Ok(Some(record)) = self.load_pkcs11_record(kek_ref) {
                    if let Ok(uri) = nss_rs::pk11_utils::parse(&record.pkcs11_uri) {
                        if let Ok(slot) = self.resolve_pkcs11_slot(&uri) {
                            let _ = slot.logout();
                        }
                    }
                }
                if poisoned {
                    Err(LockstoreError::LockingFailure(
                        "pkcs11_kek_cache poisoned".into(),
                    ))
                } else {
                    Ok(())
                }
            }
        }
    }

    /// Lock every KEK that holds cached authentication — zeroises every
    /// cached Password and PKCS#11 KEK. Called on `close()` and should
    /// also be wired to `xpcom-shutdown` by the XPCOM consumer.
    ///
    /// Each cache is cleared independently: a poisoned mutex on one
    /// cache must not leave plaintext key material resident in another.
    /// A poisoned mutex is recovered via `into_inner` and cleared anyway;
    /// the first poisoning encountered is returned as `LockingFailure`,
    /// subsequent poisonings are dropped.
    pub fn lock(&self) -> Result<(), LockstoreError> {
        let mut first_err: Option<LockstoreError> = None;

        match self.password_kek_cache.lock() {
            Ok(mut g) => g.clear(),
            Err(p) => {
                p.into_inner().clear();
                first_err.get_or_insert(LockstoreError::LockingFailure(
                    "password_kek_cache poisoned".into(),
                ));
            }
        }
        match self.pkcs11_kek_cache.lock() {
            Ok(mut g) => g.clear(),
            Err(p) => {
                p.into_inner().clear();
                first_err.get_or_insert(LockstoreError::LockingFailure(
                    "pkcs11_kek_cache poisoned".into(),
                ));
            }
        }

        first_err.map_or(Ok(()), Err)
    }

    /// Generic KEK-creation dispatcher used by the FFI / nsILockstore
    /// `createKek` entry point so JS / C++ consumers don't have to
    /// special-case every `KekType`. `identifier` selects the kek_ref
    /// `<id>` suffix: empty mints a fresh random id (the default); a
    /// non-empty base64url identifier is used verbatim, making the call
    /// a deterministic get-or-create (a second call with the same
    /// identifier returns the existing KEK untouched). Returns the
    /// `kek_ref`, of the form `lockstore::kek::<type>:<id>`.
    ///
    /// Per `kek_type`:
    ///   - `LocalKey`: generates a fresh AES-256 KEK, persists it as
    ///     plaintext in a [`LocalKekRecord`] at a freshly-minted
    ///     `lockstore::kek::local:<id>` row. `secret` and
    ///     `cache_timeout` are ignored — LocalKey is always available
    ///     without an unlock step.
    ///   - `Password`: `secret` carries the user's password bytes
    ///     (must be non-empty). Generates a fresh salt + AES-256 KEK,
    ///     derives a wrapping key via PBKDF2, wraps the KEK, and
    ///     persists a [`PasswordKekRecord`] at a freshly-minted
    ///     `lockstore::kek::password:<id>` row. If `cache_timeout` is
    ///     non-zero the just-derived KEK is also inserted into the
    ///     in-memory auth cache with that expiry, so the caller does
    ///     not need to immediately call `unlock_kek` against the kek_ref
    ///     it just received.
    ///   - `Pkcs11Token`: `secret` carries a PKCS#11 URI naming the
    ///     target slot/token. The slot is resolved and (if necessary)
    ///     authenticated via NSS's registered password callback;
    ///     Lockstore then finds-or-creates a long-lived AES wrapping
    ///     key on the slot, generates a fresh software KEK, wraps it
    ///     under the wrapping key, and persists a [`Pkcs11KekRecord`]
    ///     at a freshly-minted `lockstore::kek::pkcs11:<id>` row.
    ///     `cache_timeout` is ignored — PKCS#11 unlock is mediated by
    ///     NSS, not by the Lockstore cache.
    pub fn create_kek(
        &self,
        kek_type: KekType,
        identifier: &str,
        secret: &[u8],
        cache_timeout: Duration,
    ) -> Result<String, LockstoreError> {
        Self::validate_kek_identifier(identifier)?;
        match kek_type {
            KekType::LocalKey => self.create_local_kek(identifier),
            KekType::Password => self.create_password_kek(
                identifier,
                secret,
                pbkdf2::PBKDF2_ITERATIONS,
                cache_timeout,
            ),
            KekType::Pkcs11Token => self.create_pkcs11_kek(identifier, secret),
        }
    }

    /// Validate a caller-supplied KEK identifier. Empty means "mint a
    /// random id". A non-empty identifier must be base64url
    /// (`[A-Za-z0-9_-]`) so it can't smuggle a `:` or other delimiter
    /// that would make the resulting kek_ref ambiguous.
    fn validate_kek_identifier(identifier: &str) -> Result<(), LockstoreError> {
        if identifier.is_empty()
            || identifier
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
        {
            Ok(())
        } else {
            Err(LockstoreError::InvalidConfiguration(format!(
                "KEK identifier must be base64url ([A-Za-z0-9_-]); got '{}'",
                identifier
            )))
        }
    }

    /// Resolve the `<id>` suffix of a kek_ref: a non-empty `identifier`
    /// is used verbatim (deterministic, get-or-create); an empty
    /// identifier mints a fresh random base64url id.
    fn kek_id_suffix(identifier: &str) -> String {
        if identifier.is_empty() {
            let id_bytes = crypto::generate_random_bytes(16);
            base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(&id_bytes)
        } else {
            identifier.to_string()
        }
    }

    /// Generate a fresh AES-256 KEK, persist it as a `LocalKekRecord`
    /// at a freshly-minted `lockstore::kek::local:<id>` row, and return
    /// the kek_ref. See [`create_kek`] for the caller-facing contract.
    fn create_local_kek(&self, identifier: &str) -> Result<String, LockstoreError> {
        let kek_ref = format!(
            "{}{}",
            KEK_REF_LOCAL_PREFIX,
            Self::kek_id_suffix(identifier)
        );
        // Explicit identifier already in use: get-or-create returns the
        // existing record untouched so callers can mint a well-known
        // shared KEK idempotently across runs.
        if !identifier.is_empty() && self.load_local_record(&kek_ref)?.is_some() {
            return Ok(kek_ref);
        }
        let cipher_suite = DEFAULT_CIPHER_SUITE;
        let kek_bytes = crypto::generate_random_key(cipher_suite);
        self.save_local_record(&kek_ref, &LocalKekRecord { kek_bytes })?;
        Ok(kek_ref)
    }

    /// Test-only escape hatch that creates a Password KEK with a
    /// single PBKDF2 iteration so unit tests aren't gated by ~100 ms
    /// of derivation. **Production code must call `create_kek`** with
    /// `KekType::Password`. Public only so integration tests in
    /// `tests/` can reach it; the name is loud on purpose.
    #[doc(hidden)]
    pub fn create_password_kek_test_only(&self, password: &[u8]) -> Result<String, LockstoreError> {
        self.create_password_kek("", password, 1, Duration::ZERO)
    }

    /// Generate a fresh AES-256 KEK wrapped under PBKDF2(password,...),
    /// persist a `PasswordKekRecord` at a freshly-minted
    /// `lockstore::kek::password:<id>` row, and return the kek_ref.
    /// `iterations` is parameterised so tests can drop the cost.
    /// If `cache_timeout` is non-zero the just-derived KEK is inserted
    /// into the auth cache with that expiry.
    /// See [`create_kek`] for the caller-facing contract.
    fn create_password_kek(
        &self,
        identifier: &str,
        password: &[u8],
        iterations: u32,
        cache_timeout: Duration,
    ) -> Result<String, LockstoreError> {
        if password.is_empty() {
            return Err(LockstoreError::InvalidConfiguration(
                "Password must not be empty".into(),
            ));
        }
        let kek_ref = format!(
            "{}{}",
            KEK_REF_PASSWORD_PREFIX,
            Self::kek_id_suffix(identifier)
        );
        // Explicit identifier already in use: get-or-create returns the
        // existing record untouched (the supplied password is ignored).
        if !identifier.is_empty() && self.load_password_record(&kek_ref)?.is_some() {
            return Ok(kek_ref);
        }
        let cipher_suite = DEFAULT_CIPHER_SUITE;
        let salt = crypto::generate_random_bytes(pbkdf2::PBKDF2_SALT_SIZE);

        let mut wrapping_key =
            pbkdf2::derive_kek(password, &salt, iterations, cipher_suite.key_size())?;
        let mut kek_plaintext = crypto::generate_random_key(cipher_suite);
        let ciphertext = crypto::encrypt_with_key(&kek_plaintext, &wrapping_key, cipher_suite)?;
        wrapping_key.zeroize();

        self.save_password_record(
            &kek_ref,
            &PasswordKekRecord {
                ciphertext,
                salt,
                iterations,
                cipher_suite,
            },
        )?;

        if !cache_timeout.is_zero() {
            match self.password_kek_cache.lock() {
                Ok(mut g) => {
                    g.insert(
                        kek_ref.clone(),
                        CachedKek {
                            kek: std::mem::take(&mut kek_plaintext),
                            expires_at: Instant::now() + cache_timeout,
                        },
                    );
                }
                Err(_) => {
                    kek_plaintext.zeroize();
                    return Err(LockstoreError::LockingFailure(
                        "password_kek_cache poisoned".into(),
                    ));
                }
            }
        } else {
            kek_plaintext.zeroize();
        }
        Ok(kek_ref)
    }

    /// Provision a fresh PKCS#11-backed KEK against the slot named by
    /// the PKCS#11 URI in `uri_bytes`. See [`create_kek`] for the
    /// caller-facing contract.
    fn create_pkcs11_kek(
        &self,
        identifier: &str,
        uri_bytes: &[u8],
    ) -> Result<String, LockstoreError> {
        if uri_bytes.is_empty() {
            return Err(LockstoreError::InvalidConfiguration(
                "PKCS#11 URI must not be empty".into(),
            ));
        }
        let kek_ref = format!(
            "{}{}",
            KEK_REF_PKCS11_PREFIX,
            Self::kek_id_suffix(identifier)
        );
        // Explicit identifier already in use: get-or-create returns the
        // existing record untouched (the supplied URI is ignored).
        if !identifier.is_empty() && self.load_pkcs11_record(&kek_ref)?.is_some() {
            return Ok(kek_ref);
        }
        let uri_str = std::str::from_utf8(uri_bytes).map_err(|_| {
            LockstoreError::InvalidConfiguration("PKCS#11 URI is not valid UTF-8".into())
        })?;
        let uri = nss_rs::pk11_utils::parse(uri_str).map_err(|_| {
            LockstoreError::InvalidConfiguration(format!(
                "Could not parse PKCS#11 URI: {}",
                uri_str
            ))
        })?;
        let slot = self.resolve_pkcs11_slot(&uri)?;

        // Authenticate via NSS's registered password callback (PSM in
        // Firefox). On a slot that is already authenticated this is a
        // cheap no-op; on a locked slot it prompts. Unit-test contexts
        // without a callback surface AuthenticationCancelled.
        slot.authenticate()
            .map_err(|_| LockstoreError::AuthenticationCancelled)?;

        // Find-or-create the per-token AES wrapping key. The nickname
        // is fixed so multiple Lockstore KEKs against the same slot
        // share one wrapping key — that's intentional, since the slot
        // PIN already gates access to every key on the token.
        let cipher_suite = DEFAULT_CIPHER_SUITE;
        let wrapping_key = match slot.find_key_by_nickname(PKCS11_WRAPPING_KEY_NICKNAME) {
            Some(k) => k,
            None => slot
                .generate_token_key(
                    p11::CKM_AES_KEY_GEN.into(),
                    cipher_suite.key_size(),
                    PKCS11_WRAPPING_KEY_NICKNAME,
                )
                .map_err(|e| {
                    LockstoreError::TokenError(format!(
                        "Failed to generate PKCS#11 wrapping key: {}",
                        e
                    ))
                })?,
        };

        // Fresh software KEK, wrapped under the hardware-resident
        // wrapping key. The plaintext only exists in this function's
        // local scope until the AEAD consumes it.
        let mut kek_plaintext = crypto::generate_random_key(cipher_suite);
        let ciphertext = crypto::encrypt_with_symkey(&kek_plaintext, &wrapping_key, cipher_suite)?;
        kek_plaintext.zeroize();

        let record = Pkcs11KekRecord {
            ciphertext,
            pkcs11_uri: uri_str.to_string(),
            wrapping_key_nickname: PKCS11_WRAPPING_KEY_NICKNAME.to_string(),
        };
        self.save_pkcs11_record(&kek_ref, &record)?;
        Ok(kek_ref)
    }

    /// Unlock `kek_ref` so subsequent DEK accesses under it succeed for at
    /// most `timeout`. `secret` carries the password (for `Password`) or
    /// PIN (for PKCS#11). For PKCS#11 it may be empty, in which case
    /// Lockstore falls back to NSS's own password callback.
    pub fn unlock_kek(
        &self,
        kek_ref: &str,
        secret: &[u8],
        timeout: Duration,
    ) -> Result<(), LockstoreError> {
        let kek_type = KekType::from_kek_ref(kek_ref)?;
        match kek_type {
            KekType::LocalKey => Ok(()),
            KekType::Password => self.unlock_password_impl(kek_ref, secret, timeout),
            KekType::Pkcs11Token => self.unlock_pkcs11_impl(kek_ref, secret, timeout),
        }
    }

    // ------------------------------------------------------------------------
    // Password-specific implementations
    // ------------------------------------------------------------------------

    fn is_password_unlocked_impl(&self, kek_ref: &str) -> Result<bool, LockstoreError> {
        let mut guard = self
            .password_kek_cache
            .lock()
            .map_err(|_| LockstoreError::LockingFailure("password_kek_cache poisoned".into()))?;
        Ok(match guard.get(kek_ref) {
            Some(cached) if cached.expires_at > Instant::now() => true,
            Some(_) => {
                guard.remove(kek_ref);
                false
            }
            None => false,
        })
    }

    fn lock_password_impl_for(&self, kek_ref: &str) -> Result<(), LockstoreError> {
        // Recover poisoned mutex so the entry is still removed;
        // surface the poisoning after the security-relevant clear.
        match self.password_kek_cache.lock() {
            Ok(mut g) => {
                g.remove(kek_ref);
                Ok(())
            }
            Err(p) => {
                p.into_inner().remove(kek_ref);
                Err(LockstoreError::LockingFailure(
                    "password_kek_cache poisoned".into(),
                ))
            }
        }
    }

    fn unlock_password_impl(
        &self,
        kek_ref: &str,
        password: &[u8],
        timeout: Duration,
    ) -> Result<(), LockstoreError> {
        let record = self.load_password_record(kek_ref)?.ok_or_else(|| {
            LockstoreError::InvalidKekRef(format!("no Password record for kek_ref: {}", kek_ref))
        })?;

        let mut wrapping_key = pbkdf2::derive_kek(
            password,
            &record.salt,
            record.iterations,
            record.cipher_suite.key_size(),
        )?;

        // AEAD tag verification doubles as the wrong-password check:
        // a successful decrypt means the supplied password produced the
        // same wrapping key that minted the record.
        let kek_plaintext = match crypto::decrypt_with_key(&record.ciphertext, &wrapping_key) {
            Ok(pt) => pt,
            Err(_) => {
                wrapping_key.zeroize();
                return Err(LockstoreError::WrongPassword);
            }
        };
        wrapping_key.zeroize();

        let mut guard = self
            .password_kek_cache
            .lock()
            .map_err(|_| LockstoreError::LockingFailure("password_kek_cache poisoned".into()))?;
        guard.insert(
            kek_ref.to_string(),
            CachedKek {
                kek: kek_plaintext,
                expires_at: Instant::now() + timeout,
            },
        );

        Ok(())
    }

    // ------------------------------------------------------------------------
    // PKCS#11 token-specific implementations
    // ------------------------------------------------------------------------

    fn is_pkcs11_unlocked_impl(&self, kek_ref: &str) -> Result<bool, LockstoreError> {
        let mut guard = self
            .pkcs11_kek_cache
            .lock()
            .map_err(|_| LockstoreError::LockingFailure("pkcs11_kek_cache poisoned".into()))?;
        Ok(match guard.get(kek_ref) {
            Some(cached) if cached.expires_at > Instant::now() => true,
            Some(_) => {
                guard.remove(kek_ref);
                false
            }
            None => false,
        })
    }

    /// Authenticate the slot named by the kek_ref's record and eagerly
    /// unwrap the software KEK, caching the plaintext in
    /// `pkcs11_kek_cache` for `timeout`. The wrapping key is touched
    /// once at unlock time; subsequent DEK ops read from the cache and
    /// never re-enter NSS for an unwrap.
    fn unlock_pkcs11_impl(
        &self,
        kek_ref: &str,
        secret: &[u8],
        timeout: Duration,
    ) -> Result<(), LockstoreError> {
        let record = self.load_pkcs11_record(kek_ref)?.ok_or_else(|| {
            LockstoreError::NotFound(format!("No PKCS#11 KEK record for kek_ref: {}", kek_ref))
        })?;
        let uri = nss_rs::pk11_utils::parse(&record.pkcs11_uri).map_err(|_| {
            LockstoreError::InvalidKekRef(format!(
                "Invalid PKCS#11 URI on disk for {}: {}",
                kek_ref, record.pkcs11_uri
            ))
        })?;
        let slot = self.resolve_pkcs11_slot(&uri)?;

        if !secret.is_empty() {
            // Caller-supplied PIN path: PK11_CheckUserPassword performs
            // C_Login with the given PIN, bypassing the NSS password
            // callback. NSS reports a PIN mismatch as
            // `PR_WOULD_BLOCK_ERROR`; everything else is an opaque
            // failure.
            let pin_str =
                std::str::from_utf8(secret).map_err(|_| LockstoreError::AuthenticationFailed)?;
            match slot.check_user_password(pin_str) {
                Ok(()) => {}
                Err(nss_rs::Error::Nss { name, .. }) if name == "PR_WOULD_BLOCK_ERROR" => {
                    return Err(LockstoreError::WrongPassword);
                }
                Err(_) => return Err(LockstoreError::AuthenticationFailed),
            }
        } else {
            // No PIN supplied: fall back to NSS's own password callback
            // (the embedding application's registered prompt — typically
            // PSM in Firefox).
            slot.authenticate()
                .map_err(|_| LockstoreError::AuthenticationCancelled)?;
        }

        // Slot is authenticated — unwrap the software KEK now so DEK
        // ops never need to re-enter NSS for the wrapping key.
        let wrapping_key = slot
            .find_key_by_nickname(&record.wrapping_key_nickname)
            .ok_or_else(|| {
                LockstoreError::TokenError(format!(
                    "PKCS#11 wrapping key '{}' not found on slot",
                    record.wrapping_key_nickname
                ))
            })?;
        let kek_plaintext = crypto::decrypt_with_symkey(&record.ciphertext, &wrapping_key)?;

        let mut guard = self
            .pkcs11_kek_cache
            .lock()
            .map_err(|_| LockstoreError::LockingFailure("pkcs11_kek_cache poisoned".into()))?;
        guard.insert(
            kek_ref.to_string(),
            CachedKek {
                kek: kek_plaintext,
                expires_at: Instant::now() + timeout,
            },
        );
        Ok(())
    }

    /// Load a `PasswordKekRecord` row by kek_ref. Returns `None` if the
    /// row doesn't exist.
    fn load_password_record(
        &self,
        kek_ref: &str,
    ) -> Result<Option<PasswordKekRecord>, LockstoreError> {
        let db = Database::new(&self.store, DB_NAME);
        let key = Key::from(kek_ref);
        let value = db.get(&key, &GetOptions::default())?;
        match value {
            None => Ok(None),
            Some(v) => {
                let bytes = utils::value_to_bytes(&v)?;
                let record: PasswordKekRecord = serde_json::from_slice(&bytes)?;
                Ok(Some(record))
            }
        }
    }

    fn save_password_record(
        &self,
        kek_ref: &str,
        record: &PasswordKekRecord,
    ) -> Result<(), LockstoreError> {
        let db = Database::new(&self.store, DB_NAME);
        let key = Key::from(kek_ref);
        let bytes = serde_json::to_vec(record)?;
        let value = utils::bytes_to_value(&bytes)?;
        db.put(&[(key, Some(value))])?;
        Ok(())
    }

    /// Drop the persisted `PasswordKekRecord` and any cached plaintext
    /// KEK at `kek_ref`. Idempotent: missing rows are not an error.
    fn delete_password_record(&self, kek_ref: &str) -> Result<(), LockstoreError> {
        let db = Database::new(&self.store, DB_NAME);
        let key = Key::from(kek_ref);
        if db.has(&key, &GetOptions::default())? {
            crypto::secure_delete(&self.store, DB_NAME, kek_ref)?;
        }
        if let Ok(mut guard) = self.password_kek_cache.lock() {
            guard.remove(kek_ref);
        }
        Ok(())
    }

    /// Load a `LocalKekRecord` row by kek_ref. Returns `None` if the
    /// row doesn't exist.
    fn load_local_record(&self, kek_ref: &str) -> Result<Option<LocalKekRecord>, LockstoreError> {
        let db = Database::new(&self.store, DB_NAME);
        let key = Key::from(kek_ref);
        let value = db.get(&key, &GetOptions::default())?;
        match value {
            None => Ok(None),
            Some(v) => {
                let bytes = utils::value_to_bytes(&v)?;
                let record: LocalKekRecord = serde_json::from_slice(&bytes)?;
                Ok(Some(record))
            }
        }
    }

    fn save_local_record(
        &self,
        kek_ref: &str,
        record: &LocalKekRecord,
    ) -> Result<(), LockstoreError> {
        let db = Database::new(&self.store, DB_NAME);
        let key = Key::from(kek_ref);
        let bytes = serde_json::to_vec(record)?;
        let value = utils::bytes_to_value(&bytes)?;
        db.put(&[(key, Some(value))])?;
        Ok(())
    }

    fn delete_local_record(&self, kek_ref: &str) -> Result<(), LockstoreError> {
        let db = Database::new(&self.store, DB_NAME);
        let key = Key::from(kek_ref);
        if db.has(&key, &GetOptions::default())? {
            crypto::secure_delete(&self.store, DB_NAME, kek_ref)?;
        }
        Ok(())
    }

    // ========================================================================
    // KEK retrieval
    // ========================================================================

    fn get_kek_symkey(
        &self,
        cipher_suite: CipherSuite,
        kek_ref: &str,
    ) -> Result<SymKey, LockstoreError> {
        let kek_type = KekType::from_kek_ref(kek_ref)?;
        match kek_type {
            KekType::LocalKey => {
                let record = self.load_local_record(kek_ref)?.ok_or_else(|| {
                    LockstoreError::NotFound(format!("No LocalKey record for kek_ref: {}", kek_ref))
                })?;
                Aead::import_key(cipher_suite.to_nss_algorithm(), &record.kek_bytes)
                    .map_err(|e| LockstoreError::Encryption(e.to_string()))
            }
            KekType::Pkcs11Token => self.get_kek_from_token(cipher_suite, kek_ref),
            KekType::Password => self.get_kek_from_password(cipher_suite, kek_ref),
        }
    }

    fn get_kek_from_password(
        &self,
        cipher_suite: CipherSuite,
        kek_ref: &str,
    ) -> Result<SymKey, LockstoreError> {
        let mut guard = self
            .password_kek_cache
            .lock()
            .map_err(|_| LockstoreError::LockingFailure("password_kek_cache poisoned".into()))?;
        match guard.get(kek_ref) {
            Some(cached) if cached.expires_at > Instant::now() => {
                Aead::import_key(cipher_suite.to_nss_algorithm(), &cached.kek)
                    .map_err(|e| LockstoreError::Encryption(e.to_string()))
            }
            Some(_) => {
                guard.remove(kek_ref);
                Err(LockstoreError::Locked)
            }
            None => Err(LockstoreError::Locked),
        }
    }

    fn get_kek_from_token(
        &self,
        cipher_suite: CipherSuite,
        kek_ref: &str,
    ) -> Result<SymKey, LockstoreError> {
        // The caller must `unlock_kek` first; that's where the slot is
        // authenticated and the software KEK is unwrapped + cached.
        // Absent or expired entries here mean the caller must re-unlock.
        let mut guard = self
            .pkcs11_kek_cache
            .lock()
            .map_err(|_| LockstoreError::LockingFailure("pkcs11_kek_cache poisoned".into()))?;
        match guard.get(kek_ref) {
            Some(cached) if cached.expires_at > Instant::now() => {
                Aead::import_key(cipher_suite.to_nss_algorithm(), &cached.kek)
                    .map_err(|e| LockstoreError::Encryption(e.to_string()))
            }
            Some(_) => {
                guard.remove(kek_ref);
                Err(LockstoreError::Locked)
            }
            None => Err(LockstoreError::Locked),
        }
    }

    fn load_pkcs11_record(&self, kek_ref: &str) -> Result<Option<Pkcs11KekRecord>, LockstoreError> {
        let db = Database::new(&self.store, DB_NAME);
        let key = Key::from(kek_ref);
        let value = db.get(&key, &GetOptions::default())?;
        match value {
            None => Ok(None),
            Some(v) => {
                let bytes = utils::value_to_bytes(&v)?;
                let record: Pkcs11KekRecord = serde_json::from_slice(&bytes)?;
                Ok(Some(record))
            }
        }
    }

    fn save_pkcs11_record(
        &self,
        kek_ref: &str,
        record: &Pkcs11KekRecord,
    ) -> Result<(), LockstoreError> {
        let db = Database::new(&self.store, DB_NAME);
        let key = Key::from(kek_ref);
        let bytes = serde_json::to_vec(record)?;
        let value = utils::bytes_to_value(&bytes)?;
        db.put(&[(key, Some(value))])?;
        Ok(())
    }

    /// Drop the persisted `Pkcs11KekRecord` and any cached plaintext
    /// KEK at `kek_ref`. Idempotent: missing rows are not an error.
    /// The on-disk wrapping key on the token is intentionally not
    /// deleted — it can wrap unrelated records and is cheap to leave
    /// in place; an explicit "forget this token" path can wipe it
    /// later if needed.
    fn delete_pkcs11_record(&self, kek_ref: &str) -> Result<(), LockstoreError> {
        let db = Database::new(&self.store, DB_NAME);
        let key = Key::from(kek_ref);
        if db.has(&key, &GetOptions::default())? {
            crypto::secure_delete(&self.store, DB_NAME, kek_ref)?;
        }
        if let Ok(mut guard) = self.pkcs11_kek_cache.lock() {
            guard.remove(kek_ref);
        }
        Ok(())
    }

    fn resolve_pkcs11_slot(
        &self,
        uri: &nss_rs::pk11_utils::Pkcs11Uri,
    ) -> Result<p11::Slot, LockstoreError> {
        let token_name = uri.token.as_deref().ok_or_else(|| {
            LockstoreError::InvalidKekRef("PKCS#11 URI missing token attribute".into())
        })?;

        let internal_slot = p11::Slot::internal_key_slot()
            .map_err(|e| LockstoreError::TokenError(format!("Failed to get key slot: {}", e)))?;
        if internal_slot.token_name() == token_name {
            return Ok(internal_slot);
        }

        let slots = p11::all_token_slots(p11::CKM_AES_KEY_GEN.into());
        for slot in slots {
            if slot.token_name() == token_name {
                return Ok(slot);
            }
        }

        Err(LockstoreError::TokenError(format!(
            "Token not found: {}",
            token_name
        )))
    }

    // Metadata persistence (`load_metadata`, `save_metadata`) lives on
    // `ConnectionHandle` so the type system enforces that the caller
    // holds the connection lock.
}

impl Drop for Keystore {
    /// Flush every per-`KekType` in-memory KEK cache and close the
    /// underlying kvstore connection when the last `Arc<Keystore>` is
    /// dropped. Manual `close()` callers see the same behaviour; this
    /// is the safety net for paths that just let the Arc fall out of
    /// scope.
    fn drop(&mut self) {
        // `Drop` can't surface errors. A poisoned cache mutex still lets
        // us close the SQLite handle and zeroise any in-memory KEK
        // material, which is the security-relevant work.
        let _ = self.lock();
        self.store.close();
    }
}

// ----------------------------------------------------------------------------
// Process-wide cache backing `Keystore::get`
// ----------------------------------------------------------------------------

use std::sync::{OnceLock, Weak};

/// Per-path cached keystore stored as a `Weak` so the entry self-evicts
/// when every caller has dropped its `Arc`. A `HashMap` (rather than a
/// single `OnceLock<Weak>`) keeps `Keystore::get` correct
/// across tests that exercise multiple temporary profiles in one
/// process; production has exactly one entry.
static SHARED_KEYSTORES: OnceLock<Mutex<HashMap<PathBuf, Weak<Keystore>>>> = OnceLock::new();
