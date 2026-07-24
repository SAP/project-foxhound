/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_AvailableMemoryWatcher_h
#define mozilla_AvailableMemoryWatcher_h

#include "mozilla/ipc/CrashReporterHost.h"
#include "mozilla/UniquePtr.h"
#include "MemoryPressureLevelMac.h"
#include "nsCOMPtr.h"
#include "nsIAvailableMemoryWatcherBase.h"
#include "nsIObserver.h"
#include "nsIObserverService.h"

namespace mozilla {

#if defined(XP_LINUX) && !defined(ANDROID)
// PSIInfo struct holds parsed data from /proc/pressure/memory
//
// The values in /proc/pressure/memory are floating point numbers, but
// PSIInfo has integer members (truncated values).
struct PSIInfo {
  unsigned long some_avg10 = 0;
  unsigned long some_avg60 = 0;
  unsigned long some_avg300 = 0;
  unsigned long some_total = 0;
  unsigned long full_avg10 = 0;
  unsigned long full_avg60 = 0;
  unsigned long full_avg300 = 0;
  unsigned long full_total = 0;
  bool psi_available = false;
};

// Get PSI (Pressure Stall Information) data from the last periodic update.
// This function can be called from any thread and returns the most recently
// captured PSI values from /proc/pressure/memory.
// Returns NS_OK if successful, NS_ERROR_FAILURE if PSI is not available
// or the file format is invalid.
nsresult GetLastPSISnapshot(PSIInfo& aResult);

// Start sampling PSI data for non-OOM scenario once
void StartNonOOMPSISampling();
#endif

// This class implements a platform-independent part to watch the system's
// memory situation and invoke the registered callbacks when we detect
// a low-memory situation or a high-memory situation.
// The actual logic to monitor the memory status is implemented in a subclass
// of nsAvailableMemoryWatcherBase per platform.
class nsAvailableMemoryWatcherBase : public nsIAvailableMemoryWatcherBase,
                                     public nsIObserver {
  static StaticRefPtr<nsAvailableMemoryWatcherBase> sSingleton;
  static const char* const kObserverTopics[];

  TimeStamp mLowMemoryStart;

 protected:
  // On Windows the publicly available methods (::Observe() and ::Notify()) are
  // called on the main thread while the ::LowMemoryCallback() method is called
  // by an external thread. All functions called from those must acquire a lock
  // on this mutex before accessing the object's fields to prevent races.
  //
  // On Linux we might tell polling to start/stop from our polling thread
  // or from the main thread during ::Observe().
  Mutex mMutex;

  uint32_t mNumOfTabUnloading MOZ_GUARDED_BY(mMutex);
  uint32_t mNumOfMemoryPressure MOZ_GUARDED_BY(mMutex);

  nsCOMPtr<nsITabUnloader> mTabUnloader;
  nsCOMPtr<nsIObserverService> mObserverSvc;
  // Do not change this value off the main thread.
  bool mInteracting;

  virtual ~nsAvailableMemoryWatcherBase() = default;
  virtual nsresult Init();
  void Shutdown();
  void UpdateLowMemoryTimeStamp();
  void RecordTelemetryEventOnHighMemory(const MutexAutoLock&)
      MOZ_REQUIRES(mMutex);

 public:
  static already_AddRefed<nsAvailableMemoryWatcherBase> GetSingleton();

  nsAvailableMemoryWatcherBase();

#if defined(XP_DARWIN)
  virtual void OnMemoryPressureChanged(MacMemoryPressureLevel aNewLevel) {};
  virtual void AddChildAnnotations(
      const UniquePtr<ipc::CrashReporterHost>& aCrashReporter) {};
#endif

  NS_DECL_THREADSAFE_ISUPPORTS
  NS_DECL_NSIAVAILABLEMEMORYWATCHERBASE
  NS_DECL_NSIOBSERVER
};

// Method to create a platform-specific object
already_AddRefed<nsAvailableMemoryWatcherBase> CreateAvailableMemoryWatcher();

}  // namespace mozilla

#endif  // ifndef mozilla_AvailableMemoryWatcher_h
