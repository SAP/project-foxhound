#include "gtest/gtest.h"
#include "mozilla/StaticMutex.h"
#include "mozilla/TimeStamp.h"
#include "nsTArray.h"
#include "../cache2/CacheIndex.h"

namespace mozilla {
namespace net {

using namespace mozilla::net;

class FrecencyStorageTest : public ::testing::Test {
 protected:
  RefPtr<CacheIndexRecordWrapper> MakeRecord(uint32_t frecency) {
    auto* rec = new CacheIndexRecordWrapper();
    rec->Get()->mFrecency = frecency;
    return RefPtr<CacheIndexRecordWrapper>(rec);
  }
};

// Test to ensure that AppendRecord and RemoveRecord work correctly. Also
// implicitly tests RecordExistedUnlocked
TEST_F(FrecencyStorageTest, AppendRemoveRecordTest) {
  CacheIndex::FrecencyStorage storage;
  RefPtr<CacheIndexRecordWrapper> rec1 = MakeRecord(10);
  RefPtr<CacheIndexRecordWrapper> rec2 = MakeRecord(20);

  mozilla::StaticMutexAutoLock lock(CacheIndex::sLock);

  // sanity check
  EXPECT_FALSE(storage.RecordExistedUnlocked(rec1));
  EXPECT_FALSE(storage.RecordExistedUnlocked(rec2));
  EXPECT_EQ(storage.Length(), 0u);

  // Append test
  storage.AppendRecord(rec1, lock);
  EXPECT_EQ(storage.Length(), 1u);
  EXPECT_TRUE(storage.RecordExistedUnlocked(rec1));

  storage.AppendRecord(rec2, lock);
  EXPECT_EQ(storage.Length(), 2u);
  EXPECT_TRUE(storage.RecordExistedUnlocked(rec1));
  EXPECT_TRUE(storage.RecordExistedUnlocked(rec2));

  // Remove test
  storage.RemoveRecord(rec1, lock);
  EXPECT_EQ(storage.Length(), 1u);

  storage.RemoveRecord(rec2, lock);
  EXPECT_EQ(storage.Length(), 0u);

  EXPECT_FALSE(storage.RecordExistedUnlocked(rec1));
  EXPECT_FALSE(storage.RecordExistedUnlocked(rec2));
}

// Test to ensure that ReplaceRecord updates the record correctly.
TEST_F(FrecencyStorageTest, ReplaceRecordTest) {
  RefPtr<CacheIndexRecordWrapper> oldRec = MakeRecord(10);
  RefPtr<CacheIndexRecordWrapper> newRec = MakeRecord(20);

  CacheIndex::FrecencyStorage storage;
  mozilla::StaticMutexAutoLock lock(CacheIndex::sLock);
  storage.AppendRecord(oldRec, lock);
  EXPECT_TRUE(storage.RecordExistedUnlocked(oldRec));
  EXPECT_FALSE(storage.RecordExistedUnlocked(newRec));

  storage.ReplaceRecord(oldRec, newRec, lock);
  EXPECT_FALSE(storage.RecordExistedUnlocked(oldRec));
  EXPECT_TRUE(storage.RecordExistedUnlocked(newRec));
}

// Test to ensure that Clear() method empties the storage.
TEST_F(FrecencyStorageTest, ClearTest) {
  RefPtr<CacheIndexRecordWrapper> rec1 = MakeRecord(10);
  RefPtr<CacheIndexRecordWrapper> rec2 = MakeRecord(20);

  CacheIndex::FrecencyStorage storage;
  mozilla::StaticMutexAutoLock lock(CacheIndex::sLock);
  storage.AppendRecord(rec1, lock);
  storage.AppendRecord(rec2, lock);
  EXPECT_EQ(storage.Length(), 2u);

  storage.Clear(lock);
  EXPECT_EQ(storage.Length(), 0u);
}

// Test to ensure that GetSortedSnapshotForEviction returns records in sorted
// order based on frecency.
TEST_F(FrecencyStorageTest, GetSortedSnapshotForEvictionTest) {
  auto r1 = MakeRecord(30);
  auto r2 = MakeRecord(10);
  auto r3 = MakeRecord(20);

  CacheIndex::FrecencyStorage storage;
  mozilla::StaticMutexAutoLock lock(CacheIndex::sLock);
  storage.AppendRecord(r1, lock);
  storage.AppendRecord(r2, lock);
  storage.AppendRecord(r3, lock);

  auto snapshot = storage.GetSortedSnapshotForEviction();
  ASSERT_EQ(snapshot.Length(), 3u);
  EXPECT_EQ(snapshot[0]->Get()->mFrecency, 10u);
  EXPECT_EQ(snapshot[1]->Get()->mFrecency, 20u);
  EXPECT_EQ(snapshot[2]->Get()->mFrecency, 30u);
}

// Performance test to ensure that AppendRecord and RemoveRecord do not degrade
// with large numbers of records.
TEST_F(FrecencyStorageTest, PerformanceTest) {
  constexpr int N = 100'000;
  CacheIndex::FrecencyStorage storage;

  std::vector<RefPtr<CacheIndexRecordWrapper>> records;
  records.reserve(N);
  for (int i = 0; i < N; ++i) {
    records.push_back(MakeRecord(i));
  }
  mozilla::StaticMutexAutoLock lock(CacheIndex::sLock);

  // Utility function to measure the time taken
  auto measure = [](const std::function<void()>& func) {
    auto start = std::chrono::high_resolution_clock::now();
    func();
    auto end = std::chrono::high_resolution_clock::now();
    return std::chrono::duration<double, std::milli>(end - start).count();
  };

  // Measure AppendRecord performance
  auto append_duration = measure([&] {
    for (const auto& rec : records) {
      storage.AppendRecord(rec.get(), lock);
    }
  });
  EXPECT_LE(append_duration, 200)
      << "AppendRecord is too slow" << " (" << append_duration << " ms) for "
      << N << " records";

  // Measure ContainsRecord
  auto contains_duration = measure([&] {
    for (const auto& rec : records) {
      auto res = storage.RecordExistedUnlocked(rec.get());
      EXPECT_TRUE(res);
      // Avoid any loop optimizations by adding this check
      if (!res) {
        break;
      }
    }
  });
  EXPECT_LE(contains_duration, 100)
      << "ContainsRecord is too slow" << " (" << contains_duration
      << " ms) for " << N << " records";

  // Measure RemoveRecord performance
  auto remove_duration = measure([&] {
    for (const auto& rec : records) {
      storage.RemoveRecord(rec.get(), lock);
    }
  });
  EXPECT_LE(remove_duration, 200)
      << "RemoveRecord is too slow" << " (" << remove_duration << " ms) for "
      << N << " records";
}

}  // namespace net
}  // namespace mozilla
