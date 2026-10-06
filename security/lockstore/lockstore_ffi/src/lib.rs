/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

pub use lockstore_rs::LockstoreDatastore;
use lockstore_rs::{Keystore, LockstoreError, KEYSTORE_FILENAME};
use nserror::{
    nsresult, NS_ERROR_ABORT, NS_ERROR_FAILURE, NS_ERROR_INVALID_ARG, NS_ERROR_NOT_AVAILABLE,
    NS_ERROR_NOT_INITIALIZED, NS_OK,
};
use nsstring::{nsACString, nsCString};
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use thin_vec::ThinVec;
use zeroize::Zeroize;

// ============================================================================
// Handle Types
// ============================================================================

pub struct KeystoreHandle {
    keystore: Arc<Keystore>,
    profile_path: PathBuf,
}

// ============================================================================
// Helpers
// ============================================================================

fn error_to_nsresult(err: LockstoreError) -> nsresult {
    log::error!("Lockstore error: {}", err);
    match err {
        LockstoreError::NotFound(_) => NS_ERROR_NOT_AVAILABLE,
        LockstoreError::Serialization(_) => NS_ERROR_INVALID_ARG,
        LockstoreError::NotExtractable(_) => NS_ERROR_NOT_AVAILABLE,
        LockstoreError::AuthenticationCancelled => NS_ERROR_ABORT,
        LockstoreError::InvalidKekRef(_) => NS_ERROR_INVALID_ARG,
        LockstoreError::Locked => NS_ERROR_NOT_AVAILABLE,
        LockstoreError::WrongPassword => NS_ERROR_ABORT,
        LockstoreError::NotInitialized => NS_ERROR_NOT_INITIALIZED,
        _ => NS_ERROR_FAILURE,
    }
}

fn result_to_nsresult(r: Result<(), LockstoreError>) -> nsresult {
    match r {
        Ok(()) => NS_OK,
        Err(e) => error_to_nsresult(e),
    }
}

// ============================================================================
// Keystore FFI Functions
// ============================================================================

/// # Safety
/// `ret_handle` must be a writable location. On `NS_OK` the handle is
/// owned by the caller and must be released via
/// `keystore_close`.
#[no_mangle]
pub unsafe extern "C" fn keystore_open(
    profile_path: &nsACString,
    ret_handle: &mut *mut KeystoreHandle,
) -> nsresult {
    if profile_path.is_empty() {
        log::error!("Profile path cannot be empty");
        return NS_ERROR_INVALID_ARG;
    }

    let profile_path_str = profile_path.to_utf8();
    let profile = PathBuf::from(profile_path_str.as_ref());
    let keystore_path = profile.join(KEYSTORE_FILENAME);

    // `Keystore::get` memoises per-path so the C++ service and
    // any Rust consumer (e.g. mls_gk) opening this same profile reach
    // the same `Arc<Keystore>` — i.e. one keystore handle, one
    // Password cache, one PKCS#11 auth-cache per process.
    let keystore = match Keystore::get(keystore_path) {
        Ok(k) => k,
        Err(e) => return error_to_nsresult(e),
    };

    let handle = Box::new(KeystoreHandle {
        keystore,
        profile_path: profile,
    });

    *ret_handle = Box::into_raw(handle);
    NS_OK
}

#[no_mangle]
pub extern "C" fn keystore_create_dek(
    handle: &KeystoreHandle,
    collection: &nsACString,
    kek_ref: &nsACString,
    extractable: bool,
    key_size: usize,
) -> nsresult {
    if collection.is_empty() || kek_ref.is_empty() {
        log::error!("Collection and kek_ref cannot be empty");
        return NS_ERROR_INVALID_ARG;
    }

    let coll_str = collection.to_utf8();
    let kek_ref_str = kek_ref.to_utf8();

    match handle
        .keystore
        .create_dek(&coll_str, &kek_ref_str, extractable, key_size)
    {
        Ok(_) => NS_OK,
        Err(e) => error_to_nsresult(e),
    }
}

