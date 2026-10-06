/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */
"use strict";

const { TelemetryEnvironment } = ChromeUtils.importESModule(
  "resource://gre/modules/TelemetryEnvironment.sys.mjs"
);

const { AMTelemetry } = ChromeUtils.importESModule(
  "resource://gre/modules/AddonManager.sys.mjs"
);

add_setup(() => {
  Services.fog.testResetFOG();
});

// Regression test for bug 1601678: verifies that AddonManager unblocks shutdown
// when startup is interrupted very early.
add_task(async function test_shutdown_immediately_after_startup() {
  // Set as migrated to prevent sync DB load at startup.
  Services.prefs.setCharPref("extensions.lastAppVersion", "42");
  createAppInfo("xpcshell@tests.mozilla.org", "XPCShell", "42");

  Assert.deepEqual(
    Glean.addons.activeAddons.testGetValue(),
    undefined,
    "Expect Glean addons.activeAddons to not be set yet"
  );
  Assert.equal(
    AMTelemetry.telemetryAddonBuilder,
    undefined,
    "Expect telemetryAddonBuilder to not be initialized yet"
  );

  Cc["@mozilla.org/addons/integration;1"]
    .getService(Ci.nsIObserver)
    .observe(null, "addons-startup", null);

  let shutdownCount = 0;
  AddonManager.beforeShutdown.addBlocker("count", async () => ++shutdownCount);

  let databaseLoaded = false;
  AddonManagerPrivate.databaseReady.then(() => {
    databaseLoaded = true;
  });

  // Above, we have configured the runtime to avoid a forced synchronous load
  // of the database. Confirm that this is indeed the case.
  equal(AddonManagerPrivate.isDBLoaded(), false, "DB not loaded synchronously");

  // TODO(Bug 1981822): remove use of TelemetryEnvironment and the this if-branch
  // on `AppConstants.platform !== "android"` once AMTelemetry becomes responsible
  // for initializing EnvironmentAddonBuilder across all platform (and
  // TelemetryEnvironment not responsible anymore for collecting the activeAddons
  // in the legacy telemetry).
  //
  // NOTE: AMTelemetry is implicitly initialize when the AddonManager is starting up
  // as a side-effect of notifying "addons-startup" to ""@mozilla.org/addons/integration;1".
  if (AppConstants.platform !== "android") {
    // Accessing TelemetryEnvironment.currentEnvironment triggers initialization
    // of TelemetryEnvironment / EnvironmentAddonBuilder, which registers a
    // shutdown blocker.
    equal(
      TelemetryEnvironment.currentEnvironment.addons,
      undefined,
      "TelemetryEnvironment.currentEnvironment.addons is uninitialized"
    );
  } else {
    Assert.ok(
      AMTelemetry.telemetryAddonBuilder,
      "Expect telemetryAddonBuilder to have been initialized"
    );
  }

  info("Immediate exit at startup, without quit-application-granted");
  Services.startup.advanceShutdownPhase(
    Services.startup.SHUTDOWN_PHASE_APPSHUTDOWN
  );
  let shutdownPromise = MockAsyncShutdown.profileBeforeChange.trigger();
  equal(shutdownCount, 1, "AddonManager.beforeShutdown has started");

  // Note: Until now everything ran in the same tick of the event loop.

  // Waiting for AddonManager to have shut down.
  await shutdownPromise;

  ok(databaseLoaded, "Addon DB loaded for use by TelemetryEnvironment");
  equal(AddonManagerPrivate.isDBLoaded(), false, "DB unloaded after shutdown");

  Assert.deepEqual(
    Glean.addons.activeAddons.testGetValue(),
    [],
    "Expect Glean addons.activeAddons to have been set"
  );
  if (AppConstants.platform !== "android") {
    Assert.deepEqual(
      TelemetryEnvironment.currentEnvironment.addons.activeAddons,
      {},
      "TelemetryEnvironment.currentEnvironment.addons is initialized"
    );
  }
});
