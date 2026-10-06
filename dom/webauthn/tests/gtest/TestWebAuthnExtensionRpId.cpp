/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "TestWebAuthnRpIdCommon.h"
#include "gtest/gtest.h"
#include "js/RootingAPI.h"
#include "mozilla/Preferences.h"
#include "mozilla/dom/SimpleGlobalObject.h"
#include "mozilla/dom/WebAuthnUtil.h"
#include "mozilla/dom/WebExtensionPolicyBinding.h"
#include "mozilla/extensions/WebExtensionPolicy.h"
#include "mozilla/gtest/MozHelpers.h"
#include "nsID.h"
#include "nsIDUtils.h"
#include "nsIScriptSecurityManager.h"
#include "nsScriptSecurityManager.h"
#include "xpcpublic.h"

using namespace mozilla;
using namespace mozilla::dom;
using namespace mozilla::extensions;

class WebAuthnExtensionRpIdTest
    : public ::testing::TestWithParam<RpIdTestCase> {
 protected:
  void SetUp() override {
    ASSERT_TRUE(NS_SUCCEEDED(mozilla::Preferences::SetCString(
        "dom.securecontext.allowlist",
        "allowlisted-secure-context.com,allowlisted-subdomain.example.com,"
        "allowlisted-subdomain.notatld")));
    ASSERT_TRUE(NS_SUCCEEDED(mozilla::Preferences::SetBool(
        "dom.securecontext.allowlist_onions", true)));
  }

  void CreateExtensionPolicy(JSContext* aCx, const nsAString& aHostPermission,
                             RefPtr<WebExtensionPolicy>& aPolicy) {
    JS::Rooted<JSObject*> global(aCx, JS::CurrentGlobalOrNull(aCx));
    ASSERT_TRUE(global);

    GlobalObject globalObject(aCx, global);

    dom::WebExtensionInit wEI;

    JS::Rooted<JSObject*> func(
        aCx, (JSObject*)JS_NewFunction(aCx, (JSNative)1, 0, 0, "localize"));
    JS::Rooted<JSObject*> tempGlobalRoot(aCx, JS::CurrentGlobalOrNull(aCx));
    wEI.mLocalizeCallback = new dom::WebExtensionLocalizeCallback(
        aCx, func, tempGlobalRoot, nullptr);

    wEI.mAllowedOrigins = dom::OwningMatchPatternSetOrStringSequence();
    nsString* slotPtr =
        wEI.mAllowedOrigins.SetAsStringSequence().AppendElement(fallible);
    ASSERT_TRUE(slotPtr != nullptr);
    *slotPtr = aHostPermission;

    wEI.mId = u"extension@example.com"_ns;
    wEI.mBaseURL = u"file:///foo"_ns;
    wEI.mMozExtensionHostname = NSID_TrimBracketsASCII(nsID::GenerateUUID());

    ErrorResult rv;
    aPolicy = WebExtensionPolicy::Constructor(globalObject, wEI, rv);
    ASSERT_FALSE(rv.Failed());

    aPolicy->SetActive(true, rv);
    ASSERT_FALSE(rv.Failed());
  }
};

TEST_P(WebAuthnExtensionRpIdTest, ExtensionCanClaimRpId) {
  JS::Rooted<JSObject*> global(
      mozilla::dom::RootingCx(),
      mozilla::dom::SimpleGlobalObject::Create(
          mozilla::dom::SimpleGlobalObject::GlobalType::BindingDetail));
  mozilla::dom::AutoJSAPI jsAPI;
  ASSERT_TRUE(jsAPI.Init(global));

  nsCOMPtr<nsIScriptSecurityManager> ssm =
      nsScriptSecurityManager::GetScriptSecurityManager();
  ASSERT_TRUE(ssm);

  const RpIdTestCase& testCase = GetParam();

  RefPtr<WebExtensionPolicy> policy;
  CreateExtensionPolicy(
      jsAPI.cx(),
      NS_ConvertUTF8toUTF16(nsDependentCString(testCase.originOrMatchPattern)),
      policy);
  ASSERT_TRUE(policy);

  ErrorResult err;
  nsAutoString url;
  policy->GetURL(u""_ns, url, err);
  ASSERT_FALSE(err.Failed());

  nsCOMPtr<nsIPrincipal> principal;
  nsresult rv = ssm->CreateContentPrincipalFromOrigin(
      NS_ConvertUTF16toUTF8(url), getter_AddRefs(principal));
  ASSERT_TRUE(NS_SUCCEEDED(rv));

  bool result = IsValidRpId(principal, nsDependentCString(testCase.rpId));
  EXPECT_EQ(result, testCase.expectSuccess);

  policy->SetActive(false, IgnoreErrors());
}

INSTANTIATE_TEST_SUITE_P(CommonRpIdTestCases, WebAuthnExtensionRpIdTest,
                         ::testing::ValuesIn(kOriginRpIdTestCases));

INSTANTIATE_TEST_SUITE_P(ExtensionRpIdTestCases, WebAuthnExtensionRpIdTest,
                         ::testing::ValuesIn(kMatchPatternRpIdTestCases));
