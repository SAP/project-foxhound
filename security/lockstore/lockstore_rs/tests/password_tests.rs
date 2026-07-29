/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

//! Tests for the multi-instance Password `KekType`.
//!
//! Each test mints its own Password kek_ref via the test-only
//! single-iteration helper so tests don't pay the ~100 ms PBKDF2 cost.
//! Production code always goes through `create_kek(KekType::Password,
//! ...)`, which uses `pbkdf2::PBKDF2_ITERATIONS` (800 000).

use lockstore_rs::{KekType, Keystore, LockstoreError};
use std::sync::Arc;
use std::thread::sleep;
use std::time::Duration;
use tempfile::tempdir;

const PW: &[u8] = b"correct horse battery staple";
const PW_WRONG: &[u8] = b"Tr0ub4dor&3";
const PW_NEW: &[u8] = b"gs5^&mR2!fb@1";

fn on_disk_keystore() -> (Arc<Keystore>, tempfile::TempDir) {
    let dir = tempdir().expect("tempdir");
    let path = dir.path().join("lockstore.keys.sqlite");
    let ks = Keystore::get(path).expect("new");
    (ks, dir)
}

fn mint_local(ks: &Keystore) -> String {
    ks.create_kek(KekType::LocalKey, "", b"", Duration::ZERO)
        .expect("create local")
}

#[test]
fn create_password_kek_persists_record() {
    let ks = Keystore::new_in_memory().expect("new");
    let kek_ref = ks
        .create_password_kek_test_only(PW)
        .expect("create password");
    assert!(kek_ref.starts_with("lockstore::kek::password:"));
    // Newly-minted KEK starts locked: createKek doesn't open the cache.
    assert!(!ks.is_kek_unlocked(&kek_ref).unwrap());
}

#[test]
fn unlock_then_get_dek_succeeds() {
    let ks = Keystore::new_in_memory().expect("new");
    let kek_ref = ks
        .create_password_kek_test_only(PW)
        .expect("create password");
    ks.unlock_kek(&kek_ref, PW, Duration::from_secs(60))
        .expect("unlock");
    assert!(ks.is_kek_unlocked(&kek_ref).unwrap());

    ks.create_dek("col", &kek_ref, true).expect("create_dek");
    let (dek, _cs) = ks.get_dek("col", &kek_ref).expect("get_dek");
    assert_eq!(dek.len(), 32);
}

#[test]
fn get_dek_when_locked_fails() {
    let ks = Keystore::new_in_memory().expect("new");
    let kek_ref = ks
        .create_password_kek_test_only(PW)
        .expect("create password");
    ks.unlock_kek(&kek_ref, PW, Duration::from_secs(60))
        .expect("unlock");
    ks.create_dek("col", &kek_ref, true).expect("create_dek");

    ks.lock_kek(&kek_ref).unwrap();
    assert!(!ks.is_kek_unlocked(&kek_ref).unwrap());
    let err = ks.get_dek("col", &kek_ref).unwrap_err();
    assert!(matches!(err, LockstoreError::Locked), "got: {:?}", err);
}

#[test]
fn unlock_expires_after_timeout() {
    let ks = Keystore::new_in_memory().expect("new");
    let local = mint_local(&ks);
    let pw = ks
        .create_password_kek_test_only(PW)
        .expect("create password");
    ks.create_dek("col", &local, true).expect("create_dek");
    ks.unlock_kek(&pw, PW, Duration::from_millis(100))
        .expect("unlock");
    ks.add_kek("col", &local, &pw).expect("add Password level");

    sleep(Duration::from_millis(200));
    assert!(!ks.is_kek_unlocked(&pw).unwrap());
    let err = ks.get_dek("col", &pw).unwrap_err();
    assert!(matches!(err, LockstoreError::Locked), "got: {:?}", err);

    // LocalKey access still works after the Password kek expires.
    ks.get_dek("col", &local).expect("local still ok");
}

