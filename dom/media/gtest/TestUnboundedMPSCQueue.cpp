/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <gtest/gtest.h>

#include <algorithm>
#include <cstdint>
#include <string>
#include <vector>

#include "UnboundedMPSCQueue.h"
#include "mozilla/Atomics.h"
#include "mozilla/TaskQueue.h"
#include "mozilla/UniquePtr.h"
#include "nsThreadManager.h"
#include "nsThreadUtils.h"

namespace mozilla::test_mpsc_queue {

struct MoveOnlyValue {
  explicit MoveOnlyValue(int32_t aValue = 0) : mValue(aValue) {}

  MoveOnlyValue(const MoveOnlyValue&) = delete;

  MoveOnlyValue& operator=(const MoveOnlyValue&) = delete;

  MoveOnlyValue(MoveOnlyValue&& aOther) : mValue(aOther.mValue) {
    aOther.mValue = -1;
  }

  MoveOnlyValue& operator=(MoveOnlyValue&& aOther) {
    mValue = aOther.mValue;
    aOther.mValue = -1;

    return *this;
  }

  int32_t mValue;
};

struct CountedType {
  explicit CountedType(int32_t aValue = 0) : mValue(aValue) { ++sLiveCount; }

  CountedType(const CountedType& aOther) : mValue(aOther.mValue) {
    ++sLiveCount;
  }

  CountedType& operator=(const CountedType& aOther) = default;

  CountedType(CountedType&& aOther) : mValue(aOther.mValue) {
    aOther.mValue = -1;
    ++sLiveCount;
  }

  CountedType& operator=(CountedType&& aOther) {
    mValue = aOther.mValue;
    aOther.mValue = -1;
    return *this;
  }

  ~CountedType() { --sLiveCount; }

