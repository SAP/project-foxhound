/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"

#include "Helpers.h"
#include "base/eintr_wrapper.h"
#include "mozilla/AsyncPlatformPipes.h"
#include "mozilla/gtest/MozAssertions.h"
#include "mozilla/RandomNum.h"
#include "mozilla/SpinEventLoopUntil.h"
#include "nsCOMPtr.h"
#include "nsStreamUtils.h"
#include "nsThreadUtils.h"

#ifdef XP_WIN
#  include <windows.h>
#else
#  include <fcntl.h>
#  include <unistd.h>
#endif

using mozilla::PlatformPipeReader;
using mozilla::SpinEventLoopUntil;
using mozilla::UniqueFileHandle;

namespace {

struct PipePair {
  RefPtr<PlatformPipeReader> mReader;
  UniqueFileHandle mWriteHandle;
};

PipePair CreatePipePair(uint32_t aCapacity) {
#ifdef XP_WIN
  wchar_t name[128];
  swprintf(name, std::size(name),
           L"\\\\.\\pipe\\gecko-test-platform-pipe-%lu-%I64u",
           ::GetCurrentProcessId(), mozilla::RandomUint64OrDie());

  UniqueFileHandle readHandle(
      CreateNamedPipeW(name,
                       PIPE_ACCESS_INBOUND | FILE_FLAG_OVERLAPPED |
                           FILE_FLAG_FIRST_PIPE_INSTANCE,
                       PIPE_TYPE_BYTE | PIPE_WAIT, 1, 4096, 4096, 0, nullptr));
  MOZ_RELEASE_ASSERT(readHandle);

  UniqueFileHandle writeHandle(
      CreateFileW(name, GENERIC_WRITE, 0, nullptr, OPEN_EXISTING,
                  SECURITY_SQOS_PRESENT | SECURITY_ANONYMOUS, nullptr));
  MOZ_RELEASE_ASSERT(writeHandle);

  MOZ_RELEASE_ASSERT(!ConnectNamedPipe(readHandle.get(), nullptr) &&
                     GetLastError() == ERROR_PIPE_CONNECTED);

  return {new PlatformPipeReader(std::move(readHandle), aCapacity),
          std::move(writeHandle)};
#else
  int fds[2];
  MOZ_RELEASE_ASSERT(pipe(fds) == 0);
  MOZ_RELEASE_ASSERT(
      fcntl(fds[0], F_SETFL, fcntl(fds[0], F_GETFL) | O_NONBLOCK) == 0);
  return {new PlatformPipeReader(UniqueFileHandle(fds[0]), aCapacity),
          UniqueFileHandle(fds[1])};
#endif
}

void WriteAllRaw(UniqueFileHandle& aHandle, const char* aData,
                 uint32_t aCount) {
#ifdef XP_WIN
  DWORD written = 0;
  BOOL ok = WriteFile(aHandle.get(), aData, aCount, &written, nullptr);
  MOZ_RELEASE_ASSERT(ok);
  MOZ_RELEASE_ASSERT(written == aCount);
#else
  uint32_t total = 0;
  while (total < aCount) {
    ssize_t rv =
        HANDLE_EINTR(write(aHandle.get(), aData + total, aCount - total));
    MOZ_RELEASE_ASSERT(rv > 0);
    total += static_cast<uint32_t>(rv);
  }
#endif
}

void ReadExactly(nsIInputStream* aStream, uint32_t aCount,
                 nsACString& aResult) {
  aResult.SetLength(aCount);

  uint32_t read = 0;
  ASSERT_NS_SUCCEEDED(aStream->Read(aResult.BeginWriting(), aCount, &read));
  ASSERT_EQ(read, aCount);
}

struct PartialConsumeClosure {
  uint32_t mLimit;
  char* mBuffer;
};

nsresult ConsumeUpToLimit(nsIInputStream*, void* aClosure,
                          const char* aFromSegment, uint32_t aOffset,
                          uint32_t aCount, uint32_t* aWriteCount) {
  auto* state = static_cast<PartialConsumeClosure*>(aClosure);
  uint32_t toRead = std::min(state->mLimit - aOffset, aCount);
  memcpy(state->mBuffer + aOffset, aFromSegment, toRead);
  *aWriteCount = toRead;
  return NS_OK;
}

}  // namespace

