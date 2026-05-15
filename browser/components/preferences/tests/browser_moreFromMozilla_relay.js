/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

let mockFxA, unmockFxA;

add_setup(async function () {
  let { mock, unmock } = await mockDefaultFxAInstance();
  mockFxA = mock;
  unmockFxA = unmock;
});

add_task(async function test_relay_promo_with_supported_fxa_server() {
  await clearPolicies();

  let { relayPromoCard } = await getPromoCards();
  ok(relayPromoCard, "The Relay promo is visible");

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

add_task(async function test_relay_promo_with_unsupported_fxa_server() {
  await clearPolicies();

  unmockFxA();

  let { relayPromoCard } = await getPromoCards();
  ok(!relayPromoCard, "The Relay promo is not visible");

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
  mockFxA();
});
