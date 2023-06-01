/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_FS_CHILD_FILESYSTEMMANAGER_H_
#define DOM_FS_CHILD_FILESYSTEMMANAGER_H_

#include <functional>

#include "mozilla/MozPromise.h"
#include "mozilla/UniquePtr.h"
#include "mozilla/dom/FlippedOnce.h"
#include "mozilla/dom/quota/ForwardDecls.h"
#include "nsCOMPtr.h"
#include "nsCycleCollectionParticipant.h"
#include "nsISupports.h"
#include "nsTObserverArray.h"

class nsIGlobalObject;

namespace mozilla {

class ErrorResult;

namespace dom {

class FileSystemManagerChild;
class FileSystemBackgroundRequestHandler;
class StorageManager;

namespace fs {
class FileSystemRequestHandler;
template <typename Manager, typename PromiseType>
class ManagedMozPromiseRequestHolder;
}  // namespace fs

// `FileSystemManager` is supposed to be held by `StorageManager` and thus
// there should always be only one `FileSystemManager` per `nsIGlobalObject`.
// `FileSystemManager` is responsible for creating and eventually caching
// `FileSystemManagerChild` which is required for communication with the parent
// process. `FileSystemHandle` is also expected to hold `FileSystemManager`,
// but it should never clear the strong reference during cycle collection's
// unlink phase to keep the actor alive. `FileSystemSyncAccessHandle` and
// `FileSystemWritableFileStream` are also expected to hold `FileSystemManager`,
// and they shouldn't clear the strong reference during cycle collection's
// unlink phase as well even though they have their own actor. Those actors
// are managed by the top level actor, so if the top level actor is destroyed,
// the whole chain of managed actors would be destroyed as well.
class FileSystemManager : public nsISupports {
 public:
  template <typename PromiseType>
  using PromiseRequestHolder =
      fs::ManagedMozPromiseRequestHolder<FileSystemManager, PromiseType>;

  FileSystemManager(
      nsIGlobalObject* aGlobal, RefPtr<StorageManager> aStorageManager,
      RefPtr<FileSystemBackgroundRequestHandler> aBackgroundRequestHandler);

  FileSystemManager(nsIGlobalObject* aGlobal,
                    RefPtr<StorageManager> aStorageManager);

  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_CYCLE_COLLECTION_CLASS(FileSystemManager)

  bool IsShutdown() const { return mShutdown; }

  void Shutdown();

  const RefPtr<FileSystemManagerChild>& ActorStrongRef() const;

  void RegisterPromiseRequestHolder(PromiseRequestHolder<BoolPromise>* aHolder);

  void UnregisterPromiseRequestHolder(
      PromiseRequestHolder<BoolPromise>* aHolder);

  void BeginRequest(
      std::function<void(const RefPtr<FileSystemManagerChild>&)>&& aSuccess,
      std::function<void(nsresult)>&& aFailure);

  already_AddRefed<Promise> GetDirectory(ErrorResult& aError);

 private:
  virtual ~FileSystemManager();

  nsCOMPtr<nsIGlobalObject> mGlobal;

  RefPtr<StorageManager> mStorageManager;

  const RefPtr<FileSystemBackgroundRequestHandler> mBackgroundRequestHandler;
  const UniquePtr<fs::FileSystemRequestHandler> mRequestHandler;

  nsTObserverArray<PromiseRequestHolder<BoolPromise>*> mPromiseRequestHolders;

  FlippedOnce<false> mShutdown;
};

}  // namespace dom
}  // namespace mozilla

#endif  // DOM_FS_CHILD_FILESYSTEMMANAGER_H_
