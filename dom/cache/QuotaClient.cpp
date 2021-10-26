/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "QuotaClientImpl.h"

#include "DBAction.h"
#include "FileUtilsImpl.h"
#include "mozilla/dom/cache/DBSchema.h"
#include "mozilla/dom/cache/Manager.h"
#include "mozilla/dom/quota/QuotaCommon.h"
#include "mozilla/dom/quota/QuotaManager.h"
#include "mozilla/dom/quota/UsageInfo.h"
#include "mozilla/ipc/BackgroundParent.h"
#include "mozilla/Telemetry.h"
#include "mozilla/Unused.h"
#include "nsIFile.h"
#include "nsThreadUtils.h"

namespace {

using mozilla::Atomic;
using mozilla::MutexAutoLock;
using mozilla::Some;
using mozilla::Unused;
using mozilla::dom::ContentParentId;
using mozilla::dom::cache::DirPaddingFile;
using mozilla::dom::cache::kCachesSQLiteFilename;
using mozilla::dom::cache::Manager;
using mozilla::dom::cache::QuotaInfo;
using mozilla::dom::quota::AssertIsOnIOThread;
using mozilla::dom::quota::Client;
using mozilla::dom::quota::DatabaseUsageType;
using mozilla::dom::quota::GroupAndOrigin;
using mozilla::dom::quota::PERSISTENCE_TYPE_DEFAULT;
using mozilla::dom::quota::PersistenceType;
using mozilla::dom::quota::QuotaManager;
using mozilla::dom::quota::UsageInfo;
using mozilla::ipc::AssertIsOnBackgroundThread;

static nsresult GetBodyUsage(nsIFile* aMorgueDir, const Atomic<bool>& aCanceled,
                             UsageInfo* aUsageInfo, const bool aInitializing) {
  AssertIsOnIOThread();

  nsCOMPtr<nsIDirectoryEnumerator> entries;
  nsresult rv = aMorgueDir->GetDirectoryEntries(getter_AddRefs(entries));
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return rv;
  }

  nsCOMPtr<nsIFile> bodyDir;
  while (NS_SUCCEEDED(rv = entries->GetNextFile(getter_AddRefs(bodyDir))) &&
         bodyDir && !aCanceled) {
    if (NS_WARN_IF(QuotaManager::IsShuttingDown())) {
      return NS_ERROR_ABORT;
    }
    bool isDir;
    rv = bodyDir->IsDirectory(&isDir);
    if (NS_WARN_IF(NS_FAILED(rv))) {
      return rv;
    }

    if (!isDir) {
      QuotaInfo dummy;
      mozilla::DebugOnly<nsresult> result =
          RemoveNsIFile(dummy, bodyDir, /* aTrackQuota */ false);
      // Try to remove the unexpected files, and keep moving on even if it fails
      // because it might be created by virus or the operation system
      MOZ_ASSERT(NS_SUCCEEDED(result));
      continue;
    }

    const QuotaInfo dummy;
    const auto getUsage = [&aUsageInfo](nsIFile* bodyFile,
                                        const nsACString& leafName,
                                        bool& fileDeleted) {
      MOZ_DIAGNOSTIC_ASSERT(bodyFile);
      Unused << leafName;

      int64_t fileSize;
      nsresult rv = bodyFile->GetFileSize(&fileSize);
      if (NS_WARN_IF(NS_FAILED(rv))) {
        return rv;
      }
      MOZ_DIAGNOSTIC_ASSERT(fileSize >= 0);
      // FIXME: Separate file usage and database usage in OriginInfo so that the
      // workaround for treating body file size as database usage can be
      // removed.
      //
      // This is needed because we want to remove the mutex lock for padding
      // files. The lock is needed because the padding file is accessed on the
      // QM IO thread while getting origin usage and is accessed on the Cache IO
      // thread in normal Cache operations.
      // Using the cached usage in QM while getting origin usage can remove the
      // access on the QM IO thread and thus we can remove the mutex lock.
      // However, QM only separates usage types in initialization, and the
      // separation is gone after that. So, before extending the separation of
      // usage types in QM, this is a workaround to avoid the file usage
      // mismatching in our tests. Note that file usage hasn't been exposed to
      // users yet.
      *aUsageInfo += DatabaseUsageType(Some(fileSize));

      fileDeleted = false;

      return NS_OK;
    };
    rv = mozilla::dom::cache::BodyTraverseFiles(dummy, bodyDir, getUsage,
                                                /* aCanRemoveFiles */
                                                aInitializing,
                                                /* aTrackQuota */ false);
    if (NS_WARN_IF(NS_FAILED(rv))) {
      return rv;
    }
  }
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return rv;
  }

  return NS_OK;
}

