/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "FileSystemManagerParent.h"

#include "FileSystemDatabaseManager.h"
#include "mozilla/Maybe.h"
#include "mozilla/dom/FileBlobImpl.h"
#include "mozilla/dom/FileSystemAccessHandle.h"
#include "mozilla/dom/FileSystemAccessHandleControlParent.h"
#include "mozilla/dom/FileSystemAccessHandleParent.h"
#include "mozilla/dom/FileSystemDataManager.h"
#include "mozilla/dom/FileSystemLog.h"
#include "mozilla/dom/FileSystemTypes.h"
#include "mozilla/dom/FileSystemWritableFileStreamParent.h"
#include "mozilla/dom/IPCBlobUtils.h"
#include "mozilla/dom/QMResult.h"
#include "mozilla/dom/quota/FileStreams.h"
#include "mozilla/dom/quota/ForwardDecls.h"
#include "mozilla/dom/quota/QuotaCommon.h"
#include "mozilla/dom/quota/ResultExtensions.h"
#include "mozilla/ipc/BackgroundParent.h"
#include "mozilla/ipc/FileDescriptorUtils.h"
#include "mozilla/ipc/RandomAccessStreamUtils.h"
#include "nsNetUtil.h"
#include "nsString.h"
#include "nsTArray.h"

using IPCResult = mozilla::ipc::IPCResult;

