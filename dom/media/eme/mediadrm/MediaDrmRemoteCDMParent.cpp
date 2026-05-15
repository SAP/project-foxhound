/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "MediaDrmRemoteCDMParent.h"

#include <limits>

#include "mozilla/CheckedInt.h"
#include "mozilla/EMEUtils.h"
#include "mozilla/RemoteMediaManagerParent.h"

namespace mozilla {

StaticAutoPtr<MediaDrmRemoteCDMParent::DrmCallbackMap>
    MediaDrmRemoteCDMParent::sCbMap;

/* static */
void MediaDrmRemoteCDMParent::InitializeStatics() {
  if (sCbMap) {
    return;
  }

  sCbMap = new DrmCallbackMap();
}

/* static */
void MediaDrmRemoteCDMParent::HandleEventCb(
    AMediaDrm* aDrm, const AMediaDrmSessionId* aSessionId,
    AMediaDrmEventType aEventType, int aExtra, const uint8_t* aData,
    size_t aDataSize) {
  EME_LOG("MediaDrmRemoteCDMParent::HandleEventCb -- drm %p, event %d", aDrm,
          aEventType);

  // Called from an internal NDK thread. We need to dispatch to the owning
  // thread of the actor with the same AMediaDrm object.
  NS_ConvertUTF8toUTF16 sessionIdStr(
      reinterpret_cast<const char*>(aSessionId->ptr), aSessionId->length);

  size_t dataSize = aData ? aDataSize : 0;
  nsTArray<uint8_t> data(dataSize);
  if (dataSize) {
    data.AppendElements(aData, dataSize);
  }

  RemoteMediaManagerParent::Dispatch(NS_NewRunnableFunction(
      __func__,
      [aDrm, aEventType, aExtra, sessionIdStr = std::move(sessionIdStr),
       data = std::move(data)]() mutable {
        auto i = sCbMap->find(aDrm);
        if (i == sCbMap->end()) {
          return;
        }

        i->second->HandleEvent(std::move(sessionIdStr), aEventType, aExtra,
                               std::move(data));
      }));
}

/* static */
void MediaDrmRemoteCDMParent::HandleExpirationUpdateCb(
    AMediaDrm* aDrm, const AMediaDrmSessionId* aSessionId,
    int64_t aExpiryTimeInMS) {
  EME_LOG("MediaDrmRemoteCDMParent::HandleExpirationUpdateCb -- drm %p", aDrm);

  // Called from an internal NDK thread. We need to dispatch to the owning
  // thread of the actor with the same AMediaDrm object.
  NS_ConvertUTF8toUTF16 sessionIdStr(
      reinterpret_cast<const char*>(aSessionId->ptr), aSessionId->length);

  RemoteMediaManagerParent::Dispatch(NS_NewRunnableFunction(
      __func__, [aDrm, aExpiryTimeInMS,
                 sessionIdStr = std::move(sessionIdStr)]() mutable {
        auto i = sCbMap->find(aDrm);
        if (i == sCbMap->end()) {
          return;
        }

        i->second->HandleExpirationUpdate(std::move(sessionIdStr),
                                          aExpiryTimeInMS);
      }));
}

/* static */
void MediaDrmRemoteCDMParent::HandleKeysChangeCb(
    AMediaDrm* aDrm, const AMediaDrmSessionId* aSessionId,
    const AMediaDrmKeyStatus* aKeyStatus, size_t aNumKeys,
    bool aHasNewUsableKey) {
  EME_LOG("MediaDrmRemoteCDMParent::HandleKeysChangeCb -- drm %p", aDrm);

  // Called from an internal NDK thread. We need to dispatch to the owning
  // thread of the actor with the same AMediaDrm object.
  NS_ConvertUTF8toUTF16 sessionIdStr(
      reinterpret_cast<const char*>(aSessionId->ptr), aSessionId->length);

  nsTArray<CDMKeyInfo> keyInfo(aNumKeys);
  if (aKeyStatus) {
    for (size_t i = 0; i < aNumKeys; ++i) {
      nsTArray<uint8_t> keyId(aKeyStatus[i].keyId.ptr,
                              aKeyStatus[i].keyId.length);

      dom::Optional<dom::MediaKeyStatus> keyStatus;
      switch (aKeyStatus[i].keyType) {
        case AMediaKeyStatusType::KEY_STATUS_TYPE_USABLE:
          keyStatus.Construct(dom::MediaKeyStatus::Usable);
          break;
        case AMediaKeyStatusType::KEY_STATUS_TYPE_EXPIRED:
          keyStatus.Construct(dom::MediaKeyStatus::Expired);
          break;
        case AMediaKeyStatusType::KEY_STATUS_TYPE_OUTPUTNOTALLOWED:
          keyStatus.Construct(dom::MediaKeyStatus::Output_restricted);
          break;
        case AMediaKeyStatusType::KEY_STATUS_TYPE_STATUSPENDING:
          keyStatus.Construct(dom::MediaKeyStatus::Status_pending);
          break;
        default:
          MOZ_FALLTHROUGH_ASSERT("Unhandled AMediaKeyStatusType!");
        case AMediaKeyStatusType::KEY_STATUS_TYPE_INTERNALERROR:
          keyStatus.Construct(dom::MediaKeyStatus::Internal_error);
          break;
      }

      keyInfo.AppendElement(CDMKeyInfo(std::move(keyId), std::move(keyStatus)));
    }
  }

  RemoteMediaManagerParent::Dispatch(NS_NewRunnableFunction(
      __func__, [aDrm, aHasNewUsableKey, sessionIdStr = std::move(sessionIdStr),
                 keyInfo = std::move(keyInfo)]() mutable {
        auto i = sCbMap->find(aDrm);
        if (i == sCbMap->end()) {
          return;
        }

        i->second->HandleKeysChange(std::move(sessionIdStr), aHasNewUsableKey,
                                    std::move(keyInfo));
      }));
}

MediaDrmRemoteCDMParent::MediaDrmRemoteCDMParent(const nsAString& aKeySystem)
    : mMutex("MediaDrmRemoteCDMParent::mMutex") {
  EME_LOG("[%p] MediaDrmRemoteCDMParent::MediaDrmRemoteCDMParent", this);
  if (IsWidevineKeySystem(aKeySystem)) {
    mUuid = WIDEVINE_UUID;
  } else if (IsClearkeyKeySystem(aKeySystem)) {
    mUuid = CLEARKEY_UUID;
  }
}

MediaDrmRemoteCDMParent::~MediaDrmRemoteCDMParent() {
  EME_LOG("[%p] MediaDrmRemoteCDMParent::~MediaDrmRemoteCDMParent", this);
  Destroy();
}

void MediaDrmRemoteCDMParent::ActorDestroy(ActorDestroyReason aWhy) {
  EME_LOG("[%p] MediaDrmRemoteCDMParent::ActorDestroy", this);
  Destroy();
}

void MediaDrmRemoteCDMParent::Destroy() {
  EME_LOG("[%p] MediaDrmRemoteCDMParent::Destroy -- drm %p", this, mDrm);

  mProvisionPromise.RejectIfExists(
      MediaResult(NS_ERROR_DOM_ABORT_ERR, "Destroyed"_ns), __func__);

  for (const auto& i : mSessions) {
    AMediaDrm_closeSession(mDrm, &i.second.id);
  }
  mSessions.clear();

  {
    MutexAutoLock lock(mMutex);
    if (mCrypto) {
      mCrypto = nullptr;
      mCryptoSessionId = {};
    }
  }

  if (mDrm) {
    auto i = sCbMap->find(mDrm);
    if (i != sCbMap->end()) {
      sCbMap->erase(i);
    } else {
      MOZ_ASSERT_UNREACHABLE("Missing MediaDrm in sCbMap");
    }
    AMediaDrm_release(mDrm);
    mDrm = nullptr;
  }
}

mozilla::ipc::IPCResult MediaDrmRemoteCDMParent::RecvInit(
    const RemoteCDMInitRequestIPDL& request, InitResolver&& aResolver) {
  EME_LOG("[%p] MediaDrmRemoteCDMParent::RecvInit", this);

  if (NS_WARN_IF(!mUuid)) {
    aResolver(MediaResult(NS_ERROR_DOM_INVALID_STATE_ERR, "Invalid uuid"_ns));
    return IPC_OK();
  }

  if (NS_WARN_IF(mDrm)) {
    aResolver(MediaResult(NS_ERROR_DOM_INVALID_STATE_ERR,
                          "AMediaDrm already initialized"_ns));
    return IPC_OK();
  }

  if (NS_WARN_IF(!AMediaCrypto_isCryptoSchemeSupported(mUuid))) {
    aResolver(MediaResult(NS_ERROR_DOM_INVALID_STATE_ERR,
                          "AMediaCrypto_isCryptoSchemeSupported failed"_ns));
    return IPC_OK();
  }

  mDrm = AMediaDrm_createByUUID(mUuid);
  if (NS_WARN_IF(!mDrm)) {
    aResolver(MediaResult(NS_ERROR_DOM_INVALID_STATE_ERR,
                          "AMediaDrm_createByUUID failed"_ns));
    return IPC_OK();
  }

  media_status_t status =
      AMediaDrm_setPropertyString(mDrm, "securityLevel", "L3");
  if (NS_WARN_IF(status != AMEDIA_OK)) {
    aResolver(MediaResult(
        NS_ERROR_DOM_INVALID_STATE_ERR,
        RESULT_DETAIL("AMediaDrm_setPropertyString securityLevel failed %d",
                      status)));
    return IPC_OK();
  }

  status = AMediaDrm_setPropertyString(mDrm, "privacyMode", "enable");
  if (NS_WARN_IF(status != AMEDIA_OK)) {
    aResolver(MediaResult(
        NS_ERROR_DOM_INVALID_STATE_ERR,
        RESULT_DETAIL("AMediaDrm_setPropertyString privateMode failed %d",
                      status)));
    return IPC_OK();
  }

  status = AMediaDrm_setPropertyString(mDrm, "sessionSharing", "enable");
  if (NS_WARN_IF(status != AMEDIA_OK)) {
    aResolver(MediaResult(
        NS_ERROR_DOM_INVALID_STATE_ERR,
        RESULT_DETAIL("AMediaDrm_setPropertyString sessionSharing failed %d",
                      status)));
    return IPC_OK();
  }

  status = AMediaDrm_setOnEventListener(mDrm, HandleEventCb);
  if (NS_WARN_IF(status != AMEDIA_OK)) {
    aResolver(MediaResult(
        NS_ERROR_DOM_INVALID_STATE_ERR,
        RESULT_DETAIL("AMediaDrm_setOnEventListener failed %d", status)));
    return IPC_OK();
  }

  if (__builtin_available(android 29, *)) {
    status =
        AMediaDrm_setOnExpirationUpdateListener(mDrm, HandleExpirationUpdateCb);
    if (NS_WARN_IF(status != AMEDIA_OK)) {
      aResolver(MediaResult(
          NS_ERROR_DOM_INVALID_STATE_ERR,
          RESULT_DETAIL("AMediaDrm_setOnExpirationUpdateListener failed %d",
                        status)));
      return IPC_OK();
    }

    status = AMediaDrm_setOnKeysChangeListener(mDrm, HandleKeysChangeCb);
    if (NS_WARN_IF(status != AMEDIA_OK)) {
      aResolver(MediaResult(
          NS_ERROR_DOM_INVALID_STATE_ERR,
          RESULT_DETAIL("AMediaDrm_setOnKeysChangeListener failed %d",
                        status)));
      return IPC_OK();
    }
  }

  EME_LOG("[%p] MediaDrmRemoteCDMParent::RecvInit -- drm %p", this, mDrm);
  InitializeStatics();
  sCbMap->insert(std::pair{mDrm, this});
  aResolver(MediaResult(NS_OK));

  EnsureHasAMediaCrypto();
  return IPC_OK();
}

RefPtr<MediaDrmRemoteCDMParent::InternalPromise>
MediaDrmRemoteCDMParent::EnsureHasAMediaCrypto() {
  if (NS_WARN_IF(!mDrm)) {
    return InternalPromise::CreateAndReject(
        MediaResult(NS_ERROR_DOM_INVALID_STATE_ERR, "Missing AMediaDrm"_ns),
        __func__);
  }

  if (HasCrypto()) {
    return InternalPromise::CreateAndResolve(true, __func__);
  }

  if (mCryptoError) {
    return InternalPromise::CreateAndReject(*mCryptoError, __func__);
  }

  EME_LOG("[%p] MediaDrmRemoteCDMParent::EnsureHasAMediaCrypto -- open session",
          this);

  media_status_t status = AMediaDrm_openSession(mDrm, &mCryptoSessionId);
  if (status == AMEDIA_DRM_NOT_PROVISIONED) {
    return EnsureProvisioned()->Then(
        GetCurrentSerialEventTarget(), __func__,
        [self = RefPtr{this}](const InternalPromise::ResolveOrRejectValue&) {
          return self->EnsureHasAMediaCrypto();
        });
  }

  if (NS_WARN_IF(status != AMEDIA_OK)) {
    mCryptoError.emplace(
        NS_ERROR_DOM_INVALID_STATE_ERR,
        RESULT_DETAIL("AMediaDrm_openSession failed for crypto %d", status));
    return InternalPromise::CreateAndReject(*mCryptoError, __func__);
  }

  AMediaCrypto* crypto =
      AMediaCrypto_new(mUuid, mCryptoSessionId.ptr, mCryptoSessionId.length);
  if (NS_WARN_IF(!crypto)) {
    AMediaDrm_closeSession(mDrm, &mCryptoSessionId);
    mCryptoSessionId = {};
    mCryptoError.emplace(NS_ERROR_DOM_INVALID_STATE_ERR,
                         "AMediaCrypto_new failed"_ns);
    return InternalPromise::CreateAndReject(*mCryptoError, __func__);
  }

  MutexAutoLock lock(mMutex);
  mCrypto = MakeRefPtr<MediaDrmCrypto>(crypto);
  return InternalPromise::CreateAndResolve(true, __func__);
}

RefPtr<MediaDrmRemoteCDMParent::InternalPromise>
MediaDrmRemoteCDMParent::EnsureProvisioned() {
  if (NS_WARN_IF(!mDrm)) {
    return InternalPromise::CreateAndReject(
        MediaResult(NS_ERROR_DOM_INVALID_STATE_ERR, "Missing AMediaDrm"_ns),
        __func__);
  }

  if (mProvisionError) {
    return InternalPromise::CreateAndReject(*mProvisionError, __func__);
  }

  // There may already be a provision request outstanding.
  bool outstanding = !mProvisionPromise.IsEmpty();
  RefPtr<InternalPromise> p = mProvisionPromise.Ensure(__func__);
  if (outstanding) {
    return p.forget();
  }

  EME_LOG("[%p] MediaDrmRemoteCDMParent::EnsureProvisioned -- get request",
          this);

  // AMediaDrm_getProvisionRequest requires the size to be non-zero. It does not
  // use the value for anything besides verification and overwrites in the
  // success case.
  size_t provisionRequestSize = std::numeric_limits<size_t>::max();
  const uint8_t* provisionRequest = nullptr;
  const char* serverUrl = nullptr;
  media_status_t status = AMediaDrm_getProvisionRequest(
      mDrm, &provisionRequest, &provisionRequestSize, &serverUrl);
  if (NS_WARN_IF(status != AMEDIA_OK)) {
    EME_LOG(
        "[%p] MediaDrmRemoteCDMParent::EnsureProvisioned -- failed drm %p "
        "provisionRequest %p size %zu serverUrl %p (%s) status %d",
        this, mDrm, provisionRequest, provisionRequestSize, serverUrl,
        serverUrl ? serverUrl : "", status);
    mProvisionError.emplace(
        NS_ERROR_DOM_INVALID_STATE_ERR,
        RESULT_DETAIL("AMediaDrm_getProvisionRequest failed %d", status));
    mProvisionPromise.Reject(*mProvisionError, __func__);
    return p.forget();
  }

  SendProvision(RemoteCDMProvisionRequestIPDL(
                    NS_ConvertUTF8toUTF16(serverUrl),
                    nsTArray<uint8_t>(provisionRequest, provisionRequestSize)))
      ->Then(
          GetCurrentSerialEventTarget(), __func__,
          [self = RefPtr{this}](RemoteCDMProvisionResponseIPDL&& aResponse) {
            if (aResponse.type() ==
                RemoteCDMProvisionResponseIPDL::TMediaResult) {
              EME_LOG(
                  "[%p] MediaDrmRemoteCDMParent::EnsureProvisioned -- response "
                  "failed",
                  self.get());
              self->mProvisionError.emplace(
                  std::move(aResponse.get_MediaResult()));
              self->mProvisionPromise.RejectIfExists(*self->mProvisionError,
                                                     __func__);
              return;
            }

            media_status_t status = AMediaDrm_provideProvisionResponse(
                self->mDrm, aResponse.get_ArrayOfuint8_t().Elements(),
                aResponse.get_ArrayOfuint8_t().Length());
            if (NS_WARN_IF(status != AMEDIA_OK)) {
              EME_LOG(
                  "[%p] MediaDrmRemoteCDMParent::EnsureProvisioned -- response "
                  "invalid",
                  self.get());
              self->mProvisionError.emplace(
                  NS_ERROR_DOM_INVALID_STATE_ERR,
                  RESULT_DETAIL("AMediaDrm_provideProvisionResponse failed %d",
                                status));
              self->mProvisionPromise.RejectIfExists(*self->mProvisionError,
                                                     __func__);
              return;
            }

            EME_LOG(
                "[%p] MediaDrmRemoteCDMParent::EnsureProvisioned -- success",
                self.get());
            self->mProvisionPromise.ResolveIfExists(true, __func__);
          },
          [](const mozilla::ipc::ResponseRejectReason& aReason) {});
  return p.forget();
}

mozilla::ipc::IPCResult MediaDrmRemoteCDMParent::RecvCreateSession(
    RemoteCDMCreateSessionRequestIPDL&& aRequest,
    CreateSessionResolver&& aResolver) {
  EME_LOG("[%p] MediaDrmRemoteCDMParent::RecvCreateSession", this);

  // If we are still provisioning, then the remote side should have queued the
  // requests.
  if (NS_WARN_IF(!mDrm)) {
    aResolver(
        MediaResult(NS_ERROR_DOM_INVALID_STATE_ERR, "Missing AMediaDrm"_ns));
    return IPC_OK();
  }

  if (!HasCrypto()) {
    EnsureHasAMediaCrypto()->Then(
        GetCurrentSerialEventTarget(), __func__,
        [self = RefPtr{this}, request = std::move(aRequest),
         resolver = std::move(aResolver)](
            const InternalPromise::ResolveOrRejectValue& aValue) mutable {
          if (aValue.IsReject()) {
            resolver(aValue.RejectValue());
            return;
          }

          self->RecvCreateSession(std::move(request), std::move(resolver));
        });
    return IPC_OK();
  }

  AMediaDrmSessionId sessionId;
  media_status_t status = AMediaDrm_openSession(mDrm, &sessionId);
  if (status == AMEDIA_DRM_NOT_PROVISIONED) {
    EnsureProvisioned()->Then(
        GetCurrentSerialEventTarget(), __func__,
        [self = RefPtr{this}, request = std::move(aRequest),
         resolver = std::move(aResolver)](
            const InternalPromise::ResolveOrRejectValue& aValue) mutable {
          if (aValue.IsReject()) {
            resolver(aValue.RejectValue());
            return;
          }

          self->RecvCreateSession(std::move(request), std::move(resolver));
        });
    return IPC_OK();
  }

  if (NS_WARN_IF(status != AMEDIA_OK)) {
    aResolver(
        MediaResult(NS_ERROR_DOM_INVALID_STATE_ERR,
                    RESULT_DETAIL("AMediaDrm_openSession failed %d", status)));
    return IPC_OK();
  }

  NS_ConvertUTF16toUTF8 mimeType(aRequest.initDataType());

  const uint8_t* keyRequest = nullptr;
  size_t keyRequestSize = 0;
  status =
      AMediaDrm_getKeyRequest(mDrm, &sessionId, aRequest.initData().Elements(),
                              aRequest.initData().Length(), mimeType.get(),
                              AMediaDrmKeyType::KEY_TYPE_STREAMING, nullptr, 0,
                              &keyRequest, &keyRequestSize);

  if (status == AMEDIA_DRM_NOT_PROVISIONED) {
    AMediaDrm_closeSession(mDrm, &sessionId);
    EnsureProvisioned()->Then(
        GetCurrentSerialEventTarget(), __func__,
        [self = RefPtr{this}, request = std::move(aRequest),
         resolver = std::move(aResolver)](
            const InternalPromise::ResolveOrRejectValue& aValue) mutable {
          if (aValue.IsReject()) {
            resolver(aValue.RejectValue());
            return;
          }

          self->RecvCreateSession(std::move(request), std::move(resolver));
        });
    return IPC_OK();
  }

  if (NS_WARN_IF(status != AMEDIA_OK)) {
    AMediaDrm_closeSession(mDrm, &sessionId);
    aResolver(MediaResult(
        NS_ERROR_DOM_INVALID_STATE_ERR,
        RESULT_DETAIL("AMediaDrm_getKeyRequest failed %d", status)));
    return IPC_OK();
  }

  NS_ConvertUTF8toUTF16 sessionIdStr(
      reinterpret_cast<const char*>(sessionId.ptr), sessionId.length);
  mSessions[sessionIdStr] = {sessionId, std::move(mimeType)};
  aResolver(RemoteCDMKeyMessageIPDL(
      std::move(sessionIdStr), MediaKeyMessageType::License_request,
      nsTArray<uint8_t>(reinterpret_cast<const uint8_t*>(keyRequest),
                        keyRequestSize)));
  return IPC_OK();
}

mozilla::ipc::IPCResult MediaDrmRemoteCDMParent::RecvLoadSession(
    const RemoteCDMLoadSessionRequestIPDL& aRequest,
    LoadSessionResolver&& aResolver) {
  EME_LOG("[%p] MediaDrmRemoteCDMParent::RecvLoadSession", this);
  aResolver(MediaResult(NS_ERROR_NOT_IMPLEMENTED));
  return IPC_OK();
}

mozilla::ipc::IPCResult MediaDrmRemoteCDMParent::RecvUpdateSession(
    const RemoteCDMUpdateSessionRequestIPDL& aRequest,
    UpdateSessionResolver&& aResolver) {
  EME_LOG("[%p] MediaDrmRemoteCDMParent::RecvUpdateSession", this);

  const auto i = mSessions.find(aRequest.sessionId());
  if (i == mSessions.end()) {
    aResolver(
        MediaResult(NS_ERROR_DOM_INVALID_STATE_ERR, "Invalid session id"_ns));
    return IPC_OK();
  }

  MOZ_ASSERT(mDrm);
  MOZ_ASSERT(HasCrypto());

  AMediaDrmKeySetId keySetId{};
  media_status_t status = AMediaDrm_provideKeyResponse(
      mDrm, &i->second.id, aRequest.response().Elements(),
      aRequest.response().Length(), &keySetId);
  if (NS_WARN_IF(status != AMEDIA_OK)) {
    aResolver(MediaResult(
        NS_ERROR_DOM_INVALID_STATE_ERR,
        RESULT_DETAIL("AMediaDrm_provideKeyResponse failed %d", status)));
    return IPC_OK();
  }

  aResolver(MediaResult(NS_OK));
  return IPC_OK();
}

mozilla::ipc::IPCResult MediaDrmRemoteCDMParent::RecvRemoveSession(
    const nsString& aSessionId, RemoveSessionResolver&& aResolver) {
  EME_LOG("[%p] MediaDrmRemoteCDMParent::RecvRemoveSession", this);
  aResolver(MediaResult(NS_ERROR_NOT_IMPLEMENTED));
  return IPC_OK();
}

mozilla::ipc::IPCResult MediaDrmRemoteCDMParent::RecvCloseSession(
    const nsString& aSessionId, CloseSessionResolver&& aResolver) {
  const auto i = mSessions.find(aSessionId);
  if (i == mSessions.end()) {
    EME_LOG("[%p] MediaDrmRemoteCDMParent::RecvCloseSession -- invalid session",
            this);
    aResolver(
        MediaResult(NS_ERROR_DOM_INVALID_STATE_ERR, "Invalid session id"_ns));
    return IPC_OK();
  }

  MOZ_ASSERT(mDrm);
  MOZ_ASSERT(HasCrypto());

  EME_LOG("[%p] MediaDrmRemoteCDMParent::RecvCloseSession -- closeSession",
          this);
  media_status_t status = AMediaDrm_closeSession(mDrm, &i->second.id);
  EME_LOG("[%p] MediaDrmRemoteCDMParent::RecvCloseSession -- status %d", this,
          status);
  if (NS_WARN_IF(status != AMEDIA_OK)) {
    aResolver(
        MediaResult(NS_ERROR_DOM_INVALID_STATE_ERR,
                    RESULT_DETAIL("AMediaDrm_closeSession failed %d", status)));
  } else {
    aResolver(MediaResult(NS_OK));
  }

  mSessions.erase(i);
  return IPC_OK();
}

mozilla::ipc::IPCResult MediaDrmRemoteCDMParent::RecvSetServerCertificate(
    mozilla::Span<uint8_t const> aCertificate,
    SetServerCertificateResolver&& aResolver) {
  if (NS_WARN_IF(!mDrm)) {
    EME_LOG(
        "[%p] MediaDrmRemoteCDMParent::RecvSetServerCertificate -- not init",
        this);
    aResolver(
        MediaResult(NS_ERROR_DOM_INVALID_STATE_ERR, "Missing AMediaDrm"_ns));
    return IPC_OK();
  }

  EME_LOG(
      "[%p] MediaDrmRemoteCDMParent::RecvSetServerCertificate -- "
      "setPropertyByteArray",
      this);
  media_status_t status = AMediaDrm_setPropertyByteArray(
      mDrm, "certificate", aCertificate.Elements(), aCertificate.Length());
  EME_LOG("[%p] MediaDrmRemoteCDMParent::RecvSetServerCertificate -- status %d",
          this, status);
  if (NS_WARN_IF(status != AMEDIA_OK)) {
    aResolver(MediaResult(
        NS_ERROR_DOM_INVALID_STATE_ERR,
        RESULT_DETAIL("AMediaDrm_setPropertyByteArray certificate failed %d",
                      status)));
    return IPC_OK();
  }

  aResolver(MediaResult(NS_OK));
  return IPC_OK();
}

void MediaDrmRemoteCDMParent::HandleEvent(nsString&& aSessionId,
                                          AMediaDrmEventType aEventType,
                                          int aExtra,
                                          nsTArray<uint8_t>&& aData) {
  const auto i = mSessions.find(aSessionId);
  if (i == mSessions.end()) {
    EME_LOG("[%p] MediaDrmRemoteCDMParent::HandleEvent -- session not found",
            this);
    return;
  }

  EME_LOG("[%p] MediaDrmRemoteCDMParent::HandleEvent -- event %d", this,
          aEventType);
  MOZ_ASSERT(mDrm);

  switch (aEventType) {
    case AMediaDrmEventType::EVENT_PROVISION_REQUIRED:
      EnsureProvisioned();
      break;
    case AMediaDrmEventType::EVENT_KEY_REQUIRED: {
      const uint8_t* keyRequest = nullptr;
      size_t keyRequestSize = 0;
      AMediaDrmKeyRequestType keyRequestType =
          AMediaDrmKeyRequestType::KEY_REQUEST_TYPE_INITIAL;
      media_status_t status;

      if (__builtin_available(android 33, *)) {
        status = AMediaDrm_getKeyRequestWithDefaultUrlAndType(
            mDrm, &i->second.id, aData.Elements(), aData.Length(),
            i->second.mimeType.get(), AMediaDrmKeyType::KEY_TYPE_STREAMING,
            nullptr, 0, &keyRequest, &keyRequestSize, nullptr, &keyRequestType);
      } else {
        status = AMediaDrm_getKeyRequest(
            mDrm, &i->second.id, aData.Elements(), aData.Length(),
            i->second.mimeType.get(), AMediaDrmKeyType::KEY_TYPE_STREAMING,
            nullptr, 0, &keyRequest, &keyRequestSize);
      }

      if (status == AMEDIA_DRM_NOT_PROVISIONED) {
        EnsureProvisioned()->Then(
            GetCurrentSerialEventTarget(), __func__,
            [self = RefPtr{this}, sessionId = std::move(aSessionId),
             data = std::move(aData), aEventType, aExtra](
                const InternalPromise::ResolveOrRejectValue& aValue) mutable {
              if (aValue.IsReject()) {
                return;
              }

              self->HandleEvent(std::move(sessionId), aEventType, aExtra,
                                std::move(data));
            });
        return;
      }

      if (NS_WARN_IF(status != AMEDIA_OK)) {
        return;
      }

      dom::MediaKeyMessageType keyMessageType;
      switch (keyRequestType) {
        case AMediaDrmKeyRequestType::KEY_REQUEST_TYPE_NONE:
          // Already have what we need.
          return;
        case AMediaDrmKeyRequestType::KEY_REQUEST_TYPE_RELEASE:
          keyMessageType = MediaKeyMessageType::License_release;
          break;
        case AMediaDrmKeyRequestType::KEY_REQUEST_TYPE_RENEWAL:
          keyMessageType = MediaKeyMessageType::License_renewal;
          break;
        case AMediaDrmKeyRequestType::KEY_REQUEST_TYPE_UPDATE:
          // Not directly equivalent but needs an additional license request.
          keyMessageType = MediaKeyMessageType::License_request;
          break;
        default:
          MOZ_FALLTHROUGH_ASSERT("Unhandled AMediaDrmKeyRequestType");
        case AMediaDrmKeyRequestType::KEY_REQUEST_TYPE_INITIAL:
          keyMessageType = MediaKeyMessageType::License_request;
          break;
      }

      (void)SendOnSessionKeyMessage(RemoteCDMKeyMessageIPDL(
          std::move(aSessionId), keyMessageType,
          nsTArray<uint8_t>(reinterpret_cast<const uint8_t*>(keyRequest),
                            keyRequestSize)));
    } break;
    case AMediaDrmEventType::EVENT_KEY_EXPIRED:
      break;
    case AMediaDrmEventType::EVENT_VENDOR_DEFINED:
      break;
    case AMediaDrmEventType::EVENT_SESSION_RECLAIMED:
      break;
    default:
      break;
  }
}

void MediaDrmRemoteCDMParent::HandleExpirationUpdate(nsString&& aSessionId,
                                                     int64_t aExpiryTimeInMS) {
  const auto i = mSessions.find(aSessionId);
  if (i == mSessions.end()) {
    EME_LOG(
        "[%p] MediaDrmRemoteCDMParent::HandleExpirationUpdate -- session not "
        "found",
        this);
    return;
  }

  EME_LOG("[%p] MediaDrmRemoteCDMParent::HandleExpirationUpdate", this);
  (void)SendOnSessionKeyExpiration(RemoteCDMKeyExpirationIPDL(
      std::move(aSessionId), static_cast<double>(aExpiryTimeInMS)));
}

void MediaDrmRemoteCDMParent::HandleKeysChange(
    nsString&& aSessionId, bool aHasNewUsableKey,
    nsTArray<CDMKeyInfo>&& aKeyInfo) {
  const auto i = mSessions.find(aSessionId);
  if (i == mSessions.end()) {
    EME_LOG(
        "[%p] MediaDrmRemoteCDMParent::HandleKeysChange -- session not found",
        this);
    return;
  }

  EME_LOG("[%p] MediaDrmRemoteCDMParent::HandleKeysChange", this);
  (void)SendOnSessionKeyStatus(
      RemoteCDMKeyStatusIPDL(std::move(aSessionId), std::move(aKeyInfo)));
}

already_AddRefed<MediaDrmCryptoInfo> MediaDrmRemoteCDMParent::CreateCryptoInfo(
    MediaRawData* aSample) {
  MOZ_ASSERT(mDrm);

  if (NS_WARN_IF(!aSample)) {
    return nullptr;
  }

  const CryptoSample& cryptoObj = aSample->mCrypto;
  if (!cryptoObj.IsEncrypted()) {
    return nullptr;
  }

  uint32_t numSubSamples = std::min<uint32_t>(
      cryptoObj.mPlainSizes.Length(), cryptoObj.mEncryptedSizes.Length());
  MOZ_ASSERT(numSubSamples <= INT32_MAX);

  // Deep copy the plain and encrypted sizes so we can modify them.
  nsTArray<size_t> plainSizes(cryptoObj.mPlainSizes.Length());
  nsTArray<size_t> encryptedSizes(cryptoObj.mEncryptedSizes.Length());
  if (numSubSamples > 0) {
    uint32_t totalSubSamplesSize = 0;
    for (const auto& size : cryptoObj.mPlainSizes) {
      plainSizes.AppendElement(size);
      totalSubSamplesSize += size;
    }
    for (const auto& size : cryptoObj.mEncryptedSizes) {
      encryptedSizes.AppendElement(size);
      totalSubSamplesSize += size;
    }

    auto codecSpecificDataSize =
        CheckedInt<size_t>(aSample->Size()) - totalSubSamplesSize;
    if (!codecSpecificDataSize.isValid()) {
      MOZ_ASSERT_UNREACHABLE("totalSubSamplesSize greater than sample size");
      return nullptr;
    }

    // Size of codec specific data("CSD") for Android java::sdk::MediaCodec
    // usage should be included in the 1st plain size if it exists.
    if (codecSpecificDataSize.value() && !plainSizes.IsEmpty()) {
      // This shouldn't overflow as the the plain size should be UINT16_MAX at
      // most, and the CSD should never be that large. Checked int acts like a
      // diagnostic assert here to help catch if we ever have insane inputs.
      auto newLeadingPlainSize = codecSpecificDataSize + plainSizes[0];
      if (!newLeadingPlainSize.isValid()) {
        MOZ_ASSERT_UNREACHABLE("newLeadingPlainSize overflowed");
        return nullptr;
      }
      plainSizes[0] = newLeadingPlainSize.value();
    }
  } else {
    // MediaCodec expects us to provide at least one subsample. Whole-block full
    // sample encryption does not carry subsample information, so we need to
    // synthesize it by creating a subsample as big as the sample itself. See
    // bug 1759936.
    numSubSamples = 1;
    plainSizes.AppendElement(0);
    encryptedSizes.AppendElement(aSample->Size());
  }

  const CopyableTArray<uint8_t>* srcIV;
  cryptoinfo_mode_t mode;
  switch (cryptoObj.mCryptoScheme) {
    case CryptoScheme::None:
      mode = AMEDIACODECRYPTOINFO_MODE_CLEAR;
      srcIV = &cryptoObj.mIV;
      break;
    case CryptoScheme::Cenc:
      mode = AMEDIACODECRYPTOINFO_MODE_AES_CTR;
      srcIV = &cryptoObj.mIV;
      break;
    case CryptoScheme::Cbcs:
    case CryptoScheme::Cbcs_1_9:
      mode = AMEDIACODECRYPTOINFO_MODE_AES_CBC;
      srcIV = &cryptoObj.mConstantIV;
      break;
    default:
      MOZ_ASSERT_UNREACHABLE("Unhandled CryptoScheme!");
      return nullptr;
  }

  uint8_t key[16] = {};
  uint8_t iv[16] = {};

  if (NS_WARN_IF(srcIV->Length() > sizeof(iv))) {
    MOZ_ASSERT_UNREACHABLE("IV too big for Android!");
    return nullptr;
  }

  if (NS_WARN_IF(cryptoObj.mKeyId.Length() > sizeof(key))) {
    MOZ_ASSERT_UNREACHABLE("Key too big for Android!");
    return nullptr;
  }

  if (!srcIV->IsEmpty()) {
    memcpy(iv, srcIV->Elements(), srcIV->Length());
  }

  if (!cryptoObj.mKeyId.IsEmpty()) {
    memcpy(key, cryptoObj.mKeyId.Elements(), cryptoObj.mKeyId.Length());
  }

  AMediaCodecCryptoInfo* cryptoInfo = AMediaCodecCryptoInfo_new(
      static_cast<int32_t>(numSubSamples), key, iv, mode, plainSizes.Elements(),
      encryptedSizes.Elements());
  if (NS_WARN_IF(!cryptoInfo)) {
    MOZ_ASSERT_UNREACHABLE("Failed to create AMediaCodecCryptoInfo");
    return nullptr;
  }

  if (mode == AMEDIACODECRYPTOINFO_MODE_AES_CBC) {
    cryptoinfo_pattern_t pattern = {};
    pattern.encryptBlocks = cryptoObj.mCryptByteBlock;
    pattern.skipBlocks = cryptoObj.mSkipByteBlock;
    AMediaCodecCryptoInfo_setPattern(cryptoInfo, &pattern);
  }

  return MakeAndAddRef<MediaDrmCryptoInfo>(cryptoInfo);
}

MediaDrmCrypto::~MediaDrmCrypto() { AMediaCrypto_delete(mCrypto); }

MediaDrmCryptoInfo::~MediaDrmCryptoInfo() {
  AMediaCodecCryptoInfo_delete(mCryptoInfo);
}

}  // namespace mozilla