/// Install caller-supplied `dek_bytes` as the DEK for `collection`,
/// wrapped under `kek_ref`. Migration primitive used to bring data
/// already encrypted under a known external DEK under keystore
/// management without re-encrypting ciphertexts at rest.
///
/// # Safety
/// `dek_ptr` must point to at least `dek_len` initialised bytes that
/// remain valid for the duration of the call. `dek_len` must equal the
/// wire length of the default cipher suite (32 bytes for AES-256-GCM);
/// other lengths are rejected with `NS_ERROR_INVALID_ARG`. Ownership
/// remains with the caller; Lockstore copies what it needs before
/// returning.
#[no_mangle]
pub unsafe extern "C" fn keystore_import_dek(
    handle: &KeystoreHandle,
    collection: &nsACString,
    kek_ref: &nsACString,
    dek_ptr: *const u8,
    dek_len: usize,
    extractable: bool,
) -> nsresult {
    if collection.is_empty() || kek_ref.is_empty() {
        log::error!("Collection and kek_ref cannot be empty");
        return NS_ERROR_INVALID_ARG;
    }
    // Length-first check: short-circuits before any pointer
    // dereference, so the caller does not need to nullptr-guard for
    // empty buffers — passing `nsTArray::Elements()` unconditionally is
    // safe.
    if dek_len == 0 {
        return NS_ERROR_INVALID_ARG;
    }
    if dek_ptr.is_null() {
        return NS_ERROR_INVALID_ARG;
    }

    let coll_str = collection.to_utf8();
    let kek_ref_str = kek_ref.to_utf8();
    // SAFETY: non-zero len + non-null ptr validated above; caller's
    // contract requires `dek_len` valid bytes at `dek_ptr`.
    let dek = unsafe { std::slice::from_raw_parts(dek_ptr, dek_len) };

    match handle
        .keystore
        .import_dek(&coll_str, &kek_ref_str, dek, extractable)
    {
        Ok(()) => NS_OK,
        Err(e) => error_to_nsresult(e),
    }
}

#[no_mangle]
pub extern "C" fn keystore_is_dek_extractable(
    handle: &KeystoreHandle,
    collection: &nsACString,
    out_extractable: &mut bool,
) -> nsresult {
    if collection.is_empty() {
        log::error!("Collection cannot be empty");
        return NS_ERROR_INVALID_ARG;
    }

    let coll_str = collection.to_utf8();
    match handle.keystore.is_dek_extractable(&coll_str) {
        Ok(b) => {
            *out_extractable = b;
            NS_OK
        }
        Err(e) => error_to_nsresult(e),
    }
}

#[no_mangle]
pub extern "C" fn keystore_get_dek(
    handle: &KeystoreHandle,
    collection: &nsACString,
    kek_ref: &nsACString,
    ret_dek: &mut ThinVec<u8>,
) -> nsresult {
    if collection.is_empty() || kek_ref.is_empty() {
        log::error!("Collection and kek_ref cannot be empty");
        return NS_ERROR_INVALID_ARG;
    }

    let coll_str = collection.to_utf8();
    let kek_ref_str = kek_ref.to_utf8();

    match handle.keystore.get_dek(&coll_str, &kek_ref_str) {
        Ok((dek_bytes, _cipher_suite)) => {
            *ret_dek = dek_bytes.into();
            NS_OK
        }
        Err(e) => error_to_nsresult(e),
    }
}

/// Delete the DEK for `collection`. The keystore does not track the
/// associated datastore; callers are responsible for disposing of any
/// ciphertext under this collection by other means before (or after)
/// this call.
#[no_mangle]
pub extern "C" fn keystore_delete_dek(
    handle: &KeystoreHandle,
    collection: &nsACString,
) -> nsresult {
    if collection.is_empty() {
        log::error!("Collection cannot be empty");
        return NS_ERROR_INVALID_ARG;
    }

    let coll_str = collection.to_utf8();

    match handle.keystore.delete_dek(&coll_str) {
        Ok(()) => NS_OK,
        Err(e) => error_to_nsresult(e),
    }
}

#[no_mangle]
pub extern "C" fn keystore_list_deks(
    handle: &KeystoreHandle,
    ret_collections: &mut ThinVec<nsCString>,
) -> nsresult {
    match handle.keystore.list_deks() {
        Ok(collections) => {
            *ret_collections = collections
                .into_iter()
                .map(|c| nsCString::from(&c[..]))
                .collect();
            NS_OK
        }
        Err(e) => error_to_nsresult(e),
    }
}