namespace mozilla::dom {

FileSystemManagerParent::FileSystemManagerParent(
    RefPtr<fs::data::FileSystemDataManager> aDataManager,
    const EntryId& aRootEntry)
    : mDataManager(std::move(aDataManager)), mRootResponse(aRootEntry) {}

FileSystemManagerParent::~FileSystemManagerParent() {
  LOG(("Destroying FileSystemManagerParent %p", this));
}

void FileSystemManagerParent::AssertIsOnIOTarget() const {
  MOZ_ASSERT(mDataManager);

  mDataManager->AssertIsOnIOTarget();
}

const RefPtr<fs::data::FileSystemDataManager>&
FileSystemManagerParent::DataManagerStrongRef() const {
  MOZ_ASSERT(!mActorDestroyed);
  MOZ_ASSERT(mDataManager);

  return mDataManager;
}

IPCResult FileSystemManagerParent::RecvGetRootHandle(
    GetRootHandleResolver&& aResolver) {
  AssertIsOnIOTarget();

  aResolver(mRootResponse);

  return IPC_OK();
}

IPCResult FileSystemManagerParent::RecvGetDirectoryHandle(
    FileSystemGetHandleRequest&& aRequest,
    GetDirectoryHandleResolver&& aResolver) {
  LOG(("GetDirectoryHandle %s ",
       NS_ConvertUTF16toUTF8(aRequest.handle().childName()).get()));
  AssertIsOnIOTarget();
  MOZ_ASSERT(!aRequest.handle().parentId().IsEmpty());
  MOZ_ASSERT(mDataManager);

  auto reportError = [&aResolver](const QMResult& aRv) {
    FileSystemGetHandleResponse response(ToNSResult(aRv));
    aResolver(response);
  };

  QM_TRY_UNWRAP(fs::EntryId entryId,
                mDataManager->MutableDatabaseManagerPtr()->GetOrCreateDirectory(
                    aRequest.handle(), aRequest.create()),
                IPC_OK(), reportError);
  MOZ_ASSERT(!entryId.IsEmpty());

  FileSystemGetHandleResponse response(entryId);
  aResolver(response);

  return IPC_OK();
}

IPCResult FileSystemManagerParent::RecvGetFileHandle(
    FileSystemGetHandleRequest&& aRequest, GetFileHandleResolver&& aResolver) {
  AssertIsOnIOTarget();
  MOZ_ASSERT(!aRequest.handle().parentId().IsEmpty());
  MOZ_ASSERT(mDataManager);

  auto reportError = [&aResolver](const QMResult& aRv) {
    FileSystemGetHandleResponse response(ToNSResult(aRv));
    aResolver(response);
  };

  QM_TRY_UNWRAP(fs::EntryId entryId,
                mDataManager->MutableDatabaseManagerPtr()->GetOrCreateFile(
                    aRequest.handle(), aRequest.create()),
                IPC_OK(), reportError);
  MOZ_ASSERT(!entryId.IsEmpty());

  FileSystemGetHandleResponse response(entryId);
  aResolver(response);
  return IPC_OK();
}

// Could use a template, but you need several types
mozilla::ipc::IPCResult FileSystemManagerParent::RecvGetAccessHandle(
    FileSystemGetAccessHandleRequest&& aRequest,
    GetAccessHandleResolver&& aResolver) {
  AssertIsOnIOTarget();
  MOZ_ASSERT(mDataManager);

  EntryId entryId = aRequest.entryId();

  FileSystemAccessHandle::Create(mDataManager, entryId)
      ->Then(
          GetCurrentSerialEventTarget(), __func__,
          [self = RefPtr(this), request = std::move(aRequest),
           resolver = std::move(aResolver)](
              FileSystemAccessHandle::CreatePromise::ResolveOrRejectValue&&
                  aValue) {
            if (!self->CanSend()) {
              return;
            }

            if (aValue.IsReject()) {
              resolver(aValue.RejectValue());
              return;
            }

            FileSystemAccessHandle::CreateResult result =
                std::move(aValue.ResolveValue());

            fs::Registered<FileSystemAccessHandle> accessHandle =
                std::move(result.first);

            RandomAccessStreamParams streamParams = std::move(result.second);

            auto accessHandleParent = MakeRefPtr<FileSystemAccessHandleParent>(
                accessHandle.inspect());

            auto resolveAndReturn = [&resolver](nsresult rv) { resolver(rv); };

            ManagedEndpoint<PFileSystemAccessHandleChild>
                accessHandleChildEndpoint =
                    self->OpenPFileSystemAccessHandleEndpoint(
                        accessHandleParent);
            QM_TRY(MOZ_TO_RESULT(accessHandleChildEndpoint.IsValid()),
                   resolveAndReturn);

            accessHandle->RegisterActor(WrapNotNull(accessHandleParent));

            auto accessHandleControlParent =
                MakeRefPtr<FileSystemAccessHandleControlParent>(
                    accessHandle.inspect());

            Endpoint<PFileSystemAccessHandleControlParent>
                accessHandleControlParentEndpoint;
            Endpoint<PFileSystemAccessHandleControlChild>
                accessHandleControlChildEndpoint;
            MOZ_ALWAYS_SUCCEEDS(PFileSystemAccessHandleControl::CreateEndpoints(
                &accessHandleControlParentEndpoint,
                &accessHandleControlChildEndpoint));

            accessHandleControlParentEndpoint.Bind(accessHandleControlParent);

            accessHandle->RegisterControlActor(
                WrapNotNull(accessHandleControlParent));

            resolver(FileSystemAccessHandleProperties(
                std::move(streamParams), std::move(accessHandleChildEndpoint),
                std::move(accessHandleControlChildEndpoint)));
          });

  return IPC_OK();
}

mozilla::ipc::IPCResult FileSystemManagerParent::RecvGetWritable(
    FileSystemGetWritableRequest&& aRequest, GetWritableResolver&& aResolver) {
  AssertIsOnIOTarget();
  MOZ_ASSERT(mDataManager);

  QM_TRY(MOZ_TO_RESULT(mDataManager->LockShared(aRequest.entryId())), IPC_OK(),
         ([aResolver](const nsresult& aRv) { aResolver(aRv); }));

  auto autoUnlock =
      MakeScopeExit([self = RefPtr<FileSystemManagerParent>(this), aRequest] {
        self->mDataManager->UnlockShared(aRequest.entryId());
      });

  auto reportError = [aResolver](nsresult rv) { aResolver(rv); };

  nsString type;
  fs::TimeStamp lastModifiedMilliSeconds;
  fs::Path path;
  nsCOMPtr<nsIFile> file;
  QM_TRY(MOZ_TO_RESULT(mDataManager->MutableDatabaseManagerPtr()->GetFile(
             aRequest.entryId(), type, lastModifiedMilliSeconds, path, file)),
         IPC_OK(), reportError);

  if (LOG_ENABLED()) {
    nsAutoString path;
    if (NS_SUCCEEDED(file->GetPath(path))) {
      LOG(("Opening Writable %s", NS_ConvertUTF16toUTF8(path).get()));
    }
  }

  auto writableFileStreamParent =
      MakeRefPtr<FileSystemWritableFileStreamParent>(this, aRequest.entryId());

  QM_TRY_UNWRAP(
      nsCOMPtr<nsIRandomAccessStream> stream,
      CreateFileRandomAccessStream(quota::PERSISTENCE_TYPE_DEFAULT,
                                   mDataManager->OriginMetadataRef(),
                                   quota::Client::FILESYSTEM, file, -1, -1,
                                   nsIFileRandomAccessStream::DEFER_OPEN),
      IPC_OK(), reportError);

  RandomAccessStreamParams streamParams =
      mozilla::ipc::SerializeRandomAccessStream(
          WrapMovingNotNullUnchecked(std::move(stream)),
          writableFileStreamParent->GetOrCreateStreamCallbacks());

  // Release the auto unlock helper just before calling
  // SendPFileSystemWritableFileStreamConstructor which is responsible for
  // destroying the actor if the sending fails (we call `UnlockExclusive` when
  // the actor is destroyed).
  autoUnlock.release();

  if (!SendPFileSystemWritableFileStreamConstructor(writableFileStreamParent)) {
    aResolver(NS_ERROR_FAILURE);
    return IPC_OK();
  }

  aResolver(FileSystemWritableFileStreamProperties(
      std::move(streamParams), writableFileStreamParent, nullptr));

  return IPC_OK();
}

IPCResult FileSystemManagerParent::RecvGetFile(
    FileSystemGetFileRequest&& aRequest, GetFileResolver&& aResolver) {
  AssertIsOnIOTarget();

  // XXX Spec https://www.w3.org/TR/FileAPI/#dfn-file wants us to snapshot the
  // state of the file at getFile() time

  // You can create a File with getFile() even if the file is locked
  // XXX factor out this part of the code for accesshandle/ and getfile
  auto reportError = [aResolver](nsresult rv) {
    LOG(("getFile() Failed!"));
    aResolver(rv);
  };

  nsString type;
  fs::TimeStamp lastModifiedMilliSeconds;
  fs::Path path;
  nsCOMPtr<nsIFile> fileObject;
  QM_TRY(MOZ_TO_RESULT(mDataManager->MutableDatabaseManagerPtr()->GetFile(
             aRequest.entryId(), type, lastModifiedMilliSeconds, path,
             fileObject)),
         IPC_OK(), reportError);

  if (LOG_ENABLED()) {
    nsAutoString path;
    if (NS_SUCCEEDED(fileObject->GetPath(path))) {
      LOG(("Opening File as blob: %s", NS_ConvertUTF16toUTF8(path).get()));
    }
  }

  RefPtr<BlobImpl> blob = MakeRefPtr<FileBlobImpl>(fileObject);

  IPCBlob ipcBlob;
  QM_TRY(MOZ_TO_RESULT(IPCBlobUtils::Serialize(blob, ipcBlob)), IPC_OK(),
         reportError);

  aResolver(
      FileSystemFileProperties(lastModifiedMilliSeconds, ipcBlob, type, path));
  return IPC_OK();
}

IPCResult FileSystemManagerParent::RecvResolve(
    FileSystemResolveRequest&& aRequest, ResolveResolver&& aResolver) {
  AssertIsOnIOTarget();
  MOZ_ASSERT(!aRequest.endpoints().parentId().IsEmpty());
  MOZ_ASSERT(!aRequest.endpoints().childId().IsEmpty());
  MOZ_ASSERT(mDataManager);

  fs::Path filePath;
  if (aRequest.endpoints().parentId() == aRequest.endpoints().childId()) {
    FileSystemResolveResponse response(Some(FileSystemPath(filePath)));
    aResolver(response);

    return IPC_OK();
  }

  auto reportError = [&aResolver](const QMResult& aRv) {
    FileSystemResolveResponse response(ToNSResult(aRv));
    aResolver(response);
  };

  QM_TRY_UNWRAP(
      filePath,
      mDataManager->MutableDatabaseManagerPtr()->Resolve(aRequest.endpoints()),
      IPC_OK(), reportError);

  if (LOG_ENABLED()) {
    nsString path;
    for (auto& entry : filePath) {
      path.Append(entry);
    }
    LOG(("Resolve path: %s", NS_ConvertUTF16toUTF8(path).get()));
  }

  if (filePath.IsEmpty()) {
    FileSystemResolveResponse response(Nothing{});
    aResolver(response);

    return IPC_OK();
  }

  FileSystemResolveResponse response(Some(FileSystemPath(filePath)));
  aResolver(response);

  return IPC_OK();
}

IPCResult FileSystemManagerParent::RecvGetEntries(
    FileSystemGetEntriesRequest&& aRequest, GetEntriesResolver&& aResolver) {
  AssertIsOnIOTarget();
  MOZ_ASSERT(!aRequest.parentId().IsEmpty());
  MOZ_ASSERT(mDataManager);

  auto reportError = [&aResolver](const QMResult& aRv) {
    FileSystemGetEntriesResponse response(ToNSResult(aRv));
    aResolver(response);
  };

  QM_TRY_UNWRAP(FileSystemDirectoryListing entries,
                mDataManager->MutableDatabaseManagerPtr()->GetDirectoryEntries(
                    aRequest.parentId(), aRequest.page()),
                IPC_OK(), reportError);

  FileSystemGetEntriesResponse response(entries);
  aResolver(response);

  return IPC_OK();
}

IPCResult FileSystemManagerParent::RecvRemoveEntry(
    FileSystemRemoveEntryRequest&& aRequest, RemoveEntryResolver&& aResolver) {
  LOG(("RemoveEntry %s",
       NS_ConvertUTF16toUTF8(aRequest.handle().childName()).get()));
  AssertIsOnIOTarget();
  MOZ_ASSERT(!aRequest.handle().parentId().IsEmpty());
  MOZ_ASSERT(mDataManager);

  auto reportError = [&aResolver](const QMResult& aRv) {
    FileSystemRemoveEntryResponse response(ToNSResult(aRv));
    aResolver(response);
  };

  QM_TRY_UNWRAP(
      bool isDeleted,
      mDataManager->MutableDatabaseManagerPtr()->RemoveFile(aRequest.handle()),
      IPC_OK(), reportError);

  if (isDeleted) {
    FileSystemRemoveEntryResponse response(NS_OK);
    aResolver(response);

    return IPC_OK();
  }

  QM_TRY_UNWRAP(isDeleted,
                mDataManager->MutableDatabaseManagerPtr()->RemoveDirectory(
                    aRequest.handle(), aRequest.recursive()),
                IPC_OK(), reportError);

  if (!isDeleted) {
    FileSystemRemoveEntryResponse response(NS_ERROR_DOM_NOT_FOUND_ERR);
    aResolver(response);

    return IPC_OK();
  }

  FileSystemRemoveEntryResponse response(NS_OK);
  aResolver(response);

  return IPC_OK();
}

IPCResult FileSystemManagerParent::RecvMoveEntry(
    FileSystemMoveEntryRequest&& aRequest, MoveEntryResolver&& aResolver) {
  LOG(("MoveEntry %s to %s",
       NS_ConvertUTF16toUTF8(aRequest.handle().entryName()).get(),
       NS_ConvertUTF16toUTF8(aRequest.destHandle().childName()).get()));
  MOZ_ASSERT(!aRequest.handle().entryId().IsEmpty());
  MOZ_ASSERT(!aRequest.destHandle().parentId().IsEmpty());
  MOZ_ASSERT(mDataManager);

  auto reportError = [&aResolver](const QMResult& aRv) {
    FileSystemMoveEntryResponse response(ToNSResult(aRv));
    aResolver(response);
  };

  QM_TRY_UNWRAP(bool moved,
                mDataManager->MutableDatabaseManagerPtr()->MoveEntry(
                    aRequest.handle(), aRequest.destHandle()),
                IPC_OK(), reportError);

  fs::FileSystemMoveEntryResponse response(moved ? NS_OK : NS_ERROR_FAILURE);
  aResolver(response);
  return IPC_OK();
}

IPCResult FileSystemManagerParent::RecvRenameEntry(
    FileSystemRenameEntryRequest&& aRequest, MoveEntryResolver&& aResolver) {
  // if destHandle's parentId is empty, then we're renaming in the same
  // directory
  LOG(("RenameEntry %s to %s",
       NS_ConvertUTF16toUTF8(aRequest.handle().entryName()).get(),
       NS_ConvertUTF16toUTF8(aRequest.name()).get()));
  MOZ_ASSERT(!aRequest.handle().entryId().IsEmpty());
  MOZ_ASSERT(mDataManager);

  auto reportError = [&aResolver](const QMResult& aRv) {
    FileSystemMoveEntryResponse response(ToNSResult(aRv));
    aResolver(response);
  };

  QM_TRY_UNWRAP(bool moved,
                mDataManager->MutableDatabaseManagerPtr()->RenameEntry(
                    aRequest.handle(), aRequest.name()),
                IPC_OK(), reportError);

  fs::FileSystemMoveEntryResponse response(moved ? NS_OK : NS_ERROR_FAILURE);
  aResolver(response);
  return IPC_OK();
}

IPCResult FileSystemManagerParent::RecvNeedQuota(
    FileSystemQuotaRequest&& aRequest, NeedQuotaResolver&& aResolver) {
  AssertIsOnIOTarget();

  aResolver(0u);

  return IPC_OK();
}

void FileSystemManagerParent::RequestAllowToClose() {
  ::mozilla::ipc::AssertIsOnBackgroundThread();

  if (mRequestedAllowToClose) {
    return;
  }

  mRequestedAllowToClose.Flip();

  InvokeAsync(mDataManager->MutableIOTaskQueuePtr(), __func__,
              [self = RefPtr<FileSystemManagerParent>(this)]() {
                return self->SendCloseAll();
              })
      ->Then(mDataManager->MutableIOTaskQueuePtr(), __func__,
             [self = RefPtr<FileSystemManagerParent>(this)](
                 const CloseAllPromise::ResolveOrRejectValue& aValue) {
               self->Close();

               return BoolPromise::CreateAndResolve(true, __func__);
             });
}

void FileSystemManagerParent::ActorDestroy(ActorDestroyReason aWhy) {
  AssertIsOnIOTarget();
  MOZ_ASSERT(!mActorDestroyed);

  DEBUGONLY(mActorDestroyed = true);

  InvokeAsync(mDataManager->MutableBackgroundTargetPtr(), __func__,
              [self = RefPtr<FileSystemManagerParent>(this)]() {
                self->mDataManager->UnregisterActor(WrapNotNull(self));

                self->mDataManager = nullptr;

                return BoolPromise::CreateAndResolve(true, __func__);
              });
}

}  // namespace mozilla::dom
