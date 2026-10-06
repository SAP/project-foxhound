/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"

#include "mozilla/gtest/MozAssertions.h"
#include "mozilla/security/lockstore/lockstore_ffi_generated.h"
#include "nsCOMPtr.h"
#include "nsDirectoryServiceDefs.h"
#include "nsIFile.h"
#include "nsString.h"
#include "nsTArray.h"

using mozilla::security::lockstore::keystore_close;
using mozilla::security::lockstore::keystore_create_dek;
using mozilla::security::lockstore::keystore_create_kek;
using mozilla::security::lockstore::keystore_open;
using mozilla::security::lockstore::KeystoreHandle;
using mozilla::security::lockstore::lockstore_datastore_close;
using mozilla::security::lockstore::lockstore_datastore_delete;
using mozilla::security::lockstore::lockstore_datastore_get;
using mozilla::security::lockstore::lockstore_datastore_keys;
using mozilla::security::lockstore::lockstore_datastore_open;
using mozilla::security::lockstore::lockstore_datastore_put;
using mozilla::security::lockstore::LockstoreDatastore;

class LockstoreDatastoreTest : public ::testing::Test {
 protected:
  nsCOMPtr<nsIFile> mTmpDir;
  nsAutoCString mProfilePath;
  const nsCString mTestColl{"test"};
  nsCString mLocalKekRef;
  KeystoreHandle* mKeystore = nullptr;
  LockstoreDatastore* mDatastore = nullptr;

  void SetUp() override {
    nsresult rv =
        NS_GetSpecialDirectory(NS_OS_TEMP_DIR, getter_AddRefs(mTmpDir));
    ASSERT_NS_SUCCEEDED(rv);
    rv = mTmpDir->AppendNative("lockstore_ds_test"_ns);
    ASSERT_NS_SUCCEEDED(rv);
    rv = mTmpDir->CreateUnique(nsIFile::DIRECTORY_TYPE, 0700);
    ASSERT_NS_SUCCEEDED(rv);
    nsAutoString profilePathWide;
    rv = mTmpDir->GetPath(profilePathWide);
    ASSERT_NS_SUCCEEDED(rv);
    mProfilePath = NS_ConvertUTF16toUTF8(profilePathWide);

    rv = keystore_open(&mProfilePath, &mKeystore);
    ASSERT_NS_SUCCEEDED(rv);

    const nsCString kekType("local"_ns);
    const nsCString empty;
    rv = keystore_create_kek(mKeystore, &kekType, &empty, &empty,
                             /* cache_timeout_ms */ 0, &mLocalKekRef);
    ASSERT_NS_SUCCEEDED(rv);

    rv = keystore_create_dek(mKeystore, &mTestColl, &mLocalKekRef, false,
                             /*key_size=*/32);
    ASSERT_NS_SUCCEEDED(rv);
  }

  void TearDown() override {
    if (mDatastore) {
      EXPECT_NS_SUCCEEDED(lockstore_datastore_close(mDatastore));
      mDatastore = nullptr;
    }
    if (mKeystore) {
      EXPECT_NS_SUCCEEDED(keystore_close(mKeystore));
      mKeystore = nullptr;
    }
    if (mTmpDir) {
      mTmpDir->Remove(true);
    }
  }
};

TEST_F(LockstoreDatastoreTest, OpenAndClose) {
  nsresult rv = lockstore_datastore_open(mKeystore, &mTestColl, &mLocalKekRef,
                                         &mDatastore);
  ASSERT_NS_SUCCEEDED(rv);
  ASSERT_NE(mDatastore, nullptr);
  nsresult rvClose = lockstore_datastore_close(mDatastore);
  mDatastore = nullptr;
  ASSERT_NS_SUCCEEDED(rvClose);
}

TEST_F(LockstoreDatastoreTest, OpenEmptyCollection) {
  nsAutoCString empty;
  nsresult rv =
      lockstore_datastore_open(mKeystore, &empty, &mLocalKekRef, &mDatastore);
  ASSERT_EQ(rv, NS_ERROR_INVALID_ARG);
  ASSERT_EQ(mDatastore, nullptr);
}

TEST_F(LockstoreDatastoreTest, OpenNoDek) {
  const nsCString noDekColl("nodek");
  nsresult rv = lockstore_datastore_open(mKeystore, &noDekColl, &mLocalKekRef,
                                         &mDatastore);
  ASSERT_EQ(rv, NS_ERROR_NOT_AVAILABLE);
  ASSERT_EQ(mDatastore, nullptr);
}

