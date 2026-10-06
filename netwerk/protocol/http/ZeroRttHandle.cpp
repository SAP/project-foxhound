/* vim:set ts=4 sw=2 sts=2 et cin: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// HttpLog.h should generally be included first
#include "HttpLog.h"

#include "ZeroRttHandle.h"

#include "HappyEyeballsConnectionAttempt.h"
#include "HappyEyeballsTransaction.h"
#include "HttpConnectionBase.h"
#include "mozilla/StaticPrefs_network.h"
#include "nsAHttpTransaction.h"
#include "nsHttpRequestHead.h"
#include "nsHttpTransaction.h"
#include "nsIInputStream.h"
#include "nsISeekableStream.h"
#include "nsSocketTransportService2.h"
#include "nsWeakReference.h"

// Log on level :5, instead of default :4.
#undef LOG
#define LOG(args) LOG5(args)
#undef LOG_ENABLED
#define LOG_ENABLED() LOG5_ENABLED()

namespace mozilla::net {

ZeroRttHandle::ZeroRttHandle(HappyEyeballsConnectionAttempt* aHet)
    : mHet(aHet ? do_GetWeakReference(
                      static_cast<nsSupportsWeakReference*>(aHet))
                : nullptr) {}

static bool IsUsableRealTxn(nsHttpTransaction* aRealTxn) {
  return aRealTxn && !aRealTxn->Closed();
}

// Resolve the real nsHttpTransaction through HET. HET's mTransaction
// may have changed from a speculative NullTransaction to the real txn
// via Claim() between the time we were constructed and now.
static nsHttpTransaction* ResolveRealTxn(const nsWeakPtr& aHet) {
  if (!aHet) {
    return nullptr;
  }
  RefPtr<HappyEyeballsConnectionAttempt> het = do_QueryReferent(aHet);
  nsHttpTransaction* realTxn = het ? het->RealHttpTransaction() : nullptr;
  return IsUsableRealTxn(realTxn) ? realTxn : nullptr;
}

bool ZeroRttHandle::Do0RTT(HappyEyeballsTransaction* aCaller,
                           bool aCanSendEarlyData) {
  LOG(("ZeroRttHandle::Do0RTT %p caller=%p", this, aCaller));

  nsHttpTransaction* realTxn = ResolveRealTxn(mHet);
  if (!realTxn) {
    return false;
  }

  if (!aCanSendEarlyData) {
    (void)realTxn->Do0RTT(false);
    return false;
  }

  if (aCaller->Request0RttStreamOffset().isSome()) {
    // Already opted in — TlsHandshaker asked twice. Stay consistent.
    return true;
  }
  if (mWinner) {
    // Race already has a winner — don't start new 0-RTT now.
    return false;
  }
  // 0-RTT is only safe for idempotent methods.
  nsHttpRequestHead* head = realTxn->RequestHead();
  if (!head || !head->IsSafeMethod()) {
    return false;
  }

  // On the first Do0RTT acceptance, verify the real transaction is
  // still in the pending queue. If it has already been dispatched onto
  // an idle connection (removed=0), we must not enter 0-RTT: the
  // early-data bytes would go to a connection that has no live real
  // txn to adopt, producing a duplicate request on the wire and
  // leaving the HE race with nothing to adopt at Finish0RTT time.
  if (!mAny0RttStarted) {
    RefPtr<HappyEyeballsConnectionAttempt> attempt = do_QueryReferent(mHet);
    if (!attempt || !attempt->LockInRealTransactionFromPendingQueue()) {
      LOG(
          ("ZeroRttHandle::Do0RTT %p caller=%p declining — real txn "
           "already dispatched elsewhere",
           this, aCaller));
      return false;
    }

    MOZ_ASSERT(mState == State::Open,
               "Do0RTT locking transaction from queue on a non-Open handle");
  }

  LOG(("ZeroRttHandle::Do0RTT %p caller=%p accepted, offset=0", this, aCaller));
  aCaller->Request0RttStreamOffset() = Some(uint64_t(0));
  // Do NOT mutate the real transaction's flags here. The contract is
  // that real_txn is untouched until the winning HT is adopted (see
  // HappyEyeballsTransaction::Adopt) — only then do we flip
  // mEarlyDataWasAvailable so ShouldRestartOn0RttError can later
  // pick up the 0-RTT-was-attempted signal.
  mAny0RttStarted = true;
  return true;
}

// Adapter: nsIInputStream::ReadSegments invokes this with each chunk
// and we forward it to the connection's reader.
static nsresult ZeroRttForwardReadSegment(nsIInputStream* /*aStream*/,
                                          void* aClosure, const char* aBuf,
                                          uint32_t /*aOffset*/, uint32_t aCount,
                                          uint32_t* aCountRead) {
  auto* reader = static_cast<nsAHttpSegmentReader*>(aClosure);
  return reader->OnReadSegment(aBuf, aCount, aCountRead);
}

