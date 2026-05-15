/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Test that TelemetryController sends close to shutdown don't lead
// to AsyncShutdown timeouts.

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  AppConstants: "resource://gre/modules/AppConstants.sys.mjs",
  SearchService: "moz-src:///toolkit/components/search/SearchService.sys.mjs",
  UpdateUtils: "resource://gre/modules/UpdateUtils.sys.mjs",
});

const { NimbusTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/NimbusTestUtils.sys.mjs"
);
const { Policy, TelemetryReportingPolicy } = ChromeUtils.importESModule(
  "resource://gre/modules/TelemetryReportingPolicy.sys.mjs"
);

NimbusTestUtils.init(this);

// Some tests in this test file can't outside desktop Firefox because of
// features that aren't included in the build.
const skipIfNotBrowser = () => ({
  skip_if: () => AppConstants.MOZ_BUILD_APP != "browser",
});

const TEST_CHANNEL = "TestChannelABC";

const PREF_MINIMUM_CHANNEL_POLICY_VERSION =
  TelemetryUtils.Preferences.MinimumPolicyVersion + ".channel-" + TEST_CHANNEL;

function fakeShowPolicyTimeout(set, clear) {
  Policy.setShowInfobarTimeout = set;
  Policy.clearShowInfobarTimeout = clear;
}

function fakeResetAcceptedPolicy() {
  Services.prefs.clearUserPref(TelemetryUtils.Preferences.AcceptedPolicyDate);
  Services.prefs.clearUserPref(
    TelemetryUtils.Preferences.AcceptedPolicyVersion
  );
}

function setMinimumPolicyVersion(aNewPolicyVersion) {
  const CHANNEL_NAME = UpdateUtils.getUpdateChannel(false);
  // We might have channel-dependent minimum policy versions.
  const CHANNEL_DEPENDENT_PREF =
    TelemetryUtils.Preferences.MinimumPolicyVersion +
    ".channel-" +
    CHANNEL_NAME;

  // Does the channel-dependent pref exist? If so, set its value.
  if (Services.prefs.getIntPref(CHANNEL_DEPENDENT_PREF, undefined)) {
    Services.prefs.setIntPref(CHANNEL_DEPENDENT_PREF, aNewPolicyVersion);
    return;
  }

  // We don't have a channel specific minimum, so set the common one.
  Services.prefs.setIntPref(
    TelemetryUtils.Preferences.MinimumPolicyVersion,
    aNewPolicyVersion
  );
}

add_setup(async function test_setup() {
  // Addon manager needs a profile directory
  do_get_profile(true);
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

  // Don't bypass the legacy data reporting notifications in this test, we'll
  // fake it.
  Services.prefs.setBoolPref(
    TelemetryUtils.Preferences.BypassNotification,
    false
  );

  TelemetryReportingPolicy.setup();
});

add_setup(skipIfNotBrowser(), async () => {
  const { cleanup } = await NimbusTestUtils.setupTest();

  registerCleanupFunction(cleanup);
});

async function runlegacyDataReportingFlowfirstRun(prefToSet) {
  await SearchService.init();

  const FIRST_RUN_TIMEOUT_MSEC = 60 * 1000; // 60s
  const OTHER_RUNS_TIMEOUT_MSEC = 10 * 1000; // 10s

  Services.prefs.clearUserPref(TelemetryUtils.Preferences.FirstRun);
  // The new user TOS modal is now enabled by default on all platforms except
  // Linux, so the infobar will only show if preonboarding is explicitly turned
  // off via nimbus variable or its fallback pref.
  if (AppConstants.platform !== "linux") {
    // This pref is set to false on Linux by default
    Services.prefs.setBoolPref(prefToSet.name, prefToSet.value);
  }

  let promiseTimeout = () =>
    new Promise(resolve => {
      fakeShowPolicyTimeout(
        (_callback, timeout) => resolve(timeout),
        () => {}
      );
    });
  let p, startupTimeout;

  TelemetryReportingPolicy.reset();
  p = promiseTimeout();
  Services.obs.notifyObservers(null, "sessionstore-windows-restored");
  startupTimeout = await p;
  Assert.equal(
    startupTimeout,
    FIRST_RUN_TIMEOUT_MSEC,
    "The infobar display timeout should be 60s on the first run."
  );

  // Run again, and check that we actually wait only 10 seconds.
  TelemetryReportingPolicy.reset();
  p = promiseTimeout();
  Services.obs.notifyObservers(null, "sessionstore-windows-restored");
  startupTimeout = await p;
  Assert.equal(
    startupTimeout,
    OTHER_RUNS_TIMEOUT_MSEC,
    "The infobar display timeout should be 10s on other runs."
  );

  Services.prefs.clearUserPref(prefToSet);
}

