/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DNSByTypeRecord_h_
#define DNSByTypeRecord_h_

#include "mozilla/net/HTTPSSVC.h"
#include "ipc/IPCMessageUtils.h"
#include "mozilla/net/NeckoMessageUtils.h"

namespace mozilla {
namespace net {

// The types of nsIDNSByTypeRecord: Nothing, TXT, HTTPSSVC
using TypeRecordEmpty = Nothing;
using TypeRecordTxt = CopyableTArray<nsCString>;
using TypeRecordHTTPSSVC = CopyableTArray<SVCB>;

// This variant reflects the multiple types of data a nsIDNSByTypeRecord
// can hold.
using TypeRecordResultType =
    Variant<TypeRecordEmpty, TypeRecordTxt, TypeRecordHTTPSSVC>;

// TypeRecordResultType is a variant, but since it doesn't have a default
// constructor it's not a type we can pass directly over IPC.
struct IPCTypeRecord {
  bool operator==(const IPCTypeRecord& aOther) const {
    return mData == aOther.mData;
  }
  explicit IPCTypeRecord() : mData(Nothing{}) {}
  TypeRecordResultType mData;
  uint32_t mTTL = 0;
  bool mIsTRR = false;
};

}  // namespace net
}  // namespace mozilla

namespace IPC {

template <>
struct ParamTraits<mozilla::net::IPCTypeRecord> {
  typedef mozilla::net::IPCTypeRecord paramType;
  static void Write(MessageWriter* aWriter, const paramType& aParam) {
    WriteParam(aWriter, aParam.mData);
    WriteParam(aWriter, aParam.mTTL);
    WriteParam(aWriter, aParam.mIsTRR);
  }

  static bool Read(MessageReader* aReader, paramType* aResult) {
    return ReadParam(aReader, &aResult->mData) &&
           ReadParam(aReader, &aResult->mTTL) &&
           ReadParam(aReader, &aResult->mIsTRR);
  }
};

template <>
struct ParamTraits<mozilla::Nothing> {
  typedef mozilla::Nothing paramType;
  static void Write(MessageWriter* aWriter, const paramType& aParam) {
    bool isSome = false;
    WriteParam(aWriter, isSome);
  }

  static bool Read(MessageReader* aReader, paramType* aResult) {
    bool isSome;
    if (!ReadParam(aReader, &isSome)) {
      return false;
    }
    *aResult = mozilla::Nothing();
    return true;
  }
};

template <>
struct ParamTraits<mozilla::net::SVCB> {
  typedef mozilla::net::SVCB paramType;
  static void Write(MessageWriter* aWriter, const paramType& aParam) {
    WriteParam(aWriter, aParam.mSvcFieldPriority);
    WriteParam(aWriter, aParam.mSvcDomainName);
    WriteParam(aWriter, aParam.mEchConfig);
    WriteParam(aWriter, aParam.mODoHConfig);
    WriteParam(aWriter, aParam.mHasIPHints);
    WriteParam(aWriter, aParam.mHasEchConfig);
    WriteParam(aWriter, aParam.mSvcFieldValue);
  }

  static bool Read(MessageReader* aReader, paramType* aResult) {
    return ReadParam(aReader, &aResult->mSvcFieldPriority) &&
           ReadParam(aReader, &aResult->mSvcDomainName) &&
           ReadParam(aReader, &aResult->mEchConfig) &&
           ReadParam(aReader, &aResult->mODoHConfig) &&
           ReadParam(aReader, &aResult->mHasIPHints) &&
           ReadParam(aReader, &aResult->mHasEchConfig) &&
           ReadParam(aReader, &aResult->mSvcFieldValue);
  }
};

template <>
struct ParamTraits<mozilla::net::SvcParamAlpn> {
  typedef mozilla::net::SvcParamAlpn paramType;
  static void Write(MessageWriter* aWriter, const paramType& aParam) {
    WriteParam(aWriter, aParam.mValue);
  }

  static bool Read(MessageReader* aReader, paramType* aResult) {
    return ReadParam(aReader, &aResult->mValue);
  }
};

template <>
struct ParamTraits<mozilla::net::SvcParamNoDefaultAlpn> {
  typedef mozilla::net::SvcParamNoDefaultAlpn paramType;
  static void Write(MessageWriter* aWriter, const paramType& aParam) {}

  static bool Read(MessageReader* aReader, paramType* aResult) { return true; }
};

template <>
struct ParamTraits<mozilla::net::SvcParamPort> {
  typedef mozilla::net::SvcParamPort paramType;
  static void Write(MessageWriter* aWriter, const paramType& aParam) {
    WriteParam(aWriter, aParam.mValue);
  }

  static bool Read(MessageReader* aReader, paramType* aResult) {
    return ReadParam(aReader, &aResult->mValue);
  }
};

template <>
struct ParamTraits<mozilla::net::SvcParamIpv4Hint> {
  typedef mozilla::net::SvcParamIpv4Hint paramType;
  static void Write(MessageWriter* aWriter, const paramType& aParam) {
    WriteParam(aWriter, aParam.mValue);
  }

  static bool Read(MessageReader* aReader, paramType* aResult) {
    return ReadParam(aReader, &aResult->mValue);
  }
};

template <>
struct ParamTraits<mozilla::net::SvcParamEchConfig> {
  typedef mozilla::net::SvcParamEchConfig paramType;
  static void Write(MessageWriter* aWriter, const paramType& aParam) {
    WriteParam(aWriter, aParam.mValue);
  }

  static bool Read(MessageReader* aReader, paramType* aResult) {
    return ReadParam(aReader, &aResult->mValue);
  }
};

template <>
struct ParamTraits<mozilla::net::SvcParamIpv6Hint> {
  typedef mozilla::net::SvcParamIpv6Hint paramType;
  static void Write(MessageWriter* aWriter, const paramType& aParam) {
    WriteParam(aWriter, aParam.mValue);
  }

  static bool Read(MessageReader* aReader, paramType* aResult) {
    return ReadParam(aReader, &aResult->mValue);
  }
};

template <>
struct ParamTraits<mozilla::net::SvcParamODoHConfig> {
  typedef mozilla::net::SvcParamODoHConfig paramType;
  static void Write(MessageWriter* aWriter, const paramType& aParam) {
    WriteParam(aWriter, aParam.mValue);
  }

  static bool Read(MessageReader* aReader, paramType* aResult) {
    return ReadParam(aReader, &aResult->mValue);
  }
};

template <>
struct ParamTraits<mozilla::net::SvcFieldValue> {
  typedef mozilla::net::SvcFieldValue paramType;
  static void Write(MessageWriter* aWriter, const paramType& aParam) {
    WriteParam(aWriter, aParam.mValue);
  }

  static bool Read(MessageReader* aReader, paramType* aResult) {
    return ReadParam(aReader, &aResult->mValue);
  }
};

}  // namespace IPC

#endif  // DNSByTypeRecord_h_
