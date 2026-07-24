/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "WorkerCSPEventListener.h"

#include "WorkerRef.h"
#include "WorkerRunnable.h"
#include "WorkerScope.h"
#include "mozilla/dom/ReportingUtils.h"
#include "mozilla/dom/SecurityPolicyViolationEvent.h"
#include "mozilla/dom/WorkerRunnable.h"

using namespace mozilla::dom;

namespace {

class WorkerCSPEventRunnable final : public MainThreadWorkerRunnable {
 public:
  WorkerCSPEventRunnable(WorkerPrivate* aWorkerPrivate, const nsAString& aJSON,
                         const nsAString& aReportGroupName)
      : MainThreadWorkerRunnable("WorkerCSPEventRunnable"),
        mJSON(aJSON),
        mReportGroupName(aReportGroupName) {}

 private:
  bool WorkerRun(JSContext* aCx, WorkerPrivate* aWorkerPrivate) {
    ReportingUtils::DeserializeSecurityViolationEventAndReport(
        aWorkerPrivate->GlobalScope(), aWorkerPrivate->GlobalScope(), mJSON,
        mReportGroupName);
    return true;
  }

  const nsString mJSON;
  const nsString mReportGroupName;
};

}  // namespace

NS_IMPL_ISUPPORTS(WorkerCSPEventListener, nsICSPEventListener)

/* static */
already_AddRefed<WorkerCSPEventListener> WorkerCSPEventListener::Create(
    WorkerPrivate* aWorkerPrivate) {
  MOZ_ASSERT(aWorkerPrivate);
  aWorkerPrivate->AssertIsOnWorkerThread();

  RefPtr<WorkerCSPEventListener> listener = new WorkerCSPEventListener();

  MutexAutoLock lock(listener->mMutex);
  listener->mWorkerRef = WeakWorkerRef::Create(aWorkerPrivate, [listener]() {
    MutexAutoLock lock(listener->mMutex);
    listener->mWorkerRef = nullptr;
  });

  if (NS_WARN_IF(!listener->mWorkerRef)) {
    return nullptr;
  }

  return listener.forget();
}

WorkerCSPEventListener::WorkerCSPEventListener()
    : mMutex("WorkerCSPEventListener::mMutex") {}

NS_IMETHODIMP
WorkerCSPEventListener::OnCSPViolationEvent(const nsAString& aJSON,
                                            const nsAString& aReportGroupName) {
  MutexAutoLock lock(mMutex);
  if (!mWorkerRef) {
    return NS_OK;
  }

  WorkerPrivate* workerPrivate = mWorkerRef->GetUnsafePrivate();
  MOZ_ASSERT(workerPrivate);

  if (NS_IsMainThread()) {
    RefPtr<WorkerCSPEventRunnable> runnable =
        new WorkerCSPEventRunnable(workerPrivate, aJSON, aReportGroupName);
    runnable->Dispatch(workerPrivate);
  } else {
    ReportingUtils::DeserializeSecurityViolationEventAndReport(
        workerPrivate->GlobalScope(), workerPrivate->GlobalScope(), aJSON,
        aReportGroupName);
  }

  return NS_OK;
}
