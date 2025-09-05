// Verifies that changes to blocklistState are correctly reported to telemetry.

"use strict";

Services.prefs.setBoolPref("extensions.blocklist.useMLBF", true);
Services.prefs.setBoolPref("extensions.blocklist.softblock.enabled", true);

// Set min version to 42 because the updater defaults to min version 42.
createAppInfo("xpcshell@tests.mozilla.org", "XPCShell", "42.0", "42.0");

// Use unprivileged signatures because the MLBF-based blocklist does not
// apply to add-ons with a privileged signature.
AddonTestUtils.usePrivilegedSignatures = false;

const { AMTelemetry } = ChromeUtils.importESModule(
  "resource://gre/modules/AddonManager.sys.mjs"
);
const { Downloader } = ChromeUtils.importESModule(
  "resource://services-settings/Attachments.sys.mjs"
);

const { TelemetryController } = ChromeUtils.importESModule(
  "resource://gre/modules/TelemetryController.sys.mjs"
);

const ExtensionBlocklistMLBF = getExtensionBlocklistMLBF();

const EXT_ID = "maybeblockme@tests.mozilla.org";
const EXT_ID2 = "maybeblockme2@tests.mozilla.org";

// The addon hard-blocked by the bloom filter (referenced by MLBF_RECORD).
const EXT_BLOCKED_ID = "@blocked";
const EXT_BLOCKED_VERSION = "1";
const EXT_BLOCKED_SIGN_TIME = 12345; // Before MLBF_RECORD.generation_time.

// The addon soft-blocked by the bloom filter (referenced by MLBF_SOFTBLOCK_RECORD).
const EXT_SOFTBLOCKED_ID = "@softblocked";
const EXT_SOFTBLOCKED_VERSION = "1";
const EXT_SOFTBLOCKED_SIGN_TIME = 12345; // Before MLBF_SOFTBLOCK_RECORD.generation_time.

// To serve updates.
const server = AddonTestUtils.createHttpServer();
const SERVER_BASE_URL = `http://127.0.0.1:${server.identity.primaryPort}`;
const SERVER_UPDATE_PATH = "/update.json";
const SERVER_UPDATE_URL = `${SERVER_BASE_URL}${SERVER_UPDATE_PATH}`;
// update is served via `server` over insecure http.
Services.prefs.setBoolPref(PREF_EM_CHECK_UPDATE_SECURITY, false);

function assertGleanEventDetails(expectedExtras) {
  const snapshot = Glean.blocklist.addonBlockChange.testGetValue();
  if (expectedExtras.length === 0) {
    Assert.deepEqual(undefined, snapshot, "Expected zero addonBlockChange");
    return;
  }
  Assert.equal(
    expectedExtras.length,
    snapshot?.length,
    "Number of addonBlockChange records"
  );
  for (let i of expectedExtras.keys()) {
    let actual = snapshot[i].extra;
    // Glean uses snake_case instead of camelCase.
    let { blocklistState, ...expected } = expectedExtras[i];
    expected.blocklist_state = blocklistState;
    Assert.deepEqual(expected, actual, `Expected addonBlockChange (${i})`);
  }
}

// Stage an update on the update server. The add-on must have been created
// with update_url set to SERVER_UPDATE_URL.
function setupAddonUpdate(addonId, addonVersion) {
  let updateXpi = AddonTestUtils.createTempWebExtensionFile({
    manifest: {
      version: addonVersion,
      browser_specific_settings: {
        gecko: { id: addonId, update_url: SERVER_UPDATE_URL },
      },
    },
  });
  let updateXpiPath = `/update-${addonId}-${addonVersion}.xpi`;
  server.registerFile(updateXpiPath, updateXpi);
  AddonTestUtils.registerJSON(server, SERVER_UPDATE_PATH, {
    addons: {
      [addonId]: {
        updates: [
          {
            version: addonVersion,
            update_link: `${SERVER_BASE_URL}${updateXpiPath}`,
          },
        ],
      },
    },
  });
}

async function tryAddonInstall(addonId, addonVersion) {
  let xpiFile = AddonTestUtils.createTempWebExtensionFile({
    manifest: {
      version: addonVersion,
      browser_specific_settings: {
        gecko: { id: addonId, update_url: SERVER_UPDATE_URL },
      },
    },
  });
  const install = await promiseInstallFile(xpiFile, true);
  // Passing true to promiseInstallFile means that the xpi may not be installed
  // if blocked by the blocklist. In that case, |install| may be null.
  return install?.addon;
}

async function createAddonInstall(addonId, addonVersion) {
  return await AddonManager.getInstallForFile(
    AddonTestUtils.createTempWebExtensionFile({
      manifest: {
        version: addonVersion,
        browser_specific_settings: {
          gecko: { id: addonId, update_url: SERVER_UPDATE_URL },
        },
      },
    })
  );
}

