/* Any copyright is dedicated to the Public Domain.
 *    http://creativecommons.org/publicdomain/zero/1.0/ */

/*
 * Test of a search engine's telemetryId.
 */

"use strict";

let { SearchEngine } = ChromeUtils.importESModule(
  "moz-src:///toolkit/components/search/SearchEngine.sys.mjs"
);

add_setup(async function () {
  SearchTestUtils.setRemoteSettingsConfig([
    {
      identifier: "basic",
      base: {
        name: "enterprise-a",
      },
    },
    {
      identifier: "suffix",
      base: {
        name: "enterprise-b",
      },
      variants: [
        {
          environment: { allRegionsAndLocales: true },
          telemetrySuffix: "b",
        },
      ],
    },
  ]);

  const result = await SearchService.init();
  Assert.ok(
    Components.isSuccessCode(result),
    "Should have initialized the service"
  );

  useHttpServer();
});

function checkIdentifier(engineName, expectedIdentifier, expectedTelemetryId) {
  const engine = SearchService.getEngineByName(engineName);
  Assert.ok(
    engine instanceof SearchEngine,
    "Should be derived from SearchEngine"
  );

  Assert.equal(
    engine.telemetryId,
    expectedTelemetryId,
    "Should have the correct telemetry Id"
  );
}

add_task(async function test_appProvided_basic() {
  checkIdentifier("enterprise-a", "basic", "basic");
});

add_task(async function test_appProvided_suffix() {
  checkIdentifier("enterprise-b", "suffix-b", "suffix-b");
});

add_task(async function test_opensearch() {
  await SearchTestUtils.installOpenSearchEngine({
    url: `${gHttpURL}/opensearch/generic1.xml`,
  });

  // An OpenSearch engine won't have a dedicated identifier because it's not
  // built-in.
  checkIdentifier(kTestEngineName, null, `other-${kTestEngineName}`);
});

add_task(async function test_webExtension() {
  await SearchTestUtils.installSearchExtension({
    id: "enterprise-c",
    name: "Enterprise C",
  });

  // A WebExtension engine won't have a dedicated identifier because it's not
  // built-in.
  checkIdentifier("Enterprise C", null, `other-Enterprise C`);
});
