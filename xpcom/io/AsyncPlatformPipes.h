/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_AsyncPlatformPipes_h
#define mozilla_AsyncPlatformPipes_h

#include "mozilla/UniquePtrExtensions.h"
#include "nsIAsyncInputStream.h"

namespace mozilla {

namespace platform_pipe_detail {

class PlatformPipeLink;

}  // namespace platform_pipe_detail

// PlatformPipeReader wraps an OS-level file handle as a non-blocking xpcom
// input stream. It is intended for use with byte-oriented OS primitives such
// as pipes or sockets.
//
// Handle Requirements:
//   - On POSIX, the handle must support non-blocking I/O and must have
//     O_NONBLOCK set. Note that regular files ignore O_NONBLOCK: reads and
//     writes always complete synchronously and will block the I/O thread, so
//     are unsupported.
//   - On Windows, the handle must be opened with FILE_FLAG_OVERLAPPED.
//
// aBufferSize controls the size of the internal buffer used to stage data
// between the caller and the OS.

class PlatformPipeReader final : public nsIAsyncInputStream {
 public:
  NS_DECL_THREADSAFE_ISUPPORTS
  NS_DECL_NSIINPUTSTREAM
  NS_DECL_NSIASYNCINPUTSTREAM

  PlatformPipeReader(UniqueFileHandle aHandle, uint32_t aBufferSize);

 private:
  ~PlatformPipeReader();

  RefPtr<platform_pipe_detail::PlatformPipeLink> mLink;
};

}  // namespace mozilla

#endif  // mozilla_AsyncPlatformPipes_h