  static Atomic<int32_t> sLiveCount;
  int32_t mValue;
};

Atomic<int32_t> CountedType::sLiveCount(0);

template <typename T>
void PushValue(UnboundedMPSCQueue<T>& aQueue, T aValue) {
  auto* msg = new typename UnboundedMPSCQueue<T>::Message();
  msg->data = std::move(aValue);
  aQueue.Push(msg);
}

// --- Single-threaded basics ---

TEST(UnboundedMPSCQueue, PopEmptyReturnsFalse)
{
  UnboundedMPSCQueue<int32_t> queue;
  int32_t output = 42;
  EXPECT_FALSE(queue.Pop(&output));
  EXPECT_EQ(output, 42);
}

TEST(UnboundedMPSCQueue, SinglePushPop)
{
  UnboundedMPSCQueue<int32_t> queue;
  PushValue(queue, 42);

  int32_t output = 0;
  EXPECT_TRUE(queue.Pop(&output));
  EXPECT_EQ(output, 42);
  EXPECT_FALSE(queue.Pop(&output));
}

TEST(UnboundedMPSCQueue, FIFOOrdering)
{
  UnboundedMPSCQueue<int32_t> queue;
  for (int32_t i = 0; i < 100; i++) {
    PushValue(queue, i);
  }

  for (int32_t i = 0; i < 100; i++) {
    int32_t output = -1;
    EXPECT_TRUE(queue.Pop(&output));
    EXPECT_EQ(output, i);
  }

  int32_t output = -1;
  EXPECT_FALSE(queue.Pop(&output));
}

TEST(UnboundedMPSCQueue, ManyElements)
{
  UnboundedMPSCQueue<int32_t> queue;
  const int32_t count = 10000;
  for (int32_t i = 0; i < count; i++) {
    PushValue(queue, i);
  }

  for (int32_t i = 0; i < count; i++) {
    int32_t output = -1;
    EXPECT_TRUE(queue.Pop(&output));
    EXPECT_EQ(output, i);
  }

  int32_t output = -1;
  EXPECT_FALSE(queue.Pop(&output));
}

// Push/pop alternate one-at-a-time (not batched), catching bugs in node
// recycling or state transitions between empty and non-empty.
TEST(UnboundedMPSCQueue, InterleavedPushPop)
{
  UnboundedMPSCQueue<int32_t> queue;
  // Push one, pop one, 50 times.
  for (int32_t i = 0; i < 50; i++) {
    PushValue(queue, i);
    int32_t output = -1;
    EXPECT_TRUE(queue.Pop(&output));
    EXPECT_EQ(output, i);
  }

  // Queue must be empty.
  int32_t output = -1;
  EXPECT_FALSE(queue.Pop(&output));
}

// New pushes after a partial drain are appended correctly and don't corrupt
// remaining unconsumed items -- catches stale-tail or linkage bugs.
TEST(UnboundedMPSCQueue, PopAfterPartialDrain)
{
  UnboundedMPSCQueue<int32_t> queue;
  // Enqueue 5 items.
  for (int32_t i = 0; i < 5; i++) {
    PushValue(queue, i);
  }

  // Drain only the first 3.
  for (int32_t i = 0; i < 3; i++) {
    int32_t output = -1;
    EXPECT_TRUE(queue.Pop(&output));
    EXPECT_EQ(output, i);
  }

  // Enqueue 3 more while 2 remain.
  for (int32_t i = 5; i < 8; i++) {
    PushValue(queue, i);
  }

  // Remaining + new items must appear in FIFO order.
  for (const auto& expected : {3, 4, 5, 6, 7}) {
    int32_t output = -1;
    EXPECT_TRUE(queue.Pop(&output));
    EXPECT_EQ(output, expected);
  }

  int32_t output = -1;
  EXPECT_FALSE(queue.Pop(&output));
}

// --- Move-only types ---

TEST(UnboundedMPSCQueue, MoveOnlyUniquePtr)
{
  UnboundedMPSCQueue<UniquePtr<int32_t>> queue;
  auto* msg = new UnboundedMPSCQueue<UniquePtr<int32_t>>::Message();
  msg->data = MakeUnique<int32_t>(99);
  queue.Push(msg);

  UniquePtr<int32_t> output;
  EXPECT_TRUE(queue.Pop(&output));
  ASSERT_NE(output, nullptr);
  EXPECT_EQ(*output, 99);
  EXPECT_FALSE(queue.Pop(&output));
}

TEST(UnboundedMPSCQueue, MoveOnlyStruct)
{
  UnboundedMPSCQueue<MoveOnlyValue> queue;
  for (int32_t i = 0; i < 10; i++) {
    PushValue<MoveOnlyValue>(queue, MoveOnlyValue(i));
  }

  for (int32_t i = 0; i < 10; i++) {
    MoveOnlyValue output;
    EXPECT_TRUE(queue.Pop(&output));
    EXPECT_EQ(output.mValue, i);
  }

  MoveOnlyValue output;
  EXPECT_FALSE(queue.Pop(&output));
}

TEST(UnboundedMPSCQueue, MoveOnlyFIFO)
{
  UnboundedMPSCQueue<UniquePtr<int32_t>> queue;
  for (int32_t i = 0; i < 100; i++) {
    auto* msg = new UnboundedMPSCQueue<UniquePtr<int32_t>>::Message();
    msg->data = MakeUnique<int32_t>(i);
    queue.Push(msg);
  }

  for (int32_t i = 0; i < 100; i++) {
    UniquePtr<int32_t> output;
    EXPECT_TRUE(queue.Pop(&output));
    ASSERT_NE(output, nullptr);
    EXPECT_EQ(*output, i);
  }
}

// --- Complex types ---

TEST(UnboundedMPSCQueue, StdString)
{
  UnboundedMPSCQueue<std::string> queue;
  PushValue<std::string>(queue, "hello");
  PushValue<std::string>(queue, "world");
  PushValue<std::string>(queue, "foo");

  std::string output;
  EXPECT_TRUE(queue.Pop(&output));
  EXPECT_EQ(output, "hello");
  EXPECT_TRUE(queue.Pop(&output));
  EXPECT_EQ(output, "world");
  EXPECT_TRUE(queue.Pop(&output));
  EXPECT_EQ(output, "foo");
  EXPECT_FALSE(queue.Pop(&output));
}

// --- Destructor / edge cases ---

TEST(UnboundedMPSCQueue, DestructorDrainsElements)
{
  int32_t before = CountedType::sLiveCount;
  {
    UnboundedMPSCQueue<CountedType> queue;
    for (int32_t i = 0; i < 50; i++) {
      PushValue<CountedType>(queue, CountedType(i));
    }
  }

  EXPECT_EQ(static_cast<int32_t>(CountedType::sLiveCount), before);
}

TEST(UnboundedMPSCQueue, DestructorDrainsMoveOnlyElements)
{
  int32_t before = CountedType::sLiveCount;
  {
    UnboundedMPSCQueue<UniquePtr<CountedType>> queue;
    for (int32_t i = 0; i < 50; i++) {
      auto* msg = new UnboundedMPSCQueue<UniquePtr<CountedType>>::Message();
      msg->data = MakeUnique<CountedType>(i);
      queue.Push(msg);
    }
  }
  EXPECT_EQ(static_cast<int32_t>(CountedType::sLiveCount), before);
}

TEST(UnboundedMPSCQueue, DestroyEmptyQueue)
{
  {
    UnboundedMPSCQueue<int32_t> queue;
  }
  SUCCEED();
}

// --- Multi-producer tests ---

class UnboundedMPSCQueueMTTest : public ::testing::TestWithParam<int32_t> {};

INSTANTIATE_TEST_SUITE_P(ThreadCounts, UnboundedMPSCQueueMTTest,
                         ::testing::Values(1, 2, 4, 8, 16));

// No items lost under concurrent multi-producer pushes (lost-update / ABA on
// the head pointer).
TEST_P(UnboundedMPSCQueueMTTest, AllItemsReceived) {
  const int32_t numThreads = GetParam();
  UnboundedMPSCQueue<int32_t> queue;

  // Spawn N producer task queues.
  nsTArray<RefPtr<TaskQueue>> threads(numThreads);
  for (int32_t t = 0; t < numThreads; t++) {
    RefPtr<TaskQueue> tq =
        nsThreadManager::get().CreateBackgroundTaskQueue("MPSCTest");
    ASSERT_NE(tq, nullptr);
    threads.AppendElement(std::move(tq));
  }

  // Each producer pushes 10k items.
  for (int32_t t = 0; t < numThreads; t++) {
    MOZ_ALWAYS_SUCCEEDS(
        threads[t]->Dispatch(NS_NewRunnableFunction("MPSCPush", [&queue]() {
          for (int32_t i = 0; i < 10000; i++) {
            PushValue(queue, i);
          }
        })));
  }

  // Wait for all producers to finish.
  for (int32_t t = numThreads - 1; t >= 0; t--) {
    threads[t]->BeginShutdown();
    threads[t]->AwaitShutdownAndIdle();
  }

  // Drain and count -- must equal N * 10k.
  int32_t total = 0;
  int32_t value;
  while (queue.Pop(&value)) {
    total++;
  }
  EXPECT_EQ(total, numThreads * 10000);
}

// Checks for data tearing -- each producer writes values in a unique range
// (threadIdx * 1M + i), then we verify every expected value is present.
TEST_P(UnboundedMPSCQueueMTTest, NoDataCorruption) {
  const int32_t numThreads = GetParam();
  const int32_t itemsPerThread = 10000;
  UnboundedMPSCQueue<int32_t> queue;

  // Spawn N producer task queues.
  nsTArray<RefPtr<TaskQueue>> threads(numThreads);
  for (int32_t t = 0; t < numThreads; t++) {
    RefPtr<TaskQueue> tq =
        nsThreadManager::get().CreateBackgroundTaskQueue("MPSCTest");
    ASSERT_NE(tq, nullptr);
    threads.AppendElement(std::move(tq));
  }

  // Each producer pushes 10k items tagged with its thread index.
  for (int32_t t = 0; t < numThreads; t++) {
    int32_t threadIdx = t;
    MOZ_ALWAYS_SUCCEEDS(threads[t]->Dispatch(
        NS_NewRunnableFunction("MPSCPush", [&queue, threadIdx]() {
          for (int32_t i = 0; i < 10000; i++) {
            PushValue(queue, threadIdx * 1000000 + i);
          }
        })));
  }

  // Wait for all producers.
  for (int32_t t = numThreads - 1; t >= 0; t--) {
    threads[t]->BeginShutdown();
    threads[t]->AwaitShutdownAndIdle();
  }

  // Collect all values.
  std::vector<int32_t> values;
  values.reserve(numThreads * itemsPerThread);
  int32_t value;
  while (queue.Pop(&value)) {
    values.push_back(value);
  }

  EXPECT_EQ(static_cast<int32_t>(values.size()), numThreads * itemsPerThread);

  // Sort and verify every expected value is present exactly once.
  std::sort(values.begin(), values.end());
  for (int32_t t = 0; t < numThreads; t++) {
    for (int32_t i = 0; i < itemsPerThread; i++) {
      int32_t expected = t * 1000000 + i;
      auto it = std::lower_bound(values.begin(), values.end(), expected);
      ASSERT_NE(it, values.end()) << "Missing value " << expected;
      EXPECT_EQ(*it, expected);
    }
  }
}

// Same as AllItemsReceived but with UniquePtr to verify move semantics under
// contention -- catches double-free or use-after-move.
TEST_P(UnboundedMPSCQueueMTTest, MoveOnlyMultiProducer) {
  const int32_t numThreads = GetParam();
  UnboundedMPSCQueue<UniquePtr<int32_t>> queue;

  // Spawn N producer task queues.
  nsTArray<RefPtr<TaskQueue>> threads(numThreads);
  for (int32_t t = 0; t < numThreads; t++) {
    RefPtr<TaskQueue> tq =
        nsThreadManager::get().CreateBackgroundTaskQueue("MPSCTest");
    ASSERT_NE(tq, nullptr);
    threads.AppendElement(std::move(tq));
  }

  // Each producer pushes 10k heap-allocated items.
  for (int32_t t = 0; t < numThreads; t++) {
    MOZ_ALWAYS_SUCCEEDS(
        threads[t]->Dispatch(NS_NewRunnableFunction("MPSCPush", [&queue]() {
          for (int32_t i = 0; i < 10000; i++) {
            auto* msg = new UnboundedMPSCQueue<UniquePtr<int32_t>>::Message();
            msg->data = MakeUnique<int32_t>(i);
            queue.Push(msg);
          }
        })));
  }

  // Wait for all producers.
  for (int32_t t = numThreads - 1; t >= 0; t--) {
    threads[t]->BeginShutdown();
    threads[t]->AwaitShutdownAndIdle();
  }

  // Drain, verify non-null, count.
  int32_t total = 0;
  UniquePtr<int32_t> value;
  while (queue.Pop(&value)) {
    ASSERT_NE(value, nullptr);
    total++;
  }
  EXPECT_EQ(total, numThreads * 10000);
}

// --- Stress tests ---

// Brute-force stress test: 8 producers x 100k items to surface races that only
// manifest under heavy contention.
TEST(UnboundedMPSCQueue, StressHighVolume)
{
  const int32_t numThreads = 8;
  UnboundedMPSCQueue<int32_t> queue;

  // Spawn 8 producer task queues.
  nsTArray<RefPtr<TaskQueue>> threads(numThreads);
  for (int32_t t = 0; t < numThreads; t++) {
    RefPtr<TaskQueue> tq =
        nsThreadManager::get().CreateBackgroundTaskQueue("MPSCStress");
    ASSERT_NE(tq, nullptr);
    threads.AppendElement(std::move(tq));
  }

  // Each producer pushes 100k items.
  for (int32_t t = 0; t < numThreads; t++) {
    MOZ_ALWAYS_SUCCEEDS(
        threads[t]->Dispatch(NS_NewRunnableFunction("MPSCPush", [&queue]() {
          for (int32_t i = 0; i < 100000; i++) {
            PushValue(queue, i);
          }
        })));
  }

  // Wait, drain, verify total count.
  for (int32_t t = numThreads - 1; t >= 0; t--) {
    threads[t]->BeginShutdown();
    threads[t]->AwaitShutdownAndIdle();
  }

  int32_t total = 0;
  int32_t value;
  while (queue.Pop(&value)) {
    total++;
  }
  EXPECT_EQ(total, numThreads * 100000);
}

// True MPSC pattern -- multiple producers push while a single consumer pops
// concurrently, catching races between Push and Pop on the shared head/tail
// pointers.
TEST(UnboundedMPSCQueue, StressConcurrentPushPop)
{
  const int32_t numProducers = 4;
  UnboundedMPSCQueue<int32_t> queue;
  Atomic<bool> producersDone(false);
  Atomic<int32_t> totalPopped(0);

  // Spawn 4 producer task queues.
  nsTArray<RefPtr<TaskQueue>> producers(numProducers);
  for (int32_t t = 0; t < numProducers; t++) {
    RefPtr<TaskQueue> tq =
        nsThreadManager::get().CreateBackgroundTaskQueue("MPSCProd");
    ASSERT_NE(tq, nullptr);
    producers.AppendElement(std::move(tq));
  }

  // Start a consumer that spins draining the queue.
  RefPtr<TaskQueue> consumer =
      nsThreadManager::get().CreateBackgroundTaskQueue("MPSCCons");
  MOZ_ALWAYS_SUCCEEDS(consumer->Dispatch(NS_NewRunnableFunction(
      "MPSCConsumer", [&queue, &producersDone, &totalPopped]() {
        int32_t value;
        for (;;) {
          while (queue.Pop(&value)) {
            totalPopped++;
          }
          if (producersDone) {
            // Final drain after all producers are done.
            while (queue.Pop(&value)) {
              totalPopped++;
            }
            break;
          }
        }
      })));

  // Start all producers, each pushing 100k items.
  for (int32_t t = 0; t < numProducers; t++) {
    MOZ_ALWAYS_SUCCEEDS(
        producers[t]->Dispatch(NS_NewRunnableFunction("MPSCPush", [&queue]() {
          for (int32_t i = 0; i < 100000; i++) {
            PushValue(queue, i);
          }
        })));
  }

  // Wait for producers, signal consumer, wait for consumer.
  for (int32_t t = numProducers - 1; t >= 0; t--) {
    producers[t]->BeginShutdown();
    producers[t]->AwaitShutdownAndIdle();
  }

  producersDone = true;
  consumer->BeginShutdown();
  consumer->AwaitShutdownAndIdle();

  // Consumer must have popped all items.
  EXPECT_EQ(static_cast<int32_t>(totalPopped), numProducers * 100000);
}

}  // namespace mozilla::test_mpsc_queue
