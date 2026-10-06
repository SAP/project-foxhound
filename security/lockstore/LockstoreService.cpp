/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "LockstoreService.h"

#include "mozilla/AppShutdown.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/Result.h"
#include "mozilla/Services.h"
#include "mozilla/dom/Promise.h"
#include "nsAppDirectoryServiceDefs.h"
#include "nsCOMPtr.h"
#include "nsDirectoryServiceUtils.h"
#include "nsIFile.h"
#include "nsIGlobalObject.h"
#include "nsIObserverService.h"
#include "nsProxyRelease.h"
#include "nsServiceManagerUtils.h"
#include "nsString.h"
#include "nsTArray.h"
#include "nsThreadUtils.h"
#include "xpcpublic.h"

#include <cstring>
#include <type_traits>
#include <utility>

namespace mozilla::security::lockstore {

using dom::Promise;

NS_IMPL_ISUPPORTS(LockstoreService, nsILockstore, nsIObserver)

LockstoreService::LockstoreService()
    : mMutex("LockstoreService::mMutex"),
      mKeystore(nullptr),
      mShutdown(false) {}

LockstoreService::~LockstoreService() {
  // No mutex needed: the destructor runs only after the last refcount
  // drops, so no other thread can be racing the in-flight FFI callbacks
  // (they each hold a `RefPtr<LockstoreService>`).
  if (mKeystore) {
    keystore_close(mKeystore);
    mKeystore = nullptr;
  }
}

nsresult LockstoreService::Init() {
  MOZ_ASSERT(NS_IsMainThread());

  // A consumer that creates the service at or beyond XPCOMWillShutdown would
  // register a teardown observer that never fires and open a keystore that is
  // never closed; mark it shut down so EnsureOpenLocked fails closed instead.
  // (Mirrors InitEncryptionKeystore's late-init guard.)
  if (AppShutdown::IsInOrBeyond(ShutdownPhase::XPCOMWillShutdown)) {
    MutexAutoLock lock(mMutex);
    mShutdown = true;
    return NS_OK;
  }

  nsCOMPtr<nsIObserverService> os = services::GetObserverService();
  if (os) {
    // The profile may not be selected yet if a consumer creates the service in
    // early startup (NS_APP_USER_PROFILE_50_DIR not yet resolvable), so resolve
    // the path when it becomes available too. profile-do-change fires once per
    // process -- profile switching relaunches Firefox -- so the path is
    // resolved at most once and stays valid for the process lifetime.
    os->AddObserver(this, "profile-do-change", false);
    // Tear down last, at XPCOMWillShutdown, so the keystore stays available for
    // late profile writes by its consumers (SQLite at-rest encryption, profile
    // backup, caches). xpcom-shutdown stays as an idempotent backstop.
    os->AddObserver(this, "xpcom-will-shutdown", false);
    os->AddObserver(this, "xpcom-shutdown", false);
  }

  // Common case: the service is created after profile-do-change, so the profile
  // is already available -- resolve now. Otherwise the observer above resolves
  // it; EnsureOpenLocked fails closed until then.
  CacheProfilePathOnMainThread();
  return NS_OK;
}

void LockstoreService::CacheProfilePathOnMainThread() {
  MOZ_ASSERT(NS_IsMainThread());
  {
    MutexAutoLock lock(mMutex);
    if (!mProfilePath.IsEmpty()) {
      // profile-do-change fires once, but stay idempotent.
      return;
    }
  }
  // Resolve outside the lock: `nsIDirectoryService::Get` is main-thread only,
  // and holding mMutex across it would block any off-main `Do*` waiting on the
  // mutex behind the directory lookup.
  nsCOMPtr<nsIFile> profileDir;
  if (NS_FAILED(NS_GetSpecialDirectory(NS_APP_USER_PROFILE_50_DIR,
                                       getter_AddRefs(profileDir))) ||
      !profileDir) {
    // Profile not selected yet; resolved later on profile-do-change.
    return;
  }
  nsAutoString widePath;
  if (NS_FAILED(profileDir->GetPath(widePath))) {
    return;
  }
  MutexAutoLock lock(mMutex);
  CopyUTF16toUTF8(widePath, mProfilePath);
}

// static
already_AddRefed<LockstoreService> LockstoreService::GetSingleton() {
  nsCOMPtr<nsILockstore> svc =
      do_GetService("@mozilla.org/security/lockstore;1");
  if (!svc) {
    return nullptr;
  }
  // The component is registered as a singleton in components.conf and
  // LockstoreService is the only implementer of nsILockstore in tree, so
  // a downcast is safe.
  RefPtr<LockstoreService> ls = static_cast<LockstoreService*>(svc.get());
  return ls.forget();
}

nsresult LockstoreService::EnsureOpenLocked() {
  mMutex.AssertCurrentThreadOwns();
  if (mShutdown) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  if (mKeystore) {
    return NS_OK;
  }
  if (mProfilePath.IsEmpty()) {
    // The profile is not available yet -- a consumer reached the FFI before
    // profile-do-change resolved the path (only possible if the service is
    // created in early startup, before profile selection). Fail closed; the
    // caller may retry once the profile is selected.
    return NS_ERROR_NOT_AVAILABLE;
  }
  return keystore_open(&mProfilePath, &mKeystore);
}

// ---------------------------------------------------------------------------
// nsIObserver
// ---------------------------------------------------------------------------

NS_IMETHODIMP
LockstoreService::Observe(nsISupports* aSubject, const char* aTopic,
                          const char16_t* aData) {
  if (!strcmp(aTopic, "profile-do-change")) {
    // Resolve the profile path now that the profile is available; covers the
    // early-startup case where Init() ran before profile selection.
    CacheProfilePathOnMainThread();
    return NS_OK;
  }

  // xpcom-will-shutdown / xpcom-shutdown: tear down the keystore.
  // mMutex is held across every FFI call by the sync `Do*` tier, so
  // acquiring it here implicitly drains any in-flight background work:
  // a running encrypt/decrypt holds the mutex and blocks us until it
  // finishes; a runnable that hasn't yet started will see mShutdown ==
  // true and fail via `EnsureOpenLocked`.
  MutexAutoLock lock(mMutex);
  if (mShutdown) {
    return NS_OK;
  }
  mShutdown = true;
  if (mKeystore) {
    keystore_close(mKeystore);
    mKeystore = nullptr;
  }
  return NS_OK;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

namespace {

nsresult NewDOMPromise(JSContext* aCx, RefPtr<Promise>& aOut) {
  nsIGlobalObject* global = xpc::CurrentNativeGlobal(aCx);
  if (NS_WARN_IF(!global)) {
    return NS_ERROR_UNEXPECTED;
  }
  ErrorResult err;
  aOut = Promise::Create(global, err);
  if (NS_WARN_IF(err.Failed())) {
    return err.StealNSResult();
  }
  return NS_OK;
}

// Dispatches a sync `Do*` method onto a background task and bridges
// the result to a DOM Promise. `Result` is the return type of the
// method — either `nsresult` (resolves with undefined) or
// `mozilla::Result<T, nsresult>` (resolves with T). One template
// covers every method shape; the constexpr branch picks the right
// resolution at the bridge.
template <typename... Storages, typename Result, typename... Args>
nsresult ImplXpcomMethod(LockstoreService* aLockstore, JSContext* aCx,
                         Promise** aPromise,
                         Result (LockstoreService::*aMethod)(Args...),
                         Storages... aArgs) {
  MOZ_RELEASE_ASSERT(NS_IsMainThread());
  RefPtr<Promise> domPromise;
  MOZ_TRY(NewDOMPromise(aCx, domPromise));

  // Wrap the DOM promise so its addref / release stay on the main
  // thread: the lambdas below run on a background task and a
  // main-thread runnable, but capturing a bare `RefPtr<Promise>`
  // would bump the refcount on the background thread when the inner
  // lambda is constructed.
  nsMainThreadPtrHandle<Promise> domHandle(new nsMainThreadPtrHolder<Promise>(
      "LockstoreService::ImplXpcomMethod::DOMPromise", domPromise));

  nsresult rv = NS_DispatchBackgroundTask(NS_NewRunnableFunction(
      "LockstoreService::ImplXpcomMethod",
      [self = RefPtr{aLockstore}, aMethod, domHandle,
       ... args = std::forward<Storages>(aArgs)]() mutable {
        auto result = (self.get()->*aMethod)(args...);
        NS_DispatchToMainThread(NS_NewRunnableFunction(
            "LockstoreService::ImplXpcomMethod::Resolve",
            [domHandle = std::move(domHandle),
             result = std::move(result)]() mutable {
              if constexpr (std::is_same_v<nsresult, Result>) {
                if (NS_FAILED(result)) {
                  domHandle->MaybeReject(result);
                } else {
                  domHandle->MaybeResolveWithUndefined();
                }
              } else {
                if (result.isErr()) {
                  domHandle->MaybeReject(result.unwrapErr());
                } else {
                  domHandle->MaybeResolve(std::move(result.unwrap()));
                }
              }
            }));
      }));

  if (NS_FAILED(rv)) {
    // Dispatch failed; surface the failure to JS rather than leaving
    // the promise pending forever.
    domPromise->MaybeReject(rv);
  }
  domPromise.forget(aPromise);
  return NS_OK;
}

}  // namespace

// ---------------------------------------------------------------------------
// Synchronous nsILockstore methods (cheap in-memory state only)
// ---------------------------------------------------------------------------

NS_IMETHODIMP
LockstoreService::IsKekUnlocked(const nsACString& aKekRef, bool* aOut) {
  MutexAutoLock lock(mMutex);
  MOZ_TRY(EnsureOpenLocked());
  return keystore_is_kek_unlocked(mKeystore, &aKekRef, aOut);
}

// ---------------------------------------------------------------------------
// Synchronous C++ tier — invokes the FFI on the calling thread under
// `mMutex`. Asserts off-main-thread in debug builds.
// ---------------------------------------------------------------------------

#define LOCKSTORE_SYNC_PREAMBLE                                    \
  MOZ_ASSERT(!NS_IsMainThread(),                                   \
             "Synchronous Lockstore I/O is forbidden on the main " \
             "thread; dispatch onto a background task instead.");  \
  MutexAutoLock lock(mMutex);                                      \
  MOZ_TRY(EnsureOpenLocked())

nsresult LockstoreService::DoUnlockKek(const nsACString& aKekRef,
                                       const nsACString& aSecret,
                                       uint32_t aTimeoutMs) {
  LOCKSTORE_SYNC_PREAMBLE;
  return keystore_unlock_kek(mKeystore, &aKekRef, &aSecret, aTimeoutMs);
}

nsresult LockstoreService::DoLockKek(const nsACString& aKekRef) {
  LOCKSTORE_SYNC_PREAMBLE;
  return keystore_lock_kek(mKeystore, &aKekRef);
}

nsresult LockstoreService::DoLock() {
  LOCKSTORE_SYNC_PREAMBLE;
  return keystore_lock(mKeystore);
}

nsresult LockstoreService::DoCreateDek(const nsACString& aCollection,
                                       const nsACString& aKekRef,
                                       bool aExtractable, uint32_t aKeySize) {
  LOCKSTORE_SYNC_PREAMBLE;
  return keystore_create_dek(mKeystore, &aCollection, &aKekRef, aExtractable,
                             aKeySize);
}

nsresult LockstoreService::DoImportDek(const nsACString& aCollection,
                                       const nsACString& aKekRef,
                                       const nsTArray<uint8_t>& aDekBytes,
                                       bool aExtractable) {
  LOCKSTORE_SYNC_PREAMBLE;
  return keystore_import_dek(mKeystore, &aCollection, &aKekRef,
                             aDekBytes.Elements(), aDekBytes.Length(),
                             aExtractable);
}

Result<bool, nsresult> LockstoreService::DoIsDekExtractable(
    const nsACString& aCollection) {
  LOCKSTORE_SYNC_PREAMBLE;
  bool out = false;
  MOZ_TRY(keystore_is_dek_extractable(mKeystore, &aCollection, &out));
  return out;
}

nsresult LockstoreService::DoDeleteDek(const nsACString& aCollection) {
  LOCKSTORE_SYNC_PREAMBLE;
  return keystore_delete_dek(mKeystore, &aCollection);
}

nsresult LockstoreService::DoAddKek(const nsACString& aCollection,
                                    const nsACString& aFromKekRef,
                                    const nsACString& aToKekRef) {
  LOCKSTORE_SYNC_PREAMBLE;
  return keystore_add_kek(mKeystore, &aCollection, &aFromKekRef, &aToKekRef);
}

nsresult LockstoreService::DoRemoveKek(const nsACString& aCollection,
                                       const nsACString& aKekRef) {
  LOCKSTORE_SYNC_PREAMBLE;
  return keystore_remove_kek(mKeystore, &aCollection, &aKekRef);
}

nsresult LockstoreService::DoSwitchKek(const nsACString& aCollection,
                                       const nsACString& aOldKekRef,
                                       const nsACString& aNewKekRef) {
  LOCKSTORE_SYNC_PREAMBLE;
  return keystore_switch_kek(mKeystore, &aCollection, &aOldKekRef, &aNewKekRef);
}

Result<nsTArray<nsCString>, nsresult> LockstoreService::DoListDeks() {
  LOCKSTORE_SYNC_PREAMBLE;
  nsTArray<nsCString> out;
  MOZ_TRY(keystore_list_deks(mKeystore, &out));
  return out;
}

Result<nsTArray<nsCString>, nsresult> LockstoreService::DoListKeks(
    const nsACString& aDekName) {
  LOCKSTORE_SYNC_PREAMBLE;
  nsTArray<nsCString> out;
  MOZ_TRY(keystore_list_keks(mKeystore, &aDekName, &out));
  return out;
}

Result<nsTArray<uint8_t>, nsresult> LockstoreService::DoEncrypt(
    const nsACString& aCollection, const nsACString& aKekRef,
    const nsTArray<uint8_t>& aPlaintext) {
  LOCKSTORE_SYNC_PREAMBLE;
  nsTArray<uint8_t> out;
  MOZ_TRY(keystore_encrypt(mKeystore, &aCollection, &aKekRef,
                           aPlaintext.Elements(), aPlaintext.Length(), &out));
  return out;
}

Result<nsTArray<uint8_t>, nsresult> LockstoreService::DoDecrypt(
    const nsACString& aCollection, const nsACString& aKekRef,
    const nsTArray<uint8_t>& aCiphertext) {
  LOCKSTORE_SYNC_PREAMBLE;
  nsTArray<uint8_t> out;
  MOZ_TRY(keystore_decrypt(mKeystore, &aCollection, &aKekRef,
                           aCiphertext.Elements(), aCiphertext.Length(), &out));
  return out;
}

Result<nsTArray<uint8_t>, nsresult> LockstoreService::DoGetDek(
    const nsACString& aCollection, const nsACString& aKekRef) {
  LOCKSTORE_SYNC_PREAMBLE;
  nsTArray<uint8_t> out;
  MOZ_TRY(keystore_get_dek(mKeystore, &aCollection, &aKekRef, &out));
  return out;
}

Result<nsCString, nsresult> LockstoreService::DoCreateKek(
    const nsACString& aKekType, const nsACString& aIdentifier,
    const nsACString& aSecret, uint32_t aCacheTimeoutMs) {
  LOCKSTORE_SYNC_PREAMBLE;
  nsCString out;
  MOZ_TRY(keystore_create_kek(mKeystore, &aKekType, &aIdentifier, &aSecret,
                              aCacheTimeoutMs, &out));
  return out;
}

nsresult LockstoreService::DoDeleteKek(const nsACString& aKekRef) {
  LOCKSTORE_SYNC_PREAMBLE;
  return keystore_delete_kek(mKeystore, &aKekRef);
}

#undef LOCKSTORE_SYNC_PREAMBLE

// ---------------------------------------------------------------------------
// nsILockstore async tier — one-line adapters over the sync C++ tier
// via `ImplXpcomMethod`.
// ---------------------------------------------------------------------------

NS_IMETHODIMP
LockstoreService::UnlockKek(const nsACString& aKekRef,
                            const nsACString& aSecret, uint32_t aTimeoutMs,
                            JSContext* aCx, Promise** aPromise) {
  return ImplXpcomMethod(this, aCx, aPromise, &LockstoreService::DoUnlockKek,
                         nsCString{aKekRef}, nsCString{aSecret}, aTimeoutMs);
}

NS_IMETHODIMP
LockstoreService::LockKek(const nsACString& aKekRef, JSContext* aCx,
                          Promise** aPromise) {
  return ImplXpcomMethod(this, aCx, aPromise, &LockstoreService::DoLockKek,
                         nsCString{aKekRef});
}

NS_IMETHODIMP
LockstoreService::Lock(JSContext* aCx, Promise** aPromise) {
  return ImplXpcomMethod(this, aCx, aPromise, &LockstoreService::DoLock);
}

NS_IMETHODIMP
LockstoreService::CreateDek(const nsACString& aCollection,
                            const nsACString& aKekRef, bool aExtractable,
                            uint32_t aKeySize, JSContext* aCx,
                            Promise** aPromise) {
  return ImplXpcomMethod(this, aCx, aPromise, &LockstoreService::DoCreateDek,
                         nsCString{aCollection}, nsCString{aKekRef},
                         aExtractable, aKeySize);
}

NS_IMETHODIMP
LockstoreService::ImportDek(const nsACString& aCollection,
                            const nsACString& aKekRef,
                            const nsTArray<uint8_t>& aDekBytes,
                            bool aExtractable, JSContext* aCx,
                            Promise** aPromise) {
  return ImplXpcomMethod(this, aCx, aPromise, &LockstoreService::DoImportDek,
                         nsCString{aCollection}, nsCString{aKekRef},
                         aDekBytes.Clone(), aExtractable);
}

NS_IMETHODIMP
LockstoreService::IsDekExtractable(const nsACString& aCollection,
                                   JSContext* aCx, Promise** aPromise) {
  return ImplXpcomMethod(this, aCx, aPromise,
                         &LockstoreService::DoIsDekExtractable,
                         nsCString{aCollection});
}

NS_IMETHODIMP
LockstoreService::DeleteDek(const nsACString& aCollection, JSContext* aCx,
                            Promise** aPromise) {
  return ImplXpcomMethod(this, aCx, aPromise, &LockstoreService::DoDeleteDek,
                         nsCString{aCollection});
}

NS_IMETHODIMP
LockstoreService::AddKek(const nsACString& aCollection,
                         const nsACString& aFromKekRef,
                         const nsACString& aToKekRef, JSContext* aCx,
                         Promise** aPromise) {
  return ImplXpcomMethod(this, aCx, aPromise, &LockstoreService::DoAddKek,
                         nsCString{aCollection}, nsCString{aFromKekRef},
                         nsCString{aToKekRef});
}

NS_IMETHODIMP
LockstoreService::RemoveKek(const nsACString& aCollection,
                            const nsACString& aKekRef, JSContext* aCx,
                            Promise** aPromise) {
  return ImplXpcomMethod(this, aCx, aPromise, &LockstoreService::DoRemoveKek,
                         nsCString{aCollection}, nsCString{aKekRef});
}

NS_IMETHODIMP
LockstoreService::SwitchKek(const nsACString& aCollection,
                            const nsACString& aOldKekRef,
                            const nsACString& aNewKekRef, JSContext* aCx,
                            Promise** aPromise) {
  return ImplXpcomMethod(this, aCx, aPromise, &LockstoreService::DoSwitchKek,
                         nsCString{aCollection}, nsCString{aOldKekRef},
                         nsCString{aNewKekRef});
}

NS_IMETHODIMP
LockstoreService::ListDeks(JSContext* aCx, Promise** aPromise) {
  return ImplXpcomMethod(this, aCx, aPromise, &LockstoreService::DoListDeks);
}

NS_IMETHODIMP
LockstoreService::ListKeks(const nsACString& aDekName, JSContext* aCx,
                           Promise** aPromise) {
  return ImplXpcomMethod(this, aCx, aPromise, &LockstoreService::DoListKeks,
                         nsCString{aDekName});
}

NS_IMETHODIMP
LockstoreService::Encrypt(const nsACString& aCollection,
                          const nsACString& aKekRef,
                          const nsTArray<uint8_t>& aPlaintext, JSContext* aCx,
                          Promise** aPromise) {
  return ImplXpcomMethod(this, aCx, aPromise, &LockstoreService::DoEncrypt,
                         nsCString{aCollection}, nsCString{aKekRef},
                         aPlaintext.Clone());
}

NS_IMETHODIMP
LockstoreService::Decrypt(const nsACString& aCollection,
                          const nsACString& aKekRef,
                          const nsTArray<uint8_t>& aCiphertext, JSContext* aCx,
                          Promise** aPromise) {
  return ImplXpcomMethod(this, aCx, aPromise, &LockstoreService::DoDecrypt,
                         nsCString{aCollection}, nsCString{aKekRef},
                         aCiphertext.Clone());
}

NS_IMETHODIMP
LockstoreService::GetDek(const nsACString& aCollection,
                         const nsACString& aKekRef, JSContext* aCx,
                         Promise** aPromise) {
  return ImplXpcomMethod(this, aCx, aPromise, &LockstoreService::DoGetDek,
                         nsCString{aCollection}, nsCString{aKekRef});
}

NS_IMETHODIMP
LockstoreService::CreateKek(const nsACString& aKekType,
                            const nsACString& aIdentifier,
                            const nsACString& aSecret, uint32_t aCacheTimeoutMs,
                            JSContext* aCx, Promise** aPromise) {
  return ImplXpcomMethod(this, aCx, aPromise, &LockstoreService::DoCreateKek,
                         nsCString{aKekType}, nsCString{aIdentifier},
                         nsCString{aSecret}, aCacheTimeoutMs);
}

NS_IMETHODIMP
LockstoreService::DeleteKek(const nsACString& aKekRef, JSContext* aCx,
                            Promise** aPromise) {
  return ImplXpcomMethod(this, aCx, aPromise, &LockstoreService::DoDeleteKek,
                         nsCString{aKekRef});
}

}  // namespace mozilla::security::lockstore
