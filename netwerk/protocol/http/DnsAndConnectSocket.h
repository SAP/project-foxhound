/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DnsAndConnectSocket_h_
#define DnsAndConnectSocket_h_

#include "ConnectionAttempt.h"
#include "nsAHttpConnection.h"
#include "nsHttpConnection.h"
#include "nsHttpTransaction.h"
#include "nsIAsyncOutputStream.h"
#include "nsICancelable.h"
#include "nsIDNSListener.h"
#include "nsIDNSRecord.h"
#include "nsIDNSService.h"
#include "nsINamed.h"
#include "nsITransport.h"

namespace mozilla {
namespace net {

// 8d411b53-54bc-4a99-8b78-ff125eab1564
#define NS_DNSANDCONNECTSOCKET_IID \
  {0x8d411b53, 0x54bc, 0x4a99, {0x8b, 0x78, 0xff, 0x12, 0x5e, 0xab, 0x15, 0x64}}

class PendingTransactionInfo;
class ConnectionEntry;

class DnsAndConnectSocket final : public ConnectionAttempt,
                                  public nsIOutputStreamCallback,
                                  public nsITransportEventSink,
                                  public nsIInterfaceRequestor,
                                  public nsITimerCallback,
                                  public nsINamed,
                                  public nsIDNSListener {
  ~DnsAndConnectSocket();

 public:
  NS_INLINE_DECL_STATIC_IID(NS_DNSANDCONNECTSOCKET_IID)
  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_NSIOUTPUTSTREAMCALLBACK
  NS_DECL_NSITRANSPORTEVENTSINK
  NS_DECL_NSIINTERFACEREQUESTOR
  NS_DECL_NSITIMERCALLBACK
  NS_DECL_NSINAMED
  NS_DECL_NSIDNSLISTENER

  DnsAndConnectSocket(nsHttpConnectionInfo* ci, nsAHttpTransaction* trans,
                      uint32_t caps, bool speculative, bool urgentStart);

  nsresult Init(ConnectionEntry* ent) override;
  void Abandon() override;
  double Duration(TimeStamp epoch) override;
  void OnTimeout() override;

  void PrintDiagnostics(nsCString& log) override;

  // Checks whether the transaction can be dispatched using this
  // half-open's connection.  If this half-open is marked as urgent-start,
  // it only accepts urgent start transactions.  Call only before Claim().
  bool AcceptsTransaction(nsHttpTransaction* trans);
  bool Claim(nsHttpTransaction* newTransaction = nullptr) override;

  DnsAndConnectSocket* ToDnsAndConnectSocket() override { return this; }

 private:
  // This performs checks that the DnsAndConnectSocket has been properly cleand
  // up.
  void CheckIsDone();

  /**
   * State:
   *   INIT: initial state. From this state:
   *         1) change the state to RESOLVING and start the primary DNS lookup
   *            if mSkipDnsResolution is false,
   *         2) or the lookup is skip and the state changes to CONNECTING and
   *            start the backup timer.
   *         3) or changes to DONE in case of an error.
   *   RESOLVING: the primary DNS resolution is in progress. From this state
   *              we transition into CONNECTING or DONE.
   *   CONNECTING: We change to this state when the primary connection has
   *               started. At that point the backup timer is started.
   *   ONE_CONNECTED: We change into this state when one of the connections
   *                  is connected and the second is in progres.
   *   DONE
   *
   * Events:
   *   INIT_EVENT: Start the primary dns resolution (if mSkipDnsResolution is
   *               false), otherwise start the primary connection.
   *   RESOLVED_PRIMARY_EVENT: the primary DNS resolution is done. This event
   *                           may be resent due to DNS retries
   *   CONNECTED_EVENT: A connecion (primary or backup) is done
   */
  enum DnsAndSocketState {
    INIT,
    RESOLVING,
    CONNECTING,
    ONE_CONNECTED,
    DONE
  } mState = INIT;

  enum SetupEvents {
    INIT_EVENT,
    RESOLVED_PRIMARY_EVENT,
    PRIMARY_DONE_EVENT,
    BACKUP_DONE_EVENT,
    BACKUP_TIMER_FIRED_EVENT
  };

  // This structure is responsible for performing DNS lookup, creating socket
  // and connecting the socket.
  struct TransportSetup {
    enum TransportSetupState {
      INIT,
      RESOLVING,
      RESOLVED,
      RETRY_RESOLVING,
      CONNECTING,
      CONNECTING_DONE,
      DONE
    } mState;

    bool FirstResolving() {
      return mState == TransportSetup::TransportSetupState::RESOLVING;
    }
    bool ConnectingOrRetry() {
      return (mState == TransportSetup::TransportSetupState::CONNECTING) ||
             (mState == TransportSetup::TransportSetupState::RETRY_RESOLVING) ||
             (mState == TransportSetup::TransportSetupState::CONNECTING_DONE);
    }
    bool Resolved() {
      return mState == TransportSetup::TransportSetupState::RESOLVED;
    }
    bool DoneConnecting() {
      return (mState == TransportSetup::TransportSetupState::CONNECTING_DONE) ||
             (mState == TransportSetup::TransportSetupState::DONE);
    }

    nsCString mHost;
    nsCOMPtr<nsICancelable> mDNSRequest;
    nsCOMPtr<nsIDNSAddrRecord> mDNSRecord;
    nsIDNSService::DNSFlags mDnsFlags = nsIDNSService::RESOLVE_DEFAULT_FLAGS;
    bool mRetryWithDifferentIPFamily = false;
    bool mResetFamilyPreference = false;
    bool mSkipDnsResolution = false;

    nsCOMPtr<nsISocketTransport> mSocketTransport;
    nsCOMPtr<nsIAsyncOutputStream> mStreamOut;
    nsCOMPtr<nsIAsyncInputStream> mStreamIn;
    TimeStamp mSynStarted;
    bool mConnectedOK = false;
    bool mIsBackup;

    bool mWaitingForConnect = false;
    void SetConnecting();
    void MaybeSetConnectingDone();

    nsresult Init(DnsAndConnectSocket* dnsAndSock);
    void CancelDnsResolution();
    void Abandon();
    void CloseAll();
    nsresult SetupConn(DnsAndConnectSocket* dnsAndSock,
                       nsAHttpTransaction* transaction, ConnectionEntry* ent,
                       nsresult status, uint32_t cap,
                       HttpConnectionBase** connection);
    [[nodiscard]] nsresult SetupStreams(DnsAndConnectSocket* dnsAndSock);
    nsresult ResolveHost(DnsAndConnectSocket* dnsAndSock);
    bool ShouldRetryDNS();
    nsresult OnLookupComplete(DnsAndConnectSocket* dnsAndSock,
                              nsIDNSRecord* rec, nsresult status);
    nsresult CheckConnectedResult(DnsAndConnectSocket* dnsAndSock);
    // Toggles the IP family flags (RESOLVE_DISABLE_IPV6 and
    // RESOLVE_DISABLE_IPV4) in mDnsFlags if retrying with a different IP family
    // is enabled.
    bool ToggleIpFamilyFlagsIfRetryEnabled();

   protected:
    explicit TransportSetup(bool isBackup);
  };

  struct PrimaryTransportSetup final : TransportSetup {
    PrimaryTransportSetup() : TransportSetup(false) {}
  };

  struct BackupTransportSetup final : TransportSetup {
    BackupTransportSetup() : TransportSetup(true) {}
  };

  nsresult SetupConn(bool isPrimary, nsresult status);
  void SetupBackupTimer();
  void CancelBackupTimer();

  bool IsPrimary(nsITransport* trans);
  bool IsPrimary(nsIAsyncOutputStream* out);
  bool IsPrimary(nsICancelable* dnsRequest);
  bool IsBackup(nsITransport* trans);
  bool IsBackup(nsIAsyncOutputStream* out);
  bool IsBackup(nsICancelable* dnsRequest);

  // To find out whether |mTransaction| is still in the connection entry's
  // pending queue. If the transaction is found and |removeWhenFound| is
  // true, the transaction will be removed from the pending queue.
  already_AddRefed<PendingTransactionInfo> FindTransactionHelper(
      bool removeWhenFound);

  void CheckProxyConfig();
  nsresult SetupDnsFlags(ConnectionEntry* ent);
  nsresult SetupEvent(SetupEvents event);

  bool mDispatchedMTransaction = false;

  PrimaryTransportSetup mPrimaryTransport;

  bool mBackupConnStatsSet = false;

  nsCOMPtr<nsITimer> mSynTimer;
  BackupTransportSetup mBackupTransport;

  bool mIsHttp3 = false;

  bool mSkipDnsResolution = false;
  bool mProxyNotTransparent = false;
  bool mProxyTransparentResolvesHost = false;
};

}  // namespace net
}  // namespace mozilla

#endif  // DnsAndConnectSocket_h_
