/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_SandboxBrokerCommon_h
#define mozilla_SandboxBrokerCommon_h

#include "mozilla/UsingEnum.h"

#include <sys/types.h>
#include <stdint.h>

struct iovec;

// This file defines the protocol between the filesystem broker,
// described in SandboxBroker.h, and its client, described in
// ../SandboxBrokerClient.h; and it defines some utility functions
// used by both.
//
// In order to keep the client simple while allowing it to be thread
// safe and async signal safe, the main broker socket is used only for
// requests; responses arrive on a per-request socketpair sent with
// the request.  (This technique is also used by Chromium and Breakpad.)

namespace mozilla {

class SandboxBrokerCommon {
 public:
  enum class Operation : unsigned {
    SANDBOX_FILE_OPEN,
    SANDBOX_FILE_ACCESS,
    SANDBOX_FILE_STAT,
    SANDBOX_FILE_CHMOD,
    SANDBOX_FILE_LINK,
    SANDBOX_FILE_MKDIR,
    SANDBOX_FILE_RENAME,
    SANDBOX_FILE_RMDIR,
    SANDBOX_FILE_UNLINK,
    SANDBOX_FILE_READLINK,
    SANDBOX_SOCKET_CONNECT,
    SANDBOX_SOCKET_CONNECT_ABSTRACT,
    SANDBOX_OP_MAX_VALUE = SANDBOX_SOCKET_CONNECT_ABSTRACT
  };
  MOZ_USING_ENUM_STATIC(Operation, SANDBOX_FILE_OPEN, SANDBOX_FILE_ACCESS,
                        SANDBOX_FILE_STAT, SANDBOX_FILE_CHMOD,
                        SANDBOX_FILE_LINK, SANDBOX_FILE_MKDIR,
                        SANDBOX_FILE_RENAME, SANDBOX_FILE_RMDIR,
                        SANDBOX_FILE_UNLINK, SANDBOX_FILE_READLINK,
                        SANDBOX_SOCKET_CONNECT, SANDBOX_SOCKET_CONNECT_ABSTRACT,
                        SANDBOX_OP_MAX_VALUE);

  static bool OperationIsValid(Operation aOp) {
    return static_cast<unsigned>(aOp) <=
           static_cast<unsigned>(SANDBOX_OP_MAX_VALUE);
  }

  static int OperationPaths(Operation aOp) {
    switch (aOp) {
      case SANDBOX_FILE_LINK:
      case SANDBOX_FILE_RENAME:
        return 2;
      default:
        return 1;
    }
  }

  static unsigned OperationToInt(Operation);
  static const char* OperationDescription(Operation);

  struct Request {
    Operation mOp;
    // For open, flags; for access, "mode"; for stat, O_NOFOLLOW for lstat.
    // For connect, the socket type.
    int mFlags;
    // ID to match child/parent requests in profiler
    uint64_t mId;
    // Size of return value buffer, if any
    size_t mBufSize;
    // The rest of the packet is the pathname.
    // SCM_RIGHTS for response socket attached.
  };

  struct Response {
    // Syscall result, -errno if failure, or 0 for no error
    int mError;
    // Followed by struct stat for stat/lstat.
    // SCM_RIGHTS attached for successful open.
  };

  // This doesn't need to be the system's maximum path length, just
  // the largest path that would be allowed by any policy.  (It's used
  // to size a stack-allocated buffer.)
  static const size_t kMaxPathLen = 4096;

  static ssize_t RecvWithFd(int aFd, const iovec* aIO, size_t aNumIO,
                            int* aPassedFdPtr);
  static ssize_t SendWithFd(int aFd, const iovec* aIO, size_t aNumIO,
                            int aPassedFd);
};

}  // namespace mozilla

#endif  // mozilla_SandboxBrokerCommon_h
