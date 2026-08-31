/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <windows.h>
#include <wininet.h>

#include "gtest/gtest.h"
#include "mozilla/gtest/MozAssertions.h"
#include "nsWindowsSystemProxySettings.h"
#include "WindowsInternetFunctionsWrapper.h"
#include "nsString.h"

using namespace mozilla::toolkit::system;

class WindowsInternetFunctionsMock : public WindowsInternetFunctionsWrapper {
 public:
  void SetFlags(uint32_t aFlags) { mFlags = aFlags; }

  void SetProxyServer(const nsAString& aValue) { mProxyServer = aValue; }
  void SetProxyBypass(const nsAString& aValue) { mProxyBypass = aValue; }
  void SetAutoConfigUrl(const nsAString& aValue) { mAutoConfigUrl = aValue; }

  nsresult ReadInternetOption(uint32_t aOption, uint32_t& aFlags,
                              nsAString& aValue) override {
    if (NS_FAILED(mReturnValue)) {
      return mReturnValue;
    }
    aFlags = mFlags;
    switch (aOption) {
      case INTERNET_PER_CONN_PROXY_SERVER:
        aValue = mProxyServer;
        break;
      case INTERNET_PER_CONN_PROXY_BYPASS:
        aValue = mProxyBypass;
        break;
      case INTERNET_PER_CONN_AUTOCONFIG_URL:
        aValue = mAutoConfigUrl;
        break;
      default:
        aValue.Truncate();
        break;
    }
    return NS_OK;
  }

  void SetReturnValue(nsresult aRv) { mReturnValue = aRv; }

 private:
  uint32_t mFlags = 0;
  nsresult mReturnValue = NS_OK;
  nsString mProxyServer;
  nsString mProxyBypass;
  nsString mAutoConfigUrl;
};

class TestWindowsSystemProxySettings : public ::testing::Test {
 protected:
  RefPtr<WindowsInternetFunctionsMock> mMock;
  RefPtr<nsWindowsSystemProxySettings> mSettings;

  void SetUp() override {
    mMock = new WindowsInternetFunctionsMock();
    mSettings = new nsWindowsSystemProxySettings(mMock);
  }
};

// GetPACURI tests

TEST_F(TestWindowsSystemProxySettings, GetPACURI_NoPacFlag_ReturnsEmpty) {
  mMock->SetFlags(0);
  mMock->SetAutoConfigUrl(u"http://pac.example.com/proxy.pac"_ns);

  nsCString result;
  ASSERT_EQ(NS_OK, mSettings->GetPACURI(result));
  EXPECT_TRUE(result.IsEmpty());
}

TEST_F(TestWindowsSystemProxySettings, GetPACURI_WithPacFlag_ReturnsUrl) {
  mMock->SetFlags(PROXY_TYPE_AUTO_PROXY_URL);
  mMock->SetAutoConfigUrl(u"http://pac.example.com/proxy.pac"_ns);

  nsCString result;
  ASSERT_EQ(NS_OK, mSettings->GetPACURI(result));
  EXPECT_STREQ("http://pac.example.com/proxy.pac", result.get());
}

TEST_F(TestWindowsSystemProxySettings,
       GetPACURI_ReadInternetOptionFails_ReturnsEmpty) {
  mMock->SetFlags(PROXY_TYPE_AUTO_PROXY_URL);
  mMock->SetAutoConfigUrl(u"http://pac.example.com/proxy.pac"_ns);
  mMock->SetReturnValue(NS_ERROR_FAILURE);

  nsCString result;
  EXPECT_NS_FAILED(mSettings->GetPACURI(result));
  EXPECT_TRUE(result.IsEmpty());
}

// GetSystemWPADSetting tests

TEST_F(TestWindowsSystemProxySettings,
       GetSystemWPADSetting_AutoDetectOnly_ReturnsTrue) {
  mMock->SetFlags(PROXY_TYPE_AUTO_DETECT);

  bool wpad = false;
  ASSERT_EQ(NS_OK, mSettings->GetSystemWPADSetting(&wpad));
  EXPECT_TRUE(wpad);
}

TEST_F(TestWindowsSystemProxySettings,
       GetSystemWPADSetting_AutoDetectWithPacUrl_ReturnsFalse) {
  // WPAD with an explicit PAC URL is not pure auto-detect
  mMock->SetFlags(PROXY_TYPE_AUTO_DETECT | PROXY_TYPE_AUTO_PROXY_URL);

  bool wpad = true;
  ASSERT_EQ(NS_OK, mSettings->GetSystemWPADSetting(&wpad));
  EXPECT_FALSE(wpad);
}

TEST_F(TestWindowsSystemProxySettings,
       GetSystemWPADSetting_NoWpadFlags_ReturnsFalse) {
  mMock->SetFlags(PROXY_TYPE_PROXY);

  bool wpad = true;
  ASSERT_EQ(NS_OK, mSettings->GetSystemWPADSetting(&wpad));
  EXPECT_FALSE(wpad);
}

// GetProxyForURI tests

