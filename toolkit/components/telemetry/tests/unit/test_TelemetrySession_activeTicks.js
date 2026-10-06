/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/
*/

const { TelemetryController } = ChromeUtils.importESModule(
  "resource://gre/modules/TelemetryController.sys.mjs"
);
const { TelemetrySession } = ChromeUtils.importESModule(
  "resource://gre/modules/TelemetrySession.sys.mjs"
);

// Helpers to fire the user-interaction notifications that drive active-tick
// telemetry. The "-non-synthesized" variants drive the corrected stream added
// in Bug 2050081.
const active = () =>
  Services.obs.notifyObservers(null, "user-interaction-active");
const inactive = () =>
  Services.obs.notifyObservers(null, "user-interaction-inactive");
const activeNonSynth = () =>
  Services.obs.notifyObservers(null, "user-interaction-active-non-synthesized");
const inactiveNonSynth = () =>
  Services.obs.notifyObservers(
    null,
    "user-interaction-inactive-non-synthesized"
  );

function tick(aHowMany) {
  for (let i = 0; i < aHowMany; i++) {
    active();
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

add_task(async function test_record_consecutiveActiveTicks() {
  await TelemetryController.testReset();
  Services.fog.testResetFOG();

  // Reduce a distribution to the number of samples and their sum, so we can
  // assert on the recorded run lengths without depending on bucket boundaries.
  let summarize = label => {
    let data =
      Glean.browserEngagement.consecutiveActiveTicks[label].testGetValue();
    if (!data) {
      return { count: 0, sum: 0 };
    }
    let count = Object.values(data.values).reduce((a, b) => a + b, 0);
    return { count, sum: data.sum };
  };

  let checkDist = (label, expectedCount, expectedSum) => {
    let { count, sum } = summarize(label);
    Assert.equal(
      count,
      expectedCount,
      `${label}: number of recorded runs must match.`
    );
    Assert.equal(sum, expectedSum, `${label}: sum of run lengths must match.`);
  };

  // A run in progress is not recorded until the user goes inactive. The first
  // active after testReset is counted because the initial state is active.
  active();
  active();
  active();
  checkDist("active_ticks", 0, 0);

  // Ending the run records its length (3) as a single sample.
  inactive();
  checkDist("active_ticks", 1, 3);

  // The first active out of inactivity is just the start of the run and is not
  // counted, so this run has length 1.
  active();
  active();
  inactive();
  checkDist("active_ticks", 2, 4);

  // An empty run (start immediately followed by inactive) records nothing.
  active();
  inactive();
  checkDist("active_ticks", 2, 4);

  // Consecutive inactive notifications don't record spurious samples.
  inactive();
  checkDist("active_ticks", 2, 4);

  // The non-synthesized stream is tracked independently.
  checkDist("active_ticks_non_synthesized", 0, 0);
  activeNonSynth();
  activeNonSynth();
  inactiveNonSynth();
  checkDist("active_ticks_non_synthesized", 1, 2);
  // The legacy distribution is unchanged by the non-synthesized stream.
  checkDist("active_ticks", 2, 4);

  await TelemetryController.testShutdown();
});

add_task(async function test_record_inactivePeriodDuration() {
  await TelemetryController.testReset();
  Services.fog.testResetFOG();

  // Notifications fire synchronously, so each recorded period has a near-zero
  // duration; assert on the number of recorded periods rather than their times.
  let checkCount = (label, expected) => {
    let data =
      Glean.browserEngagement.inactivePeriodDuration[label].testGetValue();
    Assert.equal(
      data ? data.count : 0,
      expected,
      `${label}: number of recorded inactive periods must match.`
    );
  };

  // Nothing is recorded until an inactive period completes (inactive->active).
  active();
  inactive();
  checkCount("active_ticks", 0);

  // Activity resumes: the completed inactive period is recorded.
  active();
  checkCount("active_ticks", 1);

  // A second complete inactive period.
  inactive();
  active();
  checkCount("active_ticks", 2);

  // An inactive period in progress is not recorded until activity resumes.
  inactive();
  checkCount("active_ticks", 2);
  active();
  checkCount("active_ticks", 3);

  // Consecutive inactive notifications don't start overlapping periods.
  inactive();
  inactive();
  active();
  checkCount("active_ticks", 4);

  // The non-synthesized stream is tracked independently.
  checkCount("active_ticks_non_synthesized", 0);
  activeNonSynth();
  inactiveNonSynth();
  activeNonSynth();
  checkCount("active_ticks_non_synthesized", 1);
  checkCount("active_ticks", 4);

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
