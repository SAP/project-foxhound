/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { StartupTelemetry } = ChromeUtils.importESModule(
  "moz-src:///browser/components/StartupTelemetry.sys.mjs"
);

const ENV_VAR = "FIREFOX_LAUNCHED_BY_DESKTOP_LAUNCHER";

add_setup(function test_setup() {
  // FOG needs a profile directory to put its data in.
  do_get_profile();

  // FOG needs to be initialized in order for data to flow.
  Services.fog.initializeFOG();
});

add_task(async function test_not_launched_from_desktop_launcher() {
  // This test ensures that if the env variable isn't set, we don't mistakenly categorize
  // startup through desktop launcher
  await StartupTelemetry.pinningStatus();

  Assert.notEqual(
    "DesktopLauncher",
    Glean.osEnvironment.launchMethod.testGetValue()
  );
});

add_task(async function test_launched_from_desktop_launcher() {
  // Let's assume that the desktop launcher sets the environment variable correctly.
  // Set it manually in the test to simulate that behaviour
  Services.env.set(ENV_VAR, "TRUE");

  await StartupTelemetry.pinningStatus();

  Assert.equal(
    "DesktopLauncher",
    Glean.osEnvironment.launchMethod.testGetValue()
  );
});