static nsresult LockedGetPaddingSizeFromDB(
    nsIFile* aDir, const GroupAndOrigin& aGroupAndOrigin,
    int64_t* aPaddingSizeOut) {
  MOZ_DIAGNOSTIC_ASSERT(aDir);
  MOZ_DIAGNOSTIC_ASSERT(aPaddingSizeOut);

  *aPaddingSizeOut = 0;

  QuotaInfo quotaInfo;
  static_cast<GroupAndOrigin&>(quotaInfo) = aGroupAndOrigin;
  // quotaInfo.mDirectoryLockId must be -1 (which is default for new QuotaInfo)
  // because this method should only be called from QuotaClient::InitOrigin
  // (via QuotaClient::GetUsageForOriginInternal) when the temporary storage
  // hasn't been initialized yet. At that time, the in-memory objects (e.g.
  // OriginInfo) are only being created so it doesn't make sense to tunnel
  // quota information to TelemetryVFS to get corresponding QuotaObject instance
  // for the SQLite file).
  MOZ_DIAGNOSTIC_ASSERT(quotaInfo.mDirectoryLockId == -1);

  nsCOMPtr<nsIFile> dbFile;
  nsresult rv = aDir->Clone(getter_AddRefs(dbFile));
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return rv;
  }

  rv = dbFile->Append(kCachesSQLiteFilename);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return rv;
  }

  bool exists = false;
  rv = dbFile->Exists(&exists);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return rv;
  }

  // Return NS_OK with size = 0 if caches.sqlite doesn't exist.
  // This function is only called if the value of the padding size couldn't be
  // determined from the padding file, possibly because it doesn't exist, or a
  // leftover temporary padding file was found.
  // There is no other way to get the overall padding size of an origin.
  if (!exists) {
    return NS_OK;
  }

  nsCOMPtr<mozIStorageConnection> conn;
  rv = mozilla::dom::cache::OpenDBConnection(quotaInfo, dbFile,
                                             getter_AddRefs(conn));
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return rv;
  }

  // Make sure that the database has the latest schema before we try to read
  // from it. We have to do this because LockedGetPaddingSizeFromDB is called
  // by QuotaClient::GetUsageForOrigin which may run at any time (there's no
  // guarantee that SetupAction::RunSyncWithDBOnTarget already checked the
  // schema for the given origin).
  rv = mozilla::dom::cache::db::CreateOrMigrateSchema(*conn);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return rv;
  }

  int64_t paddingSize = 0;
  rv = mozilla::dom::cache::LockedDirectoryPaddingRestore(
      aDir, conn, /* aMustRestore */ false, &paddingSize);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return rv;
  }

  *aPaddingSizeOut = paddingSize;

  return rv;
}

}  // namespace

