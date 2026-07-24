/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ProxyUtils.h"

#include "mozilla/IntegerRange.h"
#include "nsReadableUtils.h"
#include "nsTArray.h"
#include "prnetdb.h"
#include "prtypes.h"
#include "prenv.h"
#include "nsCOMPtr.h"
#include "nsNetUtil.h"
#include "nsIURI.h"

namespace mozilla {
namespace toolkit {
namespace system {

/**
 * Normalize the short IP form into the complete form.
 * For example, it converts "192.168" into "192.168.0.0"
 */
static void NormalizeAddr(const nsACString& aAddr, nsCString& aNormalized) {
  nsTArray<nsCString> addr;
  ParseString(aAddr, '.', addr);
  aNormalized =
      StringJoin("."_ns, IntegerRange(4), [&addr](nsACString& dst, size_t i) {
        if (i < addr.Length()) {
          dst.Append(addr[i]);
        } else {
          dst.Append('0');
        }
      });
}

static PRUint32 MaskIPv4Addr(PRUint32 aAddr, uint16_t aMaskLen) {
  if (aMaskLen == 32) {
    return aAddr;
  }
  return PR_htonl(PR_ntohl(aAddr) & (~0L << (32 - aMaskLen)));
}

static void MaskIPv6Addr(PRIPv6Addr& aAddr, uint16_t aMaskLen) {
  if (aMaskLen == 128) {
    return;
  }

  if (aMaskLen > 96) {
    aAddr.pr_s6_addr32[3] =
        PR_htonl(PR_ntohl(aAddr.pr_s6_addr32[3]) & (~0L << (128 - aMaskLen)));
  } else if (aMaskLen > 64) {
    aAddr.pr_s6_addr32[3] = 0;
    aAddr.pr_s6_addr32[2] =
        PR_htonl(PR_ntohl(aAddr.pr_s6_addr32[2]) & (~0L << (96 - aMaskLen)));
  } else if (aMaskLen > 32) {
    aAddr.pr_s6_addr32[3] = 0;
    aAddr.pr_s6_addr32[2] = 0;
    aAddr.pr_s6_addr32[1] =
        PR_htonl(PR_ntohl(aAddr.pr_s6_addr32[1]) & (~0L << (64 - aMaskLen)));
  } else {
    aAddr.pr_s6_addr32[3] = 0;
    aAddr.pr_s6_addr32[2] = 0;
    aAddr.pr_s6_addr32[1] = 0;
    aAddr.pr_s6_addr32[0] =
        PR_htonl(PR_ntohl(aAddr.pr_s6_addr32[0]) & (~0L << (32 - aMaskLen)));
  }

  return;
}

static bool IsMatchMask(const nsACString& aHost, const nsACString& aOverride) {
  nsresult rv;

  auto tokenEnd = aOverride.FindChar('/');
  if (tokenEnd == -1) {
    return false;
  }

  nsAutoCString prefixStr(
      Substring(aOverride, tokenEnd + 1, aOverride.Length() - tokenEnd - 1));
  auto maskLen = prefixStr.ToInteger(&rv);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return false;
  }

  nsAutoCString override(aOverride);
  NormalizeAddr(Substring(aOverride, 0, tokenEnd), override);

  PRNetAddr prAddrHost;
  PRNetAddr prAddrOverride;
  if (PR_SUCCESS !=
          PR_StringToNetAddr(PromiseFlatCString(aHost).get(), &prAddrHost) ||
      PR_SUCCESS != PR_StringToNetAddr(override.get(), &prAddrOverride)) {
    return false;
  }

  if (prAddrHost.raw.family == PR_AF_INET &&
      prAddrOverride.raw.family == PR_AF_INET) {
    return MaskIPv4Addr(prAddrHost.inet.ip, maskLen) ==
           MaskIPv4Addr(prAddrOverride.inet.ip, maskLen);
  } else if (prAddrHost.raw.family == PR_AF_INET6 &&
             prAddrOverride.raw.family == PR_AF_INET6) {
    MaskIPv6Addr(prAddrHost.ipv6.ip, maskLen);
    MaskIPv6Addr(prAddrOverride.ipv6.ip, maskLen);

    return memcmp(&prAddrHost.ipv6.ip, &prAddrOverride.ipv6.ip,
                  sizeof(PRIPv6Addr)) == 0;
  }

