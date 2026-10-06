/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

"use strict";

add_task(setup);

add_task(async function testDoorhangerUserReject() {
  // Set up a passing environment and enable DoH.
  setPassingHeuristics();
  let promise = waitForDoorhanger();
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
  await checkTRRSelectionTelemetry();

  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, EXAMPLE_URL);
  let panel = await promise;

  await ensureTRRMode(2);
  await checkHeuristicsTelemetry("enable_doh", "startup");

  await assertGleanValues([
    [Glean.networking.dohHeuristicsAttempts, 1],
    [Glean.networking.dohHeuristicsPassCount, 1],
    [Glean.networking.dohHeuristicsResult, Heuristics.Telemetry.pass],
    ...allHeuristicsFalseExpectations(),
  ]);

  prefPromise = TestUtils.waitForPrefChange(
    prefs.DOORHANGER_USER_DECISION_PREF
  );

  // Click the doorhanger's "reject" button.
  let button = panel.querySelector(".popup-notification-secondary-button");
  promise = BrowserTestUtils.waitForEvent(panel, "popuphidden");
  EventUtils.synthesizeMouseAtCenter(button, {});
  await promise;

  await prefPromise;

  is(
    Services.prefs.getStringPref(prefs.DOORHANGER_USER_DECISION_PREF),
    "UIDisabled",
    "Doorhanger decision saved."
  );

  BrowserTestUtils.removeTab(tab);

  await ensureTRRMode(undefined);
  await ensureNoHeuristicsTelemetry();
  ok(
    !Services.prefs.prefHasUserValue(prefs.BREADCRUMB_PREF),
    "Breadcrumb cleared."
  );

  await assertGleanValues([
    [Glean.networking.dohHeuristicsAttempts, 1],
    [Glean.networking.dohHeuristicsPassCount, 1],
    [Glean.networking.dohHeuristicsResult, Heuristics.Telemetry.optOut],
    ...allHeuristicsFalseExpectations(),
  ]);

  // Simulate a network change.
  simulateNetworkChange();
  await ensureNoTRRModeChange(undefined);
  await ensureNoHeuristicsTelemetry();

  // Restart the controller for good measure.
  await restartDoHController();
  await ensureNoTRRSelectionTelemetry();
  await ensureNoTRRModeChange(undefined);
  await ensureNoHeuristicsTelemetry();

  // Set failing environment and trigger another network change.
  setFailingHeuristics();
  simulateNetworkChange();
  await ensureNoTRRModeChange(undefined);
  await ensureNoHeuristicsTelemetry();
});
