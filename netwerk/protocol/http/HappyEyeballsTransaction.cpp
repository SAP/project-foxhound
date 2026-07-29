/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// HttpLog.h should generally be included first
#include "HttpLog.h"

#include "HappyEyeballsTransaction.h"

#include "ConnectionHandle.h"
#include "HttpConnectionBase.h"
#include "Http2Session.h"
#include "Http3Session.h"
#include "nsHttpConnection.h"
#include "nsHttpTransaction.h"
#include "nsITLSSocketControl.h"
#include "nsITransportSecurityInfo.h"
#include "nsQueryObject.h"

// Log on level :5, instead of default :4.
#undef LOG
#define LOG(args) LOG5(args)
#undef LOG_ENABLED
#define LOG_ENABLED() LOG5_ENABLED()

namespace mozilla::net {

HappyEyeballsTransaction::HappyEyeballsTransaction(
    nsHttpConnectionInfo* aConnInfo, nsIInterfaceRequestor* aCallbacks,
    uint32_t aCaps, uint64_t aBrowserId, StatusForwarder&& aStatusForwarder,
    ClientAuthForwarder&& aClientAuthRequestedForwarder,
    ClientAuthForwarder&& aClientAuthSelectedForwarder,
    ZeroRttHandle* aZeroRttHandle)
    : SpeculativeTransaction(aConnInfo, aCallbacks, aCaps,
                             /* aCallback */ nullptr,
                             /* reportActivity */ false),
      mStatusForwarder(std::move(aStatusForwarder)),
      mClientAuthRequestedForwarder(std::move(aClientAuthRequestedForwarder)),
      mClientAuthSelectedForwarder(std::move(aClientAuthSelectedForwarder)),
      mZeroRttHandle(aZeroRttHandle),
      mBrowserId(aBrowserId) {
  LOG1(("HappyEyeballsTransaction ctor %p handle=%p", this,
        mZeroRttHandle.get()));
}

void HappyEyeballsTransaction::OnClientAuthCertificateRequested() {
  LOG(("HappyEyeballsTransaction::OnClientAuthCertificateRequested %p", this));
  if (mClientAuthRequestedForwarder) {
    mClientAuthRequestedForwarder();
  }
}

void HappyEyeballsTransaction::OnClientAuthCertificateSelected() {
  LOG(("HappyEyeballsTransaction::OnClientAuthCertificateSelected %p", this));
  if (mClientAuthSelectedForwarder) {
    mClientAuthSelectedForwarder();
  }
}

HappyEyeballsTransaction::~HappyEyeballsTransaction() {
  LOG(("HappyEyeballsTransaction dtor %p", this));
}

void HappyEyeballsTransaction::Adopt(nsHttpTransaction* aRealTxn) {
  MOZ_ASSERT(aRealTxn, "Adopt with null real transaction");
  LOG(("HappyEyeballsTransaction::Adopt %p realTxn=%p entered0RTT=%d", this,
       aRealTxn, Entered0RTT()));
  Transition(State::Adopted, aRealTxn);
}

void HappyEyeballsTransaction::OnTransportStatus(nsITransport* aTransport,
                                                 nsresult aStatus,
                                                 int64_t aProgress) {
  // Let NullHttpTransaction collect the TCP/TLS timings into mTimings.
  NullHttpTransaction::OnTransportStatus(aTransport, aStatus, aProgress);

  // Forward to the owning HappyEyeballsConnectionAttempt for dedup +
  // propagation to the real transaction.
  if (mStatusForwarder) {
    mStatusForwarder(aTransport, aStatus, aProgress);
  }
}

nsresult HappyEyeballsTransaction::ReadSegments(nsAHttpSegmentReader* aReader,
                                                uint32_t aCount,
                                                uint32_t* aCountRead) {
  if (Entered0RTT()) {
    return mZeroRttHandle->ReadSegments(Request0RttStreamOffset(), aReader,
                                        aCount, aCountRead);
  }

  // If the connection's TLS handshake failed (see
  // nsHttpConnection::PostProcessNPNSetup), surface the captured NSS
  // error here.
  // We also forward the failed-handshake security info onto the real
  // transaction here.
  if (nsAHttpConnection* aHandle = Connection()) {
    RefPtr<HttpConnectionBase> base = aHandle->HttpConnection();
    if (RefPtr<nsHttpConnection> conn = do_QueryObject(base)) {
      if (nsresult tlsErr = conn->HandshakeError(); NS_FAILED(tlsErr)) {
        nsHttpTransaction* real =
            mZeroRttHandle ? mZeroRttHandle->RealTxn() : nullptr;
        nsCOMPtr<nsITLSSocketControl> tlsCtrl;
        conn->GetTLSSocketControl(getter_AddRefs(tlsCtrl));
        nsCOMPtr<nsITransportSecurityInfo> secInfo;
        if (tlsCtrl) {
          tlsCtrl->GetSecurityInfo(getter_AddRefs(secInfo));
        }
        if (real && secInfo) {
          real->SetSecurityInfo(secInfo);
        }
        LOG(
            ("HappyEyeballsTransaction::ReadSegments %p surfacing handshake "
             "error rv=%" PRIx32 " real=%p secInfo=%p",
             this, static_cast<uint32_t>(tlsErr), real, secInfo.get()));
        *aCountRead = 0;
        return tlsErr;
      }
    }
  }

  return SpeculativeTransaction::ReadSegments(aReader, aCount, aCountRead);
}

nsresult HappyEyeballsTransaction::WriteSegments(nsAHttpSegmentWriter* aWriter,
                                                 uint32_t aCount,
                                                 uint32_t* aCountWritten) {
  // OnSocketReadable calls WriteSegments after EnsureNPNComplete returns true,
  // which can happen after our Finish0RTT already closed the HET (e.g. the
  // PostProcessNPNSetup path has no early return on Finish0RTT failure).
  if (mState == State::Closed) {
    return NS_BASE_STREAM_CLOSED;
  }
  MOZ_ASSERT_UNREACHABLE("Should not be called");
  return NullHttpTransaction::WriteSegments(aWriter, aCount, aCountWritten);
}

void HappyEyeballsTransaction::Close(nsresult aReason) {
  LOG(
      ("HappyEyeballsTransaction::Close %p reason=%x mState=%d adopted=%d "
       "entered0RTT=%d",
       this, static_cast<uint32_t>(aReason), static_cast<int>(mState),
       IsAdopted(), Entered0RTT()));
  if (mState == State::Closed) {
    // Idempotent re-Close. SpeculativeTransaction::Close already
    // nulled mCloseCallback so a second pass is a no-op anyway.
    return;
  }
  // If a racer attempt started 0-RTT while this one did not, convert a
  // successful Close into a failure so Happy Eyeballs drops this attempt
  // from the race.
  if (NS_SUCCEEDED(aReason) && mZeroRttHandle &&
      mZeroRttHandle->ShouldDisqualify(this)) {
    LOG(("HappyEyeballsTransaction::Close %p disqualifying non-0-RTT attempt",
         this));
    aReason = NS_ERROR_FAILURE;
  }
  Transition(State::Closed, /*aRealTxn=*/nullptr, aReason);
}

void HappyEyeballsTransaction::Transition(State aNext,
                                          nsHttpTransaction* aRealTxn,
                                          nsresult aReason) {
  LOG(("HappyEyeballsTransaction::Transition %p mState=%d aNext=%d", this,
       static_cast<int>(mState), static_cast<int>(aNext)));
  switch (aNext) {
    case State::Racing:
      MOZ_ASSERT_UNREACHABLE(
          "Racing is the constructed state; cannot transition into it");
      break;

    case State::Adopted: {
      MOZ_ASSERT(mState == State::Racing, "Racing -> Adopted only");
      MOZ_ASSERT(aRealTxn, "Adopted entry requires real txn");
      mState = State::Adopted;
      mRealTxn = aRealTxn;

      // Hand the real txn the same conn HT is on and then call the
      // carrier's SwapTransaction so the carrier drives the real txn
      // directly (hash entry / stream.mTransaction for H2/H3, conn's
      // mTransaction for H1). Without the swap HT would linger on the
      // carrier past shutdown — HT keeps mZeroRttHandle alive, which
      // keeps the weak ref to HE alive, which kept the H3
      // QuicSocketControl alive in the leak we hit earlier.
      //
      // H1-specific: HT->Connection() is still the establisher's
      // ConnectionHandle — FinishInternal will Reset() it shortly
      // after this returns — so we mint a fresh ConnectionHandle
      // wrapping the live nsHttpConnection for the real txn. H2/H3
      // don't need that: AddStream(HT) already replaced HT's handle
      // with the session itself, and sessions aren't Reset() by the
      // establisher.
      nsAHttpConnection* ourHandle = Connection();
      MOZ_ASSERT(ourHandle);

      RefPtr<HttpConnectionBase> conn = ourHandle->HttpConnection();
      if (conn && conn->UsingHttp3()) {
        mRealTxn->SetConnection(ourHandle);
        if (RefPtr<Http3Session> h3 = do_QueryObject(ourHandle)) {
          h3->SwapTransaction(this, mRealTxn);
        }
      } else if (conn && conn->UsingSpdy()) {
        mRealTxn->SetConnection(ourHandle);
        if (RefPtr<Http2Session> h2 = do_QueryObject(ourHandle)) {
          h2->SwapTransaction(this, mRealTxn);
        }
      } else if (conn) {
        RefPtr<ConnectionHandle> fresh = new ConnectionHandle(conn);
        mRealTxn->SetConnection(fresh);
        if (RefPtr<nsHttpConnection> h1 = do_QueryObject(conn)) {
          h1->SwapTransaction(this, mRealTxn);
        }
      }

      SetConnection(nullptr);
      // The HET no longer participates in 0-RTT coordination after adoption.
      // Break the RefPtr cycle between ZeroRttHandle::mWinner (RefPtr<HET>)
      // and HET::mZeroRttHandle (RefPtr<ZeroRttHandle>): Cleanup() drops
      // mWinner; clearing mZeroRttHandle here drops the HET's ref back to the
      // handle.
      mZeroRttHandle = nullptr;
      break;
    }

    case State::Closed:
      MOZ_ASSERT(mState == State::Racing || mState == State::Adopted,
                 "Closed entry from Racing or Adopted only");
      mState = State::Closed;
      SpeculativeTransaction::Close(aReason);
      break;
  }
}

nsHttpTransaction* HappyEyeballsTransaction::QueryHttpTransaction() {
  return mRealTxn;
}

bool HappyEyeballsTransaction::AllowedToConnectToIpAddressSpace(
    nsILoadInfo::IPAddressSpace aTargetIpAddressSpace) {
  // Resolve the real transaction this race is running on behalf of.
  // Post-Adopt we already have it; pre-Adopt go through the shared
  // ZeroRttHandle, which keeps a weak ref to the owning HET and the
  // txn currently claimed onto it.
  nsHttpTransaction* real = mRealTxn;
  if (!real && mZeroRttHandle) {
    real = mZeroRttHandle->RealTxn();
  }
  if (!real) {
    // No real txn has been claimed onto this race yet (pure
    // speculative). Allow — the deferred check will re-run when the
    // real txn is eventually dispatched.
    return true;
  }
  return real->AllowedToConnectToIpAddressSpace(aTargetIpAddressSpace);
}

nsHttpRequestHead* HappyEyeballsTransaction::RequestHead() {
  if (mZeroRttHandle) {
    if (nsHttpTransaction* real = mZeroRttHandle->RealTxn()) {
      return real->RequestHead();
    }
  }
  return SpeculativeTransaction::RequestHead();
}

void HappyEyeballsTransaction::MaybeRemoveSSLTokens() {
  nsAHttpConnection* handle = Connection();
  if (!handle) {
    return;
  }
  RefPtr<HttpConnectionBase> base = handle->HttpConnection();
  RefPtr<nsHttpConnection> conn = do_QueryObject(base);
  if (!conn) {
    return;
  }
  nsCOMPtr<nsITLSSocketControl> tlsCtrl;
  conn->GetTLSSocketControl(getter_AddRefs(tlsCtrl));
  nsCOMPtr<nsITransportSecurityInfo> secInfo;
  if (tlsCtrl) {
    tlsCtrl->GetSecurityInfo(getter_AddRefs(secInfo));
  }
  if (mZeroRttHandle) {
    if (nsHttpTransaction* realTxn = mZeroRttHandle->RealTxn()) {
      realTxn->RemoveSSLTokens(secInfo);
    }
  }
}

nsresult HappyEyeballsTransaction::FetchHTTPSRR() {
  MOZ_ASSERT_UNREACHABLE("Should not be called");
  return NS_ERROR_NOT_IMPLEMENTED;
}

nsresult HappyEyeballsTransaction::OnHTTPSRRAvailable(
    nsIDNSHTTPSSVCRecord* aHTTPSSVCRecord,
    nsISVCBRecord* aHighestPriorityRecord, const nsACString& aCname) {
  MOZ_ASSERT_UNREACHABLE("Should not be called");
  return NS_ERROR_NOT_IMPLEMENTED;
}

}  // namespace mozilla::net