namespace mozilla::dom::cache {

const nsLiteralString kCachesSQLiteFilename = u"caches.sqlite"_ns;

CacheQuotaClient::CacheQuotaClient()
    : mDirPaddingFileMutex("DOMCacheQuotaClient.mDirPaddingFileMutex") {
  AssertIsOnBackgroundThread();
  MOZ_DIAGNOSTIC_ASSERT(!sInstance);
  sInstance = this;
}

// static
CacheQuotaClient* CacheQuotaClient::Get() {
  MOZ_DIAGNOSTIC_ASSERT(sInstance);
  return sInstance;
}

CacheQuotaClient::Type CacheQuotaClient::GetType() { return DOMCACHE; }

Result<UsageInfo, nsresult> CacheQuotaClient::InitOrigin(
    PersistenceType aPersistenceType, const GroupAndOrigin& aGroupAndOrigin,
    const AtomicBool& aCanceled) {
  AssertIsOnIOThread();

  return GetUsageForOriginInternal(aPersistenceType, aGroupAndOrigin, aCanceled,
                                   /* aInitializing*/ true);
}

nsresult CacheQuotaClient::InitOriginWithoutTracking(
    PersistenceType aPersistenceType, const GroupAndOrigin& aGroupAndOrigin,
    const AtomicBool& aCanceled) {
  AssertIsOnIOThread();

  // This is called when a storage/permanent/chrome/cache directory exists. Even
  // though this shouldn't happen with a "good" profile, we shouldn't return an
  // error here, since that would cause origin initialization to fail. We just
  // warn and otherwise ignore that.
  UNKNOWN_FILE_WARNING(NS_LITERAL_STRING_FROM_CSTRING(DOMCACHE_DIRECTORY_NAME));
  return NS_OK;
}

Result<UsageInfo, nsresult> CacheQuotaClient::GetUsageForOrigin(
    PersistenceType aPersistenceType, const GroupAndOrigin& aGroupAndOrigin,
    const AtomicBool& aCanceled) {
  AssertIsOnIOThread();

  return GetUsageForOriginInternal(aPersistenceType, aGroupAndOrigin, aCanceled,
                                   /* aInitializing*/ false);
}

void CacheQuotaClient::OnOriginClearCompleted(PersistenceType aPersistenceType,
                                              const nsACString& aOrigin) {
  // Nothing to do here.
}

void CacheQuotaClient::ReleaseIOThreadObjects() {
  // Nothing to do here as the Context handles cleaning everything up
  // automatically.
}

void CacheQuotaClient::AbortOperations(const nsACString& aOrigin) {
  AssertIsOnBackgroundThread();

  Manager::Abort(aOrigin);
}

void CacheQuotaClient::AbortOperationsForProcess(
    ContentParentId aContentParentId) {
  // The Cache and Context can be shared by multiple client processes.  They
  // are not exclusively owned by a single process.
  //
  // As far as I can tell this is used by QuotaManager to abort operations
  // when a particular process goes away.  We definitely don't want this
  // since we are shared.  Also, the Cache actor code already properly
  // handles asynchronous actor destruction when the child process dies.
  //
  // Therefore, do nothing here.
}

void CacheQuotaClient::StartIdleMaintenance() {}

void CacheQuotaClient::StopIdleMaintenance() {}

void CacheQuotaClient::ShutdownWorkThreads() {
  AssertIsOnBackgroundThread();

  // spins the event loop and synchronously shuts down all Managers
  Manager::ShutdownAll();
}

nsresult CacheQuotaClient::UpgradeStorageFrom2_0To2_1(nsIFile* aDirectory) {
  AssertIsOnIOThread();
  MOZ_DIAGNOSTIC_ASSERT(aDirectory);

  MutexAutoLock lock(mDirPaddingFileMutex);

  nsresult rv = mozilla::dom::cache::LockedDirectoryPaddingInit(aDirectory);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return rv;
  }

  return rv;
}

nsresult CacheQuotaClient::RestorePaddingFileInternal(
    nsIFile* aBaseDir, mozIStorageConnection* aConn) {
  MOZ_ASSERT(!NS_IsMainThread());
  MOZ_DIAGNOSTIC_ASSERT(aBaseDir);
  MOZ_DIAGNOSTIC_ASSERT(aConn);

  int64_t dummyPaddingSize;

  MutexAutoLock lock(mDirPaddingFileMutex);

  nsresult rv = mozilla::dom::cache::LockedDirectoryPaddingRestore(
      aBaseDir, aConn, /* aMustRestore */ true, &dummyPaddingSize);
  Unused << NS_WARN_IF(NS_FAILED(rv));

  return rv;
}

nsresult CacheQuotaClient::WipePaddingFileInternal(const QuotaInfo& aQuotaInfo,
                                                   nsIFile* aBaseDir) {
  MOZ_ASSERT(!NS_IsMainThread());
  MOZ_DIAGNOSTIC_ASSERT(aBaseDir);

  MutexAutoLock lock(mDirPaddingFileMutex);

  MOZ_ASSERT(mozilla::dom::cache::DirectoryPaddingFileExists(
      aBaseDir, DirPaddingFile::FILE));

  int64_t paddingSize = 0;
  bool temporaryPaddingFileExist =
      mozilla::dom::cache::DirectoryPaddingFileExists(aBaseDir,
                                                      DirPaddingFile::TMP_FILE);

  if (temporaryPaddingFileExist ||
      NS_WARN_IF(NS_FAILED(mozilla::dom::cache::LockedDirectoryPaddingGet(
          aBaseDir, &paddingSize)))) {
    // XXXtt: Maybe have a method in the QuotaManager to clean the usage under
    // the quota client and the origin.
    // There is nothing we can do to recover the file.
    NS_WARNING("Cannnot read padding size from file!");
    paddingSize = 0;
  }

  if (paddingSize > 0) {
    mozilla::dom::cache::DecreaseUsageForQuotaInfo(aQuotaInfo, paddingSize);
  }

  nsresult rv = mozilla::dom::cache::LockedDirectoryPaddingDeleteFile(
      aBaseDir, DirPaddingFile::FILE);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return rv;
  }

  // Remove temporary file if we have one.
  rv = mozilla::dom::cache::LockedDirectoryPaddingDeleteFile(
      aBaseDir, DirPaddingFile::TMP_FILE);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return rv;
  }

  rv = mozilla::dom::cache::LockedDirectoryPaddingInit(aBaseDir);
  Unused << NS_WARN_IF(NS_FAILED(rv));

  return rv;
}

