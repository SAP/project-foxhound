/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef TimerThread_h___
#define TimerThread_h___

#include "nsIObserver.h"
#include "nsIRunnable.h"
#include "nsIThread.h"

#include "nsTimerImpl.h"
#include "nsThreadUtils.h"

#include "nsTArray.h"

#include "mozilla/Atomics.h"
#include "mozilla/Attributes.h"
#include "mozilla/Monitor.h"
#include "mozilla/ProfilerUtils.h"
#include "mozilla/UniquePtr.h"

#include <algorithm>

namespace mozilla {
class TimeStamp;
}  // namespace mozilla

class TimerThread final : public mozilla::Runnable, public nsIObserver {
 public:
  typedef mozilla::Monitor Monitor;
  typedef mozilla::MutexAutoLock MutexAutoLock;
  typedef mozilla::TimeStamp TimeStamp;
  typedef mozilla::TimeDuration TimeDuration;

  TimerThread();

  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_NSIRUNNABLE
  NS_DECL_NSIOBSERVER

  nsresult Shutdown();

  nsresult AddTimer(nsTimerImpl* aTimer, const MutexAutoLock& aProofOfLock)
      MOZ_REQUIRES(aTimer->mMutex);
  nsresult RemoveTimer(nsTimerImpl* aTimer, const MutexAutoLock& aProofOfLock)
      MOZ_REQUIRES(aTimer->mMutex);
  // Considering only the first 'aSearchBound' timers (in firing order), returns
  // the timeout of the first non-low-priority timer, on the current thread,
  // that will fire before 'aDefault'. If no such timer exists, 'aDefault' is
  // returned.
  TimeStamp FindNextFireTimeForCurrentThread(TimeStamp aDefault,
                                             uint32_t aSearchBound);

  void DoBeforeSleep();
  void DoAfterSleep();

  bool IsOnTimerThread() const { return mThread->IsOnCurrentThread(); }

  uint32_t AllowedEarlyFiringMicroseconds();

 private:
  ~TimerThread();

  bool mInitialized;

  // These internal helper methods must be called while mMonitor is held.
  // AddTimerInternal returns false if the insertion failed.
  bool AddTimerInternal(nsTimerImpl* aTimer) MOZ_REQUIRES(mMonitor);
  bool RemoveTimerInternal(nsTimerImpl* aTimer)
      MOZ_REQUIRES(mMonitor, aTimer->mMutex);
  void RemoveLeadingCanceledTimersInternal() MOZ_REQUIRES(mMonitor);
  void RemoveFirstTimerInternal() MOZ_REQUIRES(mMonitor);
  nsresult Init() MOZ_REQUIRES(mMonitor);

  void PostTimerEvent(already_AddRefed<nsTimerImpl> aTimerRef)
      MOZ_REQUIRES(mMonitor);

  nsCOMPtr<nsIThread> mThread;
  // Lock ordering requirements:
  // (optional) ThreadWrapper::sMutex ->
  // (optional) nsTimerImpl::mMutex   ->
  // TimerThread::mMonitor
  Monitor mMonitor;

  bool mShutdown MOZ_GUARDED_BY(mMonitor);
  bool mWaiting MOZ_GUARDED_BY(mMonitor);
  bool mNotified MOZ_GUARDED_BY(mMonitor);
  bool mSleeping MOZ_GUARDED_BY(mMonitor);

  class Entry final {
   public:
    explicit Entry(nsTimerImpl* aTimerImpl)
        : mTimeout(aTimerImpl->mTimeout), mTimerImpl(aTimerImpl) {
      aTimerImpl->SetIsInTimerThread(true);
    }

    // Create an already-canceled entry with the given timeout.
    explicit Entry(TimeStamp aTimeout)
        : mTimeout(std::move(aTimeout)), mTimerImpl(nullptr) {}

    // Don't allow copies, otherwise which one would manage `IsInTimerThread`?
    Entry(const Entry&) = delete;
    Entry& operator=(const Entry&) = delete;

    // Move-only.
    Entry(Entry&&) = default;
    Entry& operator=(Entry&&) = default;

    ~Entry() {
      if (mTimerImpl) {
        mTimerImpl->mMutex.AssertCurrentThreadOwns();
        mTimerImpl->SetIsInTimerThread(false);
      }
    }

    nsTimerImpl* Value() const { return mTimerImpl; }

    void Forget() {
      if (MOZ_UNLIKELY(!mTimerImpl)) {
        return;
      }
      mTimerImpl->mMutex.AssertCurrentThreadOwns();
      mTimerImpl->SetIsInTimerThread(false);
      mTimerImpl = nullptr;
    }

    // Called with the Monitor held, but not the TimerImpl's mutex
    already_AddRefed<nsTimerImpl> Take() {
      if (MOZ_LIKELY(mTimerImpl)) {
        MOZ_ASSERT(mTimerImpl->IsInTimerThread());
        mTimerImpl->SetIsInTimerThread(false);
      }
      return mTimerImpl.forget();
    }

    const TimeStamp& Timeout() const { return mTimeout; }

   private:
    TimeStamp mTimeout;
    RefPtr<nsTimerImpl> mTimerImpl;
  };

  // Computes and returns the index in mTimers at which a new timer with the
  // specified timeout should be inserted in order to maintain "sorted" order.
  size_t ComputeTimerInsertionIndex(const TimeStamp& timeout) const
      MOZ_REQUIRES(mMonitor);

#ifdef DEBUG
  // Checks mTimers to see if any entries are out of order or any cached
  // timeouts are incorrect and will assert if any inconsistency is found. Has
  // no side effects other than asserting so has no use in non-DEBUG builds.
  void VerifyTimerListConsistency() const MOZ_REQUIRES(mMonitor);
#endif

  // mTimers is maintained in a "pseudo-sorted" order wrt the timeouts.
  // Specifcally, mTimers is sorted according to the timeouts *if you ignore the
  // cancelled entries* (those whose mTimerImpl is nullptr). Notably this means
  // that you cannot use a binary search on this list.
  nsTArray<Entry> mTimers MOZ_GUARDED_BY(mMonitor);
  // Set only at the start of the thread's Run():
  uint32_t mAllowedEarlyFiringMicroseconds MOZ_GUARDED_BY(mMonitor);
  ProfilerThreadId mProfilerThreadId MOZ_GUARDED_BY(mMonitor);
};

#endif /* TimerThread_h___ */
