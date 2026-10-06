/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests that renaming a config engine does not create duplicate entries in
 * the search settings (bug 1973899).
 *
 * When a config engine is renamed (same id, new name), the settings persistence
 * code must match engines by id, not name. Matching by name would leave behind
 * a stale entry with the old name because no active engine has that name
 * anymore.
 */

"use strict";

const CONFIG_ORIGINAL = [{ identifier: "engine1" }];

const CONFIG_RENAMED = [
  {
    identifier: "engine1",
    base: { name: "engine1_renamed" },
  },
];

add_setup(async function () {
  SearchTestUtils.setRemoteSettingsConfig(CONFIG_ORIGINAL);
  let settingsFileWritten = promiseAfterSettings();
  await SearchService.init(false);
  await settingsFileWritten;
});

add_task(async function test_no_duplicate_entry_after_engine_rename() {
  let settingsFileWritten = promiseAfterSettings();
  await SearchTestUtils.updateRemoteSettingsConfig(CONFIG_RENAMED);
  await settingsFileWritten;

  let settings = await promiseSettingsData();
  let engineEntries = settings.engines.filter(e => e.id == "engine1");

  Assert.equal(
    engineEntries.length,
    1,
    "Should have exactly one settings entry for the renamed engine"
  );
  Assert.equal(
    engineEntries[0]._name,
    "engine1_renamed",
    "The settings entry should reflect the new engine name"
  );
});
