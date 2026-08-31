/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef NETWERK_BASE_HTTP_SFV_SFVSERVICE_H_
#define NETWERK_BASE_HTTP_SFV_SFVSERVICE_H_

#include "nsIStructuredFieldValues.h"
namespace mozilla {
namespace net {

already_AddRefed<nsISFVService> GetSFVService();

}  // namespace net
}  // namespace mozilla

#endif  // NETWERK_BASE_HTTP_SFV_SFVSERVICE_H_
