/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use lockstore_rs::{CipherSuite, KekType, Keystore, LockstoreError};
use std::time::Duration;
use tempfile::tempdir;

fn mint_local(ks: &Keystore) -> String {
    ks.create_kek(KekType::LocalKey, "", b"", Duration::ZERO)
        .expect("create local kek")
}

/// Well-formed LocalKey-typed kek_ref with no backing DB record.
/// Used in tests that exercise the "kek_ref not found" code paths.
const BOGUS_LOCAL: &str = "lockstore::kek::local:nonexistent-id";

#[test]
fn test_new_in_memory() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    keystore.close();
}

#[test]
fn test_create_dek() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);

    keystore
        .create_dek("col1", &local, true)
        .expect("Failed to create DEK");

    let collections = keystore.list_deks().expect("Failed to list");
    assert_eq!(collections, vec!["col1"]);

    keystore.close();
}

#[test]
fn test_create_dek_duplicate_fails() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);

    keystore
        .create_dek("dup", &local, true)
        .expect("Failed to create DEK");

    let result = keystore.create_dek("dup", &local, true);
    assert!(matches!(
        result,
        Err(LockstoreError::InvalidConfiguration(_))
    ));

    keystore.close();
}

#[test]
fn test_delete_dek() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);

    keystore
        .create_dek("to_delete", &local, true)
        .expect("Failed to create DEK");

    keystore.delete_dek("to_delete").expect("Failed to delete");

    let collections = keystore.list_deks().expect("Failed to list");
    assert!(collections.is_empty());

    keystore.close();
}

#[test]
fn test_delete_dek_nonexistent() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");

    let result = keystore.delete_dek("nonexistent");
    assert!(matches!(result, Err(LockstoreError::NotFound(_))));

    keystore.close();
}

#[test]
fn test_extractable_dek() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);

    keystore
        .create_dek("extractable", &local, true)
        .expect("Failed to create DEK");

    assert!(keystore
        .is_dek_extractable("extractable")
        .expect("Failed to check"));

    let (key, cipher_suite) = keystore
        .get_dek("extractable", &local)
        .expect("Failed to get DEK");
    assert!(!key.is_empty());
    assert_eq!(cipher_suite, CipherSuite::Aes256Gcm);

    keystore.close();
}

#[test]
fn test_non_extractable_dek() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);

    keystore
        .create_dek("non_extractable", &local, false)
        .expect("Failed to create DEK");

    assert!(!keystore
        .is_dek_extractable("non_extractable")
        .expect("Failed to check"));

    let result = keystore.get_dek("non_extractable", &local);
    assert!(matches!(result, Err(LockstoreError::NotExtractable(_))));

    keystore.close();
}

#[test]
fn test_create_dek_with_aes256gcm() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);

    keystore
        .create_dek_with_cipher("aes_col", &local, true, CipherSuite::Aes256Gcm)
        .expect("Failed to create DEK");

    let (_key, cipher_suite) = keystore
        .get_dek("aes_col", &local)
        .expect("Failed to get DEK");
    assert_eq!(cipher_suite, CipherSuite::Aes256Gcm);

    keystore.close();
}

#[test]
fn test_create_dek_with_chacha20() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);

    keystore
        .create_dek_with_cipher("chacha_col", &local, true, CipherSuite::ChaCha20Poly1305)
        .expect("Failed to create DEK");

    let (_key, cipher_suite) = keystore
        .get_dek("chacha_col", &local)
        .expect("Failed to get DEK");
    assert_eq!(cipher_suite, CipherSuite::ChaCha20Poly1305);

    keystore.close();
}

#[test]
fn test_get_dek_returns_correct_data() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);

    keystore
        .create_dek("get_test", &local, true)
        .expect("Failed to create DEK");

    let (key, cipher_suite) = keystore
        .get_dek("get_test", &local)
        .expect("Failed to get DEK");

    assert_eq!(key.len(), cipher_suite.key_size());
    assert_eq!(cipher_suite, CipherSuite::Aes256Gcm);

    keystore.close();
}

#[test]
fn test_list_deks_empty() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");

    let collections = keystore.list_deks().expect("Failed to list");
    assert!(collections.is_empty());

    keystore.close();
}