#[test]
fn wrong_password_returns_wrong_password_and_does_not_cache() {
    let ks = Keystore::new_in_memory().expect("new");
    let kek_ref = ks
        .create_password_kek_test_only(PW)
        .expect("create password");
    let err = ks
        .unlock_kek(&kek_ref, PW_WRONG, Duration::from_secs(60))
        .unwrap_err();
    assert!(matches!(err, LockstoreError::WrongPassword));
    assert!(!ks.is_kek_unlocked(&kek_ref).unwrap());
}

#[test]
fn unlock_unknown_kek_ref_reports_invalid_kek_ref() {
    let ks = Keystore::new_in_memory().expect("new");
    let err = ks
        .unlock_kek(
            "lockstore::kek::password:not-a-real-id",
            PW,
            Duration::from_secs(60),
        )
        .unwrap_err();
    assert!(matches!(err, LockstoreError::InvalidKekRef(_)));
}

#[test]
fn two_independent_password_keks_unlock_independently() {
    let ks = Keystore::new_in_memory().expect("new");
    let kek_a = ks.create_password_kek_test_only(PW).expect("create A");
    let kek_b = ks.create_password_kek_test_only(PW_NEW).expect("create B");
    assert_ne!(kek_a, kek_b);

    ks.unlock_kek(&kek_a, PW, Duration::from_secs(60))
        .expect("unlock A");
    assert!(ks.is_kek_unlocked(&kek_a).unwrap());
    // B is unaffected by A's unlock.
    assert!(!ks.is_kek_unlocked(&kek_b).unwrap());

    ks.unlock_kek(&kek_b, PW_NEW, Duration::from_secs(60))
        .expect("unlock B");
    assert!(ks.is_kek_unlocked(&kek_b).unwrap());

    // Wrong password against the other kek is rejected even when both
    // are otherwise unlocked.
    let err = ks
        .unlock_kek(&kek_a, PW_NEW, Duration::from_secs(60))
        .unwrap_err();
    assert!(matches!(err, LockstoreError::WrongPassword));

    // lock_kek only affects the named kek_ref.
    ks.lock_kek(&kek_a).unwrap();
    assert!(!ks.is_kek_unlocked(&kek_a).unwrap());
    assert!(ks.is_kek_unlocked(&kek_b).unwrap());
}

#[test]
fn add_then_remove_local_level_leaves_password_only() {
    let ks = Keystore::new_in_memory().expect("new");
    let local = mint_local(&ks);
    let pw = ks
        .create_password_kek_test_only(PW)
        .expect("create password");
    ks.unlock_kek(&pw, PW, Duration::from_secs(60))
        .expect("unlock");

    ks.create_dek("c", &local, true).expect("create");
    ks.add_kek("c", &local, &pw).expect("add");
    ks.remove_kek("c", &local).expect("remove");

    let err = ks.get_dek("c", &local).unwrap_err();
    assert!(matches!(err, LockstoreError::NotFound(_)));

    ks.get_dek("c", &pw).expect("password ok");

    ks.lock_kek(&pw).unwrap();
    let err = ks.get_dek("c", &pw).unwrap_err();
    assert!(matches!(err, LockstoreError::Locked));
}

#[test]
fn reopen_on_disk_keystore_requires_unlock() {
    let dir = tempdir().expect("tempdir");
    let path = dir.path().join("lockstore.keys.sqlite");

    let kek_ref;
    {
        let ks = Keystore::get(path.clone()).expect("new");
        kek_ref = ks
            .create_password_kek_test_only(PW)
            .expect("create password");
        ks.unlock_kek(&kek_ref, PW, Duration::from_secs(60))
            .expect("unlock");
        ks.create_dek("persisted", &kek_ref, true).expect("create");
        ks.close();
    }

    let ks2 = Keystore::get(path).expect("reopen");
    assert!(!ks2.is_kek_unlocked(&kek_ref).unwrap());
    let err = ks2.get_dek("persisted", &kek_ref).unwrap_err();
    assert!(matches!(err, LockstoreError::Locked));

    ks2.unlock_kek(&kek_ref, PW, Duration::from_secs(60))
        .expect("unlock reopened");
    ks2.get_dek("persisted", &kek_ref)
        .expect("get after reopen+unlock");
}

