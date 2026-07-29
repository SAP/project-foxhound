/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

"use strict";

add_task(setup);

const { EnterprisePolicyTesting } = ChromeUtils.importESModule(
  "resource://testing-common/EnterprisePolicyTesting.sys.mjs"
);

add_task(async function testPolicyOverride() {
  // Set up an arbitrary enterprise policy. Its existence should be sufficient
  // to disable heuristics.
  await EnterprisePolicyTesting.setupPolicyEngineWithJson({
    policies: {
      EnableTrackingProtection: {
        Value: true,
      },
    },
  });
  is(
    Services.policies.status,
    Ci.nsIEnterprisePolicies.ACTIVE,
    "Policy engine is active."
  );

  Services.prefs.setBoolPref(prefs.ENABLED_PREF, true);
  await waitForStateTelemetry(["shutdown", "policyDisabled"]);
  ok(
    !Services.prefs.prefHasUserValue(prefs.BREADCRUMB_PREF),
    "Breadcrumb not saved."
  );
  ok(
    !Services.prefs.prefHasUserValue(prefs.TRR_SELECT_URI_PREF),
    "TRR selection not performed."
  );
  is(
    Services.prefs.getBoolPref(prefs.SKIP_HEURISTICS_PREF),
    true,
    "Pref set to suppress CFR."
  );
  await ensureNoTRRSelectionTelemetry();
  await ensureNoTRRModeChange(undefined);
  await ensureNoHeuristicsTelemetry();

  await assertGleanValues([
    [
      Glean.networking.dohHeuristicsResult,
      Heuristics.Telemetry.enterprisePresent,
    ],
    ...allHeuristicsFalseExpectations(),
  ]);

  // Simulate a network change.
  simulateNetworkChange();
  await ensureNoTRRModeChange(undefined);
  await ensureNoHeuristicsTelemetry();

  // Clean up.
  await EnterprisePolicyTesting.setupPolicyEngineWithJson({
    policies: {},
  });
  EnterprisePolicyTesting.resetRunOnceState();

  is(
    Services.policies.status,
    Ci.nsIEnterprisePolicies.INACTIVE,
    "Policy engine is inactive at the end of the test"
  );
});
