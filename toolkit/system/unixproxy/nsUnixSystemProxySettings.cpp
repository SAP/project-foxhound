/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsISystemProxySettings.h"
#include "mozilla/Components.h"
#include "nsIURI.h"
#include "nsArrayUtils.h"
#include "prnetdb.h"
#include "prenv.h"
#include "nsClassHashtable.h"
#include "nsHashtablesFwd.h"
#include "nsHashKeys.h"
#include "nsNetUtil.h"
#include "nsISupportsPrimitives.h"
#include "mozilla/widget/GSettings.h"
#include "nsReadableUtils.h"
#include "ProxyUtils.h"

using namespace mozilla;

class nsUnixSystemProxySettings final : public nsISystemProxySettings {
 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSISYSTEMPROXYSETTINGS

  nsUnixSystemProxySettings() : mSchemeProxySettings(4) {}

 private:
  ~nsUnixSystemProxySettings() = default;

  widget::GSettings::Collection mProxySettings{"org.gnome.system.proxy"_ns};
  nsClassHashtable<nsCStringHashKey, widget::GSettings::Collection>
      mSchemeProxySettings;
  nsresult GetProxyFromGSettings(const nsACString& aScheme,
                                 const nsACString& aHost, int32_t aPort,
                                 nsACString& aResult);
  nsresult SetProxyResultFromGSettings(const nsCString& aSchema,
                                       const char* aType, nsACString& aResult);
};

NS_IMPL_ISUPPORTS(nsUnixSystemProxySettings, nsISystemProxySettings)

NS_IMETHODIMP
nsUnixSystemProxySettings::GetMainThreadOnly(bool* aMainThreadOnly) {
  // dbus prevents us from being threadsafe, but this routine should not block
  // anyhow
  *aMainThreadOnly = true;
  return NS_OK;
}

nsresult nsUnixSystemProxySettings::GetPACURI(nsACString& aResult) {
  if (mProxySettings) {
    nsAutoCString proxyMode;
    // Check if mode is auto
    mProxySettings.GetString("mode"_ns, proxyMode);
    if (proxyMode.EqualsLiteral("auto")) {
      mProxySettings.GetString("autoconfig-url"_ns, aResult);
      return NS_OK;
    }
  }
  // Return an empty string when auto mode is not set.
  aResult.Truncate();
  return NS_OK;
}

static void SetProxyResult(const char* aType, const nsACString& aHost,
                           int32_t aPort, nsACString& aResult) {
  aResult.AssignASCII(aType);
  aResult.Append(' ');
  aResult.Append(aHost);
  if (aPort > 0) {
    aResult.Append(':');
    aResult.AppendInt(aPort);
  }
}

static void SetProxyResultDirect(nsACString& aResult) {
  aResult.AssignLiteral("DIRECT");
}

nsresult nsUnixSystemProxySettings::SetProxyResultFromGSettings(
    const nsCString& aSchema, const char* aType, nsACString& aResult) {
  auto& settings = mSchemeProxySettings.LookupOrInsertWith(aSchema, [&] {
    return MakeUnique<widget::GSettings::Collection>(aSchema);
  });

  nsAutoCString host;
  settings->GetString("host"_ns, host);
  if (host.IsEmpty()) {
    return NS_ERROR_FAILURE;
  }

  int32_t port = settings->GetInt("port"_ns).valueOr(0);

  // When port is 0, proxy is not considered as enabled even if host is set.
  if (port == 0) {
    return NS_ERROR_FAILURE;
  }

  SetProxyResult(aType, host, port, aResult);
  return NS_OK;
}

/* copied from nsProtocolProxyService.cpp --- we should share this! */
static void proxy_MaskIPv6Addr(PRIPv6Addr& addr, uint16_t mask_len) {
  if (mask_len == 128) return;

  if (mask_len > 96) {
    addr.pr_s6_addr32[3] =
        PR_htonl(PR_ntohl(addr.pr_s6_addr32[3]) & (~0L << (128 - mask_len)));
  } else if (mask_len > 64) {
    addr.pr_s6_addr32[3] = 0;
    addr.pr_s6_addr32[2] =
        PR_htonl(PR_ntohl(addr.pr_s6_addr32[2]) & (~0L << (96 - mask_len)));
  } else if (mask_len > 32) {
    addr.pr_s6_addr32[3] = 0;
    addr.pr_s6_addr32[2] = 0;
    addr.pr_s6_addr32[1] =
        PR_htonl(PR_ntohl(addr.pr_s6_addr32[1]) & (~0L << (64 - mask_len)));
  } else {
    addr.pr_s6_addr32[3] = 0;
    addr.pr_s6_addr32[2] = 0;
    addr.pr_s6_addr32[1] = 0;
    addr.pr_s6_addr32[0] =
        PR_htonl(PR_ntohl(addr.pr_s6_addr32[0]) & (~0L << (32 - mask_len)));
  }
}

static bool ConvertToIPV6Addr(const nsACString& aName, PRIPv6Addr* aAddr,
                              int32_t* aMask) {
  PRNetAddr addr;
  // try to convert hostname to IP
  if (PR_StringToNetAddr(PromiseFlatCString(aName).get(), &addr) != PR_SUCCESS)
    return false;

  // convert parsed address to IPv6
  if (addr.raw.family == PR_AF_INET) {
    // convert to IPv4-mapped address
    PR_ConvertIPv4AddrToIPv6(addr.inet.ip, aAddr);
    if (aMask) {
      if (*aMask <= 32)
        *aMask += 96;
      else
        return false;
    }
  } else if (addr.raw.family == PR_AF_INET6) {
    // copy the address
    memcpy(aAddr, &addr.ipv6.ip, sizeof(PRIPv6Addr));
  } else {
    return false;
  }

  return true;
}

