/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_Monitor_US_region_desc() {
  const supportedRegion = "US";
  setupRegions(supportedRegion);

  let { monitorPromoCard } = await getPromoCards();
  ok(monitorPromoCard, "The Monitor promo is visible");

  let monitorDescElement =
    monitorPromoCard.nextElementSibling.querySelector(".description");
  is(
    monitorDescElement.getAttribute("data-l10n-id"),
    "more-from-moz-mozilla-monitor-global-description",
    "US Region desc set"
  );

  setupRegions(initialHomeRegion, initialCurrentRegion);
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

add_task(async function test_Monitor_global_region_desc() {
  const supportedRegion = "UK";
  setupRegions(supportedRegion);

  let { monitorPromoCard } = await getPromoCards();
  ok(monitorPromoCard, "The Monitor promo is visible");

  let monitorDescElement =
    monitorPromoCard.nextElementSibling.querySelector(".description");
  is(
    monitorDescElement.getAttribute("data-l10n-id"),
    "more-from-moz-mozilla-monitor-global-description",
    "Global Region desc set"
  );

  setupRegions(initialHomeRegion, initialCurrentRegion);
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});