nsresult ZeroRttHandle::ReadSegments(Maybe<uint64_t>& aOffset,
                                     nsAHttpSegmentReader* aReader,
                                     uint32_t aCount, uint32_t* aCountRead) {
  *aCountRead = 0;

  if (aOffset.isNothing()) {
    return NS_BASE_STREAM_CLOSED;
  }
  nsHttpTransaction* realTxn = ResolveRealTxn(mHet);
  if (!realTxn) {
    return NS_BASE_STREAM_CLOSED;
  }
  if (mWinner) {
    // Race is decided. The real transaction will read from the stream
    // once dispatched onto the winning conn; further HT reads here
    // would move the position and starve the real txn's read (busy
    // loop in Http2StreamBase when it gets 0 bytes in GENERATING_HEADERS).
    return NS_BASE_STREAM_CLOSED;
  }
  nsCOMPtr<nsIInputStream> stream = realTxn->RequestStream();
  if (!stream) {
    return NS_BASE_STREAM_CLOSED;
  }

  // Seek to this attempt's offset so concurrent racer handles don't
  // step on each other.
  nsCOMPtr<nsISeekableStream> seekable = do_QueryInterface(stream);
  if (!seekable) {
    // Stream isn't seekable — can't safely multiplex. Bail out of
    // 0-RTT for this attempt; on Close the disqualification check
    // will still make it lose gracefully.
    LOG(("ZeroRttHandle::ReadSegments %p stream not seekable", this));
    return NS_BASE_STREAM_CLOSED;
  }
  nsresult rv = seekable->Seek(nsISeekableStream::NS_SEEK_SET,
                               static_cast<int64_t>(aOffset.value()));
  if (NS_FAILED(rv)) {
    LOG(("ZeroRttHandle::ReadSegments %p seek to %" PRIu64 " failed rv=%x",
         this, aOffset.value(), static_cast<uint32_t>(rv)));
    return rv;
  }

  rv = stream->ReadSegments(ZeroRttForwardReadSegment, aReader, aCount,
                            aCountRead);
  if (NS_SUCCEEDED(rv) && *aCountRead > 0) {
    aOffset = Some(aOffset.value() + *aCountRead);
    LOG(("ZeroRttHandle::ReadSegments %p read=%u newOffset=%" PRIu64, this,
         *aCountRead, aOffset.value()));
    // Mirror the EARLY_NONE → EARLY_SENT transition that the non-HE
    // nsHttpTransaction::ReadSegments does when bytes go out as
    // early data. Finish0RTT (via FinishAdopted0RTT) only promotes
    // to EARLY_ACCEPTED if we've been through EARLY_SENT first.
    realTxn->MarkEarlyDataSent();
  }
  return rv;
}

