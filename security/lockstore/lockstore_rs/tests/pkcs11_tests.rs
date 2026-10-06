/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

//! PKCS#11 keystore tests. No real PKCS#11 token is available in the
//! unit test harness, so coverage is limited to the URI-parsing /
//! dispatch path — slot-level behaviour is exercised by manual /
//! integration testing against a real token.

use lockstore_rs::{Keystore, LockstoreError};
use std::time::Duration;

#[test]
fn pkcs11_unknown_kek_ref_rejected() {
    // A kek_ref that routes to the Pkcs11Token dispatcher but has no
    // persisted `Pkcs11KekRecord` row must surface NotFound rather
    // than touching any slot.
    let ks = Keystore::new_in_memory().expect("new");
    let err = ks
        .unlock_kek(
            "lockstore::kek::pkcs11:not-a-real-record",
            b"pin",
            Duration::from_secs(1),
        )
        .unwrap_err();
    assert!(matches!(err, LockstoreError::NotFound(_)), "got: {:?}", err);
}
