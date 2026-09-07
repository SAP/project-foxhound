/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef WAICTUtils_h
#define WAICTUtils_h

#include <cstdint>

#include "mozilla/Logging.h"
#include "mozilla/Result.h"
#include "mozilla/net/SFV.h"
#include "nsString.h"

namespace mozilla::waict {

extern LazyLogModule gWaictLog;

Result<nsCString, nsresult> ParseManifest(const net::SFV::DictResult& aDict);

Result<uint64_t, nsresult> ParseMaxAge(const net::SFV::DictResult& aDict);

enum class WaictMode { Enforce, Report };

Result<WaictMode, nsresult> ParseMode(const net::SFV::DictResult& aDict);

}  // namespace mozilla::waict

#endif  // WAICTUtils_h
