/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "TestWebAuthnRpIdCommon.h"
#include "gtest/gtest.h"
#include "mozilla/Preferences.h"
#include "mozilla/dom/WebAuthnUtil.h"
#include "nsIScriptSecurityManager.h"
#include "nsScriptSecurityManager.h"

using namespace mozilla;
using namespace mozilla::dom;

class WebAuthnRpIdTest : public ::testing::TestWithParam<RpIdTestCase> {
 protected:
  void SetUp() override {
    NS_ENSURE_SUCCESS_VOID(mozilla::Preferences::SetCString(
        "dom.securecontext.allowlist",
        "allowlisted-secure-context.com,allowlisted-subdomain.example.com,"
        "allowlisted-subdomain.notatld"));
    NS_ENSURE_SUCCESS_VOID(mozilla::Preferences::SetBool(
        "dom.securecontext.allowlist_onions", true));
  }
};

TEST_P(WebAuthnRpIdTest, OriginCanClaimRpId) {
  nsCOMPtr<nsIScriptSecurityManager> ssm =
      nsScriptSecurityManager::GetScriptSecurityManager();
  ASSERT_TRUE(ssm);

  const RpIdTestCase& testCase = GetParam();

  nsCOMPtr<nsIPrincipal> principal;
  nsresult rv = ssm->CreateContentPrincipalFromOrigin(
      nsDependentCString(testCase.originOrMatchPattern),
      getter_AddRefs(principal));
  ASSERT_TRUE(NS_SUCCEEDED(rv));

  bool result = IsValidRpId(principal, nsDependentCString(testCase.rpId));
  EXPECT_EQ(result, testCase.expectSuccess);
}

INSTANTIATE_TEST_SUITE_P(CommonRpIdTestCases, WebAuthnRpIdTest,
                         ::testing::ValuesIn(kOriginRpIdTestCases));

INSTANTIATE_TEST_SUITE_P(WebOriginOnlyRpIdTestCases, WebAuthnRpIdTest,
                         ::testing::ValuesIn(kWebOriginOnlyRpIdTestCases));
