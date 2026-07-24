/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

let mockFxA, unmockFxA;

add_setup(async function () {
  let { mock, unmock } = await mockDefaultFxAInstance();
  mockFxA = mock;
  unmockFxA = unmock;
});

add_task(async function test_VPN_promo_enabled() {
  await clearPolicies();
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.preferences.moreFromMozilla", true],
      ["browser.vpn_promo.enabled", true],
    ],
  });

  let { vpnPromoCard, mobileCard } = await getPromoCards();

  ok(vpnPromoCard, "The VPN promo is visible");
  ok(mobileCard, "The Mobile promo is visible");

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

add_task(async function test_VPN_promo_disabled() {
  await clearPolicies();
  await SpecialPowers.pushPrefEnv({
    set: [["browser.vpn_promo.enabled", false]],
  });

  let { vpnPromoCard, mobileCard } = await getPromoCards();

  ok(!vpnPromoCard, "The VPN promo is not visible");
  ok(mobileCard, "The Mobile promo is visible");

  Services.prefs.clearUserPref("browser.vpn_promo.enabled");
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

add_task(async function test_VPN_promo_in_disallowed_home_region() {
  await clearPolicies();
  const disallowedRegion = "SY";

  setupRegions(disallowedRegion);

  await SpecialPowers.pushPrefEnv({
    set: [["browser.vpn_promo.enabled", true]],
  });

  let { vpnPromoCard, mobileCard } = await getPromoCards();

  ok(!vpnPromoCard, "The VPN promo is not visible");
  ok(mobileCard, "The Mobile promo is visible");

  setupRegions(initialHomeRegion, initialCurrentRegion);
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

add_task(async function test_VPN_promo_in_illegal_home_region() {
  await clearPolicies();
  const illegalRegion = "CN";

  setupRegions(illegalRegion);

  await SpecialPowers.pushPrefEnv({
    set: [["browser.vpn_promo.disallowedRegions", "SY, CU"]],
  });

  let { vpnPromoCard, mobileCard } = await getPromoCards();

  ok(!vpnPromoCard, "The VPN promo is not visible");
  ok(mobileCard, "The Mobile promo is visible");

  setupRegions(initialHomeRegion, initialCurrentRegion);
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

add_task(async function test_VPN_promo_in_disallowed_current_region() {
  await clearPolicies();
  const allowedRegion = "US";
  const disallowedRegion = "SY";

  setupRegions(allowedRegion, disallowedRegion);

  await SpecialPowers.pushPrefEnv({
    set: [["browser.vpn_promo.enabled", true]],
  });

  let { vpnPromoCard, mobileCard } = await getPromoCards();

  ok(!vpnPromoCard, "The VPN promo is not visible");
  ok(mobileCard, "The Mobile promo is visible");

  setupRegions(initialHomeRegion, initialCurrentRegion);
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

add_task(async function test_VPN_promo_in_illegal_current_region() {
  await clearPolicies();
  const allowedRegion = "US";
  const illegalRegion = "CN";

  setupRegions(allowedRegion, illegalRegion);

  await SpecialPowers.pushPrefEnv({
    set: [["browser.vpn_promo.disallowedRegions", "SY, CU"]],
  });

  let { vpnPromoCard, mobileCard } = await getPromoCards();

  ok(!vpnPromoCard, "The VPN promo is not visible");
  ok(mobileCard, "The Mobile promo is visible");

  setupRegions(initialHomeRegion, initialCurrentRegion);
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

add_task(
  async function test_VPN_promo_in_unsupported_current_region_with_supported_home_region() {
    await clearPolicies();
    const supportedRegion = "US";
    const unsupportedRegion = "LY";

    setupRegions(supportedRegion, unsupportedRegion);

    let { vpnPromoCard, mobileCard } = await getPromoCards();

    ok(vpnPromoCard, "The VPN promo is visible");
    ok(mobileCard, "The Mobile promo is visible");

    setupRegions(initialHomeRegion, initialCurrentRegion);
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  }
);

add_task(
  async function test_VPN_promo_in_supported_current_region_with_unsupported_home_region() {
    await clearPolicies();
    const supportedRegion = "US";
    const unsupportedRegion = "LY";

    setupRegions(unsupportedRegion, supportedRegion);

    let { vpnPromoCard, mobileCard } = await getPromoCards();

    ok(vpnPromoCard, "The VPN promo is visible");
    ok(mobileCard, "The Mobile promo is visible");

    setupRegions(initialHomeRegion, initialCurrentRegion);
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  }
);

add_task(async function test_VPN_promo_with_active_enterprise_policy() {
  await EnterprisePolicyTesting.setupPolicyEngineWithJson({
    policies: {
      EnableTrackingProtection: {
        Value: true,
      },
    },
  });

  let { vpnPromoCard, mobileCard } = await getPromoCards();
  ok(!vpnPromoCard, "The VPN promo is not visible");
  ok(mobileCard, "The Mobile promo is visible");

  setupRegions(initialHomeRegion, initialCurrentRegion);
  await clearPolicies();
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});
