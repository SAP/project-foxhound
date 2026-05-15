/* Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { TelemetryController } = ChromeUtils.importESModule(
  "resource://gre/modules/TelemetryController.sys.mjs"
);

AddonTestUtils.init(this);
AddonTestUtils.overrideCertDB();
AddonTestUtils.createAppInfo(
  "xpcshell@tests.mozilla.org",
  "XPCShell",
  "1",
  "42"
);

add_setup(async () => {
  if (AppConstants.platform !== "android") {
    // We need to set this pref to `true` in order to collect add-ons Telemetry
    // data (which is considered extended data and disabled in CI).
    const overridePreReleasePref =
      "toolkit.telemetry.testing.overridePreRelease";
    Services.prefs.setBoolPref(overridePreReleasePref, true);
    await TelemetryController.testSetup();

    // Enable Application scope to ensure the active theme is installed
    // on desktop builds (used to assert the related telemetry metrics).
    let scopes = AddonManager.SCOPE_PROFILE | AddonManager.SCOPE_APPLICATION;
    Services.prefs.setIntPref("extensions.enabledScopes", scopes);
  }

  Services.fog.testResetFOG();
  await AddonTestUtils.promiseStartupManager();

  // In Firefox Desktop DevEdition builds the default theme is expected to
  // be the firefox-compact-dark@mozilla.org, but the dark theme would be
  // installed by logic that isn't going to be executed in the minimal
  // xpcshell test environment and so here we force enable the default theme
  // (which is installed by disabled) to let this test to run across all builds
  // included the DevEdition beta builds.
  if (AppConstants.MOZ_DEV_EDITION) {
    const defaultTheme = await AddonManager.getAddonByID(
      "default-theme@mozilla.org"
    );
    await defaultTheme.enable();
  }
});

async function installTestExtensions() {
  const extensions = [
    {
      id: "addons-telemetry@test-extension-1",
      name: "some extension 1",
      version: "1.2.3",
    },
    {
      id: "addons-telemetry@test-extension-2",
      name: "some extension 2",
      version: "0.1",
    },
  ];

  // Install some extensions.
  const installedExtensions = [];
  for (const { id, name, version } of extensions) {
    const extension = ExtensionTestUtils.loadExtension({
      manifest: {
        name,
        version,
        browser_specific_settings: { gecko: { id } },
      },
      useAddonManager: "permanent",
    });
    installedExtensions.push(extension);

    await extension.startup();
  }

  return {
    extensions,
    async uninstallTestExtensions() {
      for (const extension of installedExtensions) {
        await extension.unload();
      }
    },
  };
}

add_task(async function test_amo_stats_glean_metrics() {
  const { extensions, uninstallTestExtensions } = await installTestExtensions();

  info("Verify Glean addons.activeAddons metric");
  const gleanActiveAddons = Glean.addons.activeAddons.testGetValue();
  for (const { id, version } of extensions) {
    const entry = gleanActiveAddons.find(el => el.id === id);
    Assert.ok(
      entry,
      `Expect addon ${id} to be found in the Glean addons.activeAddons metric`
    );
    Assert.equal(
      entry.version,
      version,
      `Got expected addon ${id} version in Glean activeAddons metric`
    );
  }

  if (AppConstants.platform === "android") {
    const themes = await AddonManager.getAddonsByTypes(["theme"]);
    // Sanity check.
    Assert.deepEqual(
      themes,
      [],
      "Expect no theme addons to be found while running on mobile builds"
    );

    const gleanActiveTheme = Glean.addons.theme.testGetValue();
    Assert.deepEqual(
      gleanActiveTheme,
      null,
      "Expect no theme metadata to be found on Android builds for Glean addons.theme"
    );
  } else {
    const theme = await AddonManager.getAddonByID("default-theme@mozilla.org");
    const gleanActiveTheme = Glean.addons.theme.testGetValue();
    Assert.deepEqual(
      { id: gleanActiveTheme.id, version: gleanActiveTheme.version },
      { id: theme.id, version: theme.version },
      "Got the expected theme metadata set on Glean addons.theme"
    );
  }

  await uninstallTestExtensions();
});

// TODO(Bug 1981822): remove the following test once we migrated away from using this data for
// AMO stats.
add_task(
  { skip_if: () => AppConstants.platform === "android" },
  async function test_amo_stats_legacy_telemetry() {
    const { extensions, uninstallTestExtensions } =
      await installTestExtensions();

    const theme = await AddonManager.getAddonByID("default-theme@mozilla.org");

    info("Verify legacy telemetry");
    // Note: This returns null on Android because toolkit.telemetry.unified=false
    // and this is deprecated and the AMO usage stats to be migrated to Glean
    // addons.activeAddons metric.
    const { payload, environment } = TelemetryController.getCurrentPingData();

    // Important: `payload.info.addons` is being used for AMO usage stats.
    Assert.ok("addons" in payload.info, "payload.info.addons is defined");
    Assert.equal(
      payload.info.addons,
      [...extensions, { id: theme.id, version: theme.version }]
        .map(({ id, version }) => `${encodeURIComponent(id)}:${version}`)
        .join(",")
    );
    Assert.ok(
      "XPI" in payload.addonDetails,
      "payload.addonDetails.XPI is defined"
    );
    for (const { id, name } of extensions) {
      Assert.ok(id in payload.addonDetails.XPI);
      Assert.equal(payload.addonDetails.XPI[id].name, name);
    }

    const { addons } = environment;
    Assert.ok(
      "activeAddons" in addons,
      "environment.addons.activeAddons is defined"
    );
    Assert.ok("theme" in addons, "environment.addons.theme is defined");
    for (const { id } of extensions) {
      Assert.ok(id in environment.addons.activeAddons);
    }

    await uninstallTestExtensions();
  }
);

add_task(
  { skip_if: () => AppConstants.platform === "android" },
  async function cleanup() {
    await TelemetryController.testShutdown();
  }
);
