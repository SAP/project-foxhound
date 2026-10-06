/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  BackgroundUpdate: "resource://gre/modules/BackgroundUpdate.sys.mjs",
  MigrationUtils: "resource:///modules/MigrationUtils.sys.mjs",
  PermissionTestUtils: "resource://testing-common/PermissionTestUtils.sys.mjs",
  TestUtils: "resource://testing-common/TestUtils.sys.mjs",
  WindowsLaunchOnLogin: "resource://gre/modules/WindowsLaunchOnLogin.sys.mjs",
});

const STARTUP_PANE = SRD_PREF_VALUE ? "paneHome" : "paneGeneral";

add_task(async function test_check_uncheck_checkbox() {
  await ExperimentAPI.ready();
  let doCleanup = await NimbusTestUtils.enrollWithFeatureConfig({
    featureId: "windowsLaunchOnLogin",
    value: { enabled: true },
  });
  // Start from a known-disabled state so the test does not depend on whether
  // first-run default enablement ran during startup. This must happen before
  // the preferences pane is opened, since the checkbox reads the launch-on-
  // login state during its setup.
  await WindowsLaunchOnLogin._disableLaunchOnLoginMSIX();

  // Open preferences to general pane
  await openPreferencesViaOpenPreferencesAPI(STARTUP_PANE, {
    leaveOpen: true,
  });

  let doc = gBrowser.contentDocument;
  await TestUtils.waitForCondition(
    () => doc.getElementById("windowsLaunchOnLogin"),
    "windowsLaunchOnLogin checkbox rendered"
  );

  let launchOnLoginCheckbox = doc.getElementById("windowsLaunchOnLogin");

  ok(!launchOnLoginCheckbox.checked, "Autostart checkbox starts unchecked");

  // Click once: should enable launch-on-login.
  synthesizeClick(launchOnLoginCheckbox);
  ok(
    launchOnLoginCheckbox.checked,
    "Autostart checkbox checked after first click"
  );
  await TestUtils.waitForCondition(async () => {
    return await WindowsLaunchOnLogin.getLaunchOnLoginEnabled();
  }, "Launch on login is enabled after checking");

  // Click again: should disable launch-on-login.
  synthesizeClick(launchOnLoginCheckbox);
  ok(
    !launchOnLoginCheckbox.checked,
    "Autostart checkbox unchecked after second click"
  );
  await TestUtils.waitForCondition(async () => {
    return !(await WindowsLaunchOnLogin.getLaunchOnLoginEnabled());
  }, "Launch on login is disabled after unchecking");

  gBrowser.removeCurrentTab();
  await doCleanup();
});

add_task(async function enable_external_startuptask() {
  await ExperimentAPI.ready();
  let doCleanup = await NimbusTestUtils.enrollWithFeatureConfig({
    featureId: "windowsLaunchOnLogin",
    value: { enabled: true },
  });
  // Ensure the task is disabled before enabling it
  await WindowsLaunchOnLogin._disableLaunchOnLoginMSIX();
  let enabled = await WindowsLaunchOnLogin.enableLaunchOnLoginMSIX();
  ok(enabled, "Task is enabled");

  // Open preferences to general pane
  await openPreferencesViaOpenPreferencesAPI(STARTUP_PANE, {
    leaveOpen: true,
  });
  let doc = gBrowser.contentDocument;
  await TestUtils.waitForCondition(
    () => doc.getElementById("windowsLaunchOnLogin"),
    "windowsLaunchOnLogin checkbox rendered"
  );

  let launchOnLoginCheckbox = doc.getElementById("windowsLaunchOnLogin");
  ok(launchOnLoginCheckbox.checked, "Autostart checkbox automatically checked");

  gBrowser.removeCurrentTab();
  await doCleanup();
});

add_task(async function disable_external_startuptask() {
  await ExperimentAPI.ready();
  let doCleanup = await NimbusTestUtils.enrollWithFeatureConfig({
    featureId: "windowsLaunchOnLogin",
    value: { enabled: true },
  });
  // Disable the startup task to ensure it's reflected in the settings
  await WindowsLaunchOnLogin._disableLaunchOnLoginMSIX();

  // Open preferences to general pane
  await openPreferencesViaOpenPreferencesAPI(STARTUP_PANE, {
    leaveOpen: true,
  });
  let doc = gBrowser.contentDocument;
  await TestUtils.waitForCondition(
    () => doc.getElementById("windowsLaunchOnLogin"),
    "windowsLaunchOnLogin checkbox rendered"
  );

  let launchOnLoginCheckbox = doc.getElementById("windowsLaunchOnLogin");
  ok(
    !launchOnLoginCheckbox.checked,
    "Launch on login checkbox automatically unchecked"
  );

  gBrowser.removeCurrentTab();
  await doCleanup();
});
