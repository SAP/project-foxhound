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

#include "ConnectionAttemptPool.h"
#include "ConnectionEntry.h"
#include "DnsAndConnectSocket.h"
#include "HappyEyeballsConnectionAttempt.h"
#include "nsHttpHandler.h"
#include "nsHttpConnectionMgr.h"

namespace mozilla::net {

ConnectionAttemptPool::ConnectionAttemptPool(ConnectionEntry* aEntry)
    : mEntry(aEntry) {
  LOG(("ConnectionAttemptPool ctor %p", this));
}

ConnectionAttemptPool::~ConnectionAttemptPool() {
  LOG(("ConnectionAttemptPool dtor %p", this));
  MOZ_DIAGNOSTIC_ASSERT(mAttempts.IsEmpty());
}

nsresult ConnectionAttemptPool::StartConnectionEstablishment(
    ConnectionEntry* entry, nsAHttpTransaction* trans, uint32_t caps,
    bool speculative, bool urgentStart, bool allow1918,
    PendingTransactionInfo* pendingTransInfo) {
  MOZ_ASSERT(OnSocketThread(), "not on socket thread");
  MOZ_ASSERT((speculative && !pendingTransInfo) ||
             (!speculative && pendingTransInfo));

  RefPtr<ConnectionAttempt> connAttempt;
  nsHttpConnectionInfo* ci = trans->ConnectionInfo();
  if (ci->GetHappyEyeballsEnabled()) {
    connAttempt = new HappyEyeballsConnectionAttempt(ci, trans, caps,
                                                     speculative, urgentStart);
  } else {
    connAttempt = new DnsAndConnectSocket(entry->mConnInfo, trans, caps,
                                          speculative, urgentStart);
  }

  if (speculative) {
    connAttempt->SetAllow1918(allow1918);
  }

  nsresult rv = connAttempt->Init(entry);
  if (NS_FAILED(rv)) {
    connAttempt->Abandon();
    return rv;
  }

  InsertIntoConnectionAttempts(connAttempt);

  if (pendingTransInfo) {
    bool claimed = connAttempt->Claim();
    if (!claimed) {
      // We should always be able to claim this.
      MOZ_ASSERT(false, "Failed to claim a connAttempt");
      return NS_ERROR_UNEXPECTED;
    }
    pendingTransInfo->RememberConnectionAttempt(connAttempt);
  }
  return NS_OK;
}

void ConnectionAttemptPool::InsertIntoConnectionAttempts(
    ConnectionAttempt* sock) {
  mAttempts.AppendElement(sock);
  ++mUnconnectedCount;
  gHttpHandler->ConnMgr()->IncreaseNumDnsAndConnectSockets();
}

void ConnectionAttemptPool::RemoveConnectionAttempt(ConnectionAttempt* sock,
                                                    bool abandon) {
  RefPtr<ConnectionAttempt> keepAlive(sock);
  if (abandon) {
    sock->Abandon();
  }

  if (mAttempts.RemoveElement(sock)) {
    if (!sock->HasConnected()) {
      MOZ_ASSERT(mUnconnectedCount > 0);
      --mUnconnectedCount;
    }
    gHttpHandler->ConnMgr()->DecreaseNumDnsAndConnectSockets();
  }

  if (!UnconnectedConnectionAttempts()) {
    // perhaps this reverted RestrictConnections()
    // use the PostEvent version of processpendingq to avoid
    // altering the pending q vector from an arbitrary stack
    RefPtr<ConnectionEntry> entry(mEntry);
    if (entry) {
      gHttpHandler->ConnMgr()->ProcessPendingQForEntry(entry);
    }
  }
}

uint32_t ConnectionAttemptPool::UnconnectedConnectionAttempts() const {
#ifdef DEBUG
  uint32_t computed = 0;
  for (uint32_t i = 0; i < mAttempts.Length(); ++i) {
    if (!mAttempts[i]->HasConnected()) {
      ++computed;
    }
  }
  MOZ_ASSERT(mUnconnectedCount == computed);
#endif
  return mUnconnectedCount;
}

void ConnectionAttemptPool::OnConnectionAttemptConnected() {
  MOZ_ASSERT(mUnconnectedCount > 0);
  --mUnconnectedCount;
}

void ConnectionAttemptPool::CloseAllConnectionAttempts() {
  for (const auto& sock : mAttempts) {
    sock->Abandon();
    gHttpHandler->ConnMgr()->DecreaseNumDnsAndConnectSockets();
  }

  mAttempts.Clear();
  mUnconnectedCount = 0;

  RefPtr<ConnectionEntry> entry(mEntry);
  if (entry) {
    gHttpHandler->ConnMgr()->ProcessPendingQForEntry(entry);
  }
}

bool ConnectionAttemptPool::FindConnToClaim(
    PendingTransactionInfo* pendingTransInfo) {
  nsHttpTransaction* trans = pendingTransInfo->Transaction();
  for (const auto& sock : mAttempts) {
    if (sock->AcceptsTransaction(trans) && sock->Claim(trans)) {
      pendingTransInfo->RememberConnectionAttempt(sock);
      // We've found a speculative connection or a connection that
      // is free to be used in the mAttempts list.
      // A free to be used connection is a connection that was
      // open for a concrete transaction, but that trunsaction
      // ended up using another connection.
      LOG(
          ("ConnectionAttemptPool::FindConnToClaim [ci = %s]\n"
           "Found a speculative or a free-to-use ConnectionAttempt\n",
           trans->ConnectionInfo()->HashKey().get()));

      // return OK because we have essentially opened a new connection
      // by converting a speculative connection to general use
      return true;
    }
  }
  return false;
}

void ConnectionAttemptPool::TimeoutTick() {
  if (mAttempts.IsEmpty()) {
    return;
  }

  TimeStamp currentTime = TimeStamp::Now();
  double maxConnectTime_ms = gHttpHandler->ConnectTimeout();

  // Iterate a snapshot: OnTimeout / RemoveConnectionAttempt below can
  // mutate mAttempts (directly or via reentrant Close paths), which
  // would invalidate iterators over the live array.
  nsTArray<RefPtr<ConnectionAttempt>> snapshot(mAttempts.Clone());
  for (const auto& sock : snapshot) {
    double delta = sock->Duration(currentTime);
    // If the socket has timed out, close it so the waiting
    // transaction will get the proper signal.
    if (delta > maxConnectTime_ms) {
      LOG(("Force timeout of ConnectionAttempt to %p after %.2fms.\n",
           sock.get(), delta));
      sock->OnTimeout();
    }

    // If this ConnectionAttempt hangs around for 5 seconds after we've
    // closed() it then just abandon the socket.
    if (delta > maxConnectTime_ms + 5000) {
      LOG(("Abandon ConnectionAttempt to %p after %.2fms.\n", sock.get(),
           delta));
      RemoveConnectionAttempt(sock, true);
    }
  }
}

void ConnectionAttemptPool::PrintDiagnostics(nsCString& log) {
  if (mAttempts.IsEmpty()) {
    return;
  }

  uint32_t count = 0;
  for (const auto& sock : Reversed(mAttempts)) {
    log.AppendPrintf("   :: Half Open #%u\n", count);
    sock->PrintDiagnostics(log);
    count++;
  }
}

void ConnectionAttemptPool::GetConnectionData(HttpRetParams& data) {
  for (uint32_t i = 0; i < mAttempts.Length(); i++) {
    DnsAndConnectSockets dnsAndSock{};
    dnsAndSock.speculative = mAttempts[i]->IsSpeculative();
    data.dnsAndSocks.AppendElement(dnsAndSock);
  }
}

uint32_t ConnectionAttemptPool::UnconnectedUDPConnsLength() const {
  uint32_t len = 0;
  for (const auto& sock : mAttempts) {
    len += sock->UnconnectedUDPConnsLength();
  }
  return len;
}

}  // namespace mozilla::net
