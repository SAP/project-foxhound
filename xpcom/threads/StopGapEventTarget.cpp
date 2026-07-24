/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "StopGapEventTarget.h"
#include "nsITargetShutdownTask.h"

namespace mozilla {
NS_IMPL_ISUPPORTS(StopGapEventTarget, nsISerialEventTarget, nsIEventTarget)

StopGapEventTarget::StopGapEventTarget()
    : mMutex("StopGapEventTarget::mMutex") {}

StopGapEventTarget::~StopGapEventTarget() {
  MOZ_ASSERT(!mRealEventTarget || mTasks.IsEmpty(),
             "mRealEventTarget is set, but mTasks has not been drained. How?");

  for (auto& [event, flags] : mTasks) {
    if (nsCOMPtr<nsICancelableRunnable> cancelable = do_QueryInterface(event)) {
      cancelable->Cancel();
    }
  }
}

bool StopGapEventTarget::IsOnCurrentThreadInfallible() {
  MutexAutoLock lock(mMutex);
  return mRealEventTarget && mRealEventTarget->IsOnCurrentThread();
}

NS_IMETHODIMP StopGapEventTarget::IsOnCurrentThread(bool* aRetval) {
  *aRetval = IsOnCurrentThreadInfallible();
  return NS_OK;
}

NS_IMETHODIMP StopGapEventTarget::Dispatch(
    already_AddRefed<nsIRunnable> aEvent,
    nsIEventTarget::DispatchFlags aFlags) {
  MutexAutoLock lock(mMutex);
  if (mRealEventTarget) {
    return mRealEventTarget->Dispatch(std::move(aEvent), aFlags);
  }

  mTasks.AppendElement(TaskStruct{std::move(aEvent), aFlags});
  return NS_OK;
}

NS_IMETHODIMP StopGapEventTarget::DispatchFromScript(
    nsIRunnable* aEvent, nsIEventTarget::DispatchFlags aFlags) {
  nsCOMPtr<nsIRunnable> event(aEvent);
  return Dispatch(event.forget(), aFlags);
}

NS_IMETHODIMP StopGapEventTarget::DelayedDispatch(
    already_AddRefed<nsIRunnable> aEvent, uint32_t aDelayMs) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP StopGapEventTarget::RegisterShutdownTask(
    nsITargetShutdownTask* aTask) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP StopGapEventTarget::UnregisterShutdownTask(
    nsITargetShutdownTask* aTask) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

nsIEventTarget::FeatureFlags StopGapEventTarget::GetFeatures() {
  return SUPPORTS_BASE;
}

nsresult StopGapEventTarget::SetRealEventTarget(
    nsISerialEventTarget* aRealEventTarget) {
  nsTArray<TaskStruct> tasks;
  NS_ENSURE_ARG(aRealEventTarget);

  {
    MutexAutoLock lock(mMutex);
    if (mRealEventTarget) {
      MOZ_ASSERT_UNREACHABLE(
          "SetRealEventTarget cannot be called more than once.");
      return NS_ERROR_ALREADY_INITIALIZED;
    }
    tasks = std::move(mTasks);
    for (auto& task : tasks) {
      nsresult rv = aRealEventTarget->Dispatch(task.event.forget(), task.flags);
      if (NS_WARN_IF(NS_FAILED(rv))) {
        return rv;
      }
    }

    mRealEventTarget = aRealEventTarget;
  }

  return NS_OK;
}

}  // namespace mozilla