/// List the `kek_ref`s currently wrapping the DEK named `dek_name`.
/// An unknown or empty `dek_name` surfaces as `NS_ERROR_NOT_AVAILABLE`
/// via `error_to_nsresult` (the keystore layer rejects with `NotFound`).
#[no_mangle]
pub extern "C" fn keystore_list_keks(
    handle: &KeystoreHandle,
    dek_name: &nsACString,
    ret_kek_refs: &mut ThinVec<nsCString>,
) -> nsresult {
    let dek_name_str = dek_name.to_utf8();
    match handle.keystore.list_keks(&dek_name_str) {
        Ok(refs) => {
            *ret_kek_refs = refs.into_iter().map(|s| nsCString::from(&s[..])).collect();
            NS_OK
        }
        Err(e) => error_to_nsresult(e),
    }
}

#[no_mangle]
pub extern "C" fn keystore_add_kek(
    handle: &KeystoreHandle,
    collection: &nsACString,
    from_kek_ref: &nsACString,
    to_kek_ref: &nsACString,
) -> nsresult {
    if collection.is_empty() || from_kek_ref.is_empty() || to_kek_ref.is_empty() {
        log::error!("Collection, from_kek_ref and to_kek_ref cannot be empty");
        return NS_ERROR_INVALID_ARG;
    }
    let coll_str = collection.to_utf8();
    let from_str = from_kek_ref.to_utf8();
    let to_str = to_kek_ref.to_utf8();
    match handle.keystore.add_kek(&coll_str, &from_str, &to_str) {
        Ok(()) => NS_OK,
        Err(e) => error_to_nsresult(e),
    }
}

#[no_mangle]
pub extern "C" fn keystore_remove_kek(
    handle: &KeystoreHandle,
    collection: &nsACString,
    kek_ref: &nsACString,
) -> nsresult {
    if collection.is_empty() || kek_ref.is_empty() {
        log::error!("Collection and kek_ref cannot be empty");
        return NS_ERROR_INVALID_ARG;
    }
    let coll_str = collection.to_utf8();
    let kek_ref_str = kek_ref.to_utf8();
    match handle.keystore.remove_kek(&coll_str, &kek_ref_str) {
        Ok(()) => NS_OK,
        Err(e) => error_to_nsresult(e),
    }
}

/// Atomically rewrap the DEK for `collection` from `old_kek_ref` to
/// `new_kek_ref`. The DEK bytes are unchanged; ciphertexts at rest stay
/// valid. Equivalent in effect to `add_kek` + `remove_kek` but atomic
/// at the kvstore-row level.
#[no_mangle]
pub extern "C" fn keystore_switch_kek(
    handle: &KeystoreHandle,
    collection: &nsACString,
    old_kek_ref: &nsACString,
    new_kek_ref: &nsACString,
) -> nsresult {
    if collection.is_empty() || old_kek_ref.is_empty() || new_kek_ref.is_empty() {
        log::error!("Collection, old_kek_ref and new_kek_ref cannot be empty");
        return NS_ERROR_INVALID_ARG;
    }
    let coll_str = collection.to_utf8();
    let old_str = old_kek_ref.to_utf8();
    let new_str = new_kek_ref.to_utf8();
    match handle.keystore.switch_kek(&coll_str, &old_str, &new_str) {
        Ok(()) => NS_OK,
        Err(e) => error_to_nsresult(e),
    }
}

/// # Safety
/// `plaintext_ptr` must point to at least `plaintext_len` initialised
/// bytes that remain valid for the duration of the call when
/// `plaintext_len > 0`. When `plaintext_len == 0` the pointer is not
/// dereferenced and may be null (or whatever sentinel
/// `nsTArray::Elements()` returns for empty arrays). Ownership remains
/// with the caller; Lockstore copies what it needs before returning.
#[no_mangle]
pub unsafe extern "C" fn keystore_encrypt(
    handle: &KeystoreHandle,
    collection: &nsACString,
    kek_ref: &nsACString,
    plaintext_ptr: *const u8,
    plaintext_len: usize,
    ret_ciphertext: &mut ThinVec<u8>,
) -> nsresult {
    if collection.is_empty() || kek_ref.is_empty() {
        return NS_ERROR_INVALID_ARG;
    }
    // Length-first check: short-circuits before any pointer
    // dereference, so the caller does not need to nullptr-guard for
    // empty buffers — passing `nsTArray::Elements()` unconditionally is
    // safe.
    if plaintext_len == 0 {
        return NS_ERROR_INVALID_ARG;
    }
    if plaintext_ptr.is_null() {
        return NS_ERROR_INVALID_ARG;
    }
    let coll_str = collection.to_utf8();
    let kek_ref_str = kek_ref.to_utf8();
    // SAFETY: non-zero len + non-null ptr validated above; caller's
    // contract requires this to point at `plaintext_len` valid bytes.
    let plaintext = unsafe { std::slice::from_raw_parts(plaintext_ptr, plaintext_len) };
    match handle.keystore.encrypt(&coll_str, &kek_ref_str, plaintext) {
        Ok(bytes) => {
            *ret_ciphertext = bytes.into();
            NS_OK
        }
        Err(e) => error_to_nsresult(e),
    }
}

