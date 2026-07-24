/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/TaskQueue.h"

#include "mozilla/ProfilerRunnable.h"
#include "mozilla/FlowMarkers.h"
#include "nsIEventTarget.h"
#include "nsITargetShutdownTask.h"
#include "nsThreadUtils.h"
#include "nsQueryObject.h"

namespace mozilla {

static LazyLogModule sTaskQueueLog("TaskQueue");

#define LOG_TQ(level, msg, ...) \
  MOZ_LOG(sTaskQueueLog, level, (msg, ##__VA_ARGS__))

RefPtr<TaskQueue> TaskQueue::Create(already_AddRefed<nsIEventTarget> aTarget,
                                    StaticString aName,
                                    bool aSupportsTailDispatch) {
  nsCOMPtr<nsIEventTarget> target(std::move(aTarget));
  LOG_TQ(LogLevel::Debug,
         "Creating TaskQueue '%s' on target %p (supportsTailDispatch=%d)",
         aName.get(), target.get(), aSupportsTailDispatch);

  RefPtr<TaskQueue> queue =
      new TaskQueue(do_AddRef(target), aName, aSupportsTailDispatch);

  return queue;
}

TaskQueue::TaskQueue(already_AddRefed<nsIEventTarget> aTarget,
                     const char* aName, bool aSupportsTailDispatch)
    : AbstractThread(aSupportsTailDispatch),
      mTarget(aTarget),
      mQueueMonitor("TaskQueue::Queue"),
      mTailDispatcher(nullptr),
      mIsTargetShutdownTaskRegistered(false),
      mIsRunning(false),
      mIsShutdown(false),
      mName(aName) {}

TaskQueue::~TaskQueue() {
  LOG_TQ(LogLevel::Debug, "Destroying TaskQueue '%s'", mName);
  // A TaskQueue with shutdown tasks deserves a regular shutdown.
  // Note that if the target SUPPORTS_SHUTDOWN_TASK_DISPATCH the TaskQueue will
  // be kept alive until explicit (or target) shutdown, anyways.
  MOZ_ASSERT(mIsShutdown || mShutdownTasks.IsEmpty());
}

NS_IMPL_ADDREF(TaskQueue)
NS_IMPL_RELEASE(TaskQueue)

NS_INTERFACE_MAP_BEGIN(TaskQueue)
  NS_INTERFACE_MAP_ENTRY(nsIDirectTaskDispatcher)
  NS_INTERFACE_MAP_ENTRY(nsISerialEventTarget)
  NS_INTERFACE_MAP_ENTRY(nsIEventTarget)
  NS_INTERFACE_MAP_ENTRY(nsITargetShutdownTask)
  NS_INTERFACE_MAP_ENTRY_CONCRETE(TaskQueue)
NS_INTERFACE_MAP_END

TaskDispatcher& TaskQueue::TailDispatcher() {
  MOZ_ASSERT(IsCurrentThreadIn());
  MOZ_ASSERT(mTailDispatcher);
  return *mTailDispatcher;
}

void TaskQueue::TargetShutdown() {
  // Nobody needs to wait for the promise as the Runner will ensure all
  // dispatched tasks are completed before the TaskQueue is destroyed
  // given the target SUPPORTS_SHUTDOWN_TASK_DISPATCH.
  LOG_TQ(LogLevel::Debug, "TaskQueue::TargetShutdown '%s'", mName);
  BeginShutdown();
}

void TaskQueue::MaybeUnregisterTargetShutdownTask() {
  if (mIsTargetShutdownTaskRegistered) {
    mTarget->UnregisterShutdownTask(this);
    // We cannot always expect success here because the target might shut
    // down already and this call might be an indirect consequence through
    // some other target shutdown task running first.
    mIsTargetShutdownTaskRegistered = false;
  }
}

// Note aRunnable is passed by ref to support conditional ownership transfer.
// See Dispatch() in TaskQueue.h for more details.
nsresult TaskQueue::DispatchLocked(nsCOMPtr<nsIRunnable>& aRunnable,
                                   DispatchFlags aFlags,
                                   DispatchReason aReason) {
  mQueueMonitor.AssertCurrentThreadOwns();

  // Continue to allow dispatches after shutdown until the last runnable has
  // been processed, at which point no more runnables will be accepted.
  if (mIsShutdown) {
    LOG_TQ(LogLevel::Debug,
           "TaskQueue::DispatchLocked '%s' %s dispatch during shutdown", mName,
           mIsRunning ? "accepting" : "rejecting");
    if (!mIsRunning) {
      return NS_ERROR_ILLEGAL_DURING_SHUTDOWN;
    }
  }

  AbstractThread* currentThread;
  if (aReason != TailDispatch && (currentThread = GetCurrent()) &&
      RequiresTailDispatch(currentThread) &&
      currentThread->IsTailDispatcherAvailable()) {
    return currentThread->TailDispatcher().AddTask(this, aRunnable.forget());
  }

  PROFILER_MARKER("TaskQueue::DispatchLocked", OTHER,
                  {MarkerStack::MaybeCapture(
                      profiler_feature_active(ProfilerFeature::Flows))},
                  FlowMarker, Flow::FromPointer(aRunnable.get()));
  LogRunnable::LogDispatch(aRunnable);
  mTasks.Push({std::move(aRunnable), aFlags});

  if (mIsRunning) {
    return NS_OK;
  }
  RefPtr<nsIRunnable> runner(new Runner(this));
  nsresult rv =
      mTarget->Dispatch(runner.forget(), aFlags | NS_DISPATCH_FALLIBLE);
  if (NS_FAILED(rv)) {
    NS_WARNING("Failed to dispatch runnable to run TaskQueue");
    return rv;
  }
  mIsRunning = true;

  return NS_OK;
}

nsresult TaskQueue::RegisterShutdownTask(nsITargetShutdownTask* aTask) {
  NS_ENSURE_ARG(aTask);

  LOG_TQ(LogLevel::Debug,
         "TaskQueue::RegisterShutdownTask '%s' registering shutdown task %p",
         mName, aTask);
  MonitorAutoLock mon(mQueueMonitor);
  if (mIsShutdown) {
    return NS_ERROR_UNEXPECTED;
  }
  if (!mIsTargetShutdownTaskRegistered && mShutdownTasks.IsEmpty()) {
    FeatureFlags f = mTarget->GetFeatures();
    if ((f & SUPPORTS_SHUTDOWN_TASKS) &&
        (f & SUPPORTS_SHUTDOWN_TASK_DISPATCH)) {
      MOZ_TRY(mTarget->RegisterShutdownTask(this));
      mIsTargetShutdownTaskRegistered = true;
    }
  }
  return mShutdownTasks.AddTask(aTask);
}

nsresult TaskQueue::UnregisterShutdownTask(nsITargetShutdownTask* aTask) {
  NS_ENSURE_ARG(aTask);

  LOG_TQ(
      LogLevel::Debug,
      "TaskQueue::UnregisterShutdownTask '%s' unregistering shutdown task %p",
      mName, aTask);
  MonitorAutoLock mon(mQueueMonitor);
  nsresult rv = mShutdownTasks.RemoveTask(aTask);
  if (mShutdownTasks.IsEmpty()) {
    MaybeUnregisterTargetShutdownTask();
  }
  return rv;
}

nsIEventTarget::FeatureFlags TaskQueue::GetFeatures() {
  FeatureFlags supports = SUPPORTS_BASE;
  nsCOMPtr<nsIEventTarget> target;
  {
    MonitorAutoLock mon(mQueueMonitor);
    target = mTarget;
  }
  if (target) {
    supports = target->GetFeatures();
  }
  // If the target does not SUPPORTS_SHUTDOWN_TASKS/_SHUTDOWN_TASK_DISPATCH, we
  // still support SHUTDOWN_TASKS but we cannot guarantee they're executed on
  // target shutdown. See bug 2011046 where we might want to change this.
  return supports | SUPPORTS_SHUTDOWN_TASKS;
}

void TaskQueue::AwaitIdle() {
  MonitorAutoLock mon(mQueueMonitor);
  AwaitIdleLocked();
}

void TaskQueue::AwaitIdleLocked() {
  // Make sure there are no tasks for this queue waiting in the caller's tail
  // dispatcher.
  MOZ_ASSERT_IF(AbstractThread::GetCurrent(),
                !AbstractThread::GetCurrent()->HasTailTasksFor(this));

  mQueueMonitor.AssertCurrentThreadOwns();
  MOZ_ASSERT(mIsRunning || mTasks.IsEmpty());
  while (mIsRunning) {
    mQueueMonitor.Wait();
  }
  LOG_TQ(LogLevel::Debug, "TaskQueue::AwaitIdleLocked '%s' is now idle", mName);
}

void TaskQueue::AwaitShutdownAndIdle() {
  MOZ_ASSERT(!IsCurrentThreadIn());
  // Make sure there are no tasks for this queue waiting in the caller's tail
  // dispatcher.
  MOZ_ASSERT_IF(AbstractThread::GetCurrent(),
                !AbstractThread::GetCurrent()->HasTailTasksFor(this));

  MonitorAutoLock mon(mQueueMonitor);
  while (!mIsShutdown) {
    mQueueMonitor.Wait();
  }
  AwaitIdleLocked();
}

RefPtr<ShutdownPromise> TaskQueue::BeginShutdown() {
  LOG_TQ(LogLevel::Debug, "TaskQueue::BeginShutdown '%s'", mName);
  // Dispatch any tasks for this queue waiting in the caller's tail dispatcher,
  // since this is the last opportunity to do so.
  if (AbstractThread* currentThread = AbstractThread::GetCurrent()) {
    currentThread->TailDispatchTasksFor(this);
  }

  MonitorAutoLock mon(mQueueMonitor);
  if (!mIsShutdown) {
    MaybeUnregisterTargetShutdownTask();
    // Dispatch all cleanup tasks to the queue before we put it into full
    // shutdown.
    TargetShutdownTaskSet::TasksArray tasks = mShutdownTasks.Extract();
    for (auto& task : tasks) {
      LOG_TQ(LogLevel::Debug,
             "TaskQueue::BeginShutdown '%s' dispatching shutdown task %p",
             mName, task.get());
      nsCOMPtr runnable{task->AsRunnable()};
      MOZ_ALWAYS_SUCCEEDS(
          DispatchLocked(runnable, NS_DISPATCH_NORMAL, TailDispatch));
    }
    mIsShutdown = true;
  }

  RefPtr<ShutdownPromise> p = mShutdownPromise.Ensure(__func__);
  MaybeResolveShutdown();
  mon.NotifyAll();
  return p;
}

void TaskQueue::MaybeResolveShutdown() {
  mQueueMonitor.AssertCurrentThreadOwns();
  if (mIsShutdown && !mIsRunning) {
    LOG_TQ(LogLevel::Debug, "TaskQueue::MaybeResolveShutdown '%s' resolve",
           mName);
    MOZ_ASSERT(!mIsTargetShutdownTaskRegistered);
    mShutdownPromise.ResolveIfExists(true, __func__);
    // Disconnect from our target as we won't try to dispatch any more events.
    mTarget = nullptr;
    mObserver = nullptr;
  }
}

bool TaskQueue::IsEmpty() {
  MonitorAutoLock mon(mQueueMonitor);
  return mTasks.IsEmpty();
}

bool TaskQueue::IsCurrentThreadIn() const {
  bool in = mRunningThread == PR_GetCurrentThread();
  return in;
}

void TaskQueue::SetObserver(Observer* aObserver) {
  MonitorAutoLock mon(mQueueMonitor);
  MOZ_ASSERT_IF(aObserver, !mObserver);
  mObserver = std::move(aObserver);
}

nsresult TaskQueue::Runner::Run() {
  TaskStruct event;
  RefPtr<Observer> observer;
  {
    MonitorAutoLock mon(mQueue->mQueueMonitor);
    MOZ_ASSERT(mQueue->mIsRunning);
    if (mQueue->mTasks.IsEmpty()) {
      mQueue->mIsRunning = false;
      mQueue->MaybeResolveShutdown();
      mon.NotifyAll();
      return NS_OK;
    }
    event = mQueue->mTasks.Pop();
    observer = mQueue->mObserver;
  }
  MOZ_ASSERT(event.event);

  // Note that dropping the queue monitor before running the task, and
  // taking the monitor again after the task has run ensures we have memory
  // fences enforced. This means that if the object we're calling wasn't
  // designed to be threadsafe, it will be, provided we're only calling it
  // in this task queue.
  {
    AutoTaskGuard g(mQueue, observer);
    {
      LogRunnable::Run log(event.event);

      AUTO_PROFILE_FOLLOWING_RUNNABLE(event.event);
      event.event->Run();

      // Drop the reference to event. The event will hold a reference to the
      // object it's calling, and we don't want to keep it alive, it may be
      // making assumptions what holds references to it. This is especially
      // the case if the object is waiting for us to shutdown, so that it
      // can shutdown (like in the MediaDecoderStateMachine's SHUTDOWN case).
      event.event = nullptr;
    }
  }

  {
    MonitorAutoLock mon(mQueue->mQueueMonitor);
    if (mQueue->mTasks.IsEmpty()) {
      // No more events to run. Exit the task runner.
      mQueue->mIsRunning = false;
      mQueue->MaybeResolveShutdown();
      mon.NotifyAll();
      return NS_OK;
    }
  }

  // There's at least one more event that we can run. Dispatch this Runner
  // to the target again to ensure it runs again. Note that we don't just
  // run in a loop here so that we don't hog the target. This means we may
  // run on another thread next time, but we rely on the memory fences from
  // mQueueMonitor for thread safety of non-threadsafe tasks.
  nsresult rv;
  {
    MonitorAutoLock mon(mQueue->mQueueMonitor);
    rv = mQueue->mTarget->Dispatch(this, mQueue->mTasks.FirstElement().flags |
                                             NS_DISPATCH_AT_END |
                                             NS_DISPATCH_FALLIBLE);
  }
  if (NS_FAILED(rv)) {
    // Failed to dispatch, immediate shutdown!
    MonitorAutoLock mon(mQueue->mQueueMonitor);
    mQueue->mIsRunning = false;
    mQueue->mIsShutdown = true;
    mQueue->MaybeUnregisterTargetShutdownTask();
    mQueue->MaybeResolveShutdown();
    mon.NotifyAll();
  }

  return NS_OK;
}

//-----------------------------------------------------------------------------
// nsIDirectTaskDispatcher
//-----------------------------------------------------------------------------

NS_IMETHODIMP
TaskQueue::DispatchDirectTask(already_AddRefed<nsIRunnable> aEvent) {
  if (!IsCurrentThreadIn()) {
    return NS_ERROR_FAILURE;
  }
  mDirectTasks.AddTask(std::move(aEvent));
  return NS_OK;
}

NS_IMETHODIMP TaskQueue::DrainDirectTasks() {
  if (!IsCurrentThreadIn()) {
    return NS_ERROR_FAILURE;
  }
  mDirectTasks.DrainTasks();
  return NS_OK;
}

NS_IMETHODIMP TaskQueue::HaveDirectTasks(bool* aValue) {
  if (!IsCurrentThreadIn()) {
    return NS_ERROR_FAILURE;
  }

  *aValue = mDirectTasks.HaveTasks();
  return NS_OK;
}

#undef LOG_TQ

}  // namespace mozilla
