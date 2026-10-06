/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "AppleFastDatapathProbe.h"

#if defined(XP_MACOSX) || defined(XP_IOS)

#  include <dlfcn.h>
#  include <netinet/in.h>
#  include <sys/socket.h>
#  include <sys/types.h>
#  include <unistd.h>

#  include "mozilla/Logging.h"
#  include "mozilla/ScopeExit.h"
#  include "mozilla/StaticPrefs_network.h"
#  include "mozilla/net/neqo_glue_ffi_generated.h"

namespace mozilla::net {

namespace {

bool ProbeAppleFastDatapath() {
  // Fast-fail if the private symbols are not present.
  if (!dlsym(RTLD_DEFAULT, "sendmsg_x") || !dlsym(RTLD_DEFAULT, "recvmsg_x")) {
    return false;
  }

  // Create two UDP sockets bound to localhost, mirroring neqo's usage of
  // unconnected sockets where the destination is specified per-datagram.
  auto makeSocket = []() -> int {
    int fd = socket(AF_INET, SOCK_DGRAM, 0);
    if (fd < 0) {
      return -1;
    }
    sockaddr_in addr = {};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    if (bind(fd, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) < 0) {
      close(fd);
      return -1;
    }
    return fd;
  };

  int sendFd = makeSocket();
  if (sendFd < 0) {
    return false;
  }
  int recvFd = makeSocket();
  if (recvFd < 0) {
    close(sendFd);
    return false;
  }
  auto closeFds = mozilla::MakeScopeExit([sendFd, recvFd]() {
    close(sendFd);
    close(recvFd);
  });

  return neqo_glue_probe_apple_fast_path(sendFd, recvFd);
}

}  // namespace

bool InitAppleFastDatapathProbe() {
  static mozilla::LazyLogModule sLog("AppleFastDatapath");
  static bool sAvailable = []() {
    if (!mozilla::StaticPrefs::network_http_http3_apple_fast_datapath()) {
      return false;
    }
    bool available = ProbeAppleFastDatapath();
    if (available) {
      neqo_glue_enable_apple_fast_path();
    }
    MOZ_LOG(sLog, mozilla::LogLevel::Debug,
            ("Apple fast datapath probe: available=%s",
             available ? "true" : "false"));
    return available;
  }();
  return sAvailable;
}

}  // namespace mozilla::net

#else  // Not Apple

namespace mozilla::net {

bool InitAppleFastDatapathProbe() { return false; }

}  // namespace mozilla::net

#endif
