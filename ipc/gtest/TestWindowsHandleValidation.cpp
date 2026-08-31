/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"

#include <windows.h>

#include "chrome/common/ipc_channel.h"
#include "chrome/common/ipc_channel_win.h"
#include "mozilla/Preferences.h"
#include "mozilla/UniquePtrExtensions.h"
#include "mozilla/ipc/CrossProcessMutex.h"
#include "mozilla/ipc/CrossProcessSemaphore.h"
#include "mozilla/ipc/SharedMemoryHandle.h"

namespace mozilla::ipc {

// Like DuplicateFileHandle, but doesn't refuse to duplicate pseudo-handles like
// ::GetCurrentProcess() (because ::GetCurrentProcess() ==
// INVALID_HANDLE_VALUE).
static UniqueFileHandle DuplicatePseudoHandle(HANDLE aHandle) {
  HANDLE duplicated = INVALID_HANDLE_VALUE;
  BOOL ok =
      ::DuplicateHandle(::GetCurrentProcess(), aHandle, ::GetCurrentProcess(),
                        &duplicated, 0, false, DUPLICATE_SAME_ACCESS);
  EXPECT_TRUE(ok);
  return UniqueFileHandle(duplicated);
}

TEST(TestWindowsHandleValidation, RejectProcess)
{
  EXPECT_FALSE(IPC::ChannelWin::IsAllowedHandleType(::GetCurrentProcess()));

  UniqueFileHandle process = DuplicatePseudoHandle(::GetCurrentProcess());
  ASSERT_TRUE(process);

  EXPECT_FALSE(IPC::ChannelWin::IsAllowedHandleType(process.get()));
}

TEST(TestWindowsHandleValidation, RejectThread)
{
  EXPECT_FALSE(IPC::ChannelWin::IsAllowedHandleType(::GetCurrentThread()));

  UniqueFileHandle thread = DuplicatePseudoHandle(::GetCurrentThread());
  ASSERT_TRUE(thread);

  EXPECT_FALSE(IPC::ChannelWin::IsAllowedHandleType(thread.get()));
}

TEST(TestWindowsHandleValidation, AllowSharedMemoryHandles)
{
  MutableSharedMemoryHandle shmem = shared_memory::Create(1);
  ASSERT_TRUE(shmem);

  UniqueFileHandle handle = std::move(shmem).TakePlatformHandle();
  ASSERT_TRUE(handle);

  EXPECT_TRUE(IPC::ChannelWin::IsAllowedHandleType(handle.get()));
}

TEST(TestWindowsHandleValidation, AllowCrossProcessMutexHandles)
{
  mozilla::CrossProcessMutex mutex("TestWindowsHandleValidation");
  UniqueFileHandle handle = mutex.CloneHandle();
  ASSERT_TRUE(handle);

  EXPECT_TRUE(IPC::ChannelWin::IsAllowedHandleType(handle.get()));
}

TEST(TestWindowsHandleValidation, AllowCrossProcessSemaphoreHandles)
{
  UniquePtr<mozilla::CrossProcessSemaphore> semaphore(
      mozilla::CrossProcessSemaphore::Create("TestWindowsHandleValidation", 0));
  ASSERT_TRUE(semaphore);

  UniqueFileHandle handle = semaphore->CloneHandle();
  ASSERT_TRUE(handle);

  EXPECT_TRUE(IPC::ChannelWin::IsAllowedHandleType(handle.get()));
}

TEST(TestWindowsHandleValidation, AllowRawPipeHandles)
{
  IPC::Channel::ChannelHandle server;
  IPC::Channel::ChannelHandle client;
  ASSERT_TRUE(IPC::ChannelWin::sKind.create_raw_pipe(&server, &client));

  ASSERT_TRUE(std::holds_alternative<UniqueFileHandle>(server));
  UniqueFileHandle serverHandle = std::get<UniqueFileHandle>(std::move(server));
  ASSERT_TRUE(serverHandle);
  EXPECT_TRUE(IPC::ChannelWin::IsAllowedHandleType(serverHandle.get()));

  ASSERT_TRUE(std::holds_alternative<UniqueFileHandle>(client));
  UniqueFileHandle clientHandle = std::get<UniqueFileHandle>(std::move(client));
  ASSERT_TRUE(clientHandle);
  EXPECT_TRUE(IPC::ChannelWin::IsAllowedHandleType(clientHandle.get()));
}

}  // namespace mozilla::ipc
