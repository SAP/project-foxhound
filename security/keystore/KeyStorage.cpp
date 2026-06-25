/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: sw=2 ts=2 et lcs=trail\:.,tab\:>~ :
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "KeyStorage.h"

#include "Persist.h"
#include "Profile.h"

#include "GMPUtils.h"
#include "pk11sdr.h"

#include "nsLocalFile.h"
#include "nsTHashMap.h"

#include "mozilla/Base64.h"
#include "mozilla/Logging.h"
#include "mozilla/StaticPrefs_security.h"

namespace mozilla::storage::key {

mozilla::StaticMutex sKeyMutex;
constinit static nsTHashMap<nsCString, Key> sKeyMap;
constinit static mozilla::UniquePK11SymKey sSystemKey;

nsresult Init() {
  if (StaticPrefs::security_storage_encryption_sqlite_enabled()) {
    if (!EnsureNSSInitializedChromeOrContent()) {
      return NS_ERROR_FAILURE;
    }
  }
  InitObserver();
  return NS_OK;
}

void Shutdown() {
  mozilla::StaticMutexAutoLock lock(sKeyMutex);
  sSystemKey.reset(nullptr);
  sKeyMap.Clear();
}

mozilla::LogModule* GetKeyStorageLog() {
  static mozilla::LazyLogModule sLog("KeyStorage");

  return sLog;
}

/// Create "system" key
/// `keyOut` will contain the SDR encrypted key bytes
/// `SYSTEM_KEY` will the a AES-GCM PK11SymKey created from those bytes
nsresult CreateSystemKey(Key& aKeyOut) {
  sKeyMutex.AssertCurrentThreadOwns();

  // Every key is 32 bytes long
  mozilla::UniqueSECItem key =
      mozilla::UniqueSECItem(::SECITEM_AllocItem(nullptr, nullptr, 32));
  if (!key) return NS_ERROR_FAILURE;

  // Key data is random
  SECStatus stat = PK11_GenerateRandom(key->data, key->len);
  if (stat != SECSuccess) return MapSECStatus(stat);

  mozilla::UniquePK11SlotInfo slot(PK11_GetInternalSlot());
  if (!slot) return NS_ERROR_FAILURE;

  sSystemKey = mozilla::UniquePK11SymKey(
      PK11_ImportSymKey(slot.get(), CKM_AES_GCM, PK11_OriginUnwrap,
                        CKA_ENCRYPT | CKA_DECRYPT, key.get(), nullptr));
  if (!sSystemKey) return NS_ERROR_FAILURE;

  // Use the default SDR key
  SECItem keyid = {siBuffer, nullptr, 0};

  // PK11SDR_EncryptWithMechanism will allocate the needed buffer in SECItem
  mozilla::UniqueSECItem encryptedKey(::SECITEM_AllocItem(nullptr, nullptr, 0));

  stat = PK11SDR_EncryptWithMechanism(nullptr, &keyid, CKM_AES_CBC, key.get(),
                                      encryptedKey.get(), nullptr);
  if (stat != SECSuccess) return MapSECStatus(stat);

  aKeyOut =
      Key{std::move(encryptedKey),
          mozilla::UniqueSECItem(::SECITEM_AllocItem(nullptr, nullptr, 0))};

  return NS_OK;
}

CK_GCM_PARAMS MakeGCMParams(const nsACString& aIdentifier,
                            const mozilla::UniqueSECItem& aIv) {
  CK_GCM_PARAMS gcmParams;
  gcmParams.pIv = (CK_BYTE_PTR)aIv->data;
  gcmParams.ulIvLen = aIv->len;
  gcmParams.ulIvBits = aIv->len * 8;
  gcmParams.pAAD = (CK_BYTE_PTR)aIdentifier.BeginReading();
  gcmParams.ulAADLen = aIdentifier.Length();
  gcmParams.ulTagBits = 128;

  return gcmParams;
}

/// Create a new key
nsresult CreateDatabaseKey(const nsACString& aIdentifier, Key& aKeyOut) {
  // Every key is 32 bytes long
  mozilla::UniqueSECItem key =
      mozilla::UniqueSECItem(::SECITEM_AllocItem(nullptr, nullptr, 32));
  if (!key) return NS_ERROR_FAILURE;

  // Key data is random
  SECStatus stat = PK11_GenerateRandom(key->data, key->len);
  if (stat != SECSuccess) return MapSECStatus(stat);

  mozilla::UniqueSECItem iv(::SECITEM_AllocItem(nullptr, nullptr, 12));
  if (!iv) return NS_ERROR_FAILURE;

  // IV data is also random
  stat = PK11_GenerateRandom(iv->data, iv->len);
  if (stat != SECSuccess) return MapSECStatus(stat);

  CK_GCM_PARAMS gcmParams = MakeGCMParams(aIdentifier, iv);

  SECItem gcmItem;
  gcmItem.type = siBuffer;
  gcmItem.data = (unsigned char*)&gcmParams;
  gcmItem.len = sizeof(gcmParams);

  // PK11_Encrypt needs an existing buffer
  mozilla::UniqueSECItem encryptedKey(
      ::SECITEM_AllocItem(nullptr, nullptr, 64));
  if (!encryptedKey) return NS_ERROR_FAILURE;

  unsigned int encryptedLen = 0;

  stat =
      PK11_Encrypt(sSystemKey.get(), CKM_AES_GCM, &gcmItem, encryptedKey->data,
                   &encryptedLen, encryptedKey->len, key->data, key->len);
  if (stat != SECSuccess) return MapSECStatus(stat);

  // Resize buffer to actual length
  stat = SECITEM_ReallocItemV2(nullptr, encryptedKey.get(), encryptedLen);
  if (stat != SECSuccess) return MapSECStatus(stat);

  aKeyOut = Key{std::move(encryptedKey), std::move(iv)};

  return NS_OK;
}

nsresult ImportSystemKey(const nsACString& aEncodedKey) {
  sKeyMutex.AssertCurrentThreadOwns();

  nsCString encryptedKey;
  nsresult rv = mozilla::Base64Decode(aEncodedKey, encryptedKey);
  NS_ENSURE_SUCCESS(rv, rv);

  mozilla::UniqueSECItem wrappedKey(::SECITEM_AllocItem(nullptr, nullptr, 0));
  SECStatus stat = SECITEM_MakeItem(nullptr, wrappedKey.get(),
                                    (unsigned char*)encryptedKey.Data(),
                                    encryptedKey.Length());
  if (stat != SECSuccess) return MapSECStatus(stat);

  mozilla::UniqueSECItem unwrapped(::SECITEM_AllocItem(nullptr, nullptr, 0));
  stat = PK11SDR_Decrypt(wrappedKey.get(), unwrapped.get(), nullptr);
  if (stat != SECSuccess) return MapSECStatus(stat);

  mozilla::UniquePK11SlotInfo slot(PK11_GetInternalSlot());
  if (!slot) return NS_ERROR_FAILURE;

  sSystemKey = mozilla::UniquePK11SymKey(
      PK11_ImportSymKey(slot.get(), CKM_AES_GCM, PK11_OriginUnwrap,
                        CKA_ENCRYPT | CKA_DECRYPT, unwrapped.get(), nullptr));
  if (!sSystemKey) return NS_ERROR_FAILURE;
  return NS_OK;
}

/// Import a single, encoded and encrypted key, and encoded IV as `path`
nsresult ImportDatabaseKey(const nsCString& aPath, const nsCString& aEncodedKey,
                           const nsCString& aEncodedIV) {
  sKeyMutex.AssertCurrentThreadOwns();

  // Key and IV are encoded Base64 strings
  nsCString encryptedKey, stringIV;
  nsresult rv = mozilla::Base64Decode(aEncodedKey, encryptedKey);
  NS_ENSURE_SUCCESS(rv, rv);
  rv = mozilla::Base64Decode(aEncodedIV, stringIV);
  NS_ENSURE_SUCCESS(rv, rv);

  // Key and IV need to go into heap-allocated SECItems, because they may be
  // stored into sKeyMap, which outlives encryptedKey/stringIV
  mozilla::UniqueSECItem key(::SECITEM_AllocItem(nullptr, nullptr, 0));
  SECStatus stat =
      SECITEM_MakeItem(nullptr, key.get(), (unsigned char*)encryptedKey.Data(),
                       encryptedKey.Length());
  if (stat != SECSuccess) return MapSECStatus(stat);

  mozilla::UniqueSECItem iv(::SECITEM_AllocItem(nullptr, nullptr, 0));
  stat = SECITEM_MakeItem(nullptr, iv.get(), (unsigned char*)stringIV.Data(),
                          stringIV.Length());
  if (stat != SECSuccess) return MapSECStatus(stat);

  sKeyMap.InsertOrUpdate(aPath, Key{std::move(key), std::move(iv)});

  return NS_OK;
}

// Decrypt key with "system" key
SECStatus DecryptKey(Key& aKey, const nsACString& aIdentifier, SECItem* aData) {
  CK_GCM_PARAMS gcmParams = MakeGCMParams(aIdentifier, aKey.iv);

  SECItem gcmItem;
  gcmItem.type = siBuffer;
  gcmItem.data = (unsigned char*)&gcmParams;
  gcmItem.len = sizeof(gcmParams);

  SECITEM_AllocItem(nullptr, aData, 32);
  if (!aData->data) {
    PR_SetError(PR_OUT_OF_MEMORY_ERROR, 0);
    return SECFailure;
  }

  unsigned int decryptedLen = 0;

  SECStatus stat =
      PK11_Decrypt(sSystemKey.get(), CKM_AES_GCM, &gcmItem, aData->data,
                   &decryptedLen, aData->len, aKey.key->data, aKey.key->len);

  aData->len = decryptedLen;

  return stat;
}

/// Obtain requested key assuming owned mutex
nsresult FetchOrCreateKey(const nsACString& aIdentifier, SECItem* aData) {
  mozilla::StaticMutexAutoLock lock(sKeyMutex);

  nsresult rv;
  // Load keys if it hasn't happened yet
  if (sKeyMap.IsEmpty()) {
    MOZ_LOG(GetKeyStorageLog(), mozilla::LogLevel::Debug,
            ("Reading keys from disk"));
    rv = LoadKeysFromDisk();
    NS_ENSURE_SUCCESS(rv, rv);
    // No keys loaded, so the keystore didn't exist before. Create it!
    if (sSystemKey == nullptr) {
      MOZ_LOG(GetKeyStorageLog(), mozilla::LogLevel::Debug,
              ("Initializing key storage"));
      nsAutoCString system(SYSTEM_KEY_NAME);

      Key key = {0, 0};

      nsresult rv = CreateSystemKey(key);
      NS_ENSURE_SUCCESS(rv, rv);

      rv = WriteKeyToDisk(system, key);
      NS_ENSURE_SUCCESS(rv, rv);
    }
  }

  // Key doesn't exist after keys have been loaded. Create it!
  if (!sKeyMap.Contains(aIdentifier)) {
    Key key = {};
    rv = CreateDatabaseKey(aIdentifier, key);
    NS_ENSURE_SUCCESS(rv, rv);

    MOZ_LOG(GetKeyStorageLog(), mozilla::LogLevel::Debug,
            ("Writing new key for identifier"));

    // Copy key. WriteKeyToDisk may halt to wait for another thread to fetch a
    // key, which needs to know that `identifier` already has a key.
    sKeyMap.InsertOrUpdate(aIdentifier, Key(key));

    rv = WriteKeyToDisk(aIdentifier, key);
    NS_ENSURE_SUCCESS(rv, rv);
  }

  // Decrypt requested key with "system" key
  // Must be accessed through visitor, because UniqueSECItems can't be
  // copied and nsTHashMap doesn't return references throught Get()
  SECStatus stat = sKeyMap.WithEntryHandle(
      aIdentifier, [&aIdentifier, &aData](auto entryHandle) {
        return DecryptKey(entryHandle.Data(), aIdentifier, aData);
      });
  return MapSECStatus(stat);
}

nsresult GetKeyByPath(const char* aPath, nsCString& aKey) {
  nsCOMPtr<nsIFile> file = new nsLocalFile();
  // aPath is UTF-8 (callers pass storage paths from sqlite which are UTF-8).
  nsresult rv = file->InitWithPath(NS_ConvertUTF8toUTF16(aPath));
  NS_ENSURE_SUCCESS(rv, rv);

  return GetKeyByFile(*file, aKey);
}

nsresult GetKeyByFile(nsIFile& aFile, nsCString& aKeyString) {
  // Resolve the identifier relative to the current profile. Files outside
  // the profile have no stable identifier in this scheme, so the caller
  // must handle the failure (typically by falling back to unencrypted).
  nsAutoString profilePath;
  {
    mozilla::StaticMutexAutoLock lock(sKeyMutex);
    nsresult rv = GetCurrentProfilePath(profilePath);
    NS_ENSURE_SUCCESS(rv, rv);
  }

  nsCOMPtr<nsIFile> profile = new nsLocalFile();
  nsresult rv = profile->InitWithPath(profilePath);
  NS_ENSURE_SUCCESS(rv, rv);

  bool isUnder = false;
  rv = profile->Contains(&aFile, &isUnder);
  NS_ENSURE_SUCCESS(rv, rv);
  if (!isUnder) {
    MOZ_LOG(GetKeyStorageLog(), LogLevel::Debug,
            ("Refusing to key database outside profile directory"));
    return NS_ERROR_NOT_AVAILABLE;
  }

  nsAutoCString identifier;
  rv = aFile.GetRelativePath(profile, identifier);
  NS_ENSURE_SUCCESS(rv, rv);

  MOZ_LOG(GetKeyStorageLog(), LogLevel::Debug,
          ("Fetching key for %s", identifier.get()));

  UniqueSECItem key(::SECITEM_AllocItem(nullptr, nullptr, 0));
  rv = FetchOrCreateKey(identifier, key.get());
  NS_ENSURE_SUCCESS(rv, rv);

  aKeyString = mozilla::ToHexString(key->data, key->len);
  return NS_OK;
}
}  // namespace mozilla::storage::key