/// # Safety
/// `ciphertext_ptr` must point to at least `ciphertext_len`
/// initialised bytes that remain valid for the duration of the call
/// when `ciphertext_len > 0`. When `ciphertext_len == 0` the pointer
/// is not dereferenced. Ownership remains with the caller.
#[no_mangle]
pub unsafe extern "C" fn keystore_decrypt(
    handle: &KeystoreHandle,
    collection: &nsACString,
    kek_ref: &nsACString,
    ciphertext_ptr: *const u8,
    ciphertext_len: usize,
    ret_plaintext: &mut ThinVec<u8>,
) -> nsresult {
    if collection.is_empty() || kek_ref.is_empty() {
        return NS_ERROR_INVALID_ARG;
    }
    if ciphertext_len == 0 {
        return NS_ERROR_INVALID_ARG;
    }
    if ciphertext_ptr.is_null() {
        return NS_ERROR_INVALID_ARG;
    }
    let coll_str = collection.to_utf8();
    let kek_ref_str = kek_ref.to_utf8();
    // SAFETY: non-zero len + non-null ptr validated above; caller's
    // contract requires this to point at `ciphertext_len` valid bytes.
    let ciphertext = unsafe { std::slice::from_raw_parts(ciphertext_ptr, ciphertext_len) };
    match handle.keystore.decrypt(&coll_str, &kek_ref_str, ciphertext) {
        Ok(bytes) => {
            *ret_plaintext = bytes.into();
            NS_OK
        }
        Err(e) => error_to_nsresult(e),
    }
}

/// # Safety
/// `handle` must be a non-null pointer previously returned by
/// `keystore_open` that has not yet been passed to this
/// function. Consumes the handle and zeroises every cached KEK before
/// returning.
#[no_mangle]
pub unsafe extern "C" fn keystore_close(handle: *mut KeystoreHandle) -> nsresult {
    // C++ can't trigger Rust's `Drop` directly, so this fn is the
    // C-callable entry point that consumes the boxed handle. The
    // explicit `lock()` call here is defensive: it zeroises every
    // cached KEK (Password + PKCS#11 caches) even if another
    // `Arc<Keystore>` is still alive somewhere. Without that call
    // we'd only zeroise when the *last* `Arc` drops, which the FFI
    // consumer can't always guarantee.
    //
    // SAFETY: caller's contract guarantees `handle` is a live, owned
    // `Box::into_raw` pointer that has not yet been passed to this fn.
    // Best-effort lock during close: if the call fails (e.g. mutex
    // poisoning) we still drop the Box so the SQLite connection
    // closes; future callers reopen against the on-disk state.
    let boxed = unsafe { Box::from_raw(handle) };
    let _ = boxed.keystore.lock();
    NS_OK
}

// ============================================================================
// Unified KEK lock/unlock FFI
// ============================================================================
//
// Dispatches internally on the kek_ref's KekType. For Password `secret`
// is the password used to derive the wrapping key; for Pkcs11Token
// `secret` is the PIN (or empty to defer to NSS's password callback).
// For LocalKey these are no-ops.

/// Unlock the KEK referenced by `kek_ref` using `secret` (a password
/// for Password, a PIN for PKCS#11, or empty / ignored for
/// LocalKey). Lockstore copies the secret bytes into its own buffer,
/// uses them, and zeroises that buffer before returning; the caller's
/// `nsACString` view is never mutated.
#[no_mangle]
pub extern "C" fn keystore_unlock_kek(
    handle: &KeystoreHandle,
    kek_ref: &nsACString,
    secret: &nsACString,
    timeout_ms: u32,
) -> nsresult {
    if kek_ref.is_empty() {
        return NS_ERROR_INVALID_ARG;
    }
    let mut secret_buf: Vec<u8> = secret[..].to_vec();
    let kek_ref_str = kek_ref.to_utf8();
    let result = handle.keystore.unlock_kek(
        &kek_ref_str,
        &secret_buf,
        Duration::from_millis(timeout_ms as u64),
    );
    secret_buf.zeroize();

    match result {
        Ok(()) => NS_OK,
        Err(e) => error_to_nsresult(e),
    }
}

