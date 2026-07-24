/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/*
 * Test migrating legacy add-on engines in background.
 */

"use strict";

add_setup(async function () {
  SearchTestUtils.setRemoteSettingsConfig([{ identifier: "unused" }]);

  let data = await readJSONFile(
    do_get_file("settings/v1-migrate-to-webextension.json")
  );

  await promiseSaveSettingsData(data);

  await SearchService.init();

  // We need the extension installed for this test, but we do not want to
  // trigger the functions that happen on installation, so stub that out.
  // The manifest already has details of this engine.
  let oldFunc = SearchService.addEnginesFromExtension;
  SearchService.addEnginesFromExtension = () => {};

  // Add the add-on so add-on manager has a valid item.
  await SearchTestUtils.installSearchExtension({
    id: "simple",
    name: "simple search",
    search_url: "https://example.com/",
  });

  SearchService.addEnginesFromExtension = oldFunc;
});

add_task(async function test_migrateLegacyEngineDifferentName() {
  await SearchService.init();

  let engine = SearchService.getEngineByName("simple");
  Assert.ok(engine, "Should have the legacy add-on engine.");

  // Set this engine as default, the new engine should become the default
  // after migration.
  await SearchService.setDefault(engine, SearchService.CHANGE_REASON.UNKNOWN);

  engine = SearchService.getEngineByName("simple search");
  Assert.ok(engine, "Should have the WebExtension engine.");

  await SearchService.runBackgroundChecks();

  engine = SearchService.getEngineByName("simple");
  Assert.ok(!engine, "Should have removed the legacy add-on engine");

  engine = SearchService.getEngineByName("simple search");
  Assert.ok(engine, "Should have kept the WebExtension engine.");

  Assert.equal(
    (await SearchService.getDefault()).name,
    engine.name,
    "Should have switched to the WebExtension engine as default."
  );
});
