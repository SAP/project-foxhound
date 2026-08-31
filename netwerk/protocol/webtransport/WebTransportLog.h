/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef WebTransportLog_h
#define WebTransportLog_h

#include "mozilla/Logging.h"
#include "mozilla/net/NeckoChild.h"

namespace mozilla::net {
extern LazyLogModule webTransportLog;
}  // namespace mozilla::net

#undef LOG
#define LOG(args) \
  MOZ_LOG(mozilla::net::webTransportLog, mozilla::LogLevel::Debug, args)

#endif
