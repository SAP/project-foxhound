/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#include "AvailableMemoryWatcher.h"
#include "AvailableMemoryWatcherUtils.h"
#include "mozilla/FileUtils.h"
#include "mozilla/TimeStamp.h"
#include "mozilla/Services.h"
#include "mozilla/StaticPrefs_browser.h"
#include "nsAppRunner.h"
#include "nsIAvailableMemoryWatcherTestingLinux.h"
#include "nsIObserverService.h"
#include "nsISupports.h"
#include "nsITimer.h"
#include "nsIThread.h"
#include "nsMemoryPressure.h"
#include "nsString.h"
#include <cstring>
#include <cstdio>
#if !defined(ANDROID)
#  include "nsIPSIProvider.h"
#  include "mozilla/glean/XpcomMetrics.h"
#endif

#define NON_OOM_DELAY_SEC 120

namespace mozilla {

// Read PSI (Pressure Stall Information) data from /proc/pressure/memory
static nsresult ReadPSIFile(const char* aPSIPath, PSIInfo& aResult) {
  ScopedCloseFile file(fopen(aPSIPath, "r"));
  if (NS_WARN_IF(!file)) {
    // PSI file not available (kernel doesn't support PSI)
    return NS_ERROR_FAILURE;
  }

  char buff[256];
  // Initialize all values to 0
  aResult = {};

  /* The PSI file format looks like this:
   * some avg10=0.00 avg60=0.00 avg300=0.00 total=0
   * full avg10=0.00 avg60=0.00 avg300=0.00 total=0
   */
  float avg10, avg60, avg300, total;
  while ((fgets(buff, sizeof(buff), file.get())) != nullptr) {
    // Skip empty lines (exactly one '\n' character)
    if (strcmp(buff, "\n") == 0) {
      continue;
    }

    if (strstr(buff, "some")) {
      if (sscanf(buff, "some avg10=%f avg60=%f avg300=%f total=%f", &avg10,
                 &avg60, &avg300, &total) != 4) {
        return NS_ERROR_FAILURE;
      }
      if (avg10 < 0 || avg60 < 0 || avg300 < 0 || total < 0) {
        return NS_ERROR_FAILURE;
      }
      aResult.some_avg10 = avg10;
      aResult.some_avg60 = avg60;
      aResult.some_avg300 = avg300;
      aResult.some_total = total;
    } else if (strstr(buff, "full")) {
      if (sscanf(buff, "full avg10=%f avg60=%f avg300=%f total=%f", &avg10,
                 &avg60, &avg300, &total) != 4) {
        return NS_ERROR_FAILURE;
      }
      if (avg10 < 0 || avg60 < 0 || avg300 < 0 || total < 0) {
        return NS_ERROR_FAILURE;
      }
      aResult.full_avg10 = avg10;
      aResult.full_avg60 = avg60;
      aResult.full_avg300 = avg300;
      aResult.full_total = total;
    } else {
      // Unrecognized non-empty line
      return NS_ERROR_FAILURE;
    }
  }

  // Check PSI percentage values are in reasonable range (0-100)
  if (aResult.some_avg10 > 100UL || aResult.some_avg60 > 100UL ||
      aResult.some_avg300 > 100UL) {
    return NS_ERROR_FAILURE;
  }

  aResult.psi_available = true;

  return NS_OK;
}

// Linux has no native low memory detection. This class creates a timer that
// polls for low memory and sends a low memory notification if it notices a
// memory pressure event.
class nsAvailableMemoryWatcher final
    : public nsITimerCallback,
      public nsINamed,
      public nsAvailableMemoryWatcherBase,
#if !defined(ANDROID)
      public nsIPSIProvider,
#endif
      public nsIAvailableMemoryWatcherTestingLinux {
 public:
  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_NSITIMERCALLBACK
  NS_DECL_NSIOBSERVER
  NS_DECL_NSINAMED
  NS_DECL_NSIAVAILABLEMEMORYWATCHERTESTINGLINUX

  nsresult Init() override;
  nsAvailableMemoryWatcher();

  void HandleLowMemory();
  void MaybeHandleHighMemory();

#if !defined(ANDROID)
  NS_IMETHOD GetCachedPSIInfo(mozilla::PSIInfo& aResult) override;

  void RecordNonOOMPSI(const PSIInfo& aPsi);
  void StartNonOOMPSISampling() override {
    MutexAutoLock lock(mMutex);

    // This function is only used for handling OOM killed content
    // processes. We record the time of the last OOM kill to make sure
    // non-OOM PSI values are sampled without interference of OOM
    // kills.
    mLastOOMTime = TimeStamp::Now();
  }
#endif

 private:
  ~nsAvailableMemoryWatcher();
  void StartPolling(const MutexAutoLock&);
  void StopPolling(const MutexAutoLock&);
  void ShutDown();
  void UpdateCrashAnnotation(const MutexAutoLock&);
  void UpdatePSIInfo(const MutexAutoLock&);
  static bool IsMemoryLow();

  nsCOMPtr<nsITimer> mTimer MOZ_GUARDED_BY(mMutex);
  nsCOMPtr<nsIThread> mThread MOZ_GUARDED_BY(mMutex);

  bool mPolling MOZ_GUARDED_BY(mMutex);
  bool mUnderMemoryPressure MOZ_GUARDED_BY(mMutex);
  PSIInfo mPSIInfo MOZ_GUARDED_BY(mMutex);

  // Time of the last OOM kill handled
  TimeStamp mLastOOMTime MOZ_GUARDED_BY(mMutex);

  // PSI file path - can be overridden for testing
  nsCString mPSIPath MOZ_GUARDED_BY(mMutex);

  // Flag to track if SetPSIPathForTesting has been called
  bool mIsTesting MOZ_GUARDED_BY(mMutex);

  // Polling interval to check for low memory. In high memory scenarios,
  // default to 5000 ms between each check.
  static const uint32_t kHighMemoryPollingIntervalMS = 5000;

  // Polling interval to check for low memory. Default to 1000 ms between each
  // check. Use this interval when memory is low,
  static const uint32_t kLowMemoryPollingIntervalMS = 1000;
};

// A modern version of linux should keep memory information in the
// /proc/meminfo path.
static const char* kMeminfoPath = "/proc/meminfo";

// Linux memory PSI (Pressure Stall Information) path
static const auto kPSIPath = "/proc/pressure/memory"_ns;

nsAvailableMemoryWatcher::nsAvailableMemoryWatcher()
    : mPolling(false),
      mUnderMemoryPressure(false),
      mPSIInfo{},
      mLastOOMTime(),
      mPSIPath(kPSIPath),
      mIsTesting(false) {}

nsAvailableMemoryWatcher::~nsAvailableMemoryWatcher() {}

NS_IMETHODIMP
nsAvailableMemoryWatcher::GetCachedPSIInfo(mozilla::PSIInfo& aResult) {
  MutexAutoLock lock(mMutex);
  aResult = mPSIInfo;
  return NS_OK;
}

// Public API to get latest cached PSI snapshot from the singleton
// This returns the PSI data that was last collected by the watcher
nsresult GetLastPSISnapshot(PSIInfo& aResult) {
  RefPtr<nsIAvailableMemoryWatcherBase> watcher =
      nsAvailableMemoryWatcherBase::GetSingleton();
  if (!watcher) {
    return NS_ERROR_NOT_AVAILABLE;
  }

  nsCOMPtr<nsIPSIProvider> provider = do_QueryInterface(watcher);

  if (!provider) {
    return NS_ERROR_NOT_AVAILABLE;
  }

  return provider->GetCachedPSIInfo(aResult);
}

#if !defined(ANDROID)
void StartNonOOMPSISampling() {
  RefPtr<nsIAvailableMemoryWatcherBase> watcher =
      nsAvailableMemoryWatcherBase::GetSingleton();
  if (!watcher) {
    return;
  }

  nsCOMPtr<nsIPSIProvider> provider = do_QueryInterface(watcher);
  if (provider) {
    provider->StartNonOOMPSISampling();
  }
}
#endif

nsresult nsAvailableMemoryWatcher::Init() {
  nsresult rv = nsAvailableMemoryWatcherBase::Init();
  if (NS_FAILED(rv)) {
    return rv;
  }
  MutexAutoLock lock(mMutex);
  mTimer = NS_NewTimer();
  nsCOMPtr<nsIThread> thread;
  // We have to make our own thread here instead of using the background pool,
  // because some low memory scenarios can cause the background pool to fill.
  rv = NS_NewNamedThread("MemoryPoller", getter_AddRefs(thread));
  if (NS_FAILED(rv)) {
    NS_WARNING("Couldn't make a thread for nsAvailableMemoryWatcher.");
    // In this scenario we can't poll for low memory, since we can't dispatch
    // to our memory watcher thread.
    return rv;
  }
  mThread = std::move(thread);

  // Set the crash annotation to its initial state.
  UpdatePSIInfo(lock);
  UpdateCrashAnnotation(lock);

  StartPolling(lock);

  return NS_OK;
}

already_AddRefed<nsAvailableMemoryWatcherBase> CreateAvailableMemoryWatcher() {
  RefPtr watcher(new nsAvailableMemoryWatcher);

  if (NS_FAILED(watcher->Init())) {
    return do_AddRef(new nsAvailableMemoryWatcherBase);
  }

  return watcher.forget();
}

NS_IMPL_ISUPPORTS_INHERITED(nsAvailableMemoryWatcher,
                            nsAvailableMemoryWatcherBase, nsITimerCallback,
                            nsIObserver, nsINamed, nsIPSIProvider,
                            nsIAvailableMemoryWatcherTestingLinux);

void nsAvailableMemoryWatcher::StopPolling(const MutexAutoLock&)
    MOZ_REQUIRES(mMutex) {
  if (mPolling && mTimer) {
    // stop dispatching memory checks to the thread.
    mTimer->Cancel();
    mPolling = false;
  }
}

// Check /proc/meminfo for low memory. Largely C method for reading
// /proc/meminfo.
/* static */
bool nsAvailableMemoryWatcher::IsMemoryLow() {
  MemoryInfo memInfo{0, 0};
  nsresult rv = ReadMemoryFile(kMeminfoPath, memInfo);

  if (NS_FAILED(rv) || (memInfo.memAvailable == 0) || (memInfo.memTotal == 0)) {
    // If memAvailable cannot be found, then we are using an older system.
    // We can't accurately poll on this.
    // If memTotal is zero we can't calculate how much memory we're using.
    return false;
  }

  unsigned long memoryAsPercentage =
      (memInfo.memAvailable * 100) / memInfo.memTotal;

  return memoryAsPercentage <=
             StaticPrefs::browser_low_commit_space_threshold_percent() ||
         memInfo.memAvailable <
             StaticPrefs::browser_low_commit_space_threshold_mb() * 1024;
}

void nsAvailableMemoryWatcher::ShutDown() {
  nsCOMPtr<nsIThread> thread;
  {
    MutexAutoLock lock(mMutex);
    if (mTimer) {
      mTimer->Cancel();
      mTimer = nullptr;
    }
    thread = mThread.forget();
  }
  // thread->Shutdown() spins a nested event loop while waiting for the thread
  // to end. But the thread might execute some previously dispatched event that
  // wants to lock our mutex, too, before arriving at the shutdown event.
  if (thread) {
    thread->Shutdown();
  }
}

// We will use this to poll for low memory.
NS_IMETHODIMP
nsAvailableMemoryWatcher::Notify(nsITimer* aTimer) {
  MutexAutoLock lock(mMutex);
  if (!mThread) {
    // If we've made it this far and there's no  |mThread|,
    // we might have failed to dispatch it for some reason.
    MOZ_ASSERT(mThread);
    return NS_ERROR_FAILURE;
  }
  bool isTesting = mIsTesting;
  nsresult rv = mThread->Dispatch(NS_NewRunnableFunction(
      "MemoryPoller", [self = RefPtr{this}, isTesting]() {
        if (self->IsMemoryLow()) {
          self->HandleLowMemory();
        } else {
          self->MaybeHandleHighMemory();
        }
        if (isTesting) {
          NS_DispatchToMainThread(
              NS_NewRunnableFunction("MemoryPollerSync", [self]() {
                nsCOMPtr<nsIObserverService> observerService =
                    mozilla::services::GetObserverService();
                if (observerService) {
                  observerService->NotifyObservers(
                      nullptr, "memory-poller-sync", nullptr);
                }
              }));
        }
      }));

  if NS_FAILED (rv) {
    NS_WARNING("Cannot dispatch memory polling event.");
  }
  return NS_OK;
}

void nsAvailableMemoryWatcher::HandleLowMemory() {
  MutexAutoLock lock(mMutex);
  if (!mTimer) {
    // We have been shut down from outside while in flight.
    return;
  }
  if (!mUnderMemoryPressure) {
    mUnderMemoryPressure = true;
    // Poll more frequently under memory pressure.
    StartPolling(lock);
  }
  UpdatePSIInfo(lock);
  UpdateCrashAnnotation(lock);
  UpdateLowMemoryTimeStamp();
  // We handle low memory offthread, but we want to unload
  // tabs only from the main thread, so we will dispatch this
  // back to the main thread.
  // Since we are doing this async, we don't need to unlock the mutex first;
  // the AutoLock will unlock the mutex when we finish the dispatch.
  NS_DispatchToMainThread(NS_NewRunnableFunction(
      "nsAvailableMemoryWatcher::OnLowMemory",
      [self = RefPtr{this}]() { self->mTabUnloader->UnloadTabAsync(); }));
}

void nsAvailableMemoryWatcher::UpdateCrashAnnotation(const MutexAutoLock&)
    MOZ_REQUIRES(mMutex) {
  CrashReporter::RecordAnnotationBool(
      CrashReporter::Annotation::LinuxUnderMemoryPressure,
      mUnderMemoryPressure);

  // Record PSI (Pressure Stall Information) data from stored values
  nsPrintfCString psiValues("%lu,%lu,%lu,%lu,%lu,%lu,%lu,%lu",
                            mPSIInfo.some_avg10, mPSIInfo.some_avg60,
                            mPSIInfo.some_avg300, mPSIInfo.some_total,
                            mPSIInfo.full_avg10, mPSIInfo.full_avg60,
                            mPSIInfo.full_avg300, mPSIInfo.full_total);

  CrashReporter::RecordAnnotationNSCString(
      CrashReporter::Annotation::LinuxMemoryPSI, psiValues);
}

#if !defined(ANDROID)
void nsAvailableMemoryWatcher::RecordNonOOMPSI(const mozilla::PSIInfo& aPsi) {
  const mozilla::PSIInfo& psi = aPsi;

  // Record Glean event with PSI metrics
  mozilla::glean::memory_watcher::NonOomSampleExtra extra;
  extra.psiSomeAvg10 = mozilla::Some(nsPrintfCString("%lu", psi.some_avg10));
  extra.psiSomeAvg60 = mozilla::Some(nsPrintfCString("%lu", psi.some_avg60));
  extra.psiFullAvg10 = mozilla::Some(nsPrintfCString("%lu", psi.full_avg10));
  extra.psiFullAvg60 = mozilla::Some(nsPrintfCString("%lu", psi.full_avg60));
  mozilla::glean::memory_watcher::non_oom_sample.Record(mozilla::Some(extra));
}
#endif

void nsAvailableMemoryWatcher::UpdatePSIInfo(const MutexAutoLock&)
    MOZ_REQUIRES(mMutex) {
#if !defined(ANDROID)
  if ((mPSIInfo.full_avg10 || mPSIInfo.full_avg60) && !mLastOOMTime.IsNull() &&
      (TimeStamp::Now() >
       mLastOOMTime + TimeDuration::FromSeconds(NON_OOM_DELAY_SEC))) {
    // Collect non-zero PSI values that doesn't trigger OOM
    // killer. These enable us to learn the edge of OOM killer in
    // real world. This is done only if we have seen an OOM kill
    // recently to avoid collecting too much data.
    NS_DispatchToMainThread(
        NS_NewRunnableFunction("nsAvailableMemoryWatcher::RecordNonOOMPSI",
                               [self = RefPtr{this}, info = mPSIInfo]() {
                                 self->RecordNonOOMPSI(info);
                               }));
    mLastOOMTime = TimeStamp();
  }
#endif

  nsresult rv = ReadPSIFile(mPSIPath.get(), mPSIInfo);
  if (NS_FAILED(rv)) {
    mPSIInfo = {};
  }
}

// If memory is not low, we may need to dispatch an
// event for it if we have been under memory pressure.
// We can also adjust our polling interval.
void nsAvailableMemoryWatcher::MaybeHandleHighMemory() {
  MutexAutoLock lock(mMutex);
  if (!mTimer) {
    // We have been shut down from outside while in flight.
    return;
  }
  if (mUnderMemoryPressure) {
    RecordTelemetryEventOnHighMemory(lock);
    NS_NotifyOfEventualMemoryPressure(MemoryPressureState::NoPressure);
    mUnderMemoryPressure = false;
  }
  UpdatePSIInfo(lock);
  UpdateCrashAnnotation(lock);
  StartPolling(lock);
}

// When we change the polling interval, we will need to restart the timer
// on the new interval.
void nsAvailableMemoryWatcher::StartPolling(const MutexAutoLock& aLock)
    MOZ_REQUIRES(mMutex) {
  // Determine the effective polling interval up-front.
  uint32_t pollingInterval = mUnderMemoryPressure
                                 ? kLowMemoryPollingIntervalMS
                                 : kHighMemoryPollingIntervalMS;
  // For tests, enforce a very small interval to speed up polling.
  if (gIsGtest || mIsTesting) {
    pollingInterval = 10;
  }

  if (!mPolling) {
    // Restart the timer with the new interval if it has stopped.
    if (NS_SUCCEEDED(mTimer->InitWithCallback(
            this, pollingInterval, nsITimer::TYPE_REPEATING_SLACK))) {
      mPolling = true;
    }
  } else {
    mTimer->SetDelay(pollingInterval);
  }
}

// Observe events for shutting down and starting/stopping the timer.
NS_IMETHODIMP
nsAvailableMemoryWatcher::Observe(nsISupports* aSubject, const char* aTopic,
                                  const char16_t* aData) {
  nsresult rv = nsAvailableMemoryWatcherBase::Observe(aSubject, aTopic, aData);
  if (NS_FAILED(rv)) {
    return rv;
  }

  if (strcmp(aTopic, "xpcom-shutdown") == 0) {
    ShutDown();
  } else {
    MutexAutoLock lock(mMutex);
    if (mTimer) {
      if (strcmp(aTopic, "user-interaction-active") == 0) {
        StartPolling(lock);
      } else if (strcmp(aTopic, "user-interaction-inactive") == 0) {
        StopPolling(lock);
      }
    }
  }

  return NS_OK;
}

NS_IMETHODIMP nsAvailableMemoryWatcher::GetName(nsACString& aName) {
  aName.AssignLiteral("nsAvailableMemoryWatcher");
  return NS_OK;
}

NS_IMETHODIMP nsAvailableMemoryWatcher::SetPSIPathForTesting(
    const nsACString& aPSIPath) {
  MutexAutoLock lock(mMutex);
  mPSIPath.Assign(aPSIPath);
  mIsTesting = true;
  return NS_OK;
}

}  // namespace mozilla
