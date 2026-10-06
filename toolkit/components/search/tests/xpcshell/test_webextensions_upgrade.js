/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_setup(async function () {
  SearchTestUtils.setRemoteSettingsConfig([
    {
      identifier: "engine1",
      base: {
        urls: {
          search: { base: "https://1.example.com", searchTermParamName: "q" },
        },
      },
    },
    { identifier: "engine2" },
  ]);
  await SearchService.init();
  await promiseAfterSettings();
});

add_task(async function test_basic_upgrade() {
  let extension = await SearchTestUtils.installSearchExtension(
    {
      version: "1.0",
      search_url_get_params: `q={searchTerms}&version=1.0`,
      keyword: "foo",
    },
    { skipUnload: true }
  );

  let engine = await SearchService.getEngineByAlias("foo");
  Assert.ok(engine, "Can fetch engine with alias");
  engine.alias = "testing";

  engine = await SearchService.getEngineByAlias("testing");
  Assert.ok(engine, "Can fetch engine by alias");
  let params = engine.getSubmission("test").uri.query.split("&");
  Assert.ok(params.includes("version=1.0"), "Correct version installed");

  await SearchService.setDefault(engine, SearchService.CHANGE_REASON.UNKNOWN);

  let promiseChanged = TestUtils.topicObserved(
    "browser-search-engine-modified",
    (eng, verb) => verb == "engine-changed"
  );

  let manifest = SearchTestUtils.createEngineManifest({
    version: "2.0",
    search_url_get_params: `q={searchTerms}&version=2.0`,
    keyword: "bar",
  });
  await extension.upgrade({
    useAddonManager: "permanent",
    manifest,
  });
  await AddonTestUtils.waitForSearchProviderStartup(extension);
  await promiseChanged;

  engine = await SearchService.getEngineByAlias("testing");
  Assert.ok(engine, "Engine still has alias set");

  params = engine.getSubmission("test").uri.query.split("&");
  Assert.ok(params.includes("version=2.0"), "Correct version installed");

  Assert.equal(
    SearchService.defaultEngine.name,
    "Example",
    "Should have retained the same default engine"
  );

  await extension.unload();
  await promiseAfterSettings();
});

add_task(async function test_upgrade_changes_name() {
  let extension = await SearchTestUtils.installSearchExtension(
    {
      name: "engine",
      id: "engine@tests.mozilla.org",
      search_url_get_params: `q={searchTerms}&version=1.0`,
      version: "1.0",
    },
    { skipUnload: true }
  );

  let engine = SearchService.getEngineByName("engine");
  Assert.ok(!!engine, "Should have loaded the engine");

  await SearchService.setDefault(engine, SearchService.CHANGE_REASON.UNKNOWN);

  Assert.deepEqual(
    (await SearchService.getVisibleEngines()).map(e => e.name),
    ["engine1", "engine2", "engine"],
    "Should have the expected engines initially"
  );

  let promiseChanged = TestUtils.topicObserved(
    "browser-search-engine-modified",
    (eng, verb) => verb == "engine-changed"
  );

  let manifest = SearchTestUtils.createEngineManifest({
    name: "Bar",
    id: "engine@tests.mozilla.org",
    search_url_get_params: `q={searchTerms}&version=2.0`,
    version: "2.0",
  });
  await extension.upgrade({
    useAddonManager: "permanent",
    manifest,
  });
  await AddonTestUtils.waitForSearchProviderStartup(extension);

  await promiseChanged;

  engine = SearchService.getEngineByName("Bar");
  Assert.ok(!!engine, "Should be able to get the new engine");

  Assert.equal(
    (await SearchService.getDefault()).name,
    "Bar",
    "Should have kept the default engine the same"
  );

  Assert.deepEqual(
    (await SearchService.getVisibleEngines()).map(e => e.name),
    ["engine1", "engine2", "Bar"],
    "Should have the initial engines plus the upgraded one"
  );

  await extension.unload();
  await promiseAfterSettings();
});

add_task(async function test_upgrade_to_existing_name_not_allowed() {
  let extension = await SearchTestUtils.installSearchExtension(
    {
      name: "engine",
      search_url_get_params: `q={searchTerms}&version=1.0`,
      version: "1.0",
    },
    { skipUnload: true }
  );

  let engine = SearchService.getEngineByName("engine");
  Assert.ok(!!engine, "Should have loaded the engine");

  let promise = AddonTestUtils.waitForSearchProviderStartup(extension);
  let name = "engine1";
  consoleAllowList.push(`An engine called ${name} already exists`);
  let manifest = SearchTestUtils.createEngineManifest({
    name,
    search_url_get_params: `q={searchTerms}&version=2.0`,
    version: "2.0",
  });
  await extension.upgrade({
    useAddonManager: "permanent",
    manifest,
  });
  await promise;

  Assert.equal(
    SearchService.getEngineByName("engine1").getSubmission("abc").uri.spec,
    "https://1.example.com/?q=abc",
    "Should have not changed the original engine"
  );

  console.log((await SearchService.getEngines()).map(e => e.name));

  engine = SearchService.getEngineByName("engine");
  Assert.ok(!!engine, "Should still be able to get the engine by the old name");

  await extension.unload();
  await promiseAfterSettings();
});
