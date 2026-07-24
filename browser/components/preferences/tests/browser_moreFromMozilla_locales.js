/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_aboutpreferences_partnerCNRepack() {
  let defaultBranch = Services.prefs.getDefaultBranch(null);
  defaultBranch.setCharPref("distribution.id", "MozillaOnline");

  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.preferences.moreFromMozilla", true],
      ["browser.preferences.moreFromMozilla.template", "simple"],
    ],
  });
  await openPreferencesViaOpenPreferencesAPI("paneMoreFromMozilla", {
    leaveOpen: true,
  });

  let doc = gBrowser.contentDocument;
  let tab = gBrowser.selectedTab;

  let productCards = doc.querySelectorAll("vbox.simple");
  Assert.ok(productCards, "Simple template loaded");

  const expectedUrl = "https://www.firefox.com.cn/browsers/mobile/";

  let link = doc.getElementById("simple-fxMobile");
  Assert.ok(link.getAttribute("href").startsWith(expectedUrl));

  defaultBranch.setCharPref("distribution.id", "");
  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_send_to_device_email_link_for_supported_locale() {
  // Email is supported for Brazilian Portuguese
  const supportedLocale = "pt-BR";
  const initialLocale = Services.locale.appLocaleAsBCP47;
  setLocale(supportedLocale);

  await SpecialPowers.pushPrefEnv({
    set: [["browser.preferences.moreFromMozilla.template", "simple"]],
  });

  await openPreferencesViaOpenPreferencesAPI("paneMoreFromMozilla", {
    leaveOpen: true,
  });

  let doc = gBrowser.contentDocument;
  let emailLink = doc.getElementById("simple-qr-code-send-email");

  ok(!BrowserTestUtils.isHidden(emailLink), "Email link should be visible");

  await SpecialPowers.popPrefEnv();
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
  setLocale(initialLocale); // revert changes to language
});

add_task(
  async function test_send_to_device_email_link_for_unsupported_locale() {
    // Email is not supported for Afrikaans
    const unsupportedLocale = "af";
    const initialLocale = Services.locale.appLocaleAsBCP47;
    setLocale(unsupportedLocale);

    await SpecialPowers.pushPrefEnv({
      set: [["browser.preferences.moreFromMozilla.template", "simple"]],
    });

    await openPreferencesViaOpenPreferencesAPI("paneMoreFromMozilla", {
      leaveOpen: true,
    });

    let doc = gBrowser.contentDocument;
    let emailLink = doc.getElementById("simple-qr-code-send-email");

    ok(BrowserTestUtils.isHidden(emailLink), "Email link should be hidden");

    await SpecialPowers.popPrefEnv(); // revert changes to language
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
    setLocale(initialLocale);
  }
);
