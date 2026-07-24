/* -*- Mode: indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set sts=2 sw=2 et tw=80: */
"use strict";

Services.prefs.setBoolPref("webextensions.storage.sync.kinto", false);

AddonTestUtils.init(this);

add_task(async function setup() {
  await ExtensionTestUtils.startAddonManager();

  // FOG needs a profile directory to put its data in.
  do_get_profile();
  // FOG needs to be initialized in order for data to flow.
  Services.fog.initializeFOG();
});

add_task(test_sync_reloading_extensions_works);

add_task(async function test_storage_sync() {
  await test_background_page_storage("sync");
});

add_task(test_storage_sync_requires_real_id);

add_task(async function test_bytes_in_use() {
  await test_background_storage_area_with_bytes_in_use("sync", true);
});

add_task(async function test_storage_onChanged_event_page() {
  await test_storage_change_event_page("sync");
});

add_task(async function test_storage_session_getBytesInUse() {
  await test_get_bytes_in_use("sync");
});

add_task(async function test_storage_sync_sanitizes_internal_error() {
  const extension = ExtensionTestUtils.loadExtension({
    manifest: {
      permissions: ["storage"],
      browser_specific_settings: { gecko: { id: "test@storage-sync-err" } },
    },
    background() {
      browser.test.onMessage.addListener(async msg => {
        browser.test.assertEq(msg, "call_storage_sync", "Expected message");
        await browser.test.assertRejects(
          browser.storage.sync.get(null),
          "An unexpected error occurred",
          "Internal error from storage.sync implementation is sanitized"
        );
        browser.test.sendMessage("done");
      });
      // Call any storage.sync API, to make sure that recordSyncQuotaTelemetry
      // in parent/ext-storage.js is called, so that its logic is skipped when
      // we call storage.sync.get(null) again in this test. Otherwise the mock
      // below that fakes an error will be tripped and cause
      // recordSyncQuotaTelemetry to raise an unrejected promise rejection,
      // which causes the test to fail.
      browser.storage.sync.get(null).then(() => {
        browser.test.sendMessage("ready_to_call_sync");
      });
    },
  });
  await extension.startup();
  await extension.awaitMessage("ready_to_call_sync");
  const { messages } = await promiseConsoleOutput(async () => {
    const { storageSyncService } = ChromeUtils.importESModule(
      "resource://gre/modules/ExtensionStorageComponents.sys.mjs"
    );
    const orig = storageSyncService._storageAreaPromise;
    storageSyncService._storageAreaPromise = Promise.reject(
      new Error("Some fake internal error")
    );
    try {
      extension.sendMessage("call_storage_sync");
      await extension.awaitMessage("done");
    } finally {
      storageSyncService._storageAreaPromise = orig;
    }
  });
  AddonTestUtils.checkMessages(messages, {
    expected: [{ message: /Some fake internal error/ }],
  });
  await extension.unload();
});
