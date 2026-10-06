/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests that ensure application provided engines have all base fields set up
 * correctly from the search configuration.
 */

"use strict";

let CONFIG = [
  {
    identifier: "testEngine",
    base: {
      aliases: ["testEngine1", "testEngine2"],
      charset: "EUC-JP",
      classification: "general",
      name: "testEngine name",
      partnerCode: "pc",
      urls: {
        search: {
          base: "https://example.com/1",
          // Method defaults to GET
          params: [
            { name: "partnerCode", value: "{partnerCode}" },
            { name: "starbase", value: "Regula I" },
            { name: "experiment", value: "Genesis" },
          ],
          searchTermParamName: "search",
        },
        suggestions: {
          base: "https://example.com/2",
          method: "POST",
          searchTermParamName: "suggestions",
        },
        trending: {
          base: "https://example.com/3",
          searchTermParamName: "trending",
          // In the past
          isNewUntil: "2020-01-01",
        },
        visualSearch: {
          base: "https://example.com/4",
          searchTermParamName: "visual",
          displayNameMap: {
            default: "Visual Search",
          },
          // In the future
          isNewUntil: "2095-01-01",
          excludePartnerCodeFromTelemetry: true,
        },
      },
    },
  },
  {
    identifier: "testOtherValuesEngine",
    base: {
      classification: "unknown",
      name: "testOtherValuesEngine name",
      urls: {
        search: {
          base: "https://example.com/1",
          searchTermParamName: "search",
        },
        trending: {
          base: "https://example.com/3",
        },
      },
    },
  },
  {
    identifier: "override",
    recordType: "engine",
    base: {
      classification: "unknown",
      name: "override name",
      partnerCode: "old-pc",
      urls: {
        search: {
          base: "https://www.example.com/search",
          params: [
            { name: "old_param", value: "old_value" },
            { name: "pc", value: "{partnerCode}" },
          ],
          searchTermParamName: "q",
        },
      },
    },
    variants: [
      {
        environment: {
          locales: ["en-US"],
        },
        // In the future
        isNewUntil: "2095-01-01",
      },
    ],
  },
];

const TEST_CONFIG_OVERRIDE = [
  {
    identifier: "override",
    urls: {
      search: {
        params: [
          { name: "new_param", value: "new_value" },
          { name: "pc", value: "{partnerCode}" },
        ],
      },
    },
    partnerCode: "new_partner_code",
    telemetrySuffix: "tsfx",
    clickUrl: "https://example.org/somewhere",
  },
];

add_setup(async function () {
  SearchTestUtils.setRemoteSettingsConfig(CONFIG);
  await SearchService.init();
});