add_setup(async function setup() {
  if (!IS_ANDROID_BUILD) {
    // FOG needs a profile directory to put its data in.
    do_get_profile();
    // FOG needs to be initialized in order for data to flow.
    Services.fog.initializeFOG();
  }
  await TelemetryController.testSetup();

  // Disable the packaged record and attachment to make sure that the test
  // will not fall back to the packaged attachments.
  Downloader._RESOURCE_BASE_URL = "invalid://bogus";

  await promiseStartupManager();
});

add_task(async function install_update_not_blocked_is_no_events() {
  Services.fog.testResetFOG();
  // Install an add-on that is not blocked. Then update to the next version.
  let addon = await tryAddonInstall(EXT_ID, "0.1");

  // Version "1" not blocked yet, but will be in the next test task.
  setupAddonUpdate(EXT_ID, "1");
  let update = await AddonTestUtils.promiseFindAddonUpdates(addon);
  await promiseCompleteInstall(update.updateAvailable);
  addon = await AddonManager.getAddonByID(EXT_ID);
  equal(addon.version, "1", "Add-on was updated");

  // Repeat it for another test addon (used for softblocks assertions).
  let addon2 = await tryAddonInstall(EXT_ID2, "0.1");
  setupAddonUpdate(EXT_ID2, "1");
  let update2 = await AddonTestUtils.promiseFindAddonUpdates(addon2);
  await promiseCompleteInstall(update2.updateAvailable);
  addon2 = await AddonManager.getAddonByID(EXT_ID2);
  equal(addon2.version, "1", "Add-on was updated");

  assertGleanEventDetails([]);
});

add_task(async function blocklist_update_events() {
  Services.fog.testResetFOG();
  const EXT_HOURS_SINCE_INSTALL = 4321;
  const addon = await AddonManager.getAddonByID(EXT_ID);
  addon.__AddonInternal__.installDate =
    addon.installDate.getTime() - 3600000 * EXT_HOURS_SINCE_INSTALL;
  const addon2 = await AddonManager.getAddonByID(EXT_ID2);
  addon2.__AddonInternal__.installDate =
    addon2.installDate.getTime() - 3600000 * EXT_HOURS_SINCE_INSTALL;

  await AddonTestUtils.loadBlocklistRawData({
    extensionsMLBF: [
      { stash: { blocked: [`${EXT_ID}:1`], unblocked: [] }, stash_time: 123 },
      {
        stash: { blocked: [], softblocked: [`${EXT_ID2}:1`], unblocked: [] },
        stash_time: 123,
      },
      { stash: { blocked: [`${EXT_ID}:2`], unblocked: [] }, stash_time: 456 },
      {
        stash: { blocked: [], softblocked: [`${EXT_ID2}:2`], unblocked: [] },
        stash_time: 456,
      },
    ],
  });

  assertGleanEventDetails([
    {
      object: "blocklist_update",
      value: EXT_ID,
      blocklistState: "2", // Ci.nsIBlocklistService.STATE_BLOCKED
      addon_version: "1",
      signed_date: "0",
      hours_since: `${EXT_HOURS_SINCE_INSTALL}`,
      mlbf_last_time: "456",
      mlbf_generation: "0",
      mlbf_source: "unknown",
      mlbf_softblocks_generation: "0",
      mlbf_softblocks_source: "unknown",
    },
    {
      object: "blocklist_update",
      value: EXT_ID2,
      blocklistState: "1", // Ci.nsIBlocklistService.STATE_SOFTBLOCKED
      addon_version: "1",
      signed_date: "0",
      hours_since: `${EXT_HOURS_SINCE_INSTALL}`,
      mlbf_last_time: "456",
      mlbf_generation: "0",
      mlbf_source: "unknown",
      mlbf_softblocks_generation: "0",
      mlbf_softblocks_source: "unknown",
    },
  ]);
});

add_task(async function update_check_blocked_by_stash() {
  Services.fog.testResetFOG();

  setupAddonUpdate(EXT_ID, "2");
  let addon = await AddonManager.getAddonByID(EXT_ID);
  let update = await AddonTestUtils.promiseFindAddonUpdates(addon);
  // Blocks in stashes are immediately enforced by update checks.
  // Blocks stored in MLBFs are only enforced after the package is downloaded,
  // and that scenario is covered by update_check_blocked_by_stash elsewhere.
  equal(
    update.updateAvailable,
    false,
    "Update was blocked by stash (hard-block)"
  );

  setupAddonUpdate(EXT_ID2, "2");
  let addon2 = await AddonManager.getAddonByID(EXT_ID2);
  let update2 = await AddonTestUtils.promiseFindAddonUpdates(addon2);
  equal(
    update2.updateAvailable,
    false,
    "Update was blocked by stash (soft-block)"
  );

  assertGleanEventDetails([
    {
      object: "addon_update_check",
      value: EXT_ID,
      blocklistState: "2", // Ci.nsIBlocklistService.STATE_BLOCKED
      addon_version: "2",
      signed_date: "0",
      hours_since: "-1",
      mlbf_last_time: "456",
      mlbf_generation: "0",
      mlbf_source: "unknown",
      mlbf_softblocks_generation: "0",
      mlbf_softblocks_source: "unknown",
    },
    {
      object: "addon_update_check",
      value: EXT_ID2,
      blocklistState: "1", // Ci.nsIBlocklistService.STATE_SOFTBLOCKED
      addon_version: "2",
      signed_date: "0",
      hours_since: "-1",
      mlbf_last_time: "456",
      mlbf_generation: "0",
      mlbf_source: "unknown",
      mlbf_softblocks_generation: "0",
      mlbf_softblocks_source: "unknown",
    },
  ]);
});

