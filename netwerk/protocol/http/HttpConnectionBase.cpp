/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=4 sw=2 sts=2 et cin: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// HttpLog.h should generally be included first
#include "HttpLog.h"

// Log on level :5, instead of default :4.
#undef LOG
#define LOG(args) LOG5(args)
#undef LOG_ENABLED
#define LOG_ENABLED() LOG5_ENABLED()

#define TLS_EARLY_DATA_NOT_AVAILABLE 0
#define TLS_EARLY_DATA_AVAILABLE_BUT_NOT_USED 1
#define TLS_EARLY_DATA_AVAILABLE_AND_USED 2

#include "mozilla/glean/NetwerkProtocolHttpMetrics.h"
#include "HttpConnectionBase.h"
#include "nsHttpHandler.h"
#include "nsIClassOfService.h"
#include "nsIOService.h"
#include "nsISocketTransport.h"
#include "ConnectionEntry.h"
#include "xpcpublic.h"

namespace mozilla {
namespace net {

//-----------------------------------------------------------------------------
// nsHttpConnection <public>
//-----------------------------------------------------------------------------

HttpConnectionBase::HttpConnectionBase() {
  LOG(("Creating HttpConnectionBase @%p\n", this));
}

void HttpConnectionBase::BootstrapTimings(TimingStruct times) {
  mBootstrappedTimingsSet = true;
  mBootstrappedTimings = times;
}

void HttpConnectionBase::SetSecurityCallbacks(
    nsIInterfaceRequestor* aCallbacks) {
  MutexAutoLock lock(mCallbacksLock);
  // This is called both on and off the main thread. For JS-implemented
  // callbacks, we requires that the call happen on the main thread, but
  // for C++-implemented callbacks we don't care. Use a pointer holder with
  // strict checking disabled.
  mCallbacks = new nsMainThreadPtrHolder<nsIInterfaceRequestor>(
      "nsHttpConnection::mCallbacks", aCallbacks, false);
}

void HttpConnectionBase::SetTrafficCategory(HttpTrafficCategory aCategory) {
  MOZ_ASSERT(OnSocketThread(), "not on socket thread");
  if (aCategory == HttpTrafficCategory::eInvalid ||
      mTrafficCategory.Contains(aCategory)) {
    return;
  }
  (void)mTrafficCategory.AppendElement(aCategory);
}

void HttpConnectionBase::ChangeConnectionState(ConnectionState aState) {
  LOG(("HttpConnectionBase::ChangeConnectionState this=%p (%d->%d)", this,
       static_cast<uint32_t>(mConnectionState), static_cast<uint32_t>(aState)));

  // The state can't move backward.
  if (aState <= mConnectionState) {
    return;
  }

  mConnectionState = aState;
}

void HttpConnectionBase::RecordConnectionCloseTelemetry(nsresult aReason) {
  /**
   *
   * The returned telemetry key has the format:
   * "Version_EndToEndSSL_IsTrrServiceChannel_ExperienceState_ConnectionState"
   *
   * - Version: The HTTP version of the connection.
   * - EndToEndSSL: Indicates whether SSL encryption is end-to-end.
   * - IsTrrServiceChannel: Specifies if the connection is used to send TRR
   *    requests.
   * - ExperienceState: ConnectionExperienceState
   * - ConnectionState: The connection state before closing.
   */
  auto key = nsPrintfCString("%d_%d_%d_%d_%d", static_cast<uint32_t>(Version()),
                             mConnInfo->EndToEndSSL(),
                             mConnInfo->GetIsTrrServiceChannel(),
                             static_cast<uint32_t>(mExperienceState),
                             static_cast<uint32_t>(mConnectionState));
  SetCloseReason(ToCloseReason(aReason));
  LOG(("RecordConnectionCloseTelemetry key=%s reason=%d\n", key.get(),
       static_cast<uint32_t>(mCloseReason)));
  glean::http::connection_close_reason.Get(key).AccumulateSingleSample(
      static_cast<uint32_t>(mCloseReason));
}

void HttpConnectionBase::RecordConnectionAddressType() {
  if (mAddressTypeReported) {
    return;
  }

  NetAddr addr;
  GetPeerAddr(&addr);
  // We allow recording this metric in the test environment.
  if (addr.GetIpAddressSpace() != nsILoadInfo::IPAddressSpace::Public &&
      !xpc::AreNonLocalConnectionsDisabled()) {
    return;
  }

  if (mConnInfo->UsingProxy()) {
    return;
  }

  nsAutoCString key(HttpVersionToTelemetryLabel(Version()));

  if (addr.IsIPAddrV4()) {
    key.Append("_ipv4");
  } else {
    key.Append("_ipv6");
  }

  mozilla::glean::networking::connection_address_type.Get(key).Add(1);
  mAddressTypeReported = true;
}

void HttpConnectionBase::ChangeState(HttpConnectionState newState) {
  LOG(("HttpConnectionBase::ChangeState %d -> %d [this=%p]", mState, newState,
       this));
  mState = newState;
}

nsresult HttpConnectionBase::CheckTunnelIsNeeded(
    nsAHttpTransaction* aTransaction) {
  switch (mState) {
    case HttpConnectionState::UNINITIALIZED: {
      // This is is called first time. Check if we need a tunnel.
      if (!aTransaction->ConnectionInfo()->UsingConnect()) {
        ChangeState(HttpConnectionState::REQUEST);
        return NS_OK;
      }
      ChangeState(HttpConnectionState::SETTING_UP_TUNNEL);
    }
      [[fallthrough]];
    case HttpConnectionState::SETTING_UP_TUNNEL: {
      // When a HttpConnectionBase is in this state that means that an
      // authentication was needed and we are resending a CONNECT
      // request. This request will include authentication headers.
      nsresult rv = SetupProxyConnectStream();
      if (NS_FAILED(rv)) {
        ChangeState(HttpConnectionState::UNINITIALIZED);
      }
      return rv;
    }
    case HttpConnectionState::REQUEST:
      return NS_OK;
  }
  return NS_OK;
}

void HttpConnectionBase::SetOwner(ConnectionEntry* aEntry) {
  mOwnerEntry = aEntry;
}

ConnectionEntry* HttpConnectionBase::OwnerEntry() const {
  return mOwnerEntry.get();
}

}  // namespace net
}  // namespace mozilla