#[no_mangle]
pub extern "C" fn keystore_lock_kek(handle: &KeystoreHandle, kek_ref: &nsACString) -> nsresult {
    if kek_ref.is_empty() {
        return NS_ERROR_INVALID_ARG;
    }
    let kek_ref_str = kek_ref.to_utf8();
    result_to_nsresult(handle.keystore.lock_kek(&kek_ref_str))
}

#[no_mangle]
pub extern "C" fn keystore_is_kek_unlocked(
    handle: &KeystoreHandle,
    kek_ref: &nsACString,
    out_unlocked: &mut bool,
) -> nsresult {
    if kek_ref.is_empty() {
        return NS_ERROR_INVALID_ARG;
    }
    let kek_ref_str = kek_ref.to_utf8();
    match handle.keystore.is_kek_unlocked(&kek_ref_str) {
        Ok(b) => {
            *out_unlocked = b;
            NS_OK
        }
        Err(e) => error_to_nsresult(e),
    }
}

/// Lock every KEK that holds cached authentication (every Password KEK
/// and every per-kek_ref PKCS#11 entry). Intended for shutdown / logout
/// paths that should invalidate all unlocked state in a single call.
#[no_mangle]
pub extern "C" fn keystore_lock(handle: &KeystoreHandle) -> nsresult {
    result_to_nsresult(handle.keystore.lock())
}

/// Generic KEK-creation entry point. Dispatches on `kek_type`:
///   - `"local"`    → mints a fresh LocalKey kek_ref.
///   - `"password"` → mints a fresh Password kek_ref using `secret`
///     (must be non-empty); if `cache_timeout_ms` is non-zero the
///     just-derived KEK is also inserted into the auth cache with that
///     expiry, so callers can use the returned kek_ref without an
///     immediate `unlock_kek`.
///   - `"pkcs11"`   → mints a fresh PKCS#11 kek_ref against the slot
///     named by the PKCS#11 URI in `secret`.
///
/// Lockstore copies the secret bytes into its own buffer, consumes
/// them, and zeroises the buffer before returning. On success
/// `ret_kek_ref` is filled with the freshly-minted (or canonical)
/// kek_ref the caller should hand to subsequent `createDek` /
/// `encrypt` calls.
#[no_mangle]
pub extern "C" fn keystore_create_kek(
    handle: &KeystoreHandle,
    kek_type: &nsACString,
    identifier: &nsACString,
    secret: &nsACString,
    cache_timeout_ms: u32,
    ret_kek_ref: &mut nsCString,
) -> nsresult {
    let kek_type_str = kek_type.to_utf8();
    let parsed = match lockstore_rs::KekType::parse(&kek_type_str) {
        Some(t) => t,
        None => return NS_ERROR_INVALID_ARG,
    };

    let identifier_str = identifier.to_utf8();
    let mut secret_buf: Vec<u8> = secret[..].to_vec();
    let result = handle.keystore.create_kek(
        parsed,
        &identifier_str,
        &secret_buf,
        Duration::from_millis(cache_timeout_ms as u64),
    );
    secret_buf.zeroize();

    match result {
        Ok(kek_ref) => {
            ret_kek_ref.assign(&kek_ref);
            NS_OK
        }
        Err(e) => error_to_nsresult(e),
    }
}

/// Destroy the KEK referenced by `kek_ref`. The KEK must first be
/// removed from every DEK that wraps under it (via `removeKek` /
/// `switchKek`); otherwise the deletion is refused. An empty
/// `kek_ref` is rejected at the boundary.
#[no_mangle]
pub extern "C" fn keystore_delete_kek(handle: &KeystoreHandle, kek_ref: &nsACString) -> nsresult {
    if kek_ref.is_empty() {
        return NS_ERROR_INVALID_ARG;
    }
    let kek_ref_str = kek_ref.to_utf8();
    match handle.keystore.delete_kek(&kek_ref_str) {
        Ok(()) => NS_OK,
        Err(e) => error_to_nsresult(e),
    }
}

