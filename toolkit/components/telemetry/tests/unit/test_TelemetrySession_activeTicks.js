/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/
*/

const { TelemetryController } = ChromeUtils.importESModule(
  "resource://gre/modules/TelemetryController.sys.mjs"
);
const { TelemetrySession } = ChromeUtils.importESModule(
  "resource://gre/modules/TelemetrySession.sys.mjs"
);

function tick(aHowMany) {
  for (let i = 0; i < aHowMany; i++) {
    Services.obs.notifyObservers(null, "user-interaction-active");
  }
}

function checkSessionTicks(aExpected) {
  let payload = TelemetrySession.getPayload();
  Assert.equal(
    payload.simpleMeasurements.activeTicks,
    aExpected,
    "Should record the expected number of active ticks for the session."
  );
}

function checkSubsessionTicks(aExpected, aClearSubsession) {
  let payload = TelemetrySession.getPayload("main", aClearSubsession);
  Assert.equal(
    payload.simpleMeasurements.activeTicks,
    aExpected,
    "Should record the expected number of active ticks for the subsession."
  );
  if (aExpected > 0) {
    Assert.equal(
      payload.processes.parent.scalars["browser.engagement.active_ticks"],
      aExpected,
      "Should record the expected number of active ticks for the subsession, in a scalar."
    );
  }
}

add_task(async function test_setup() {
  do_get_profile();
  // Make sure we don't generate unexpected pings due to pref changes.
  await setEmptyPrefWatchlist();
  // Ensure FOG's init
  Services.fog.initializeFOG();
});

add_task(async function test_record_activeTicks() {
  await TelemetryController.testSetup();

  let checkActiveTicks = expected => {
    // Scalars are only present in subsession payloads.
    let payload = TelemetrySession.getPayload("main");
    Assert.equal(
      payload.simpleMeasurements.activeTicks,
      expected,
      "TelemetrySession must record the expected number of active ticks (in simpleMeasurements)."
    );
    // Subsessions are not yet supported on Android.
    if (!gIsAndroid) {
      Assert.equal(
        payload.processes.parent.scalars["browser.engagement.active_ticks"],
        expected,
        "TelemetrySession must record the expected number of active ticks (in scalars)."
      );
    }
    Assert.equal(Glean.browserEngagement.activeTicks.testGetValue(), expected);
  };

  for (let i = 0; i < 3; i++) {
    Services.obs.notifyObservers(null, "user-interaction-active");
  }
  checkActiveTicks(3);

  // Now send inactive. This must not increment the active ticks.
  Services.obs.notifyObservers(null, "user-interaction-inactive");
  checkActiveTicks(3);

  // If we send active again, this should be counted as inactive.
  Services.obs.notifyObservers(null, "user-interaction-active");
  checkActiveTicks(3);

  // If we send active again, this should be counted as active.
  Services.obs.notifyObservers(null, "user-interaction-active");
  checkActiveTicks(4);

  Services.obs.notifyObservers(null, "user-interaction-active");
  checkActiveTicks(5);

  await TelemetryController.testShutdown();
});

add_task(async function test_record_activeTicks_nonSynthesized() {
  await TelemetryController.testReset();
  Services.fog.testResetFOG();

  let active = () =>
    Services.obs.notifyObservers(null, "user-interaction-active");
  let inactive = () =>
    Services.obs.notifyObservers(null, "user-interaction-inactive");
  let activeNonSynth = () =>
    Services.obs.notifyObservers(
      null,
      "user-interaction-active-non-synthesized"
    );
  let inactiveNonSynth = () =>
    Services.obs.notifyObservers(
      null,
      "user-interaction-inactive-non-synthesized"
    );

  let checkTicks = (expectedLegacy, expectedNonSynth) => {
    Assert.equal(
      Glean.browserEngagement.activeTicks.testGetValue() ?? 0,
      expectedLegacy,
      "Legacy active ticks must match the expected value."
    );
    Assert.equal(
      Glean.browserEngagement.activeTicksNonSynthesized.testGetValue() ?? 0,
      expectedNonSynth,
      "Non-synthesized active ticks must match the expected value."
    );
  };

  // The non-synthesized stream is counted independently from the legacy stream.
  for (let i = 0; i < 3; i++) {
    activeNonSynth();
  }
  checkTicks(0, 3);

  // The legacy stream is unaffected by the non-synthesized notifications.
  for (let i = 0; i < 2; i++) {
    active();
  }
  checkTicks(2, 3);

  // Going inactive resets the non-synthesized debounce, so the next active is
  // treated as the start of a tick and not counted.
  inactiveNonSynth();
  checkTicks(2, 3);
  activeNonSynth();
  checkTicks(2, 3);
  activeNonSynth();
  checkTicks(2, 4);

  // The legacy inactive notification doesn't reset the non-synthesized stream.
  inactive();
  checkTicks(2, 4);
  activeNonSynth();
  checkTicks(2, 5);

  await TelemetryController.testShutdown();
});

add_task(
  {
    skip_if: () => gIsAndroid,
  },
  async function test_subsession_activeTicks() {
    await TelemetryController.testReset();
    Telemetry.clearScalars();

    tick(5);
    checkSessionTicks(5);
    checkSubsessionTicks(5, true);

    // After clearing the subsession, subsession ticks should be 0 but session
    // ticks should still be 5.
    checkSubsessionTicks(0);
    checkSessionTicks(5);

    tick(1);
    checkSessionTicks(6);
    checkSubsessionTicks(1, true);

    checkSubsessionTicks(0);
    checkSessionTicks(6);

    tick(2);
    checkSessionTicks(8);
    checkSubsessionTicks(2);

    await TelemetryController.testShutdown();
  }
);