// Any attempt to re-install a blocked add-on should trigger a telemetry
// event, even though the blocklistState did not change.
add_task(async function reinstall_blocked_addon() {
  Services.fog.testResetFOG();

  let blockedAddon = await AddonManager.getAddonByID(EXT_ID);
  equal(
    blockedAddon.blocklistState,
    Ci.nsIBlocklistService.STATE_BLOCKED,
    `Addon ${EXT_ID} was initially blocked`
  );

  let addon = await tryAddonInstall(EXT_ID, "2");
  ok(!addon, `Add-on ${EXT_ID} install should be blocked by a stash`);

  assertGleanEventDetails([
    {
      // Note: installs of existing versions are observed as "addon_install".
      // Only updates after update checks are tagged as "addon_update".
      object: "addon_install",
      value: EXT_ID,
      blocklistState: "2", // Ci.nsIBlocklistService.STATE_BLOCKED
      addon_version: "2",
      signed_date: "0",
      hours_since: "-1",
      mlbf_last_time: "456",
      mlbf_generation: "0",
      mlbf_source: "unknown",
      mlbf_softblocks_generation: "0",
      mlbf_softblocks_source: "unknown",
    },
  ]);
});

add_task(async function reinstall_softblocked_addon() {
  Services.fog.testResetFOG();

  // Similar test for softBlocked test addon.

  let softblockedAddon = await AddonManager.getAddonByID(EXT_ID2);
  equal(
    softblockedAddon.blocklistState,
    Ci.nsIBlocklistService.STATE_SOFTBLOCKED,
    `Addon ${EXT_ID2} was initially softblocked`
  );

  // SoftBlocked addons do not result in addon.appDisabled being true,
  // in a real install flow the install for softlblocked addons is
  // cancelled on the AddonManager side (right before notifying the
  // addon-install-failed topic).
  let install2 = await createAddonInstall(EXT_ID2, "2");
  equal(
    install2.error,
    AddonManager.ERROR_SOFT_BLOCKED,
    `AddonInstall for ${EXT_ID2} error is set to ERROR_SOFT_BLOCKED`
  );
  equal(
    install2.addon.blocklistState,
    Ci.nsIBlocklistService.STATE_SOFTBLOCKED,
    `AddonInstall addon for ${EXT_ID2} should have blocklistState STATE_SOFTBLOCKED`
  );

  assertGleanEventDetails([
    {
      object: "addon_install",
      value: EXT_ID2,
      blocklistState: "1", // Ci.nsIBlocklistService.STATE_SOFTBLOCKED
      addon_version: "2",
      signed_date: "0",
      hours_since: "-1",
      mlbf_last_time: "456",
      mlbf_generation: "0",
      mlbf_source: "unknown",
      mlbf_softblocks_generation: "0",
      mlbf_softblocks_source: "unknown",
    },
  ]);
});

// For comparison with the next test task (database_modified), verify that a
// regular restart without database modifications does not trigger events.
add_task(async function regular_restart_no_event() {
  Services.fog.testResetFOG();
  // Version different/higher than the 42.0 that was passed to createAppInfo at
  // the start of this test file to force a database rebuild.
  await promiseRestartManager("90.0");
  assertGleanEventDetails([]);

  await promiseRestartManager();
  assertGleanEventDetails([]);
});