#[test]
fn test_list_deks_single() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);

    keystore
        .create_dek("only", &local, true)
        .expect("Failed to create DEK");

    let collections = keystore.list_deks().expect("Failed to list");
    assert_eq!(collections, vec!["only"]);

    keystore.close();
}

#[test]
fn test_list_deks_multiple() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);

    keystore
        .create_dek("alpha", &local, true)
        .expect("Failed to create DEK");
    keystore
        .create_dek("beta", &local, false)
        .expect("Failed to create DEK");
    keystore
        .create_dek("gamma", &local, true)
        .expect("Failed to create DEK");

    let collections = keystore.list_deks().expect("Failed to list");
    assert_eq!(collections.len(), 3);
    assert!(collections.contains(&"alpha".to_string()));
    assert!(collections.contains(&"beta".to_string()));
    assert!(collections.contains(&"gamma".to_string()));

    keystore.close();
}

#[test]
fn test_list_deks_after_delete() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);

    keystore
        .create_dek("a", &local, true)
        .expect("Failed to create DEK");
    keystore
        .create_dek("b", &local, true)
        .expect("Failed to create DEK");

    keystore.delete_dek("a").expect("Failed to delete");

    let collections = keystore.list_deks().expect("Failed to list");
    assert_eq!(collections, vec!["b"]);

    keystore.close();
}

#[test]
fn test_list_keks_after_create_dek() {
    let keystore = Keystore::new_in_memory().unwrap();
    let local = mint_local(&keystore);
    keystore.create_dek("col", &local, true).unwrap();

    let refs = keystore.list_keks("col").unwrap();
    assert_eq!(refs, vec![local.clone()]);

    keystore.close();
}

#[test]
fn test_list_keks_after_add_kek() {
    let keystore = Keystore::new_in_memory().unwrap();
    let local = mint_local(&keystore);
    let test = mint_local(&keystore);
    keystore.create_dek("col", &local, true).unwrap();
    keystore.add_kek("col", &local, &test).unwrap();

    let refs = keystore.list_keks("col").unwrap();
    assert_eq!(refs.len(), 2);
    assert!(refs.contains(&local));
    assert!(refs.contains(&test.clone()));

    keystore.close();
}

#[test]
fn test_list_keks_after_remove_kek() {
    let keystore = Keystore::new_in_memory().unwrap();
    let local = mint_local(&keystore);
    let test = mint_local(&keystore);
    keystore.create_dek("col", &local, true).unwrap();
    keystore.add_kek("col", &local, &test).unwrap();
    keystore.remove_kek("col", &local).unwrap();

    let refs = keystore.list_keks("col").unwrap();
    assert_eq!(refs, vec![test.clone()]);

    keystore.close();
}

#[test]
fn test_list_keks_unknown_dek() {
    let keystore = Keystore::new_in_memory().unwrap();
    let result = keystore.list_keks("nonexistent");
    assert!(matches!(result, Err(LockstoreError::NotFound(_))));

    keystore.close();
}

#[test]
fn test_get_dek_missing_collection() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);

    let result = keystore.get_dek("nonexistent", &local);
    assert!(matches!(result, Err(LockstoreError::NotFound(_))));

    keystore.close();
}

#[test]
fn test_is_dek_extractable_missing_collection() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");

    let result = keystore.is_dek_extractable("nonexistent");
    assert!(matches!(result, Err(LockstoreError::NotFound(_))));

    keystore.close();
}

#[test]
fn test_close() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    keystore.close();
}

#[test]
fn test_new_on_disk() {
    let dir = tempdir().expect("Failed to create temp dir");
    let path = dir.path().join("keystore.sqlite");

    let keystore = Keystore::get(path).expect("Failed to create on-disk keystore");
    let local = mint_local(&keystore);
    keystore
        .create_dek("col1", &local, true)
        .expect("Failed to create DEK");

    let collections = keystore.list_deks().expect("Failed to list");
    assert_eq!(collections, vec!["col1"]);

    keystore.close();
}

