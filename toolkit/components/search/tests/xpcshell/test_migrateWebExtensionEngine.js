/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const kExtensionID = "simple@tests.mozilla.org";

add_setup(async function () {
  useHttpServer();
  SearchTestUtils.setRemoteSettingsConfig([{ identifier: "unused" }]);
  await SearchService.init();
});

add_task(async function test_migrateLegacyEngine() {
  let engine = await SearchTestUtils.installOpenSearchEngine({
    url: `${gHttpURL}/opensearch/simple.xml`,
  });

  // Modify the loadpath so it looks like a legacy plugin loadpath
  engine._loadPath = `jar:[profile]/extensions/${kExtensionID}.xpi!/simple.xml`;

  await SearchService.setDefault(engine, SearchService.CHANGE_REASON.UNKNOWN);

  // This should replace the existing engine
  let extension = await SearchTestUtils.installSearchExtension(
    {
      id: "simple",
      name: "simple",
      search_url: "https://example.com/",
    },
    { skipUnload: true }
  );

  engine = SearchService.getEngineByName("simple");
  Assert.equal(engine._loadPath, "[addon]" + kExtensionID);
  Assert.equal(engine.extensionID, kExtensionID);

  Assert.equal(
    (await SearchService.getDefault()).name,
    "simple",
    "Should have kept the default engine the same"
  );

  await extension.unload();
});

add_task(async function test_migrateLegacyEngineDifferentName() {
  let engine = await SearchTestUtils.installOpenSearchEngine({
    url: `${gHttpURL}/opensearch/simple.xml`,
  });

  // Modify the loadpath so it looks like an legacy plugin loadpath
  engine._loadPath = `jar:[profile]/extensions/${kExtensionID}.xpi!/simple.xml`;

  await SearchService.setDefault(engine, SearchService.CHANGE_REASON.UNKNOWN);

  // This should replace the existing engine - it has the same id, but a different name.
  let extension = await SearchTestUtils.installSearchExtension(
    {
      id: "simple",
      name: "simple search",
      search_url: "https://example.com/",
    },
    { skipUnload: true }
  );

  engine = SearchService.getEngineByName("simple");
  Assert.equal(engine, null, "Should have removed the old engine");

  // The engine should have changed its name.
  engine = SearchService.getEngineByName("simple search");
  Assert.equal(engine._loadPath, "[addon]" + kExtensionID);
  Assert.equal(engine.extensionID, kExtensionID);

  Assert.equal(
    (await SearchService.getDefault()).name,
    "simple search",
    "Should have made the new engine default"
  );

  await extension.unload();
});
