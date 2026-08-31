/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef ProfilerThreadPlatformData_h
#define ProfilerThreadPlatformData_h

#include "mozilla/ProfilerUtils.h"
#include "mozilla/ProfilerPlatformMacros.h"

#if defined(GP_OS_darwin)
#  include <mach/mach_types.h>
#elif defined(GP_OS_linux) || defined(GP_OS_android) || defined(GP_OS_freebsd)
#  include "mozilla/Maybe.h"
#  include <time.h>
#endif

namespace mozilla::profiler {

class PlatformData {
#if defined(GP_OS_windows)
 public:
  explicit PlatformData(ProfilerThreadId aThreadId);
  ~PlatformData();

  // Faking win32's HANDLE, because #including "windows.h" here causes trouble
  // (e.g., it #defines `Yield` as nothing!)
  // This type is static_check'ed against HANDLE in platform-win32.cpp.
  using WindowsHandle = void*;
  WindowsHandle ProfiledThread() const { return mProfiledThread; }

 private:
  WindowsHandle mProfiledThread;
#elif defined(GP_OS_darwin)
 public:
  explicit PlatformData(ProfilerThreadId aThreadId);
  ~PlatformData();
  thread_act_t ProfiledThread() const { return mProfiledThread; }

 private:
  // Note: for mProfiledThread Mach primitives are used instead of pthread's
  // because the latter doesn't provide thread manipulation primitives
  // required. For details, consult "Mac OS X Internals" book, Section 7.3.
  thread_act_t mProfiledThread;
#elif (defined(GP_OS_linux) || defined(GP_OS_android) || defined(GP_OS_freebsd))
 public:
  explicit PlatformData(ProfilerThreadId aThreadId);
  ~PlatformData();
  // Clock Id for this profiled thread. `Nothing` if `pthread_getcpuclockid`
  // failed (e.g., if the system doesn't support per-thread clocks).
  Maybe<clockid_t> GetClockId() const { return mClockId; }

 private:
  Maybe<clockid_t> mClockId;
#else
 public:
  explicit PlatformData(ProfilerThreadId aThreadId) {}
#endif
};

/**
 * Return the number of nanoseconds of CPU time used since thread start.
 *
 * @return true on success.
 */
bool GetCpuTimeSinceThreadStartInNs(uint64_t* aResult,
                                    const PlatformData& aPlatformData);

}  // namespace mozilla::profiler

#endif  // ProfilerThreadPlatformData_h
