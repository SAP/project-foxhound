/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use kvstore::{Database, GetOptions, Key, Store, StorePath};
use lockstore_rs::bytes_to_value;
use lockstore_rs::crypto::{
    decrypt_with_key, encrypt_with_key, generate_random_key, generate_random_nonce, secure_delete,
    zeroize, CipherSuite,
};
use lockstore_rs::value_to_bytes;
use lockstore_rs::{LockstoreError, DEFAULT_CIPHER_SUITE};
use std::sync::Arc;

fn make_store() -> Arc<Store> {
    nss_rs::init().expect("nss_rs::init");
    Arc::new(Store::new(StorePath::for_in_memory()))
}

fn store_put(store: &Store, db_name: &str, key_name: &str, data: &[u8]) {
    let db = Database::new(store, db_name);
    let key = Key::from(key_name);
    let value = bytes_to_value(data).expect("bytes_to_value");
    db.put(&[(key, Some(value))]).expect("put");
}

fn store_get(store: &Store, db_name: &str, key_name: &str) -> Option<Vec<u8>> {
    let db = Database::new(store, db_name);
    let key = Key::from(key_name);
    db.get(&key, &GetOptions::default())
        .expect("get")
        .map(|v| value_to_bytes(&v).expect("value_to_bytes"))
}

#[test]
fn test_zeroize_overwrites_with_zeros() {
    let store = make_store();
    let data = b"sensitive secret key material!!";
    store_put(&store, "testdb", "mykey", data);

    let before = store_get(&store, "testdb", "mykey").expect("should exist");
    assert_eq!(before, data);

    zeroize(&store, "testdb", "mykey").expect("zeroize");

    let after = store_get(&store, "testdb", "mykey").expect("should still exist");
    assert_eq!(after.len(), data.len());
    assert!(after.iter().all(|&b| b == 0), "all bytes should be zero");
}

#[test]
fn test_zeroize_preserves_length() {
    let store = make_store();
    let data = vec![0xFFu8; 128];
    store_put(&store, "testdb", "lenkey", &data);

    zeroize(&store, "testdb", "lenkey").expect("zeroize");

    let after = store_get(&store, "testdb", "lenkey").expect("should still exist");
    assert_eq!(after.len(), 128);
    assert!(after.iter().all(|&b| b == 0));
}

#[test]
fn test_zeroize_nonexistent_key_is_noop() {
    let store = make_store();
    zeroize(&store, "testdb", "no_such_key").expect("zeroize of missing key should succeed");
    assert!(store_get(&store, "testdb", "no_such_key").is_none());
}

#[test]
fn test_secure_delete_removes_entry() {
    let store = make_store();
    store_put(&store, "testdb", "delkey", b"will be deleted");

    assert!(store_get(&store, "testdb", "delkey").is_some());

    secure_delete(&store, "testdb", "delkey").expect("secure_delete");

    assert!(
        store_get(&store, "testdb", "delkey").is_none(),
        "entry should be gone after secure_delete"
    );
}

#[test]
fn test_secure_delete_nonexistent_key() {
    let store = make_store();
    secure_delete(&store, "testdb", "ghost").expect("secure_delete of missing key");
}

#[test]
fn test_cipher_suite_str_roundtrip() {
    for cs in [CipherSuite::Aes256Gcm, CipherSuite::ChaCha20Poly1305] {
        let s = cs.as_str();
        assert_eq!(CipherSuite::parse(s), Some(cs));
    }
}

#[test]
fn test_cipher_suite_from_str_unknown() {
    assert_eq!(CipherSuite::parse("unknown"), None);
    assert_eq!(CipherSuite::parse(""), None);
}

#[test]
fn test_encrypt_decrypt_roundtrip_aes256gcm() {
    nss_rs::init().expect("nss_rs::init");
    let key = generate_random_key(CipherSuite::Aes256Gcm);
    let plaintext = b"hello, world!";

    let ciphertext =
        encrypt_with_key(plaintext, &key, CipherSuite::Aes256Gcm).expect("encrypt failed");

    assert_ne!(ciphertext.as_slice(), plaintext.as_slice());
    assert!(ciphertext.len() > plaintext.len());

    let decrypted = decrypt_with_key(&ciphertext, &key).expect("decrypt failed");
    assert_eq!(decrypted, plaintext);
}

#[test]
fn test_encrypt_decrypt_roundtrip_chacha20() {
    nss_rs::init().expect("nss_rs::init");
    let key = generate_random_key(CipherSuite::ChaCha20Poly1305);
    let plaintext = b"hello, chacha!";

    let ciphertext =
        encrypt_with_key(plaintext, &key, CipherSuite::ChaCha20Poly1305).expect("encrypt failed");

    let decrypted = decrypt_with_key(&ciphertext, &key).expect("decrypt failed");
    assert_eq!(decrypted, plaintext);
}

