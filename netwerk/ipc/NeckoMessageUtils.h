/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_net_NeckoMessageUtils_h
#define mozilla_net_NeckoMessageUtils_h

#include "mozilla/DebugOnly.h"

#include "ipc/EnumSerializer.h"
#include "ipc/IPCMessageUtils.h"
#include "ipc/IPCMessageUtilsSpecializations.h"
#include "mozilla/net/ClassOfService.h"
#include "mozilla/net/DNS.h"
#include "nsExceptionHandler.h"
#include "nsIDNSService.h"
#include "nsIHttpChannel.h"
#include "nsITRRSkipReason.h"
#include "nsPrintfCString.h"
#include "nsString.h"
#include "prio.h"

namespace IPC {

// nsIPermissionManager utilities

struct Permission {
  nsCString origin, type;
  uint32_t capability, expireType;
  int64_t expireTime;

  Permission() : capability(0), expireType(0), expireTime(0) {}

  Permission(const nsCString& aOrigin, const nsACString& aType,
             const uint32_t aCapability, const uint32_t aExpireType,
             const int64_t aExpireTime)
      : origin(aOrigin),
        type(aType),
        capability(aCapability),
        expireType(aExpireType),
        expireTime(aExpireTime) {}

  bool operator==(const Permission& aOther) const {
    return aOther.origin == origin && aOther.type == type &&
           aOther.capability == capability && aOther.expireType == expireType &&
           aOther.expireTime == expireTime;
  }
};

template <>
struct ParamTraits<Permission> {
  static void Write(MessageWriter* aWriter, const Permission& aParam) {
    WriteParam(aWriter, aParam.origin);
    WriteParam(aWriter, aParam.type);
    WriteParam(aWriter, aParam.capability);
    WriteParam(aWriter, aParam.expireType);
    WriteParam(aWriter, aParam.expireTime);
  }

  static bool Read(MessageReader* aReader, Permission* aResult) {
    return ReadParam(aReader, &aResult->origin) &&
           ReadParam(aReader, &aResult->type) &&
           ReadParam(aReader, &aResult->capability) &&
           ReadParam(aReader, &aResult->expireType) &&
           ReadParam(aReader, &aResult->expireTime);
  }
};

template <>
struct ParamTraits<mozilla::net::NetAddr> {
  static void Write(MessageWriter* aWriter,
                    const mozilla::net::NetAddr& aParam) {
    WriteParam(aWriter, aParam.raw.family);
    if (aParam.raw.family == AF_UNSPEC) {
      aWriter->WriteBytes(aParam.raw.data, sizeof(aParam.raw.data));
    } else if (aParam.raw.family == AF_INET) {
      WriteParam(aWriter, aParam.inet.port);
      WriteParam(aWriter, aParam.inet.ip);
    } else if (aParam.raw.family == AF_INET6) {
      WriteParam(aWriter, aParam.inet6.port);
      WriteParam(aWriter, aParam.inet6.flowinfo);
      WriteParam(aWriter, aParam.inet6.ip.u64[0]);
      WriteParam(aWriter, aParam.inet6.ip.u64[1]);
      WriteParam(aWriter, aParam.inet6.scope_id);
#if defined(XP_UNIX)
    } else if (aParam.raw.family == AF_LOCAL) {
      // Train's already off the rails:  let's get a stack trace at least...
      MOZ_CRASH(
          "Error: please post stack trace to "
          "https://bugzilla.mozilla.org/show_bug.cgi?id=661158");
      aWriter->WriteBytes(aParam.local.path, sizeof(aParam.local.path));
#endif
    } else {
      if (XRE_IsParentProcess()) {
        CrashReporter::RecordAnnotationU32(
            CrashReporter::Annotation::UnknownNetAddrSocketFamily,
            aParam.raw.family);
      }

      MOZ_CRASH("Unknown socket family");
    }
  }

  static bool Read(MessageReader* aReader, mozilla::net::NetAddr* aResult) {
    if (!ReadParam(aReader, &aResult->raw.family)) return false;

    if (aResult->raw.family == AF_UNSPEC) {
      return aReader->ReadBytesInto(&aResult->raw.data,
                                    sizeof(aResult->raw.data));
    } else if (aResult->raw.family == AF_INET) {
      return ReadParam(aReader, &aResult->inet.port) &&
             ReadParam(aReader, &aResult->inet.ip);
    } else if (aResult->raw.family == AF_INET6) {
      return ReadParam(aReader, &aResult->inet6.port) &&
             ReadParam(aReader, &aResult->inet6.flowinfo) &&
             ReadParam(aReader, &aResult->inet6.ip.u64[0]) &&
             ReadParam(aReader, &aResult->inet6.ip.u64[1]) &&
             ReadParam(aReader, &aResult->inet6.scope_id);
#if defined(XP_UNIX)
    } else if (aResult->raw.family == AF_LOCAL) {
      return aReader->ReadBytesInto(&aResult->local.path,
                                    sizeof(aResult->local.path));
#endif
    }

    /* We've been tricked by some socket family we don't know about! */
    return false;
  }
};

template <>
struct ParamTraits<nsIRequest::TRRMode>
    : public ContiguousEnumSerializerInclusive<nsIRequest::TRRMode,
                                               nsIRequest::TRR_DEFAULT_MODE,
                                               nsIRequest::TRR_ONLY_MODE> {};

template <>
struct ParamTraits<nsITRRSkipReason::value>
    : public ContiguousEnumSerializerInclusive<
          nsITRRSkipReason::value, nsITRRSkipReason::value::TRR_UNSET,
          nsITRRSkipReason::value::eLAST_VALUE> {};

template <>
struct ParamTraits<nsIDNSService::DNSFlags>
    : public BitFlagsEnumSerializer<
          nsIDNSService::DNSFlags, nsIDNSService::DNSFlags::ALL_DNSFLAGS_BITS> {
};

template <>
struct ParamTraits<nsIDNSService::ResolverMode>
    : public ContiguousEnumSerializerInclusive<
          nsIDNSService::ResolverMode,
          nsIDNSService::ResolverMode::MODE_NATIVEONLY,
          nsIDNSService::ResolverMode::MODE_TRROFF> {};

template <>
struct ParamTraits<nsIClassOfService::FetchPriority>
    : public ContiguousEnumSerializerInclusive<
          nsIClassOfService::FetchPriority,
          nsIClassOfService::FETCHPRIORITY_UNSET,
          nsIClassOfService::FETCHPRIORITY_HIGH> {};

template <>
struct ParamTraits<mozilla::net::ClassOfService> {
  typedef mozilla::net::ClassOfService paramType;

  static void Write(MessageWriter* aWriter, const paramType& aParam) {
    WriteParam(aWriter, aParam.mClassFlags);
    WriteParam(aWriter, aParam.mIncremental);
    WriteParam(aWriter, aParam.mFetchPriority);
  }

  static bool Read(MessageReader* aReader, paramType* aResult) {
    if (!ReadParam(aReader, &aResult->mClassFlags) ||
        !ReadParam(aReader, &aResult->mIncremental) ||
        !ReadParam(aReader, &aResult->mFetchPriority))
      return false;

    return true;
  }
};

}  // namespace IPC

#endif  // mozilla_net_NeckoMessageUtils_h
