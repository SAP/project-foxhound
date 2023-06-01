/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef TOOLS_POWERCOUNTERS_H_
#define TOOLS_POWERCOUNTERS_H_

#include "PlatformMacros.h"
#include "mozilla/ProfilerCounts.h"
#include "mozilla/UniquePtr.h"
#include "mozilla/Vector.h"

#if defined(_MSC_VER)
class PowerMeterDevice;
#endif
#if defined(GP_PLAT_arm64_darwin)
class ProcessPower;
#endif
#if defined(GP_PLAT_amd64_darwin)
class RAPL;
#endif

class PowerCounters {
 public:
#if defined(_MSC_VER) || defined(GP_OS_darwin) || defined(GP_PLAT_amd64_linux)
  explicit PowerCounters();
  ~PowerCounters();
  void Sample();
#else
  explicit PowerCounters(){};
  ~PowerCounters(){};
  void Sample(){};
#endif

  using CountVector = mozilla::Vector<BaseProfilerCount*, 4>;
  const CountVector& GetCounters() { return mCounters; }

 private:
  CountVector mCounters;

#if defined(_MSC_VER)
  mozilla::Vector<mozilla::UniquePtr<PowerMeterDevice>> mPowerMeterDevices;
#endif
#if defined(GP_PLAT_arm64_darwin)
  mozilla::UniquePtr<ProcessPower> mProcessPower;
#endif
#if defined(GP_PLAT_amd64_darwin)
  RAPL* mRapl;
#endif
};

#endif /* ndef TOOLS_POWERCOUNTERS_H_ */
