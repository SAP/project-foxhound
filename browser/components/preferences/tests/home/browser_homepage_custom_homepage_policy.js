/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const HOMEPAGE_PREF = "browser.startup.homepage";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["identity.fxaccounts.account.device.name", ""]],
  });
});

add_task(async function test_disable_buttons_via_policy() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [HOMEPAGE_PREF, "https://example.com"],
      ["pref.browser.homepage.disable_button.bookmark_page", true],
      ["pref.browser.homepage.disable_button.current_page", true],
    ],
  });

  // Use a local URL to avoid network dependency.
  let testTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:home"
  );

  let { win, tab } = await openCustomHomepageSubpage();

  let bookmarkButtonControl = await settingControlRenders(
    "customHomepageReplaceWithBookmarksButton",
    win
  );
  ok(
    bookmarkButtonControl.controlEl.disabled,
    "Bookmark button is disabled when policy pref is true"
  );

  let currentPagesButtonControl = await settingControlRenders(
    "customHomepageReplaceWithCurrentPagesButton",
    win
  );
  ok(
    currentPagesButtonControl.controlEl.disabled,
    "Current pages button is disabled when policy pref is true"
  );

  await Promise.all([
    BrowserTestUtils.removeTab(testTab),
    BrowserTestUtils.removeTab(tab),
  ]);
});
