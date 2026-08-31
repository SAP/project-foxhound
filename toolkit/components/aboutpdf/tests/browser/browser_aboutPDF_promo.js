/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const PROMO_DISMISSED_PREF = "browser.aboutpdf.promo.dismissed";

registerCleanupFunction(() => {
  Services.prefs.clearUserPref(PROMO_DISMISSED_PREF);
});

add_task(async function testPromoHiddenWhenPrefDismissed() {
  await SpecialPowers.pushPrefEnv({
    set: [[PROMO_DISMISSED_PREF, true]],
  });

  const tab = await openAboutPDF();
  await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
    const promo = content.document.getElementById("promo");
    await ContentTaskUtils.waitForCondition(
      () => promo.hidden,
      "promo is hidden when dismissed pref is true"
    );
    ok(promo.hidden, "promo is hidden when dismissed pref is true");
  });
  BrowserTestUtils.removeTab(tab);

  await SpecialPowers.popPrefEnv();
});

add_task(async function testDismissButtonHidesPromoAndSetsPref() {
  Services.prefs.clearUserPref(PROMO_DISMISSED_PREF);

  const tab = await openAboutPDF();
  await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
    const promo = content.document.getElementById("promo");
    const dismiss = content.document.getElementById("dismiss-promo");

    // Force-show the promo so we can exercise the dismiss handler regardless
    // of platform / default-handler state.
    promo.hidden = false;

    dismiss.click();
    await ContentTaskUtils.waitForCondition(
      () => promo.hidden,
      "promo hidden after dismiss click"
    );
    ok(promo.hidden, "promo hidden after dismiss click");
  });

  await TestUtils.waitForCondition(
    () => Services.prefs.getBoolPref(PROMO_DISMISSED_PREF, false) === true,
    "dismissed pref persisted"
  );
  is(
    Services.prefs.getBoolPref(PROMO_DISMISSED_PREF, false),
    true,
    "dismissed pref persisted"
  );

  BrowserTestUtils.removeTab(tab);
  Services.prefs.clearUserPref(PROMO_DISMISSED_PREF);
});