add_task(async function database_modified() {
  Services.fog.testResetFOG();
  const EXT_HOURS_SINCE_INSTALL = 3;
  await promiseShutdownManager();

  // Modify the addon database:
  // - blocked -> not blocked + decrease installDate.
  // - softblocked -> not blocked + decrease installDate.
  let addonDB = await IOUtils.readJSON(gExtensionsJSON.path);

  let rawAddon = addonDB.addons[0];
  equal(rawAddon.id, EXT_ID, `Expected ${EXT_ID} entry in addonDB`);
  equal(rawAddon.blocklistState, 2, "Expected STATE_BLOCKED");
  rawAddon.blocklistState = 0; // STATE_NOT_BLOCKED
  rawAddon.installDate = Date.now() - 3600000 * EXT_HOURS_SINCE_INSTALL;

  let rawAddon2 = addonDB.addons[1];
  equal(rawAddon2.id, EXT_ID2, `Expected entry ${EXT_ID2} in addonDB`);
  equal(rawAddon2.blocklistState, 1, "Expected STATE_SOFTBLOCKED");
  rawAddon2.blocklistState = 0; // STATE_NOT_BLOCKED
  rawAddon2.installDate = Date.now() - 3600000 * EXT_HOURS_SINCE_INSTALL;

  await IOUtils.writeJSON(gExtensionsJSON.path, addonDB);

  // Bump version to force database rebuild.
  await promiseStartupManager("91.0");
  // Shut down because the database reconcilation blocks shutdown, and we want
  // to be certain that the process has finished before checking the events.
  await promiseShutdownManager();
  assertGleanEventDetails([
    {
      object: "addon_db_modified",
      value: EXT_ID2,
      blocklistState: "1", // Ci.nsIBlocklistService.STATE_SOFTBLOCKED
      addon_version: "1",
      signed_date: "0",
      hours_since: `${EXT_HOURS_SINCE_INSTALL}`,
      mlbf_last_time: "456",
      mlbf_generation: "0",
      mlbf_source: "unknown",
      mlbf_softblocks_generation: "0",
      mlbf_softblocks_source: "unknown",
    },
    {
      object: "addon_db_modified",
      value: EXT_ID,
      blocklistState: "2", // Ci.nsIBlocklistService.STATE_BLOCKED
      addon_version: "1",
      signed_date: "0",
      hours_since: `${EXT_HOURS_SINCE_INSTALL}`,
      mlbf_last_time: "456",
      mlbf_generation: "0",
      mlbf_source: "unknown",
      mlbf_softblocks_generation: "0",
      mlbf_softblocks_source: "unknown",
    },
  ]);

  Services.fog.testResetFOG();
  await promiseStartupManager();
  assertGleanEventDetails([]);
});

add_task(async function install_replaces_blocked_addon() {
  Services.fog.testResetFOG();

  let addon = await tryAddonInstall(EXT_ID, "3");
  ok(addon, `${EXT_ID} update supersedes blocked add-on`);

  assertGleanEventDetails([
    {
      object: "addon_install",
      value: EXT_ID,
      blocklistState: "0", // Ci.nsIBlocklistService.STATE_NOT_BLOCKED
      addon_version: "3",
      signed_date: "0",
      hours_since: "-1",
      mlbf_last_time: "456",
      mlbf_generation: "0",
      mlbf_source: "unknown",
      mlbf_softblocks_generation: "0",
      mlbf_softblocks_source: "unknown",
    },
  ]);
});

add_task(async function install_replaces_softblocked_addon() {
  Services.fog.testResetFOG();

  let addon2 = await tryAddonInstall(EXT_ID2, "3");
  ok(addon2, `${EXT_ID2} update supersedes blocked add-on`);

  assertGleanEventDetails([
    {
      object: "addon_install",
      value: EXT_ID2,
      blocklistState: "0", // Ci.nsIBlocklistService.STATE_NOT_BLOCKED
      addon_version: "3",
      signed_date: "0",
      hours_since: "-1",
      mlbf_last_time: "456",
      mlbf_generation: "0",
      mlbf_source: "unknown",
      mlbf_softblocks_generation: "0",
      mlbf_softblocks_source: "unknown",
    },
  ]);
});

add_task(async function install_blocked_by_mlbf() {
  Services.fog.testResetFOG();

  await ExtensionBlocklistMLBF._client.db.saveAttachment(
    ExtensionBlocklistMLBF.RS_ATTACHMENT_ID,
    { record: MLBF_RECORD, blob: await load_mlbf_record_as_blob() }
  );
  await AddonTestUtils.loadBlocklistRawData({
    extensionsMLBF: [MLBF_RECORD],
  });

  AddonTestUtils.certSignatureDate = EXT_BLOCKED_SIGN_TIME;
  let addon = await tryAddonInstall(EXT_BLOCKED_ID, EXT_BLOCKED_VERSION);
  AddonTestUtils.certSignatureDate = null;

  ok(!addon, `Add-on ${EXT_ID} install should be blocked by the MLBF`);

  assertGleanEventDetails([
    {
      object: "addon_install",
      value: EXT_BLOCKED_ID,
      blocklistState: "2", // Ci.nsIBlocklistService.STATE_BLOCKED
      addon_version: EXT_BLOCKED_VERSION,
      signed_date: `${EXT_BLOCKED_SIGN_TIME}`,
      hours_since: "-1",
      // When there is no stash at all, the MLBF's generation_time is used.
      mlbf_last_time: `${MLBF_RECORD.generation_time}`,
      mlbf_generation: `${MLBF_RECORD.generation_time}`,
      mlbf_source: "cache_match",
      mlbf_softblocks_generation: 0,
      mlbf_softblocks_source: "unknown",
    },
  ]);
});

