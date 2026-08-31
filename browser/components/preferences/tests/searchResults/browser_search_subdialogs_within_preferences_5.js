/*
 * This file contains tests for the Preferences search bar.
 */

requestLongerTimeout(2);

/**
 * Test for searching for the "Fonts" subdialog.
 */
add_task(async function () {
  await openPreferencesViaOpenPreferencesAPI(DEFAULT_PANE, {
    leaveOpen: true,
  });
  // Oh, Canada:
  await evaluateSearchResults("Unified Canadian Syllabary", "fonts");
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

/**
 * Test for searching for the "Colors" subdialog.
 */
add_task(async function () {
  await openPreferencesViaOpenPreferencesAPI(DEFAULT_PANE, {
    leaveOpen: true,
  });
  await evaluateSearchResults("Link Colors", "contrast");
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

/**
 * Test for searching for the "Exceptions - Saved Logins" subdialog.
 */
add_task(async function () {
  await openPreferencesViaOpenPreferencesAPI(DEFAULT_PANE, {
    leaveOpen: true,
  });
  await evaluateSearchResults(
    "won’t save passwords for sites listed here",
    SRD_PREF_VALUE ? "passwords" : "passwordsGroup"
  );
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});