add_task(
  skipIfNotBrowser(),
  async function test_legacyDataReportingFlowfirstRunPreonboardingTOUNotEnabled() {
    await runlegacyDataReportingFlowfirstRun({
      name: "browser.preonboarding.enabled",
      value: false,
    });
  }
);

add_task(
  skipIfNotBrowser(),
  async function test_legacyDataReportingFlowfirstRunTOUBypassEnabled() {
    await runlegacyDataReportingFlowfirstRun({
      name: "termsofuse.bypassNotification",
      value: true,
    });
  }
);

add_task(async function test_legacyDataReportingPrefs() {
  TelemetryReportingPolicy.reset();

  let now = fakeNow(2009, 11, 18);

  // The new user TOS modal is now enabled by default on all platforms except
  // Linux, so the infobar will only show if preonboarding is explicitly turned
  // off via nimbus variable or its fallback pref.
  if (AppConstants.platform !== "linux") {
    // This pref is set to false on Linux by default
    Services.prefs.setBoolPref("browser.preonboarding.enabled", false);
  }

  // If the date is not valid (earlier than 2012), we don't regard the policy as accepted.
  TelemetryReportingPolicy.testInfobarShown();
  Assert.ok(
    !TelemetryReportingPolicy.testIsUserNotifiedOfDataReportingPolicy()
  );
  Assert.equal(
    Services.prefs.getStringPref(
      TelemetryUtils.Preferences.AcceptedPolicyDate,
      null
    ),
    0,
    "Invalid dates should not make the policy accepted."
  );

  // Check that the notification date and version are correctly saved to the prefs.
  now = fakeNow(2012, 11, 18);
  TelemetryReportingPolicy.testInfobarShown();
  Assert.equal(
    Services.prefs.getStringPref(
      TelemetryUtils.Preferences.AcceptedPolicyDate,
      null
    ),
    now.getTime(),
    "A valid date must correctly be saved."
  );

  // Now that user is notified, check if we are allowed to upload.
  Assert.ok(
    TelemetryReportingPolicy.canUpload(),
    "We must be able to upload after the policy is accepted."
  );

  // Disable submission and check that we're no longer allowed to upload.
  Services.prefs.setBoolPref(
    TelemetryUtils.Preferences.DataSubmissionEnabled,
    false
  );
  Assert.ok(
    !TelemetryReportingPolicy.canUpload(),
    "We must not be able to upload if data submission is disabled."
  );

  // Turn the submission back on.
  Services.prefs.setBoolPref(
    TelemetryUtils.Preferences.DataSubmissionEnabled,
    true
  );
  Assert.ok(
    TelemetryReportingPolicy.canUpload(),
    "We must be able to upload if data submission is enabled and the policy was accepted."
  );

  // Set a new minimum policy version and check that user is no longer notified.
  let newMinimum =
    Services.prefs.getIntPref(
      TelemetryUtils.Preferences.CurrentPolicyVersion,
      1
    ) + 1;
  setMinimumPolicyVersion(newMinimum);
  Assert.ok(
    !TelemetryReportingPolicy.testIsUserNotifiedOfDataReportingPolicy(),
    "A greater minimum policy version must invalidate the policy and disable upload."
  );

  // Eventually accept the policy and make sure user is notified.
  Services.prefs.setIntPref(
    TelemetryUtils.Preferences.CurrentPolicyVersion,
    newMinimum
  );
  TelemetryReportingPolicy.testInfobarShown();
  Assert.ok(
    TelemetryReportingPolicy.testIsUserNotifiedOfDataReportingPolicy(),
    "Accepting the policy again should show the user as notified."
  );
  Assert.ok(
    TelemetryReportingPolicy.canUpload(),
    "Accepting the policy again should let us upload data."
  );

  maybeUnlockAppUpdateChannelPref();

  // Set a new, per channel, minimum policy version. Start by setting a test current channel.
  Services.prefs
    .getDefaultBranch("")
    .setStringPref("app.update.channel", TEST_CHANNEL);

  // Increase and set the new minimum version, then check that we're not notified anymore.
  newMinimum++;
  Services.prefs.setIntPref(PREF_MINIMUM_CHANNEL_POLICY_VERSION, newMinimum);
  Assert.ok(
    !TelemetryReportingPolicy.testIsUserNotifiedOfDataReportingPolicy(),
    "Increasing the minimum policy version should invalidate the policy."
  );

  // Eventually accept the policy and make sure user is notified.
  Services.prefs.setIntPref(
    TelemetryUtils.Preferences.CurrentPolicyVersion,
    newMinimum
  );
  TelemetryReportingPolicy.testInfobarShown();
  Assert.ok(
    TelemetryReportingPolicy.testIsUserNotifiedOfDataReportingPolicy(),
    "Accepting the policy again should show the user as notified."
  );
  Assert.ok(
    TelemetryReportingPolicy.canUpload(),
    "Accepting the policy again should let us upload data."
  );
});

