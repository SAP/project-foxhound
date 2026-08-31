/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "WAICTUtils.h"

#include <cstdint>

#include "mozilla/net/SFV.h"
#include "nsString.h"

namespace mozilla::waict {

LazyLogModule gWaictLog("WAICT");

Result<nsCString, nsresult> ParseManifest(const net::SFV::DictResult& aDict) {
  nsAutoCString manifestURL;
  nsresult rv = aDict.GetItem<net::SFV::SFVString>("manifest"_ns, manifestURL);
  if (NS_FAILED(rv)) {
    return Err(rv);
  }
  if (manifestURL.IsEmpty()) {
    return Err(NS_ERROR_FAILURE);
  }
  return nsCString(manifestURL);
}

Result<uint64_t, nsresult> ParseMaxAge(const net::SFV::DictResult& aDict) {
  int64_t maxAgeSeconds;
  nsresult rv = aDict.GetItem<net::SFV::Integer>("max-age"_ns, maxAgeSeconds);
  if (NS_FAILED(rv)) {
    return Err(rv);
  }
  if (maxAgeSeconds < 0) {
    return Err(NS_ERROR_FAILURE);
  }
  return static_cast<uint64_t>(maxAgeSeconds);
}

Result<WaictMode, nsresult> ParseMode(const net::SFV::DictResult& aDict) {
  nsAutoCString token;
  nsresult rv = aDict.GetItem<net::SFV::Token>("mode"_ns, token);
  if (NS_FAILED(rv)) {
    return Err(rv);
  }

  if (token.EqualsLiteral("enforce")) {
    return WaictMode::Enforce;
  }
  if (token.EqualsLiteral("report")) {
    return WaictMode::Report;
  }

  return Err(NS_ERROR_FAILURE);
}

}  // namespace mozilla::waict