#[test]
fn close_locks_password() {
    let (ks, _dir) = on_disk_keystore();
    let kek_ref = ks
        .create_password_kek_test_only(PW)
        .expect("create password");
    ks.unlock_kek(&kek_ref, PW, Duration::from_secs(3600))
        .expect("unlock");
    assert!(ks.is_kek_unlocked(&kek_ref).unwrap());
    ks.close();
    // A fresh keystore at the same path must not inherit the unlocked
    // state (covered by `reopen_on_disk_keystore_requires_unlock`).
}

#[test]
fn encrypt_decrypt_roundtrip_local() {
    let ks = Keystore::new_in_memory().expect("new");
    let local = mint_local(&ks);
    ks.create_dek("c", &local, false).expect("create");

    let plaintext = b"hello, lockstore";
    let blob = ks.encrypt("c", &local, plaintext).expect("encrypt");
    assert_ne!(blob, plaintext);
    let round = ks.decrypt("c", &local, &blob).expect("decrypt");
    assert_eq!(round, plaintext);
}

#[test]
fn encrypt_decrypt_roundtrip_password() {
    let ks = Keystore::new_in_memory().expect("new");
    let kek_ref = ks
        .create_password_kek_test_only(PW)
        .expect("create password");
    ks.unlock_kek(&kek_ref, PW, Duration::from_secs(60))
        .expect("unlock");
    ks.create_dek("c", &kek_ref, false).expect("create");

    let plaintext = b"secret";
    let blob = ks.encrypt("c", &kek_ref, plaintext).expect("encrypt");
    let round = ks.decrypt("c", &kek_ref, &blob).expect("decrypt");
    assert_eq!(round, plaintext);

    ks.lock_kek(&kek_ref).unwrap();
    let err = ks.encrypt("c", &kek_ref, plaintext).unwrap_err();
    assert!(matches!(err, LockstoreError::Locked));
    let err = ks.decrypt("c", &kek_ref, &blob).unwrap_err();
    assert!(matches!(err, LockstoreError::Locked));
}

#[test]
fn encrypt_non_extractable_dek_still_works() {
    let ks = Keystore::new_in_memory().expect("new");
    let local = mint_local(&ks);
    ks.create_dek("c", &local, false).expect("create");
    // get_dek rejects because not extractable...
    let err = ks.get_dek("c", &local).unwrap_err();
    assert!(matches!(err, LockstoreError::NotExtractable(_)));
    // ...but encrypt/decrypt bypass the extractability gate.
    let blob = ks.encrypt("c", &local, b"abc").expect("encrypt");
    let round = ks.decrypt("c", &local, &blob).expect("decrypt");
    assert_eq!(round, b"abc");
}

#[test]
fn password_dek_supports_non_extractable() {
    let ks = Keystore::new_in_memory().expect("new");
    let kek_ref = ks
        .create_password_kek_test_only(PW)
        .expect("create password");
    ks.unlock_kek(&kek_ref, PW, Duration::from_secs(60))
        .expect("unlock");

    ks.create_dek("nonex", &kek_ref, false)
        .expect("create_dek non-extractable");

    let err = ks.get_dek("nonex", &kek_ref).unwrap_err();
    assert!(
        matches!(err, LockstoreError::NotExtractable(_)),
        "expected NotExtractable, got {:?}",
        err
    );

    let pt = b"Password-bound payload";
    let ct = ks
        .encrypt("nonex", &kek_ref, pt)
        .expect("encrypt under non-extractable Password DEK");
    let pt2 = ks
        .decrypt("nonex", &kek_ref, &ct)
        .expect("decrypt under non-extractable Password DEK");
    assert_eq!(pt2, pt);
}

