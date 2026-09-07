/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_email_link_visible_for_supported_locale() {
  await clearPolicies();
  const initialLocale = Services.locale.appLocaleAsBCP47;
  setLocale("pt-BR");

  await getPromoCards();
  let win = gBrowser.contentWindow;
  let emailLinkControl = await settingControlRenders(
    "firefoxMobilePromoLink",
    win
  );
  ok(!emailLinkControl.hidden, "Email link is visible for pt-BR locale");

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
  setLocale(initialLocale);
});

add_task(async function test_email_link_hidden_for_unsupported_locale() {
  await clearPolicies();
  const initialLocale = Services.locale.appLocaleAsBCP47;
  setLocale("af");

  await getPromoCards();
  let win = gBrowser.contentWindow;
  let emailLinkControl = await settingControlRenders(
    "firefoxMobilePromoLink",
    win
  );
  ok(emailLinkControl.hidden, "Email link is hidden for unsupported locale");

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
  setLocale(initialLocale);
});