CacheQuotaClient::~CacheQuotaClient() {
  AssertIsOnBackgroundThread();
  MOZ_DIAGNOSTIC_ASSERT(sInstance == this);

  sInstance = nullptr;
}

Result<UsageInfo, nsresult> CacheQuotaClient::GetUsageForOriginInternal(
    PersistenceType aPersistenceType, const GroupAndOrigin& aGroupAndOrigin,
    const AtomicBool& aCanceled, const bool aInitializing) {
  AssertIsOnIOThread();
#ifndef NIGHTLY_BUILD
  Unused << aInitializing;
#endif

  QuotaManager* qm = QuotaManager::Get();
  MOZ_DIAGNOSTIC_ASSERT(qm);

  CACHE_TRY_UNWRAP(auto dir, qm->GetDirectoryForOrigin(
                                 aPersistenceType, aGroupAndOrigin.mOrigin));

  nsresult rv =
      dir->Append(NS_LITERAL_STRING_FROM_CSTRING(DOMCACHE_DIRECTORY_NAME));
  if (NS_WARN_IF(NS_FAILED(rv))) {
    REPORT_TELEMETRY_ERR_IN_INIT(aInitializing, kQuotaExternalError,
                                 Cache_Append);
    return Err(rv);
  }

  bool useCachedValue = false;

  int64_t paddingSize = 0;
  {
    // If the tempoary file still exists after locking, it means the previous
    // action failed, so restore the padding file.
    MutexAutoLock lock(mDirPaddingFileMutex);

    if (mozilla::dom::cache::DirectoryPaddingFileExists(
            dir, DirPaddingFile::TMP_FILE) ||
        NS_WARN_IF(NS_FAILED(mozilla::dom::cache::LockedDirectoryPaddingGet(
            dir, &paddingSize)))) {
      if (aInitializing) {
        rv = LockedGetPaddingSizeFromDB(dir, aGroupAndOrigin, &paddingSize);
        if (NS_WARN_IF(NS_FAILED(rv))) {
          REPORT_TELEMETRY_ERR_IN_INIT(aInitializing, kQuotaInternalError,
                                       Cache_GetPaddingSize);
          return Err(rv);
        }
      } else {
        // We can't open the database at this point, since it can be already
        // used by Cache IO thread. Use the cached value instead. (In theory,
        // we could check if the database is actually used by Cache IO thread
        // at this moment, but it's probably not worth additional complexity.)

        useCachedValue = true;
      }
    }
  }

  UsageInfo usageInfo;

  if (useCachedValue) {
    uint64_t usage;
    if (qm->GetUsageForClient(PERSISTENCE_TYPE_DEFAULT, aGroupAndOrigin,
                              Client::DOMCACHE, usage)) {
      usageInfo += DatabaseUsageType(Some(usage));
    }

    return usageInfo;
  }

  // FIXME: Separate file usage and database usage in OriginInfo so that the
  // workaround for treating padding file size as database usage can be removed.
  usageInfo += DatabaseUsageType(Some(paddingSize));

  nsCOMPtr<nsIDirectoryEnumerator> entries;
  rv = dir->GetDirectoryEntries(getter_AddRefs(entries));
  if (NS_WARN_IF(NS_FAILED(rv))) {
    REPORT_TELEMETRY_ERR_IN_INIT(aInitializing, kQuotaExternalError,
                                 Cache_GetDirEntries);
    return Err(rv);
  }

  nsCOMPtr<nsIFile> file;
  while (NS_SUCCEEDED(rv = entries->GetNextFile(getter_AddRefs(file))) &&
         file && !aCanceled) {
    if (NS_WARN_IF(QuotaManager::IsShuttingDown())) {
      return Err(NS_ERROR_ABORT);
    }

    nsAutoString leafName;
    rv = file->GetLeafName(leafName);
    if (NS_WARN_IF(NS_FAILED(rv))) {
      REPORT_TELEMETRY_ERR_IN_INIT(aInitializing, kQuotaExternalError,
                                   Cache_GetLeafName);
      return Err(rv);
    }

    bool isDir;
    rv = file->IsDirectory(&isDir);
    if (NS_WARN_IF(NS_FAILED(rv))) {
      REPORT_TELEMETRY_ERR_IN_INIT(aInitializing, kQuotaExternalError,
                                   Cache_IsDirectory);
      return Err(rv);
    }

    if (isDir) {
      if (leafName.EqualsLiteral("morgue")) {
        rv = GetBodyUsage(file, aCanceled, &usageInfo, aInitializing);
        if (NS_WARN_IF(NS_FAILED(rv))) {
          if (rv != NS_ERROR_ABORT) {
            REPORT_TELEMETRY_ERR_IN_INIT(aInitializing, kQuotaExternalError,
                                         Cache_GetBodyUsage);
          }
          return Err(rv);
        }
      } else {
        NS_WARNING("Unknown Cache directory found!");
      }

      continue;
    }

    // Ignore transient sqlite files and marker files
    if (leafName.EqualsLiteral("caches.sqlite-journal") ||
        leafName.EqualsLiteral("caches.sqlite-shm") ||
        leafName.Find("caches.sqlite-mj"_ns, false, 0, 0) == 0 ||
        leafName.EqualsLiteral("context_open.marker")) {
      continue;
    }

    if (leafName.Equals(kCachesSQLiteFilename) ||
        leafName.EqualsLiteral("caches.sqlite-wal")) {
      int64_t fileSize;
      rv = file->GetFileSize(&fileSize);
      if (NS_WARN_IF(NS_FAILED(rv))) {
        REPORT_TELEMETRY_ERR_IN_INIT(aInitializing, kQuotaExternalError,
                                     Cache_GetFileSize);
        return Err(rv);
      }
      MOZ_DIAGNOSTIC_ASSERT(fileSize >= 0);

      usageInfo += DatabaseUsageType(Some(fileSize));
      continue;
    }

    // Ignore directory padding file
    if (leafName.EqualsLiteral(PADDING_FILE_NAME) ||
        leafName.EqualsLiteral(PADDING_TMP_FILE_NAME)) {
      continue;
    }

    NS_WARNING("Unknown Cache file found!");
  }
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return Err(rv);
  }

  return usageInfo;
}

