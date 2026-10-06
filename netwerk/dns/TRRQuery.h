/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_net_TRRQuery_h
#define mozilla_net_TRRQuery_h

#include "nsHostResolver.h"
#include "DNSPacket.h"

namespace mozilla {
namespace net {

class TRRQuery : public AHostResolver {
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(TRRQuery, override)

 public:
  TRRQuery(nsHostResolver* aHostResolver, nsHostRecord* aHostRecord)
      : mHostResolver(aHostResolver),
        mRecord(aHostRecord),
        mTrrLock("TRRQuery.mTrrLock") {}

  nsresult DispatchLookup(TRR* pushedTRR = nullptr);

  void Cancel(nsresult aStatus);

  enum TRRState { INIT, STARTED, OK, FAILED };
  TRRState mTrrAUsed = INIT;
  TRRState mTrrAAAAUsed = INIT;

  TRRSkippedReason mTRRAFailReason = TRRSkippedReason::TRR_UNSET;
  TRRSkippedReason mTRRAAAAFailReason = TRRSkippedReason::TRR_UNSET;

  virtual LookupStatus CompleteLookup(nsHostRecord*, nsresult,
                                      mozilla::net::AddrInfo*, bool pb,
                                      const nsACString& aOriginsuffix,
                                      nsHostRecord::TRRSkippedReason aReason,
                                      TRR* aTRRRequest) override;
  virtual LookupStatus CompleteLookupByType(
      nsHostRecord*, nsresult, mozilla::net::TypeRecordResultType& aResult,
      mozilla::net::TRRSkippedReason aReason, uint32_t aTtl, bool pb) override;
  virtual nsresult GetHostRecord(const nsACString& host,
                                 const nsACString& aTrrServer, uint16_t type,
                                 nsIDNSService::DNSFlags flags, uint16_t af,
                                 bool pb, const nsCString& originSuffix,
                                 nsHostRecord** result) override {
    if (!mHostResolver) {
      return NS_ERROR_FAILURE;
    }
    return mHostResolver->GetHostRecord(host, aTrrServer, type, flags, af, pb,
                                        originSuffix, result);
  }
  virtual nsresult TrrLookup_unlocked(
      nsHostRecord* rec, mozilla::net::TRR* pushedTRR = nullptr) override {
    if (!mHostResolver) {
      return NS_ERROR_FAILURE;
    }
    return mHostResolver->TrrLookup_unlocked(rec, pushedTRR);
  }
  virtual void MaybeRenewHostRecord(nsHostRecord* aRec) override {
    if (!mHostResolver) {
      return;
    }
    mHostResolver->MaybeRenewHostRecord(aRec);
  }

  mozilla::TimeDuration Duration() { return mTrrDuration; }

 private:
  nsresult DispatchByTypeLookup(TRR* pushedTRR = nullptr);

 private:
  ~TRRQuery() = default;

  void MarkSendingTRR(TRR* trr, TrrType rectype) MOZ_REQUIRES(mTrrLock);
  void PrepareQuery(TrrType aRecType, nsTArray<RefPtr<TRR>>& aRequestsToSend);
  bool SendQueries(nsTArray<RefPtr<TRR>>& aRequestsToSend);

  RefPtr<nsHostResolver> mHostResolver;
  RefPtr<nsHostRecord> mRecord;

  Mutex mTrrLock;  // lock when accessing the mTrrA[AAA] pointers
  RefPtr<mozilla::net::TRR> mTrrA MOZ_GUARDED_BY(mTrrLock);
  RefPtr<mozilla::net::TRR> mTrrAAAA MOZ_GUARDED_BY(mTrrLock);
  RefPtr<mozilla::net::TRR> mTrrByType MOZ_GUARDED_BY(mTrrLock);
  // |mTRRRequestCounter| indicates the number of TRR requests that were
  // dispatched sucessfully. Generally, this counter is increased to 2 after
  // mTrrA and mTrrAAAA are dispatched, and is decreased by 1 when
  // CompleteLookup is called. Note that nsHostResolver::CompleteLookup is only
  // called when this counter equals to 0.
  Atomic<uint32_t> mTRRRequestCounter{0};

  uint8_t mTRRSuccess MOZ_GUARDED_BY(mTrrLock) = 0;
  bool mCalledCompleteLookup = false;

  mozilla::TimeDuration mTrrDuration;
  mozilla::TimeStamp mTrrStart;

  RefPtr<mozilla::net::AddrInfo> mAddrInfoA MOZ_GUARDED_BY(mTrrLock);
  RefPtr<mozilla::net::AddrInfo> mAddrInfoAAAA MOZ_GUARDED_BY(mTrrLock);
  nsresult mAResult MOZ_GUARDED_BY(mTrrLock) = NS_OK;
  nsresult mAAAAResult MOZ_GUARDED_BY(mTrrLock) = NS_OK;
};

}  // namespace net
}  // namespace mozilla

#endif  // mozilla_net_TRRQuery_h