TEST_F(TestWindowsSystemProxySettings,
       GetProxyForURI_NoProxyFlag_ReturnsDirect) {
  mMock->SetFlags(0);
  mMock->SetProxyServer(u"proxy.example.com:8080"_ns);

  nsCString result;
  ASSERT_EQ(NS_OK, mSettings->GetProxyForURI("http://foo.com/"_ns, "http"_ns,
                                             "foo.com"_ns, 80, result));
  EXPECT_STREQ("DIRECT", result.get());
}

TEST_F(TestWindowsSystemProxySettings,
       GetProxyForURI_ReadInternetOptionFails_ReturnsDirect) {
  mMock->SetReturnValue(NS_ERROR_FAILURE);

  nsCString result;
  ASSERT_EQ(NS_OK, mSettings->GetProxyForURI("http://foo.com/"_ns, "http"_ns,
                                             "foo.com"_ns, 80, result));
  EXPECT_STREQ("DIRECT", result.get());
}

TEST_F(TestWindowsSystemProxySettings,
       GetProxyForURI_DefaultProxy_ReturnsProxy) {
  mMock->SetFlags(PROXY_TYPE_PROXY);
  mMock->SetProxyServer(u"proxy.example.com:8080"_ns);

  nsCString result;
  ASSERT_EQ(NS_OK, mSettings->GetProxyForURI("http://foo.com/"_ns, "http"_ns,
                                             "foo.com"_ns, 80, result));
  EXPECT_STREQ("PROXY proxy.example.com:8080", result.get());
}

TEST_F(TestWindowsSystemProxySettings,
       GetProxyForURI_SchemeSpecificProxy_ReturnsSchemeProxy) {
  mMock->SetFlags(PROXY_TYPE_PROXY);
  // Scheme-specific proxy wins over a default proxy that would follow
  mMock->SetProxyServer(
      u"http=httpproxy.example.com:3128;ftp=ftpproxy.example.com:21"_ns);

  nsCString result;
  ASSERT_EQ(NS_OK, mSettings->GetProxyForURI("http://foo.com/"_ns, "http"_ns,
                                             "foo.com"_ns, 80, result));
  EXPECT_STREQ("PROXY httpproxy.example.com:3128", result.get());
}

TEST_F(TestWindowsSystemProxySettings, GetProxyForURI_SocksProxy_ReturnsSocks) {
  mMock->SetFlags(PROXY_TYPE_PROXY);
  mMock->SetProxyServer(u"socks=sockshost.example.com:1080"_ns);

  nsCString result;
  ASSERT_EQ(NS_OK, mSettings->GetProxyForURI("http://foo.com/"_ns, "http"_ns,
                                             "foo.com"_ns, 80, result));
  EXPECT_STREQ("SOCKS sockshost.example.com:1080", result.get());
}

TEST_F(TestWindowsSystemProxySettings,
       GetProxyForURI_SchemeSpecificWinsOverSocks) {
  mMock->SetFlags(PROXY_TYPE_PROXY);
  mMock->SetProxyServer(
      u"socks=sockshost.example.com:1080;http=httpproxy.example.com:3128"_ns);

  nsCString result;
  ASSERT_EQ(NS_OK, mSettings->GetProxyForURI("http://foo.com/"_ns, "http"_ns,
                                             "foo.com"_ns, 80, result));
  EXPECT_STREQ("PROXY httpproxy.example.com:3128", result.get());
}

TEST_F(TestWindowsSystemProxySettings,
       GetProxyForURI_SchemeSpecificWinsOverDefault) {
  mMock->SetFlags(PROXY_TYPE_PROXY);
  mMock->SetProxyServer(
      u"defaultproxy.example.com:8080;http=httpproxy.example.com:3128"_ns);

  nsCString result;
  ASSERT_EQ(NS_OK, mSettings->GetProxyForURI("http://foo.com/"_ns, "http"_ns,
                                             "foo.com"_ns, 80, result));
  EXPECT_STREQ("PROXY httpproxy.example.com:3128", result.get());
}

TEST_F(TestWindowsSystemProxySettings,
       GetProxyForURI_NoMatchingProxy_ReturnsDirect) {
  mMock->SetFlags(PROXY_TYPE_PROXY);
  // Only an ftp-specific proxy; requesting http should fall through to DIRECT
  mMock->SetProxyServer(u"ftp=ftpproxy.example.com:21"_ns);

  nsCString result;
  ASSERT_EQ(NS_OK, mSettings->GetProxyForURI("http://foo.com/"_ns, "http"_ns,
                                             "foo.com"_ns, 80, result));
  EXPECT_STREQ("DIRECT", result.get());
}

// Bypass list tests (exercising MatchOverride via GetProxyForURI)

TEST_F(TestWindowsSystemProxySettings,
       GetProxyForURI_BypassExactMatch_ReturnsDirect) {
  mMock->SetFlags(PROXY_TYPE_PROXY);
  mMock->SetProxyServer(u"proxy.example.com:8080"_ns);
  mMock->SetProxyBypass(u"foo.com"_ns);

  nsCString result;
  ASSERT_EQ(NS_OK, mSettings->GetProxyForURI("http://foo.com/"_ns, "http"_ns,
                                             "foo.com"_ns, 80, result));
  EXPECT_STREQ("DIRECT", result.get());
}

