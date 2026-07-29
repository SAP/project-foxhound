/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef PendingTransactionQueue_h_
#define PendingTransactionQueue_h_

#include "nsClassHashtable.h"
#include "nsHttpTransaction.h"
#include "PendingTransactionInfo.h"

namespace mozilla {
namespace net {

class PendingTransactionQueue {
 public:
  PendingTransactionQueue() = default;

  void ReschedTransaction(nsHttpTransaction* aTrans);

  nsTArray<RefPtr<PendingTransactionInfo>>* GetTransactionPendingQHelper(
      nsAHttpTransaction* trans);

  void InsertTransactionSorted(
      nsTArray<RefPtr<PendingTransactionInfo>>& pendingQ,
      PendingTransactionInfo* pendingTransInfo,
      bool aInsertAsFirstForTheSamePriority = false);

  // Add a transaction information into the pending queue in
  // |mPendingTransactionTable| according to the transaction's
  // top level outer content window id.
  void InsertTransaction(PendingTransactionInfo* pendingTransInfo,
                         bool aInsertAsFirstForTheSamePriority = false);

  void AppendPendingUrgentStartQ(
      nsTArray<RefPtr<PendingTransactionInfo>>& result);

  // Append transactions to the |result| whose window id
  // is equal to |windowId|.
  // NOTE: maxCount == 0 will get all transactions in the queue.
  void AppendPendingQForFocusedWindow(
      uint64_t windowId, nsTArray<RefPtr<PendingTransactionInfo>>& result,
      uint32_t maxCount = 0);

  // Append transactions whose window id isn't equal to |windowId|.
  // NOTE: windowId == 0 will get all transactions for both
  // focused and non-focused windows.
  void AppendPendingQForNonFocusedWindows(
      uint64_t windowId, nsTArray<RefPtr<PendingTransactionInfo>>& result,
      uint32_t maxCount = 0);

  // Return the count of pending transactions for all window ids.
  inline size_t PendingQueueLength() const {
    MOZ_ASSERT(mPendingQueueLength == ComputePendingQueueLength());
    return mPendingQueueLength;
  }

  size_t PendingQueueLengthForWindow(uint64_t windowId) const;

  inline bool PendingQueueIsEmpty() const {
    MOZ_ASSERT(mPendingQueueLength == ComputePendingQueueLength());
    return mPendingQueueLength == 0;
  }

  // Remove the empty pendingQ in |mPendingTransactionTable|.
  void RemoveEmptyPendingQ();

  // Notify that a transaction was removed directly from a per-window array
  // returned by GetTransactionPendingQHelper (not from mUrgentStartQ).
  void OnPendingTransactionRemovedFromTable();

  void PrintDiagnostics(nsCString& log);

  inline size_t UrgentStartQueueLength() const {
    return mUrgentStartQ.Length();
  }

  // Return true if the urgent start queue is empty (optimized version of
  // UrgentStartQueueLength() == 0).
  inline bool UrgentStartQueueIsEmpty() const {
    return mUrgentStartQ.IsEmpty();
  }

  void PrintPendingQ();

  void Compact();

  void CancelAllTransactions(nsresult reason);

  ~PendingTransactionQueue() = default;

 private:
#ifdef DEBUG
  size_t ComputePendingQueueLength() const;
#endif

  void InsertTransactionNormal(PendingTransactionInfo* info,
                               bool aInsertAsFirstForTheSamePriority = false);

  nsTArray<RefPtr<PendingTransactionInfo>>
      mUrgentStartQ;  // the urgent start transaction queue

  // This table provides a mapping from top level outer content window id
  // to a queue of pending transaction information.
  // The transaction's order in pending queue is decided by whether it's a
  // blocking transaction and its priority.
  // Note that the window id could be 0 if the http request
  // is initialized without a window.
  nsClassHashtable<nsUint64HashKey, nsTArray<RefPtr<PendingTransactionInfo>>>
      mPendingTransactionTable;

  // Running count of transactions across all per-window arrays in
  // mPendingTransactionTable (excludes mUrgentStartQ).
  size_t mPendingQueueLength{0};
};

}  // namespace net
}  // namespace mozilla

#endif  // !PendingTransactionQueue_h_