TEST(AsyncPlatformPipes, ReadAsyncWait)
{
  auto pipe = CreatePipePair(64);

  nsCOMPtr<nsIThread> thread = do_GetCurrentThread();
  RefPtr callback = mozilla::MakeRefPtr<testing::InputStreamCallback>();
  ASSERT_NS_SUCCEEDED(pipe.mReader->AsyncWait(callback, 0, 0, thread));

  nsCString payload("hello async pipe"_ns);
  WriteAllRaw(pipe.mWriteHandle, payload.get(), payload.Length());

  MOZ_ALWAYS_TRUE(
      SpinEventLoopUntil("xpcom:TEST(AsyncPlatformPipes, ReadAsyncWait)"_ns,
                         [&] { return callback->Called(); }));

  nsCString output;
  ReadExactly(pipe.mReader, payload.Length(), output);
  ASSERT_TRUE(payload.Equals(output));
  pipe.mWriteHandle.reset();
  ASSERT_NS_SUCCEEDED(pipe.mReader->Close());
}

TEST(AsyncPlatformPipes, ReadAsyncWaitClosureOnly)
{
  auto pipe = CreatePipePair(64);

  nsCOMPtr<nsIThread> thread = do_GetCurrentThread();
  RefPtr callback = mozilla::MakeRefPtr<testing::InputStreamCallback>();
  ASSERT_NS_SUCCEEDED(pipe.mReader->AsyncWait(
      callback, nsIAsyncInputStream::WAIT_CLOSURE_ONLY, 0, thread));

  pipe.mWriteHandle.reset();

  MOZ_ALWAYS_TRUE(SpinEventLoopUntil(
      "xpcom:TEST(AsyncPlatformPipes, ReadAsyncWaitClosureOnly)"_ns,
      [&] { return callback->Called(); }));

  ASSERT_NS_SUCCEEDED(pipe.mReader->Close());
}

TEST(AsyncPlatformPipes, InputStreamIsBufferedDoesNotStartRead)
{
  auto pipe = CreatePipePair(8);

  nsCString payload("12345678"_ns);
  WriteAllRaw(pipe.mWriteHandle, payload.get(), payload.Length());

  uint64_t available = 1;
  ASSERT_NS_SUCCEEDED(pipe.mReader->Available(&available));
  ASSERT_EQ(available, 0u);

  ASSERT_TRUE(NS_InputStreamIsBuffered(pipe.mReader));

  ASSERT_NS_SUCCEEDED(pipe.mReader->Available(&available));
  ASSERT_EQ(available, 0u);

  nsCOMPtr<nsIThread> thread = do_GetCurrentThread();
  RefPtr readCallback = mozilla::MakeRefPtr<testing::InputStreamCallback>();
  ASSERT_NS_SUCCEEDED(pipe.mReader->AsyncWait(readCallback, 0, 0, thread));
  MOZ_ALWAYS_TRUE(SpinEventLoopUntil(
      "xpcom:TEST(AsyncPlatformPipes, InputStreamIsBufferedDoesNotStartRead, Read)"_ns,
      [&] { return readCallback->Called(); }));

  nsCString output;
  ReadExactly(pipe.mReader, payload.Length(), output);
  ASSERT_TRUE(payload.Equals(output));
  pipe.mWriteHandle.reset();
  ASSERT_NS_SUCCEEDED(pipe.mReader->Close());
}

