/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_net_StunAddrsRequestParent_h
#define mozilla_net_StunAddrsRequestParent_h

#include "mozilla/media/MediaUtils.h"  // ShutdownWatcher
#include "mozilla/net/PStunAddrsRequestParent.h"

struct MDNSService;

namespace mozilla::net {

class StunAddrsRequestParent : public PStunAddrsRequestParent {
  friend class PStunAddrsRequestParent;

 public:
  NS_INLINE_DECL_REFCOUNTING(StunAddrsRequestParent, override);

  StunAddrsRequestParent();

  mozilla::ipc::IPCResult Recv__delete__() override;

  void OnQueryComplete(const nsACString& hostname,
                       const Maybe<nsCString>& address);

 protected:
  virtual ~StunAddrsRequestParent();

  virtual mozilla::ipc::IPCResult RecvGetStunAddrs() override;
  virtual mozilla::ipc::IPCResult RecvRegisterMDNSHostname(
      const nsACString& hostname, const nsACString& address) override;
  virtual mozilla::ipc::IPCResult RecvQueryMDNSHostname(
      const nsACString& hostname) override;
  virtual mozilla::ipc::IPCResult RecvUnregisterMDNSHostname(
      const nsACString& hostname) override;
  virtual void ActorDestroy(ActorDestroyReason why) override;

  nsCOMPtr<nsISerialEventTarget> mSTSThread;

  void SendStunAddrs(const NrIceStunAddrArray& addrs);

 private:
  bool mIPCClosed;  // true if IPDL channel has been closed (child crash)

  class MDNSServiceWrapper : public media::ShutdownConsumer {
   public:
    void RegisterHostname(const char* hostname, const char* address);
    void QueryHostname(StunAddrsRequestParent* parent, const char* hostname);
    void UnregisterHostname(const char* hostname);

    void OnQueryComplete(uintptr_t aQueryId, const nsCString& aHostname,
                         const Maybe<nsCString>& aAddress);

    NS_INLINE_DECL_REFCOUNTING(MDNSServiceWrapper);
    static RefPtr<MDNSServiceWrapper> EnsureInstance(
        const std::string& aAddrsString);
    static RefPtr<MDNSServiceWrapper> Instance();
    void OnShutdown() override;

   private:
    explicit MDNSServiceWrapper(const std::string& aAddr);
    virtual ~MDNSServiceWrapper();
    void StartIfRequired();
    void Init();
    static void mdns_service_resolved(void* aCb, const char* aHostname,
                                      const char* aAddr);
    static void mdns_service_timedout(void* aCb, const char* aHostname);

    std::string mAddrsString;
    MDNSService* mMDNSService = nullptr;
    RefPtr<media::ShutdownWatcher> mShutdownWatcher;
    std::map<uintptr_t, RefPtr<StunAddrsRequestParent>> sOutstandingQueries;
    uintptr_t mQueryId = 1;

    static StaticRefPtr<MDNSServiceWrapper> mSharedMDNSService;
  };
};

}  // namespace mozilla::net

#endif  // mozilla_net_StunAddrsRequestParent_h
