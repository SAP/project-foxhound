/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

"use strict";

add_task(setup);

add_task(async function testTrrSelectionDisable() {
  // Turn off TRR Selection.
  let configFlushed = DoHTestUtils.waitForConfigFlush();
  Services.prefs.setBoolPref(prefs.TRR_SELECT_ENABLED_PREF, false);
  await configFlushed;

  // Set up a passing environment and enable DoH.
  setPassingHeuristics();
  let promise = waitForDoorhanger();
  Services.prefs.setBoolPref(prefs.ENABLED_PREF, true);
  await BrowserTestUtils.waitForCondition(() => {
    return Services.prefs.getBoolPref(prefs.BREADCRUMB_PREF, false);
  });
  is(
    Services.prefs.getBoolPref(prefs.BREADCRUMB_PREF),
    true,
    "Breadcrumb saved."
  );
  ok(
    !Services.prefs.prefHasUserValue(prefs.TRR_SELECT_DRY_RUN_RESULT_PREF),
    "TRR selection dry run not performed."
  );
  is(
    Services.prefs.getStringPref(prefs.TRR_SELECT_URI_PREF),
    "https://example.com/1",
    "doh-rollout.uri set to first provider in the list."
  );
  await ensureNoTRRSelectionTelemetry();

  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, EXAMPLE_URL);
  let panel = await promise;

  // Click the doorhanger's "accept" button.
  let button = panel.querySelector(".popup-notification-primary-button");
  promise = BrowserTestUtils.waitForEvent(panel, "popuphidden");
  EventUtils.synthesizeMouseAtCenter(button, {});
  await promise;

  await ensureTRRMode(2);
  await checkHeuristicsTelemetry("enable_doh", "startup");

  await BrowserTestUtils.waitForCondition(() => {
    return Services.prefs.getStringPref(prefs.DOORHANGER_USER_DECISION_PREF);
  });
  is(
    Services.prefs.getStringPref(prefs.DOORHANGER_USER_DECISION_PREF),
    "UIOk",
    "Doorhanger decision saved."
  );
  is(
    Services.prefs.getBoolPref(prefs.BREADCRUMB_PREF),
    true,
    "Breadcrumb not cleared."
  );

  BrowserTestUtils.removeTab(tab);

  // Restart the controller for good measure.
  await restartDoHController();
  await ensureNoTRRSelectionTelemetry();
  ok(
    !Services.prefs.prefHasUserValue(prefs.TRR_SELECT_DRY_RUN_RESULT_PREF),
    "TRR selection dry run not performed."
  );
  is(
    Services.prefs.getStringPref(prefs.TRR_SELECT_URI_PREF),
    "https://example.com/1",
    "doh-rollout.uri set to first provider in the list."
  );
  await ensureTRRMode(2);
  await checkHeuristicsTelemetry("enable_doh", "startup");
});
