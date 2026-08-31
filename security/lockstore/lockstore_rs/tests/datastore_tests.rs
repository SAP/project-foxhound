/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use lockstore_rs::{KekType, Keystore, LockstoreDatastore, LockstoreError};
use std::sync::Arc;
use std::time::Duration;
use tempfile::tempdir;

fn make_in_memory_ds(collection: &str) -> LockstoreDatastore {
    let keystore = Arc::new(Keystore::new_in_memory().expect("Failed to create keystore"));
    let local = keystore
        .create_kek(KekType::LocalKey, "", b"", Duration::ZERO)
        .expect("create local kek");
    keystore
        .create_dek(collection, &local, false)
        .expect("Failed to create DEK");
    LockstoreDatastore::new_in_memory(collection.to_string(), keystore, &local)
        .expect("Failed to create datastore")
}

#[test]
fn test_new_in_memory() {
    let keystore = Arc::new(Keystore::new_in_memory().expect("Failed to create keystore"));
    let local = keystore
        .create_kek(KekType::LocalKey, "", b"", Duration::ZERO)
        .expect("create local kek");
    keystore
        .create_dek("test", &local, false)
        .expect("Failed to create DEK");
    let datastore = LockstoreDatastore::new_in_memory("test".to_string(), keystore, &local)
        .expect("Failed to create datastore");
    datastore.close();
}

#[test]
fn test_new_in_memory_without_dek() {
    let keystore = Arc::new(Keystore::new_in_memory().expect("Failed to create keystore"));
    let local = keystore
        .create_kek(KekType::LocalKey, "", b"", Duration::ZERO)
        .expect("create local kek");
    let result = LockstoreDatastore::new_in_memory("missing".to_string(), keystore, &local);
    assert!(matches!(result, Err(LockstoreError::NotFound(_))));
}

#[test]
fn test_put_get_roundtrip() {
    let datastore = make_in_memory_ds("test");
    datastore.put("key1", b"value1").expect("Failed to put");
    let value = datastore.get("key1").expect("Failed to get");
    assert_eq!(value, b"value1");
    datastore.close();
}

#[test]
fn test_update_existing_key() {
    let datastore = make_in_memory_ds("test");
    datastore.put("key1", b"value1").expect("Failed to put");
    assert_eq!(datastore.get("key1").expect("Failed to get"), b"value1");

    datastore.put("key1", b"value2").expect("Failed to update");
    assert_eq!(
        datastore.get("key1").expect("Failed to get updated value"),
        b"value2"
    );

    let keys = datastore.keys().expect("Failed to list keys");
    assert_eq!(keys.len(), 1);
    datastore.close();
}

#[test]
fn test_delete_existing() {
    let datastore = make_in_memory_ds("test");
    datastore.put("key1", b"value1").expect("Failed to put");
    datastore.delete("key1").expect("Failed to delete");

    let result = datastore.get("key1");
    assert!(matches!(result, Err(LockstoreError::NotFound(_))));
    datastore.close();
}

#[test]
fn test_delete_nonexistent() {
    let datastore = make_in_memory_ds("test");
    let result = datastore.delete("nonexistent");
    assert!(matches!(result, Err(LockstoreError::NotFound(_))));
    datastore.close();
}

#[test]
fn test_get_nonexistent() {
    let datastore = make_in_memory_ds("test");
    let result = datastore.get("nonexistent");
    assert!(matches!(result, Err(LockstoreError::NotFound(_))));
    datastore.close();
}

#[test]
fn test_keys_empty() {
    let datastore = make_in_memory_ds("test");
    let keys = datastore.keys().expect("Failed to list keys");
    assert!(keys.is_empty());
    datastore.close();
}

#[test]
fn test_keys_single() {
    let datastore = make_in_memory_ds("test");
    datastore.put("only", b"data").expect("Failed to put");
    let keys = datastore.keys().expect("Failed to list keys");
    assert_eq!(keys, vec!["only"]);
    datastore.close();
}

