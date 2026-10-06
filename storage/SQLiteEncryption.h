/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef STORAGE_SQLITEENCRYPTION_H_
#define STORAGE_SQLITEENCRYPTION_H_

#include <cstdint>

#include "nsStringFwd.h"

enum class nsresult : uint32_t;

namespace mozilla {
class LogModule;
}

namespace mozilla::storage {

// Initialize the SQLite encryption keystore. MUST be called on the main
// thread (typically from mozStorageService::Init) to register its
// observers. Eagerly caches the profile path (an optimization) and
// registers quit-application (keystore teardown) and profile-after-change
// observers. GetDatabaseEncryptionStatus / GetEncryptionKey resolve the
// profile path themselves on first use if the cache is still empty, so this
// need not have populated it.
void InitEncryptionKeystore();

// How a caller intends to open a database, so the key lookup mints a DEK only
// for genuinely new databases and treats a missing DEK for an existing one as
// an error rather than silently creating a fresh key (which would make the
// existing contents unreadable).
enum class OpenIntent : uint8_t {
  CreateIfNew,   // New database: create a DEK if absent (race-safe), else load.
  LoadExisting,  // Existing database: the DEK must exist; missing is an error.
};

// Whether a database should be opened encrypted or as plaintext, decided by
// GetDatabaseEncryptionStatus from the database's location.
enum class EncryptionStatus : uint8_t {
  Unset,      // Sentinel: no decision made yet. Callers initialize to this and
              // refuse the open if it survives a successful
              // GetDatabaseEncryptionStatus return. A real value is always set
              // on NS_OK; this only guards a future code path that forgets to.
  Encrypted,  // In-profile database: open through obfsvfs with a per-DB key.
  Plaintext,  // Out-of-profile database: open unencrypted, no key lookup.
};

// Decide whether the SQLite database at |aDatabasePath| should be encrypted.
// A database under the current profile directory is Encrypted; anything else
// is Plaintext (no stable per-database identifier -- e.g. xpcshell temp files
// or migration imports opened from outside the profile). This is the single
// place the encrypted/plaintext decision is made: callers branch on |aStatus|
// and call GetEncryptionKey only for Encrypted databases.
//
// Safe to call from any thread; resolves and caches the profile path on first
// use. Returns NS_ERROR_NOT_INITIALIZED if the profile directory cannot be
// resolved yet (called before a profile exists); callers must honour that
// error rather than opening plaintext.
nsresult GetDatabaseEncryptionStatus(const nsACString& aDatabasePath,
                                     EncryptionStatus& aStatus);

// True if |aPath|'s basename is one of the bootstrap SQLite databases that
// must never be routed through the at-rest encryption layer: the lockstore
// keystore itself (the source of every per-database key) and NSS's softoken
// databases (key4.db / cert9.db and the legacy key3.db / cert8.db). Routing
// any of these through obfsvfs would deadlock or recurse during the very
// initialization the encryption layer depends on. This is the single source
// of truth for that name list, shared by GetDatabaseEncryptionStatus and
// obfsvfs's bootstrap bypass so the two can never drift apart. Matched by
// exact basename and separator-aware (handles both '/' and '\\', as the
// bootstrap databases reach obfsvfs as native OS paths). Pure string
// inspection: takes no locks and is safe on the hot keyless-open path.
bool IsBootstrapDatabasePath(const nsACString& aPath);

// Look up (or, for OpenIntent::CreateIfNew, lazily create) the obfsvfs
// per-database key for the SQLite database at |aDatabasePath| and return it
// hex-encoded in |aOutHexKey|, ready to be appended to a SQLite file: URI as
// `?key=<aOutHexKey>`.
//
// Only valid for in-profile databases (GetDatabaseEncryptionStatus ==
// Encrypted); the caller must have already gated on that. Backed by
// security/lockstore using KekType::LocalKey, with the lockstore collection
// name being the database's path relative to the profile directory (e.g.
// "places.sqlite").
//
// With OpenIntent::LoadExisting a missing DEK is a hard error (an existing
// in-profile database with no key is unreadable, not silently plaintext);
// OpenIntent::CreateIfNew mints the DEK on first use. Any NS_FAILED return is
// a real error the caller must honour -- there is no "open unencrypted"
// return value.
//
// Safe to call from any thread; resolves and caches the profile path on first
// use. NSS must be initialized before calling -- callers in storage/ guard
// with EnsureNSSInitializedChromeOrContent.
nsresult GetEncryptionKey(const nsACString& aDatabasePath, OpenIntent aIntent,
                          nsACString& aOutHexKey);

// Release the process-wide lockstore handle held by this module. Called
// from mozStorageService shutdown.
void ShutdownEncryptionKeystore();

// Log module for SQLite encryption diagnostics. Toggle via
// MOZ_LOG=SQLiteEncryption:4 (Info) or :5 (Debug).
mozilla::LogModule* GetSQLiteEncryptionLog();

}  // namespace mozilla::storage

#endif  // STORAGE_SQLITEENCRYPTION_H_
