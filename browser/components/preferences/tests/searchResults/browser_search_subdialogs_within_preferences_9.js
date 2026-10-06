/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/*
 * This file contains tests for the "Add Engine" subdialog.
 */

/**
 * Test for searching for the "Add Engine" subdialog.
 */
add_task(
  { skip_if: () => SRD_PREF_VALUE },
  async function searchAddEngineLegacy() {
    await openPreferencesViaOpenPreferencesAPI(DEFAULT_PANE, {
      leaveOpen: true,
    });
    await evaluateSearchResults("Add Engine", "oneClickSearchProvidersGroup");
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  }
);

add_task({ skip_if: () => !SRD_PREF_VALUE }, async function searchAddEngine() {
  await openPreferencesViaOpenPreferencesAPI(DEFAULT_PANE, {
    leaveOpen: true,
  });
  await evaluateSearchResults("Add Engine", "searchShortcuts");
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});
