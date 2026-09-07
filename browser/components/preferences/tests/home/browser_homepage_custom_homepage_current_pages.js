/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const HOMEPAGE_PREF = "browser.startup.homepage";
const DEFAULT_HOMEPAGE_URL = "about:home";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["identity.fxaccounts.account.device.name", ""],
      // Pinning a tab during the test triggers the sidebar promo check,
      // which sets this pref. Track it to avoid test warnings.
      ["sidebar.verticalTabs.dragToPinPromo.dismissed", false],
    ],
  });
});

add_task(async function test_replace_with_current_pages() {
  await SpecialPowers.pushPrefEnv({
    set: [[HOMEPAGE_PREF, "https://old-url.com"]],
  });

  let initialTab = gBrowser.tabs[0];
  gBrowser.pinTab(initialTab);
  registerCleanupFunction(() => {
    if (initialTab.pinned) {
      gBrowser.unpinTab(initialTab);
    }
  });

  // Use local chrome URLs rather than external HTTPS URLs to avoid timeouts.
  // openNewForegroundTab ensures the tab URL is set before the action reads it.
  let testTab1 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:home"
  );
  let testTab2 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:blank"
  );

  let { win, tab } = await openCustomHomepageSubpage();

  let replaceButtonControl = await settingControlRenders(
    "customHomepageReplaceWithCurrentPagesButton",
    win
  );
  let replaceButton = replaceButtonControl.controlEl;

  replaceButton.click();

  await TestUtils.waitForCondition(() => {
    let pref = Services.prefs.getStringPref(HOMEPAGE_PREF);
    return pref.includes("about:home") && pref.includes("about:blank");
  }, "Pref updated with current tab URLs");

  is(
    Services.prefs.getStringPref(HOMEPAGE_PREF),
    "about:home|about:blank",
    "Pref contains exactly the current tab URLs and nothing else"
  );

  gBrowser.unpinTab(initialTab);

  await Promise.all([
    BrowserTestUtils.removeTab(testTab1),
    BrowserTestUtils.removeTab(testTab2),
    BrowserTestUtils.removeTab(tab),
  ]);
});

add_task(async function test_replace_with_current_pages_disabled_state() {
  await SpecialPowers.pushPrefEnv({
    set: [[HOMEPAGE_PREF, DEFAULT_HOMEPAGE_URL]],
  });

  // Pin the initial browser tab so getTabsForCustomHomepage() excludes it
  // (it slices off pinned tabs), leaving no valid non-preferences tabs open.
  let initialTab = gBrowser.tabs[0];
  gBrowser.pinTab(initialTab);
  registerCleanupFunction(() => {
    if (initialTab.pinned) {
      gBrowser.unpinTab(initialTab);
    }
  });

  let { win, tab } = await openCustomHomepageSubpage();

  let replaceButtonControl = await settingControlRenders(
    "customHomepageReplaceWithCurrentPagesButton",
    win
  );
  let replaceButton = replaceButtonControl.controlEl;

  ok(
    replaceButton.disabled,
    "Button is disabled when only about:preferences is open"
  );

  // Use a local URL to avoid network dependency.
  let testTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:home"
  );

  await TestUtils.waitForCondition(
    () => !replaceButton.disabled,
    "Button becomes enabled when valid tab is opened"
  );

  await BrowserTestUtils.removeTab(testTab);

  await TestUtils.waitForCondition(
    () => replaceButton.disabled,
    "Button becomes disabled again when the valid tab is closed"
  );

  gBrowser.unpinTab(initialTab);

  await TestUtils.waitForCondition(
    () => !replaceButton.disabled,
    "Button becomes enabled again when the initial tab is unpinned"
  );

  await BrowserTestUtils.removeTab(tab);
});
