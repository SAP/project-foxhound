/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef HLSUtils_h_
#define HLSUtils_h_

#include "mozilla/Logging.h"
// Logger
mozilla::LogModule* GetHLSLog();

#define HLS_DEBUG(TAG, format, ...)                                           \
  MOZ_LOG_FMT(GetHLSLog(), mozilla::LogLevel::Debug, TAG "({})::{}: " format, \
              fmt::ptr(this), __func__, ##__VA_ARGS__)
#define HLS_DEBUG_NON_MEMBER(TAG, format, ...)                           \
  MOZ_LOG_FMT(GetHLSLog(), mozilla::LogLevel::Debug, TAG " {}: " format, \
              __func__, ##__VA_ARGS__)

#endif  // HLSUtils_h_
