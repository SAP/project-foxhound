/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/SharedThreadPool.h"

#include "mozilla/AppShutdown.h"
#include "mozilla/Logging.h"

#include "mozilla/AppShutdown.h"
#include "mozilla/Monitor.h"
#include "mozilla/ReentrantMonitor.h"
#include "mozilla/Services.h"
#include "mozilla/SpinEventLoopUntil.h"
#include "mozilla/StaticPtr.h"
#include "nsComponentManagerUtils.h"
#include "nsIObserver.h"
#include "nsIObserverService.h"
#include "nsIThreadManager.h"
#include "nsThreadPool.h"
#include "nsTHashMap.h"
#include "nsXPCOMCIDInternal.h"

static mozilla::LazyLogModule sSharedThreadPoolLog("SharedThreadPool");

#define STP_LOG(level, msg, ...) \
  MOZ_LOG_FMT(sSharedThreadPoolLog, level, msg, ##__VA_ARGS__)

namespace mozilla {

// Hash map, maps thread pool names to SharedThreadPool instances.
using PoolMap = nsTHashMap<nsCStringHashKey, RefPtr<SharedThreadPool>>;
static StaticMutex sPoolsMutex;
static StaticAutoPtr<PoolMap> sPools MOZ_GUARDED_BY(sPoolsMutex);
static bool sPoolsShutdownStarted MOZ_GUARDED_BY(sPoolsMutex) = false;

static already_AddRefed<nsIThreadPool> CreateThreadPool(const nsCString& aName,
                                                        uint32_t aThreadLimit) {
  nsCOMPtr<nsIThreadPool> pool = new nsThreadPool();

  nsresult rv = pool->SetName(aName);
  NS_ENSURE_SUCCESS(rv, nullptr);

  // Set the thread limits. Note that we don't rely on the
  // EnsureThreadLimitIsAtLeast() call below, as the default thread
  // limit is 4, and if aThreadLimit is less than 4 we'll end up with a
  // pool with 4 threads rather than what we expected; so we'll have
  // unexpected behaviour.
  rv = pool->SetThreadLimit(aThreadLimit);
  NS_ENSURE_SUCCESS(rv, nullptr);

  // Note that we just keep the DEFAULT_IDLE_THREAD_LIMIT (currently 1).

  // We keep any ever created SharedThreadPool until shutdown, but if
  // it's not used, its threads will go away after a short while.
  rv = pool->SetIdleThreadGraceTimeout(500);
  NS_ENSURE_SUCCESS(rv, nullptr);
  rv = pool->SetIdleThreadMaximumTimeout(5000);
  NS_ENSURE_SUCCESS(rv, nullptr);

  return pool.forget();
}

class SharedThreadPoolShutdownObserver : public nsIObserver {
 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIOBSERVER
 protected:
  virtual ~SharedThreadPoolShutdownObserver() = default;
};

NS_IMPL_ISUPPORTS(SharedThreadPoolShutdownObserver, nsIObserver, nsISupports)

NS_IMETHODIMP
SharedThreadPoolShutdownObserver::Observe(nsISupports* aSubject,
                                          const char* aTopic,
                                          const char16_t* aData) {
  MOZ_RELEASE_ASSERT(!strcmp(aTopic, "xpcom-shutdown-threads"));

  // During shutdown we do not allow the creation of new functional
  // SharedThreadPools, but we do allow access to existing ones. This may lead
  // to the situation that a dispatch to a SharedThreadPool fails because its
  // underlying nsIThreadPool has already been shut down and is now defunct.
  // However, it allows code to safely retrieve and use the same pool it is
  // running on during shutdown.
  nsTArray<RefPtr<SharedThreadPool>> pools;
  {
    StaticMutexAutoLock lock(sPoolsMutex);
    sPoolsShutdownStarted = true;
    AppendToArray(pools, sPools->Values());
  }
  for (const auto& pool : pools) {
    // Note that nsThreadPool::Shutdown will annotate the crash report
    // if it hangs.
    STP_LOG(LogLevel::Debug, "Shutdown {}", fmt::ptr(pool.get()));
    pool->Shutdown();
  }
  {
    StaticMutexAutoLock lock(sPoolsMutex);
    sPools->Clear();
  }
  pools.Clear();
  return NS_OK;
}

void SharedThreadPool::InitStatics() {
  MOZ_ASSERT(NS_IsMainThread());
  StaticMutexAutoLock lock(sPoolsMutex);
  MOZ_ASSERT(!sPools);
  sPools = new nsTHashMap<nsCStringHashKey, RefPtr<SharedThreadPool>>();
  nsCOMPtr<nsIObserverService> obsService =
      mozilla::services::GetObserverService();
  nsCOMPtr<nsIObserver> obs = new SharedThreadPoolShutdownObserver();
  obsService->AddObserver(obs, "xpcom-shutdown-threads", false);
}

already_AddRefed<SharedThreadPool> SharedThreadPool::Get(
    StaticString aName, uint32_t aThreadLimit) {
  StaticMutexAutoLock lock(sPoolsMutex);
  MOZ_ASSERT(sPools);

  nsCString name(aName);
  return sPools->WithEntryHandle(
      name, [&](auto&& entry) -> already_AddRefed<SharedThreadPool> {
        RefPtr<SharedThreadPool> pool;
        if (entry) {
          pool = entry.Data();
          if (NS_FAILED(pool->EnsureThreadLimitIsAtLeast(aThreadLimit))) {
            NS_WARNING("Failed to set limits on thread pool");
          }
          STP_LOG(LogLevel::Debug, "Existing {} found for {}",
                  fmt::ptr(pool.get()), name);
        } else {
          sPoolsMutex.AssertCurrentThreadOwns();
          if (sPoolsShutdownStarted) {
            // Do not allow the creation of new shared pools during shutdown.
            return do_AddRef(new SharedThreadPool(nullptr));
          }

          nsCOMPtr<nsIThreadPool> threadPool(
              CreateThreadPool(name, aThreadLimit));
          if (NS_WARN_IF(!threadPool)) {
            return do_AddRef(new SharedThreadPool(nullptr));
          }
          pool = new SharedThreadPool(threadPool);
          // We do AddRef here and keep the pool alive in the hash map.
          entry.Insert(pool.get());
          STP_LOG(LogLevel::Debug, "New {} created for {}",
                  fmt::ptr(pool.get()), name);
        }

        return pool.forget();
      });
}

NS_IMPL_ISUPPORTS(SharedThreadPool, nsIThreadPool, nsIEventTarget)

SharedThreadPool::SharedThreadPool(nsIThreadPool* aPool) : mPool(aPool) {}

SharedThreadPool::~SharedThreadPool() = default;

nsresult SharedThreadPool::EnsureThreadLimitIsAtLeast(uint32_t aThreadLimit) {
  uint32_t existingLimit = 0;
  nsresult rv;

  rv = mPool->GetThreadLimit(&existingLimit);
  NS_ENSURE_SUCCESS(rv, rv);
  if (aThreadLimit > existingLimit) {
    rv = mPool->SetThreadLimit(aThreadLimit);
    NS_ENSURE_SUCCESS(rv, rv);
  }

  return NS_OK;
}

}  // namespace mozilla

#undef STP_LOG
