/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  ExtensionStorageIDB: "resource://gre/modules/ExtensionStorageIDB.sys.mjs",
  ExtensionStorageLocalIDB:
    "resource://gre/modules/ExtensionStorageIDB.sys.mjs",
  Sqlite: "resource://gre/modules/Sqlite.sys.mjs",
  sinon: "resource://testing-common/Sinon.sys.mjs",
});

AddonTestUtils.init(this);
AddonTestUtils.overrideCertDB();
AddonTestUtils.createAppInfo("xpcshell@tests.mozilla.org", "XPCShell", "1");

// The userContextID reserved for the extension storage.
const WEBEXT_STORAGE_USER_CONTEXT_ID = -1 >>> 0;

add_setup(async () => {
  Services.fog.testResetFOG();
  await AddonTestUtils.promiseStartupManager();
});

add_task(async function test_idb_autoreset_default() {
  // TODO(Bug 1992973): change the expected default behavior as part of enabling auto-reset
  // corrupted storage.local IndexedDB databases on all channels.
  Assert.equal(
    ExtensionStorageLocalIDB.disabledAutoResetOnCorrupted,
    true,
    "Expect auto-reset on corrupted IDB storage to be disabled by default"
  );
});

// This test the same kind of unexpected corruption of the underlying
// idb database tracked by Bug 1979997.
add_task(async function test_idb_reset_on_missing_object_store() {
  // Clear any previously collected telemetry.
  Services.fog.testResetFOG();

  const id = "test-corrupted-idb@test-ext";

  // NOTE: this test extension is only used to derive the storagePrincipal,
  // it doesn't require the "storage" permission nor use the storage.local
  // API on purpose (so that we can directly control when the IndexedDB
  // database gets open and closed and be able to tamper its underlying
  // sqlite3 data).
  let extension = ExtensionTestUtils.loadExtension({
    useAddonManager: "permanent",
    manifest: {
      browser_specific_settings: {
        gecko: { id },
      },
    },
  });

  await extension.startup();

  const { uuid } = extension;
  const storagePrincipal = ExtensionStorageIDB.getStoragePrincipal(
    extension.extension
  );

  // Page sure the storage directory is created and its sqlite3
  // file initialized.
  let idbConn = await ExtensionStorageIDB.open(storagePrincipal);
  await idbConn.close();

  const baseDataPath = PathUtils.join(
    PathUtils.profileDir,
    "storage",
    "default",
    `moz-extension+++${uuid}^userContextId=${WEBEXT_STORAGE_USER_CONTEXT_ID}`,
    "idb"
  );

  let sqliteFilePath = (await IOUtils.getChildren(baseDataPath)).find(
    filePath => filePath.endsWith(".sqlite")
  );
  info(
    `Mock corrupted IndexedDB by tampering sqlite3 file at ${sqliteFilePath}`
  );
  let db = await Sqlite.openConnection({ path: sqliteFilePath });
  let rows = await db.execute("SELECT * FROM object_store;");
  // Sanity check.
  Assert.equal(
    rows[0]?.getResultByName("name"),
    "storage-local-data",
    "Expected object_store entry found in the IndexedDB Sqlite3 data"
  );
  info(
    "Force delete the storage-local-data object_store from the sqlite3 data"
  );
  await db.execute("DELETE FROM object_store;");
  rows = await db.execute("SELECT * FROM object_store;");
  // Sanity check.
  Assert.deepEqual(
    rows,
    [],
    "Force deleted object_store should not be found in the IndexedDB sqlite3 data"
  );
  await db.close();

  info(
    "Verify NotFoundError expected to be raised on corrupted IndexedDB sqlite3 data"
  );
  // Disable automatically drop corrupted database.
  Services.prefs.setBoolPref(
    "extensions.webextensions.keepStorageOnCorrupted.storageLocal",
    true
  );

  idbConn = await ExtensionStorageIDB.open(storagePrincipal);
  await Assert.rejects(
    idbConn.isEmpty(),
    err => {
      return (
        err.name === "NotFoundError" &&
        err.message.includes(
          "'storage-local-data' is not a known object store name"
        )
      );
    },
    "ExtensionStorageIDB isEmpty call throws the expected NotFoundError"
  );
  await idbConn.close();

  info(
    "Verify storageLocalCorruptedReset collected also when corrupted db are not automatically dropped"
  );
  const gleanEventsWithoutResetDB =
    Glean.extensionsData.storageLocalCorruptedReset
      .testGetValue()
      ?.map(event => event.extra);
  Assert.deepEqual(
    gleanEventsWithoutResetDB ?? [],
    [
      {
        addon_id: extension.id,
        reason: "ObjectStoreNotFound",
        after_reset: "false",
        reset_disabled: "true",
      },
    ],
    "Got the expected telemetry event recorded when the NotFoundError is being hit"
  );
  Services.fog.testResetFOG();

  // Enable automatically drop corrupted database.
  Services.prefs.setBoolPref(
    "extensions.webextensions.keepStorageOnCorrupted.storageLocal",
    false
  );

  info("Verify corrupted IndexedDB sqlite3 Glean telemetry when reset fails");
  const sandbox = sinon.createSandbox();
  sandbox
    .stub(ExtensionStorageLocalIDB, "resetForPrincipal")
    .callsFake(() =>
      Promise.reject(
        new DOMException("error message", "MockResetFailureErrorName")
      )
    );
  await Assert.rejects(
    ExtensionStorageIDB.open(storagePrincipal),
    err => {
      return (
        err.name === "ExtensionError" &&
        err.message.includes("Corrupted storage.local backend")
      );
    },
    "ExtensionStorageIDB open to throws the expected ExtensionError"
  );
  sandbox.restore();
  const gleanEventsOnResetFailure =
    Glean.extensionsData.storageLocalCorruptedReset
      .testGetValue()
      ?.map(event => event.extra);
  Assert.deepEqual(
    gleanEventsOnResetFailure ?? [],
    [
      {
        addon_id: extension.id,
        reason: "ObjectStoreNotFound",
        after_reset: "false",
        reset_disabled: "false",
      },
      {
        addon_id: extension.id,
        reason: "ObjectStoreNotFound",
        after_reset: "true",
        reset_disabled: "false",
        reset_error_name: "MockResetFailureErrorName",
      },
    ],
    "Got the expected telemetry event recorded when the NotFoundError is being hit"
  );
  Services.fog.testResetFOG();

  info(
    "Verify corrupted IndexedDB sqlite3 data dropped and recreated by default when reset succeeded"
  );
  idbConn = await ExtensionStorageIDB.open(storagePrincipal);
  Assert.equal(
    await idbConn.isEmpty(),
    true,
    "ExtensionStorageIDB isEmpty call resolved as expected"
  );
  await idbConn.close();

  const gleanEvents = Glean.extensionsData.storageLocalCorruptedReset
    .testGetValue()
    ?.map(event => event.extra);
  Assert.deepEqual(
    gleanEvents ?? [],
    [
      {
        addon_id: extension.id,
        reason: "ObjectStoreNotFound",
        after_reset: "false",
        reset_disabled: "false",
      },
    ],
    "Got the expected telemetry event recorded when the NotFoundError is being hit"
  );

  await extension.unload();
});

