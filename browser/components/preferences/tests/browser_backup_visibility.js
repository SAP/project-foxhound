/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Test that we don't show the backup section if backup is disabled
 */
add_task(async function () {
  await openPreferencesViaOpenPreferencesAPI("paneSync", {
    leaveOpen: true,
  });

  await SpecialPowers.pushPrefEnv({
    set: [["browser.backup.archive.enabled", false]],
  });

  ok(
    gBrowser.contentDocument.getElementById("backupCategory").hidden,
    "backup category hidden"
  );

  ok(
    gBrowser.contentDocument.getElementById("dataBackupGroup").hidden,
    "backup section is hidden"
  );

  // Check that we don't get any results in sync when searching:
  await evaluateSearchResults("backup", "no-results-message");

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

/**
 * Test that we don't show the backup section if backup is disabled
 */
add_task(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.backup.archive.enabled", true]],
  });

  await openPreferencesViaOpenPreferencesAPI("paneSync", {
    leaveOpen: true,
  });

  ok(
    !gBrowser.contentDocument.getElementById("backupCategory").hidden,
    "backup category shown"
  );

  ok(
    !gBrowser.contentDocument.getElementById("dataBackupGroup").hidden,
    "backup section is shown"
  );

  // Check that we don't get any results in sync when searching:
  await evaluateSearchResults("backup", "dataBackupGroup");

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});
