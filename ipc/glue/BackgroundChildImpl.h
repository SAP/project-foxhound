/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_ipc_backgroundchildimpl_h__
#define mozilla_ipc_backgroundchildimpl_h__

#include "mozilla/ipc/PBackgroundChild.h"
#include "mozilla/UniquePtr.h"

namespace mozilla {
namespace dom {

class IDBFileHandle;

namespace indexedDB {

class ThreadLocal;

}  // namespace indexedDB
}  // namespace dom

namespace ipc {

// Instances of this class should never be created directly. This class is meant
// to be inherited in BackgroundImpl.
class BackgroundChildImpl : public PBackgroundChild {
 public:
  class ThreadLocal;

  // Get the ThreadLocal for the current thread if
  // BackgroundChild::GetOrCreateForCurrentThread() has been called and true was
  // returned (e.g. a valid PBackgroundChild actor has been created or is in the
  // process of being created). Otherwise this function returns null.
  // This functions is implemented in BackgroundImpl.cpp.
  static ThreadLocal* GetThreadLocalForCurrentThread();

 protected:
  BackgroundChildImpl();
  virtual ~BackgroundChildImpl();

  virtual void ProcessingError(Result aCode, const char* aReason) override;

  virtual void ActorDestroy(ActorDestroyReason aWhy) override;

  virtual PBackgroundTestChild* AllocPBackgroundTestChild(
      const nsACString& aTestArg) override;

  virtual bool DeallocPBackgroundTestChild(
      PBackgroundTestChild* aActor) override;

  virtual PBackgroundIndexedDBUtilsChild* AllocPBackgroundIndexedDBUtilsChild()
      override;

  virtual bool DeallocPBackgroundIndexedDBUtilsChild(
      PBackgroundIndexedDBUtilsChild* aActor) override;

  virtual PBackgroundLSObserverChild* AllocPBackgroundLSObserverChild(
      const uint64_t& aObserverId) override;

  virtual bool DeallocPBackgroundLSObserverChild(
      PBackgroundLSObserverChild* aActor) override;

  virtual PBackgroundLSRequestChild* AllocPBackgroundLSRequestChild(
      const LSRequestParams& aParams) override;

  virtual bool DeallocPBackgroundLSRequestChild(
      PBackgroundLSRequestChild* aActor) override;

  virtual PBackgroundLSSimpleRequestChild* AllocPBackgroundLSSimpleRequestChild(
      const LSSimpleRequestParams& aParams) override;

  virtual bool DeallocPBackgroundLSSimpleRequestChild(
      PBackgroundLSSimpleRequestChild* aActor) override;

  virtual PBackgroundLocalStorageCacheChild*
  AllocPBackgroundLocalStorageCacheChild(
      const PrincipalInfo& aPrincipalInfo, const nsACString& aOriginKey,
      const uint32_t& aPrivateBrowsingId) override;

  virtual bool DeallocPBackgroundLocalStorageCacheChild(
      PBackgroundLocalStorageCacheChild* aActor) override;

  virtual PBackgroundStorageChild* AllocPBackgroundStorageChild(
      const nsAString& aProfilePath,
      const uint32_t& aPrivateBrowsingId) override;

  virtual bool DeallocPBackgroundStorageChild(
      PBackgroundStorageChild* aActor) override;

  virtual PTemporaryIPCBlobChild* AllocPTemporaryIPCBlobChild() override;

  virtual bool DeallocPTemporaryIPCBlobChild(
      PTemporaryIPCBlobChild* aActor) override;

  virtual PFileCreatorChild* AllocPFileCreatorChild(
      const nsAString& aFullPath, const nsAString& aType,
      const nsAString& aName, const Maybe<int64_t>& aLastModified,
      const bool& aExistenceCheck, const bool& aIsFromNsIFile) override;

  virtual bool DeallocPFileCreatorChild(PFileCreatorChild* aActor) override;

  already_AddRefed<mozilla::dom::PRemoteWorkerChild> AllocPRemoteWorkerChild(
      const RemoteWorkerData& aData) override;

  virtual mozilla::ipc::IPCResult RecvPRemoteWorkerConstructor(
      PRemoteWorkerChild* aActor, const RemoteWorkerData& aData) override;

  virtual mozilla::dom::PSharedWorkerChild* AllocPSharedWorkerChild(
      const mozilla::dom::RemoteWorkerData& aData, const uint64_t& aWindowID,
      const mozilla::dom::MessagePortIdentifier& aPortIdentifier) override;

  virtual bool DeallocPSharedWorkerChild(
      mozilla::dom::PSharedWorkerChild* aActor) override;

  virtual PCamerasChild* AllocPCamerasChild() override;

  virtual bool DeallocPCamerasChild(PCamerasChild* aActor) override;

  virtual PUDPSocketChild* AllocPUDPSocketChild(
      const Maybe<PrincipalInfo>& aPrincipalInfo,
      const nsACString& aFilter) override;
  virtual bool DeallocPUDPSocketChild(PUDPSocketChild* aActor) override;

  virtual PBroadcastChannelChild* AllocPBroadcastChannelChild(
      const PrincipalInfo& aPrincipalInfo, const nsACString& aOrigin,
      const nsAString& aChannel) override;

  virtual bool DeallocPBroadcastChannelChild(
      PBroadcastChannelChild* aActor) override;

  virtual PServiceWorkerManagerChild* AllocPServiceWorkerManagerChild()
      override;

  virtual bool DeallocPServiceWorkerManagerChild(
      PServiceWorkerManagerChild* aActor) override;

  virtual already_AddRefed<dom::cache::PCacheChild> AllocPCacheChild() override;

  virtual already_AddRefed<dom::cache::PCacheStreamControlChild>
  AllocPCacheStreamControlChild() override;

  virtual PMessagePortChild* AllocPMessagePortChild(
      const nsID& aUUID, const nsID& aDestinationUUID,
      const uint32_t& aSequenceID) override;

  virtual bool DeallocPMessagePortChild(PMessagePortChild* aActor) override;

  virtual PWebAuthnTransactionChild* AllocPWebAuthnTransactionChild() override;

  virtual bool DeallocPWebAuthnTransactionChild(
      PWebAuthnTransactionChild* aActor) override;

  already_AddRefed<PServiceWorkerChild> AllocPServiceWorkerChild(
      const IPCServiceWorkerDescriptor&);

  already_AddRefed<PServiceWorkerContainerChild>
  AllocPServiceWorkerContainerChild();

  already_AddRefed<PServiceWorkerRegistrationChild>
  AllocPServiceWorkerRegistrationChild(
      const IPCServiceWorkerRegistrationDescriptor&);

  virtual PEndpointForReportChild* AllocPEndpointForReportChild(
      const nsAString& aGroupName,
      const PrincipalInfo& aPrincipalInfo) override;

  virtual bool DeallocPEndpointForReportChild(
      PEndpointForReportChild* aActor) override;
};

class BackgroundChildImpl::ThreadLocal final {
  friend class mozilla::DefaultDelete<ThreadLocal>;

 public:
  mozilla::UniquePtr<mozilla::dom::indexedDB::ThreadLocal>
      mIndexedDBThreadLocal;
  mozilla::dom::IDBFileHandle* mCurrentFileHandle;

 public:
  ThreadLocal();

 private:
  // Only destroyed by UniquePtr<ThreadLocal>.
  ~ThreadLocal();
};

}  // namespace ipc
}  // namespace mozilla

#endif  // mozilla_ipc_backgroundchildimpl_h__