add_task(async function test_corrupted_idb_key() {
  // Clear any previously collected telemetry.
  Services.fog.testResetFOG();

  const id = "test-corrupted-idb-key@test-ext";

  let extension = ExtensionTestUtils.loadExtension({
    useAddonManager: "permanent",
    manifest: {
      permissions: ["storage", "unlimitedStorage"],
      browser_specific_settings: {
        gecko: { id },
      },
    },
    background() {
      browser.test.onMessage.addListener(async msg => {
        let res = {};
        switch (msg) {
          case "write-data":
            await browser.storage.local
              .set({
                "test-key": "test-value",
                // The value set on this key should be big enough to
                // be stored as a separate file outside of the sqlite
                // database, that file will be purposely removed by
                // this test to simulate the database corruption issue
                // that some users have been hitting in their Firefox
                // profile.
                "test-to-be-corrupted-key": new Array(100000).fill("x"),
              })
              .catch(err => {
                res.error = `${err}`;
              });
            break;
          case "read-data":
            await browser.storage.local.get(null).catch(err => {
              res.error = `${err}`;
            });
            break;
          case "clear-data":
            await browser.storage.local.clear().catch(err => {
              res.error = `${err}`;
            });
            break;
          default:
            browser.test.fail(`Got unexpected test message: ${msg}`);
        }
        browser.test.sendMessage(`${msg}:done`, res);
      });
    },
  });

  async function assertUnexpectedErrorOnTestMessage(
    testMessage,
    assertMessage
  ) {
    // Prevent test failures to be hit on Android builds when the extensions
    // are configured to run in the parent process by explicitly allowing the
    // uncaught rejection expected to be hit internally by the Promise-based
    // IndexedDB wrapper defined in IndexedDB.sys.mjs when the unexpected
    // corrupted storage scenario recreated in this test is expected to
    // be triggering them as side-effects.
    if (WebExtensionPolicy.isExtensionProcess) {
      PromiseTestUtils.expectUncaughtRejection(rejectInfo => {
        const EXPECTED_IN_REJECT_STACK =
          "transaction.onerror@resource://gre/modules/IndexedDB.sys.mjs";
        // We expect this kind of rejection to be hit internally by the
        // Promise-based IndexedDB wrapper defined in IndexedDB.sys.mjs.
        return (
          rejectInfo.message == "null" &&
          rejectInfo.stack.includes(EXPECTED_IN_REJECT_STACK)
        );
      });
    }
    extension.sendMessage(testMessage);
    let result = await extension.awaitMessage(`${testMessage}:done`);
    Assert.equal(
      result.error,
      "Error: An unexpected error occurred",
      assertMessage
    );
  }

  await extension.startup();
  const { uuid } = extension;

  extension.sendMessage("write-data");
  let writeResult = await extension.awaitMessage("write-data:done");
  Assert.equal(
    writeResult.error,
    null,
    "Expect no error to be hit while writing data into storage.local"
  );

  const { AddonManager } = ChromeUtils.importESModule(
    "resource://gre/modules/AddonManager.sys.mjs"
  );

  let addon = await AddonManager.getAddonByID(id);
  await addon.disable();

  const baseDataPath = PathUtils.join(
    PathUtils.profileDir,
    "storage",
    "default",
    `moz-extension+++${uuid}^userContextId=${WEBEXT_STORAGE_USER_CONTEXT_ID}`,
    "idb"
  );

  let sqliteFilePath = (await IOUtils.getChildren(baseDataPath)).find(
    filePath => filePath.endsWith(".sqlite")
  );

  let db = await Sqlite.openConnection({ path: sqliteFilePath });
  let rows = await db.execute(
    "SELECT * FROM object_data WHERE file_ids IS NOT NULL;"
  );
  // Sanity check.
  Assert.equal(
    rows[0]?.getResultByName("file_ids"),
    ".1",
    "object_data entry with associated file_ids expected to be found"
  );
  await db.close();

  let idbDataFileBasePath = (await IOUtils.getChildren(baseDataPath)).find(
    filePath => filePath.endsWith(".files")
  );
  await IOUtils.remove(PathUtils.join(idbDataFileBasePath, "1"), {
    ignoreAbsent: false,
  });

  await addon.enable();
  await extension.awaitStartup();

  // Confirm that the database is corrupted and the extension
  // is unable to retrieve the data
  info(
    "Verify that reading and writing on the corrupted storage.local key fails as expected"
  );
  await assertUnexpectedErrorOnTestMessage(
    "read-data",
    "Expect a rejection to be hit while retrieving data from the corrupted storage.local key"
  );
  await assertUnexpectedErrorOnTestMessage(
    "write-data",
    "Expect a rejection to be hit while writing data into the corrupted storage.local key"
  );

  info(
    "Verify clearing the storage.local corrupted key fails as expected if auto-reset is disabled"
  );
  // Disable automatically drop corrupted database.
  Services.prefs.setBoolPref(
    "extensions.webextensions.keepStorageOnCorrupted.storageLocal",
    true
  );
  await assertUnexpectedErrorOnTestMessage(
    "clear-data",
    "Expect a rejection to be hit while clearing storage.local with corrupted key if auto-reset is disabled"
  );

  info(
    "Verify clearing the storage.local corrupted key succeeded as expected if auto-reset is enabled"
  );
  // Enable automatically drop corrupted database.
  Services.prefs.setBoolPref(
    "extensions.webextensions.keepStorageOnCorrupted.storageLocal",
    false
  );
  // Call storage.local.clear and confirm that it doesn't hit a rejection
  // due to the underlying database corruption and then verify that
  // storage.local.get and storage.local.set do not hit a rejection anymore.
  extension.sendMessage("clear-data");
  let clearResult = await extension.awaitMessage("clear-data:done");
  Assert.equal(
    clearResult.error,
    null,
    "Expect no rejection to be hit while clearing the entire corrupted storage.local data"
  );

  extension.sendMessage("write-data");
  Assert.deepEqual(
    await extension.awaitMessage("write-data:done"),
    {},
    "Expect no rejection while writing storage.local data after successful storage.local.clear"
  );

  extension.sendMessage("read-data");
  Assert.deepEqual(
    await extension.awaitMessage("read-data:done"),
    {},
    "Expect no rejection while reading storage.local data after successful storage.local.clear"
  );

  await Services.fog.testFlushAllChildren();
  const gleanEvents = Glean.extensionsData.storageLocalCorruptedReset
    .testGetValue()
    ?.map(event => event.extra);
  Assert.deepEqual(
    gleanEvents ?? [],
    [
      {
        addon_id: extension.id,
        reason: "RejectedClear:UnknownError",
      },
    ],
    "Got the expected telemetry event recorded when the UnknownError is being hit by storage.local.clear API calls"
  );

  await extension.unload();
});
