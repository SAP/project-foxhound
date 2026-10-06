/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "GMPStorageParent.h"

#include "GMPParent.h"
#include "gmp-storage.h"

namespace mozilla {

#ifdef LOG
#  undef LOG
#endif

extern LogModule* GetGMPLog();

#define LOGD(...)                                    \
  MOZ_LOG_FMT(GetGMPLog(), mozilla::LogLevel::Debug, \
              MOZ_LOG_EXPAND_ARGS __VA_ARGS__)
#define LOG(level, ...) \
  MOZ_LOG_FMT(GetGMPLog(), (level), MOZ_LOG_EXPAND_ARGS __VA_ARGS__)

namespace gmp {

GMPStorageParent::GMPStorageParent(const nsACString& aNodeId,
                                   GMPParent* aPlugin)
    : mNodeId(aNodeId), mPlugin(aPlugin), mShutdown(true) {}

nsresult GMPStorageParent::Init() {
  LOGD(("GMPStorageParent[{}]::Init()", fmt::ptr(this)));

  if (NS_WARN_IF(mNodeId.IsEmpty())) {
    return NS_ERROR_FAILURE;
  }
  RefPtr<GeckoMediaPluginServiceParent> mps(
      GeckoMediaPluginServiceParent::GetSingleton());
  if (NS_WARN_IF(!mps)) {
    return NS_ERROR_FAILURE;
  }

  bool persistent = false;
  if (NS_WARN_IF(
          NS_FAILED(mps->IsPersistentStorageAllowed(mNodeId, &persistent)))) {
    return NS_ERROR_FAILURE;
  }
  if (persistent) {
    mStorage = CreateGMPDiskStorage(mNodeId, mPlugin->GetPluginBaseName());
  } else {
    mStorage = mps->GetMemoryStorageFor(mNodeId, mPlugin->GetPluginBaseName());
  }
  if (!mStorage) {
    return NS_ERROR_FAILURE;
  }

  LOGD(("GMPStorageParent[{}]::Init succeeded, nodeId={}, persistent={}",
        fmt::ptr(this), mNodeId.get(), persistent));
  mShutdown = false;
  return NS_OK;
}

mozilla::ipc::IPCResult GMPStorageParent::RecvOpen(
    const nsACString& aRecordName) {
  LOGD(("GMPStorageParent[{}]::RecvOpen(record='{}')", fmt::ptr(this),
        PromiseFlatCString(aRecordName).get()));

  if (mShutdown) {
    // Shutdown is an expected state, so we do not IPC_FAIL.
    return IPC_OK();
  }

  if (mNodeId.EqualsLiteral("null")) {
    // Refuse to open storage if the page is opened from local disk,
    // or shared across origin.
    LOGD(("GMPStorageParent[{}]::RecvOpen(record='{}') failed; null nodeId",
          fmt::ptr(this), PromiseFlatCString(aRecordName).get()));
    (void)SendOpenComplete(aRecordName, GMPGenericErr);
    return IPC_OK();
  }

  if (aRecordName.IsEmpty()) {
    LOGD((
        "GMPStorageParent[{}]::RecvOpen(record='{}') failed; record name empty",
        fmt::ptr(this), PromiseFlatCString(aRecordName).get()));
    (void)SendOpenComplete(aRecordName, GMPGenericErr);
    return IPC_OK();
  }

  if (mStorage->IsOpen(aRecordName)) {
    LOGD(("GMPStorageParent[{}]::RecvOpen(record='{}') failed; record in use",
          fmt::ptr(this), PromiseFlatCString(aRecordName).get()));
    (void)SendOpenComplete(aRecordName, GMPRecordInUse);
    return IPC_OK();
  }

  auto err = mStorage->Open(aRecordName);
  MOZ_ASSERT(GMP_FAILED(err) || mStorage->IsOpen(aRecordName));
  LOGD(("GMPStorageParent[{}]::RecvOpen(record='{}') complete; rv={}",
        fmt::ptr(this), PromiseFlatCString(aRecordName).get(),
        static_cast<int>(err)));
  (void)SendOpenComplete(aRecordName, err);

  return IPC_OK();
}

mozilla::ipc::IPCResult GMPStorageParent::RecvRead(
    const nsACString& aRecordName) {
  LOGD(("GMPStorageParent[{}]::RecvRead(record='{}')", fmt::ptr(this),
        PromiseFlatCString(aRecordName).get()));

  if (mShutdown) {
    // Shutdown is an expected state, so we do not IPC_FAIL.
    return IPC_OK();
  }

  nsTArray<uint8_t> data;
  if (!mStorage->IsOpen(aRecordName)) {
    LOGD(("GMPStorageParent[{}]::RecvRead(record='{}') failed; record not open",
          fmt::ptr(this), PromiseFlatCString(aRecordName).get()));
    (void)SendReadComplete(aRecordName, GMPClosedErr, data);
  } else {
    GMPErr rv = mStorage->Read(aRecordName, data);
    LOGD(
        ("GMPStorageParent[{}]::RecvRead(record='{}') read {} bytes "
         "rv={}",
         fmt::ptr(this), PromiseFlatCString(aRecordName).get(), data.Length(),
         static_cast<uint32_t>(rv)));
    (void)SendReadComplete(aRecordName, rv, data);
  }

  return IPC_OK();
}

mozilla::ipc::IPCResult GMPStorageParent::RecvWrite(
    const nsACString& aRecordName, nsTArray<uint8_t>&& aBytes) {
  LOGD(("GMPStorageParent[{}]::RecvWrite(record='{}') {} bytes", fmt::ptr(this),
        PromiseFlatCString(aRecordName).get(), aBytes.Length()));

  if (mShutdown) {
    // Shutdown is an expected state, so we do not IPC_FAIL.
    return IPC_OK();
  }

  if (!mStorage->IsOpen(aRecordName)) {
    LOGD(("GMPStorageParent[{}]::RecvWrite(record='{}') failed record not open",
          fmt::ptr(this), PromiseFlatCString(aRecordName).get()));
    (void)SendWriteComplete(aRecordName, GMPClosedErr);
    return IPC_OK();
  }

  if (aBytes.Length() > GMP_MAX_RECORD_SIZE) {
    LOGD(("GMPStorageParent[{}]::RecvWrite(record='{}') failed record too big",
          fmt::ptr(this), PromiseFlatCString(aRecordName).get()));
    (void)SendWriteComplete(aRecordName, GMPQuotaExceededErr);
    return IPC_OK();
  }

  GMPErr rv = mStorage->Write(aRecordName, aBytes);
  LOGD(("GMPStorageParent[{}]::RecvWrite(record='{}') write complete rv={}",
        fmt::ptr(this), PromiseFlatCString(aRecordName).get(),
        static_cast<int>(rv)));

  (void)SendWriteComplete(aRecordName, rv);

  return IPC_OK();
}

mozilla::ipc::IPCResult GMPStorageParent::RecvClose(
    const nsACString& aRecordName) {
  LOGD(("GMPStorageParent[{}]::RecvClose(record='{}')", fmt::ptr(this),
        PromiseFlatCString(aRecordName).get()));

  if (mShutdown) {
    return IPC_OK();
  }

  mStorage->Close(aRecordName);

  return IPC_OK();
}

void GMPStorageParent::ActorDestroy(ActorDestroyReason aWhy) {
  LOGD(("GMPStorageParent[{}]::ActorDestroy(reason={})", fmt::ptr(this),
        static_cast<int>(aWhy)));
  Shutdown();
}

void GMPStorageParent::Shutdown() {
  if (mShutdown) {
    return;
  }

  LOGD(("GMPStorageParent[{}]::Shutdown()", fmt::ptr(this)));
  mShutdown = true;
  (void)SendShutdown();

  mStorage = nullptr;
}

}  // namespace gmp
}  // namespace mozilla