#[test]
fn test_keys_multiple() {
    let datastore = make_in_memory_ds("test");
    datastore.put("key1", b"v1").expect("Failed to put");
    datastore.put("key2", b"v2").expect("Failed to put");
    datastore.put("key3", b"v3").expect("Failed to put");

    let keys = datastore.keys().expect("Failed to list keys");
    assert_eq!(keys.len(), 3);
    assert!(keys.contains(&"key1".to_string()));
    assert!(keys.contains(&"key2".to_string()));
    assert!(keys.contains(&"key3".to_string()));
    datastore.close();
}

#[test]
fn test_keys_after_delete() {
    let datastore = make_in_memory_ds("test");
    datastore.put("a", b"1").expect("Failed to put");
    datastore.put("b", b"2").expect("Failed to put");
    datastore.delete("a").expect("Failed to delete");

    let keys = datastore.keys().expect("Failed to list keys");
    assert_eq!(keys, vec!["b"]);
    datastore.close();
}

#[test]
fn test_binary_data() {
    let datastore = make_in_memory_ds("test");
    let binary: Vec<u8> = (0..=255).collect();
    datastore
        .put("binary", &binary)
        .expect("Failed to put binary");
    let value = datastore.get("binary").expect("Failed to get binary");
    assert_eq!(value, binary);
    datastore.close();
}

#[test]
fn test_empty_data() {
    let datastore = make_in_memory_ds("test");
    datastore.put("empty", b"").expect("Failed to put empty");
    let value = datastore.get("empty").expect("Failed to get empty");
    assert!(value.is_empty());
    datastore.close();
}

#[test]
fn test_large_data() {
    let datastore = make_in_memory_ds("test");
    let large = vec![0xABu8; 1_000_000];
    datastore.put("large", &large).expect("Failed to put large");
    let value = datastore.get("large").expect("Failed to get large");
    assert_eq!(value, large);
    datastore.close();
}

#[test]
fn test_multiple_collections_independent() {
    let ks1 = Arc::new(Keystore::new_in_memory().expect("Failed to create keystore"));
    let local1 = ks1
        .create_kek(KekType::LocalKey, "", b"", Duration::ZERO)
        .expect("create local kek");
    ks1.create_dek("col1", &local1, false)
        .expect("Failed to create DEK");
    let ds1 = LockstoreDatastore::new_in_memory("col1".to_string(), ks1, &local1)
        .expect("Failed to create ds1");

    let ks2 = Arc::new(Keystore::new_in_memory().expect("Failed to create keystore"));
    let local2 = ks2
        .create_kek(KekType::LocalKey, "", b"", Duration::ZERO)
        .expect("create local kek");
    ks2.create_dek("col2", &local2, false)
        .expect("Failed to create DEK");
    let ds2 = LockstoreDatastore::new_in_memory("col2".to_string(), ks2, &local2)
        .expect("Failed to create ds2");

    ds1.put("key", b"from_col1").expect("Failed to put");
    ds2.put("key", b"from_col2").expect("Failed to put");

    assert_eq!(ds1.get("key").expect("Failed to get"), b"from_col1");
    assert_eq!(ds2.get("key").expect("Failed to get"), b"from_col2");

    ds1.close();
    ds2.close();
}

#[test]
fn test_close() {
    let datastore = make_in_memory_ds("test");
    datastore.close();
}

#[test]
fn test_new_on_disk() {
    let dir = tempdir().expect("Failed to create temp dir");
    let ks_path = dir.path().join("keystore.sqlite");

    let keystore = Keystore::get(ks_path).expect("Failed to create keystore");
    let local = keystore
        .create_kek(KekType::LocalKey, "", b"", Duration::ZERO)
        .expect("create local kek");
    keystore
        .create_dek("col1", &local, false)
        .expect("Failed to create DEK");

    let datastore = LockstoreDatastore::new(
        dir.path().to_path_buf(),
        "col1".to_string(),
        keystore,
        &local,
    )
    .expect("Failed to create on-disk datastore");

    datastore.put("key1", b"value1").expect("Failed to put");
    let value = datastore.get("key1").expect("Failed to get");
    assert_eq!(value, b"value1");
    datastore.close();
}

