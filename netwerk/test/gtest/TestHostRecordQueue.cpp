#include "gtest/gtest.h"

#include "HostRecordQueue.h"
#include "TRRQuery.h"
#include "TRR.h"

using namespace mozilla;
using namespace mozilla::net;

class MockHostRecord : public nsHostRecord {
 public:
  NS_DECL_ISUPPORTS_INHERITED
  explicit MockHostRecord(const nsHostKey& aKey) : nsHostRecord(aKey) {
    negative = true;
  }

  void ResolveComplete() override {}

  bool HasUsableResultInternal(
      const mozilla::TimeStamp& now,
      nsIDNSService::DNSFlags queryFlags) const override {
    return true;
  }

 private:
  ~MockHostRecord() = default;
};

NS_IMPL_ISUPPORTS_INHERITED(MockHostRecord, nsHostRecord, MockHostRecord)

class HostRecordQueueTest : public ::testing::Test {
 protected:
  void SetUp() override {}

  HostRecordQueue queue;
  Mutex mMutex{"HostRecordQueueTest"};
  nsRefPtrHashtable<nsGenericHashKey<nsHostKey>, nsHostRecord> mDB;
};

static RefPtr<nsHostRecord> CreateAndInsertMockRecord(
    nsRefPtrHashtable<nsGenericHashKey<nsHostKey>, nsHostRecord>& aDB,
    const char* hostName) {
  nsHostKey key(nsCString(hostName), ""_ns, 0,
                nsIDNSService::RESOLVE_DEFAULT_FLAGS, 0, false, ""_ns);
  return aDB.LookupOrInsertWith(key, [&] { return new MockHostRecord(key); });
}

TEST_F(HostRecordQueueTest, AddToEvictionQ_BelowMax) {
  RefPtr<nsHostRecord> rec = CreateAndInsertMockRecord(mDB, "A.com");

  MutexAutoLock lock(mMutex);

  queue.AddToEvictionQ(rec.get(), 100, mDB, lock);

  ASSERT_EQ(1u, queue.EvictionQSize());
  ASSERT_TRUE(rec->isInList());

  // Cleanup
  rec->remove();
}

// When the eviction queue is at capacity, adding a new entry evicts the
// oldest (head) entry.
TEST_F(HostRecordQueueTest, AddToEvictionQ_AtMax_EvictsOldest) {
  const uint32_t MAX_ENTRIES = 3;

  RefPtr<nsHostRecord> rec1 = CreateAndInsertMockRecord(mDB, "A.com");
  RefPtr<nsHostRecord> rec2 = CreateAndInsertMockRecord(mDB, "B.com");
  RefPtr<nsHostRecord> rec3 = CreateAndInsertMockRecord(mDB, "C.com");

  MutexAutoLock lock(mMutex);
  queue.AddToEvictionQ(rec1, MAX_ENTRIES, mDB, lock);
  queue.AddToEvictionQ(rec2, MAX_ENTRIES, mDB, lock);
  queue.AddToEvictionQ(rec3, MAX_ENTRIES, mDB, lock);

  ASSERT_EQ(MAX_ENTRIES, queue.EvictionQSize());

  RefPtr<nsHostRecord> rec4 = CreateAndInsertMockRecord(mDB, "New.com");
  queue.AddToEvictionQ(rec4, MAX_ENTRIES, mDB, lock);

  ASSERT_TRUE(rec2->isInList());
  ASSERT_TRUE(rec3->isInList());
  ASSERT_TRUE(rec4->isInList());
  ASSERT_FALSE(rec1->isInList());

  rec2->remove();
  rec3->remove();
  rec4->remove();
}

// After adding a new record, the touched entry
// remains, and the oldest untouched entry is evicted.
TEST_F(HostRecordQueueTest, MoveToEvictionQueueTail) {
  const uint32_t MAX_ENTRIES = 3;

  RefPtr<nsHostRecord> rec1 = CreateAndInsertMockRecord(mDB, "A.com");
  RefPtr<nsHostRecord> rec2 = CreateAndInsertMockRecord(mDB, "B.com");
  RefPtr<nsHostRecord> rec3 = CreateAndInsertMockRecord(mDB, "C.com");

  MutexAutoLock lock(mMutex);
  queue.AddToEvictionQ(rec1, MAX_ENTRIES, mDB, lock);
  queue.AddToEvictionQ(rec2, MAX_ENTRIES, mDB, lock);
  queue.AddToEvictionQ(rec3, MAX_ENTRIES, mDB, lock);

  ASSERT_EQ(MAX_ENTRIES, queue.EvictionQSize());

  queue.MoveToEvictionQueueTail(rec1, lock);

  RefPtr<nsHostRecord> rec4 = CreateAndInsertMockRecord(mDB, "New.com");
  queue.AddToEvictionQ(rec4, MAX_ENTRIES, mDB, lock);

  ASSERT_TRUE(rec1->isInList());
  ASSERT_TRUE(rec3->isInList());
  ASSERT_TRUE(rec4->isInList());
  ASSERT_FALSE(rec2->isInList());

  rec1->remove();
  rec3->remove();
  rec4->remove();
}