add_task(async function install_softblocked_by_mlbf() {
  Services.fog.testResetFOG();

  await ExtensionBlocklistMLBF._client.db.saveAttachment(
    ExtensionBlocklistMLBF.RS_SOFTBLOCKS_ATTACHMENT_ID,
    {
      record: MLBF_SOFTBLOCK_RECORD,
      blob: await load_mlbf_record_as_blob("mlbf-softblocked1.bin"),
    }
  );

  await AddonTestUtils.loadBlocklistRawData({
    extensionsMLBF: [MLBF_RECORD, MLBF_SOFTBLOCK_RECORD],
  });

  AddonTestUtils.certSignatureDate = EXT_SOFTBLOCKED_SIGN_TIME;
  let install2 = await createAddonInstall(
    EXT_SOFTBLOCKED_ID,
    EXT_SOFTBLOCKED_VERSION
  );
  AddonTestUtils.certSignatureDate = null;

  equal(
    install2.error,
    AddonManager.ERROR_SOFT_BLOCKED,
    `AddonInstall for ${EXT_ID2} error is set to ERROR_SOFT_BLOCKED`
  );
  equal(
    install2.addon.blocklistState,
    Ci.nsIBlocklistService.STATE_SOFTBLOCKED,
    `AddonInstall addon for ${EXT_ID2} should be soft-blocked by the MLBF`
  );

  assertGleanEventDetails([
    {
      object: "addon_install",
      value: EXT_SOFTBLOCKED_ID,
      blocklistState: "1", // Ci.nsIBlocklistService.STATE_SOFTBLOCKED
      addon_version: EXT_SOFTBLOCKED_VERSION,
      signed_date: `${EXT_SOFTBLOCKED_SIGN_TIME}`,
      hours_since: "-1",
      // When there is no stash at all, the MLBF's generation_time is used.
      mlbf_last_time: `${MLBF_RECORD.generation_time}`,
      mlbf_generation: `${MLBF_RECORD.generation_time}`,
      mlbf_source: "cache_match",
      mlbf_softblocks_generation: `${MLBF_SOFTBLOCK_RECORD.generation_time}`,
      mlbf_softblocks_source: "cache_match",
    },
  ]);
});

// A limitation of the MLBF-based blocklist is that it needs the add-on package
// in order to check its signature date.
// This part of the test verifies that installation of the add-on is blocked,
// despite the update check tentatively accepting the package.
// See https://bugzilla.mozilla.org/show_bug.cgi?id=1649896 for rationale.
add_task(async function update_check_blocked_by_mlbf() {
  Services.fog.testResetFOG();

  // Install a version that we can update, lower than the blocked version.
  let addon = await tryAddonInstall(EXT_BLOCKED_ID, "0.1");
  setupAddonUpdate(EXT_BLOCKED_ID, EXT_BLOCKED_VERSION);
  AddonTestUtils.certSignatureDate = EXT_BLOCKED_SIGN_TIME;
  let update = await AddonTestUtils.promiseFindAddonUpdates(addon);
  ok(
    update.updateAvailable,
    `Update for ${EXT_BLOCKED_ID}:0.1 addon was not blocked by stash`
  );
  await promiseCompleteInstall(update.updateAvailable);
  AddonTestUtils.certSignatureDate = null;

  addon = await AddonManager.getAddonByID(EXT_BLOCKED_ID);
  equal(addon.version, EXT_BLOCKED_VERSION, "Add-on was updated");
  equal(
    addon.blocklistState,
    Ci.nsIBlocklistService.STATE_BLOCKED,
    "Add-on is blocked"
  );
  equal(addon.appDisabled, true, "Add-on was appDisabled because of the block");

  assertGleanEventDetails([
    {
      object: "addon_update",
      value: EXT_BLOCKED_ID,
      blocklistState: "2", // Ci.nsIBlocklistService.STATE_BLOCKED
      addon_version: EXT_BLOCKED_VERSION,
      signed_date: `${EXT_BLOCKED_SIGN_TIME}`,
      hours_since: "-1",
      mlbf_last_time: `${MLBF_RECORD.generation_time}`,
      mlbf_generation: `${MLBF_RECORD.generation_time}`,
      mlbf_source: "cache_match",
      mlbf_softblocks_generation: `${MLBF_SOFTBLOCK_RECORD.generation_time}`,
      mlbf_softblocks_source: "cache_match",
    },
  ]);
});

