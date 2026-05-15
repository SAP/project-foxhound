/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/
*/
/**
 * Tests for disabling pieces of the "main" ping.
 */

const { NimbusFeatures } = ChromeUtils.importESModule(
  "resource://nimbus/ExperimentAPI.sys.mjs"
);
const { NimbusTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/NimbusTestUtils.sys.mjs"
);
const { TelemetrySession } = ChromeUtils.importESModule(
  "resource://gre/modules/TelemetrySession.sys.mjs"
);

NimbusTestUtils.init(this);

add_setup(async function () {
  // FOG needs a profile directory
  do_get_profile();
  Services.fog.initializeFOG();

  // Make sure we don't generate unexpected pings due to pref changes.
  await setEmptyPrefWatchlist();

  Services.prefs.setBoolPref(TelemetryUtils.Preferences.FhrUploadEnabled, true);

  await TelemetryController.testSetup();
});

add_task(async function test_scalarDisablement() {
  const URI_COUNT_SCALAR =
    "browser.engagement.total_uri_count_normal_and_private_mode";
  const ACTIVE_TICKS_SCALAR = "browser.engagement.active_ticks";
  const LAST_SHUTDOWN_SCALAR = "browser.timings.last_shutdown";

  // Ensure there's data to be snapshotted.
  // Both some that shouldn't be filtered...
  Glean.browserEngagement.uriCount.add(1);
  Glean.browserEngagement.activeTicks.add(1);
  // ...and some that should be.
  Glean.browserTimings.lastShutdown.set(42);

  info("1. Ensure things begin by storing and reporting as expected.");
  let payload = TelemetrySession.getPayload(
    "reason",
    /*clearSubsession*/ false
  );

  Assert.greater(payload.processes.parent.scalars[URI_COUNT_SCALAR], 0);
  Assert.greater(payload.processes.parent.scalars[ACTIVE_TICKS_SCALAR], 0);
  Assert.greater(payload.processes.parent.scalars[LAST_SHUTDOWN_SCALAR], 0);

  info("2. Ensure we can disable scalars, leaving important ones intact.");
  const { cleanup } = await NimbusTestUtils.setupTest();

  let nimbusCleanup = await NimbusTestUtils.enrollWithFeatureConfig({
    featureId: NimbusFeatures.legacyTelemetry.featureId,
    value: {
      disableMainPingScalars: true,
    },
  });

  let filtered = TelemetrySession.getPayload(
    "reason",
    /*clearSubsession*/ false
  );

  Assert.greater(filtered.processes.parent.scalars[URI_COUNT_SCALAR], 0);
  Assert.greater(filtered.processes.parent.scalars[ACTIVE_TICKS_SCALAR], 0);
  Assert.ok(!(LAST_SHUTDOWN_SCALAR in filtered.processes.parent.scalars));

  await nimbusCleanup();
  await cleanup();
});

add_task(async function test_hgramDisablement() {
  const ARCHIVE_HGRAM = "TELEMETRY_ARCHIVE_DIRECTORIES_COUNT";
  const SEND_KEYED_HGRAM = "TELEMETRY_SEND_FAILURE_TYPE_PER_PING";
  // Let's check both normal and keyed.
  Glean.telemetry.archiveDirectoriesCount.accumulateSingleSample(42);
  Glean.telemetry.sendFailureTypePerPing.get("some-ping", "eOK").add(1);

  info("1. Ensure histogram data is reported normally to begin with.");

  let payload = TelemetrySession.getPayload(
    "reason",
    /*clearSubsession*/ false
  );

  Assert.ok(ARCHIVE_HGRAM in payload.histograms);
  Assert.ok(SEND_KEYED_HGRAM in payload.keyedHistograms);

  info("2. Ensure we can disable histograms.");
  const { cleanup } = await NimbusTestUtils.setupTest();

  let nimbusCleanup = await NimbusTestUtils.enrollWithFeatureConfig({
    featureId: NimbusFeatures.legacyTelemetry.featureId,
    value: {
      disableMainPingHgrams: true,
    },
  });

  let filtered = TelemetrySession.getPayload(
    "reason",
    /*clearSubsession*/ false
  );

  Assert.ok(!(ARCHIVE_HGRAM in filtered.histograms));
  Assert.ok(!(SEND_KEYED_HGRAM in filtered.keyedHistograms));

  await nimbusCleanup();
  await cleanup();
});