#[test]
fn test_on_disk_persistence() {
    let dir = tempdir().expect("Failed to create temp dir");
    let path = dir.path().join("keystore.sqlite");

    let key_material;
    let local;
    {
        let keystore = Keystore::get(path.clone()).expect("Failed to create on-disk keystore");
        local = mint_local(&keystore);
        keystore
            .create_dek("persist", &local, true)
            .expect("Failed to create DEK");
        let (key, _cs) = keystore
            .get_dek("persist", &local)
            .expect("Failed to get DEK");
        key_material = key;
        keystore.close();
    }

    let keystore = Keystore::get(path).expect("Failed to reopen keystore");
    let (key, cipher_suite) = keystore
        .get_dek("persist", &local)
        .expect("DEK should persist");
    assert_eq!(key, key_material);
    assert_eq!(cipher_suite, CipherSuite::Aes256Gcm);

    keystore.close();
}

#[test]
fn test_on_disk_list_deks_persists() {
    let dir = tempdir().expect("Failed to create temp dir");
    let path = dir.path().join("keystore.sqlite");

    {
        let keystore = Keystore::get(path.clone()).expect("Failed to create on-disk keystore");
        let local = mint_local(&keystore);
        keystore
            .create_dek("alpha", &local, true)
            .expect("Failed to create DEK");
        keystore
            .create_dek("beta", &local, false)
            .expect("Failed to create DEK");
        keystore
            .create_dek("gamma", &local, true)
            .expect("Failed to create DEK");
        keystore.close();
    }

    let keystore = Keystore::get(path).expect("Failed to reopen keystore");
    let collections = keystore.list_deks().expect("Failed to list");
    assert_eq!(collections.len(), 3);
    assert!(collections.contains(&"alpha".to_string()));
    assert!(collections.contains(&"beta".to_string()));
    assert!(collections.contains(&"gamma".to_string()));

    keystore.close();
}

#[test]
fn test_on_disk_delete_dek_persists() {
    let dir = tempdir().expect("Failed to create temp dir");
    let path = dir.path().join("keystore.sqlite");

    let local;
    {
        let keystore = Keystore::get(path.clone()).expect("Failed to create on-disk keystore");
        local = mint_local(&keystore);
        keystore
            .create_dek("to_delete", &local, true)
            .expect("Failed to create DEK");
        keystore
            .delete_dek("to_delete")
            .expect("Failed to delete DEK");
        keystore.close();
    }

    let keystore = Keystore::get(path).expect("Failed to reopen keystore");
    let result = keystore.get_dek("to_delete", &local);
    assert!(matches!(result, Err(LockstoreError::NotFound(_))));

    let collections = keystore.list_deks().expect("Failed to list");
    assert!(collections.is_empty());

    keystore.close();
}

#[test]
fn test_add_kek() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);
    let test = mint_local(&keystore);

    keystore
        .create_dek("col", &local, true)
        .expect("Failed to create DEK");

    keystore
        .add_kek("col", &local, &test)
        .expect("Failed to add security level");

    let (key_local, _) = keystore
        .get_dek("col", &local)
        .expect("Failed to get via LocalKey");
    let (key_test, _) = keystore
        .get_dek("col", &test)
        .expect("Failed to get via Test");

    assert_eq!(
        key_local, key_test,
        "both levels should decrypt to the same DEK"
    );

    keystore.close();
}

#[test]
fn test_add_duplicate_kek_fails() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);

    keystore
        .create_dek("col", &local, true)
        .expect("Failed to create DEK");

    let result = keystore.add_kek("col", &local, &local);
    assert!(matches!(
        result,
        Err(LockstoreError::InvalidConfiguration(_))
    ));

    keystore.close();
}

#[test]
fn test_add_kek_missing_source_fails() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);
    let target = mint_local(&keystore);

    keystore
        .create_dek("col", &local, true)
        .expect("Failed to create DEK");

    let result = keystore.add_kek("col", BOGUS_LOCAL, &target);
    assert!(matches!(result, Err(LockstoreError::NotFound(_))));

    keystore.close();
}

#[test]
fn test_remove_kek() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);
    let test = mint_local(&keystore);

    keystore
        .create_dek("col", &local, true)
        .expect("Failed to create DEK");
    keystore
        .add_kek("col", &local, &test)
        .expect("Failed to add security level");

    keystore
        .remove_kek("col", &test)
        .expect("Failed to remove security level");

    let result = keystore.get_dek("col", &test);
    assert!(matches!(result, Err(LockstoreError::NotFound(_))));

    let (key, _) = keystore
        .get_dek("col", &local)
        .expect("LocalKey should still work");
    assert!(!key.is_empty());

    keystore.close();
}