TEST_F(TestWindowsSystemProxySettings,
       GetProxyForURI_BypassWildcard_ReturnsDirect) {
  mMock->SetFlags(PROXY_TYPE_PROXY);
  mMock->SetProxyServer(u"proxy.example.com:8080"_ns);
  mMock->SetProxyBypass(u"*.example.com"_ns);

  nsCString result;
  ASSERT_EQ(NS_OK,
            mSettings->GetProxyForURI("http://sub.example.com/"_ns, "http"_ns,
                                      "sub.example.com"_ns, 80, result));
  EXPECT_STREQ("DIRECT", result.get());
}

TEST_F(TestWindowsSystemProxySettings,
       GetProxyForURI_BypassWildcard_NonMatchingHost_UsesProxy) {
  mMock->SetFlags(PROXY_TYPE_PROXY);
  mMock->SetProxyServer(u"proxy.example.com:8080"_ns);
  mMock->SetProxyBypass(u"*.example.com"_ns);

  nsCString result;
  ASSERT_EQ(NS_OK, mSettings->GetProxyForURI("http://other.org/"_ns, "http"_ns,
                                             "other.org"_ns, 80, result));
  EXPECT_STREQ("PROXY proxy.example.com:8080", result.get());
}

TEST_F(TestWindowsSystemProxySettings,
       GetProxyForURI_LocalBypass_PlainHostname_ReturnsDirect) {
  mMock->SetFlags(PROXY_TYPE_PROXY);
  mMock->SetProxyServer(u"proxy.example.com:8080"_ns);
  mMock->SetProxyBypass(u"<local>"_ns);

  nsCString result;
  ASSERT_EQ(NS_OK, mSettings->GetProxyForURI("http://intranet/"_ns, "http"_ns,
                                             "intranet"_ns, 80, result));
  EXPECT_STREQ("DIRECT", result.get());
}

TEST_F(TestWindowsSystemProxySettings,
       GetProxyForURI_LocalBypass_DottedHostname_UsesProxy) {
  mMock->SetFlags(PROXY_TYPE_PROXY);
  mMock->SetProxyServer(u"proxy.example.com:8080"_ns);
  mMock->SetProxyBypass(u"<local>"_ns);

  nsCString result;
  ASSERT_EQ(NS_OK, mSettings->GetProxyForURI(
                       "http://intranet.corp.local/"_ns, "http"_ns,
                       "intranet.corp.local"_ns, 80, result));
  EXPECT_STREQ("PROXY proxy.example.com:8080", result.get());
}

TEST_F(TestWindowsSystemProxySettings,
       GetProxyForURI_LocalBypass_Loopback_ReturnsDirect) {
  mMock->SetFlags(PROXY_TYPE_PROXY);
  mMock->SetProxyServer(u"proxy.example.com:8080"_ns);
  mMock->SetProxyBypass(u"<local>"_ns);

  nsCString result;
  ASSERT_EQ(NS_OK, mSettings->GetProxyForURI("http://127.0.0.1/"_ns, "http"_ns,
                                             "127.0.0.1"_ns, 80, result));
  EXPECT_STREQ("DIRECT", result.get());
}

TEST_F(TestWindowsSystemProxySettings,
       GetProxyForURI_LocalBypass_IPv6Loopback_ReturnsDirect) {
  mMock->SetFlags(PROXY_TYPE_PROXY);
  mMock->SetProxyServer(u"proxy.example.com:8080"_ns);
  mMock->SetProxyBypass(u"<local>"_ns);

  nsCString result;
  ASSERT_EQ(NS_OK, mSettings->GetProxyForURI("http://[::1]/"_ns, "http"_ns,
                                             "::1"_ns, 80, result));
  EXPECT_STREQ("DIRECT", result.get());
}

TEST_F(TestWindowsSystemProxySettings,
       GetProxyForURI_MultipleBypassEntries_MatchesCorrectly) {
  mMock->SetFlags(PROXY_TYPE_PROXY);
  mMock->SetProxyServer(u"proxy.example.com:8080"_ns);
  mMock->SetProxyBypass(u"other.org;*.example.com;127.0.0.1"_ns);

  nsCString result;

  // Matches *.example.com
  ASSERT_EQ(NS_OK,
            mSettings->GetProxyForURI("http://sub.example.com/"_ns, "http"_ns,
                                      "sub.example.com"_ns, 80, result));
  EXPECT_STREQ("DIRECT", result.get());

  // Does not match anything
  result.Truncate();
  ASSERT_EQ(NS_OK,
            mSettings->GetProxyForURI("http://unrelated.net/"_ns, "http"_ns,
                                      "unrelated.net"_ns, 80, result));
  EXPECT_STREQ("PROXY proxy.example.com:8080", result.get());
}