#[test]
fn test_encrypt_empty_plaintext() {
    nss_rs::init().expect("nss_rs::init");
    let key = generate_random_key(CipherSuite::Aes256Gcm);

    let ciphertext = encrypt_with_key(b"", &key, CipherSuite::Aes256Gcm).expect("encrypt failed");

    let decrypted = decrypt_with_key(&ciphertext, &key).expect("decrypt failed");
    assert!(decrypted.is_empty());
}

#[test]
fn test_encrypt_large_plaintext() {
    nss_rs::init().expect("nss_rs::init");
    let key = generate_random_key(CipherSuite::Aes256Gcm);
    let plaintext = vec![0xABu8; 1_000_000];

    let ciphertext =
        encrypt_with_key(&plaintext, &key, CipherSuite::Aes256Gcm).expect("encrypt failed");

    let decrypted = decrypt_with_key(&ciphertext, &key).expect("decrypt failed");
    assert_eq!(decrypted, plaintext);
}

#[test]
fn test_encrypt_wrong_key_size() {
    let short_key = vec![0u8; 16];
    let result = encrypt_with_key(b"data", &short_key, CipherSuite::Aes256Gcm);
    assert!(matches!(result, Err(LockstoreError::Encryption(_))));
}

#[test]
fn test_decrypt_wrong_key_size() {
    let short_key = vec![0u8; 16];
    // byte 0 = Aes256Gcm id, remaining bytes are dummy ciphertext
    let fake_ct = vec![0u8; 65];
    let result = decrypt_with_key(&fake_ct, &short_key);
    assert!(matches!(result, Err(LockstoreError::Decryption(_))));
}

#[test]
fn test_decrypt_truncated_ciphertext() {
    nss_rs::init().expect("nss_rs::init");
    let key = generate_random_key(CipherSuite::Aes256Gcm);
    // byte 0 = Aes256Gcm id, then only 3 more bytes (less than nonce_size=12)
    let too_short = vec![0u8; 4];
    let result = decrypt_with_key(&too_short, &key);
    assert!(matches!(result, Err(LockstoreError::Decryption(_))));
}

#[test]
fn test_decrypt_wrong_key() {
    nss_rs::init().expect("nss_rs::init");
    let key1 = generate_random_key(CipherSuite::Aes256Gcm);
    let key2 = generate_random_key(CipherSuite::Aes256Gcm);

    let ciphertext =
        encrypt_with_key(b"secret", &key1, CipherSuite::Aes256Gcm).expect("encrypt failed");

    let result = decrypt_with_key(&ciphertext, &key2);
    assert!(matches!(result, Err(LockstoreError::Decryption(_))));
}

#[test]
fn test_encrypt_produces_different_ciphertexts() {
    nss_rs::init().expect("nss_rs::init");
    let key = generate_random_key(CipherSuite::Aes256Gcm);
    let plaintext = b"same input";

    let ct1 = encrypt_with_key(plaintext, &key, CipherSuite::Aes256Gcm).expect("encrypt failed");
    let ct2 = encrypt_with_key(plaintext, &key, CipherSuite::Aes256Gcm).expect("encrypt failed");

    assert_ne!(
        ct1, ct2,
        "two encryptions of the same plaintext should differ (random nonce)"
    );
}

#[test]
fn test_generate_random_key_length() {
    nss_rs::init().expect("nss_rs::init");
    for cs in [CipherSuite::Aes256Gcm, CipherSuite::ChaCha20Poly1305] {
        let key = generate_random_key(cs);
        assert_eq!(key.len(), cs.key_size());
    }
}

#[test]
fn test_generate_random_key_unique() {
    nss_rs::init().expect("nss_rs::init");
    let k1 = generate_random_key(CipherSuite::Aes256Gcm);
    let k2 = generate_random_key(CipherSuite::Aes256Gcm);
    assert_ne!(k1, k2);
}

#[test]
fn test_generate_random_nonce_length() {
    nss_rs::init().expect("nss_rs::init");
    for cs in [CipherSuite::Aes256Gcm, CipherSuite::ChaCha20Poly1305] {
        let nonce = generate_random_nonce(cs);
        assert_eq!(nonce.len(), cs.nonce_size());
    }
}

#[test]
fn test_default_cipher_suite_is_aes256gcm() {
    assert_eq!(DEFAULT_CIPHER_SUITE, CipherSuite::Aes256Gcm);
}