add_task(async function update_check_softblocked_by_mlbf() {
  Services.fog.testResetFOG();

  // Install a version that we can update, lower than the soft-blocked version.
  let addon = await tryAddonInstall(EXT_SOFTBLOCKED_ID, "0.1");
  setupAddonUpdate(EXT_SOFTBLOCKED_ID, EXT_SOFTBLOCKED_VERSION);
  AddonTestUtils.certSignatureDate = EXT_SOFTBLOCKED_SIGN_TIME;
  let update = await AddonTestUtils.promiseFindAddonUpdates(addon);
  ok(
    update.updateAvailable,
    `Update for ${EXT_SOFTBLOCKED_ID}:0.1 addon was not blocked by stash`
  );
  await promiseCompleteInstall(update.updateAvailable);
  AddonTestUtils.certSignatureDate = null;

  addon = await AddonManager.getAddonByID(EXT_SOFTBLOCKED_ID);
  equal(addon.version, EXT_SOFTBLOCKED_VERSION, "Add-on was updated");
  equal(
    addon.blocklistState,
    Ci.nsIBlocklistService.STATE_SOFTBLOCKED,
    "Add-on is soft-blocked"
  );
  equal(
    addon.softDisabled,
    true,
    "Add-on was softDisabled because of the block"
  );

  assertGleanEventDetails([
    {
      object: "addon_update",
      value: EXT_SOFTBLOCKED_ID,
      blocklistState: "1", // Ci.nsIBlocklistService.STATE_SOFTBLOCKED
      addon_version: EXT_SOFTBLOCKED_VERSION,
      signed_date: `${EXT_SOFTBLOCKED_SIGN_TIME}`,
      hours_since: "-1",
      mlbf_last_time: `${MLBF_RECORD.generation_time}`,
      mlbf_generation: `${MLBF_RECORD.generation_time}`,
      mlbf_source: "cache_match",
      mlbf_softblocks_generation: `${MLBF_SOFTBLOCK_RECORD.generation_time}`,
      mlbf_softblocks_source: "cache_match",
    },
  ]);
});

add_task(async function update_blocked_to_unblocked() {
  Services.fog.testResetFOG();

  // was blocked in update_check_blocked_by_mlbf.
  let blockedAddon = await AddonManager.getAddonByID(EXT_BLOCKED_ID);
  equal(
    blockedAddon.blocklistState,
    Ci.nsIBlocklistService.STATE_BLOCKED,
    `Expected ${EXT_BLOCKED_ID} addon to have the expected initial block state`
  );
  equal(
    blockedAddon.appDisabled,
    true,
    "hard-blocked Add-on should be initially appDisabled"
  );

  // Version higher than the last expected blocked version
  setupAddonUpdate(EXT_BLOCKED_ID, "3");
  AddonTestUtils.certSignatureDate = EXT_BLOCKED_SIGN_TIME;
  let update = await AddonTestUtils.promiseFindAddonUpdates(blockedAddon);
  ok(update.updateAvailable, "Found an update");

  await promiseCompleteInstall(update.updateAvailable);
  AddonTestUtils.certSignatureDate = null;

  let addon = await AddonManager.getAddonByID(EXT_BLOCKED_ID);
  equal(
    addon.appDisabled,
    false,
    "hard-blocked Add-on was re-enabled after unblock"
  );

  assertGleanEventDetails([
    {
      object: "addon_update",
      value: EXT_BLOCKED_ID,
      blocklistState: "0", // Ci.nsIBlocklistService.STATE_NOT_BLOCKED
      addon_version: "3",
      signed_date: `${EXT_BLOCKED_SIGN_TIME}`,
      hours_since: "-1",
      mlbf_last_time: `${MLBF_RECORD.generation_time}`,
      mlbf_generation: `${MLBF_RECORD.generation_time}`,
      mlbf_source: "cache_match",
      mlbf_softblocks_generation: `${MLBF_SOFTBLOCK_RECORD.generation_time}`,
      mlbf_softblocks_source: "cache_match",
    },
  ]);
});

add_task(async function update_softblocked_to_unblocked() {
  Services.fog.testResetFOG();

  // was softblocked in update_check_softblocked_by_mlbf.
  let softblockedAddon = await AddonManager.getAddonByID(EXT_SOFTBLOCKED_ID);
  equal(
    softblockedAddon.blocklistState,
    Ci.nsIBlocklistService.STATE_SOFTBLOCKED,
    `Expected ${EXT_SOFTBLOCKED_ID} addon to have the expected initial block state`
  );
  equal(
    softblockedAddon.softDisabled,
    true,
    "soft-blocked Add-on should be initially softDisabled"
  );

  // Version higher than the last expected soft-blocked version
  setupAddonUpdate(EXT_SOFTBLOCKED_ID, "3");
  AddonTestUtils.certSignatureDate = EXT_SOFTBLOCKED_SIGN_TIME;
  let update = await AddonTestUtils.promiseFindAddonUpdates(softblockedAddon);
  ok(update.updateAvailable, "Found an update");

  await promiseCompleteInstall(update.updateAvailable);
  AddonTestUtils.certSignatureDate = null;

  let addon = await AddonManager.getAddonByID(EXT_SOFTBLOCKED_ID);
  equal(
    addon.softDisabled,
    false,
    "soft-blocked Add-on was re-enabled after unblock"
  );

  assertGleanEventDetails([
    {
      object: "addon_update",
      value: EXT_SOFTBLOCKED_ID,
      blocklistState: "0", // Ci.nsIBlocklistService.STATE_NOT_BLOCKED
      addon_version: "3",
      signed_date: `${EXT_SOFTBLOCKED_SIGN_TIME}`,
      hours_since: "-1",
      mlbf_last_time: `${MLBF_RECORD.generation_time}`,
      mlbf_generation: `${MLBF_RECORD.generation_time}`,
      mlbf_source: "cache_match",
      mlbf_softblocks_generation: `${MLBF_SOFTBLOCK_RECORD.generation_time}`,
      mlbf_softblocks_source: "cache_match",
    },
  ]);
});

