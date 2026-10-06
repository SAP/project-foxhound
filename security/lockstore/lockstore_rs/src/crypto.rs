/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use crate::LockstoreError;
use kvstore::{Database, GetOptions, Key, Store};
use nss_rs::aead::{Aead, AeadAlgorithms, Mode};
use nss_rs::p11;
use nss_rs::SymKey;
use serde::{Deserialize, Serialize};

pub const DEFAULT_CIPHER_SUITE: CipherSuite = CipherSuite::Aes256Gcm;

#[derive(Debug, Default, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CipherSuite {
    #[default]
    #[serde(rename = "aes256gcm")]
    Aes256Gcm,
    #[serde(rename = "chacha20poly1305")]
    ChaCha20Poly1305,
}

impl CipherSuite {
    pub const fn key_size(&self) -> usize {
        match self {
            CipherSuite::Aes256Gcm => 32,
            CipherSuite::ChaCha20Poly1305 => 32,
        }
    }

    pub const fn nonce_size(&self) -> usize {
        match self {
            CipherSuite::Aes256Gcm => 12,
            CipherSuite::ChaCha20Poly1305 => 12,
        }
    }

    pub const fn tag_size(&self) -> usize {
        match self {
            CipherSuite::Aes256Gcm => 16,
            CipherSuite::ChaCha20Poly1305 => 16,
        }
    }

    pub(crate) fn to_nss_algorithm(self) -> AeadAlgorithms {
        match self {
            CipherSuite::Aes256Gcm => AeadAlgorithms::Aes256Gcm,
            CipherSuite::ChaCha20Poly1305 => AeadAlgorithms::ChaCha20Poly1305,
        }
    }

    pub fn as_str(&self) -> &str {
        match self {
            CipherSuite::Aes256Gcm => "aes256gcm",
            CipherSuite::ChaCha20Poly1305 => "chacha20poly1305",
        }
    }

    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "aes256gcm" => Some(CipherSuite::Aes256Gcm),
            "chacha20poly1305" => Some(CipherSuite::ChaCha20Poly1305),
            _ => None,
        }
    }
}

fn cipher_suite_id(cs: CipherSuite) -> u8 {
    match cs {
        CipherSuite::Aes256Gcm => 0,
        CipherSuite::ChaCha20Poly1305 => 1,
    }
}

fn cipher_suite_from_id(id: u8) -> Option<CipherSuite> {
    match id {
        0 => Some(CipherSuite::Aes256Gcm),
        1 => Some(CipherSuite::ChaCha20Poly1305),
        _ => None,
    }
}

/// Parse the cipher-suite id from the leading byte of a self-describing
/// ciphertext blob produced by `encrypt_with_symkey` /
/// `encrypt_with_key`. Returns `Decryption` on an empty blob or an
/// unknown id.
pub(crate) fn cipher_suite_of_blob(blob: &[u8]) -> Result<CipherSuite, LockstoreError> {
    if blob.is_empty() {
        return Err(LockstoreError::Decryption(
            "Ciphertext is empty".to_string(),
        ));
    }
    cipher_suite_from_id(blob[0])
        .ok_or_else(|| LockstoreError::Decryption(format!("Unknown cipher suite id: {}", blob[0])))
}

fn random_bytes(size: usize) -> Vec<u8> {
    let mut buf = vec![0u8; size];
    p11::randomize(&mut buf);
    buf
}

pub fn generate_random_key(cipher_suite: CipherSuite) -> Vec<u8> {
    random_bytes(cipher_suite.key_size())
}

pub fn generate_random_nonce(cipher_suite: CipherSuite) -> Vec<u8> {
    random_bytes(cipher_suite.nonce_size())
}

/// `len` random bytes from NSS's PRNG. Use for salts and any other
/// random byte string whose size is not derived from a `CipherSuite`.
/// For nonces tied to a cipher suite, use `generate_random_nonce`; for
/// symmetric keys, use `generate_random_key`.
pub fn generate_random_bytes(len: usize) -> Vec<u8> {
    random_bytes(len)
}

/// Encrypts data using AEAD with a SymKey handle.
/// The returned blob is self-describing: [cipher_suite_id(1)] || [nonce] || [ciphertext+tag].
pub fn encrypt_with_symkey(
    plaintext: &[u8],
    key: &SymKey,
    cipher_suite: CipherSuite,
) -> Result<Vec<u8>, LockstoreError> {
    let nonce = generate_random_nonce(cipher_suite);
    let mut nonce_bytes = [0u8; 12];
    nonce_bytes[..nonce.len()].copy_from_slice(&nonce);

    let alg = cipher_suite.to_nss_algorithm();
    let mut aead = Aead::new(Mode::Encrypt, alg, key, nonce_bytes)
        .map_err(|e| LockstoreError::Encryption(format!("Failed to create AEAD: {}", e)))?;

    // The cipher-suite id is prepended to the blob as its first byte;
    // pass that same byte as AAD so the AEAD tag authenticates it
    // directly. Tampering with the prefix is then caught by tag
    // verification, not just by our own prefix consistency check.
    let aad = [cipher_suite_id(cipher_suite)];
    let ciphertext = aead
        .encrypt(&aad, plaintext)
        .map_err(|e| LockstoreError::Encryption(format!("Encryption failed: {}", e)))?;

    let mut result = Vec::with_capacity(1 + nonce.len() + ciphertext.len());
    result.push(aad[0]);
    result.extend_from_slice(&nonce);
    result.extend_from_slice(&ciphertext);

    Ok(result)
}

