/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests related to XPI location relocation handling (Bug 1429838).
//
// When the profile is moved to a new location, addonStartup.json.lz4 and
// extensions.json will contain stale paths. On the next startup the XPIProvider
// should be detecting the stale paths and recompute XPIState rootURI for every
// add-on in the relocated location, and the absolute path stored in extensions.json
// updated to point to the relocated location, so that all add-ons remain functional.

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

AddonTestUtils.createAppInfo(
  "xpcshell@tests.mozilla.org",
  "XPCShell",
  "1",
  "1"
);

// Set startupScanScopes to the same value set on Firefox Desktop builds.
Services.prefs.setIntPref("extensions.startupScanScopes", 0);

function tamperAddonStartupAndAddonDB({
  addonId,
  addonStartup,
  addonDB,
  staleLocationPath,
  staleAddonPath,
  staleAddonRootURISpec,
}) {
  // Sanity checks on the data expected to be found in addonStartup.json.lz4.
  const startupLocationData = addonStartup["app-profile"];
  Assert.ok(
    startupLocationData,
    "app-profile location is present in addonStartup.json.lz4"
  );
  Assert.equal(
    startupLocationData.path,
    PathUtils.join(PathUtils.profileDir, "extensions"),
    "app-profile location path is initially set to the expected absolute path"
  );
  const addonStartupData = startupLocationData.addons[addonId];
  Assert.ok(
    addonStartupData,
    "test extension expected to be found in addonStartup.json.lz4"
  );
  Assert.ok(
    addonStartupData.rootURI,
    "test extension rootURI expected to be set in addonStartup.json.lz4"
  );

  // Sanity checks on the data expected to be found in extensions.json.
  let addonDBEntry = addonDB.addons.find(a => a.id === addonId);
  Assert.ok(addonDBEntry, "add-on is present in extensions.json");
  Assert.equal(
    addonDBEntry.rootURI,
    addonStartupData.rootURI,
    "Expect same test extension rootURI in AddonDB and XPIStates"
  );

  // Gather the location path and test extension rootURI and XPI path
  // to verify they are fixed after being tampered as part of simulating
  // the relocated profile scenario.
  const expectedLocationPath = startupLocationData.path;
  const expectedRootURI = addonDBEntry.rootURI;
  const expectedXPIPath = addonDBEntry.path;

  // Overwrite addonStartup.json.lz4 data with stale location path
  // and addon rootURI.
  startupLocationData.path = staleLocationPath;
  addonStartupData.rootURI = staleAddonRootURISpec;

  // Overwrite extensions.json data with stale addon path and rootURI.
  addonDBEntry.path = staleAddonPath;
  addonDBEntry.rootURI = staleAddonRootURISpec;

  return {
    expectedLocationPath,
    expectedRootURI,
    expectedXPIPath,
  };
}

