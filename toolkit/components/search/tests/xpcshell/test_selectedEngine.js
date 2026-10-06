/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

const kDefaultEngineName = "engine1";
const kOtherAppProvidedEngineId = "engine2";

add_setup(async function () {
  useHttpServer();
  SearchTestUtils.setRemoteSettingsConfig([
    { identifier: kDefaultEngineName },
    { identifier: kOtherAppProvidedEngineId },
  ]);
  Assert.ok(!SearchService.isInitialized);
  Services.prefs.setBoolPref(
    "browser.search.removeEngineInfobar.enabled",
    false
  );
});

add_task(async function test_defaultEngine() {
  await SearchService.init();
  await SearchTestUtils.installOpenSearchEngine({
    url: `${gHttpURL}/opensearch/generic1.xml`,
  });

  Assert.equal(SearchService.defaultEngine.name, kDefaultEngineName);
});

// Setting the search engine should be persisted across restarts.
add_task(async function test_persistAcrossRestarts() {
  // Set the engine through the API.
  await SearchService.setDefault(
    SearchService.getEngineByName(kTestEngineName),
    SearchService.CHANGE_REASON.UNKNOWN
  );
  Assert.equal(SearchService.defaultEngine.name, kTestEngineName);
  await promiseAfterSettings();

  // Check that the a hash was saved.
  let metadata = await promiseGlobalMetadata();
  Assert.equal(metadata.defaultEngineIdHash.length, 44);

  // Re-init and check the engine is still the same.
  SearchService.reset();
  await SearchService.init(true);
  Assert.equal(SearchService.defaultEngine.name, kTestEngineName);

  // Cleanup (set the engine back to default).
  SearchService.resetToAppDefaultEngine();
  Assert.equal(SearchService.defaultEngine.name, kDefaultEngineName);
});

// An engine set without a valid hash should be ignored.
add_task(async function test_ignoreInvalidHash() {
  // Set the engine through the API.
  await SearchService.setDefault(
    SearchService.getEngineByName(kTestEngineName),
    SearchService.CHANGE_REASON.UNKNOWN
  );
  Assert.equal(SearchService.defaultEngine.name, kTestEngineName);
  await promiseAfterSettings();

  // Then mess with the file (make the hash invalid).
  let metadata = await promiseGlobalMetadata();
  metadata.defaultEngineIdHash = "invalid";
  await promiseSaveGlobalMetadata(metadata);

  // Re-init the search service, and check that the json file is ignored.
  SearchService.reset();
  await SearchService.init(true);
  Assert.equal(SearchService.defaultEngine.name, kDefaultEngineName);
});

// Resetting the engine to the default should remove the saved value.
add_task(async function test_settingToDefault() {
  // Set the engine through the API.
  await SearchService.setDefault(
    SearchService.getEngineByName(kTestEngineName),
    SearchService.CHANGE_REASON.UNKNOWN
  );
  Assert.equal(SearchService.defaultEngine.name, kTestEngineName);
  await promiseAfterSettings();

  // Check that the current engine was saved.
  let metadata = await promiseGlobalMetadata();
  let currentEngine = SearchService.getEngineByName(kTestEngineName);
  Assert.equal(metadata.defaultEngineId, currentEngine.id);

  // Then set the engine back to the default through the API.
  await SearchService.setDefault(
    SearchService.getEngineByName(kDefaultEngineName),
    SearchService.CHANGE_REASON.UNKNOWN
  );
  await promiseAfterSettings();

  // Check that the current engine is no longer saved in the JSON file.
  metadata = await promiseGlobalMetadata();
  Assert.equal(metadata.defaultEngineId, "");
});

add_task(async function test_resetToOriginalDefaultEngine() {
  Assert.equal(SearchService.defaultEngine.name, kDefaultEngineName);

  await SearchService.setDefault(
    SearchService.getEngineByName(kTestEngineName),
    SearchService.CHANGE_REASON.UNKNOWN
  );
  Assert.equal(SearchService.defaultEngine.name, kTestEngineName);
  await promiseAfterSettings();

  SearchService.resetToAppDefaultEngine();
  Assert.equal(SearchService.defaultEngine.name, kDefaultEngineName);
  await promiseAfterSettings();
});

add_task(async function test_fallback_kept_after_restart() {
  // Set current engine to a default engine that isn't the original default.
  let otherAppProvidedEngine = SearchService.getEngineById(
    kOtherAppProvidedEngineId
  );

  await SearchService.setDefault(
    otherAppProvidedEngine,
    SearchService.CHANGE_REASON.UNKNOWN
  );
  Assert.equal(SearchService.defaultEngine.name, otherAppProvidedEngine.name);
  await promiseAfterSettings();

  // Remove that engine...
  await SearchService.removeEngine(otherAppProvidedEngine);
  // The engine being a default (built-in) one, it should be hidden
  // rather than actually removed.
  Assert.ok(otherAppProvidedEngine.hidden);

  // Using the defaultEngine getter should force a fallback to the
  // original default engine.
  Assert.equal(SearchService.defaultEngine.name, kDefaultEngineName);

  // Restoring the default engines should unhide our built-in test
  // engine, but not change the value of defaultEngine.
  SearchService.restoreDefaultEngines();
  Assert.ok(!otherAppProvidedEngine.hidden);
  Assert.equal(SearchService.defaultEngine.name, kDefaultEngineName);
  await promiseAfterSettings();

  // After a restart, the defaultEngine value should still be unchanged.
  SearchService.reset();
  await SearchService.init(true);
  Assert.equal(SearchService.defaultEngine.name, kDefaultEngineName);
});