#[test]
fn test_new_on_disk_without_dek() {
    let dir = tempdir().expect("Failed to create temp dir");
    let ks_path = dir.path().join("keystore.sqlite");

    let keystore = Keystore::get(ks_path).expect("Failed to create keystore");
    let local = keystore
        .create_kek(KekType::LocalKey, "", b"", Duration::ZERO)
        .expect("create local kek");
    let result = LockstoreDatastore::new(
        dir.path().to_path_buf(),
        "missing".to_string(),
        keystore,
        &local,
    );
    assert!(matches!(result, Err(LockstoreError::NotFound(_))));
}

#[test]
fn test_on_disk_persistence() {
    let dir = tempdir().expect("Failed to create temp dir");
    let data_path = dir.path().to_path_buf();
    let ks_path = dir.path().join("keystore.sqlite");

    let local;
    {
        let keystore = Keystore::get(ks_path.clone()).expect("Failed to create keystore");
        local = keystore
            .create_kek(KekType::LocalKey, "", b"", Duration::ZERO)
            .expect("create local kek");
        keystore
            .create_dek("persist", &local, false)
            .expect("Failed to create DEK");
        let datastore =
            LockstoreDatastore::new(data_path.clone(), "persist".to_string(), keystore, &local)
                .expect("Failed to create on-disk datastore");
        datastore.put("key1", b"value1").expect("Failed to put");
        datastore.close();
    }

    let keystore = Keystore::get(ks_path).expect("Failed to reopen keystore");
    let datastore = LockstoreDatastore::new(data_path, "persist".to_string(), keystore, &local)
        .expect("Failed to reopen datastore");
    let value = datastore.get("key1").expect("Data should persist");
    assert_eq!(value, b"value1");
    datastore.close();
}

#[test]
fn test_on_disk_keys_persists() {
    let dir = tempdir().expect("Failed to create temp dir");
    let data_path = dir.path().to_path_buf();
    let ks_path = dir.path().join("keystore.sqlite");

    let local;
    {
        let keystore = Keystore::get(ks_path.clone()).expect("Failed to create keystore");
        local = keystore
            .create_kek(KekType::LocalKey, "", b"", Duration::ZERO)
            .expect("create local kek");
        keystore
            .create_dek("listcol", &local, false)
            .expect("Failed to create DEK");
        let datastore =
            LockstoreDatastore::new(data_path.clone(), "listcol".to_string(), keystore, &local)
                .expect("Failed to create on-disk datastore");
        datastore.put("a", b"1").expect("Failed to put");
        datastore.put("b", b"2").expect("Failed to put");
        datastore.put("c", b"3").expect("Failed to put");
        datastore.close();
    }

    let keystore = Keystore::get(ks_path).expect("Failed to reopen keystore");
    let datastore = LockstoreDatastore::new(data_path, "listcol".to_string(), keystore, &local)
        .expect("Failed to reopen datastore");
    let keys = datastore.keys().expect("Failed to list keys");
    assert_eq!(keys.len(), 3);
    assert!(keys.contains(&"a".to_string()));
    assert!(keys.contains(&"b".to_string()));
    assert!(keys.contains(&"c".to_string()));
    datastore.close();
}

#[test]
fn test_in_memory_datastore_with_on_disk_keystore() {
    let dir = tempdir().expect("Failed to create temp dir");
    let ks_path = dir.path().join("keystore.sqlite");

    let keystore = Keystore::get(ks_path).expect("Failed to create keystore");
    let local = keystore
        .create_kek(KekType::LocalKey, "", b"", Duration::ZERO)
        .expect("create local kek");
    keystore
        .create_dek("memcol", &local, false)
        .expect("Failed to create DEK");

    let datastore = LockstoreDatastore::new_in_memory("memcol".to_string(), keystore, &local)
        .expect("Failed to create in-memory datastore with on-disk keystore");

    datastore.put("key1", b"value1").expect("Failed to put");
    let value = datastore.get("key1").expect("Failed to get");
    assert_eq!(value, b"value1");
    datastore.close();
}