#[test]
fn test_remove_last_kek_fails() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);

    keystore
        .create_dek("col", &local, true)
        .expect("Failed to create DEK");

    let result = keystore.remove_kek("col", &local);
    assert!(matches!(
        result,
        Err(LockstoreError::InvalidConfiguration(_))
    ));

    keystore.close();
}

#[test]
fn test_remove_kek_authenticates() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);
    let test = mint_local(&keystore);

    keystore
        .create_dek("col", &local, true)
        .expect("Failed to create DEK");
    keystore
        .add_kek("col", &local, &test)
        .expect("Failed to add security level");

    keystore
        .remove_kek("col", &test)
        .expect("Should authenticate and remove successfully");

    keystore.close();
}

#[test]
fn test_remove_nonexistent_kek_fails() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);
    let test = mint_local(&keystore);

    keystore
        .create_dek("col", &local, true)
        .expect("Failed to create DEK");
    keystore
        .add_kek("col", &local, &test)
        .expect("Failed to add security level");

    let result = keystore.remove_kek("missing_col", &local);
    assert!(matches!(result, Err(LockstoreError::NotFound(_))));

    keystore.close();
}

#[test]
fn test_invalid_kek_ref() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");

    let result = keystore.create_dek("col", "invalid::ref", true);
    assert!(matches!(result, Err(LockstoreError::InvalidKekRef(_))));

    keystore.close();
}

#[test]
fn test_encrypt_decrypt_roundtrip() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);
    keystore
        .create_dek("col", &local, false)
        .expect("Failed to create DEK");

    let plaintext = b"hello, lockstore";
    let blob = keystore
        .encrypt("col", &local, plaintext)
        .expect("Failed to encrypt");
    assert_ne!(blob.as_slice(), &plaintext[..]);
    let round = keystore
        .decrypt("col", &local, &blob)
        .expect("Failed to decrypt");
    assert_eq!(round, plaintext);

    keystore.close();
}

#[test]
fn test_encrypt_empty_plaintext() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);
    keystore
        .create_dek("col", &local, false)
        .expect("Failed to create DEK");

    let blob = keystore.encrypt("col", &local, b"").expect("encrypt empty");
    let round = keystore
        .decrypt("col", &local, &blob)
        .expect("decrypt empty");
    assert!(round.is_empty());

    keystore.close();
}

#[test]
fn test_encrypt_produces_unique_ciphertexts() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);
    keystore
        .create_dek("col", &local, false)
        .expect("Failed to create DEK");

    let a = keystore.encrypt("col", &local, b"same").expect("encrypt a");
    let b = keystore.encrypt("col", &local, b"same").expect("encrypt b");
    assert_ne!(
        a, b,
        "two encryptions of the same plaintext must differ (nonce randomness)"
    );

    keystore.close();
}

#[test]
fn test_encrypt_bypasses_extractability() {
    // encrypt/decrypt must work on a non-extractable DEK even though get_dek refuses.
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);
    keystore
        .create_dek("col", &local, false)
        .expect("Failed to create DEK");

    assert!(matches!(
        keystore.get_dek("col", &local),
        Err(LockstoreError::NotExtractable(_))
    ));

    let blob = keystore.encrypt("col", &local, b"abc").expect("encrypt");
    let round = keystore.decrypt("col", &local, &blob).expect("decrypt");
    assert_eq!(round, b"abc");

    keystore.close();
}

#[test]
fn test_encrypt_missing_collection() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);
    let err = keystore.encrypt("nosuch", &local, b"x").unwrap_err();
    assert!(matches!(err, LockstoreError::NotFound(_)));
    keystore.close();
}

#[test]
fn test_encrypt_unknown_kek_ref_on_existing_collection() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);
    keystore
        .create_dek("col", &local, false)
        .expect("Failed to create DEK");

    let err = keystore.encrypt("col", BOGUS_LOCAL, b"x").unwrap_err();
    assert!(matches!(err, LockstoreError::NotFound(_)));
    keystore.close();
}

#[test]
fn test_encrypt_invalid_kek_ref() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);
    keystore
        .create_dek("col", &local, false)
        .expect("Failed to create DEK");

    let err = keystore.encrypt("col", "bogus::ref", b"x").unwrap_err();
    assert!(matches!(err, LockstoreError::InvalidKekRef(_)));
    keystore.close();
}