add_task(async function test_migrateLegacyDataReportingPrefs() {
  const DEPRECATED_FHR_PREFS = {
    "datareporting.policy.dataSubmissionPolicyAccepted": true,
    "datareporting.policy.dataSubmissionPolicyBypassAcceptance": true,
    "datareporting.policy.dataSubmissionPolicyResponseType": "foxyeah",
    "datareporting.policy.dataSubmissionPolicyResponseTime":
      Date.now().toString(),
  };

  // Make sure the preferences are set before setting up the policy.
  for (let name in DEPRECATED_FHR_PREFS) {
    switch (typeof DEPRECATED_FHR_PREFS[name]) {
      case "string":
        Services.prefs.setStringPref(name, DEPRECATED_FHR_PREFS[name]);
        break;
      case "number":
        Services.prefs.setIntPref(name, DEPRECATED_FHR_PREFS[name]);
        break;
      case "boolean":
        Services.prefs.setBoolPref(name, DEPRECATED_FHR_PREFS[name]);
        break;
    }
  }
  // Set up the policy.
  TelemetryReportingPolicy.reset();
  // They should have been removed by now.
  for (let name in DEPRECATED_FHR_PREFS) {
    Assert.ok(
      !Services.prefs.prefHasUserValue(name),
      name + " should have been removed."
    );
  }
});

