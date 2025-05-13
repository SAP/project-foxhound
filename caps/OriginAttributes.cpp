/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 sw=2 et tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/OriginAttributes.h"
#include "mozilla/Assertions.h"
#include "mozilla/Preferences.h"
#include "mozilla/dom/BlobURLProtocolHandler.h"
#include "mozilla/dom/quota/QuotaManager.h"
#include "nsIEffectiveTLDService.h"
#include "nsIURI.h"
#include "nsNetCID.h"
#include "nsNetUtil.h"
#include "nsString.h"
#include "nsURLHelper.h"

static const char kSourceChar = ':';
static const char kSanitizedChar = '+';

namespace mozilla {

static void MakeTopLevelInfo(const nsACString& aScheme, const nsACString& aHost,
                             int32_t aPort, bool aForeignByAncestorContext,
                             bool aUseSite, nsAString& aTopLevelInfo) {
  if (!aUseSite) {
    aTopLevelInfo.Assign(NS_ConvertUTF8toUTF16(aHost));
    return;
  }

  // Note: If you change the serialization of the partition-key, please update
  // StoragePrincipalHelper.cpp too.

  nsAutoCString site;
  site.AssignLiteral("(");
  site.Append(aScheme);
  site.Append(",");
  site.Append(aHost);
  if (aPort != -1) {
    site.Append(",");
    site.AppendInt(aPort);
  }
  if (aForeignByAncestorContext) {
    site.Append(",f");
  }
  site.AppendLiteral(")");

  aTopLevelInfo.Assign(NS_ConvertUTF8toUTF16(site));
}

static void MakeTopLevelInfo(const nsACString& aScheme, const nsACString& aHost,
                             bool aForeignByAncestorContext, bool aUseSite,
                             nsAString& aTopLevelInfo) {
  MakeTopLevelInfo(aScheme, aHost, -1, aForeignByAncestorContext, aUseSite,
                   aTopLevelInfo);
}

static void PopulateTopLevelInfoFromURI(const bool aIsTopLevelDocument,
                                        nsIURI* aURI,
                                        bool aForeignByAncestorContext,
                                        bool aIsFirstPartyEnabled, bool aForced,
                                        bool aUseSite,
                                        nsString OriginAttributes::*aTarget,
                                        OriginAttributes& aOriginAttributes) {
  nsresult rv;

  if (!aURI) {
    return;
  }

  // If the prefs are off or this is not a top level load, bail out.
  if ((!aIsFirstPartyEnabled || !aIsTopLevelDocument) && !aForced) {
    return;
  }

  nsAString& topLevelInfo = aOriginAttributes.*aTarget;

  nsAutoCString scheme;
  nsCOMPtr<nsIURI> uri = aURI;
  // The URI could be nested (for example view-source:http://example.com), in
  // that case we want to get the innermost URI (http://example.com).
  nsCOMPtr<nsINestedURI> nestedURI;
  do {
    NS_ENSURE_SUCCESS_VOID(uri->GetScheme(scheme));
    nestedURI = do_QueryInterface(uri);
    // We can't just use GetInnermostURI on the nested URI, since that would
    // also unwrap some about: URIs to hidden moz-safe-about: URIs, which we do
    // not want. Thus we loop through with GetInnerURI until the URI isn't
    // nested anymore or we encounter a about: scheme.
  } while (nestedURI && !scheme.EqualsLiteral("about") &&
           NS_SUCCEEDED(nestedURI->GetInnerURI(getter_AddRefs(uri))));

  if (scheme.EqualsLiteral("about")) {
    MakeTopLevelInfo(scheme, nsLiteralCString(ABOUT_URI_FIRST_PARTY_DOMAIN),
                     aForeignByAncestorContext, aUseSite, topLevelInfo);
    return;
  }

  // If a null principal URI was provided, extract the UUID portion of the URI
  // to use for the first-party domain.
  if (scheme.EqualsLiteral("moz-nullprincipal")) {
    // Get the UUID portion of the URI, ignoring the precursor principal.
    nsAutoCString filePath;
    rv = uri->GetFilePath(filePath);
    MOZ_ASSERT(NS_SUCCEEDED(rv));
    // Remove the `{}` characters from both ends.
    filePath.Mid(filePath, 1, filePath.Length() - 2);
    filePath.AppendLiteral(".mozilla");
    // Store the generated file path.
    topLevelInfo = NS_ConvertUTF8toUTF16(filePath);
    return;
  }

  // Add-on principals should never get any first-party domain
  // attributes in order to guarantee their storage integrity when switching
  // FPI on and off.
  if (scheme.EqualsLiteral("moz-extension")) {
    return;
  }

  nsCOMPtr<nsIPrincipal> blobPrincipal;
  if (dom::BlobURLProtocolHandler::GetBlobURLPrincipal(
          uri, getter_AddRefs(blobPrincipal))) {
    MOZ_ASSERT(blobPrincipal);
    topLevelInfo = blobPrincipal->OriginAttributesRef().*aTarget;
    return;
  }

  nsCOMPtr<nsIEffectiveTLDService> tldService =
      do_GetService(NS_EFFECTIVETLDSERVICE_CONTRACTID);
  MOZ_ASSERT(tldService);
  NS_ENSURE_TRUE_VOID(tldService);

  nsAutoCString baseDomain;
  rv = tldService->GetBaseDomain(uri, 0, baseDomain);
  if (NS_SUCCEEDED(rv)) {
    MakeTopLevelInfo(scheme, baseDomain, aForeignByAncestorContext, aUseSite,
                     topLevelInfo);
    return;
  }

  // Saving before rv is overwritten.
  bool isIpAddress = (rv == NS_ERROR_HOST_IS_IP_ADDRESS);
  bool isInsufficientDomainLevels = (rv == NS_ERROR_INSUFFICIENT_DOMAIN_LEVELS);

  int32_t port;
  rv = uri->GetPort(&port);
  NS_ENSURE_SUCCESS_VOID(rv);

  nsAutoCString host;
  rv = uri->GetHost(host);
  NS_ENSURE_SUCCESS_VOID(rv);

  if (isIpAddress) {
    // If the host is an IPv4/IPv6 address, we still accept it as a
    // valid topLevelInfo.
    nsAutoCString ipAddr;

    if (net_IsValidIPv6Addr(host)) {
      // According to RFC2732, the host of an IPv6 address should be an
      // IPv6reference. The GetHost() of nsIURI will only return the IPv6
      // address. So, we need to convert it back to IPv6reference here.
      ipAddr.AssignLiteral("[");
      ipAddr.Append(host);
      ipAddr.AppendLiteral("]");
    } else {
      ipAddr = host;
    }

    MakeTopLevelInfo(scheme, ipAddr, port, aForeignByAncestorContext, aUseSite,
                     topLevelInfo);
    return;
  }

  if (aUseSite) {
    MakeTopLevelInfo(scheme, host, port, aForeignByAncestorContext, aUseSite,
                     topLevelInfo);
    return;
  }

  if (isInsufficientDomainLevels) {
    nsAutoCString publicSuffix;
    rv = tldService->GetPublicSuffix(uri, publicSuffix);
    if (NS_SUCCEEDED(rv)) {
      MakeTopLevelInfo(scheme, publicSuffix, port, aForeignByAncestorContext,
                       aUseSite, topLevelInfo);
      return;
    }
  }
}

void OriginAttributes::SetFirstPartyDomain(const bool aIsTopLevelDocument,
                                           nsIURI* aURI, bool aForced) {
  PopulateTopLevelInfoFromURI(
      aIsTopLevelDocument, aURI, false, IsFirstPartyEnabled(), aForced,
      StaticPrefs::privacy_firstparty_isolate_use_site(),
      &OriginAttributes::mFirstPartyDomain, *this);
}

void OriginAttributes::SetFirstPartyDomain(const bool aIsTopLevelDocument,
                                           const nsACString& aDomain) {
  SetFirstPartyDomain(aIsTopLevelDocument, NS_ConvertUTF8toUTF16(aDomain));
}

void OriginAttributes::SetFirstPartyDomain(const bool aIsTopLevelDocument,
                                           const nsAString& aDomain,
                                           bool aForced) {
  // If the pref is off or this is not a top level load, bail out.
  if ((!IsFirstPartyEnabled() || !aIsTopLevelDocument) && !aForced) {
    return;
  }

  mFirstPartyDomain = aDomain;
}

void OriginAttributes::SetPartitionKey(nsIURI* aURI,
                                       bool aForeignByAncestorContext) {
  PopulateTopLevelInfoFromURI(
      false /* aIsTopLevelDocument */, aURI, aForeignByAncestorContext,
      IsFirstPartyEnabled(), true /* aForced */,
      StaticPrefs::privacy_dynamic_firstparty_use_site(),
      &OriginAttributes::mPartitionKey, *this);
}

void OriginAttributes::SetPartitionKey(const nsACString& aOther) {
  SetPartitionKey(NS_ConvertUTF8toUTF16(aOther));
}

void OriginAttributes::SetPartitionKey(const nsAString& aOther) {
  mPartitionKey = aOther;
}

void OriginAttributes::CreateSuffix(nsACString& aStr) const {
  URLParams params;
  nsAutoCString value;

  //
  // Important: While serializing any string-valued attributes, perform a
  // release-mode assertion to make sure that they don't contain characters that
  // will break the quota manager when it uses the serialization for file
  // naming.
  //

  if (mUserContextId != nsIScriptSecurityManager::DEFAULT_USER_CONTEXT_ID) {
    value.Truncate();
    value.AppendInt(mUserContextId);
    params.Set("userContextId"_ns, value);
  }

  if (mPrivateBrowsingId) {
    value.Truncate();
    value.AppendInt(mPrivateBrowsingId);
    params.Set("privateBrowsingId"_ns, value);
  }

  if (!mFirstPartyDomain.IsEmpty()) {
    nsAutoString sanitizedFirstPartyDomain(mFirstPartyDomain);
    sanitizedFirstPartyDomain.ReplaceChar(kSourceChar, kSanitizedChar);
    params.Set("firstPartyDomain"_ns,
               NS_ConvertUTF16toUTF8(sanitizedFirstPartyDomain));
  }

  if (!mGeckoViewSessionContextId.IsEmpty()) {
    nsAutoString sanitizedGeckoViewUserContextId(mGeckoViewSessionContextId);
    sanitizedGeckoViewUserContextId.ReplaceChar(
        dom::quota::QuotaManager::kReplaceChars16, kSanitizedChar);
    params.Set("geckoViewUserContextId"_ns,
               NS_ConvertUTF16toUTF8(sanitizedGeckoViewUserContextId));
  }

  if (!mPartitionKey.IsEmpty()) {
    nsAutoString sanitizedPartitionKey(mPartitionKey);
    sanitizedPartitionKey.ReplaceChar(kSourceChar, kSanitizedChar);
    params.Set("partitionKey"_ns, NS_ConvertUTF16toUTF8(sanitizedPartitionKey));
  }

  aStr.Truncate();

  params.Serialize(value, true);
  if (!value.IsEmpty()) {
    aStr.AppendLiteral("^");
    aStr.Append(value);
  }

// In debug builds, check the whole string for illegal characters too (just in
// case).
#ifdef DEBUG
  nsAutoCString str;
  str.Assign(aStr);
  MOZ_ASSERT(str.FindCharInSet(dom::quota::QuotaManager::kReplaceChars) ==
             kNotFound);
#endif
}

already_AddRefed<nsAtom> OriginAttributes::CreateSuffixAtom() const {
  nsAutoCString suffix;
  CreateSuffix(suffix);
  return NS_Atomize(suffix);
}

void OriginAttributes::CreateAnonymizedSuffix(nsACString& aStr) const {
  OriginAttributes attrs = *this;

  if (!attrs.mFirstPartyDomain.IsEmpty()) {
    attrs.mFirstPartyDomain.AssignLiteral("_anonymizedFirstPartyDomain_");
  }

  if (!attrs.mPartitionKey.IsEmpty()) {
    attrs.mPartitionKey.AssignLiteral("_anonymizedPartitionKey_");
  }

  attrs.CreateSuffix(aStr);
}

bool OriginAttributes::PopulateFromSuffix(const nsACString& aStr) {
  if (aStr.IsEmpty()) {
    return true;
  }

  if (aStr[0] != '^') {
    return false;
  }

  // If a non-default mPrivateBrowsingId is passed and is not present in the
  // suffix, then it will retain the id when it should be default according
  // to the suffix. Set to default before iterating to fix this.
  mPrivateBrowsingId = nsIScriptSecurityManager::DEFAULT_PRIVATE_BROWSING_ID;

  // Checking that we are in a pristine state

  MOZ_RELEASE_ASSERT(mUserContextId == 0);
  MOZ_RELEASE_ASSERT(mPrivateBrowsingId == 0);
  MOZ_RELEASE_ASSERT(mFirstPartyDomain.IsEmpty());
  MOZ_RELEASE_ASSERT(mGeckoViewSessionContextId.IsEmpty());
  MOZ_RELEASE_ASSERT(mPartitionKey.IsEmpty());

  return URLParams::Parse(
      Substring(aStr, 1, aStr.Length() - 1), true,
      [this](const nsACString& aName, const nsACString& aValue) {
        if (aName.EqualsLiteral("inBrowser")) {
          if (!aValue.EqualsLiteral("1")) {
            return false;
          }

          return true;
        }

        if (aName.EqualsLiteral("addonId") || aName.EqualsLiteral("appId")) {
          // No longer supported. Silently ignore so that legacy origin strings
          // don't cause failures.
          return true;
        }

        if (aName.EqualsLiteral("userContextId")) {
          nsresult rv;
          int64_t val = aValue.ToInteger64(&rv);
          NS_ENSURE_SUCCESS(rv, false);
          NS_ENSURE_TRUE(val <= UINT32_MAX, false);
          mUserContextId = static_cast<uint32_t>(val);

          return true;
        }

        if (aName.EqualsLiteral("privateBrowsingId")) {
          nsresult rv;
          int64_t val = aValue.ToInteger64(&rv);
          NS_ENSURE_SUCCESS(rv, false);
          NS_ENSURE_TRUE(val >= 0 && val <= UINT32_MAX, false);
          mPrivateBrowsingId = static_cast<uint32_t>(val);

          return true;
        }

        if (aName.EqualsLiteral("firstPartyDomain")) {
          nsAutoCString firstPartyDomain(aValue);
          firstPartyDomain.ReplaceChar(kSanitizedChar, kSourceChar);
          mFirstPartyDomain.Assign(NS_ConvertUTF8toUTF16(firstPartyDomain));
          return true;
        }

        if (aName.EqualsLiteral("geckoViewUserContextId")) {
          mGeckoViewSessionContextId.Assign(NS_ConvertUTF8toUTF16(aValue));
          return true;
        }

        if (aName.EqualsLiteral("partitionKey")) {
          nsAutoCString partitionKey(aValue);
          partitionKey.ReplaceChar(kSanitizedChar, kSourceChar);
          mPartitionKey.Assign(NS_ConvertUTF8toUTF16(partitionKey));
          return true;
        }

        // No other attributes are supported.
        return false;
      });
}

bool OriginAttributes::PopulateFromOrigin(const nsACString& aOrigin,
                                          nsACString& aOriginNoSuffix) {
  // RFindChar is only available on nsCString.
  nsCString origin(aOrigin);
  int32_t pos = origin.RFindChar('^');

  if (pos == kNotFound) {
    aOriginNoSuffix = origin;
    return true;
  }

  aOriginNoSuffix = Substring(origin, 0, pos);
  return PopulateFromSuffix(Substring(origin, pos));
}

void OriginAttributes::SyncAttributesWithPrivateBrowsing(
    bool aInPrivateBrowsing) {
  mPrivateBrowsingId = aInPrivateBrowsing ? 1 : 0;
}

/* static */
bool OriginAttributes::IsPrivateBrowsing(const nsACString& aOrigin) {
  nsAutoCString dummy;
  OriginAttributes attrs;
  if (NS_WARN_IF(!attrs.PopulateFromOrigin(aOrigin, dummy))) {
    return false;
  }

  return attrs.IsPrivateBrowsing();
}

/* static */
bool OriginAttributes::ParsePartitionKey(const nsAString& aPartitionKey,
                                         nsAString& outScheme,
                                         nsAString& outBaseDomain,
                                         int32_t& outPort,
                                         bool& outForeignByAncestorContext) {
  outScheme.Truncate();
  outBaseDomain.Truncate();
  outPort = -1;
  outForeignByAncestorContext = false;

  // Partition keys have the format
  // "(<scheme>,<baseDomain>[,port][,foreignancestorbit])". The port and
  // ancestor bits are optional. For example: "(https,example.com,8443)" or
  // "(http,example.org)", or "(http,example.info,f)", or
  // "(http,example.biz,8443,f)". When privacy.dynamic_firstparty.use_site =
  // false, the partitionKey contains only the host, e.g. "example.com". See
  // MakeTopLevelInfo for the partitionKey serialization code.

  if (aPartitionKey.IsEmpty()) {
    return true;
  }

  // PartitionKey contains only the host.
  if (!StaticPrefs::privacy_dynamic_firstparty_use_site()) {
    outBaseDomain = aPartitionKey;
    return true;
  }

  // Smallest possible partitionKey is "(x,x)". Scheme and base domain are
  // mandatory.
  if (NS_WARN_IF(aPartitionKey.Length() < 5)) {
    return false;
  }

  if (NS_WARN_IF(aPartitionKey.First() != '(' || aPartitionKey.Last() != ')')) {
    return false;
  }

  // Remove outer brackets so we can string split.
  nsAutoString str(Substring(aPartitionKey, 1, aPartitionKey.Length() - 2));

  uint32_t fieldIndex = 0;
  for (const nsAString& field : str.Split(',')) {
    if (NS_WARN_IF(field.IsEmpty())) {
      // There cannot be empty fields.
      return false;
    }

    if (fieldIndex == 0) {
      outScheme.Assign(field);
    } else if (fieldIndex == 1) {
      outBaseDomain.Assign(field);
    } else if (fieldIndex == 2) {
      // The first optional argument is either "f" or a port number
      if (field.EqualsLiteral("f")) {
        outForeignByAncestorContext = true;
      } else {
        // Parse the port which is represented in the partitionKey string as a
        // decimal (base 10) number.
        long port = strtol(NS_ConvertUTF16toUTF8(field).get(), nullptr, 10);
        // Invalid port.
        if (NS_WARN_IF(port == 0)) {
          return false;
        }
        outPort = static_cast<int32_t>(port);
      }
    } else if (fieldIndex == 3) {
      // The second optional argument, if it exists, is "f" and the first
      // optional argument was a port
      if (!field.EqualsLiteral("f") || outPort != -1) {
        NS_WARNING("Invalid partitionKey. Invalid token.");
        return false;
      }
      outForeignByAncestorContext = true;
    } else {
      NS_WARNING("Invalid partitionKey. Too many tokens");
      return false;
    }

    fieldIndex++;
  }

  // scheme and base domain are required.
  return fieldIndex > 1;
}

}  // namespace mozilla
