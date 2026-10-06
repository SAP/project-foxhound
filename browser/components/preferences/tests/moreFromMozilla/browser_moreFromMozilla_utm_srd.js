/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_promo_group_link_utm_params() {
  await clearPolicies();
  await getPromoCards();
  let win = gBrowser.contentWindow;

  let promoLinkControl = await settingControlRenders("promoGroupLink", win);
  let url = new URL(promoLinkControl.querySelector("a").href);

  Assert.ok(
    url.href.startsWith("https://www.mozilla.org/firefox/browsers/mobile/"),
    "Correct base URL"
  );
  Assert.equal(
    url.searchParams.get("utm_source"),
    "about-prefs",
    "utm_source is set"
  );
  Assert.equal(
    url.searchParams.get("utm_campaign"),
    "morefrommozilla",
    "utm_campaign is set"
  );
  Assert.equal(
    url.searchParams.get("utm_medium"),
    "firefox-desktop",
    "utm_medium is set"
  );
  Assert.equal(
    url.searchParams.get("utm_content"),
    "default-global",
    "utm_content is set"
  );
  Assert.ok(
    !url.searchParams.has("entrypoint_variation"),
    "entrypoint_variation is not set for default template"
  );
  Assert.ok(
    !url.searchParams.has("entrypoint_experiment"),
    "entrypoint_experiment is not set for default template"
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

add_task(async function test_box_link_has_correct_utm_params() {
  await clearPolicies();
  let { monitorPromoCard } = await getPromoCards();

  let boxLink = monitorPromoCard.querySelector("moz-box-link");
  ok(boxLink, "Monitor card has a moz-box-link");

  let href = boxLink.href;
  ok(href, "Box link has an href");
  let url = new URL(href);
  Assert.ok(
    url.href.startsWith("https://monitor.mozilla.org/"),
    "Correct base URL"
  );
  Assert.equal(
    url.searchParams.get("utm_source"),
    "about-prefs",
    "utm_source is set"
  );
  Assert.equal(
    url.searchParams.get("utm_campaign"),
    "morefrommozilla",
    "utm_campaign is set"
  );
  Assert.equal(
    url.searchParams.get("utm_medium"),
    "firefox-desktop",
    "utm_medium is set"
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

add_task(async function test_vpn_box_link_has_correct_utm_params() {
  await clearPolicies();
  await SpecialPowers.pushPrefEnv({
    set: [["browser.vpn_promo.enabled", true]],
  });

  let { vpnPromoCard } = await getPromoCards();
  ok(vpnPromoCard, "VPN card is present");

  let boxLink = vpnPromoCard.querySelector("moz-box-link");
  ok(boxLink, "VPN card has a moz-box-link");

  let href = boxLink.href;
  ok(href, "Box link has an href");
  let url = new URL(href);
  Assert.ok(
    url.href.startsWith("https://www.mozilla.org/products/vpn/"),
    "Correct base URL"
  );
  Assert.equal(
    url.searchParams.get("utm_source"),
    "about-prefs",
    "utm_source is set"
  );
  Assert.equal(
    url.searchParams.get("utm_campaign"),
    "morefrommozilla",
    "utm_campaign is set"
  );
  Assert.equal(
    url.searchParams.get("utm_medium"),
    "firefox-desktop",
    "utm_medium is set"
  );
  Assert.equal(
    url.searchParams.get("utm_content"),
    "default-global",
    "utm_content is set"
  );
  Assert.ok(
    !url.searchParams.has("entrypoint_variation"),
    "entrypoint_variation is not set for default template"
  );
  Assert.ok(
    !url.searchParams.has("entrypoint_experiment"),
    "entrypoint_experiment is not set for default template"
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
  await SpecialPowers.popPrefEnv();
});
