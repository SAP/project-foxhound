/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "CrossProcessSemaphore.h"
#include "nsDebug.h"
#include "nsISupportsImpl.h"
#include <mach/mach_time.h>

static const uint64_t kNsPerUs = 1000;
static const uint64_t kNsPerSec = 1000000000;

namespace mozilla {

/* static */
CrossProcessSemaphore* CrossProcessSemaphore::Create(const char*,
                                                     uint32_t aInitialValue) {
  semaphore_t sem = SEMAPHORE_NULL;
  if (semaphore_create(mach_task_self(), &sem, SYNC_POLICY_FIFO,
                       aInitialValue) == KERN_SUCCESS &&
      sem != SEMAPHORE_NULL) {
    return new CrossProcessSemaphore(CrossProcessSemaphoreHandle(sem));
  }
  return nullptr;
}

/* static */
CrossProcessSemaphore* CrossProcessSemaphore::Create(
    CrossProcessSemaphoreHandle aHandle) {
  if (!aHandle) {
    return nullptr;
  }
  return new CrossProcessSemaphore(std::move(aHandle));
}

CrossProcessSemaphore::CrossProcessSemaphore(
    CrossProcessSemaphoreHandle aSemaphore)
    : mSemaphore(std::move(aSemaphore)) {
  MOZ_COUNT_CTOR(CrossProcessSemaphore);
}

CrossProcessSemaphore::~CrossProcessSemaphore() {
  MOZ_ASSERT(mSemaphore, "Improper construction of semaphore or double free.");
  MOZ_COUNT_DTOR(CrossProcessSemaphore);
}

bool CrossProcessSemaphore::Wait(const Maybe<TimeDuration>& aWaitTime) {
  MOZ_ASSERT(mSemaphore, "Improper construction of semaphore.");
  int kr = KERN_OPERATION_TIMED_OUT;
  // semaphore_(timed)wait may be interrupted by KERN_ABORTED. Carefully restart
  // the wait until it either succeeds or times out.
  if (aWaitTime.isNothing()) {
    do {
      kr = semaphore_wait(mSemaphore.get());
    } while (kr == KERN_ABORTED);
  } else {
    mach_timebase_info_data_t tb;
    if (mach_timebase_info(&tb) != KERN_SUCCESS) {
      return false;
    }
    uint64_t now = (mach_absolute_time() * tb.numer) / tb.denom;
    uint64_t deadline = now + uint64_t(kNsPerUs * aWaitTime->ToMicroseconds());
    while (now <= deadline) {
      uint64_t ns = deadline - now;
      mach_timespec_t ts;
      ts.tv_sec = ns / kNsPerSec;
      ts.tv_nsec = ns % kNsPerSec;
      kr = semaphore_timedwait(mSemaphore.get(), ts);
      if (kr != KERN_ABORTED) {
        break;
      }
      now = (mach_absolute_time() * tb.numer) / tb.denom;
    }
  }
  return kr == KERN_SUCCESS;
}

void CrossProcessSemaphore::Signal() {
  MOZ_ASSERT(mSemaphore, "Improper construction of semaphore.");
  semaphore_signal(mSemaphore.get());
}

CrossProcessSemaphoreHandle CrossProcessSemaphore::CloneHandle() {
  // Transfer the mach port backing the semaphore.
  return mozilla::RetainMachSendRight(mSemaphore.get());
}

void CrossProcessSemaphore::CloseHandle() {}

}  // namespace mozilla
