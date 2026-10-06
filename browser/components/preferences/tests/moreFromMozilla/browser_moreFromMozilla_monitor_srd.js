/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_monitor_us_region_utm_content() {
  await clearPolicies();
  setupRegions("US");

  let { monitorPromoCard } = await getPromoCards();
  ok(monitorPromoCard, "The Monitor promo is visible");

  let url = new URL(monitorPromoCard.querySelector("moz-box-link").href);
  Assert.equal(
    url.searchParams.get("utm_content"),
    "default-us",
    "US region uses default-us utm_content"
  );

  setupRegions(initialHomeRegion, initialCurrentRegion);
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

add_task(async function test_monitor_global_region_utm_content() {
  await clearPolicies();
  setupRegions("UK");

  let { monitorPromoCard } = await getPromoCards();
  ok(monitorPromoCard, "The Monitor promo is visible");

  let url = new URL(monitorPromoCard.querySelector("moz-box-link").href);
  Assert.equal(
    url.searchParams.get("utm_content"),
    "default-global",
    "Non-US region uses default-global utm_content"
  );

  setupRegions(initialHomeRegion, initialCurrentRegion);
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});
