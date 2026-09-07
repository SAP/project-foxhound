/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "StunAddrsRequestParent.h"

#include "../mdns_service/mdns_service.h"
#include "../runnable_utils.h"
#include "local_addr.h"
#include "mozilla/StaticPtr.h"
#include "nsIThread.h"
#include "nsNetUtil.h"
#include "transport/nricectx.h"
#include "transport/nricemediastream.h"  // needed only for including nricectx.h
#include "transport/nricestunaddr.h"

using namespace mozilla::ipc;

namespace mozilla::net {

/* static */
void StunAddrsRequestParent::MDNSServiceWrapper::mdns_service_resolved(
    void* aCb, const char* aHostname, const char* aAddr) {
  GetMainThreadSerialEventTarget()->Dispatch(NS_NewRunnableFunction(
      __func__,
      [aCb, hostname = nsCString(aHostname), addr = nsCString(aAddr)] {
        if (mSharedMDNSService) {
          mSharedMDNSService->OnQueryComplete(reinterpret_cast<uintptr_t>(aCb),
                                              hostname, Some(addr));
        }
      }));
}

/* static */
void StunAddrsRequestParent::MDNSServiceWrapper::mdns_service_timedout(
    void* aCb, const char* aHostname) {
  GetMainThreadSerialEventTarget()->Dispatch(
      NS_NewRunnableFunction(__func__, [aCb, hostname = nsCString(aHostname)] {
        if (mSharedMDNSService) {
          mSharedMDNSService->OnQueryComplete(reinterpret_cast<uintptr_t>(aCb),
                                              hostname, Nothing());
        }
      }));
}

StunAddrsRequestParent::StunAddrsRequestParent() : mIPCClosed(false) {
  nsresult res;
  mSTSThread = do_GetService(NS_SOCKETTRANSPORTSERVICE_CONTRACTID, &res);
  MOZ_ASSERT(mSTSThread);
}

StunAddrsRequestParent::~StunAddrsRequestParent() = default;

mozilla::ipc::IPCResult StunAddrsRequestParent::RecvGetStunAddrs() {
  MOZ_ASSERT(NS_IsMainThread());

  if (mIPCClosed) {
    return IPC_OK();
  }

  mSTSThread->Dispatch(NS_NewRunnableFunction(
      __func__, [self = RefPtr<StunAddrsRequestParent>(this)]() mutable {
        // get the stun addresses while on STS thread
        NrIceStunAddrArray addrs = NrIceCtx::GetStunAddrs();
        GetMainThreadSerialEventTarget()->Dispatch(NS_NewRunnableFunction(
            __func__, [self = std::move(self), addrs = std::move(addrs)] {
              self->SendStunAddrs(addrs);
            }));
      }));

  return IPC_OK();
}

mozilla::ipc::IPCResult StunAddrsRequestParent::RecvRegisterMDNSHostname(
    const nsACString& aHostname, const nsACString& aAddress) {
  MOZ_ASSERT(NS_IsMainThread());

  if (mIPCClosed) {
    return IPC_OK();
  }

  if (MDNSServiceWrapper::Instance()) {
    MDNSServiceWrapper::Instance()->RegisterHostname(
        PromiseFlatCString(aHostname).get(),
        PromiseFlatCString(aAddress).get());
  }

  return IPC_OK();
}

mozilla::ipc::IPCResult StunAddrsRequestParent::RecvQueryMDNSHostname(
    const nsACString& aHostname) {
  MOZ_ASSERT(NS_IsMainThread());

  if (mIPCClosed) {
    return IPC_OK();
  }

  if (MDNSServiceWrapper::Instance()) {
    MDNSServiceWrapper::Instance()->QueryHostname(
        this, PromiseFlatCString(aHostname).get());
  }

  return IPC_OK();
}

mozilla::ipc::IPCResult StunAddrsRequestParent::RecvUnregisterMDNSHostname(
    const nsACString& aHostname) {
  MOZ_ASSERT(NS_IsMainThread());

  if (mIPCClosed) {
    return IPC_OK();
  }

  if (MDNSServiceWrapper::Instance()) {
    MDNSServiceWrapper::Instance()->UnregisterHostname(
        PromiseFlatCString(aHostname).get());
  }

  return IPC_OK();
}

mozilla::ipc::IPCResult StunAddrsRequestParent::Recv__delete__() {
  MOZ_ASSERT(NS_IsMainThread());
  // see note below in ActorDestroy
  mIPCClosed = true;
  return IPC_OK();
}

void StunAddrsRequestParent::ActorDestroy(ActorDestroyReason why) {
  MOZ_ASSERT(NS_IsMainThread());
  // We may still have refcount>0 if we haven't made it through
  // GetStunAddrs_s and SendStunAddrs_m yet, but child process
  // has crashed.  We must not send any more msgs to child, or
  // IPDL will kill chrome process, too.
  mIPCClosed = true;
}

void StunAddrsRequestParent::SendStunAddrs(const NrIceStunAddrArray& addrs) {
  MOZ_ASSERT(NS_IsMainThread());

  if (mIPCClosed) {
    // nothing to do: child probably crashed
    return;
  }

  if (!MDNSServiceWrapper::Instance()) {
    std::ostringstream o;
    char buffer[16];
    for (auto& addr : addrs) {
      nr_local_addr localAddr;
      addr.toNrLocalAddr(localAddr);
      if (localAddr.addr.ip_version == NR_IPV4 &&
          !nr_transport_addr_is_loopback(&localAddr.addr)) {
        nr_transport_addr_get_addrstring(&localAddr.addr, buffer, 16);
        o << buffer << ";";
      }
    }
    std::string addrstring = o.str();
    if (!addrstring.empty()) {
      (void)MDNSServiceWrapper::EnsureInstance(addrstring);
    }
  }

  // send the new addresses back to the child
  (void)SendOnStunAddrsAvailable(addrs);
}

void StunAddrsRequestParent::OnQueryComplete(const nsACString& hostname,
                                             const Maybe<nsCString>& address) {
  MOZ_ASSERT(NS_IsMainThread());

  if (mIPCClosed) {
    // nothing to do: child went away while a query was in flight
    return;
  }

  // send the hostname and address back to the child
  (void)SendOnMDNSQueryComplete(hostname, address);
}

/* static */
StaticRefPtr<StunAddrsRequestParent::MDNSServiceWrapper>
    StunAddrsRequestParent::MDNSServiceWrapper::mSharedMDNSService;

StunAddrsRequestParent::MDNSServiceWrapper::MDNSServiceWrapper(
    const std::string& aAddrsString)
    : mAddrsString(aAddrsString) {}

void StunAddrsRequestParent::MDNSServiceWrapper::RegisterHostname(
    const char* hostname, const char* address) {
  MOZ_ASSERT(NS_IsMainThread());
  StartIfRequired();
  if (mMDNSService) {
    mdns_service_register_hostname(mMDNSService, hostname, address);
  }
}

void StunAddrsRequestParent::MDNSServiceWrapper::QueryHostname(
    StunAddrsRequestParent* parent, const char* hostname) {
  MOZ_ASSERT(NS_IsMainThread());
  StartIfRequired();
  if (mMDNSService) {
    sOutstandingQueries[mQueryId] = parent;
    mdns_service_query_hostname(mMDNSService, reinterpret_cast<void*>(mQueryId),
                                mdns_service_resolved, mdns_service_timedout,
                                hostname);
    ++mQueryId;
  }
}

void StunAddrsRequestParent::MDNSServiceWrapper::UnregisterHostname(
    const char* hostname) {
  MOZ_ASSERT(NS_IsMainThread());
  StartIfRequired();
  if (mMDNSService) {
    mdns_service_unregister_hostname(mMDNSService, hostname);
  }
}

StunAddrsRequestParent::MDNSServiceWrapper::~MDNSServiceWrapper() {
  MOZ_ASSERT(NS_IsMainThread());
  if (mMDNSService) {
    mdns_service_stop(mMDNSService);
    mMDNSService = nullptr;
  }
  if (mShutdownWatcher) {
    mShutdownWatcher->Destroy();
  }
}

void StunAddrsRequestParent::MDNSServiceWrapper::StartIfRequired() {
  MOZ_ASSERT(NS_IsMainThread());
  if (!mMDNSService) {
    mMDNSService = mdns_service_start(mAddrsString.c_str());
  }
}

void StunAddrsRequestParent::MDNSServiceWrapper::Init() {
  mShutdownWatcher = media::ShutdownWatcher::Create(this);
}

void StunAddrsRequestParent::MDNSServiceWrapper::OnQueryComplete(
    uintptr_t aQueryId, const nsCString& aHostname,
    const Maybe<nsCString>& aAddress) {
  MOZ_ASSERT(NS_IsMainThread());
  auto it = sOutstandingQueries.find(aQueryId);
  if (it != sOutstandingQueries.end()) {
    RefPtr<StunAddrsRequestParent> parent = it->second.forget();
    sOutstandingQueries.erase(it);
    parent->OnQueryComplete(aHostname, aAddress);
  }
}

/* static */
RefPtr<StunAddrsRequestParent::MDNSServiceWrapper>
StunAddrsRequestParent::MDNSServiceWrapper::EnsureInstance(
    const std::string& aAddrsString) {
  MOZ_ASSERT(NS_IsMainThread());
  if (!mSharedMDNSService) {
    mSharedMDNSService = new MDNSServiceWrapper(aAddrsString);
    mSharedMDNSService->Init();
  }
  return mSharedMDNSService;
}

/* static */
RefPtr<StunAddrsRequestParent::MDNSServiceWrapper>
StunAddrsRequestParent::MDNSServiceWrapper::Instance() {
  MOZ_ASSERT(NS_IsMainThread());
  return mSharedMDNSService;
}

void StunAddrsRequestParent::MDNSServiceWrapper::OnShutdown() {
  MOZ_ASSERT(NS_IsMainThread());
  // Break cycles for outstanding queries, and prevent new queries. This should
  // allow us to clean up.
  auto trash = std::move(sOutstandingQueries);
  mSharedMDNSService = nullptr;
}

}  // namespace mozilla::net