async function test_XPIProvider_addonData_fixups_on_profile_moved({
  addonId,
  staleLocationPath,
  staleAddonPath,
  staleAddonRootURISpec,
  withoutAddonStartupData = false,
  expectUnrecognizedPathError = false,
}) {
  const xpi = await AddonTestUtils.createTempWebExtensionFile({
    manifest: { browser_specific_settings: { gecko: { id: addonId } } },
  });

  // Preparing to recreate the tested scenario by installing test extension XPI,
  // and making sure both XPIStates (addonsStartup.json.lz4) and AddonDB (extensions.json)
  // are written to disk in the test profile.
  await AddonTestUtils.manuallyInstall(xpi);
  await AddonTestUtils.promiseStartupManager();
  await AddonTestUtils.promiseShutdownManager();

  let startupData = aomStartup.readStartupData();
  const addonDBPath = PathUtils.join(
    AddonTestUtils.profileDir.path,
    "extensions.json"
  );
  let allAddonsDBData = await IOUtils.readJSON(addonDBPath);

  info(
    "Simulating relocated profile by overwriting addonStartup.json.lz4 and extensions.json)"
  );

  const { expectedLocationPath, expectedRootURI, expectedXPIPath } =
    tamperAddonStartupAndAddonDB({
      addonId,
      addonStartup: startupData,
      addonDB: allAddonsDBData,
      // Values to set in the XPISates and AddonDB to simulate the relocated profile.
      staleLocationPath,
      staleAddonPath,
      staleAddonRootURISpec,
    });

  // Remove or overwrite addonStartup.json.lz4 data stored on disk.
  if (withoutAddonStartupData) {
    await IOUtils.remove(AddonTestUtils.addonStartup.path);
  } else {
    await IOUtils.writeJSON(AddonTestUtils.addonStartup.path, startupData, {
      tmpPath: `${AddonTestUtils.addonStartup.path}.tmp`,
      compress: true,
    });
  }

  // Overwrite extensions.json data stored on disk.
  await IOUtils.writeJSON(addonDBPath, allAddonsDBData);

  info("Restart AddonManager on relocated profile");

  const { messages } = await AddonTestUtils.promiseConsoleOutput(async () => {
    Assert.ok(
      !AddonTestUtils.getXPIExports().XPIDatabase.initialized,
      "Expect XPIDatabase to not be initialized yet"
    );

    const sandbox = sinon.createSandbox();
    const parseDBSpy = sandbox.spy(
      AddonTestUtils.getXPIExports().XPIDatabase,
      "parseDB"
    );
    await AddonTestUtils.promiseStartupManager();

    info("Wait for the XPIProvider addonDB to be fully loaded");
    await AddonTestUtils.getXPIExports().XPIProvider.databaseReady;
    sandbox.restore();

    Assert.ok(
      AddonTestUtils.getXPIExports().XPIDatabase.initialized,
      "Expect XPIDatabase to be fully initialized"
    );
    Assert.ok(
      parseDBSpy.calledOnce,
      "Expect XPIDatabase.parseDB to have been called once"
    );

    // Verify that the expected tampered data got passed to XPIDatabase.parseDB.
    const parseDBAddonData = parseDBSpy.firstCall.args[0].addons.find(
      data => data.id == addonId
    );
    Assert.deepEqual(
      {
        path: parseDBAddonData.path,
        rootURI: parseDBAddonData.rootURI,
      },
      {
        path: staleAddonPath,
        rootURI: staleAddonRootURISpec,
      },
      "XPIDatabase.parseDB should have been called with the tampered addonDB data"
    );

    const addon = await AddonManager.getAddonByID(addonId);
    Assert.ok(
      addon,
      "add-on is found after startup on simulated relocated profile"
    );
    Assert.ok(addon.isActive, "add-on expected to be active");

    const addonRootURI = Services.io.newURI(addon.__AddonInternal__.rootURI);
    const manifestData = await fetch(
      addonRootURI.resolve("manifest.json")
    ).then(r => r.json());
    Assert.equal(
      manifestData.browser_specific_settings.gecko.id,
      addonId,
      "Loaded manifest data successfully from the XPI file after simulated relocation"
    );

    const { sourceBundle } = addon.__AddonInternal__;
    Assert.ok(
      sourceBundle.exists(),
      `Expect addon _sourceBundle ${sourceBundle?.path} to point to an existing xpi file`
    );
  });

  // Shutdown the AddonManager to flush the updated XPIStates and addonDB data to disk.
  await AddonTestUtils.promiseShutdownManager();

  // After the AddonManager shutdown, both addonStartup.json.lz4 and extensions.json
  // are expected to be in the corrected state.
  const newStartupData = aomStartup.readStartupData();
  Assert.equal(
    newStartupData["app-profile"].path,
    expectedLocationPath,
    "location path in addonStartup.json.lz4 is restored after relocation"
  );
  Assert.equal(
    newStartupData["app-profile"].addons[addonId].rootURI,
    expectedRootURI,
    "rootURI in addonStartup.json.lz4 is restored after relocation"
  );

  const newAllAddonsDBData = await IOUtils.readJSON(addonDBPath);
  const addonDBEntry = newAllAddonsDBData.addons.find(a => a.id === addonId);
  Assert.equal(
    addonDBEntry.path,
    expectedXPIPath,
    "addon absolute path to the XPI in extensions.json is restored after relocation"
  );
  Assert.equal(
    addonDBEntry.rootURI,
    expectedRootURI,
    "addon rootURI in extensions.json is recomputed after relocation"
  );

  const expectedMessages = [
    // Expected log emitted when XPIDatabaseReconcile.updatePath
    // has been called as part of fixing the path associated to the
    // addon in the AddonDB data.
    {
      message: new RegExp(
        `Add-on ${addonId} moved to ${RegExp.escape(expectedXPIPath)}`
      ),
    },
  ];

  if (expectUnrecognizedPathError) {
    // Expected log emitted by XPIDatabase.parseDB when an nsIFile entry is being
    // created from an addon path invalid on the current operating system (e.g.
    // when a profile created on Windows is being used on Linux/macOS or viceversa).
    expectedMessages.unshift({
      message: new RegExp(
        `Could not find source bundle for add-on ${addonId}: .*NS_ERROR_FILE_UNRECOGNIZED_PATH`
      ),
    });
  }

  if (!withoutAddonStartupData) {
    // Expected logs emitted by the XPIStateLocation and XPIState class instances
    // when a relocated addon has been detected in the addonStartup.json.lz4 data.
    expectedMessages.unshift(
      { message: /Detected relocated XPIStateLocation app-profile/ },
      {
        message: new RegExp(
          `Recomputed XPIState rootURI for ${addonId} due to relocated location app-profile.`
        ),
      }
    );
  }

  AddonTestUtils.checkMessages(
    messages,
    { expected: expectedMessages },
    "Got the expected XPIProvider warnings logged on detected stale paths and recomputed rootURIs"
  );

  // Cleanup.
  await promiseStartupManager();
  let addon = await AddonManager.getAddonByID(addonId);
  await addon.uninstall();
  await promiseShutdownManager();
}

