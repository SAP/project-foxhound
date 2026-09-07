/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_toolkit_system_commonproxy_ProxyUtils_h
#define mozilla_toolkit_system_commonproxy_ProxyUtils_h

#include "nsString.h"

namespace mozilla {
namespace toolkit {
namespace system {

nsresult GetProxyFromEnvironment(const nsACString& aScheme,
                                 const nsACString& aHost, int32_t aPort,
                                 nsACString& aResult);
bool IsHostProxyEntry(const nsACString& aHost, const nsACString& aOverride);

// Returns true if any proxy-related environment variable is set
// (http_proxy, https_proxy, all_proxy, or uppercase equivalents).
bool HasProxyEnvVars();
}  // namespace system
}  // namespace toolkit
}  // namespace mozilla

#endif  // mozilla_toolkit_system_commonproxy_ProxyUtils_h
