/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_FS_CHILD_FILESYSTEMACCESSHANDLECHILD_H_
#define DOM_FS_CHILD_FILESYSTEMACCESSHANDLECHILD_H_

#include "mozilla/dom/PFileSystemAccessHandleChild.h"

namespace mozilla::dom {

class FileSystemSyncAccessHandle;

class FileSystemAccessHandleChild : public PFileSystemAccessHandleChild {
 public:
  FileSystemAccessHandleChild();

  NS_INLINE_DECL_REFCOUNTING(FileSystemAccessHandleChild, override)

  FileSystemSyncAccessHandle* MutableAccessHandlePtr() const {
    MOZ_ASSERT(mAccessHandle);
    return mAccessHandle;
  }

  void SetAccessHandle(FileSystemSyncAccessHandle* aAccessHandle);

  void ActorDestroy(ActorDestroyReason aWhy) override;

 private:
  virtual ~FileSystemAccessHandleChild();

  // Use a weak ref so actor does not hold DOM object alive past content use.
  // The weak reference is cleared in FileSystemSyncAccessHandle::LastRelease.
  FileSystemSyncAccessHandle* MOZ_NON_OWNING_REF mAccessHandle;
};

}  // namespace mozilla::dom

#endif  // DOM_FS_CHILD_FILESYSTEMACCESSHANDLECHILD_H_