#[test]
fn test_decrypt_tampered_ciphertext_fails() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);
    keystore
        .create_dek("col", &local, false)
        .expect("Failed to create DEK");

    let mut blob = keystore.encrypt("col", &local, b"hello").expect("encrypt");
    // Flip a byte past the cipher-suite prefix and nonce so the AEAD tag rejects.
    let last = blob.len() - 1;
    blob[last] ^= 0x01;
    let err = keystore.decrypt("col", &local, &blob).unwrap_err();
    assert!(matches!(err, LockstoreError::Decryption(_)));

    keystore.close();
}

#[test]
fn test_decrypt_empty_ciphertext_fails() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);
    keystore
        .create_dek("col", &local, false)
        .expect("Failed to create DEK");

    let err = keystore.decrypt("col", &local, &[]).unwrap_err();
    assert!(matches!(err, LockstoreError::Decryption(_)));
    keystore.close();
}

#[test]
fn test_decrypt_tampered_cipher_suite_prefix_fails() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);
    keystore
        .create_dek_with_cipher("col", &local, false, CipherSuite::Aes256Gcm)
        .expect("create DEK");
    let mut blob = keystore.encrypt("col", &local, b"hello").expect("encrypt");
    assert_eq!(blob[0], 0, "fresh blob carries the Aes256Gcm id");
    blob[0] = 1;
    let err = keystore.decrypt("col", &local, &blob).unwrap_err();
    match err {
        LockstoreError::Decryption(msg) => {
            assert!(
                msg.contains("cipher-suite mismatch"),
                "expected cipher-suite mismatch message, got: {}",
                msg
            );
        }
        other => panic!(
            "expected Decryption(cipher-suite mismatch), got {:?}",
            other
        ),
    }
    keystore.close();
}

#[test]
fn test_decrypt_unknown_cipher_suite_prefix_fails() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);
    keystore
        .create_dek("col", &local, false)
        .expect("create DEK");
    let mut blob = keystore.encrypt("col", &local, b"hello").expect("encrypt");
    blob[0] = 0xff;
    let err = keystore.decrypt("col", &local, &blob).unwrap_err();
    match err {
        LockstoreError::Decryption(msg) => {
            assert!(
                msg.contains("Unknown cipher suite id"),
                "expected unknown-id message, got: {}",
                msg
            );
        }
        other => panic!(
            "expected Decryption(Unknown cipher suite id), got {:?}",
            other
        ),
    }
    keystore.close();
}

#[test]
fn test_decrypt_truncated_ciphertext_fails() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);
    keystore
        .create_dek("col", &local, false)
        .expect("create DEK");
    let blob = keystore.encrypt("col", &local, b"hello").expect("encrypt");
    assert!(blob.len() > 16, "blob should be > tag size");
    let truncated = &blob[..blob.len() - 16];
    let err = keystore.decrypt("col", &local, truncated).unwrap_err();
    assert!(matches!(err, LockstoreError::Decryption(_)));
    keystore.close();
}

#[test]
fn test_decrypt_with_wrong_dek_fails() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);
    keystore.create_dek("a", &local, false).expect("create A");
    keystore.create_dek("b", &local, false).expect("create B");
    let blob = keystore.encrypt("a", &local, b"hello").expect("encrypt A");
    let err = keystore.decrypt("b", &local, &blob).unwrap_err();
    assert!(matches!(err, LockstoreError::Decryption(_)));
    keystore.close();
}

#[test]
fn test_encrypt_decrypt_across_keks_share_dek() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);
    let test = mint_local(&keystore);
    keystore
        .create_dek("col", &local, true)
        .expect("Failed to create DEK");
    keystore
        .add_kek("col", &local, &test)
        .expect("Failed to add level");

    let blob = keystore
        .encrypt("col", &local, b"cross-level")
        .expect("encrypt at local");
    let round = keystore
        .decrypt("col", &test, &blob)
        .expect("decrypt at test");
    assert_eq!(round, b"cross-level");

    keystore.close();
}

#[test]
fn test_two_independent_local_keks() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let a = mint_local(&keystore);
    let b = mint_local(&keystore);
    assert_ne!(a, b, "createKek must mint a distinct kek_ref each call");

    keystore.close();
}