add_task(async function update_softblocked_to_hardblocked() {
  // Re-initialize AMTelemetry to make sure it is listening to the AOM
  // addon events onEnabled.
  AMTelemetry.telemetrySetupDone = false;
  AMTelemetry.onStartup();

  Services.fog.testResetFOG();

  await AddonTestUtils.loadBlocklistRawData({
    // EXT_BLOCKED_ID:
    // - version 0.2: to be soft-blocked (through soft-blocks stash record)
    // - version 1: to be hard-blocked (through hard-blocks mlbf data)
    extensionsMLBF: [
      {
        stash: {
          softblocked: [`${EXT_BLOCKED_ID}:0.2`],
          blocked: [],
          unblocked: [],
        },
        stash_time: MLBF_SOFTBLOCK_RECORD.generation_time,
      },
      MLBF_RECORD,
      MLBF_SOFTBLOCK_RECORD,
    ],
  });

  // Re-install the non-blocked test addon version 0.2.
  let addon = await tryAddonInstall(EXT_BLOCKED_ID, "0.2");

  equal(addon.version, "0.2", `Expect ${addon.id} version 0.2 to be installed`);
  equal(
    addon.blocklistState,
    Ci.nsIBlocklistService.STATE_SOFTBLOCKED,
    `Expected ${addon.id} version 0.2 addon to be soft-blocked`
  );
  equal(
    addon.softDisabled,
    true,
    `${addon.id} version 0.2 should be softDisabled`
  );

  await addon.enable();

  equal(
    addon.softDisabled,
    false,
    `${addon.id} version 0.2 to not be softDisabled after being explicitly re-enabled`
  );

  Assert.deepEqual(
    Glean.addonsManager.manage.testGetValue().map(evt => {
      delete evt.timestamp;
      return evt;
    }),
    [
      {
        category: "addons_manager",
        name: "manage",
        extra: {
          method: "enable",
          addon_id: addon.id,
          blocklist_state: "1", // STATE_SOFTBLOCKED
          addon_type: "extension",
        },
      },
    ],
    "Expect addonsManager manage enable event to include the expected blocklistState"
  );

  // Update to the hard-blocked version 1.
  setupAddonUpdate(EXT_BLOCKED_ID, "1");
  AddonTestUtils.certSignatureDate = EXT_BLOCKED_SIGN_TIME;
  let update = await AddonTestUtils.promiseFindAddonUpdates(addon);
  ok(
    update.updateAvailable,
    `Update for ${addon.id}:1 addon was not blocked by stash`
  );
  await promiseCompleteInstall(update.updateAvailable);
  AddonTestUtils.certSignatureDate = null;

  addon = await AddonManager.getAddonByID(EXT_BLOCKED_ID);
  equal(addon.version, "1", `Expect ${addon.id} version 1 to be installed`);
  equal(
    addon.blocklistState,
    Ci.nsIBlocklistService.STATE_BLOCKED,
    `Expect ${addon.id} version 1 to be hard-blocked`
  );
  equal(
    addon.softDisabled,
    false,
    `Expect ${addon.id} version 1 to not be softDisabled`
  );
  equal(
    addon.appDisabled,
    true,
    `Expect ${addon.id} version 1 to not be appDisabled`
  );

  assertGleanEventDetails([
    {
      object: "addon_install",
      value: EXT_BLOCKED_ID,
      blocklistState: "1", // Ci.nsIBlocklistService.STATE_SOFTBLOCKED
      addon_version: "0.2",
      signed_date: "0",
      hours_since: "-1",
      mlbf_last_time: `${MLBF_SOFTBLOCK_RECORD.generation_time}`,
      mlbf_generation: `${MLBF_RECORD.generation_time}`,
      mlbf_source: "cache_match",
      mlbf_softblocks_generation: `${MLBF_SOFTBLOCK_RECORD.generation_time}`,
      mlbf_softblocks_source: "cache_match",
    },
    {
      object: "addon_update",
      value: EXT_BLOCKED_ID,
      blocklistState: "2", // Ci.nsIBlocklistService.STATE_BLOCKED
      addon_version: "1",
      signed_date: `${EXT_BLOCKED_SIGN_TIME}`,
      hours_since: "-1",
      mlbf_last_time: `${MLBF_SOFTBLOCK_RECORD.generation_time}`,
      mlbf_generation: `${MLBF_RECORD.generation_time}`,
      mlbf_source: "cache_match",
      mlbf_softblocks_generation: `${MLBF_SOFTBLOCK_RECORD.generation_time}`,
      mlbf_softblocks_source: "cache_match",
    },
  ]);
});

