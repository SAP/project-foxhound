/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_net_ChannelClassifierLog_h
#define mozilla_net_ChannelClassifierLog_h

#include "mozilla/Logging.h"

namespace mozilla {
namespace net {

extern LazyLogModule gChannelClassifierLog;
extern LazyLogModule gChannelClassifierLogLeak;

}  // namespace net
}  // namespace mozilla

#define UC_LOG(args) \
  MOZ_LOG(mozilla::net::gChannelClassifierLog, mozilla::LogLevel::Info, args)
#define UC_LOG_DEBUG(args) \
  MOZ_LOG(mozilla::net::gChannelClassifierLog, mozilla::LogLevel::Debug, args)
#define UC_LOG_WARN(args) \
  MOZ_LOG(mozilla::net::gChannelClassifierLog, mozilla::LogLevel::Warning, args)
#define UC_LOG_LEAK(args)                                                   \
  MOZ_LOG(mozilla::net::gChannelClassifierLogLeak, mozilla::LogLevel::Info, \
          args)

#define UC_LOG_ENABLED()                                    \
  MOZ_LOG_TEST(mozilla::net::gChannelClassifierLog,         \
               mozilla::LogLevel::Info) ||                  \
      MOZ_LOG_TEST(mozilla::net::gChannelClassifierLogLeak, \
                   mozilla::LogLevel::Info)

#endif  // mozilla_net_ChannelClassifierLog_h