add_task(async function test_profile_moved_to_other_OS() {
  const addonId = "test-ext@moved-to-other-OS";

  const staleLocationPath =
    AppConstants.platform == "win"
      ? "/foo/bar/old-unix-path-to-profile/extensions"
      : "C:\\foo\\bar\\old-win-path-to-profile\\extensions";

  const staleAddonPath =
    AppConstants.platform == "win"
      ? `${staleLocationPath}/${addonId}.xpi`
      : `${staleLocationPath}\\${addonId}.xpi`;

  const staleAddonRootURISpec =
    AppConstants.platform == "win"
      ? `jar:file:///foo/bar/old-unix-path-to-profile/extensions/${addonId}.xpi!/`
      : `jar:file:///C:/foo/bar/old-win-path-to-profile/extensions/${addonId}.xpi!/`;

  await test_XPIProvider_addonData_fixups_on_profile_moved({
    addonId,
    staleLocationPath,
    staleAddonPath,
    staleAddonRootURISpec,
    expectUnrecognizedPathError: true,
  });

  info("Verify again with no addonStartup.json.lz4 data");
  await test_XPIProvider_addonData_fixups_on_profile_moved({
    addonId,
    staleLocationPath,
    staleAddonPath,
    staleAddonRootURISpec,
    withoutAddonStartupData: true,
    expectUnrecognizedPathError: true,
  });
});

add_task(async function test_profile_moved_to_other_path() {
  const addonId = "test-ext@moved-to-other-path";

  const staleLocationPath = PathUtils.join(
    PathUtils.parent(PathUtils.profileDir),
    "old-profile-location",
    "extensions"
  );

  const staleAddonPath = PathUtils.join(staleLocationPath, `${addonId}.xpi`);

  const staleXPIFile = Cc["@mozilla.org/file/local;1"].createInstance(
    Ci.nsIFile
  );
  staleXPIFile.initWithPath(staleAddonPath);
  const staleAddonRootURISpec =
    AddonTestUtils.getXPIExports().XPIInternal.getURIForResourceInFile(
      staleXPIFile,
      ""
    ).spec;

  await test_XPIProvider_addonData_fixups_on_profile_moved({
    addonId,
    staleLocationPath,
    staleAddonPath,
    staleAddonRootURISpec,
  });

  info("Verify again with no addonStartup.json.lz4 data");
  await test_XPIProvider_addonData_fixups_on_profile_moved({
    addonId,
    staleLocationPath,
    staleAddonPath,
    staleAddonRootURISpec,
    withoutAddonStartupData: true,
  });
});