add_task(async function softblocked_to_hardblocked() {
  Services.fog.testResetFOG();

  // Re-install the soft-blocked addon version.
  let addon = await tryAddonInstall(EXT_SOFTBLOCKED_ID, "0.1");
  setupAddonUpdate(EXT_SOFTBLOCKED_ID, EXT_SOFTBLOCKED_VERSION);
  AddonTestUtils.certSignatureDate = EXT_SOFTBLOCKED_SIGN_TIME;
  let update = await AddonTestUtils.promiseFindAddonUpdates(addon);
  ok(
    update.updateAvailable,
    `Update for ${EXT_SOFTBLOCKED_ID}:0.1 addon was not blocked by stash`
  );
  await promiseCompleteInstall(update.updateAvailable);
  AddonTestUtils.certSignatureDate = null;

  addon = await AddonManager.getAddonByID(EXT_SOFTBLOCKED_ID);

  equal(
    addon.version,
    EXT_SOFTBLOCKED_VERSION,
    `Expect ${EXT_SOFTBLOCKED_ID} version ${EXT_SOFTBLOCKED_VERSION} to be installed`
  );
  equal(
    addon.blocklistState,
    Ci.nsIBlocklistService.STATE_SOFTBLOCKED,
    `Expect ${EXT_SOFTBLOCKED_ID} addon to have the expected initial block state`
  );
  equal(
    addon.softDisabled,
    true,
    "soft-blocked Add-on should be initially softDisabled"
  );

  await addon.enable();

  equal(
    addon.softDisabled,
    false,
    "soft-blocked Add-on should not be softDisabled after being explicitly re-enabled"
  );

  await AddonTestUtils.loadBlocklistRawData({
    extensionsMLBF: [
      // Addon blocklistState to transition from soft-blocked to hard-blocked
      // through a stash record more recent than the soft-blocks mlbf generation_time.
      {
        stash: {
          blocked: [`${EXT_SOFTBLOCKED_ID}:${EXT_SOFTBLOCKED_VERSION}`],
          unblocked: [],
        },
        stash_time: MLBF_SOFTBLOCK_RECORD.generation_time,
      },
      MLBF_RECORD,
      MLBF_SOFTBLOCK_RECORD,
    ],
  });

  equal(
    addon.blocklistState,
    Ci.nsIBlocklistService.STATE_BLOCKED,
    `Expected ${EXT_SOFTBLOCKED_ID} addon to have the expected hard-blocked state`
  );
  equal(addon.softDisabled, false, "Add-on should not be softDisabled");
  equal(addon.appDisabled, true, "Add-on should be appDisabled");

  assertGleanEventDetails([
    {
      object: "addon_update",
      value: EXT_SOFTBLOCKED_ID,
      blocklistState: "1", // Ci.nsIBlocklistService.STATE_SOFTBLOCKED
      addon_version: EXT_SOFTBLOCKED_VERSION,
      signed_date: `${EXT_SOFTBLOCKED_SIGN_TIME}`,
      hours_since: "-1",
      mlbf_last_time: `${MLBF_SOFTBLOCK_RECORD.generation_time}`,
      mlbf_generation: `${MLBF_RECORD.generation_time}`,
      mlbf_source: "cache_match",
      mlbf_softblocks_generation: `${MLBF_SOFTBLOCK_RECORD.generation_time}`,
      mlbf_softblocks_source: "cache_match",
    },
    {
      object: "blocklist_update",
      value: EXT_SOFTBLOCKED_ID,
      blocklistState: "2", // Ci.nsIBlocklistService.STATE_BLOCKED
      addon_version: EXT_SOFTBLOCKED_VERSION,
      signed_date: `${EXT_SOFTBLOCKED_SIGN_TIME}`,
      hours_since: "0",
      mlbf_last_time: `${MLBF_SOFTBLOCK_RECORD.generation_time}`,
      mlbf_generation: `${MLBF_RECORD.generation_time}`,
      mlbf_source: "cache_match",
      mlbf_softblocks_generation: `${MLBF_SOFTBLOCK_RECORD.generation_time}`,
      mlbf_softblocks_source: "cache_match",
    },
  ]);
});