static bool HostIgnoredByProxy(const nsACString& aIgnore,
                               const nsACString& aHost) {
  if (aIgnore.IsEmpty()) {
    return false;
  }
  if (aIgnore.Equals(aHost, nsCaseInsensitiveCStringComparator)) {
    return true;
  }
  if (aIgnore.First() == '*' &&
      StringEndsWith(aHost, nsDependentCSubstring(aIgnore, 1),
                     nsCaseInsensitiveCStringComparator)) {
    return true;
  }

  int32_t mask = 128;
  nsReadingIterator<char> start;
  nsReadingIterator<char> slash;
  nsReadingIterator<char> end;
  aIgnore.BeginReading(start);
  aIgnore.BeginReading(slash);
  aIgnore.EndReading(end);
  if (FindCharInReadable('/', slash, end)) {
    ++slash;
    nsDependentCSubstring maskStr(slash, end);
    nsAutoCString maskStr2(maskStr);
    nsresult err;
    mask = maskStr2.ToInteger(&err);
    if (NS_FAILED(err)) {
      mask = 128;
    }
    --slash;
  } else {
    slash = end;
  }

  nsDependentCSubstring ignoreStripped(start, slash);
  PRIPv6Addr ignoreAddr, hostAddr;
  if (!ConvertToIPV6Addr(ignoreStripped, &ignoreAddr, &mask) ||
      !ConvertToIPV6Addr(aHost, &hostAddr, nullptr)) {
    return false;
  }

  proxy_MaskIPv6Addr(ignoreAddr, mask);
  proxy_MaskIPv6Addr(hostAddr, mask);

  return memcmp(&ignoreAddr, &hostAddr, sizeof(PRIPv6Addr)) == 0;
}

nsresult nsUnixSystemProxySettings::GetProxyFromGSettings(
    const nsACString& aScheme, const nsACString& aHost, int32_t aPort,
    nsACString& aResult) {
  nsCString proxyMode;
  mProxySettings.GetString("mode"_ns, proxyMode);
  // return NS_ERROR_FAILURE when no proxy is set
  if (!proxyMode.EqualsLiteral("manual")) {
    return NS_ERROR_FAILURE;
  }

  nsTArray<nsCString> ignoreList;
  mProxySettings.GetStringList("ignore-hosts"_ns, ignoreList);
  for (auto& s : ignoreList) {
    if (HostIgnoredByProxy(s, aHost)) {
      SetProxyResultDirect(aResult);
      return NS_OK;
    }
  }

  nsresult rv = NS_OK;
  if (aScheme.LowerCaseEqualsLiteral("http")) {
    rv = SetProxyResultFromGSettings("org.gnome.system.proxy.http"_ns, "PROXY",
                                     aResult);
  } else if (aScheme.LowerCaseEqualsLiteral("https")) {
    rv = SetProxyResultFromGSettings("org.gnome.system.proxy.https"_ns, "PROXY",
                                     aResult);
    /* Try to use HTTP proxy when HTTPS proxy is not explicitly defined */
    if (rv != NS_OK) {
      rv = SetProxyResultFromGSettings("org.gnome.system.proxy.http"_ns,
                                       "PROXY", aResult);
    }
  } else {
    rv = NS_ERROR_FAILURE;
  }
  if (rv != NS_OK) {
    /* If proxy for scheme is not specified, use SOCKS proxy for all schemes */
    rv = SetProxyResultFromGSettings("org.gnome.system.proxy.socks"_ns, "SOCKS",
                                     aResult);
  }

  if (NS_FAILED(rv)) {
    SetProxyResultDirect(aResult);
  }

  return NS_OK;
}

NS_IMETHODIMP nsUnixSystemProxySettings::SetSystemProxyInfo(
    const nsACString& aHost, int32_t aPort, const nsACString& aPacFileUrl,
    const nsTArray<nsCString>& aExclusionList) {
  MOZ_ASSERT(false, "Did not expect to be called on this platform");
  return NS_ERROR_NOT_IMPLEMENTED;
}

nsresult nsUnixSystemProxySettings::GetProxyForURI(const nsACString& aSpec,
                                                   const nsACString& aScheme,
                                                   const nsACString& aHost,
                                                   const int32_t aPort,
                                                   nsACString& aResult) {
  nsresult rv = mozilla::toolkit::system::GetProxyFromEnvironment(
      aScheme, aHost, aPort, aResult);
  if (NS_SUCCEEDED(rv)) {
    return rv;
  }

  if (mProxySettings) {
    rv = GetProxyFromGSettings(aScheme, aHost, aPort, aResult);
    if (NS_SUCCEEDED(rv)) return rv;
  }

  return rv;
}

NS_IMETHODIMP
nsUnixSystemProxySettings::GetSystemWPADSetting(bool* aSystemWPADSetting) {
  *aSystemWPADSetting = false;
  return NS_OK;
}

NS_IMPL_COMPONENT_FACTORY(nsUnixSystemProxySettings) {
  auto result = MakeRefPtr<nsUnixSystemProxySettings>();
  return result.forget().downcast<nsISupports>();
}
