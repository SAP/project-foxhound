/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef webrtc_tcp_socket_log_h_
#define webrtc_tcp_socket_log_h_

#include "mozilla/Logging.h"

namespace mozilla::net {
extern LazyLogModule webrtcTCPSocketLog;
}  // namespace mozilla::net

#undef LOG
#define LOG(...)                                                          \
  MOZ_LOG_FMT(mozilla::net::webrtcTCPSocketLog, mozilla::LogLevel::Debug, \
              __VA_ARGS__)

#endif  // webrtc_tcp_socket_log_h_
