/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef NETWERK_BASE_NETWORKINFOSERVICEIMPL_H_
#define NETWERK_BASE_NETWORKINFOSERVICEIMPL_H_

#include "nsString.h"
#include "nsTHashMap.h"

namespace mozilla {
namespace net {

using AddrMapType = nsTHashMap<nsCStringHashKey, nsCString>;

nsresult DoListAddresses(AddrMapType& aAddrMap);

}  // namespace net
}  // namespace mozilla

#endif  // NETWERK_BASE_NETWORKINFOSERVICEIMPL_H_