TEST(AsyncPlatformPipes, LargeDataMultipleCycles)
{
  // Use a small reader buffer (8 bytes) to force multiple read cycles for a
  // larger payload (1024 bytes).
  auto pipe = CreatePipePair(8);
  nsCOMPtr<nsIThread> thread = do_GetCurrentThread();

  const uint32_t kTotalBytes = 1024;
  nsCString payload;
  payload.SetLength(kTotalBytes);
  for (uint32_t i = 0; i < kTotalBytes; ++i) {
    payload.BeginWriting()[i] = static_cast<char>(i & 0xff);
  }

  WriteAllRaw(pipe.mWriteHandle, payload.get(), payload.Length());
  pipe.mWriteHandle.reset();

  nsCString result;
  uint32_t totalRead = 0;
  while (totalRead < kTotalBytes) {
    RefPtr readCallback = mozilla::MakeRefPtr<testing::InputStreamCallback>();
    ASSERT_NS_SUCCEEDED(pipe.mReader->AsyncWait(readCallback, 0, 0, thread));
    MOZ_ALWAYS_TRUE(SpinEventLoopUntil(
        "xpcom:TEST(AsyncPlatformPipes, LargeDataMultipleCycles)"_ns,
        [&] { return readCallback->Called(); }));

    uint64_t avail = 0;
    ASSERT_NS_SUCCEEDED(pipe.mReader->Available(&avail));
    if (avail == 0) {
      break;
    }

    uint32_t prevLen = result.Length();
    result.SetLength(prevLen + static_cast<uint32_t>(avail));
    uint32_t read = 0;
    ASSERT_NS_SUCCEEDED(pipe.mReader->Read(
        result.BeginWriting() + prevLen, static_cast<uint32_t>(avail), &read));
    ASSERT_EQ(read, static_cast<uint32_t>(avail));
    totalRead += read;
  }

  ASSERT_EQ(totalRead, kTotalBytes);
  ASSERT_TRUE(payload.Equals(result));
  ASSERT_NS_SUCCEEDED(pipe.mReader->Close());
}

TEST(AsyncPlatformPipes, ClosureOnlyCallbackIgnoresData)
{
  auto pipe = CreatePipePair(64);

  nsCOMPtr<nsIThread> thread = do_GetCurrentThread();
  RefPtr callback = mozilla::MakeRefPtr<testing::InputStreamCallback>();
  ASSERT_NS_SUCCEEDED(pipe.mReader->AsyncWait(
      callback, nsIAsyncInputStream::WAIT_CLOSURE_ONLY, 0, thread));

  nsCString payload("closure ignores this"_ns);
  WriteAllRaw(pipe.mWriteHandle, payload.get(), payload.Length());

  MOZ_ALWAYS_TRUE(SpinEventLoopUntil(
      "xpcom:TEST(AsyncPlatformPipes, ClosureOnlyCallbackIgnoresData) buffered"_ns,
      [&] {
        uint64_t avail = 0;
        return NS_SUCCEEDED(pipe.mReader->Available(&avail)) && avail > 0;
      }));

  ASSERT_FALSE(callback->Called());

  nsCString output;
  ReadExactly(pipe.mReader, payload.Length(), output);
  ASSERT_TRUE(payload.Equals(output));
  ASSERT_FALSE(callback->Called());

  pipe.mWriteHandle.reset();

  MOZ_ALWAYS_TRUE(SpinEventLoopUntil(
      "xpcom:TEST(AsyncPlatformPipes, ClosureOnlyCallbackIgnoresData) closed"_ns,
      [&] { return callback->Called(); }));

  ASSERT_NS_SUCCEEDED(pipe.mReader->Close());
}

