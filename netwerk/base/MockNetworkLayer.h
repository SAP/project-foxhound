/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MockNetworkLayer_h_
#define MockNetworkLayer_h_

#include "prerror.h"
#include "prio.h"
#include "ErrorList.h"

namespace mozilla::net {

nsresult AttachMockNetworkLayer(PRFileDesc* fd);

}  // namespace mozilla::net

#endif  // MockNetworkLayer_h_