// This test is verifying that no other absolute paths to the profile
// are being left as stale in the form of an additional smoke test (e.g.
// if additional properties are being added to the addon db or startup
// data in the future and they are not being detected as stale and fixed
// as part of the XPIProvider startup).
add_task(async function test_profile_relocation_no_stale_paths_smoketest() {
  const addonId = "test-ext@smoke-no-stale-paths";
  // PROFILE_DIRNAME is going to be xpcshellprofile when the test is run once
  // and a xpcshell unique dirname when running with --verify.
  const PROFILE_DIRNAME = PathUtils.filename(PathUtils.profileDir);
  const POISON = "poisondirectorydoesnotexist";

  const xpi = await AddonTestUtils.createTempWebExtensionFile({
    manifest: { browser_specific_settings: { gecko: { id: addonId } } },
  });

  const addonDBPath = PathUtils.join(PathUtils.profileDir, "extensions.json");
  const addonStartupPath = PathUtils.join(
    PathUtils.profileDir,
    "addonStartup.json.lz4"
  );

  // Remove extensions.json and addonStartup.json.lz4 file (in case they were
  // left from a previous test).
  await IOUtils.remove(addonDBPath, { ignoreAbsent: true });
  await IOUtils.remove(addonStartupPath, { ignoreAbsent: true });

  await AddonTestUtils.manuallyInstall(xpi);
  await AddonTestUtils.promiseStartupManager();
  await AddonTestUtils.promiseShutdownManager();

  function poisonString(str) {
    return str.replaceAll(PROFILE_DIRNAME, POISON);
  }

  const addonDBStr = await IOUtils.readUTF8(addonDBPath);
  const startupDataStr = JSON.stringify(aomStartup.readStartupData());

  Assert.ok(
    startupDataStr.includes(PROFILE_DIRNAME),
    `Profile dir "${PROFILE_DIRNAME}" present in addonStartup.json.lz4 before tampering`
  );
  Assert.ok(
    addonDBStr.includes(PROFILE_DIRNAME),
    `Profile dir "${PROFILE_DIRNAME}" present in extensions.json before tampering`
  );

  // Replace all occurrences of the profile dir path with the poisoned path,
  // simulating what the stored paths would look like if the profile had been
  // moved to a directory named after the POISON string value.
  const poisonedStartupDataStr = poisonString(startupDataStr);
  const poisonedAddonDBStr = poisonString(addonDBStr);

  Assert.ok(
    poisonedStartupDataStr.includes(POISON),
    "Poison string present in addonStartup data after tampering"
  );
  Assert.ok(
    poisonedAddonDBStr.includes(POISON),
    "Poison string present in extensions.json after tampering"
  );

  await IOUtils.writeJSON(
    AddonTestUtils.addonStartup.path,
    JSON.parse(poisonedStartupDataStr),
    { tmpPath: `${AddonTestUtils.addonStartup.path}.tmp`, compress: true }
  );
  await IOUtils.writeUTF8(addonDBPath, poisonedAddonDBStr);

  await AddonTestUtils.promiseStartupManager();
  await AddonTestUtils.getXPIExports().XPIProvider.databaseReady;

  const addon = await AddonManager.getAddonByID(addonId);
  Assert.ok(addon, "add-on found after startup with poisoned paths");
  Assert.ok(
    addon.isActive,
    "add-on is active after startup with poisoned paths"
  );

  // Shutdown to flush the updated addonStartup.json.lz4 and extensions.json
  // data to disk (which is expected to have been fixed by XPIProvider).
  await AddonTestUtils.promiseShutdownManager();

  // Verify neither persisted file retains any occurrence of the poison string.
  const newStartupDataStr = JSON.stringify(aomStartup.readStartupData());
  const newAddonDBStr = await IOUtils.readUTF8(addonDBPath);

  Assert.ok(
    !newStartupDataStr.includes(POISON),
    "Poison string absent from addonStartup.json.lz4 after migration"
  );
  Assert.ok(
    !newAddonDBStr.includes(POISON),
    "Poison string absent from extensions.json after migration"
  );

  // Cleanup.
  await promiseStartupManager();
  let cleanupAddon = await AddonManager.getAddonByID(addonId);
  await cleanupAddon.uninstall();
  await promiseShutdownManager();
});