TEST(AsyncPlatformPipes, ReadSegmentsPartialConsume)
{
  auto pipe = CreatePipePair(64);
  nsCOMPtr<nsIThread> thread = do_GetCurrentThread();

  nsCString payload("abcdefghij"_ns);
  WriteAllRaw(pipe.mWriteHandle, payload.get(), payload.Length());

  RefPtr callback = mozilla::MakeRefPtr<testing::InputStreamCallback>();
  ASSERT_NS_SUCCEEDED(pipe.mReader->AsyncWait(callback, 0, 0, thread));
  MOZ_ALWAYS_TRUE(SpinEventLoopUntil(
      "xpcom:TEST(AsyncPlatformPipes, ReadSegmentsPartialConsume) wait"_ns,
      [&] { return callback->Called(); }));

  uint64_t avail = 0;
  ASSERT_NS_SUCCEEDED(pipe.mReader->Available(&avail));
  ASSERT_EQ(avail, payload.Length());

  char firstHalf[5] = {0};
  PartialConsumeClosure closure{5, firstHalf};
  uint32_t read = 0;
  ASSERT_NS_SUCCEEDED(pipe.mReader->ReadSegments(ConsumeUpToLimit, &closure,
                                                 payload.Length(), &read));
  ASSERT_EQ(read, 5u);
  ASSERT_EQ(memcmp(firstHalf, "abcde", 5), 0);

  ASSERT_NS_SUCCEEDED(pipe.mReader->Available(&avail));
  ASSERT_EQ(avail, 5u);

  nsCString rest;
  ReadExactly(pipe.mReader, 5, rest);
  ASSERT_TRUE(rest.Equals("fghij"_ns));

  pipe.mWriteHandle.reset();
  ASSERT_NS_SUCCEEDED(pipe.mReader->Close());
}

TEST(AsyncPlatformPipes, ReadAfterWriteSideClosed)
{
  auto pipe = CreatePipePair(64);
  nsCOMPtr<nsIThread> thread = do_GetCurrentThread();

  nsCString payload("farewell"_ns);
  WriteAllRaw(pipe.mWriteHandle, payload.get(), payload.Length());
  pipe.mWriteHandle.reset();

  RefPtr readCallback = mozilla::MakeRefPtr<testing::InputStreamCallback>();
  ASSERT_NS_SUCCEEDED(pipe.mReader->AsyncWait(readCallback, 0, 0, thread));
  MOZ_ALWAYS_TRUE(SpinEventLoopUntil(
      "xpcom:TEST(AsyncPlatformPipes, ReadAfterWriteSideClosed) data"_ns,
      [&] { return readCallback->Called(); }));

  nsCString output;
  ReadExactly(pipe.mReader, payload.Length(), output);
  ASSERT_TRUE(payload.Equals(output));

  RefPtr eofCallback = mozilla::MakeRefPtr<testing::InputStreamCallback>();
  ASSERT_NS_SUCCEEDED(pipe.mReader->AsyncWait(eofCallback, 0, 0, thread));
  MOZ_ALWAYS_TRUE(SpinEventLoopUntil(
      "xpcom:TEST(AsyncPlatformPipes, ReadAfterWriteSideClosed) eof"_ns,
      [&] { return eofCallback->Called(); }));

  ASSERT_EQ(pipe.mReader->StreamStatus(), NS_BASE_STREAM_CLOSED);

  char extra[8] = {0};
  uint32_t read = 42;
  ASSERT_NS_SUCCEEDED(pipe.mReader->Read(extra, sizeof(extra), &read));
  ASSERT_EQ(read, 0u);

  ASSERT_NS_SUCCEEDED(pipe.mReader->Close());
}

TEST(AsyncPlatformPipes, CloseWithOutstandingIO)
{
  auto pipe = CreatePipePair(64);
  nsCOMPtr<nsIThread> thread = do_GetCurrentThread();

  RefPtr callback = mozilla::MakeRefPtr<testing::InputStreamCallback>();
  ASSERT_NS_SUCCEEDED(pipe.mReader->AsyncWait(callback, 0, 0, thread));

  ASSERT_NS_SUCCEEDED(pipe.mReader->Close());

  MOZ_ALWAYS_TRUE(SpinEventLoopUntil(
      "xpcom:TEST(AsyncPlatformPipes, CloseWithOutstandingIO)"_ns,
      [&] { return callback->Called(); }));

  ASSERT_EQ(pipe.mReader->StreamStatus(), NS_BASE_STREAM_CLOSED);

  char buf[8] = {0};
  uint32_t read = 42;
  ASSERT_NS_SUCCEEDED(pipe.mReader->Read(buf, sizeof(buf), &read));
  ASSERT_EQ(read, 0u);

  pipe.mWriteHandle.reset();
}