nsresult ZeroRttHandle::Finish0RTT(HappyEyeballsTransaction* aCaller,
                                   bool aRestart, bool aAlpnChanged) {
  LOG(("ZeroRttHandle::Finish0RTT %p caller=%p restart=%d alpnChanged=%d", this,
       aCaller, aRestart, aAlpnChanged));

  if (aCaller->Request0RttStreamOffset().isNothing()) {
    MOZ_ASSERT(false, "Caller wasn't in the 0-RTT flow");
    return NS_OK;
  }

  if (mWinner) {
    // Late Finish0RTT on a loser. Leave stream alone; loser's conn is
    // being cancelled.
    LOG(("ZeroRttHandle::Finish0RTT %p winner already declared; ignoring",
         this));
    return NS_OK;
  }

  // At this point we are about to declare a winner.  The handle must still be
  // Open.
  MOZ_ASSERT(mState == State::Open,
             "Finish0RTT declaring winner on a non-Open handle");

  // H1/H2, alpnChanged=1: early data was sent for a protocol the server no
  //   longer speaks, so the request must restart.  For H2, Http2Session also
  //   calls Close(NS_ERROR_NET_RESET) immediately after, killing the
  //   connection; declaring the HE winner at this point would insert a dead
  //   connection into mActiveConns (mReportedSpdy=false, so npnPending=true in
  //   RestrictConnections(), blocking all future connections).
  //   Action: close the HET so HE treats this as a failure, not a winner.
  //
  // H1/H2, alpnChanged=0: early data was rejected but the connection is still
  //   usable (H1 retries the request; H2 rewinds its output queue).
  //   Action: fall through to InvokeCallback(NS_OK) so HE declares the winner
  //   and the session retries the request on the same connection.
  //
  // H3, any: the QUIC connection survives a 0-RTT restart.
  //   Action: fall through so HE declares the winner and retries normally.
  if (aRestart && aAlpnChanged) {
    bool isH3 = false;
    if (nsAHttpConnection* conn = aCaller->Connection()) {
      if (RefPtr<HttpConnectionBase> base = conn->HttpConnection()) {
        isH3 = base->UsingHttp3();
      }
    }
    if (!isH3) {
      nsHttpTransaction* realTxn = ResolveRealTxn(mHet);
      if (realTxn) {
        realTxn->FinishAdopted0RTT(/*aRestart=*/true);
      }
      // Remove SSL tokens via the live connection (uses GetPeerId(), not
      // HashKey()).  Without removal, Check0RttEnabled sets
      // mEarlyDataState=USED before Do0RTT runs, so Finish0RTT(restart=1) loops
      // on the re-queued txn.
      aCaller->MaybeRemoveSSLTokens();
      aCaller->Close(NS_ERROR_NET_RESET);
      return NS_OK;
    }
  }

  nsHttpTransaction* realTxn = ResolveRealTxn(mHet);
  if (realTxn && StaticPrefs::network_http_0rtt_force_txn_gone_for_testing()) {
    realTxn->Close(NS_ERROR_ABORT);
    realTxn = nullptr;
  }
  if (!realTxn) {
    LOG(("ZeroRttHandle::Finish0RTT %p real txn gone; closing caller=%p", this,
         aCaller));
    RefPtr<HttpConnectionBase> base;
    if (nsAHttpConnection* conn = aCaller->Connection()) {
      base = conn->HttpConnection();
    }
    Cleanup();
    if (base) {
      base->Close(NS_ERROR_ABORT);
    } else {
      aCaller->Close(NS_ERROR_ABORT);
    }
    return NS_OK;
  }

  // First attempt to reach Finish0RTT wins.
  Transition(State::WinnerDeclared, aCaller, aRestart);

  // The HE path drove 0-RTT on the racer HT, so the real txn's own
  // 0-RTT flags never went through nsHttpTransaction::Do0RTT /
  // Finish0RTT. Mirror the terminal state here so downstream code
  // sees the same view it would in the non-HE flow: early-data was
  // available (for restart-on-0-RTT-error in Close), EARLY_ACCEPTED
  // on accept (for 425 handling), mDoNotTryEarlyData on reject.
  realTxn->FinishAdopted0RTT(aRestart);

  // Adopt the winning HT immediately — this hooks the real txn onto
  // the live conn and runs the carrier's SwapTransaction so response
  // bytes land on the real txn directly (see HT::Adopt). We adopt on
  // BOTH accept and reject paths: the state update (linking real txn
  // to the conn) is identical, and the reject path relies on the
  // carrier driving real_txn's Close. Adoption runs while HT's own
  // ConnectionHandle is still live (before the establisher's
  // FinishInternal Reset()-s it). Goes through HET because the
  // pending-queue removal it does needs ConnMgr friend access HT
  // doesn't have.
  RefPtr<HappyEyeballsConnectionAttempt> het = do_QueryReferent(mHet);
  if (het) {
    het->AdoptWinner(aCaller);
  }

  Cleanup();

  // Position the real transaction's request stream for the post-adopt
  // read by the real txn. Reject seeks to 0 (FinishAdopted0RTT
  // already did that). Accept seeks to the caller's 0-RTT offset —
  // the number of bytes the winning HT already delivered as early
  // data — so the real txn reads from offset, gets 0 bytes from the
  // (EOF-by-now) stream, and nsHttpConnection transitions to "request
  // sent, awaiting response" without sending a duplicate request on
  // the wire.
  if (!mRejected) {
    uint64_t seekTo = aCaller->Request0RttStreamOffset().value();
    nsCOMPtr<nsISeekableStream> seekable =
        do_QueryInterface(realTxn->RequestStream());
    if (seekable) {
      nsresult rv = seekable->Seek(nsISeekableStream::NS_SEEK_SET,
                                   static_cast<int64_t>(seekTo));
      LOG(("ZeroRttHandle::Finish0RTT %p seek to %" PRIu64 " rv=%x", this,
           seekTo, static_cast<uint32_t>(rv)));
    }
  }

  // Fire the winner's connected callback synchronously. The establisher
  // chain reacts and HE dispatches the real txn onto this conn.
  aCaller->InvokeCallback();
  return NS_OK;
}

