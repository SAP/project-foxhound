/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_net_CookiePrefixes_h
#define mozilla_net_CookiePrefixes_h

#include "mozilla/net/NeckoChannelParams.h"

namespace mozilla::net {

class CookiePrefixes final {
 public:
  enum Prefix {
    eSecure,
    eHttp,
    eHost,
    eHostHttp,
  };

  // Returns true if `aString` begins with the `aPrefix` string.
  static bool Has(Prefix aPrefix, const nsAString& aString);

  // Returns true if `aString` begins with one of the supported prefixes.
  static bool Has(const nsACString& aString);

  // Reject cookies whose name starts with the magic prefixes from
  // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis
  // if they do not meet the criteria required by the prefix.
  static bool Check(const CookieStruct& aCookieData, bool aSecureRequest);
};

}  // namespace mozilla::net

#endif  // mozilla_net_CookiePrefixes_h