TEST_F(LockstoreDatastoreTest, PutGetRoundtrip) {
  nsresult rv = lockstore_datastore_open(mKeystore, &mTestColl, &mLocalKekRef,
                                         &mDatastore);
  ASSERT_NS_SUCCEEDED(rv);

  const nsCString entry("entry1");
  const uint8_t data[] = {0xDE, 0xAD, 0xBE, 0xEF, 0x42};
  rv = lockstore_datastore_put(mDatastore, &entry, data, sizeof(data));
  ASSERT_NS_SUCCEEDED(rv);

  nsTArray<uint8_t> result;
  rv = lockstore_datastore_get(mDatastore, &entry, &result);
  ASSERT_NS_SUCCEEDED(rv);
  ASSERT_EQ(result.Length(), sizeof(data));
  EXPECT_EQ(memcmp(result.Elements(), data, sizeof(data)), 0);
}

TEST_F(LockstoreDatastoreTest, PutEmptyEntry) {
  nsresult rv = lockstore_datastore_open(mKeystore, &mTestColl, &mLocalKekRef,
                                         &mDatastore);
  ASSERT_NS_SUCCEEDED(rv);

  nsAutoCString empty;
  const uint8_t data[] = {0x01};
  rv = lockstore_datastore_put(mDatastore, &empty, data, sizeof(data));
  ASSERT_EQ(rv, NS_ERROR_INVALID_ARG);
}

TEST_F(LockstoreDatastoreTest, PutZeroLength) {
  nsresult rv = lockstore_datastore_open(mKeystore, &mTestColl, &mLocalKekRef,
                                         &mDatastore);
  ASSERT_NS_SUCCEEDED(rv);

  const nsCString entry("entry1");
  const uint8_t data[] = {0x01};
  rv = lockstore_datastore_put(mDatastore, &entry, data, 0);
  ASSERT_EQ(rv, NS_ERROR_INVALID_ARG);
}

TEST_F(LockstoreDatastoreTest, PutOverwrite) {
  nsresult rv = lockstore_datastore_open(mKeystore, &mTestColl, &mLocalKekRef,
                                         &mDatastore);
  ASSERT_NS_SUCCEEDED(rv);

  const nsCString entry("entry1");
  const uint8_t first[] = {0x01, 0x02};
  rv = lockstore_datastore_put(mDatastore, &entry, first, sizeof(first));
  ASSERT_NS_SUCCEEDED(rv);

  const uint8_t second[] = {0x03, 0x04, 0x05};
  rv = lockstore_datastore_put(mDatastore, &entry, second, sizeof(second));
  ASSERT_NS_SUCCEEDED(rv);

  nsTArray<uint8_t> result;
  rv = lockstore_datastore_get(mDatastore, &entry, &result);
  ASSERT_NS_SUCCEEDED(rv);
  ASSERT_EQ(result.Length(), sizeof(second));
  EXPECT_EQ(memcmp(result.Elements(), second, sizeof(second)), 0);
}

TEST_F(LockstoreDatastoreTest, GetEmptyEntry) {
  nsresult rv = lockstore_datastore_open(mKeystore, &mTestColl, &mLocalKekRef,
                                         &mDatastore);
  ASSERT_NS_SUCCEEDED(rv);

  nsAutoCString empty;
  nsTArray<uint8_t> result;
  rv = lockstore_datastore_get(mDatastore, &empty, &result);
  ASSERT_EQ(rv, NS_ERROR_INVALID_ARG);
}

TEST_F(LockstoreDatastoreTest, GetNonexistent) {
  nsresult rv = lockstore_datastore_open(mKeystore, &mTestColl, &mLocalKekRef,
                                         &mDatastore);
  ASSERT_NS_SUCCEEDED(rv);

  const nsCString entry("nosuch");
  nsTArray<uint8_t> result;
  rv = lockstore_datastore_get(mDatastore, &entry, &result);
  ASSERT_EQ(rv, NS_ERROR_NOT_AVAILABLE);
}

TEST_F(LockstoreDatastoreTest, DeleteExisting) {
  nsresult rv = lockstore_datastore_open(mKeystore, &mTestColl, &mLocalKekRef,
                                         &mDatastore);
  ASSERT_NS_SUCCEEDED(rv);

  const nsCString entry("entry1");
  const uint8_t data[] = {0x01, 0x02};
  rv = lockstore_datastore_put(mDatastore, &entry, data, sizeof(data));
  ASSERT_NS_SUCCEEDED(rv);

  rv = lockstore_datastore_delete(mDatastore, &entry);
  ASSERT_NS_SUCCEEDED(rv);
}

TEST_F(LockstoreDatastoreTest, DeleteEmptyEntry) {
  nsresult rv = lockstore_datastore_open(mKeystore, &mTestColl, &mLocalKekRef,
                                         &mDatastore);
  ASSERT_NS_SUCCEEDED(rv);

  nsAutoCString empty;
  rv = lockstore_datastore_delete(mDatastore, &empty);
  ASSERT_EQ(rv, NS_ERROR_INVALID_ARG);
}

TEST_F(LockstoreDatastoreTest, DeleteNonexistent) {
  nsresult rv = lockstore_datastore_open(mKeystore, &mTestColl, &mLocalKekRef,
                                         &mDatastore);
  ASSERT_NS_SUCCEEDED(rv);

  const nsCString entry("nosuch");
  rv = lockstore_datastore_delete(mDatastore, &entry);
  ASSERT_EQ(rv, NS_ERROR_NOT_AVAILABLE);
}

