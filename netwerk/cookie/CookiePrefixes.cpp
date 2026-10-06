/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "CookiePrefixes.h"

namespace mozilla::net {

namespace {

struct CookiePrefix {
  CookiePrefixes::Prefix mPrefix;
  nsCString mPrefixCString;
  nsString mPrefixString;
  std::function<bool(const CookieStruct&, bool)> mCallback;
};

// Ordered longest-prefix-first so that more specific prefixes (e.g.
// __Host-Http-) are checked before shorter prefixes they start with (e.g.
// __Host-), since Check() returns on the first match.
//
// Per RFC 6265bis §5.4, UAs MUST match these prefixes case-insensitively
// (see Check() below), even though §4.1.3 describes them with "case-sensitive
// match" language — that wording applies to server-side semantics, not UA
// enforcement.
MOZ_RUNINIT CookiePrefix gCookiePrefixes[] = {
    {CookiePrefixes::eHostHttp, "__Host-Http-"_ns, u"__Host-Http-"_ns,
     [](const CookieStruct& aCookieData, bool aSecureRequest) -> bool {
       // RFC 6265bis §4.1.3: the __Host-Http- prefix requires Secure,
       // HttpOnly, Path=/, and no Domain attribute.
       return aSecureRequest && aCookieData.isSecure() &&
              aCookieData.isHttpOnly() && aCookieData.host()[0] != '.' &&
              aCookieData.path().EqualsLiteral("/");
     }},

    {CookiePrefixes::eHost, "__Host-"_ns, u"__Host-"_ns,
     [](const CookieStruct& aCookieData, bool aSecureRequest) -> bool {
       // RFC 6265bis §4.1.3: the __Host- prefix requires Secure, Path=/,
       // and no Domain attribute.
       return aSecureRequest && aCookieData.isSecure() &&
              aCookieData.host()[0] != '.' &&
              aCookieData.path().EqualsLiteral("/");
     }},

    {CookiePrefixes::eHttp, "__Http-"_ns, u"__Http-"_ns,
     [](const CookieStruct& aCookieData, bool aSecureRequest) -> bool {
       // RFC 6265bis §4.1.3: the __Http- prefix requires Secure and HttpOnly.
       return aSecureRequest && aCookieData.isSecure() &&
              aCookieData.isHttpOnly();
     }},

    {CookiePrefixes::eSecure, "__Secure-"_ns, u"__Secure-"_ns,
     [](const CookieStruct& aCookieData, bool aSecureRequest) -> bool {
       // RFC 6265bis §4.1.3: the __Secure- prefix requires Secure.
       return aSecureRequest && aCookieData.isSecure();
     }},
};

}  // namespace

// static
bool CookiePrefixes::Has(Prefix aPrefix, const nsAString& aString) {
  for (CookiePrefix& prefix : gCookiePrefixes) {
    if (prefix.mPrefix == aPrefix) {
      return StringBeginsWith(aString, prefix.mPrefixString,
                              nsCaseInsensitiveStringComparator);
    }
  }

  return false;
}

// static
bool CookiePrefixes::Has(const nsACString& aString) {
  for (CookiePrefix& prefix : gCookiePrefixes) {
    if (StringBeginsWith(aString, prefix.mPrefixCString,
                         nsCaseInsensitiveCStringComparator)) {
      return true;
    }
  }

  return false;
}

// static
bool CookiePrefixes::Check(const CookieStruct& aCookieData,
                           bool aSecureRequest) {
  // RFC 6265bis §5.4 requires UAs to match prefixes case-insensitively.
  // This prevents servers that process cookie names case-insensitively from
  // inadvertently accepting miscapitalized prefixes without their guarantees.
  for (CookiePrefix& prefix : gCookiePrefixes) {
    if (StringBeginsWith(aCookieData.name(), prefix.mPrefixCString,
                         nsCaseInsensitiveCStringComparator)) {
      return prefix.mCallback(aCookieData, aSecureRequest);
    }
  }

  // not one of the magic prefixes: carry on
  return true;
}

}  // namespace mozilla::net