add_task(async function test_userNotifiedOfCurrentDataReportingPolicy() {
  fakeResetAcceptedPolicy();
  TelemetryReportingPolicy.reset();

  // User should be reported as not notified by default.
  Assert.ok(
    !TelemetryReportingPolicy.testIsUserNotifiedOfDataReportingPolicy(),
    "The initial state should be unnotified."
  );

  // Forcing a policy version should not automatically make the user notified.
  Services.prefs.setIntPref(
    TelemetryUtils.Preferences.AcceptedPolicyVersion,
    TelemetryReportingPolicy.DEFAULT_DATAREPORTING_POLICY_VERSION
  );
  Assert.ok(
    !TelemetryReportingPolicy.testIsUserNotifiedOfDataReportingPolicy(),
    "The default state of the date should have a time of 0 and it should therefore fail"
  );

  // Showing the notification bar should make the user notified.
  fakeNow(2012, 11, 11);
  TelemetryReportingPolicy.testInfobarShown();
  Assert.ok(
    TelemetryReportingPolicy.testIsUserNotifiedOfDataReportingPolicy(),
    "Using the proper API causes user notification to report as true."
  );

  // It is assumed that later versions of the policy will incorporate previous
  // ones, therefore this should also return true.
  let newVersion =
    Services.prefs.getIntPref(
      TelemetryUtils.Preferences.CurrentPolicyVersion,
      1
    ) + 1;
  Services.prefs.setIntPref(
    TelemetryUtils.Preferences.AcceptedPolicyVersion,
    newVersion
  );
  Assert.ok(
    TelemetryReportingPolicy.testIsUserNotifiedOfDataReportingPolicy(),
    "A future version of the policy should pass."
  );

  newVersion =
    Services.prefs.getIntPref(
      TelemetryUtils.Preferences.MinimumPolicyVersion,
      1
    ) - 1;

  Services.prefs.setIntPref(
    TelemetryUtils.Preferences.AcceptedPolicyVersion,
    newVersion
  );
  Assert.ok(
    !TelemetryReportingPolicy.testIsUserNotifiedOfDataReportingPolicy(),
    "A previous version of the policy should fail."
  );
});

add_task(async function test_canSend() {
  const TEST_PING_TYPE = "test-ping";

  PingServer.start();
  Services.prefs.setStringPref(
    TelemetryUtils.Preferences.Server,
    "http://localhost:" + PingServer.port
  );

  await TelemetryController.testReset();
  TelemetryReportingPolicy.reset();

  // User should be reported as not notified by default.
  Assert.ok(
    !TelemetryReportingPolicy.testIsUserNotifiedOfDataReportingPolicy(),
    "The initial state should be unnotified."
  );

  // Assert if we receive any ping before the policy is accepted.
  PingServer.registerPingHandler(() =>
    Assert.ok(false, "Should not have received any pings now")
  );
  await TelemetryController.submitExternalPing(TEST_PING_TYPE, {});

  // Reset the ping handler.
  PingServer.resetPingHandler();

  // Fake the infobar: this should also trigger the ping send task.
  TelemetryReportingPolicy.testInfobarShown();
  let ping = await PingServer.promiseNextPings(1);
  Assert.equal(ping.length, 1, "We should have received one ping.");
  Assert.equal(
    ping[0].type,
    TEST_PING_TYPE,
    "We should have received the previous ping."
  );

  // Submit another ping, to make sure it gets sent.
  await TelemetryController.submitExternalPing(TEST_PING_TYPE, {});

  // Get the ping and check its type.
  ping = await PingServer.promiseNextPings(1);
  Assert.equal(ping.length, 1, "We should have received one ping.");
  Assert.equal(
    ping[0].type,
    TEST_PING_TYPE,
    "We should have received the new ping."
  );

  // Fake a restart with a pending ping.
  await TelemetryController.addPendingPing(TEST_PING_TYPE, {});
  await TelemetryController.testReset();

  // We should be immediately sending the ping out.
  ping = await PingServer.promiseNextPings(1);
  Assert.equal(ping.length, 1, "We should have received one ping.");
  Assert.equal(
    ping[0].type,
    TEST_PING_TYPE,
    "We should have received the pending ping."
  );

  // Submit another ping, to make sure it gets sent.
  await TelemetryController.submitExternalPing(TEST_PING_TYPE, {});

  // Get the ping and check its type.
  ping = await PingServer.promiseNextPings(1);
  Assert.equal(ping.length, 1, "We should have received one ping.");
  Assert.equal(
    ping[0].type,
    TEST_PING_TYPE,
    "We should have received the new ping."
  );

  await PingServer.stop();
});