#[test]
fn test_two_deks_under_same_kek_differ() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let kek = mint_local(&keystore);

    keystore.create_dek("col-a", &kek, true).expect("create A");
    keystore.create_dek("col-b", &kek, true).expect("create B");

    let (dek_a, _) = keystore.get_dek("col-a", &kek).expect("get A");
    let (dek_b, _) = keystore.get_dek("col-b", &kek).expect("get B");
    assert_ne!(
        dek_a, dek_b,
        "two createDek calls under the same KEK must produce independent random DEKs"
    );

    keystore.close();
}

// ---------------------------------------------------------------------------
// Process-wide shared keystore accessor (`Keystore::get`).
// ---------------------------------------------------------------------------

#[test]
fn test_keystore_get_returns_same_arc() {
    use std::sync::Arc;

    let dir = tempdir().expect("Failed to create temp dir");
    let path = dir.path().join("lockstore.keys.sqlite");

    let a = Keystore::get(path.clone()).expect("first open");
    let b = Keystore::get(path.clone()).expect("second open");
    assert!(
        Arc::ptr_eq(&a, &b),
        "two calls with the same path must return the same Arc"
    );
}

#[test]
fn test_keystore_get_distinct_paths() {
    use std::sync::Arc;

    let dir_a = tempdir().expect("Failed to create temp dir A");
    let dir_b = tempdir().expect("Failed to create temp dir B");
    let path_a = dir_a.path().join("lockstore.keys.sqlite");
    let path_b = dir_b.path().join("lockstore.keys.sqlite");

    let a = Keystore::get(path_a).expect("open A");
    let b = Keystore::get(path_b).expect("open B");
    assert!(
        !Arc::ptr_eq(&a, &b),
        "different paths must yield distinct Arcs"
    );
}

#[test]
fn test_keystore_get_state_visible_across_handles() {
    let dir = tempdir().expect("Failed to create temp dir");
    let path = dir.path().join("lockstore.keys.sqlite");

    let a = Keystore::get(path.clone()).expect("first open");
    let local = mint_local(&a);
    a.create_dek("shared-state", &local, true)
        .expect("create DEK via first handle");

    let b = Keystore::get(path).expect("second open");
    let collections = b.list_deks().expect("list via second handle");
    assert!(
        collections.contains(&"shared-state".to_string()),
        "DEK created via the first handle must be visible via the second"
    );
}

#[test]
fn test_import_dek_local_key() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);

    let dek = [7u8; 32];
    keystore
        .import_dek("imported", &local, &dek, true)
        .expect("Failed to import DEK");

    let (round, suite) = keystore
        .get_dek("imported", &local)
        .expect("Failed to get imported DEK");
    assert_eq!(round, dek, "round-tripped DEK matches imported bytes");
    assert_eq!(suite, CipherSuite::Aes256Gcm);

    let ct = keystore
        .encrypt("imported", &local, b"payload")
        .expect("encrypt");
    let pt = keystore.decrypt("imported", &local, &ct).expect("decrypt");
    assert_eq!(pt, b"payload");

    keystore.close();
}

#[test]
fn test_import_dek_rejects_wrong_length() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);

    let short = [9u8; 16];
    let result = keystore.import_dek("short", &local, &short, true);
    assert!(matches!(
        result,
        Err(LockstoreError::InvalidConfiguration(_))
    ));

    keystore.close();
}

#[test]
fn test_import_dek_rejects_existing_collection() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);

    let dek = [3u8; 32];
    keystore
        .import_dek("dup", &local, &dek, true)
        .expect("first import");

    let result = keystore.import_dek("dup", &local, &dek, true);
    assert!(matches!(
        result,
        Err(LockstoreError::InvalidConfiguration(_))
    ));

    keystore.close();
}

#[test]
fn test_import_dek_non_extractable() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);

    let dek = [11u8; 32];
    keystore
        .import_dek("hidden", &local, &dek, false)
        .expect("import");

    assert!(!keystore
        .is_dek_extractable("hidden")
        .expect("query extractability"));

    let result = keystore.get_dek("hidden", &local);
    assert!(matches!(result, Err(LockstoreError::NotExtractable(_))));

    let ct = keystore
        .encrypt("hidden", &local, b"opaque")
        .expect("encrypt");
    let pt = keystore.decrypt("hidden", &local, &ct).expect("decrypt");
    assert_eq!(pt, b"opaque");

    keystore.close();
}

