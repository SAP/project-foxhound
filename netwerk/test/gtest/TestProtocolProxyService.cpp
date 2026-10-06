#include "gtest/gtest.h"

#include "nsCOMPtr.h"
#include "nsNetCID.h"
#include "nsString.h"
#include "nsComponentManagerUtils.h"
#include "../../base/nsProtocolProxyService.h"
#include "nsServiceManagerUtils.h"
#include "mozilla/Preferences.h"
#include "nsNetUtil.h"
#include "prenv.h"
#include "nsISystemProxySettings.h"

namespace mozilla {
namespace net {

TEST(TestProtocolProxyService, LoadHostFilters)
{
  nsCOMPtr<nsIProtocolProxyService2> ps =
      do_GetService(NS_PROTOCOLPROXYSERVICE_CID);
  ASSERT_TRUE(ps);
  mozilla::net::nsProtocolProxyService* pps =
      static_cast<mozilla::net::nsProtocolProxyService*>(ps.get());

  nsCOMPtr<nsIURI> url;
  nsAutoCString spec;

  auto CheckLoopbackURLs = [&](bool expected) {
    // loopback IPs are always filtered
    spec = "http://127.0.0.1";
    ASSERT_EQ(NS_NewURI(getter_AddRefs(url), spec), NS_OK);
    ASSERT_EQ(pps->CanUseProxy(url, 80), expected);
    spec = "http://[::1]";
    ASSERT_EQ(NS_NewURI(getter_AddRefs(url), spec), NS_OK);
    ASSERT_EQ(pps->CanUseProxy(url, 80), expected);
    spec = "http://localhost";
    ASSERT_EQ(NS_NewURI(getter_AddRefs(url), spec), NS_OK);
    ASSERT_EQ(pps->CanUseProxy(url, 80), expected);
  };

  auto CheckURLs = [&](bool expected) {
    spec = "http://example.com";
    ASSERT_EQ(NS_NewURI(getter_AddRefs(url), spec), NS_OK);
    ASSERT_EQ(pps->CanUseProxy(url, 80), expected);

    spec = "https://10.2.3.4";
    ASSERT_EQ(NS_NewURI(getter_AddRefs(url), spec), NS_OK);
    ASSERT_EQ(pps->CanUseProxy(url, 443), expected);

    spec = "http://1.2.3.4";
    ASSERT_EQ(NS_NewURI(getter_AddRefs(url), spec), NS_OK);
    ASSERT_EQ(pps->CanUseProxy(url, 80), expected);

    spec = "http://1.2.3.4:8080";
    ASSERT_EQ(NS_NewURI(getter_AddRefs(url), spec), NS_OK);
    ASSERT_EQ(pps->CanUseProxy(url, 80), expected);

    spec = "http://[2001::1]";
    ASSERT_EQ(NS_NewURI(getter_AddRefs(url), spec), NS_OK);
    ASSERT_EQ(pps->CanUseProxy(url, 80), expected);

    spec = "http://2.3.4.5:7777";
    ASSERT_EQ(NS_NewURI(getter_AddRefs(url), spec), NS_OK);
    ASSERT_EQ(pps->CanUseProxy(url, 80), expected);

    spec = "http://[abcd::2]:123";
    ASSERT_EQ(NS_NewURI(getter_AddRefs(url), spec), NS_OK);
    ASSERT_EQ(pps->CanUseProxy(url, 80), expected);

    spec = "http://bla.test.com";
    ASSERT_EQ(NS_NewURI(getter_AddRefs(url), spec), NS_OK);
    ASSERT_EQ(pps->CanUseProxy(url, 80), expected);
  };

  auto CheckPortDomain = [&](bool expected) {
    spec = "http://blabla.com:10";
    ASSERT_EQ(NS_NewURI(getter_AddRefs(url), spec), NS_OK);
    ASSERT_EQ(pps->CanUseProxy(url, 80), expected);
  };

  auto CheckLocalDomain = [&](bool expected) {
    spec = "http://test";
    ASSERT_EQ(NS_NewURI(getter_AddRefs(url), spec), NS_OK);
    ASSERT_EQ(pps->CanUseProxy(url, 80), expected);
  };

  // --------------------------------------------------------------------------

  nsAutoCString filter;

  // Anything is allowed when there are no filters set
  printf("Testing empty filter: %s\n", filter.get());
  pps->LoadHostFilters(filter);

  CheckLoopbackURLs(false);
  CheckLocalDomain(true);
  CheckURLs(true);
  CheckPortDomain(true);

  // --------------------------------------------------------------------------

  filter =
      "example.com, 1.2.3.4/16, [2001::1], 10.0.0.0/8, 2.3.0.0/16:7777, "
      "[abcd::1]/64:123, *.test.com";
  printf("Testing filter: %s\n", filter.get());
  pps->LoadHostFilters(filter);

  CheckLoopbackURLs(false);
  // Check URLs can no longer use filtered proxy
  CheckURLs(false);
  CheckLocalDomain(true);
  CheckPortDomain(true);

  // --------------------------------------------------------------------------

  // This is space separated. See bug 1346711 comment 4. We check this to keep
  // backwards compatibility.
  filter = "<local> blabla.com:10";
  printf("Testing filter: %s\n", filter.get());
  pps->LoadHostFilters(filter);

  CheckLoopbackURLs(false);
  CheckURLs(true);
  CheckLocalDomain(false);
  CheckPortDomain(false);

  // Check that we don't crash on weird input
  filter = "a b c abc:1x2, ,, * ** *.* *:10 :20 :40/12 */12:90";
  printf("Testing filter: %s\n", filter.get());
  pps->LoadHostFilters(filter);

  // Check that filtering works properly when the filter is set to "<local>"
  filter = "<local>";
  printf("Testing filter: %s\n", filter.get());
  pps->LoadHostFilters(filter);

  CheckLoopbackURLs(false);
  CheckURLs(true);
  CheckLocalDomain(false);
  CheckPortDomain(true);

  // Check that allow_hijacking_localhost works with empty filter
  Preferences::SetBool("network.proxy.allow_hijacking_localhost", true);

  filter = "";
  printf("Testing filter: %s\n", filter.get());
  pps->LoadHostFilters(filter);

  CheckLoopbackURLs(true);
  CheckLocalDomain(true);
  CheckURLs(true);
  CheckPortDomain(true);

  // Check that allow_hijacking_localhost works with non-trivial filter
  filter = "127.0.0.1, [::1], localhost, blabla.com:10";
  printf("Testing filter: %s\n", filter.get());
  pps->LoadHostFilters(filter);

  CheckLoopbackURLs(false);
  CheckLocalDomain(true);
  CheckURLs(true);
  CheckPortDomain(false);
}

#ifndef ANDROID
TEST(TestProtocolProxyService, Proxy_Env_Vars)
{
  nsCOMPtr<nsISystemProxySettings> systemProxy =
      do_GetService(NS_SYSTEMPROXYSETTINGS_CONTRACTID);
  ASSERT_TRUE(systemProxy != nullptr);

  auto CheckProxy = [&](const char* url, const char* expected) {
    nsCOMPtr<nsIURI> uri;
    ASSERT_EQ(NS_NewURI(getter_AddRefs(uri), url), NS_OK);
    nsAutoCString spec, scheme, host;
    int32_t port = -1;
    uri->GetSpec(spec);
    uri->GetScheme(scheme);
    uri->GetHost(host);
    uri->GetPort(&port);

    nsAutoCString result;
    nsresult rv = systemProxy->GetProxyForURI(spec, scheme, host, port, result);
    ASSERT_EQ(rv, NS_OK);
    // Check if result contains expected string.
    EXPECT_TRUE(result.Find(expected) != kNotFound)
        << "URL: " << url << ", Result: " << result.get()
        << ", Expected: " << expected;
  };

  // 1. HTTP Proxy
  {
    PR_SetEnv("http_proxy=http://127.0.0.1:8080");
    CheckProxy("http://example.com", "PROXY 127.0.0.1:8080");
    PR_SetEnv("http_proxy=");
  }

  // 2. HTTPS Proxy
  {
    PR_SetEnv("https_proxy=http://127.0.0.1:8443");
    CheckProxy("https://example.com", "PROXY 127.0.0.1:8443");
    PR_SetEnv("https_proxy=");
  }

  // 3. All Proxy (fallback)
  {
    PR_SetEnv("all_proxy=http://127.0.0.1:9090");
    CheckProxy("ftp://example.com", "PROXY 127.0.0.1:9090");
    PR_SetEnv("all_proxy=");
  }

  // 4. No Proxy
  {
    PR_SetEnv("http_proxy=http://127.0.0.1:8080");
    PR_SetEnv("no_proxy=example.com,.test.com");

    // Matches example.com
    CheckProxy("http://example.com", "DIRECT");
    // Matches .test.com suffix
    CheckProxy("http://sub.test.com", "DIRECT");
    // Does not match
    CheckProxy("http://other.com", "PROXY 127.0.0.1:8080");

    PR_SetEnv("http_proxy=");
    PR_SetEnv("no_proxy=");
  }

  // 5. No Proxy with specific port
  {
    PR_SetEnv("http_proxy=http://127.0.0.1:8080");
    PR_SetEnv("no_proxy=example.com:8080");

    // Matches example.com:8080
    CheckProxy("http://example.com:8080", "DIRECT");
    // Does not match example.com on default port (80)
    CheckProxy("http://example.com", "PROXY 127.0.0.1:8080");
    // Does not match example.com:9090
    CheckProxy("http://example.com:9090", "PROXY 127.0.0.1:8080");

    PR_SetEnv("http_proxy=");
    PR_SetEnv("no_proxy=");
  }

  // 6. No Proxy with mixed port rules
  {
    PR_SetEnv("http_proxy=http://127.0.0.1:8080");
    PR_SetEnv("https_proxy=http://127.0.0.1:8443");
    PR_SetEnv("no_proxy=exact.com:9443,wildcard.com");

    // Matches exact.com:9443
    CheckProxy("https://exact.com:9443", "DIRECT");
    // Does not match exact.com on default HTTPS port
    CheckProxy("https://exact.com", "PROXY 127.0.0.1:8443");
    // Does not match exact.com on a different port
    CheckProxy("https://exact.com:8443", "PROXY 127.0.0.1:8443");
    // Matches wildcard.com on any port
    CheckProxy("http://wildcard.com", "DIRECT");
    CheckProxy("http://wildcard.com:8080", "DIRECT");
    CheckProxy("https://wildcard.com:443", "DIRECT");

    PR_SetEnv("http_proxy=");
    PR_SetEnv("https_proxy=");
    PR_SetEnv("no_proxy=");
  }

  // 7. WebSocket (ws -> http_proxy)
  {
    PR_SetEnv("http_proxy=http://127.0.0.1:8080");
    CheckProxy("ws://example.com", "PROXY 127.0.0.1:8080");
    PR_SetEnv("http_proxy=");
  }

  // 8. WebSocket Secure (wss -> https_proxy)
  {
    PR_SetEnv("https_proxy=http://127.0.0.1:8443");
    CheckProxy("wss://example.com", "PROXY 127.0.0.1:8443");
    PR_SetEnv("https_proxy=");
  }

  // 9. default port
  {
    PR_SetEnv("http_proxy=http://127.0.0.1");
    CheckProxy("http://example.com", "PROXY 127.0.0.1");
    PR_SetEnv("http_proxy=");

    PR_SetEnv("https_proxy=http://127.0.0.1");
    CheckProxy("https://example.com", "PROXY 127.0.0.1");
    PR_SetEnv("https_proxy=");
  }
}
#endif  // !ANDROID

}  // namespace net
}  // namespace mozilla
