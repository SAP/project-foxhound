/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use crate::crypto;
use crate::utils;
use crate::{datastore_filename, Keystore, LockstoreError, StoredValue};

use kvstore::{Database, DatabaseError, GetOptions, Key, Store, StorePath};
use std::path::PathBuf;
use std::sync::Arc;

#[derive(Clone)]
pub struct LockstoreDatastore {
    store: Arc<Store>,
    keystore: Arc<Keystore>,
    collection_name: String,
    kek_ref: String,
}

impl LockstoreDatastore {
    pub fn new(
        dir: PathBuf,
        collection_name: String,
        keystore: Arc<Keystore>,
        kek_ref: &str,
    ) -> Result<Self, LockstoreError> {
        keystore.get_dek_internal(&collection_name, kek_ref)?;
        let data_path = dir.join(datastore_filename(&collection_name));
        Self::init(
            StorePath::OnDisk(data_path),
            collection_name,
            keystore,
            kek_ref,
        )
    }

    pub fn new_in_memory(
        collection_name: String,
        keystore: Arc<Keystore>,
        kek_ref: &str,
    ) -> Result<Self, LockstoreError> {
        keystore.get_dek_internal(&collection_name, kek_ref)?;
        Self::init(
            StorePath::for_in_memory(),
            collection_name,
            keystore,
            kek_ref,
        )
    }

    fn init(
        store_path: StorePath,
        collection_name: String,
        keystore: Arc<Keystore>,
        kek_ref: &str,
    ) -> Result<Self, LockstoreError> {
        let store = Arc::new(Store::new(store_path));
        Ok(Self {
            store,
            keystore,
            collection_name,
            kek_ref: kek_ref.to_string(),
        })
    }

    pub fn put(&self, entry_name: &str, data: &[u8]) -> Result<(), LockstoreError> {
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let stored = StoredValue {
            data: data.to_vec(),
            timestamp,
        };

        let plaintext = serde_json::to_vec(&stored)?;

        let (dek, cipher_suite, _) = self
            .keystore
            .get_dek_internal(&self.collection_name, &self.kek_ref)?;

        let data_to_store = crypto::encrypt_with_key(&plaintext, &dek, cipher_suite)?;

        let full_key = format!("{}::{}", self.collection_name, entry_name);
        let value = utils::bytes_to_value(&data_to_store)?;

        let db = Database::new(&self.store, &self.collection_name);
        let key_obj = Key::from(full_key.as_str());
        db.put(&[(key_obj, Some(value))])?;

        Ok(())
    }

    pub fn get(&self, entry_name: &str) -> Result<Vec<u8>, LockstoreError> {
        let full_key = format!("{}::{}", self.collection_name, entry_name);
        let db = Database::new(&self.store, &self.collection_name);
        let key_obj = Key::from(full_key.as_str());

        let value = db
            .get(&key_obj, &GetOptions::default())?
            .ok_or_else(|| LockstoreError::NotFound(entry_name.to_string()))?;

        let stored_bytes = utils::value_to_bytes(&value)?;

        let (dek, _cipher_suite, _) = self
            .keystore
            .get_dek_internal(&self.collection_name, &self.kek_ref)?;

        let plaintext = crypto::decrypt_with_key(&stored_bytes, &dek)?;

        let stored: StoredValue = serde_json::from_slice(&plaintext)?;
        Ok(stored.data)
    }

    pub fn delete(&self, entry_name: &str) -> Result<(), LockstoreError> {
        let full_key = format!("{}::{}", self.collection_name, entry_name);
        let db = Database::new(&self.store, &self.collection_name);
        let key_obj = Key::from(full_key.as_str());

        if !db.has(&key_obj, &GetOptions::default())? {
            return Err(LockstoreError::NotFound(entry_name.to_string()));
        }

        db.delete(&key_obj)?;
        Ok(())
    }

    pub fn keys(&self) -> Result<Vec<String>, LockstoreError> {
        let reader = self.store.reader()?;
        let prefix = format!("{}::", self.collection_name);

        let entries = reader
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

                let pattern = format!("{}%", prefix);
                let entry_strings: Result<Vec<String>, _> = stmt
                    .query_map([&self.collection_name, &pattern], |row| {
                        let key: String = row.get(0)?;
                        Ok(key.strip_prefix(&prefix).unwrap_or(&key).to_string())
                    })
                    .map_err(DatabaseError::from)?
                    .collect();

                entry_strings.map_err(DatabaseError::from)
            })
            .map_err(LockstoreError::Database)?;

        Ok(entries)
    }

    pub fn close(self) {
        self.store.close();
    }
}