TEST_F(LockstoreDatastoreTest, DeleteThenGet) {
  nsresult rv = lockstore_datastore_open(mKeystore, &mTestColl, &mLocalKekRef,
                                         &mDatastore);
  ASSERT_NS_SUCCEEDED(rv);

  const nsCString entry("entry1");
  const uint8_t data[] = {0x01};
  rv = lockstore_datastore_put(mDatastore, &entry, data, sizeof(data));
  ASSERT_NS_SUCCEEDED(rv);

  rv = lockstore_datastore_delete(mDatastore, &entry);
  ASSERT_NS_SUCCEEDED(rv);

  nsTArray<uint8_t> result;
  rv = lockstore_datastore_get(mDatastore, &entry, &result);
  ASSERT_EQ(rv, NS_ERROR_NOT_AVAILABLE);
}

TEST_F(LockstoreDatastoreTest, KeysEmpty) {
  nsresult rv = lockstore_datastore_open(mKeystore, &mTestColl, &mLocalKekRef,
                                         &mDatastore);
  ASSERT_NS_SUCCEEDED(rv);

  nsTArray<nsCString> entries;
  rv = lockstore_datastore_keys(mDatastore, &entries);
  ASSERT_NS_SUCCEEDED(rv);
  EXPECT_EQ(entries.Length(), 0u);
}

TEST_F(LockstoreDatastoreTest, ListEntries) {
  nsresult rv = lockstore_datastore_open(mKeystore, &mTestColl, &mLocalKekRef,
                                         &mDatastore);
  ASSERT_NS_SUCCEEDED(rv);

  const nsCString keyA("key_a");
  const nsCString keyB("key_b");
  const nsCString keyC("key_c");
  const uint8_t data[] = {0x01};
  rv = lockstore_datastore_put(mDatastore, &keyA, data, sizeof(data));
  ASSERT_NS_SUCCEEDED(rv);
  rv = lockstore_datastore_put(mDatastore, &keyB, data, sizeof(data));
  ASSERT_NS_SUCCEEDED(rv);
  rv = lockstore_datastore_put(mDatastore, &keyC, data, sizeof(data));
  ASSERT_NS_SUCCEEDED(rv);

  nsTArray<nsCString> entries;
  rv = lockstore_datastore_keys(mDatastore, &entries);
  ASSERT_NS_SUCCEEDED(rv);
  ASSERT_EQ(entries.Length(), 3u);
  EXPECT_TRUE(entries.Contains(keyA));
  EXPECT_TRUE(entries.Contains(keyB));
  EXPECT_TRUE(entries.Contains(keyC));
}

TEST_F(LockstoreDatastoreTest, PersistenceAcrossReopen) {
  nsresult rv = lockstore_datastore_open(mKeystore, &mTestColl, &mLocalKekRef,
                                         &mDatastore);
  ASSERT_NS_SUCCEEDED(rv);

  const nsCString entry("persist");
  const uint8_t data[] = {0x01, 0x02, 0x03};
  rv = lockstore_datastore_put(mDatastore, &entry, data, sizeof(data));
  ASSERT_NS_SUCCEEDED(rv);

  ASSERT_NS_SUCCEEDED(lockstore_datastore_close(mDatastore));
  mDatastore = nullptr;

  rv = lockstore_datastore_open(mKeystore, &mTestColl, &mLocalKekRef,
                                &mDatastore);
  ASSERT_NS_SUCCEEDED(rv);

  nsTArray<uint8_t> result;
  rv = lockstore_datastore_get(mDatastore, &entry, &result);
  ASSERT_NS_SUCCEEDED(rv);
  ASSERT_EQ(result.Length(), sizeof(data));
  EXPECT_EQ(memcmp(result.Elements(), data, sizeof(data)), 0);
}

TEST_F(LockstoreDatastoreTest, KeystoreCloseBeforeDatastore) {
  nsresult rv = lockstore_datastore_open(mKeystore, &mTestColl, &mLocalKekRef,
                                         &mDatastore);
  ASSERT_NS_SUCCEEDED(rv);

  const nsCString entry("item");
  const uint8_t data[] = {0xAB};
  rv = lockstore_datastore_put(mDatastore, &entry, data, sizeof(data));
  ASSERT_NS_SUCCEEDED(rv);

  nsresult rvClose = keystore_close(mKeystore);
  mKeystore = nullptr;
  ASSERT_NS_SUCCEEDED(rvClose);

  nsTArray<uint8_t> result;
  rv = lockstore_datastore_get(mDatastore, &entry, &result);
  ASSERT_NS_SUCCEEDED(rv);
  ASSERT_EQ(result.Length(), sizeof(data));
  EXPECT_EQ(memcmp(result.Elements(), data, sizeof(data)), 0);
}