add_task(async function test_engine_with_all_params_set() {
  let engine = SearchService.getEngineById("testEngine");
  Assert.ok(engine, "Should have found the engine");

  Assert.equal(
    engine.name,
    "testEngine name",
    "Should have the correct engine name"
  );
  Assert.deepEqual(
    engine.aliases,
    ["@testEngine1", "@testEngine2"],
    "Should have the correct aliases"
  );
  Assert.ok(
    engine.isGeneralPurposeEngine,
    "Should be a general purpose engine"
  );
  Assert.equal(
    engine.queryCharset,
    "EUC-JP",
    "Should have the correct encoding"
  );

  let submission = engine.getSubmission("test");
  Assert.equal(
    submission.uri.spec,
    "https://example.com/1?partnerCode=pc&starbase=Regula%20I&experiment=Genesis&search=test",
    "Should have the correct search URL"
  );
  Assert.ok(!submission.postData, "Should not have postData for a GET url");

  let suggestSubmission = engine.getSubmission(
    "test",
    SearchUtils.URL_TYPE.SUGGEST_JSON
  );
  Assert.equal(
    suggestSubmission.uri.spec,
    "https://example.com/2",
    "Should have the correct suggestion URL"
  );
  Assert.equal(
    suggestSubmission.postData.data.data,
    "suggestions=test",
    "Should have the correct postData for a POST URL"
  );

  let trendingSubmission = engine.getSubmission(
    "",
    SearchUtils.URL_TYPE.TRENDING_JSON
  );
  Assert.equal(
    trendingSubmission.uri.spec,
    "https://example.com/3?trending=",
    "Should have the correct trending URL with search term parameter."
  );
  Assert.ok(
    !trendingSubmission.postData,
    "Should not have postData for a GET url"
  );

  let visualSearchSubmission = engine.getSubmission(
    "https://example.com/test.jpg",
    SearchUtils.URL_TYPE.VISUAL_SEARCH
  );
  Assert.equal(
    visualSearchSubmission.uri.spec,
    "https://example.com/4?visual=" +
      encodeURIComponent("https://example.com/test.jpg"),
    "Should have the correct visual search URL with search term parameter."
  );
  Assert.ok(
    !visualSearchSubmission.postData,
    "Should not have postData for a GET url"
  );

  // The `SEARCH` URL config does not define any of these properties.
  Assert.equal(
    engine.getURLOfType(SearchUtils.URL_TYPE.SEARCH).displayName,
    "",
    "The SEARCH URL shouldn't have a display name"
  );
  Assert.ok(
    !engine.getURLOfType(SearchUtils.URL_TYPE.SEARCH).isNew(),
    "isNew for the SEARCH URL should return false"
  );
  Assert.ok(
    !engine.getURLOfType(SearchUtils.URL_TYPE.SEARCH)
      .excludePartnerCodeFromTelemetry,
    "excludePartnerCodeFromTelemetry for the SEARCH URL should be false"
  );

  // The `VISUAL_SEARCH` URL config defines all of these properties.
  Assert.equal(
    engine.getURLOfType(SearchUtils.URL_TYPE.VISUAL_SEARCH).displayName,
    "Visual Search",
    "The display name of the visual search URL should be correct"
  );
  Assert.ok(
    engine.getURLOfType(SearchUtils.URL_TYPE.VISUAL_SEARCH).isNew(),
    "isNew for the visual search URL should return true"
  );
  Assert.ok(
    engine.getURLOfType(SearchUtils.URL_TYPE.VISUAL_SEARCH)
      .excludePartnerCodeFromTelemetry,
    "excludePartnerCodeFromTelemetry for the visual search URL should be true"
  );

  checkUrlOfType(engine);
});

add_task(async function test_engine_with_some_params_set() {
  let engine = SearchService.getEngineById("testOtherValuesEngine");
  Assert.ok(engine, "Should have found the engine");

  Assert.equal(
    engine.name,
    "testOtherValuesEngine name",
    "Should have the correct engine name"
  );
  Assert.deepEqual(engine.aliases, [], "Should have no aliases");
  Assert.ok(
    !engine.isGeneralPurposeEngine,
    "Should not be a general purpose engine"
  );
  Assert.equal(engine.queryCharset, "UTF-8", "Should default to UTF-8 charset");
  Assert.equal(
    engine.getSubmission("test").uri.spec,
    "https://example.com/1?search=test",
    "Should have the correct search URL"
  );
  Assert.equal(
    engine.getSubmission("test", SearchUtils.URL_TYPE.SUGGEST_JSON),
    null,
    "Should not have a suggestions URL"
  );
  let trendingSubmission = engine.getSubmission(
    "",
    SearchUtils.URL_TYPE.TRENDING_JSON
  );
  Assert.equal(
    trendingSubmission.uri.spec,
    "https://example.com/3",
    "Should have the correct trending URL without search term parameter."
  );

  checkUrlOfType(engine);
});

add_task(async function test_engine_remote_override() {
  // First check the existing engine doesn't have the overrides.
  let engine = SearchService.getEngineById("override");
  Assert.ok(engine, "Should have found the override engine");

  Assert.equal(engine.name, "override name", "Should have the expected name");
  Assert.equal(
    engine.telemetryId,
    "override",
    "Should not have a telemetry suffix - overrides not applied yet"
  );
  Assert.equal(
    engine.getSubmission("test").uri.spec,
    "https://www.example.com/search?old_param=old_value&pc=old-pc&q=test",
    "Should not have overridden URL - overrides not applied yet"
  );
  Assert.equal(
    engine.clickUrl,
    null,
    "Should not have a click URL - overrides not applied yet"
  );

  // Now apply and test the overrides.
  await SearchTestUtils.updateRemoteSettingsConfig(
    CONFIG,
    TEST_CONFIG_OVERRIDE
  );

  engine = SearchService.getEngineById("override");
  Assert.ok(engine, "Should have found the override engine");

  Assert.equal(engine.name, "override name", "Should have the expected name");
  Assert.equal(
    engine.telemetryId,
    "override-tsfx",
    "Should have the overridden telemetry suffix"
  );
  Assert.equal(
    engine.getSubmission("test").uri.spec,
    "https://www.example.com/search?new_param=new_value&pc=new_partner_code&q=test",
    "Should have the overridden URL"
  );
  Assert.equal(
    engine.clickUrl,
    "https://example.org/somewhere",
    "Should have the click URL specified by the override"
  );

  checkUrlOfType(engine);
});

