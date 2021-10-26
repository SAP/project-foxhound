/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set sw=2 ts=8 et tw=80 : */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_net_TRR_h
#define mozilla_net_TRR_h

#include "mozilla/net/DNSByTypeRecord.h"
#include "mozilla/Assertions.h"
#include "nsClassHashtable.h"
#include "nsIChannel.h"
#include "nsIHttpPushListener.h"
#include "nsIInterfaceRequestor.h"
#include "nsIStreamListener.h"
#include "nsHostResolver.h"
#include "nsThreadUtils.h"
#include "nsXULAppAPI.h"

namespace mozilla {
namespace net {

// the values map to RFC1035 type identifiers
enum TrrType {
  TRRTYPE_A = 1,
  TRRTYPE_NS = 2,
  TRRTYPE_CNAME = 5,
  TRRTYPE_AAAA = 28,
  TRRTYPE_OPT = 41,
  TRRTYPE_TXT = 16,
  TRRTYPE_HTTPSSVC = nsIDNSService::RESOLVE_TYPE_HTTPSSVC,  // 65
};

class TRRService;
class TRRServiceChannel;
extern TRRService* gTRRService;

class DOHresp {
 public:
  nsresult Add(uint32_t TTL, unsigned char* dns, unsigned int index,
               uint16_t len, bool aLocalAllowed);
  nsTArray<NetAddr> mAddresses;
  uint32_t mTtl = UINT32_MAX;
};

class TRR : public Runnable,
            public nsITimerCallback,
            public nsIHttpPushListener,
            public nsIInterfaceRequestor,
            public nsIStreamListener {
 public:
  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_NSIHTTPPUSHLISTENER
  NS_DECL_NSIINTERFACEREQUESTOR
  NS_DECL_NSIREQUESTOBSERVER
  NS_DECL_NSISTREAMLISTENER
  NS_DECL_NSITIMERCALLBACK

  // Never accept larger DOH responses than this as that would indicate
  // something is wrong. Typical ones are much smaller.
  static const unsigned int kMaxSize = 3200;

  // Number of "steps" we follow CNAME chains
  static const unsigned int kCnameChaseMax = 64;

  // when firing off a normal A or AAAA query
  explicit TRR(AHostResolver* aResolver, nsHostRecord* aRec, enum TrrType aType)
      : mozilla::Runnable("TRR"),
        mRec(aRec),
        mHostResolver(aResolver),
        mType(aType),
        mOriginSuffix(aRec->originSuffix) {
    mHost = aRec->host;
    mPB = aRec->pb;
    MOZ_DIAGNOSTIC_ASSERT(XRE_IsParentProcess() || XRE_IsSocketProcess(),
                          "TRR must be in parent or socket process");
  }

  // when following CNAMEs
  explicit TRR(AHostResolver* aResolver, nsHostRecord* aRec, nsCString& aHost,
               enum TrrType& aType, unsigned int aLoopCount, bool aPB)
      : mozilla::Runnable("TRR"),
        mHost(aHost),
        mRec(aRec),
        mHostResolver(aResolver),
        mType(aType),
        mPB(aPB),
        mCnameLoop(aLoopCount),
        mOriginSuffix(aRec ? aRec->originSuffix : ""_ns) {
    MOZ_DIAGNOSTIC_ASSERT(XRE_IsParentProcess() || XRE_IsSocketProcess(),
                          "TRR must be in parent or socket process");
  }

  // used on push
  explicit TRR(AHostResolver* aResolver, bool aPB)
      : mozilla::Runnable("TRR"),
        mHostResolver(aResolver),
        mType(TRRTYPE_A),
        mPB(aPB) {
    MOZ_DIAGNOSTIC_ASSERT(XRE_IsParentProcess() || XRE_IsSocketProcess(),
                          "TRR must be in parent or socket process");
  }

  // to verify a domain
  explicit TRR(AHostResolver* aResolver, nsACString& aHost, enum TrrType aType,
               const nsACString& aOriginSuffix, bool aPB)
      : mozilla::Runnable("TRR"),
        mHost(aHost),
        mRec(nullptr),
        mHostResolver(aResolver),
        mType(aType),
        mPB(aPB),
        mOriginSuffix(aOriginSuffix) {
    MOZ_DIAGNOSTIC_ASSERT(XRE_IsParentProcess() || XRE_IsSocketProcess(),
                          "TRR must be in parent or socket process");
  }

  NS_IMETHOD Run() override;
  void Cancel();
  enum TrrType Type() { return mType; }
  nsCString mHost;
  RefPtr<nsHostRecord> mRec;
  RefPtr<AHostResolver> mHostResolver;

 private:
  ~TRR() = default;
  nsresult SendHTTPRequest();
  nsresult DohEncode(nsCString& aBody, bool aDisableECS);
  nsresult PassQName(unsigned int& index);
  nsresult GetQname(nsACString& aQname, unsigned int& aIndex);
  nsresult DohDecode(nsCString& aHost);
  nsresult ReturnData(nsIChannel* aChannel);

  // FailData() must be called to signal that the asynch TRR resolve is
  // completed. For failed name resolves ("no such host"), the 'error' it
  // passses on in its argument must be NS_ERROR_UNKNOWN_HOST. Other errors
  // (if host was blacklisted, there as a bad content-type received, etc)
  // other error codes must be used. This distinction is important for the
  // subsequent logic to separate the error reasons.
  nsresult FailData(nsresult error);
  nsresult DohDecodeQuery(const nsCString& query, nsCString& host,
                          enum TrrType& type);
  nsresult ReceivePush(nsIHttpChannel* pushed, nsHostRecord* pushedRec);
  nsresult On200Response(nsIChannel* aChannel);
  nsresult FollowCname(nsIChannel* aChannel);

  bool UseDefaultServer();
  void SaveAdditionalRecords(
      const nsClassHashtable<nsCStringHashKey, DOHresp>& aRecords);

  nsresult CreateChannelHelper(nsIURI* aUri, nsIChannel** aResult);

  friend class TRRServiceChannel;
  static nsresult SetupTRRServiceChannelInternal(nsIHttpChannel* aChannel,
                                                 bool aUseGet);

  nsresult ParseSvcParam(unsigned int svcbIndex, uint16_t key,
                         SvcFieldValue& field, uint16_t length);

  void StoreIPHintAsDNSRecord(const struct SVCB& aSVCBRecord);

  nsCOMPtr<nsIChannel> mChannel;
  enum TrrType mType;
  unsigned char mResponse[kMaxSize]{};
  unsigned int mBodySize = 0;
  bool mFailed = false;
  bool mPB;
  DOHresp mDNS;
  nsCOMPtr<nsITimer> mTimeout;
  nsCString mCname;
  uint32_t mCnameLoop = kCnameChaseMax;  // loop detection counter
  bool mAllowRFC1918 = false;

  uint16_t mExtendedError = UINT16_MAX;
  uint32_t mTTL = UINT32_MAX;
  TypeRecordResultType mResult = mozilla::AsVariant(Nothing());

  nsHostRecord::TRRSkippedReason mTRRSkippedReason = nsHostRecord::TRR_UNSET;
  void RecordReason(nsHostRecord::TRRSkippedReason reason) {
    if (mTRRSkippedReason == nsHostRecord::TRR_UNSET) {
      mTRRSkippedReason = reason;
    }
  }

  // keep a copy of the originSuffix for the cases where mRec == nullptr */
  const nsCString mOriginSuffix;
};

}  // namespace net
}  // namespace mozilla

#endif  // include guard
