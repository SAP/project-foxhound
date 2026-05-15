/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/
*/

const { NimbusFeatures } = ChromeUtils.importESModule(
  "resource://nimbus/ExperimentAPI.sys.mjs"
);
const { NimbusTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/NimbusTestUtils.sys.mjs"
);
const { TelemetryController } = ChromeUtils.importESModule(
  "resource://gre/modules/TelemetryController.sys.mjs"
);
const { TelemetrySend } = ChromeUtils.importESModule(
  "resource://gre/modules/TelemetrySend.sys.mjs"
);
const { TelemetryUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/TelemetryUtils.sys.mjs"
);

NimbusTestUtils.init(this);

const PING_FORMAT_VERSION = 4;
const TEST_PING_TYPE = "test-ping-type";

function sendPing(aSendClientId, aSendEnvironment) {
  if (PingServer.started) {
    const server = "http://localhost:" + PingServer.port;
    TelemetrySend.setServer(server);
    Services.prefs.setStringPref(TelemetryUtils.Preferences.Server, server);
  } else {
    TelemetrySend.setServer("http://doesnotexist");
  }

  let options = {
    addClientId: aSendClientId,
    addEnvironment: aSendEnvironment,
  };
  return TelemetryController.submitExternalPing(TEST_PING_TYPE, {}, options);
}

function checkPingFormat(aPing, aType, aHasClientId, aHasEnvironment) {
  const MANDATORY_PING_FIELDS = [
    "type",
    "id",
    "creationDate",
    "version",
    "application",
    "payload",
  ];

  const APPLICATION_TEST_DATA = {
    buildId: gAppInfo.appBuildID,
    name: APP_NAME,
    version: APP_VERSION,
    displayVersion: AppConstants.MOZ_APP_VERSION_DISPLAY,
    vendor: "Mozilla",
    platformVersion: PLATFORM_VERSION,
    xpcomAbi: "noarch-spidermonkey",
  };

  // Check that the ping contains all the mandatory fields.
  for (let f of MANDATORY_PING_FIELDS) {
    Assert.ok(f in aPing, f + " must be available.");
  }

  Assert.equal(aPing.type, aType, "The ping must have the correct type.");
  Assert.equal(
    aPing.version,
    PING_FORMAT_VERSION,
    "The ping must have the correct version."
  );

  // Test the application section.
  for (let f in APPLICATION_TEST_DATA) {
    Assert.equal(
      aPing.application[f],
      APPLICATION_TEST_DATA[f],
      f + " must have the correct value."
    );
  }

  // We can't check the values for channel and architecture. Just make
  // sure they are in.
  Assert.ok(
    "architecture" in aPing.application,
    "The application section must have an architecture field."
  );
  Assert.ok(
    "channel" in aPing.application,
    "The application section must have a channel field."
  );

  // Check the clientId and environment fields, as needed.
  Assert.equal("clientId" in aPing, aHasClientId);
  Assert.equal("profileGroupId" in aPing, aHasClientId);
  Assert.equal("environment" in aPing, aHasEnvironment);
}

add_task(async function test_setup() {
  // Addon manager needs a profile directory
  do_get_profile();
  await loadAddonManager(
    "xpcshell@tests.mozilla.org",
    "XPCShell",
    "1",
    "1.9.2"
  );
  finishAddonManagerStartup();
  fakeIntlReady();
  // Make sure we don't generate unexpected pings due to pref changes.
  await setEmptyPrefWatchlist();

  Services.prefs.setBoolPref(TelemetryUtils.Preferences.FhrUploadEnabled, true);

  await TelemetryController.testSetup();
  PingServer.start();
});

add_task(async function test_pingDisablement() {
  await TelemetryController.testReset();
  PingServer.clearRequests();

  info("1. Ensure test pings can be sent.");
  let docid = await sendPing(false, false);
  let request = await PingServer.promiseNextRequest();

  let ping = decodeRequestPayload(request);
  Assert.equal(docid, ping.id, "Server delivered the ping we just submitted.");
  checkPingFormat(ping, TEST_PING_TYPE, false, false);

  info("2. Ensure we can disable a ping by name.");
  const { cleanup } = await NimbusTestUtils.setupTest();
  registerCleanupFunction(cleanup);

  let nimbusCleanup = await NimbusTestUtils.enrollWithFeatureConfig({
    featureId: NimbusFeatures.legacyTelemetry.featureId,
    value: {
      disabledPings: [TEST_PING_TYPE],
    },
  });

  PingServer.registerPingHandler(() =>
    Assert.ok(false, "Telemetry must not send the disabled ping.")
  );
  await Assert.rejects(
    sendPing(true, true),
    /Ping disabled/,
    "Disabled ping should not send."
  );

  PingServer.resetPingHandler();

  info("3. Ensure disabling one kind of ping doesn't disable others.");
  const OTHER_PING_TYPE = TEST_PING_TYPE + "-other";
  await TelemetryController.submitExternalPing(OTHER_PING_TYPE, {}, {});
  request = await PingServer.promiseNextRequest();

  ping = decodeRequestPayload(request);
  checkPingFormat(ping, OTHER_PING_TYPE, false, false);

  await nimbusCleanup();
});

add_task(async function test_cantDisableImportantPings() {
  await TelemetryController.testReset();
  PingServer.clearRequests();

  const DO_NOT_DISABLE_THESE_PINGS = [
    "main",
    "first-shutdown",
    "new-profile",
    "deletion-request",
  ];
  const PINGS = [TEST_PING_TYPE, ...DO_NOT_DISABLE_THESE_PINGS];
  let nimbusCleanup = await NimbusTestUtils.enrollWithFeatureConfig({
    featureId: NimbusFeatures.legacyTelemetry.featureId,
    value: {
      disabledPings: PINGS,
    },
  });

  for (const pingName of PINGS) {
    info("Check " + pingName);
    if (DO_NOT_DISABLE_THESE_PINGS.includes(pingName)) {
      let docid = await TelemetryController.submitExternalPing(
        pingName,
        {},
        {}
      );
      let request = await PingServer.promiseNextRequest();
      let ping = decodeRequestPayload(request);
      Assert.equal(
        docid,
        ping.id,
        "Server delivered the ping we just submitted."
      );
      checkPingFormat(ping, pingName, false, false);
      // Ensure we don't get throttled for too many pings in a row.
      await TelemetrySend.reset();
    } else {
      PingServer.registerPingHandler(() =>
        Assert.ok(false, "Telemetry must not send the disabled ping.")
      );
      await Assert.rejects(
        TelemetryController.submitExternalPing(pingName, {}, {}),
        /Ping disabled/,
        "Disabled ping should not send."
      );
      PingServer.resetPingHandler();
    }
  }

  await nimbusCleanup();
});
