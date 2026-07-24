/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gmock/gmock.h"
#include "gtest/gtest.h"
#include "gtest/gtest-spi.h"
#include "mozilla/LazyIdleThread.h"
#include "mozilla/SharedThreadPool.h"
#include "mozilla/TaskQueue.h"
#include "nsITargetShutdownTask.h"

namespace TestTargetShutdownTask {

using namespace mozilla;

class DidRunTask final : public nsITargetShutdownTask {
 public:
  NS_DECL_THREADSAFE_ISUPPORTS

  explicit DidRunTask(nsIEventTarget* aTarget) : mTarget(aTarget) {}

  void TargetShutdown() override {
    mCorrect = mTarget->IsOnCurrentThread();
    mRan = true;
    // Dispatch something to our target, should be still allowed and run.
    mDispatched = NS_SUCCEEDED(mTarget->Dispatch(NS_NewRunnableFunction(
        "RunFromShutdown", [self = nsCOMPtr<DidRunTask>{this}]() {
          self->mDispatchedRan = true;
        })));
  }

  bool DidRunOnTarget() { return mRan && mCorrect; }
  bool DidDispatchOnTarget() { return mDispatched && mDispatchedRan; }

 private:
  ~DidRunTask() = default;

  Atomic<bool> mRan{false};
  Atomic<bool> mCorrect{false};
  Atomic<bool> mDispatched{false};
  Atomic<bool> mDispatchedRan{false};
  nsCOMPtr<nsIEventTarget> mTarget;
};

NS_IMPL_ISUPPORTS(DidRunTask, nsITargetShutdownTask)

TEST(TestTargetShutdownTask, Thread)
{
  nsCOMPtr<nsIThread> thread;
  nsresult rv = NS_NewNamedThread("nsIThread", getter_AddRefs(thread));
  EXPECT_EQ(rv, NS_OK);

  // Add two tasks, remove one, leave one for shutdown.
  auto threadTask1 = MakeRefPtr<DidRunTask>(thread);
  auto threadTask2 = MakeRefPtr<DidRunTask>(thread);
  EXPECT_EQ(thread->RegisterShutdownTask(threadTask1), NS_OK);
  EXPECT_EQ(thread->RegisterShutdownTask(threadTask2), NS_OK);
  EXPECT_EQ(thread->UnregisterShutdownTask(threadTask1), NS_OK);
  EXPECT_EQ(thread->UnregisterShutdownTask(threadTask1), NS_ERROR_UNEXPECTED);

  thread->Shutdown();

  // Register/unregister after shutdown should fail.
  EXPECT_EQ(thread->RegisterShutdownTask(threadTask1), NS_ERROR_UNEXPECTED);
  EXPECT_EQ(thread->UnregisterShutdownTask(threadTask2), NS_ERROR_UNEXPECTED);

  // Task 1 was removed before shutdown and should not have run.
  EXPECT_FALSE(threadTask1->DidRunOnTarget());
  EXPECT_FALSE(threadTask1->DidDispatchOnTarget());
  EXPECT_TRUE(threadTask2->DidRunOnTarget());
  EXPECT_TRUE(threadTask2->DidDispatchOnTarget());
}

TEST(TestTargetShutdownTask, LazyIdleThread)
{
  auto target = MakeRefPtr<LazyIdleThread>(
      100, "LazyIdleThread", LazyIdleThread::ShutdownMethod::ManualShutdown);

  // Add two tasks, remove one, leave one for shutdown.
  auto threadTask1 = MakeRefPtr<DidRunTask>(target);
  auto threadTask2 = MakeRefPtr<DidRunTask>(target);
  EXPECT_EQ(target->RegisterShutdownTask(threadTask1), NS_OK);
  EXPECT_EQ(target->RegisterShutdownTask(threadTask2), NS_OK);
  EXPECT_EQ(target->UnregisterShutdownTask(threadTask1), NS_OK);
  EXPECT_EQ(target->UnregisterShutdownTask(threadTask1), NS_ERROR_UNEXPECTED);

  target->Shutdown();

  // Register/unregister after shutdown should fail.
  EXPECT_EQ(target->RegisterShutdownTask(threadTask1), NS_ERROR_UNEXPECTED);
  EXPECT_EQ(target->UnregisterShutdownTask(threadTask2), NS_ERROR_UNEXPECTED);

  // Task 1 was removed before shutdown and should not have run.
  EXPECT_FALSE(threadTask1->DidRunOnTarget());
  EXPECT_FALSE(threadTask1->DidDispatchOnTarget());
  EXPECT_TRUE(threadTask2->DidRunOnTarget());
  EXPECT_TRUE(threadTask2->DidDispatchOnTarget());
}

TEST(TestTargetShutdownTask, PoolAndTaskQueue)
{
  nsCOMPtr<nsIThreadPool> pool = new nsThreadPool();

  // Add two tasks, remove one, leave one for shutdown.
  auto poolTask1 = MakeRefPtr<DidRunTask>(pool);
  auto poolTask2 = MakeRefPtr<DidRunTask>(pool);
  EXPECT_EQ(pool->RegisterShutdownTask(poolTask1), NS_OK);
  EXPECT_EQ(pool->RegisterShutdownTask(poolTask2), NS_OK);
  EXPECT_EQ(pool->UnregisterShutdownTask(poolTask1), NS_OK);
  EXPECT_EQ(pool->UnregisterShutdownTask(poolTask1), NS_ERROR_UNEXPECTED);

  {
    RefPtr<TaskQueue> target =
        TaskQueue::Create(do_AddRef(pool), "TaskQueue", true);

    // Add two tasks, remove one, leave one for shutdown.
    auto queueTask1 = MakeRefPtr<DidRunTask>(target);
    auto queueTask2 = MakeRefPtr<DidRunTask>(target);
    EXPECT_EQ(target->RegisterShutdownTask(queueTask1), NS_OK);
    EXPECT_EQ(target->RegisterShutdownTask(queueTask2), NS_OK);
    EXPECT_EQ(target->UnregisterShutdownTask(queueTask1), NS_OK);
    EXPECT_EQ(target->UnregisterShutdownTask(queueTask1), NS_ERROR_UNEXPECTED);

    target->BeginShutdown();

    // Register/unregister after shutdown should fail.
    EXPECT_EQ(target->RegisterShutdownTask(queueTask1), NS_ERROR_UNEXPECTED);
    EXPECT_EQ(target->UnregisterShutdownTask(queueTask2), NS_ERROR_UNEXPECTED);

    target->AwaitShutdownAndIdle();

    // Task 1 was removed before shutdown and should not have run.
    EXPECT_FALSE(queueTask1->DidRunOnTarget());
    EXPECT_FALSE(queueTask1->DidDispatchOnTarget());
    EXPECT_TRUE(queueTask2->DidRunOnTarget());
    EXPECT_TRUE(queueTask2->DidDispatchOnTarget());
  }

  pool->Shutdown();

  // Register/unregister after shutdown should fail.
  EXPECT_EQ(pool->RegisterShutdownTask(poolTask1), NS_ERROR_UNEXPECTED);
  EXPECT_EQ(pool->UnregisterShutdownTask(poolTask2), NS_ERROR_UNEXPECTED);

  // Task 1 was removed before shutdown and should not have run.
  EXPECT_FALSE(poolTask1->DidRunOnTarget());
  EXPECT_FALSE(poolTask1->DidDispatchOnTarget());
  EXPECT_TRUE(poolTask2->DidRunOnTarget());
  EXPECT_TRUE(poolTask2->DidDispatchOnTarget());
}

}  // namespace TestTargetShutdownTask