#[test]
fn test_switch_kek_local_to_test() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);
    let test = mint_local(&keystore);

    keystore
        .create_dek("col", &local, true)
        .expect("Failed to create DEK");
    let (before, _) = keystore.get_dek("col", &local).expect("get DEK before");

    keystore
        .switch_kek("col", &local, &test)
        .expect("Failed to switch KEK");

    let keks = keystore.list_keks("col").expect("list keks");
    assert_eq!(
        keks,
        vec![test.clone()],
        "only the new kek_ref should wrap the collection after switch"
    );

    let (after, _) = keystore
        .get_dek("col", &test)
        .expect("get DEK via new kek_ref");
    assert_eq!(before, after, "DEK bytes are unchanged across switch");

    let missing = keystore.get_dek("col", &local);
    assert!(
        matches!(missing, Err(LockstoreError::NotFound(_))),
        "old kek_ref no longer wraps the collection"
    );

    keystore.close();
}

#[test]
fn test_switch_kek_rejects_same_ref() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);

    keystore.create_dek("col", &local, true).expect("create");
    let result = keystore.switch_kek("col", &local, &local);
    assert!(matches!(
        result,
        Err(LockstoreError::InvalidConfiguration(_))
    ));

    keystore.close();
}

#[test]
fn test_switch_kek_rejects_new_already_wraps() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);
    let test = mint_local(&keystore);

    keystore.create_dek("col", &local, true).expect("create");
    keystore
        .add_kek("col", &local, &test)
        .expect("add second KEK");

    let result = keystore.switch_kek("col", &local, &test);
    assert!(matches!(
        result,
        Err(LockstoreError::InvalidConfiguration(_))
    ));

    keystore.close();
}

#[test]
fn test_switch_kek_rejects_missing_old() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);

    keystore.create_dek("col", &local, true).expect("create");
    let result = keystore.switch_kek("col", BOGUS_LOCAL, &local);
    assert!(matches!(result, Err(LockstoreError::NotFound(_))));

    keystore.close();
}

#[test]
fn test_switch_kek_preserves_ciphertext() {
    let keystore = Keystore::new_in_memory().expect("Failed to create keystore");
    let local = mint_local(&keystore);
    let test = mint_local(&keystore);

    keystore.create_dek("col", &local, false).expect("create");
    let ct = keystore
        .encrypt("col", &local, b"pre-switch")
        .expect("encrypt before switch");

    keystore.switch_kek("col", &local, &test).expect("switch");

    let pt = keystore
        .decrypt("col", &test, &ct)
        .expect("decrypt after switch");
    assert_eq!(pt, b"pre-switch");

    keystore.close();
}

#[test]
fn test_create_kek_identifier_deterministic_and_idempotent() {
    let keystore = Keystore::new_in_memory().expect("keystore");
    // A non-empty identifier yields a deterministic, well-known kek_ref.
    let kek = keystore
        .create_kek(KekType::LocalKey, "sqlite", b"", Duration::ZERO)
        .expect("create with identifier");
    assert_eq!(kek, "lockstore::kek::local:sqlite");

    // Wrap a DEK and produce a ciphertext under it.
    keystore.create_dek("c", &kek, false).expect("create dek");
    let ct = keystore.encrypt("c", &kek, b"hello").expect("encrypt");

    // A second create with the same identifier is get-or-create: same ref,
    // and it must NOT regenerate the KEK bytes, so the earlier ciphertext
    // still decrypts.
    let kek2 = keystore
        .create_kek(KekType::LocalKey, "sqlite", b"", Duration::ZERO)
        .expect("idempotent create");
    assert_eq!(kek, kek2);
    let pt = keystore.decrypt("c", &kek, &ct).expect("decrypt");
    assert_eq!(pt, b"hello".to_vec());

    keystore.close();
}

#[test]
fn test_create_kek_rejects_non_base64url_identifier() {
    let keystore = Keystore::new_in_memory().expect("keystore");
    let result = keystore.create_kek(KekType::LocalKey, "bad:id", b"", Duration::ZERO);
    assert!(matches!(
        result,
        Err(LockstoreError::InvalidConfiguration(_))
    ));
    keystore.close();
}