  return false;
}

static bool IsMatchWildcard(const nsACString& aHost,
                            const nsACString& aOverride) {
  nsAutoCString host(aHost);
  nsAutoCString override(aOverride);

  int32_t overrideLength = override.Length();
  int32_t tokenStart = 0;
  int32_t offset = 0;
  bool star = false;

  while (tokenStart < overrideLength) {
    int32_t tokenEnd = override.FindChar('*', tokenStart);
    if (tokenEnd == tokenStart) {
      // Star is the first character in the token.
      star = true;
      tokenStart++;
      // If the character following the '*' is a '.' character then skip
      // it so that "*.foo.com" allows "foo.com".
      if (override.FindChar('.', tokenStart) == tokenStart) {
        nsAutoCString token(Substring(override, tokenStart + 1,
                                      overrideLength - tokenStart - 1));
        if (host.Equals(token)) {
          return true;
        }
      }
    } else {
      if (tokenEnd == -1) {
        tokenEnd = overrideLength;  // no '*' char, match rest of string
      }
      nsAutoCString token(
          Substring(override, tokenStart, tokenEnd - tokenStart));
      offset = host.Find(token, offset);
      if (offset == -1 || (!star && offset)) {
        return false;
      }
      star = false;
      tokenStart = tokenEnd;
      offset += token.Length();
    }
  }

  return (star || (offset == static_cast<int32_t>(host.Length())));
}

static const char* GetEnvRetryUppercase(const nsCString& aEnv) {
  nsAutoCString env(aEnv);
  const char* proxyVal = PR_GetEnv(env.get());
  if (proxyVal) {
    return proxyVal;
  }
  ToUpperCase(env);
  proxyVal = PR_GetEnv(env.get());
  return proxyVal;
}

static bool IsInNoProxyList(const nsACString& aScheme, const nsACString& aHost,
                            int32_t aPort, const char* noProxyVal) {
  NS_ASSERTION(aPort >= -1, "Invalid port");

  int32_t effectivePort = aPort;
  if (aPort == -1) {
    if (aScheme.EqualsLiteral("http") || aScheme.EqualsLiteral("ws")) {
      effectivePort = 80;
    } else if (aScheme.EqualsLiteral("https") || aScheme.EqualsLiteral("wss")) {
      effectivePort = 443;
    } else if (aScheme.EqualsLiteral("ftp")) {
      effectivePort = 21;
    }
  }

  nsAutoCString noProxy(noProxyVal);
  if (noProxy.EqualsLiteral("*")) return true;

  noProxy.StripWhitespace();

  nsReadingIterator<char> pos;
  nsReadingIterator<char> end;
  noProxy.BeginReading(pos);
  noProxy.EndReading(end);
  while (pos != end) {
    nsReadingIterator<char> last = pos;
    nsReadingIterator<char> nextPos;
    if (FindCharInReadable(',', last, end)) {
      nextPos = last;
      ++nextPos;
    } else {
      last = end;
      nextPos = end;
    }

    nsReadingIterator<char> colon = pos;
    int32_t port = -1;
    if (FindCharInReadable(':', colon, last)) {
      ++colon;
      nsDependentCSubstring portStr(colon, last);
      nsAutoCString portStr2(
          portStr);  // We need this for ToInteger. String API's suck.
      nsresult err;
      port = portStr2.ToInteger(&err);
      if (NS_FAILED(err)) {
        port = -2;  // don't match any port, so we ignore this pattern
      }
      --colon;
    } else {
      colon = last;
    }

    if (port == -1 || port == aPort || (aPort == -1 && port == effectivePort)) {
      nsDependentCSubstring hostStr(pos, colon);
      // By using StringEndsWith instead of an equality comparator, we can
      // include sub-domains
      if (StringEndsWith(aHost, hostStr, nsCaseInsensitiveCStringComparator))
        return true;
    }

    pos = nextPos;
  }

  return false;
}

static void SetProxyResultDirect(nsACString& aResult) {
  aResult.AssignLiteral("DIRECT");
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

nsresult GetProxyFromEnvironment(const nsACString& aScheme,
                                 const nsACString& aHost, int32_t aPort,
                                 nsACString& aResult) {
  nsAutoCString envVar;
  envVar.Append(aScheme);
  envVar.AppendLiteral("_proxy");
  const char* proxyVal = GetEnvRetryUppercase(envVar);
  if (!proxyVal && aScheme == "ws") {
    proxyVal = GetEnvRetryUppercase("http_proxy"_ns);
  } else if (!proxyVal && aScheme == "wss") {
    proxyVal = GetEnvRetryUppercase("https_proxy"_ns);
  }
  if (!proxyVal) {
    proxyVal = GetEnvRetryUppercase("all_proxy"_ns);
    if (!proxyVal) {
      // Return failure so that the caller can detect the failure and
      // fall back to other proxy detection (e.g., WPAD)
      return NS_ERROR_FAILURE;
    }
  }

  const char* noProxyVal = GetEnvRetryUppercase("no_proxy"_ns);
  if (noProxyVal && IsInNoProxyList(aScheme, aHost, aPort, noProxyVal)) {
    SetProxyResultDirect(aResult);
    return NS_OK;
  }

  // Use our URI parser to crack the proxy URI
  nsCOMPtr<nsIURI> proxyURI;
  nsresult rv = NS_NewURI(getter_AddRefs(proxyURI), proxyVal);
  NS_ENSURE_SUCCESS(rv, rv);

  // Is there a way to specify "socks://" or something in these environment
  // variables? I can't find any documentation.
  if (!proxyURI->SchemeIs("http")) {
    return NS_ERROR_UNKNOWN_PROTOCOL;
  }

  nsAutoCString proxyHost;
  rv = proxyURI->GetHost(proxyHost);
  NS_ENSURE_SUCCESS(rv, rv);

  int32_t proxyPort;
  rv = proxyURI->GetPort(&proxyPort);
  NS_ENSURE_SUCCESS(rv, rv);

  SetProxyResult("PROXY", proxyHost, proxyPort, aResult);
  return NS_OK;
}

bool IsHostProxyEntry(const nsACString& aHost, const nsACString& aOverride) {
  return IsMatchMask(aHost, aOverride) || IsMatchWildcard(aHost, aOverride);
}

}  // namespace system
}  // namespace toolkit
}  // namespace mozilla