add_task(async function test_displayName() {
  let engine = SearchService.getEngineById("testEngine");

  let supportedTypesWithoutNames = [
    SearchUtils.URL_TYPE.SEARCH,
    SearchUtils.URL_TYPE.SUGGEST_JSON,
  ];
  for (let type of supportedTypesWithoutNames) {
    Assert.ok(type, "Sanity check: The type exists");
    Assert.ok(
      engine.supportsResponseType(type),
      "Sanity check: The engine should support response type: " + type
    );
    Assert.ok(
      !engine.getURLOfType(type).displayName,
      "displayName should be falsey for a type that doesn't have a name"
    );
  }

  let supportedTypesWithNames = {
    [SearchUtils.URL_TYPE.VISUAL_SEARCH]: "Visual Search",
  };
  for (let [type, expectedName] of Object.entries(supportedTypesWithNames)) {
    Assert.ok(type, "Sanity check: The type exists");
    Assert.ok(
      engine.supportsResponseType(type),
      "Sanity check: The engine should support response type: " + type
    );
    Assert.equal(
      engine.getURLOfType(type).displayName,
      expectedName,
      "displayName should be correct for a type that has a name"
    );
  }

  let unsupportedTypes = [
    SearchUtils.URL_TYPE.OPENSEARCH,
    SearchUtils.URL_TYPE.SEARCH_FORM,
  ];
  for (let type of unsupportedTypes) {
    Assert.ok(type, "Sanity check: The type exists");
    Assert.ok(
      !engine.supportsResponseType(type),
      "Sanity check: The engine should not support response type: " + type
    );
    Assert.ok(
      !engine.getURLOfType(type),
      "getURLOfType should return nothing for unsupported type: " + type
    );
  }
});

add_task(async function test_isNew_urlOnly() {
  // This engine has `isNewUntil` defined for its trending and visual search
  // URLs, but the trending date is in the past.
  let engine = SearchService.getEngineById("testEngine");
  Assert.ok(
    !engine.isNew(),
    "isNew should return false for testEngine without an arg"
  );

  // `isNewUntil` isn't defined on the search URL
  Assert.ok(
    !engine.getURLOfType(SearchUtils.URL_TYPE.SEARCH).isNew(),
    "isNew should return false for SEARCH"
  );

  // In the past
  Assert.ok(
    !engine.getURLOfType(SearchUtils.URL_TYPE.TRENDING_JSON).isNew(),
    "isNew should return false for TRENDING_JSON"
  );

  // In the future
  Assert.ok(
    engine.getURLOfType(SearchUtils.URL_TYPE.VISUAL_SEARCH).isNew(),
    "isNew should return true for VISUAL_SEARCH"
  );
});

add_task(async function test_isNew_variant() {
  // This engine has `isNewUntil` defined on its variant.
  let engine = SearchService.getEngineById("override");
  Assert.ok(engine.isNew(), "isNew should return true for override engine");
  Assert.ok(
    !engine.getURLOfType(SearchUtils.URL_TYPE.SEARCH).isNew(),
    "isNew should return false for SEARCH"
  );
  Assert.ok(
    !engine.getURLOfType(SearchUtils.URL_TYPE.VISUAL_SEARCH),
    "getURLOfType should return nothing for unsupported type VISUAL_SEARCH"
  );
});

function checkUrlOfType(engine) {
  for (let [key, type] of Object.entries(SearchUtils.URL_TYPE)) {
    Assert.equal(
      !!engine.getURLOfType(type),
      engine.supportsResponseType(type),
      "getURLOfType should return a URL iff the type is supported: " + key
    );
  }
}