#[test]
fn local_key_is_always_unlocked() {
    let ks = Keystore::new_in_memory().expect("new");
    let local = mint_local(&ks);
    assert!(ks.is_kek_unlocked(&local).unwrap());
    // lock / unlock are no-ops for LocalKey.
    ks.lock_kek(&local).unwrap();
    assert!(ks.is_kek_unlocked(&local).unwrap());
    ks.unlock_kek(&local, b"", Duration::from_secs(1))
        .expect("unlock no-op");
    assert!(ks.is_kek_unlocked(&local).unwrap());
}

#[test]
fn malformed_kek_ref_reports_invalid_kek_ref() {
    let ks = Keystore::new_in_memory().expect("new");
    // Every entry point that parses a kek_ref surfaces a malformed one
    // as `InvalidKekRef`: is_kek_unlocked, lock_kek, and unlock_kek.
    assert!(matches!(
        ks.is_kek_unlocked("lockstore::kek::bogus"),
        Err(LockstoreError::InvalidKekRef(_))
    ));
    assert!(matches!(
        ks.lock_kek("lockstore::kek::bogus"),
        Err(LockstoreError::InvalidKekRef(_))
    ));
    let err = ks
        .unlock_kek("lockstore::kek::bogus", b"x", Duration::from_secs(1))
        .unwrap_err();
    assert!(matches!(err, LockstoreError::InvalidKekRef(_)));
}

#[test]
fn lock_clears_password_cache() {
    let ks = Keystore::new_in_memory().expect("new");
    let kek_ref = ks
        .create_password_kek_test_only(PW)
        .expect("create password");
    ks.unlock_kek(&kek_ref, PW, Duration::from_secs(60))
        .expect("unlock");
    assert!(ks.is_kek_unlocked(&kek_ref).unwrap());

    ks.lock().unwrap();
    assert!(!ks.is_kek_unlocked(&kek_ref).unwrap());
}

#[test]
fn remove_kek_leaves_password_record_intact() {
    let ks = Keystore::new_in_memory().expect("new");
    let local = mint_local(&ks);
    let pw = ks
        .create_password_kek_test_only(PW)
        .expect("create password");
    ks.unlock_kek(&pw, PW, Duration::from_secs(60))
        .expect("unlock");

    ks.create_dek("col", &pw, false).expect("create_dek");
    ks.add_kek("col", &pw, &local).expect("add local");

    ks.remove_kek("col", &pw).expect("remove password kek");

    // remove_kek drops the wrapping only; the Password record persists
    // on disk until the caller explicitly invokes delete_kek.
    ks.unlock_kek(&pw, PW, Duration::from_secs(60))
        .expect("password KEK still resolvable after remove_kek");
    assert!(ks.is_kek_unlocked(&pw).unwrap());
}

#[test]
fn delete_dek_leaves_password_record_intact() {
    let ks = Keystore::new_in_memory().expect("new");
    let pw = ks
        .create_password_kek_test_only(PW)
        .expect("create password");
    ks.unlock_kek(&pw, PW, Duration::from_secs(60))
        .expect("unlock");
    ks.create_dek("only", &pw, false).expect("create_dek");

    ks.delete_dek("only").expect("delete_dek");

    // delete_dek wipes the DEK metadata; the per-kek_ref Password
    // record stays on disk and remains usable until the caller invokes
    // delete_kek for it explicitly.
    ks.unlock_kek(&pw, PW, Duration::from_secs(60))
        .expect("password KEK still resolvable after delete_dek");
    assert!(ks.is_kek_unlocked(&pw).unwrap());
}

// ---------------------------------------------------------------------------
// delete_kek
// ---------------------------------------------------------------------------

#[test]
fn delete_kek_drops_unreferenced_password_kek() {
    let ks = Keystore::new_in_memory().expect("new");
    let pw = ks
        .create_password_kek_test_only(PW)
        .expect("create password");

    // Just-minted, no wrapping yet — delete must succeed and the
    // record must be gone.
    ks.delete_kek(&pw).expect("delete unreferenced kek");

    let err = ks.unlock_kek(&pw, PW, Duration::from_secs(60)).unwrap_err();
    assert!(
        matches!(err, LockstoreError::InvalidKekRef(_)),
        "expected InvalidKekRef after delete_kek, got {:?}",
        err
    );
}

