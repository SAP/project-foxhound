/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "MockNetworkLayerController.h"

#include "mozilla/ClearOnShutdown.h"
#include "mozilla/net/SocketProcessParent.h"
#include "nsIOService.h"
#include "nsNetAddr.h"

namespace mozilla::net {

static StaticRefPtr<MockNetworkLayerController> gController;

bool FindNetAddrOverride(const NetAddr& aInput, NetAddr& aOutput) {
  RefPtr<MockNetworkLayerController> controller = gController;
  if (!controller) {
    return false;
  }

  nsAutoCString addrPort;
  aInput.ToAddrPortString(addrPort);
  AutoReadLock lock(controller->mLock);
  return controller->mNetAddrOverrides.Get(addrPort, &aOutput);
}

bool FindBlockedTCPConnect(const NetAddr& aInput) {
  RefPtr<MockNetworkLayerController> controller = gController;
  if (!controller) {
    return false;
  }

  nsAutoCString addrPort;
  aInput.ToAddrPortString(addrPort);
  AutoReadLock lock(controller->mLock);
  return controller->mBlockedTCPConnects.Contains(addrPort);
}

bool FindPausedTCPConnect(const NetAddr& aInput) {
  RefPtr<MockNetworkLayerController> controller = gController;
  if (!controller) {
    return false;
  }

  nsAutoCString addrPort;
  aInput.ToAddrPortString(addrPort);
  AutoReadLock lock(controller->mLock);
  return controller->mPausedTCPConnects.Contains(addrPort);
}

bool FindBlockedUDPAddr(const NetAddr& aInput) {
  RefPtr<MockNetworkLayerController> controller = gController;
  if (!controller) {
    return false;
  }

  nsAutoCString addrPort;
  aInput.ToAddrPortString(addrPort);
  AutoReadLock lock(controller->mLock);
  return controller->mBlockedUDPAddresses.Contains(addrPort);
}

// static
already_AddRefed<nsIMockNetworkLayerController>
MockNetworkLayerController::GetSingleton() {
  if (gController) {
    return do_AddRef(gController);
  }

  gController = new MockNetworkLayerController();
  ClearOnShutdown(&gController);
  return do_AddRef(gController);
}

NS_IMPL_ISUPPORTS(MockNetworkLayerController, nsIMockNetworkLayerController)

NS_IMETHODIMP MockNetworkLayerController::CreateScriptableNetAddr(
    const nsACString& aIP, uint16_t aPort, nsINetAddr** aResult) {
  NetAddr rawAddr;
  if (NS_FAILED(rawAddr.InitFromString(aIP))) {
    return NS_ERROR_FAILURE;
  }

  rawAddr.inet.port = PR_htons(aPort);

  RefPtr<nsNetAddr> netaddr = new nsNetAddr(&rawAddr);
  netaddr.forget(aResult);
  return NS_OK;
}

NS_IMETHODIMP MockNetworkLayerController::AddNetAddrOverride(nsINetAddr* aFrom,
                                                             nsINetAddr* aTo) {
  MOZ_ASSERT(NS_IsMainThread());

  NetAddr fromAddr;
  aFrom->GetNetAddr(&fromAddr);
  NetAddr toAddr;
  aTo->GetNetAddr(&toAddr);
  nsAutoCString addrPort;
  fromAddr.ToAddrPortString(addrPort);
  {
    AutoWriteLock lock(mLock);
    mNetAddrOverrides.InsertOrUpdate(addrPort, toAddr);
  }
  if (nsIOService::UseSocketProcess()) {
    RefPtr<SocketProcessParent> parent = SocketProcessParent::GetSingleton();
    if (parent) {
      (void)parent->SendAddNetAddrOverride(fromAddr, toAddr);
    }
  }
  return NS_OK;
}

NS_IMETHODIMP MockNetworkLayerController::ClearNetAddrOverrides() {
  MOZ_ASSERT(NS_IsMainThread());
  {
    AutoWriteLock lock(mLock);
    mNetAddrOverrides.Clear();
  }
  if (nsIOService::UseSocketProcess()) {
    RefPtr<SocketProcessParent> parent = SocketProcessParent::GetSingleton();
    if (parent) {
      (void)parent->SendClearNetAddrOverrides();
    }
  }
  return NS_OK;
}

NS_IMETHODIMP MockNetworkLayerController::BlockTCPConnect(nsINetAddr* aAddr) {
  MOZ_ASSERT(NS_IsMainThread());

  NetAddr addr;
  aAddr->GetNetAddr(&addr);
  nsAutoCString addrPort;
  addr.ToAddrPortString(addrPort);
  {
    AutoWriteLock lock(mLock);
    mBlockedTCPConnects.Insert(addrPort);
  }

  return NS_OK;
}

NS_IMETHODIMP MockNetworkLayerController::ClearBlockedTCPConnect() {
  MOZ_ASSERT(NS_IsMainThread());

  AutoWriteLock lock(mLock);
  mBlockedTCPConnects.Clear();
  return NS_OK;
}

NS_IMETHODIMP MockNetworkLayerController::PauseTCPConnect(nsINetAddr* aAddr) {
  MOZ_ASSERT(NS_IsMainThread());

  NetAddr addr;
  aAddr->GetNetAddr(&addr);
  nsAutoCString addrPort;
  addr.ToAddrPortString(addrPort);
  {
    AutoWriteLock lock(mLock);
    mPausedTCPConnects.Insert(addrPort);
  }

  return NS_OK;
}

NS_IMETHODIMP MockNetworkLayerController::ClearPausedTCPConnect() {
  MOZ_ASSERT(NS_IsMainThread());

  AutoWriteLock lock(mLock);
  mPausedTCPConnects.Clear();
  return NS_OK;
}

NS_IMETHODIMP MockNetworkLayerController::BlockUDPAddrIO(nsINetAddr* aAddr) {
  MOZ_ASSERT(NS_IsMainThread());

  NetAddr addr;
  aAddr->GetNetAddr(&addr);
  nsAutoCString addrPort;
  addr.ToAddrPortString(addrPort);
  {
    AutoWriteLock lock(mLock);
    mBlockedUDPAddresses.Insert(addrPort);
  }

  return NS_OK;
}

NS_IMETHODIMP MockNetworkLayerController::ClearBlockedUDPAddr() {
  MOZ_ASSERT(NS_IsMainThread());

  AutoWriteLock lock(mLock);
  mBlockedUDPAddresses.Clear();
  return NS_OK;
}

bool FindFailedUDPAddr(const NetAddr& aInput) {
  RefPtr<MockNetworkLayerController> controller = gController;
  if (!controller) {
    return false;
  }

  nsAutoCString addrPort;
  aInput.ToAddrPortString(addrPort);
  AutoReadLock lock(controller->mLock);
  return controller->mFailedUDPAddresses.Contains(addrPort);
}

NS_IMETHODIMP MockNetworkLayerController::FailUDPAddrIO(nsINetAddr* aAddr) {
  MOZ_ASSERT(NS_IsMainThread());

  NetAddr addr;
  aAddr->GetNetAddr(&addr);
  nsAutoCString addrPort;
  addr.ToAddrPortString(addrPort);
  {
    AutoWriteLock lock(mLock);
    mFailedUDPAddresses.Insert(addrPort);
  }

  return NS_OK;
}

NS_IMETHODIMP MockNetworkLayerController::ClearFailedUDPAddr() {
  MOZ_ASSERT(NS_IsMainThread());

  AutoWriteLock lock(mLock);
  mFailedUDPAddresses.Clear();
  return NS_OK;
}

}  // namespace mozilla::net