#[test]
fn test_on_disk_datastore_with_in_memory_keystore() {
    let dir = tempdir().expect("Failed to create temp dir");

    let keystore = Arc::new(Keystore::new_in_memory().expect("Failed to create keystore"));
    let local = keystore
        .create_kek(KekType::LocalKey, "", b"", Duration::ZERO)
        .expect("create local kek");
    keystore
        .create_dek("ondisk", &local, false)
        .expect("Failed to create DEK");

    let datastore = LockstoreDatastore::new(
        dir.path().to_path_buf(),
        "ondisk".to_string(),
        keystore,
        &local,
    )
    .expect("Failed to create on-disk datastore with in-memory keystore");

    datastore.put("key1", b"value1").expect("Failed to put");
    let value = datastore.get("key1").expect("Failed to get");
    assert_eq!(value, b"value1");
    datastore.close();
}

#[test]
fn test_multiple_collections_shared_on_disk_keystore() {
    let dir = tempdir().expect("Failed to create temp dir");
    let ks_path = dir.path().join("keystore.sqlite");

    let keystore = Keystore::get(ks_path).expect("Failed to create keystore");
    let local = keystore
        .create_kek(KekType::LocalKey, "", b"", Duration::ZERO)
        .expect("create local kek");
    keystore
        .create_dek("col_a", &local, false)
        .expect("Failed to create DEK for col_a");
    keystore
        .create_dek("col_b", &local, false)
        .expect("Failed to create DEK for col_b");

    let ds_a = LockstoreDatastore::new(
        dir.path().to_path_buf(),
        "col_a".to_string(),
        keystore.clone(),
        &local,
    )
    .expect("Failed to create datastore A");

    let ds_b = LockstoreDatastore::new(
        dir.path().to_path_buf(),
        "col_b".to_string(),
        keystore,
        &local,
    )
    .expect("Failed to create datastore B");

    ds_a.put("key", b"from_a").expect("Failed to put to A");
    ds_b.put("key", b"from_b").expect("Failed to put to B");

    assert_eq!(ds_a.get("key").expect("Failed to get from A"), b"from_a");
    assert_eq!(ds_b.get("key").expect("Failed to get from B"), b"from_b");

    let keys_a = ds_a.keys().expect("Failed to list A");
    let keys_b = ds_b.keys().expect("Failed to list B");
    assert_eq!(keys_a, vec!["key"]);
    assert_eq!(keys_b, vec!["key"]);

    ds_a.close();
    ds_b.close();
}

#[test]
fn test_cross_kek_access() {
    let dir = tempdir().expect("Failed to create temp dir");
    let ks_path = dir.path().join("keystore.sqlite");
    let data_path = dir.path().to_path_buf();

    let keystore = Keystore::get(ks_path).expect("Failed to create keystore");
    let local = keystore
        .create_kek(KekType::LocalKey, "", b"", Duration::ZERO)
        .expect("create local kek");
    let other = keystore
        .create_kek(KekType::LocalKey, "", b"", Duration::ZERO)
        .expect("create local kek");
    keystore
        .create_dek("col", &local, false)
        .expect("Failed to create DEK");
    keystore
        .add_kek("col", &local, &other)
        .expect("Failed to add second KEK");

    {
        let ds = LockstoreDatastore::new(
            data_path.clone(),
            "col".to_string(),
            keystore.clone(),
            &local,
        )
        .expect("Failed to create datastore with LocalKey");
        ds.put("entry", b"secret_data").expect("Failed to put");
        ds.close();
    }

    let ds = LockstoreDatastore::new(data_path, "col".to_string(), keystore, &other)
        .expect("Failed to create datastore with second KEK");
    let value = ds
        .get("entry")
        .expect("Data should be accessible via second KEK");
    assert_eq!(value, b"secret_data");
    ds.close();
}