// static
CacheQuotaClient* CacheQuotaClient::sInstance = nullptr;

// static
already_AddRefed<quota::Client> CreateQuotaClient() {
  AssertIsOnBackgroundThread();

  RefPtr<CacheQuotaClient> ref = new CacheQuotaClient();
  return ref.forget();
}

// static
nsresult RestorePaddingFile(nsIFile* aBaseDir, mozIStorageConnection* aConn) {
  MOZ_ASSERT(!NS_IsMainThread());
  MOZ_DIAGNOSTIC_ASSERT(aBaseDir);
  MOZ_DIAGNOSTIC_ASSERT(aConn);

  RefPtr<CacheQuotaClient> cacheQuotaClient = CacheQuotaClient::Get();
  MOZ_DIAGNOSTIC_ASSERT(cacheQuotaClient);

  nsresult rv = cacheQuotaClient->RestorePaddingFileInternal(aBaseDir, aConn);
  Unused << NS_WARN_IF(NS_FAILED(rv));

  return rv;
}

// static
nsresult WipePaddingFile(const QuotaInfo& aQuotaInfo, nsIFile* aBaseDir) {
  MOZ_ASSERT(!NS_IsMainThread());
  MOZ_DIAGNOSTIC_ASSERT(aBaseDir);

  RefPtr<CacheQuotaClient> cacheQuotaClient = CacheQuotaClient::Get();
  MOZ_DIAGNOSTIC_ASSERT(cacheQuotaClient);

  nsresult rv = cacheQuotaClient->WipePaddingFileInternal(aQuotaInfo, aBaseDir);
  Unused << NS_WARN_IF(NS_FAILED(rv));

  return rv;
}
}  // namespace mozilla::dom::cache
