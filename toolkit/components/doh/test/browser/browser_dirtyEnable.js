/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

"use strict";

add_task(setup);

add_task(async function testDirtyEnable() {
  // Set up a failing environment, pre-set DoH to enabled, and verify that
  // when the add-on is enabled, it doesn't do anything - DoH remains turned on.
  setFailingHeuristics();
  let prefPromise = TestUtils.waitForPrefChange(prefs.DISABLED_PREF);
  Services.prefs.setIntPref(prefs.NETWORK_TRR_MODE_PREF, 2);
  Services.prefs.setBoolPref(prefs.ENABLED_PREF, true);
  await prefPromise;
  is(
    Services.prefs.getBoolPref(prefs.DISABLED_PREF),
    true,
    "Disabled state recorded."
  );
  ok(
    !Services.prefs.prefHasUserValue(prefs.BREADCRUMB_PREF),
    "Breadcrumb not saved."
  );
  ok(
    !Services.prefs.prefHasUserValue(prefs.TRR_SELECT_URI_PREF),
    "TRR selection not performed."
  );
  is(
    Services.prefs.getIntPref(prefs.NETWORK_TRR_MODE_PREF),
    2,
    "TRR mode preserved."
  );
  await ensureNoTRRSelectionTelemetry();
  await ensureNoTRRModeChange(undefined);
  await ensureNoHeuristicsTelemetry();

  // Simulate a network change.
  simulateNetworkChange();
  await ensureNoTRRModeChange(undefined);
  await ensureNoHeuristicsTelemetry();
  is(
    Services.prefs.getIntPref(prefs.NETWORK_TRR_MODE_PREF),
    2,
    "TRR mode preserved."
  );

  // Restart the controller for good measure.
  await restartDoHController();
  await ensureNoTRRModeChange(undefined);
  await ensureNoTRRSelectionTelemetry();
  await ensureNoHeuristicsTelemetry();
  is(
    Services.prefs.getIntPref(prefs.NETWORK_TRR_MODE_PREF),
    2,
    "TRR mode preserved."
  );

  // Simulate a network change.
  simulateNetworkChange();
  await ensureNoTRRModeChange(undefined);
  is(
    Services.prefs.getIntPref(prefs.NETWORK_TRR_MODE_PREF),
    2,
    "TRR mode preserved."
  );
  await ensureNoHeuristicsTelemetry();
});
