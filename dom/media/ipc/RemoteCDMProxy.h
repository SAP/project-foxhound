/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#ifndef include_dom_media_ipc_RemoteCDMProxy_h
#define include_dom_media_ipc_RemoteCDMProxy_h

#include "mozilla/Atomics.h"
#include "mozilla/CDMProxy.h"
#include "mozilla/PRemoteCDMActor.h"
#include "mozilla/RemoteCDMChild.h"
#include "mozilla/RemoteMediaManagerChild.h"

namespace mozilla {

/**
 * This class implements the content process actor for managing CDM instances in
 * a remote process performing the decoding/decrypting. It is created via
 * RemoteMediaManagerChild::CreateCDM. It destroys itself when there is a single
 * reference left (the IPDL reference to the actor). The CDMProxy methods are
 * threadsafe and dispatch to the RemoteMediaManagerChild IPDL thread.
 *
 * To provide a remote implementation in another process, one must subclass
 * RemoteCDMParent and ensure the correct actor class is created in
 * RemoteMediaManagerParent::AllocPRemoteCDMParent.
 *
 * Remote decoders are supplied the PRemoteCDMActor pointer for encrypted media,
 * which they can integrate with depending on the particular CDM API.
 */
class RemoteCDMProxy final : public PRemoteCDMActor, public CDMProxy {
 public:
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(RemoteCDMProxy, final);

  RemoteCDMProxy(nsCOMPtr<nsISerialEventTarget>&& aThread,
                 RefPtr<GenericNonExclusivePromise>&& aIPDLPromise,
                 RemoteMediaIn aLocation, dom::MediaKeys* aKeys,
                 const nsAString& aKeySystem,
                 bool aDistinctiveIdentifierRequired,
                 bool aPersistentStateRequired);

  nsISerialEventTarget* GetManagerThread() const { return mThread; }

  // Called by RemoteCDMChild
  void OnProvision(const RemoteCDMProvisionRequestIPDL& aRequest,
                   PRemoteCDMChild::ProvisionResolver&& aResolver);
  void OnSessionKeyStatus(const RemoteCDMKeyStatusIPDL& aMsg);
  void OnSessionKeyExpiration(RemoteCDMKeyExpirationIPDL&& aMsg);
  void OnSessionKeyMessage(RemoteCDMKeyMessageIPDL&& aMsg);

  // CDMProxy
  void Init(PromiseId aPromiseId, const nsAString& aOrigin,
            const nsAString& aTopLevelOrigin, const nsAString& aName) override;
  void CreateSession(uint32_t aCreateSessionToken,
                     dom::MediaKeySessionType aSessionType,
                     PromiseId aPromiseId, const nsAString& aInitDataType,
                     nsTArray<uint8_t>& aInitData) override;
  void LoadSession(PromiseId aPromiseId, dom::MediaKeySessionType aSessionType,
                   const nsAString& aSessionId) override;
  void SetServerCertificate(PromiseId aPromiseId,
                            nsTArray<uint8_t>& aCert) override;
  void UpdateSession(const nsAString& aSessionId, PromiseId aPromiseId,
                     nsTArray<uint8_t>& aResponse) override;
  void CloseSession(const nsAString& aSessionId, PromiseId aPromiseId) override;
  void RemoveSession(const nsAString& aSessionId,
                     PromiseId aPromiseId) override;
  void QueryOutputProtectionStatus() override;
  void NotifyOutputProtectionStatus(
      OutputProtectionCheckStatus aCheckStatus,
      OutputProtectionCaptureStatus aCaptureStatus) override;
  void Shutdown() override;
  void Terminated() override;
  void OnSetSessionId(uint32_t aCreateSessionToken,
                      const nsAString& aSessionId) override;
  void OnResolveLoadSessionPromise(uint32_t aPromiseId, bool aSuccess) override;
  void OnSessionMessage(const nsAString& aSessionId,
                        dom::MediaKeyMessageType aMessageType,
                        const nsTArray<uint8_t>& aMessage) override;
  void OnExpirationChange(const nsAString& aSessionId,
                          UnixTime aExpiryTime) override;
  void OnSessionClosed(const nsAString& aSessionId,
                       dom::MediaKeySessionClosedReason aReason) override;
  void OnSessionError(const nsAString& aSessionId, nsresult aException,
                      uint32_t aSystemCode, const nsAString& aMsg) override;
  void OnRejectPromise(uint32_t aPromiseId, ErrorResult&& aException,
                       const nsCString& aMsg) override;
  RefPtr<DecryptPromise> Decrypt(MediaRawData* aSample) override;
  void OnDecrypted(uint32_t aId, DecryptStatus aResult,
                   const nsTArray<uint8_t>& aDecryptedData) override;
  void RejectPromise(PromiseId aId, ErrorResult&& aException,
                     const nsCString& aReason) override;
  void ResolvePromise(PromiseId aId) override;
  void OnKeyStatusesChange(const nsAString& aSessionId) override;
  void GetStatusForPolicy(PromiseId aPromiseId,
                          const dom::HDCPVersion& aMinHdcpVersion) override;
#ifdef DEBUG
  bool IsOnOwnerThread() override;
#endif
  RemoteCDMProxy* AsRemoteCDMProxy() final { return this; }

  // PRemoteCDMActor
  PRemoteCDMChild* AsPRemoteCDMChild() final { return mChild; }
  RemoteMediaIn GetLocation() const final { return mLocation; }

 private:
  virtual ~RemoteCDMProxy();

  void InitInternal(PromiseId aPromiseId, const nsCString& aOriginID);
  void RejectPromise(PromiseId aId, const MediaResult& aResult);
  void ResolveOrRejectPromise(PromiseId aId, const MediaResult& aResult);
  void Destroy();

  const RefPtr<RemoteCDMChild> mChild;
  const nsCOMPtr<nsISerialEventTarget> mThread;
  RefPtr<GenericNonExclusivePromise> mIPDLPromise;
  const RemoteMediaIn mLocation;
  Atomic<bool> mNeedsShutdown{true};
};

}  // namespace mozilla

#endif  // include_dom_media_ipc_RemoteCDMProxy_h