bool ZeroRttHandle::ShouldDisqualify(
    const HappyEyeballsTransaction* aCaller) const {
  return aCaller->Request0RttStreamOffset().isNothing() && mAny0RttStarted;
}

void ZeroRttHandle::Cleanup() {
  MOZ_ASSERT(OnSocketThread(), "ZeroRttHandle::Cleanup off the socket thread");
  if (mState == State::CleanedUp) {
    return;
  }
  Transition(State::CleanedUp);
}

void ZeroRttHandle::Transition(State aNext, HappyEyeballsTransaction* aWinner,
                               bool aRejected) {
  LOG(("ZeroRttHandle::Transition %p mState=%d aNext=%d", this,
       static_cast<int>(mState), static_cast<int>(aNext)));
  switch (aNext) {
    case State::Open:
      MOZ_ASSERT_UNREACHABLE(
          "Open is the constructed state; cannot transition into it");
      break;

    case State::WinnerDeclared:
      MOZ_ASSERT(mState == State::Open, "Open -> WinnerDeclared only");
      MOZ_ASSERT(aWinner, "WinnerDeclared entry requires winner");
      mState = State::WinnerDeclared;
      mWinner = aWinner;
      mHadWinner = true;
      if (aRejected) {
        mRejected = true;
      }
      break;

    case State::CleanedUp:
      MOZ_ASSERT(mState == State::Open || mState == State::WinnerDeclared,
                 "CleanedUp entry from Open or WinnerDeclared only");
      mState = State::CleanedUp;
      mHet = nullptr;
      mWinner = nullptr;  // break RefPtr cycle with HET::mZeroRttHandle
      break;
  }
}

nsHttpTransaction* ZeroRttHandle::RealTxn() const {
  return ResolveRealTxn(mHet);
}

}  // namespace mozilla::net
