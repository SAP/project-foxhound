/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// On linux and freebsd, we use SIGPROF to Suspend threads before sampling them.
// However, if that thread is currently inside fork(), the fork() will restart
// which can cause serious delays. PlatformInit is currently used to install
// hooks at the beginning and at the end of fork(). The hooks pause and resume
// the sampling, i.e. SIGPROF is no longer sent. As a result, fork() pauses
// sampling of all threads, not just the threads that are forking.
static void PlatformInit(PSLockRef aLock) { /* Noop */ }

// Prepare this thread to be sampled in the future.
// On linux and freebsd, we register a handler for SIGPROF.
Sampler::Sampler(PSLockRef aLock) { /* Noop */ }

// Restore modifications done in Constructor.
// On linux and freebsd, we deregister/restore the original SIGPROF handler.
void Sampler::Disable(PSLockRef aLock) { /* Noop */ }

static void StreamMetaPlatformSampleUnits(PSLockRef aLock,
                                          SpliceableJSONWriter& aWriter) {
  /* Here we just put "ns" because the Firefox Profiler frontend expects a
  sample unit. Since we are not sampling any cputime it doesn't matter.
  */
  aWriter.StringProperty("threadCPUDelta", "ns");
}

uint64_t RunningTimes::ConvertRawToJson(uint64_t aRawValue) {
  return aRawValue;
}

namespace mozilla::profiler {
bool GetCpuTimeSinceThreadStartInNs(
    uint64_t* aResult, const mozilla::profiler::PlatformData& aPlatformData) {
  return false;
}
}  // namespace mozilla::profiler

template <typename Func>
void Sampler::SuspendAndSampleAndResumeThread(
    PSLockRef aLock,
    const ThreadRegistration::UnlockedReaderAndAtomicRWOnThread& aThreadData,
    const TimeStamp& aNow, const Func& aProcessRegs) { /* Noop */ }

// Spawn a thread that calls mSampler->Run()
SamplerThread::SamplerThread(PSLockRef aLock, uint32_t aActivityGeneration,
                             double aIntervalMilliseconds, uint32_t aFeatures)
    : mSampler(aLock),
      mActivityGeneration(aActivityGeneration),
      mIntervalMicroseconds(std::max(
          1, int(floor(aIntervalMilliseconds * 1000 + 0.5)))) { /* Noop */ }
// Wait for the thread to terminate
SamplerThread::~SamplerThread() {
  InvokePostSamplingCallbacks(std::move(mPostSamplingCallbackList),
                              SamplingState::JustStopped);
}
void SamplerThread::Stop(PSLockRef aLock) { mSampler.Disable(aLock); }
void SamplerThread::SleepMicro(uint32_t aMicroseconds) {
  MOZ_CRASH("Not reachable because we never spawn SamplerThread");
}
static RunningTimes GetProcessRunningTimesDiff(
    PSLockRef aLock, RunningTimes& aPreviousRunningTimesToBeUpdated) {
  MOZ_CRASH("Not reachable because we never spawn SamplerThread");
}
static RunningTimes GetThreadRunningTimesDiff(
    PSLockRef aLock,
    ThreadRegistration::UnlockedRWForLockedProfiler& aThreadData) {
  MOZ_CRASH("Not reachable because we never spawn SamplerThread");
}
static void DiscardSuspendedThreadRunningTimes(
    PSLockRef aLock,
    ThreadRegistration::UnlockedRWForLockedProfiler& aThreadData) {
  MOZ_CRASH("Not reachable because we never spawn SamplerThread");
}
