/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { AMTelemetry } = ChromeUtils.importESModule(
  "resource://gre/modules/AddonManager.sys.mjs"
);
const { ExtensionUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionUtils.sys.mjs"
);

AddonTestUtils.init(this);
AddonTestUtils.overrideCertDB();
createAppInfo("xpcshell@tests.mozilla.org", "XPCShell", "1", "1");

add_setup(() => {
  do_get_profile();
  Services.fog.initializeFOG();
});

add_task(
  {
    pref_set: [
      // Enable AddonManager managed EnvironmentAddonBuilder on any build
      // to make it easier to test the `addons` Glean Ping scheduling
      // across Android and Desktop builds (whereas by default the
      // EnvironmentAddonBuilder is still managed by the legacy
      // TelemetryEnvironment on Firefox Desktop builds).
      ["extensions.telemetry.EnvironmentAddonBuilder", true],
      // Reduce the delay and idle timeout for the `addons` Glean Ping
      // scheduled on add-ons list updates (delay to 2s from the 5m default,
      // idle timeout disabled completely).
      ["extensions.gleanPingAddons.updated.delay", 1000 * 2],
      ["extensions.gleanPingAddons.updated.idleTimeout", -1],
      // Enable the test-glean-ping-addons-updated observer notification
      // sent right before GleanPings.addons.submit("updated") is actually
      // called.
      ["extensions.gleanPingAddons.updated.testing", true],
    ],
  },
  async function test_addons_glean_ping() {
    const addonDetailsToString = addon => `${addon.id}:${addon.version}`;

    info("Verify GleanPing addons is submitted after AOM startup");
    await GleanPings.addons.testSubmission(
      reason => {
        Assert.equal(
          reason,
          "startup",
          "Expect addons GleanPing submittion to have reason 'startup'"
        );
        Assert.deepEqual(
          Glean.addons.activeAddons.testGetValue()?.map(addonDetailsToString),
          [],
          "Expect activeAddons Glean metric to be set to an empty object"
        );
      },
      async () => {
        // Trigger the XPI Database to be fully loaded and expect the
        // Glean Ping `addons` to be submitted with reason `startup`.
        await AddonTestUtils.promiseStartupManager();
        Services.obs.notifyObservers(null, "test-load-xpi-database");
        await AMTelemetry.telemetryAddonBuilder._pendingTask;
      }
    );

    info(
      "Verify GleanPing addons is submitted after new test add-on is installed"
    );
    let extension = null;
    let promiseStartupCompleted = null;
    await GleanPings.addons.testSubmission(
      reason => {
        Assert.equal(
          reason,
          "updated",
          "Expect addons GleanPing submittion to have reason 'updated'"
        );
        Assert.deepEqual(
          Glean.addons.activeAddons.testGetValue()?.map(addonDetailsToString),
          [addonDetailsToString(extension)],
          "Expect activeAddons Glean metric to include the test extension"
        );
      },
      async () => {
        // Install a new extension and expect the Glean Ping `addons` to
        // be submitted with reason `update`.
        extension = ExtensionTestUtils.loadExtension({
          useAddonManager: "permanent",
          manifest: {
            name: "test-extension",
          },
        });
        let promiseSubmitGleanPingAddonsUpdatedCalled =
          ExtensionUtils.promiseObserved("test-glean-ping-addons-updated");
        promiseStartupCompleted = extension.startup();
        await promiseSubmitGleanPingAddonsUpdatedCalled;
      }
    );

    // Prevent intermittent failures that may be hit if we try to unload the test
    // extension while it is still being started).
    await promiseStartupCompleted;

    // Mock the addons glean-daily-ping timer notification and expect
    // the Glean Ping `addons` to be submitted with reason `daily`.
    info("Verify the GleanPing is submitted on the daily timer");
    await GleanPings.addons.testSubmission(
      reason => {
        Assert.equal(
          reason,
          "daily",
          "Expect addons GleanPing submittion to have reason 'daily'"
        );
        Assert.deepEqual(
          Glean.addons.activeAddons.testGetValue()?.map(addonDetailsToString),
          [addonDetailsToString(extension)],
          "Expect activeAddons Glean metric to include the test extension"
        );
      },
      async () => {
        const fakeTimer = () =>
          Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
        Cc["@mozilla.org/addons/glean-daily-ping;1"]
          .getService(Ci.nsITimerCallback)
          .notify(fakeTimer());
      }
    );

    info(
      "Verify GleanPing addons is submitted after the test add-on is uninstalled"
    );
    let promiseShutdownCompleted = null;
    await GleanPings.addons.testSubmission(
      reason => {
        Assert.equal(
          reason,
          "updated",
          "Expect addons GleanPing submittion to have reason 'updated'"
        );
        Assert.deepEqual(
          Glean.addons.activeAddons.testGetValue()?.map(addonDetailsToString),
          [],
          "Expect activeAddons Glean metric to be set to an empty object"
        );
      },
      async () => {
        // Uninstall the test extension and expect the Glean Ping `addons` to
        // be submitted with reason `update`.
        let promiseSubmitGleanPingAddonsUpdatedCalled =
          ExtensionUtils.promiseObserved("test-glean-ping-addons-updated");
        promiseShutdownCompleted = extension.unload();
        await promiseSubmitGleanPingAddonsUpdatedCalled;
      }
    );

    // Prevent intermittent failure that may be hit if the test task is exiting
    // before the test extension unload was completed.
    await promiseShutdownCompleted;
  }
);
