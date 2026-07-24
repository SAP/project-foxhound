/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "FileDescriptor.h"

#include "mozilla/ipc/ProtocolMessageUtils.h"
#include "nsDebug.h"

#ifdef XP_WIN
#  include <windows.h>
#  include "ProtocolUtils.h"
#else  // XP_WIN
#  include <unistd.h>
#endif  // XP_WIN

namespace mozilla {
namespace ipc {

FileDescriptor::FileDescriptor() = default;

FileDescriptor::FileDescriptor(const FileDescriptor& aOther)
    : mHandle(DuplicateFileHandle(aOther.mHandle.get())) {}

FileDescriptor::FileDescriptor(FileDescriptor&& aOther)
    : mHandle(std::move(aOther.mHandle)) {}

FileDescriptor::FileDescriptor(PlatformHandleType aHandle)
    : mHandle(DuplicateFileHandle(aHandle)) {}

FileDescriptor::FileDescriptor(UniquePlatformHandle&& aHandle)
    : mHandle(std::move(aHandle)) {}

FileDescriptor::~FileDescriptor() = default;

FileDescriptor& FileDescriptor::operator=(const FileDescriptor& aOther) {
  if (this != &aOther) {
    mHandle = DuplicateFileHandle(aOther.mHandle.get());
  }
  return *this;
}

FileDescriptor& FileDescriptor::operator=(FileDescriptor&& aOther) {
  if (this != &aOther) {
    mHandle = std::move(aOther.mHandle);
  }
  return *this;
}

bool FileDescriptor::IsValid() const { return mHandle != nullptr; }

FileDescriptor::UniquePlatformHandle FileDescriptor::ClonePlatformHandle()
    const {
  return DuplicateFileHandle(mHandle.get());
}

FileDescriptor::UniquePlatformHandle FileDescriptor::TakePlatformHandle() {
  return UniquePlatformHandle(mHandle.release());
}

bool FileDescriptor::operator==(const FileDescriptor& aOther) const {
  return mHandle == aOther.mHandle;
}

}  // namespace ipc
}  // namespace mozilla

namespace IPC {

void ParamTraits<mozilla::ipc::FileDescriptor>::Write(
    MessageWriter* aWriter, const mozilla::ipc::FileDescriptor& aParam) {
  WriteParam(aWriter, aParam.ClonePlatformHandle());
}

bool ParamTraits<mozilla::ipc::FileDescriptor>::Read(
    MessageReader* aReader, mozilla::ipc::FileDescriptor* aResult) {
  mozilla::UniqueFileHandle handle;
  if (!ReadParam(aReader, &handle)) {
    return false;
  }

  *aResult = mozilla::ipc::FileDescriptor(std::move(handle));
  if (!aResult->IsValid()) {
    printf_stderr("IPDL protocol Error: Received an invalid file descriptor\n");
  }
  return true;
}

}  // namespace IPC
