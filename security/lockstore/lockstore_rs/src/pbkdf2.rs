/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use crate::LockstoreError;
use nss_rs::hmac::{hmac, HmacAlgorithm};

pub const PBKDF2_ITERATIONS: u32 = 800_000;
pub const PBKDF2_SALT_SIZE: usize = 16;
const HMAC_SHA256_LEN: usize = 32;

/// PBKDF2-HMAC-SHA256 (RFC 8018 §5.2) using NSS's HMAC primitive.
pub fn derive_kek(
    password: &[u8],
    salt: &[u8],
    iterations: u32,
    key_size: usize,
) -> Result<Vec<u8>, LockstoreError> {
    if iterations == 0 {
        return Err(LockstoreError::InvalidConfiguration(
            "PBKDF2 iterations must be > 0".to_string(),
        ));
    }
    if key_size == 0 {
        return Err(LockstoreError::InvalidConfiguration(
            "PBKDF2 key_size must be > 0".to_string(),
        ));
    }

    let block_count = key_size.div_ceil(HMAC_SHA256_LEN);
    let mut out = Vec::with_capacity(block_count * HMAC_SHA256_LEN);

    for i in 1u32..=block_count as u32 {
        let mut salt_block = Vec::with_capacity(salt.len() + 4);
        salt_block.extend_from_slice(salt);
        salt_block.extend_from_slice(&i.to_be_bytes());

        let mut u = hmac(&HmacAlgorithm::HMAC_SHA2_256, password, &salt_block)
            .map_err(|e| LockstoreError::Encryption(format!("PBKDF2 HMAC failed: {}", e)))?;
        let mut t = u.clone();

        for _ in 1..iterations {
            u = hmac(&HmacAlgorithm::HMAC_SHA2_256, password, &u)
                .map_err(|e| LockstoreError::Encryption(format!("PBKDF2 HMAC failed: {}", e)))?;
            for (a, b) in t.iter_mut().zip(u.iter()) {
                *a ^= *b;
            }
        }

        out.extend_from_slice(&t);
    }

    out.truncate(key_size);
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rfc_6070_vector_1() {
        // RFC 6070 defines PBKDF2-HMAC-SHA1 test vectors; RFC 7914 §11 / many
        // references provide PBKDF2-HMAC-SHA256 vectors. Using a common one:
        // password="password", salt="salt", iter=1, dkLen=32.
        let dk = derive_kek(b"password", b"salt", 1, 32).unwrap();
        let expected = [
            0x12, 0x0f, 0xb6, 0xcf, 0xfc, 0xf8, 0xb3, 0x2c, 0x43, 0xe7, 0x22, 0x52, 0x56, 0xc4,
            0xf8, 0x37, 0xa8, 0x65, 0x48, 0xc9, 0x2c, 0xcc, 0x35, 0x48, 0x08, 0x05, 0x98, 0x7c,
            0xb7, 0x0b, 0xe1, 0x7b,
        ];
        assert_eq!(dk, expected);
    }

    #[test]
    fn rfc_7914_vector_iter_2() {
        let dk = derive_kek(b"password", b"salt", 2, 32).unwrap();
        let expected = [
            0xae, 0x4d, 0x0c, 0x95, 0xaf, 0x6b, 0x46, 0xd3, 0x2d, 0x0a, 0xdf, 0xf9, 0x28, 0xf0,
            0x6d, 0xd0, 0x2a, 0x30, 0x3f, 0x8e, 0xf3, 0xc2, 0x51, 0xdf, 0xd6, 0xe2, 0xd8, 0x5a,
            0x95, 0x47, 0x4c, 0x43,
        ];
        assert_eq!(dk, expected);
    }

    #[test]
    fn deterministic_across_calls() {
        let a = derive_kek(b"hello", b"saltysalt0000000", 10_000, 32).unwrap();
        let b = derive_kek(b"hello", b"saltysalt0000000", 10_000, 32).unwrap();
        assert_eq!(a, b);
    }

    #[test]
    fn different_salt_different_key() {
        let a = derive_kek(b"hello", b"saltysalt0000000", 10_000, 32).unwrap();
        let b = derive_kek(b"hello", b"saltysalt0000001", 10_000, 32).unwrap();
        assert_ne!(a, b);
    }
}
