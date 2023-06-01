/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests reloading engines when changing the in-use locale of a WebExtension,
 * where the name of the engine changes as well.
 */

"use strict";

const CONFIG = [
  {
    webExtension: {
      id: "engine@search.mozilla.org",
    },
    appliesTo: [
      {
        included: { everywhere: true },
        default: "yes",
      },
    ],
  },
  {
    webExtension: {
      id: "engine-diff-name@search.mozilla.org",
    },
    appliesTo: [
      {
        included: { everywhere: true },
        excluded: { locales: { matches: ["gd"] } },
      },
      {
        included: { locales: { matches: ["gd"] } },
        webExtension: {
          locales: ["gd"],
        },
      },
    ],
  },
];

add_setup(async () => {
  Services.locale.availableLocales = [
    ...Services.locale.availableLocales,
    "en",
    "gd",
  ];
  Services.locale.requestedLocales = ["gd"];

  await SearchTestUtils.useTestEngines("data", null, CONFIG);
  await AddonTestUtils.promiseStartupManager();
  await Services.search.init();
});

add_task(async function test_config_updated_engine_changes() {
  let engines = await Services.search.getEngines();
  Assert.deepEqual(
    engines.map(e => e.name),
    ["Test search engine", "engine-diff-name-gd"],
    "Should have the correct engines installed"
  );

  let engine = await Services.search.getEngineByName("engine-diff-name-gd");
  Assert.equal(
    engine.name,
    "engine-diff-name-gd",
    "Should have the correct engine name"
  );
  Assert.equal(
    engine.getSubmission("test").uri.spec,
    "https://gd.wikipedia.com/search",
    "Should have the gd search url"
  );

  await promiseSetLocale("en");

  engines = await Services.search.getEngines();
  Assert.deepEqual(
    engines.map(e => e.name),
    ["Test search engine", "engine-diff-name-en"],
    "Should have the correct engines installed after locale change"
  );

  engine = await Services.search.getEngineByName("engine-diff-name-en");
  Assert.equal(
    engine.name,
    "engine-diff-name-en",
    "Should have the correct engine name"
  );
  Assert.equal(
    engine.getSubmission("test").uri.spec,
    "https://en.wikipedia.com/search",
    "Should have the en search url"
  );
});
