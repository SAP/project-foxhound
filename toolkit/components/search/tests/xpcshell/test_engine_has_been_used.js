/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests engine hasBeenUsed is recorded on app-provided search engines.
 */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  SearchTestUtils: "resource://testing-common/SearchTestUtils.sys.mjs",
});

const CONFIG = [
  {
    identifier: "example",
    base: {
      name: "Example",
      urls: {
        search: {
          base: "https://example.com",
          searchTermParamName: "q",
        },
      },
    },
  },
  {
    identifier: "mochisearch",
    base: {
      name: "Mochi Search",
      urls: {
        search: {
          base: "http://mochi.test:8888/",
          searchTermParamName: "q",
        },
      },
    },
  },
];

add_setup(async function () {
  SearchTestUtils.setRemoteSettingsConfig(CONFIG);
  await SearchService.init();

  info("Install a non-app provided engine.");
  await SearchTestUtils.installSearchExtension({
    name: "Test",
  });

  let engines = await SearchService.getEngines();
  for (let engine of engines) {
    if (engine.isAppProvided) {
      engine.clearUsage();
    }
  }
});

add_task(async function test_app_provided_engine_record_usage() {
  let mochiEngine = SearchService.getEngineByName("Mochi Search");
  let exampleEngine = SearchService.getEngineByName("Example");

  Assert.equal(
    mochiEngine.isAppProvided,
    true,
    "Mochi Search should be app-provided."
  );
  Assert.equal(
    exampleEngine.isAppProvided,
    true,
    "Example should be app-provided."
  );

  Assert.equal(
    mochiEngine.hasBeenUsed,
    false,
    "App provided engine has not been used yet."
  );

  mochiEngine.markAsUsed();
  Assert.equal(
    mochiEngine.hasBeenUsed,
    true,
    "App provided engine should be marked as used."
  );

  mochiEngine.markAsUsed();
  Assert.equal(
    mochiEngine.hasBeenUsed,
    true,
    "App provided engine should still be marked as used."
  );

  exampleEngine.markAsUsed();
  Assert.equal(
    exampleEngine.hasBeenUsed,
    true,
    "Another engine should be marked as used."
  );

  Assert.equal(
    mochiEngine.hasBeenUsed,
    true,
    "First engine is still marked as used."
  );

  mochiEngine.clearUsage();
  exampleEngine.clearUsage();
});

add_task(async function test_non_app_provided_engine_record_usage() {
  let testEngine = SearchService.getEngineByName("Test");

  Assert.equal(
    testEngine.isAppProvided,
    false,
    "Test search engine should not be app-provided."
  );

  Assert.equal(
    testEngine.hasOwnProperty("hasBeenUsed"),
    false,
    "Non app provided engine does not have hasBeenUsed."
  );

  Assert.equal(
    testEngine.hasOwnProperty("markAsUsed"),
    false,
    "Non app provided engine does not have markAsUsed()."
  );

  Assert.equal(
    testEngine.hasOwnProperty("clearUsage"),
    false,
    "Non app provided engine does not have clearUsage."
  );
});

add_task(async function test_clearUsage() {
  let mochiEngine = SearchService.getEngineByName("Mochi Search");
  let exampleEngine = SearchService.getEngineByName("Example");

  mochiEngine.markAsUsed();
  exampleEngine.markAsUsed();

  Assert.equal(
    mochiEngine.hasBeenUsed,
    true,
    "Mochi Search should be used before clearing."
  );
  Assert.equal(
    exampleEngine.hasBeenUsed,
    true,
    "Example should be used before clearing."
  );

  mochiEngine.clearUsage();
  Assert.equal(
    mochiEngine.hasBeenUsed,
    false,
    "Mochi Search should not be used after clearing."
  );
  Assert.equal(
    exampleEngine.hasBeenUsed,
    true,
    "Example should remain unchanged."
  );

  exampleEngine.clearUsage();
  Assert.equal(
    exampleEngine.hasBeenUsed,
    false,
    "Example should not be used after clearing."
  );
});

add_task(async function test_clearUsage_unused_engine() {
  let exampleEngine = SearchService.getEngineByName("Example");

  exampleEngine.clearUsage();

  Assert.equal(
    exampleEngine.hasBeenUsed,
    false,
    "Clearing unused engine should still be safe."
  );
});
