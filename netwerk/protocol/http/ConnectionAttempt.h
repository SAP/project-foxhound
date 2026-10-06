/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef ConnectionAttempt_h_
#define ConnectionAttempt_h_

#include "mozilla/TimeStamp.h"
#include "nsWeakReference.h"

namespace mozilla {
namespace net {

class ConnectionEntry;
class DnsAndConnectSocket;
class nsAHttpTransaction;
class nsHttpConnectionInfo;
class nsHttpTransaction;

// ConnectionAttempt is an abstraction layer between the legacy
// DnsAndConnectSocket connection path and the new
// HappyEyeballsConnectionAttempt implementation.
//
// It allows us to switch between the old and new connection
// establishment logic without changing higher-level code.
//
// We intentionally keep the legacy implementation to support
// the NS_HTTP_BE_CONSERVATIVE flag. Requests with this flag
// continue to use the old connection path until we are fully
// confident that the new Happy Eyeballs implementation is
// stable. This serves as a risk-mitigation mechanism during
// rollout.
class ConnectionAttempt : public nsSupportsWeakReference {
 public:
  NS_DECL_THREADSAFE_ISUPPORTS

  explicit ConnectionAttempt(nsHttpConnectionInfo* ci,
                             nsAHttpTransaction* trans, uint32_t caps,
                             bool speculative, bool urgentStart);

  virtual nsresult Init(ConnectionEntry* ent) = 0;
  // Cancel this connection attempt and release resources.
  virtual void Abandon() = 0;
  virtual double Duration(TimeStamp epoch) = 0;
  bool AcceptsTransaction(nsHttpTransaction* trans) const;
  virtual bool Claim(nsHttpTransaction* newTransaction = nullptr) = 0;
  // HE attempts are 1:1 owned by their creator transaction, and re-flipping
  // mFreeToUse to true on an HE that already has a real mTransaction lets
  // a *different* transaction Claim it without `Claim()` actually rebinding
  // the ownership — the new claimer ends up "remembered" by an HE that
  // doesn't dispatch it. (See HappyEyeballsConnectionAttempt::Unclaim.)
  virtual void Unclaim();
  virtual void OnTimeout() = 0;
  virtual void PrintDiagnostics(nsCString& log) = 0;
  virtual DnsAndConnectSocket* ToDnsAndConnectSocket() { return nullptr; }
  virtual uint32_t UnconnectedUDPConnsLength() const;

  bool IsSpeculative() { return mSpeculative; }
  bool Allow1918() { return mAllow1918; }
  void SetAllow1918(bool val) { mAllow1918 = val; }
  bool HasConnected() { return mHasConnected; }

 protected:
  virtual ~ConnectionAttempt() = default;

  RefPtr<nsHttpConnectionInfo> mConnInfo;
  RefPtr<nsAHttpTransaction> mTransaction;

  uint32_t mCaps = 0;
  // mSpeculative is set if the socket was created from
  // SpeculativeConnect(). It is cleared when a transaction would normally
  // start a new connection from scratch but instead finds this one in
  // the half open list and claims it for its own use. (which due to
  // the vagaries of scheduling from the pending queue might not actually
  // match up - but it prevents a speculative connection from opening
  // more connections than needed.)
  bool mSpeculative = false;
  // If created with a non-null urgent transaction, remember it, so we can
  // mark the connection as urgent right away when it's created.
  bool mUrgentStart = false;
  bool mAllow1918 = true;
  // mHasConnected tracks whether one of the sockets has completed the
  // connection process. It may have completed unsuccessfully.
  bool mHasConnected = false;

  // A ConnectionAttempt can be made for a concrete non-null transaction,
  // but the transaction can be dispatched to another connection. In that
  // case we can free this transaction to be claimed by other
  // transactions.
  bool mFreeToUse = true;
};

}  // namespace net
}  // namespace mozilla

#endif
