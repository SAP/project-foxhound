/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_setup(async function () {
  registerCleanupFunction(() => resetState());
});

add_task(async function test_url_pattern_matches() {
  await checkNotification(
    { type: "url", pattern: `^https://${TEST_DOMAIN}/` },
    true
  );
});

add_task(async function test_url_pattern_no_match() {
  await checkNotification(
    { type: "url", pattern: "^https://no-such-host\\.invalid/" },
    false
  );
});

add_task(async function test_url_invalid_pattern() {
  await checkNotification({ type: "url", pattern: "[" }, false);
});

// Navigating within the same domain re-evaluates the URL pattern: the banner
// must hide on a non-matching path and reappear on a matching one.
add_task(async function test_url_pattern_updates_on_navigation() {
  Services.prefs.setStringPref(
    PREF_DYNAMIC_TAB_BREAKAGES,
    JSON.stringify([
      {
        domains: [TEST_DOMAIN],
        l10nId: BREAKAGE_L10N_ID,
        condition: {
          type: "url",
          pattern: `^https://${TEST_DOMAIN}/play(/|$)`,
        },
      },
    ])
  );

  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    `https://${TEST_DOMAIN}/play/`
  );

  await waitForNotification(tab);

  BrowserTestUtils.startLoadingURIString(
    tab.linkedBrowser,
    `https://${TEST_DOMAIN}/news`
  );
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);
  await waitForNoNotification(tab);

  BrowserTestUtils.startLoadingURIString(
    tab.linkedBrowser,
    `https://${TEST_DOMAIN}/play/episode`
  );
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);
  await waitForNotification(tab);

  BrowserTestUtils.removeTab(tab);
  resetState();
});
