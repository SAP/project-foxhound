/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

"use strict";

async function waitForStartup() {
  await ensureTRRMode(2);
  await checkHeuristicsTelemetry("enable_doh", "startup");
}

async function setPrefAndWaitForConfigFlush(pref, value) {
  let configFlushed = DoHTestUtils.waitForConfigFlush();
  if (value) {
    Services.prefs.setBoolPref(pref, value);
  } else {
    Services.prefs.clearUserPref(pref);
  }
  await configFlushed;
  await waitForStartup();
}

add_task(setup);

add_task(async function testTRRSelect() {
  // Clean start: doh-rollout.uri should be set after init.
  setPassingHeuristics();
  let prefPromise = TestUtils.waitForPrefChange(prefs.BREADCRUMB_PREF);
  Services.prefs.setBoolPref(prefs.ENABLED_PREF, true);
  await prefPromise;
  is(
    Services.prefs.getBoolPref(prefs.BREADCRUMB_PREF),
    true,
    "Breadcrumb saved."
  );
  is(
    Services.prefs.getStringPref(prefs.TRR_SELECT_URI_PREF),
    "https://example.com/dns-query",
    "TRR selection complete."
  );

  // Wait for heuristics to complete.
  await ensureTRRMode(2);
  await checkHeuristicsTelemetry("enable_doh", "startup");

  // Reset and restart the controller for good measure.
  Services.prefs.clearUserPref(prefs.TRR_SELECT_DRY_RUN_RESULT_PREF);
  Services.prefs.clearUserPref(prefs.TRR_SELECT_URI_PREF);
  await restartDoHController();
  await waitForStartup();

  is(
    Services.prefs.getStringPref(prefs.TRR_SELECT_URI_PREF),
    "https://example.com/dns-query",
    "TRR selection complete."
  );

  // Disable committing. The committed URI should be reset to the
  // default provider and the dry-run-result should persist.
  prefPromise = TestUtils.waitForPrefChange(
    prefs.TRR_SELECT_URI_PREF,
    newVal => newVal == "https://example.com/1"
  );
  await setPrefAndWaitForConfigFlush(prefs.TRR_SELECT_COMMIT_PREF, false);
  await prefPromise;
  is(
    Services.prefs.getStringPref(prefs.TRR_SELECT_URI_PREF),
    "https://example.com/1",
    "Default TRR selected."
  );
  try {
    await BrowserTestUtils.waitForCondition(() => {
      return !Services.prefs.prefHasUserValue(
        prefs.TRR_SELECT_DRY_RUN_RESULT_PREF
      );
    });
    ok(false, "Dry run result was cleared, fail!");
  } catch (e) {
    ok(true, "Dry run result was not cleared.");
  }
  is(
    Services.prefs.getStringPref(prefs.TRR_SELECT_DRY_RUN_RESULT_PREF),
    "https://example.com/dns-query",
    "dry-run result has the correct value."
  );

  // Reset again, dry-run-result should be recorded but not
  // be committed. Committing is still disabled from above.
  Services.prefs.clearUserPref(prefs.TRR_SELECT_DRY_RUN_RESULT_PREF);
  Services.prefs.clearUserPref(prefs.TRR_SELECT_URI_PREF);
  await restartDoHController();
  await waitForStartup();

  try {
    await BrowserTestUtils.waitForCondition(() => {
      return (
        Services.prefs.getStringPref(prefs.TRR_SELECT_URI_PREF) ==
        "https://example.com/dns-query"
      );
    });
    ok(false, "Dry run result got committed, fail!");
  } catch (e) {
    ok(true, "Dry run result did not get committed");
  }
  is(
    Services.prefs.getStringPref(prefs.TRR_SELECT_URI_PREF),
    "https://example.com/1",
    "Default TRR selected."
  );
  is(
    Services.prefs.getStringPref(prefs.TRR_SELECT_DRY_RUN_RESULT_PREF),
    "https://example.com/dns-query",
    "TRR selection complete, dry-run result recorded."
  );

  // Reset doh-rollout.uri, and change the dry-run-result to another one on the
  // default list. After init, the existing dry-run-result should be committed.
  Services.prefs.clearUserPref(prefs.TRR_SELECT_URI_PREF);
  Services.prefs.setStringPref(
    prefs.TRR_SELECT_DRY_RUN_RESULT_PREF,
    "https://example.com/2"
  );
  prefPromise = TestUtils.waitForPrefChange(
    prefs.TRR_SELECT_URI_PREF,
    newVal => newVal == "https://example.com/2"
  );
  await setPrefAndWaitForConfigFlush(prefs.TRR_SELECT_COMMIT_PREF, true);
  await prefPromise;
  is(
    Services.prefs.getStringPref(prefs.TRR_SELECT_URI_PREF),
    "https://example.com/2",
    "TRR selection complete, existing dry-run-result committed."
  );

  // Reset doh-rollout.uri, and change the dry-run-result to another one NOT on
  // default list. After init, a new TRR should be selected and committed.
  prefPromise = TestUtils.waitForPrefChange(
    prefs.TRR_SELECT_URI_PREF,
    newVal => newVal == "https://example.com/dns-query"
  );
  Services.prefs.clearUserPref(prefs.TRR_SELECT_URI_PREF);
  Services.prefs.setStringPref(
    prefs.TRR_SELECT_DRY_RUN_RESULT_PREF,
    "https://example.com/4"
  );
  await restartDoHController();
  await prefPromise;
  is(
    Services.prefs.getStringPref(prefs.TRR_SELECT_URI_PREF),
    "https://example.com/dns-query",
    "TRR selection complete, existing dry-run-result discarded and refreshed."
  );
});
