/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  ExtensionParent: "resource://gre/modules/ExtensionParent.sys.mjs",
  TelemetryTestUtils: "resource://testing-common/TelemetryTestUtils.sys.mjs",
});

AddonTestUtils.init(this);
AddonTestUtils.overrideCertDB();

AddonTestUtils.createAppInfo(
  "xpcshell@tests.mozilla.org",
  "XPCShell",
  "42",
  "42"
);

const ADDON_ID = "test-startup-cache-telemetry@xpcshell.mozilla.org";

add_setup(async () => {
  // FOG needs a profile directory to put its data in.
  do_get_profile();
  // FOG needs to be initialized in order for data to flow.
  Services.fog.initializeFOG();

  await AddonTestUtils.promiseStartupManager();
});

add_task(async function test_startupCache_write_byteLength() {
  Services.fog.testResetFOG();
  const extension = ExtensionTestUtils.loadExtension({
    useAddonManager: "permanent",
    manifest: {
      browser_specific_settings: { gecko: { id: ADDON_ID } },
    },
  });

  await extension.startup();

  const { StartupCache } = ExtensionParent;

  const aomStartup = Cc[
    "@mozilla.org/addons/addon-manager-startup;1"
  ].getService(Ci.amIAddonManagerStartup);

  let expectedByteLength = new Uint8Array(
    aomStartup.encodeBlob(StartupCache._data)
  ).byteLength;

  equal(
    typeof expectedByteLength,
    "number",
    "Got a numeric byteLength for the expected startupCache data"
  );
  Assert.greater(
    expectedByteLength,
    0,
    "Got a non-zero byteLength as expected"
  );
  await StartupCache._saveNow();

  equal(
    Glean.extensions.startupCacheWriteBytelength.testGetValue(),
    expectedByteLength,
    "Expected 'extensions.startupCache.write_byteLength' Glean metric."
  );

  await extension.unload();
});

add_task(async function test_startupCache_read_errors() {
  const { StartupCache } = ExtensionParent;

  // Clear any pre-existing Glean metrics data.
  Services.fog.testResetFOG();

  // Temporarily point StartupCache._file to a path that is
  // not going to exist for sure.
  Assert.notEqual(
    StartupCache.file,
    null,
    "Got a StartupCache._file non-null property as expected"
  );
  const oldFile = StartupCache.file;
  const restoreStartupCacheFile = () => (StartupCache.file = oldFile);
  StartupCache.file = `${StartupCache.file}.non_existing_file.${Math.random()}`;
  registerCleanupFunction(restoreStartupCacheFile);

  // Make sure the _readData has been called and we can expect
  // the extensions.startupCache.read_errors scalar to have
  // been recorded.
  await StartupCache._readData();

  Assert.deepEqual(
    Glean.extensions.startupCacheReadErrors.NotFoundError.testGetValue(),
    1,
    "Expected value for 'extensions.startupCache.read_errors' Glean metric."
  );

  restoreStartupCacheFile();
});

add_task(async function test_startupCache_load_timestamps() {
  const { StartupCache } = ExtensionParent;

  // Clear any pre-existing Glean metrics data.
  Services.fog.testResetFOG();

  let gleanMetric = Glean.extensions.startupCacheLoadTime.testGetValue();
  equal(
    gleanMetric,
    null,
    "Expect extensions.startup_cache_load_time Glean metric to be initially null"
  );

  // Make sure the _readData has been called and we can expect
  // the startupCache load telemetry timestamps to have been
  // recorded.
  await StartupCache._readData();

  info(
    "Verify telemetry recorded for the 'extensions.startup_cache_load_time' Glean metric"
  );

  gleanMetric = Glean.extensions.startupCacheLoadTime.testGetValue();
  equal(
    typeof gleanMetric,
    "number",
    "Expect extensions.startup_cache_load_time Glean metric to be set to a number"
  );
});
