/* vim:set ts=4 sw=2 sts=2 et cin: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef ZeroRttHandle_h_
#define ZeroRttHandle_h_

#include "mozilla/Maybe.h"
#include "nsIWeakReferenceUtils.h"
#include "nsISupportsImpl.h"
#include "nscore.h"

namespace mozilla::net {

class HappyEyeballsConnectionAttempt;
class HappyEyeballsTransaction;
class nsAHttpSegmentReader;
class nsHttpTransaction;

// Shared 0-RTT coordinator for a single Happy Eyeballs race. One
// ZeroRttHandle is created per HappyEyeballsConnectionAttempt and is
// shared by every HappyEyeballsTransaction racer. The per-attempt
// 0-RTT request-stream offset lives on each HappyEyeballsTransaction
// (m0RttRequestStreamOffset); the handle holds only race-wide state
// (winner identity, started/rejected flags).
//
// Design constraints:
//  * We NEVER touch the real transaction's 0-RTT flags during the race.
//    The handle reads directly from the real txn's request stream at
//    the caller's recorded offset using nsISeekableStream.
//  * The handle resolves the real txn lazily through its weak ref to
//    the owning HE (mHet). If that ref can't resolve (HE gone, txn
//    closed) Do0RTT returns false and the other methods no-op.
//  * When any attempt's Do0RTT returns true, the handle sets a one-way
//    mAny0RttStarted flag. Non-0-RTT racers are then disqualified —
//    a successful Close on one is converted to a failure so HE drops
//    it from the race. Rationale: 0-RTT PSK tickets are single-use.
//    The guard doesn't fire on non-NS_OK closes (e.g. Http2Session
//    cleanup with NS_BASE_STREAM_WOULD_BLOCK); the HET::OnSucceeded
//    rewind block is the fallback for that case.
//  * First Finish0RTT call wins. The handle seeks the real txn's
//    request stream — to the winner's offset on accept (so the real
//    txn sees EOF and doesn't duplicate bytes) or to 0 on reject (so
//    the real txn resends from the start) — and synchronously invokes
//    the winner's connected callback.
//  * Once a winner is declared, subsequent losing-racer ReadSegments
//    return NS_BASE_STREAM_CLOSED so they can't advance the request
//    stream past where the real txn needs to read.
//  * Response bytes can't land on HT post-winner: Adopt's carrier
//    swap runs synchronously inside Finish0RTT, so the carrier hands
//    response bytes directly to the real txn from then on.
class ZeroRttHandle {
 public:
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(ZeroRttHandle)

  explicit ZeroRttHandle(HappyEyeballsConnectionAttempt* aHet);

  // Corresponds to nsAHttpTransaction::Do0RTT. Returns true if the
  // caller is eligible and has been accepted into the 0-RTT flow —
  // the caller's m0RttRequestStreamOffset is set to Some(0).
  bool Do0RTT(HappyEyeballsTransaction* aCaller, bool aCanSendEarlyData);

  // Corresponds to nsAHttpTransaction::ReadSegments. Seeks the real
  // transaction's request stream to aOffset, forwards bytes to aReader,
  // and advances aOffset on success. The caller's offset slot
  // (HappyEyeballsTransaction::Request0RttStreamOffset) is read and
  // updated through this reference; we don't need the HET itself here.
  nsresult ReadSegments(mozilla::Maybe<uint64_t>& aOffset,
                        nsAHttpSegmentReader* aReader, uint32_t aCount,
                        uint32_t* aCountRead);

  // Corresponds to nsAHttpTransaction::Finish0RTT. First call wins:
  // adopts the real txn onto the winning HT (via HET::AdoptWinner),
  // seeks the real txn's request stream (to winner-offset on accept,
  // 0 on reject), and invokes the winner's connected callback so the
  // establisher chain fires.
  nsresult Finish0RTT(HappyEyeballsTransaction* aCaller, bool aRestart,
                      bool aAlpnChanged);

  // True if the caller should be disqualified from the race because
  // some racer started 0-RTT but the caller did not. Consulted from
  // HappyEyeballsTransaction::Close to convert a successful Close
  // reason into NS_ERROR_FAILURE, so the non-0-RTT attempt drops out
  // and HE can keep waiting for the 0-RTT racer. Fires only on
  // NS_SUCCEEDED closes — HET::OnSucceeded has a rewind fallback for
  // the non-NS_OK close paths.
  bool ShouldDisqualify(const HappyEyeballsTransaction* aCaller) const;

  // True if any racer attempt entered the 0-RTT flow (Do0RTT returned
  // true) during the race. Consulted by HCA::Abandon() to detect an
  // abandoned 0-RTT attempt whose txn was locked from the pending queue,
  // and by HCA::OnSucceeded() to detect the "0-RTT racer advanced the
  // stream but a non-0-RTT conn won" case and rewind the request stream.
  bool AnyStarted() const { return mAny0RttStarted; }

  // True if a winner was ever declared via Finish0RTT. Outlives mWinner:
  // Cleanup() clears mWinner to break the RefPtr cycle but mHadWinner
  // remains set so callers can still distinguish "no winner yet" from
  // "winner declared and then cleaned up".
  bool HadWinner() const { return mHadWinner; }

  // Resolve the real nsHttpTransaction via the HET weak ref. Returns
  // nullptr once Cleanup() has run or if the real txn is closed.
  // HappyEyeballsTransaction::RequestHead uses this so Http3Stream /
  // Http2Stream read :method/:authority/:path/:scheme from the real
  // txn's head — NullHttpTransaction's stub only has Host set to
  // connect-target:port and no path, which is what the HT shim would
  // otherwise return before Adopt.
  nsHttpTransaction* RealTxn() const;

  void Cleanup();

 private:
  ~ZeroRttHandle() = default;

  // Lifecycle state.
  //   Open           : default. Race in progress. Do0RTT and Finish0RTT
  //                    can promote the handle out of this state.
  //   WinnerDeclared : first Finish0RTT call has run; mWinner and
  //                    mHadWinner are set. Subsequent Finish0RTT calls
  //                    are loser no-ops.
  //   CleanedUp      : Cleanup() has run; mHet is null and the handle's
  //                    weak ref to HE is gone. Any 0-RTT method that
  //                    requires resolving the real txn becomes a no-op.
  //
  // Legal transitions:
  //   Open           -> WinnerDeclared | CleanedUp
  //   WinnerDeclared -> CleanedUp
  //   CleanedUp      -> CleanedUp (idempotent)
  enum class State : uint8_t {
    Open,
    WinnerDeclared,
    CleanedUp,
  };

  // Single dispatcher for state transitions. Switches on the target
  // state, asserts the move is legal from the current state, commits
  // mState, and runs the actions tied to entering that state.
  //
  // aWinner / aRejected are consumed by the WinnerDeclared entry;
  // ignored by other cases.
  void Transition(State aNext, HappyEyeballsTransaction* aWinner = nullptr,
                  bool aRejected = false);

  // Weak ref to the owning HET. We look up the real nsHttpTransaction
  // through HET->RealHttpTransaction() each time because the HT may
  // have been created (and this handle constructed) while HET's
  // mTransaction was still a speculative NullHttpTransaction — a
  // later Claim() replaces it with the real txn, and we need to pick
  // that change up without explicit notifications.
  nsWeakPtr mHet;

  // First attempt to reach Finish0RTT wins.  RefPtr — Cleanup() clears
  // mWinner to break the RefPtr cycle with HET::mZeroRttHandle.
  RefPtr<HappyEyeballsTransaction> mWinner;

  bool mHadWinner = false;

  // Any attempt has ever successfully entered the 0-RTT flow.
  bool mAny0RttStarted = false;

  // Set to true in Finish0RTT when called with aRestart=true. For H1
  // this means the server rejected early data; for H2 it means ALPN
  // changed (so H2 can't reuse its frame cache).
  bool mRejected = false;

  State mState = State::Open;
};

}  // namespace mozilla::net

#endif
