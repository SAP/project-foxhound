/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_ipc_ProcessUtils_h
#define mozilla_ipc_ProcessUtils_h

#include <functional>
#include <vector>

#include "mozilla/GeckoArgs.h"
#include "mozilla/ipc/FileDescriptor.h"
#include "mozilla/ipc/SharedMemory.h"
#include "mozilla/Maybe.h"
#include "mozilla/Preferences.h"
#include "mozilla/RefPtr.h"
#include "nsXULAppAPI.h"

namespace mozilla {
namespace ipc {

class GeckoChildProcessHost;

// You probably should call ContentChild::SetProcessName instead of calling
// this directly.
void SetThisProcessName(const char* aName);

class SharedPreferenceSerializer final {
 public:
  explicit SharedPreferenceSerializer();
  SharedPreferenceSerializer(SharedPreferenceSerializer&& aOther);
  ~SharedPreferenceSerializer();

  bool SerializeToSharedMemory(const GeckoProcessType aDestinationProcessType,
                               const nsACString& aDestinationRemoteType);

  size_t GetPrefMapSize() const { return mPrefMapSize; }
  size_t GetPrefsLength() const { return mPrefsLength; }

  const SharedMemoryHandle& GetPrefsHandle() const { return mPrefsHandle; }

  const SharedMemoryHandle& GetPrefMapHandle() const { return mPrefMapHandle; }

  void AddSharedPrefCmdLineArgs(GeckoChildProcessHost& procHost,
                                geckoargs::ChildProcessArgs& aExtraOpts) const;

 private:
  DISALLOW_COPY_AND_ASSIGN(SharedPreferenceSerializer);
  size_t mPrefMapSize;
  size_t mPrefsLength;
  SharedMemoryHandle mPrefMapHandle;
  SharedMemoryHandle mPrefsHandle;
};

class SharedPreferenceDeserializer final {
 public:
  SharedPreferenceDeserializer();
  ~SharedPreferenceDeserializer();

  bool DeserializeFromSharedMemory(SharedMemoryHandle aPrefsHandle,
                                   SharedMemoryHandle aPrefMapHandle,
                                   uint64_t aPrefsLen, uint64_t aPrefMapSize);

  const SharedMemoryHandle& GetPrefMapHandle() const;

 private:
  DISALLOW_COPY_AND_ASSIGN(SharedPreferenceDeserializer);
  Maybe<SharedMemoryHandle> mPrefMapHandle;
  Maybe<size_t> mPrefsLen;
  Maybe<size_t> mPrefMapSize;
  RefPtr<SharedMemory> mShmem = MakeRefPtr<SharedMemory>();
};

// Generate command line argument to spawn a child process. If the shared memory
// is not properly initialized, this would be a no-op.
void ExportSharedJSInit(GeckoChildProcessHost& procHost,
                        geckoargs::ChildProcessArgs& aExtraOpts);

// Initialize the content used by the JS engine during the initialization of a
// JS::Runtime.
bool ImportSharedJSInit(SharedMemoryHandle aJsInitHandle, uint64_t aJsInitLen);

}  // namespace ipc
}  // namespace mozilla

#endif  // ifndef mozilla_ipc_ProcessUtils_h
