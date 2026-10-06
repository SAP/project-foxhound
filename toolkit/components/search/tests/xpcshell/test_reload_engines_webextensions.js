/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests that the engines-reloaded notification is sent even when an add-on
 * engine's update() call throws, e.g. because the extension was removed
 * without the search service being notified in time.
 */

"use strict";

add_setup(async function () {
  SearchTestUtils.setRemoteSettingsConfig([{ identifier: "appDefault" }]);
  await SearchTestUtils.initXPCShellAddonManager();
  await SearchService.init();
});

add_task(async function test_reload_notified_despite_addon_update_failure() {
  const extension = await SearchTestUtils.installSearchExtension(
    { name: "Test Engine" },
    { skipUnload: true }
  );

  let engine = SearchService.getEngineByName("Test Engine");
  Assert.ok(engine, "Should have the add-on engine installed");

  let stub = sinon
    .stub(engine, "update")
    .rejects(new Error("simulated add-on update failure"));
  consoleAllowList.push("Failed to update add-on search engine");

  registerCleanupFunction(async () => {
    stub.restore();
    let settingsWritten = promiseAfterSettings();
    await extension.unload();
    await settingsWritten;
  });

  let reloadObserved = TestUtils.topicObserved(
    SearchUtils.TOPIC_SEARCH_SERVICE,
    (subject, data) => data == "engines-reloaded"
  );
  await SearchService._reloadEngines(
    await SearchService._settings.get(),
    SearchService.CHANGE_REASON.CONFIG
  );
  await reloadObserved;

  Assert.ok(
    stub.calledOnce,
    "Should have attempted to update the add-on engine"
  );
});
