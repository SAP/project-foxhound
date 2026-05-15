/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "Cookie.h"
#include "CookieCommons.h"
#include "CookieStorage.h"
#include "mozilla/Encoding.h"
#include "mozilla/dom/ToJSValue.h"
#include "mozilla/glean/NetwerkMetrics.h"
#include "mozilla/StaticPrefs_network.h"
#include "nsIURLParser.h"
#include "nsURLHelper.h"
#include <cstdlib>

namespace mozilla {
namespace net {

/******************************************************************************
 * Cookie:
 * creation helper
 ******************************************************************************/

// This is a counter that keeps track of the last used creation time, each time
// we create a new Cookie. This is nominally the time (in microseconds) the
// cookie was created, but is guaranteed to be monotonically increasing for
// cookies added at runtime after the database has been read in. This is
// necessary to enforce ordering among cookies whose creation times would
// otherwise overlap, since it's possible two cookies may be created at the
// same time, or that the system clock isn't monotonic.
static int64_t gLastCreationTimeInUSec;

int64_t Cookie::GenerateUniqueCreationTimeInUSec(int64_t aCreationTimeInUSec) {
  // Check if the creation time given to us is greater than the running maximum
  // (it should always be monotonically increasing).
  if (aCreationTimeInUSec > gLastCreationTimeInUSec) {
    gLastCreationTimeInUSec = aCreationTimeInUSec;
    return aCreationTimeInUSec;
  }

  // Make up our own.
  return ++gLastCreationTimeInUSec;
}

already_AddRefed<Cookie> Cookie::Create(
    const CookieStruct& aCookieData,
    const OriginAttributes& aOriginAttributes) {
  RefPtr<Cookie> cookie =
      Cookie::FromCookieStruct(aCookieData, aOriginAttributes);

  // If the creationTimeInUSec given to us is higher than the running maximum,
  // update our maximum.
  if (cookie->mData.creationTimeInUSec() > gLastCreationTimeInUSec) {
    gLastCreationTimeInUSec = cookie->mData.creationTimeInUSec();
  }

  return cookie.forget();
}

already_AddRefed<Cookie> Cookie::FromCookieStruct(
    const CookieStruct& aCookieData,
    const OriginAttributes& aOriginAttributes) {
  RefPtr<Cookie> cookie = new Cookie(aCookieData, aOriginAttributes);

  // Ensure mValue contains a valid UTF-8 sequence. Otherwise XPConnect will
  // truncate the string after the first invalid octet.
  UTF_8_ENCODING->DecodeWithoutBOMHandling(aCookieData.value(),
                                           cookie->mData.value());

  // If sameSite value is not sensible reset to Default
  // cf. 5.4.7 in draft-ietf-httpbis-rfc6265bis-09
  if (cookie->mData.sameSite() != nsICookie::SAMESITE_NONE &&
      cookie->mData.sameSite() != nsICookie::SAMESITE_LAX &&
      cookie->mData.sameSite() != nsICookie::SAMESITE_STRICT &&
      cookie->mData.sameSite() != nsICookie::SAMESITE_UNSET) {
    cookie->mData.sameSite() = nsICookie::SAMESITE_UNSET;
  }

  // Enforce session cookie if the partition is session-only.
  if (CookieCommons::ShouldEnforceSessionForOriginAttributes(
          aOriginAttributes)) {
    cookie->mData.isSession() = true;
  }

  return cookie.forget();
}

already_AddRefed<Cookie> Cookie::CreateValidated(
    const CookieStruct& aCookieData,
    const OriginAttributes& aOriginAttributes) {
  if (!StaticPrefs::network_cookie_fixup_on_db_load()) {
    return Cookie::Create(aCookieData, aOriginAttributes);
  }

  RefPtr<Cookie> cookie =
      Cookie::FromCookieStruct(aCookieData, aOriginAttributes);

  int64_t currentTimeInUsec = PR_Now();
  // Assert that the last creation time is not higher than the current time.
  // The 10000 wiggle room accounts for the fact that calling
  // GenerateUniqueCreationTimeInUSec might go over the value of PR_Now(), but
  // we'd most likely not add 10000 cookies in a row.
  MOZ_ASSERT(gLastCreationTimeInUSec < currentTimeInUsec + 10000,
             "Last creation time must not be higher than NOW");

  // If the creationTimeInUSec given to us is higher than the current time then
  // update the creation time to now.
  if (cookie->mData.creationTimeInUSec() > currentTimeInUsec) {
    uint64_t diffInSeconds =
        (cookie->mData.creationTimeInUSec() - currentTimeInUsec) /
        PR_USEC_PER_SEC;
    mozilla::glean::networking::cookie_creation_fixup_diff
        .AccumulateSingleSample(diffInSeconds);
    glean::networking::cookie_timestamp_fixed_count.Get("creationTime"_ns)
        .Add(1);

    cookie->mData.creationTimeInUSec() =
        GenerateUniqueCreationTimeInUSec(currentTimeInUsec);
  }

  if (cookie->mData.lastAccessedInUSec() > currentTimeInUsec) {
    uint64_t diffInSeconds =
        (cookie->mData.lastAccessedInUSec() - currentTimeInUsec) /
        PR_USEC_PER_SEC;
    mozilla::glean::networking::cookie_access_fixup_diff.AccumulateSingleSample(
        diffInSeconds);
    glean::networking::cookie_timestamp_fixed_count.Get("lastAccessed"_ns)
        .Add(1);

    cookie->mData.lastAccessedInUSec() = currentTimeInUsec;
  }

  if (cookie->mData.updateTimeInUSec() > currentTimeInUsec) {
    uint64_t diffInSeconds =
        (cookie->mData.updateTimeInUSec() - currentTimeInUsec) /
        PR_USEC_PER_SEC;
    mozilla::glean::networking::cookie_access_fixup_diff.AccumulateSingleSample(
        diffInSeconds);
    glean::networking::cookie_timestamp_fixed_count.Get("updateTime"_ns).Add(1);

    cookie->mData.updateTimeInUSec() = currentTimeInUsec;
  }

  return cookie.forget();
}

size_t Cookie::SizeOfIncludingThis(mozilla::MallocSizeOf aMallocSizeOf) const {
  return aMallocSizeOf(this) +
         mData.name().SizeOfExcludingThisIfUnshared(MallocSizeOf) +
         mData.value().SizeOfExcludingThisIfUnshared(MallocSizeOf) +
         mData.host().SizeOfExcludingThisIfUnshared(MallocSizeOf) +
         mData.path().SizeOfExcludingThisIfUnshared(MallocSizeOf);
}

bool Cookie::IsStale() const {
  int64_t currentTimeInUsec = PR_Now();

  return currentTimeInUsec - LastAccessedInUSec() >
         StaticPrefs::network_cookie_staleThreshold() * PR_USEC_PER_SEC;
}

/******************************************************************************
 * Cookie:
 * xpcom impl
 ******************************************************************************/

// xpcom getters
NS_IMETHODIMP Cookie::GetName(nsACString& aName) {
  aName = Name();
  return NS_OK;
}
NS_IMETHODIMP Cookie::GetValue(nsACString& aValue) {
  aValue = Value();
  return NS_OK;
}
NS_IMETHODIMP Cookie::GetHost(nsACString& aHost) {
  aHost = Host();
  return NS_OK;
}
NS_IMETHODIMP Cookie::GetRawHost(nsACString& aHost) {
  aHost = RawHost();
  return NS_OK;
}
NS_IMETHODIMP Cookie::GetPath(nsACString& aPath) {
  aPath = Path();
  return NS_OK;
}
NS_IMETHODIMP Cookie::GetExpiry(int64_t* aExpiry) {
  *aExpiry = ExpiryInMSec();
  return NS_OK;
}
NS_IMETHODIMP Cookie::GetIsSession(bool* aIsSession) {
  *aIsSession = IsSession();
  return NS_OK;
}
NS_IMETHODIMP Cookie::GetIsDomain(bool* aIsDomain) {
  *aIsDomain = IsDomain();
  return NS_OK;
}
NS_IMETHODIMP Cookie::GetIsSecure(bool* aIsSecure) {
  *aIsSecure = IsSecure();
  return NS_OK;
}
NS_IMETHODIMP Cookie::GetIsHttpOnly(bool* aHttpOnly) {
  *aHttpOnly = IsHttpOnly();
  return NS_OK;
}
NS_IMETHODIMP Cookie::GetIsPartitioned(bool* aPartitioned) {
  *aPartitioned = IsPartitioned();
  return NS_OK;
}
NS_IMETHODIMP Cookie::GetCreationTime(int64_t* aCreation) {
  *aCreation = CreationTimeInUSec();
  return NS_OK;
}
NS_IMETHODIMP Cookie::GetLastAccessed(int64_t* aTime) {
  *aTime = LastAccessedInUSec();
  return NS_OK;
}
NS_IMETHODIMP Cookie::GetUpdateTime(int64_t* aTime) {
  *aTime = UpdateTimeInUSec();
  return NS_OK;
}
NS_IMETHODIMP Cookie::GetSameSite(int32_t* aSameSite) {
  *aSameSite = SameSite();
  return NS_OK;
}
NS_IMETHODIMP Cookie::GetSchemeMap(nsICookie::schemeType* aSchemeMap) {
  *aSchemeMap = static_cast<nsICookie::schemeType>(SchemeMap());
  return NS_OK;
}

NS_IMETHODIMP
Cookie::GetOriginAttributes(JSContext* aCx, JS::MutableHandle<JS::Value> aVal) {
  if (NS_WARN_IF(!ToJSValue(aCx, mOriginAttributes, aVal))) {
    return NS_ERROR_FAILURE;
  }
  return NS_OK;
}

const OriginAttributes& Cookie::OriginAttributesNative() {
  return mOriginAttributes;
}

const Cookie& Cookie::AsCookie() { return *this; }

// compatibility method, for use with the legacy nsICookie interface.
// here, expires == 0 denotes a session cookie.
NS_IMETHODIMP
Cookie::GetExpires(uint64_t* aExpires) {
  if (IsSession()) {
    *aExpires = 0;
  } else {
    *aExpires = ExpiryInMSec() > 0 ? ExpiryInMSec() : 1;
  }
  return NS_OK;
}

already_AddRefed<Cookie> Cookie::Clone() const {
  return Create(mData, OriginAttributesRef());
}

NS_IMPL_ISUPPORTS(Cookie, nsICookie)

}  // namespace net
}  // namespace mozilla
