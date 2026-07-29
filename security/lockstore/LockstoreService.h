/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_security_lockstore_LockstoreService_h
#define mozilla_security_lockstore_LockstoreService_h

#include "mozilla/Mutex.h"
#include "mozilla/Result.h"
#include "mozilla/security/lockstore/lockstore_ffi_generated.h"
#include "nsCOMPtr.h"
#include "nsILockstore.h"
#include "nsIObserver.h"
#include "nsString.h"
#include "nsTArray.h"

namespace mozilla::security::lockstore {

class LockstoreService final : public nsILockstore, public nsIObserver {
 public:
  NS_DECL_THREADSAFE_ISUPPORTS
  NS_DECL_NSILOCKSTORE
  NS_DECL_NSIOBSERVER

  LockstoreService();

  // Registered as the singleton's `init_method` in components.conf.
  nsresult Init();

  // Reachable from C++ consumers without going through XPCOM. The
  // keystore is locked and closed at `profile-before-change` /
  // `xpcom-shutdown` via the registered observers; the service object
  // itself is released when the XPCOM component manager drops its
  // singleton ref. Callers may hold a `RefPtr` past shutdown, but
  // operations on it will fail with `NS_ERROR_NOT_AVAILABLE`.
  static already_AddRefed<LockstoreService> GetSingleton();

  // ---------------------------------------------------------------------
  // Synchronous C++ tier
  //
  // In-tree off-main-thread C++ consumers (mls_gk, SQLite encryption,
  // …) call these directly. Each method invokes the FFI on the calling
  // thread under `mMutex` and returns the result. Debug builds assert
  // off-main-thread; callers on the main thread should wrap with
  // `NS_DispatchBackgroundTask` themselves.
  //
  // The XPCOM tier (`NS_IMETHODIMP …` methods declared by
  // `NS_DECL_NSILOCKSTORE`) is implemented on top of these via
  // `ImplXpcomMethod`, which performs the dispatch + DOM-Promise bridge
  // for JS callers.
  // ---------------------------------------------------------------------

  nsresult DoUnlockKek(const nsACString& aKekRef, const nsACString& aSecret,
                       uint32_t aTimeoutMs);
  nsresult DoLockKek(const nsACString& aKekRef);
  nsresult DoLock();
  nsresult DoCreateDek(const nsACString& aCollection, const nsACString& aKekRef,
                       bool aExtractable, uint32_t aKeySize);
  nsresult DoImportDek(const nsACString& aCollection, const nsACString& aKekRef,
                       const nsTArray<uint8_t>& aDekBytes, bool aExtractable);
  Result<bool, nsresult> DoIsDekExtractable(const nsACString& aCollection);
  nsresult DoDeleteDek(const nsACString& aCollection);
  nsresult DoAddKek(const nsACString& aCollection,
                    const nsACString& aFromKekRef, const nsACString& aToKekRef);
  nsresult DoRemoveKek(const nsACString& aCollection,
                       const nsACString& aKekRef);
  nsresult DoSwitchKek(const nsACString& aCollection,
                       const nsACString& aOldKekRef,
                       const nsACString& aNewKekRef);
  Result<nsTArray<nsCString>, nsresult> DoListDeks();
  Result<nsTArray<nsCString>, nsresult> DoListKeks(const nsACString& aDekName);
  Result<nsTArray<uint8_t>, nsresult> DoEncrypt(
      const nsACString& aCollection, const nsACString& aKekRef,
      const nsTArray<uint8_t>& aPlaintext);
  Result<nsTArray<uint8_t>, nsresult> DoDecrypt(
      const nsACString& aCollection, const nsACString& aKekRef,
      const nsTArray<uint8_t>& aCiphertext);
  Result<nsTArray<uint8_t>, nsresult> DoGetDek(const nsACString& aCollection,
                                               const nsACString& aKekRef);
  Result<nsCString, nsresult> DoCreateKek(const nsACString& aKekType,
                                          const nsACString& aIdentifier,
                                          const nsACString& aSecret,
                                          uint32_t aCacheTimeoutMs);
  nsresult DoDeleteKek(const nsACString& aKekRef);

 private:
  ~LockstoreService();

  // Opens the keystore against the current profile if not already open.
  // Called under mMutex by every FFI-touching method.
  nsresult EnsureOpenLocked() MOZ_REQUIRES(mMutex);

  // Resolve and cache `mProfilePath` on the main thread. No-op if the profile
  // is not yet available (early startup, before profile selection) or the path
  // is already cached. Idempotent; called from `Init()` and on
  // `profile-do-change`.
  void CacheProfilePathOnMainThread();

  // Protects mKeystore and mShutdown. Held across every FFI call so a
  // shutdown racing with an in-flight operation cannot free the handle
  // out from under the worker. Serialises every call into the FFI:
  // concurrent XPCOM / C++ direct callers queue on this mutex, which
  // is why no dedicated serial event target is needed.
  //
  // Lock ordering: acquired *before* any call into the Rust FFI, which
  // has its own `Keystore::connection_lock`. Always mMutex first, then
  // any Rust-side lock — never the reverse.
  Mutex mMutex;

  // FFI handle for the per-profile keystore. Null between construction
  // and the first FFI dispatch; opened lazily by `EnsureOpenLocked`
  // and closed in `Observe()` (on shutdown) and the destructor.
  KeystoreHandle* mKeystore MOZ_GUARDED_BY(mMutex);

  // Latches true on the first `profile-before-change` /
  // `xpcom-shutdown` notification. Subsequent calls through
  // `EnsureOpenLocked` short-circuit with `NS_ERROR_NOT_AVAILABLE`, so
  // no new FFI work starts after shutdown.
  bool mShutdown MOZ_GUARDED_BY(mMutex);

  // Cached UTF-8 absolute path of the keystore parent directory (`<profile>`).
  // Resolved on the main thread -- in `Init()` if the profile is already
  // available, otherwise on `profile-do-change` -- because
  // `nsIDirectoryService::Get` asserts main-thread while the sync `Do*` tier
  // runs off-main. Guarded by mMutex: it may be written on the main thread at
  // `profile-do-change` while a `Do*` call reads it off-main.
  nsCString mProfilePath MOZ_GUARDED_BY(mMutex);
};

}  // namespace mozilla::security::lockstore

#endif  // mozilla_security_lockstore_LockstoreService_h