#[test]
fn delete_kek_rejects_when_in_use() {
    let ks = Keystore::new_in_memory().expect("new");
    let pw = ks
        .create_password_kek_test_only(PW)
        .expect("create password");
    ks.unlock_kek(&pw, PW, Duration::from_secs(60))
        .expect("unlock");
    ks.create_dek("col", &pw, false).expect("create_dek");

    let err = ks.delete_kek(&pw).unwrap_err();
    assert!(
        matches!(err, LockstoreError::InvalidConfiguration(_)),
        "expected InvalidConfiguration for in-use kek, got {:?}",
        err
    );

    // Sanity: the record is still usable after the rejected delete.
    let _ = ks.encrypt("col", &pw, b"still here").expect("encrypt");
}

#[test]
fn delete_kek_unknown_kek_ref_reports_not_found() {
    let ks = Keystore::new_in_memory().expect("new");
    let bogus = "lockstore::kek::password:not-a-real-id";
    let err = ks.delete_kek(bogus).unwrap_err();
    assert!(
        matches!(err, LockstoreError::NotFound(_)),
        "expected NotFound for missing kek_ref, got {:?}",
        err
    );
}

#[test]
fn delete_kek_invalid_kek_ref_format_reports_invalid_kek_ref() {
    let ks = Keystore::new_in_memory().expect("new");
    let err = ks.delete_kek("not-a-lockstore-kek-ref").unwrap_err();
    assert!(
        matches!(err, LockstoreError::InvalidKekRef(_)),
        "expected InvalidKekRef for malformed kek_ref, got {:?}",
        err
    );
}

#[test]
fn delete_kek_drops_unreferenced_local_kek() {
    let ks = Keystore::new_in_memory().expect("new");
    let local = mint_local(&ks);

    ks.delete_kek(&local)
        .expect("delete unreferenced local kek");

    // A subsequent encrypt under the deleted local kek must fail
    // because the record is gone — get_kek_symkey returns NotFound.
    ks.create_dek(
        "col",
        // Re-use a different local kek_ref so the create_dek itself
        // succeeds; the assertion is that the deleted ref no longer
        // resolves.
        &mint_local(&ks),
        false,
    )
    .expect("create_dek under a fresh local");
    let err = ks.encrypt("col", &local, b"x").unwrap_err();
    assert!(
        matches!(err, LockstoreError::NotFound(_)),
        "expected NotFound after delete_kek on local, got {:?}",
        err
    );
}

#[test]
fn delete_kek_after_switch_kek_succeeds() {
    let ks = Keystore::new_in_memory().expect("new");
    let pw = ks
        .create_password_kek_test_only(PW)
        .expect("create password");
    ks.unlock_kek(&pw, PW, Duration::from_secs(60))
        .expect("unlock");
    ks.create_dek("col", &pw, false).expect("create_dek");

    // Switch the collection's wrapping to a new password kek.
    let pw2 = ks
        .create_password_kek_test_only(PW_NEW)
        .expect("create password 2");
    ks.unlock_kek(&pw2, PW_NEW, Duration::from_secs(60))
        .expect("unlock pw2");
    ks.switch_kek("col", &pw, &pw2).expect("switch_kek");

    // After switch_kek, `pw` no longer wraps any collection but its
    // record is still on disk. delete_kek can drop it cleanly because
    // no collection references it any more.
    ks.delete_kek(&pw).expect("delete unreferenced pw");

    // Subsequent unlock surfaces InvalidKekRef: the kek_ref parses,
    // but no Password record exists at this id.
    let err = ks.unlock_kek(&pw, PW, Duration::from_secs(60)).unwrap_err();
    assert!(
        matches!(err, LockstoreError::InvalidKekRef(_)),
        "expected InvalidKekRef after delete_kek, got {:?}",
        err
    );
}
