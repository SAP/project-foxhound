/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: sw=2 ts=2 et lcs=trail\:.,tab\:>~ :
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef KeyStorage_h
#define KeyStorage_h

#include "nsIFile.h"
#include "nsString.h"
#include "mozilla/Logging.h"
#include "mozilla/StaticMutex.h"
#include "ScopedNSSTypes.h"

#define SYSTEM_KEY_NAME "system"

namespace mozilla::storage::key {
extern mozilla::StaticMutex sKeyMutex;

struct Key {
  mozilla::UniqueSECItem key;
  mozilla::UniqueSECItem iv;

  Key() = default;

  Key(mozilla::UniqueSECItem key, mozilla::UniqueSECItem iv)
      : key(std::move(key)), iv(std::move(iv)) {}

  Key(const Key& other)
      : key(SECITEM_DupItem(other.key.get())),
        iv(SECITEM_DupItem(other.iv.get())) {}

  Key(Key&&) = default;

  Key& operator=(Key&&) = default;
};

/**
 * Initialize key storage. Registers a profile observer that tracks the
 * current profile directory so per-database keys can be resolved from
 * worker threads without touching the main-thread-only directory service.
 *
 * Must be called on the main thread, before any call to GetKeyByPath or
 * GetKeyByFile. Idempotent.
 */
nsresult Init();

/**
 * Tear down key storage. Normally invoked by the profile-before-change
 * observer; exposed for shutdown and tests.
 */
void Shutdown();

mozilla::LogModule* GetKeyStorageLog();

nsresult ImportSystemKey(const nsACString& aEncodedKey);
nsresult ImportDatabaseKey(const nsCString& aPath, const nsCString& aEncodedKey,
                           const nsCString& aEncodedIV);

/**
 * Fetch (or lazily create) the encryption key for the database at aPath.
 * aPath is UTF-8 and must identify a file inside the current profile
 * directory. Returns NS_ERROR_NOT_AVAILABLE if the file is not under the
 * profile, so callers can fall back to unencrypted storage.
 */
nsresult GetKeyByPath(const char* aPath, nsCString& aKey);
nsresult GetKeyByFile(nsIFile& aFile, nsCString& aKey);
}  // namespace mozilla::storage::key

#endif  // KeyStorage_h
