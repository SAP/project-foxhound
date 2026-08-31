/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests reloading engines when changing the in-use locale of a WebExtension,
 * where the name of the engine changes as well.
 */

"use strict";

const CONFIG = [
  { identifier: "appDefault" },
  {
    identifier: "notGDLocale",
    base: {
      name: "Not GD Locale",
      urls: {
        search: {
          base: "https://en.wikipedia.com/search",
          searchTermParamName: "q",
        },
      },
    },
    variants: [{ environment: { excludedLocales: ["gd"] } }],
  },
  {
    identifier: "localeGD",
    base: {
      name: "GD Locale",
      urls: {
        search: {
          base: "https://gd.wikipedia.com/search",
          searchTermParamName: "q",
        },
      },
    },
    variants: [{ environment: { locales: ["gd"] } }],
  },
];

add_setup(async () => {
  Services.locale.availableLocales = [
    ...Services.locale.availableLocales,
    "en",
    "gd",
  ];
  Services.locale.requestedLocales = ["gd"];

  SearchTestUtils.setRemoteSettingsConfig(CONFIG);
  await SearchService.init();
});

add_task(async function test_config_updated_engine_changes() {
  let engines = await SearchService.getEngines();
  Assert.deepEqual(
    engines.map(e => e.id),
    ["appDefault", "localeGD"],
    "Should have the correct engines installed"
  );

  let engine = await SearchService.getEngineByName("GD Locale");
  Assert.equal(
    engine.getSubmission("test").uri.spec,
    "https://gd.wikipedia.com/search?q=test",
    "Should have the gd search url"
  );

  await promiseSetLocale("en");

  engines = await SearchService.getEngines();
  Assert.deepEqual(
    engines.map(e => e.id),
    ["appDefault", "notGDLocale"],
    "Should have the correct engines installed after locale change"
  );

  engine = await SearchService.getEngineByName("Not GD Locale");
  Assert.equal(
    engine.getSubmission("test").uri.spec,
    "https://en.wikipedia.com/search?q=test",
    "Should have the en search url"
  );
});