/// Decrypts data produced by `encrypt_with_symkey` or `encrypt_with_key`.
/// The cipher suite is inferred from the blob's leading byte.
pub fn decrypt_with_symkey(ciphertext: &[u8], key: &SymKey) -> Result<Vec<u8>, LockstoreError> {
    if ciphertext.is_empty() {
        return Err(LockstoreError::Decryption(
            "Ciphertext is empty".to_string(),
        ));
    }

    let suite_byte = ciphertext[0];
    let cipher_suite = cipher_suite_from_id(suite_byte).ok_or_else(|| {
        LockstoreError::Decryption(format!("Unknown cipher suite id: {}", suite_byte))
    })?;
    let ciphertext = &ciphertext[1..];
    let nonce_size = cipher_suite.nonce_size();

    if ciphertext.len() < nonce_size {
        return Err(LockstoreError::Decryption(
            "Ciphertext too short to contain nonce".to_string(),
        ));
    }

    let mut nonce_bytes = [0u8; 12];
    nonce_bytes[..nonce_size].copy_from_slice(&ciphertext[..nonce_size]);
    let actual_ciphertext = &ciphertext[nonce_size..];

    let alg = cipher_suite.to_nss_algorithm();
    let mut aead = Aead::new(Mode::Decrypt, alg, key, nonce_bytes)
        .map_err(|e| LockstoreError::Decryption(format!("Failed to create AEAD: {}", e)))?;

    // AAD = the suite-id prefix byte (see `encrypt_with_symkey`); tag
    // verification fails if the prefix has been tampered with.
    let aad = [suite_byte];
    let plaintext = aead
        .decrypt(&aad, 0, actual_ciphertext)
        .map_err(|e| LockstoreError::Decryption(format!("Decryption failed: {}", e)))?;

    Ok(plaintext)
}

/// Encrypts data using AEAD with raw key bytes.
/// The returned blob is self-describing: [cipher_suite_id(1)] || [nonce] || [ciphertext+tag].
pub fn encrypt_with_key(
    plaintext: &[u8],
    key: &[u8],
    cipher_suite: CipherSuite,
) -> Result<Vec<u8>, LockstoreError> {
    if key.len() != cipher_suite.key_size() {
        return Err(LockstoreError::Encryption(format!(
            "Invalid key size: expected {}, got {}",
            cipher_suite.key_size(),
            key.len()
        )));
    }
    let alg = cipher_suite.to_nss_algorithm();
    let nss_key = Aead::import_key(alg, key)
        .map_err(|e| LockstoreError::Encryption(format!("Failed to import key: {}", e)))?;
    encrypt_with_symkey(plaintext, &nss_key, cipher_suite)
}

/// Decrypts data produced by `encrypt_with_key`.
/// The cipher suite is inferred from the blob's leading byte.
pub fn decrypt_with_key(ciphertext: &[u8], key: &[u8]) -> Result<Vec<u8>, LockstoreError> {
    if ciphertext.is_empty() {
        return Err(LockstoreError::Decryption(
            "Ciphertext is empty".to_string(),
        ));
    }
    let cipher_suite = cipher_suite_from_id(ciphertext[0]).ok_or_else(|| {
        LockstoreError::Decryption(format!("Unknown cipher suite id: {}", ciphertext[0]))
    })?;
    if key.len() != cipher_suite.key_size() {
        return Err(LockstoreError::Decryption(format!(
            "Invalid key size: expected {}, got {}",
            cipher_suite.key_size(),
            key.len()
        )));
    }
    let alg = cipher_suite.to_nss_algorithm();
    let nss_key = Aead::import_key(alg, key)
        .map_err(|e| LockstoreError::Decryption(format!("Failed to import key: {}", e)))?;
    decrypt_with_symkey(ciphertext, &nss_key)
}

/// Overwrites a stored value with zeros of the same size (does not delete).
///
/// Note: this is best-effort in-memory sanitization only. SQLite's WAL/journal
/// mode means the original bytes may persist on disk until the relevant WAL
/// pages are checkpointed and overwritten.
pub fn zeroize(store: &Store, db_name: &str, key_name: &str) -> Result<(), LockstoreError> {
    let db = Database::new(store, db_name);
    let key = Key::from(key_name);
    if let Some(value) = db.get(&key, &GetOptions::default())? {
        let bytes = crate::utils::value_to_bytes(&value)?;
        let zeros = vec![0u8; bytes.len()];
        let zero_value = crate::utils::bytes_to_value(&zeros)?;
        db.put(&[(key, Some(zero_value))])?;
    }
    Ok(())
}

/// Overwrites a stored value with zeros, then deletes the entry.
pub fn secure_delete(store: &Store, db_name: &str, key_name: &str) -> Result<(), LockstoreError> {
    zeroize(store, db_name, key_name)?;
    let db = Database::new(store, db_name);
    let key = Key::from(key_name);
    db.delete(&key)?;
    Ok(())
}