// ============================================================================
// Datastore FFI Functions
// ============================================================================

/// # Safety
/// `ret_handle` must be a writable location. On `NS_OK` the handle is
/// owned by the caller and must be released via
/// `lockstore_datastore_close`.
#[no_mangle]
pub unsafe extern "C" fn lockstore_datastore_open(
    keystore_handle: &KeystoreHandle,
    collection: &nsACString,
    kek_ref: &nsACString,
    ret_handle: &mut *mut LockstoreDatastore,
) -> nsresult {
    if collection.is_empty() || kek_ref.is_empty() {
        log::error!("Collection and kek_ref cannot be empty");
        return NS_ERROR_INVALID_ARG;
    }

    let coll_str = collection.to_utf8();
    let kek_ref_str = kek_ref.to_utf8();

    let datastore = match LockstoreDatastore::new(
        keystore_handle.profile_path.clone(),
        coll_str.to_string(),
        keystore_handle.keystore.clone(),
        &kek_ref_str,
    ) {
        Ok(d) => d,
        Err(e) => return error_to_nsresult(e),
    };

    *ret_handle = Box::into_raw(Box::new(datastore));
    NS_OK
}

/// # Safety
/// `data_ptr` must point to at least `data_len` initialised bytes that
/// remain valid for the duration of the call. `data_len` must be
/// non-zero. Ownership remains with the caller.
#[no_mangle]
pub unsafe extern "C" fn lockstore_datastore_put(
    handle: &LockstoreDatastore,
    entry_name: &nsACString,
    data_ptr: *const u8,
    data_len: usize,
) -> nsresult {
    if entry_name.is_empty() {
        log::error!("Entry name cannot be empty");
        return NS_ERROR_INVALID_ARG;
    }

    if data_ptr.is_null() || data_len == 0 {
        log::error!("Invalid data pointer or length");
        return NS_ERROR_INVALID_ARG;
    }

    // SAFETY: caller's contract; pointer is non-null and points at
    // `data_len` valid bytes.
    let data_slice = unsafe { std::slice::from_raw_parts(data_ptr, data_len) };
    let entry_str = entry_name.to_utf8();

    match handle.put(&entry_str, data_slice) {
        Ok(_) => NS_OK,
        Err(e) => error_to_nsresult(e),
    }
}

#[no_mangle]
pub extern "C" fn lockstore_datastore_get(
    handle: &LockstoreDatastore,
    entry_name: &nsACString,
    ret_data: &mut ThinVec<u8>,
) -> nsresult {
    if entry_name.is_empty() {
        log::error!("Entry name cannot be empty");
        return NS_ERROR_INVALID_ARG;
    }

    let entry_str = entry_name.to_utf8();

    match handle.get(&entry_str) {
        Ok(data) => {
            *ret_data = data.into();
            NS_OK
        }
        Err(e) => error_to_nsresult(e),
    }
}

#[no_mangle]
pub extern "C" fn lockstore_datastore_delete(
    handle: &LockstoreDatastore,
    entry_name: &nsACString,
) -> nsresult {
    if entry_name.is_empty() {
        log::error!("Entry name cannot be empty");
        return NS_ERROR_INVALID_ARG;
    }

    let entry_str = entry_name.to_utf8();

    match handle.delete(&entry_str) {
        Ok(()) => NS_OK,
        Err(e) => error_to_nsresult(e),
    }
}

#[no_mangle]
pub extern "C" fn lockstore_datastore_keys(
    handle: &LockstoreDatastore,
    ret_entries: &mut ThinVec<nsCString>,
) -> nsresult {
    match handle.keys() {
        Ok(entries) => {
            *ret_entries = entries
                .into_iter()
                .map(|e| nsCString::from(&e[..]))
                .collect();
            NS_OK
        }
        Err(e) => error_to_nsresult(e),
    }
}

/// # Safety
/// `handle` must be a non-null pointer previously returned by
/// `lockstore_datastore_open` that has not yet been passed to this
/// function. Consumes the handle.
#[no_mangle]
pub unsafe extern "C" fn lockstore_datastore_close(handle: *mut LockstoreDatastore) -> nsresult {
    // SAFETY: caller's contract guarantees `handle` is a live, owned
    // `Box::into_raw` pointer.
    unsafe { Box::from_raw(handle).close() };
    NS_OK
}
