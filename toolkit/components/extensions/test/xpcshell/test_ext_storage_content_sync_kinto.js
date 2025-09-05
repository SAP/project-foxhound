"use strict";

Services.prefs.setBoolPref("webextensions.storage.sync.kinto", true);

PromiseTestUtils.allowMatchingRejectionsGlobally(
  /WebExtension context not found/
);

const server = createHttpServer({ hosts: ["example.com"] });
server.registerDirectory("/data/", do_get_file("data"));

// The storage API in content scripts should behave identical to the storage API
// in background pages.

AddonTestUtils.init(this);

add_task(async function setup() {
  await ExtensionTestUtils.startAddonManager();
});

add_task(async function test_contentscript_storage_sync() {
  await test_contentscript_storage("sync");
});

add_task(async function test_contentscript_storage_no_bytes_in_use() {
  await test_contentscript_storage_area_with_bytes_in_use("sync", false);
});
