/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef SpeculativeTransaction_h_
#define SpeculativeTransaction_h_

#include "mozilla/Maybe.h"
#include "NullHttpTransaction.h"

namespace mozilla {
namespace net {

class HTTPSRecordResolver;

class SpeculativeTransaction : public NullHttpTransaction {
 public:
  SpeculativeTransaction(nsHttpConnectionInfo* aConnInfo,
                         nsIInterfaceRequestor* aCallbacks, uint32_t aCaps,
                         std::function<void(nsresult)>&& aCallback = nullptr,
                         bool reportActivity = true);

  already_AddRefed<SpeculativeTransaction> CreateWithNewConnInfo(
      nsHttpConnectionInfo* aConnInfo);

  virtual nsresult FetchHTTPSRR() override;

  virtual nsresult OnHTTPSRRAvailable(nsIDNSHTTPSSVCRecord* aHTTPSSVCRecord,
                                      nsISVCBRecord* aHighestPriorityRecord,
                                      const nsACString& aCname) override;

  void SetParallelSpeculativeConnectLimit(uint32_t aLimit) {
    mParallelSpeculativeConnectLimit.emplace(aLimit);
  }
  void SetIgnoreIdle(bool aIgnoreIdle) { mIgnoreIdle.emplace(aIgnoreIdle); }
  void SetAllow1918(bool aAllow1918) { mAllow1918.emplace(aAllow1918); }

  const Maybe<uint32_t>& ParallelSpeculativeConnectLimit() {
    return mParallelSpeculativeConnectLimit;
  }
  const Maybe<bool>& IgnoreIdle() { return mIgnoreIdle; }
  const Maybe<bool>& Allow1918() { return mAllow1918; }

  void Close(nsresult aReason) override;
  nsresult ReadSegments(nsAHttpSegmentReader* aReader, uint32_t aCount,
                        uint32_t* aCountRead) override;
  void InvokeCallback() override;

 protected:
  virtual ~SpeculativeTransaction();

  Maybe<uint32_t> mParallelSpeculativeConnectLimit;
  Maybe<bool> mIgnoreIdle;
  Maybe<bool> mAllow1918;

  bool mTriedToWrite = false;
  std::function<void(nsresult)> mCloseCallback;
  RefPtr<HTTPSRecordResolver> mResolver;
};

class FallbackTransaction : public SpeculativeTransaction {
 public:
  FallbackTransaction(nsHttpConnectionInfo* aConnInfo,
                      nsIInterfaceRequestor* aCallbacks, uint32_t aCaps,
                      std::function<void(nsresult)>&& aCallback)
      : SpeculativeTransaction(aConnInfo, aCallbacks, aCaps,
                               std::move(aCallback)) {}

  bool IsForFallback() override { return true; }

 private:
  virtual ~FallbackTransaction() = default;
};

}  // namespace net
}  // namespace mozilla

#endif  // SpeculativeTransaction_h_
