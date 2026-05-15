/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/StopGapEventTarget.h"
#include "mozilla/RefPtr.h"
#include "mozilla/gtest/MozAssertions.h"
#include "nsIRunnable.h"
#include "nsThreadUtils.h"
#include "Helpers.h"

using mozilla::CancelableRunnable;
using mozilla::MakeRefPtr;
using mozilla::StopGapEventTarget;

namespace TestStopGapEventTarget {

static void Enqueue(nsIEventTarget* target, std::function<void()>&& aCallable) {
  nsresult rv = target->Dispatch(
      NS_NewRunnableFunction("SGQ GTest", std::move(aCallable)));
  MOZ_ALWAYS_TRUE(NS_SUCCEEDED(rv));
}

class TestCancelable final : public CancelableRunnable {
 public:
  explicit TestCancelable() : CancelableRunnable("TestCancelable") {}
  NS_IMETHOD Run() override {
    mHasRun = true;
    return NS_OK;
  }

  nsresult Cancel() override {
    mHasCanceled = true;
    return NS_OK;
  }

  bool mHasRun = false;
  bool mHasCanceled = false;

 private:
  virtual ~TestCancelable() = default;
};

}  // namespace TestStopGapEventTarget

using namespace TestStopGapEventTarget;
using testing::RunnableQueue;

TEST(StopGapEventTarget, SimpleDispatch)
{
  std::string log;

  RefPtr<StopGapEventTarget> stopgap = MakeRefPtr<StopGapEventTarget>();

  Enqueue(stopgap, [&]() { log += 'a'; });
  ASSERT_EQ(log, "");

  auto base = MakeRefPtr<RunnableQueue>();
  stopgap->SetRealEventTarget(base);
  ASSERT_NS_SUCCEEDED(base->Run());

  ASSERT_EQ(log, "a");

  ASSERT_TRUE(base->IsEmpty());
}

TEST(StopGapEventTarget, RunnableNeverRun)
{
  std::string log;

  RefPtr<StopGapEventTarget> stopgap = MakeRefPtr<StopGapEventTarget>();

  Enqueue(stopgap, [&]() { log += 'a'; });
  ASSERT_EQ(log, "");
  stopgap = nullptr;
  ASSERT_EQ(log, "");
}

TEST(StopGapEventTarget, CancelableIsRun)
{
  RefPtr<StopGapEventTarget> stopgap = MakeRefPtr<StopGapEventTarget>();
  RefPtr<TestCancelable> cancelable(new TestCancelable);

  stopgap->Dispatch(do_AddRef(cancelable));

  ASSERT_FALSE(cancelable->mHasRun);
  ASSERT_FALSE(cancelable->mHasCanceled);

  auto base = MakeRefPtr<RunnableQueue>();
  stopgap->SetRealEventTarget(base);
  ASSERT_NS_SUCCEEDED(base->Run());

  stopgap = nullptr;

  ASSERT_TRUE(cancelable->mHasRun);
  ASSERT_FALSE(cancelable->mHasCanceled);
}

TEST(StopGapEventTarget, CancelableNeverRun)
{
  RefPtr<StopGapEventTarget> stopgap = MakeRefPtr<StopGapEventTarget>();
  RefPtr<TestCancelable> cancelable(new TestCancelable);

  stopgap->Dispatch(do_AddRef(cancelable));

  ASSERT_FALSE(cancelable->mHasRun);
  ASSERT_FALSE(cancelable->mHasCanceled);

  stopgap = nullptr;

  ASSERT_FALSE(cancelable->mHasRun);
  ASSERT_TRUE(cancelable->mHasCanceled);
}

TEST(StopGapEventTarget, EnqueueFromRun)
{
  std::string log;

  auto base = MakeRefPtr<RunnableQueue>();
  RefPtr<StopGapEventTarget> stopgap = MakeRefPtr<StopGapEventTarget>();

  Enqueue(base, [&]() { log += 'a'; });
  Enqueue(stopgap, [&]() {
    log += 'b';
    Enqueue(stopgap, [&]() { log += 'c'; });
    Enqueue(base, [&]() { log += 'd'; });
  });
  Enqueue(stopgap, [&]() { log += 'e'; });

  ASSERT_NS_SUCCEEDED(base->Run());
  ASSERT_EQ(log, "a");
  ASSERT_TRUE(base->IsEmpty());

  stopgap->SetRealEventTarget(base);
  ASSERT_EQ(base->Length(), 2U);
  ASSERT_NS_SUCCEEDED(base->Run());

  ASSERT_EQ(log, "abecd");
  ASSERT_TRUE(base->IsEmpty());
}

TEST(StopGapEventTarget, RunFromRun)
{
  std::string log;

  auto base = MakeRefPtr<RunnableQueue>();
  RefPtr<StopGapEventTarget> stopgap = MakeRefPtr<StopGapEventTarget>();

  Enqueue(base, [&]() { log += 'a'; });

  // Running the event queue from within an event (i.e., a nested event loop)
  // does not stall the StopGapEventTarget.
  Enqueue(stopgap, [&]() {
    log += '(';
    Enqueue(stopgap, [&]() { log += 'b'; });
    // This should run subsequent events from stopgap.
    ASSERT_NS_SUCCEEDED(base->Run());
    log += ')';
  });

  Enqueue(stopgap, [&]() { log += 'c'; });

  ASSERT_EQ(log, "");
  stopgap->SetRealEventTarget(base);
  ASSERT_NS_SUCCEEDED(base->Run());
  ASSERT_EQ(log, "a(cb)");

  ASSERT_TRUE(base->IsEmpty());
}

TEST(StopGapEventTarget, SetEventTargetFromRun)
{
  std::string log;

  auto base = MakeRefPtr<RunnableQueue>();
  RefPtr<StopGapEventTarget> stopgap = MakeRefPtr<StopGapEventTarget>();

  Enqueue(stopgap, [&]() {
    // This is running during the first Run() call, and enqueueing these will
    // result in them being run too during this call
    log += 'd';
    Enqueue(stopgap, [&]() { log += 'e'; });
    Enqueue(stopgap, [&]() { log += 'f'; });
  });

  Enqueue(base, [&]() {
    log += 'a';
    // This will enqueue the d task from above; Run() is currently running...
    stopgap->SetRealEventTarget(base);
    log += 'b';
    // ...but we call Run inside Run; *this* call to Run will take over, running
    // d, then e and f
    ASSERT_NS_SUCCEEDED(base->Run());
    log += 'c';
  });

  ASSERT_EQ(log, "");
  ASSERT_NS_SUCCEEDED(base->Run());
  ASSERT_EQ(log, "abdefc");

  ASSERT_TRUE(base->IsEmpty());
}

TEST(StopGapEventTarget, DropWhileRunning)
{
  std::string log;

  auto base = MakeRefPtr<RunnableQueue>();

  // If we drop the event queue while it still has events, they still run.
  {
    RefPtr<StopGapEventTarget> stopgap = MakeRefPtr<StopGapEventTarget>();
    Enqueue(stopgap, [&]() { log += 'a'; });
    stopgap->SetRealEventTarget(base);
  }

  ASSERT_EQ(log, "");
  ASSERT_NS_SUCCEEDED(base->Run());
  ASSERT_EQ(log, "a");
}
