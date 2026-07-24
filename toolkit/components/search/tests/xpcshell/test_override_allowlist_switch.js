/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests to ensure that we correctly switch and update engines when
 * adding and removing application provided engines which overlap
 * with engines in the override allow list.
 */

"use strict";

const SEARCH_URL_BASE = "https://example.com/";
const SEARCH_URL_PARAMS = `?sourceId=enterprise&q={searchTerms}`;
const ENGINE_NAME = "Simple Engine";
const ALIAS = "star";

const ALLOWLIST = [
  {
    thirdPartyId: "simpleengine@tests.mozilla.org",
    overridesAppIdv2: "simple",
    urls: [
      { search_url: SEARCH_URL_BASE, search_url_get_params: SEARCH_URL_PARAMS },
    ],
  },
  {
    thirdPartyId: "opensearch@search.mozilla.org",
    engineName: ENGINE_NAME,
    overridesAppIdv2: "simple",
    urls: [
      { search_url: SEARCH_URL_BASE, search_url_get_params: SEARCH_URL_PARAMS },
    ],
  },
];

function createConfig(simpleEngineEnvironment) {
  return [
    {
      recordType: "engine",
      identifier: "basic",
      base: {
        name: "basic",
        urls: {
          search: {
            base: "https://ar.wikipedia.org/wiki/%D8%AE%D8%A7%D8%B5:%D8%A8%D8%AD%D8%AB",
            params: [
              {
                name: "sourceId",
                value: "Mozilla-search",
              },
            ],
            searchTermParamName: "search",
          },
        },
      },
      variants: [
        {
          environment: { allRegionsAndLocales: true },
        },
      ],
    },
    {
      recordType: "engine",
      identifier: "simple",
      base: {
        name: "Simple Engine",
        urls: {
          search: {
            base: "https://example.com",
            params: [
              {
                name: "sourceId",
                value: "Mozilla-search",
              },
            ],
            searchTermParamName: "search",
          },
        },
      },
      variants: [
        {
          environment: simpleEngineEnvironment,
        },
      ],
    },
    {
      recordType: "defaultEngines",
      globalDefault: "basic",
      specificDefaults: [],
    },
    {
      recordType: "engineOrders",
      orders: [],
    },
  ];
}

const CONFIG_SIMPLE_LOCALE_DE_V2 = createConfig({ locales: ["de"] });
const CONFIG_SIMPLE_EVERYWHERE_V2 = createConfig({
  allRegionsAndLocales: true,
});

let extension;
let notificationBoxStub;

add_setup(async function () {
  let server = useHttpServer();
  server.registerContentType("sjs", "sjs");
  Services.locale.availableLocales = [
    ...Services.locale.availableLocales,
    "en",
    "de",
  ];
  Services.locale.requestedLocales = ["en"];

  await SearchService.init();

  const settings = await RemoteSettings(SearchUtils.SETTINGS_ALLOWLIST_KEY);
  sinon.stub(settings, "get").returns(ALLOWLIST);

  notificationBoxStub = sinon.stub(
    SearchService,
    "_showRemovalOfSearchEngineNotificationBox"
  );

  consoleAllowList.push("Failed to load");

  registerCleanupFunction(async () => {
    sinon.restore();
  });
});

/**
 * Tests that overrides are correctly applied when the deployment of the app
 * provided engine is extended into an area, or removed from an area, where a
 * user has the WebExtension installed and set as default.
 */
add_task(async function test_app_provided_engine_deployment_extended() {
  await runTestScenario({
    testOpenSearch: false,
    extend: async () => {
      info("Change configuration to include engine in user's environment");

      await SearchTestUtils.updateRemoteSettingsConfig(
        CONFIG_SIMPLE_EVERYWHERE_V2
      );
    },
    remove: async () => {
      info("Change configuration to remove engine from user's environment");

      await SearchTestUtils.updateRemoteSettingsConfig(
        CONFIG_SIMPLE_LOCALE_DE_V2
      );
    },
  });
});

/**
 * Tests that overrides are correctly applied when the deployment of the app
 * provided engine is extended into an area, or removed from an area, where a
 * user has the OpenSearch engine installed and set as default.
 */
add_task(
  async function test_app_provided_engine_deployment_extended_opensearch() {
    await runTestScenario({
      testOpenSearch: true,
      extend: async () => {
        info("Change configuration to include engine in user's environment");

        await SearchTestUtils.updateRemoteSettingsConfig(
          CONFIG_SIMPLE_EVERYWHERE_V2
        );
      },
      remove: async () => {
        info("Change configuration to remove engine from user's environment");

        await SearchTestUtils.updateRemoteSettingsConfig(
          CONFIG_SIMPLE_LOCALE_DE_V2
        );
      },
    });
  }
);

add_task(
  async function test_app_provided_engine_deployment_extended_restart_only() {
    await runTestScenario({
      testOpenSearch: false,
      extend: async () => {
        info(
          "Change configuration with restart to include engine in user's environment"
        );

        await SearchTestUtils.setRemoteSettingsConfig(
          CONFIG_SIMPLE_EVERYWHERE_V2
        );
        await restartSearchService(true);
      },
      remove: async () => {
        info(
          "Change configuration with restart to remove engine from user's environment"
        );

        await SearchTestUtils.setRemoteSettingsConfig(
          CONFIG_SIMPLE_LOCALE_DE_V2
        );
        await restartSearchService(true);
        // Ensure settings have been saved before the engines are added, so that
        // we know we won't have race conditions when `addEnginesFromExtension`
        // loads the settings itself.
        await promiseAfterSettings();

        // Simulate the add-on manager starting up and telling the
        // search service about the add-on again.
        await simulateExtensionStartup(false);
      },
    });
  }
);

add_task(
  async function test_app_provided_engine_deployment_extended_restart_only_startup_extension() {
    await runTestScenario({
      testOpenSearch: false,
      extend: async () => {
        info(
          "Change configuration with restart to include engine in user's environment"
        );

        SearchTestUtils.setRemoteSettingsConfig(CONFIG_SIMPLE_EVERYWHERE_V2);
        await restartSearchService(true);
      },
      remove: async () => {
        info(
          "Change configuration with restart to remove engine from user's environment"
        );

        SearchTestUtils.setRemoteSettingsConfig(CONFIG_SIMPLE_LOCALE_DE_V2);
        await restartSearchService(false);
        // Simulate the add-on manager starting up and telling the
        // search service about the add-on again.
        //
        // In this test, it does this before init() is called, to
        // simulate this being a startup extension.
        await simulateExtensionStartup(false);

        await SearchService.init();
      },
    });
  }
);

add_task(
  async function test_app_provided_engine_deployment_extended_opensearch_restart_only() {
    await runTestScenario({
      testOpenSearch: true,
      extend: async () => {
        info(
          "Change configuration with restart to include engine in user's enonment"
        );

        SearchTestUtils.setRemoteSettingsConfig(CONFIG_SIMPLE_EVERYWHERE_V2);
        await restartSearchService(true);
      },
      remove: async () => {
        info("Change configuration with restart to remove engine from user's");

        SearchTestUtils.setRemoteSettingsConfig(CONFIG_SIMPLE_LOCALE_DE_V2);
        await restartSearchService(true);
      },
    });
  }
);

/**
 * Tests that overrides are correctly applied when the user's environment changes
 * e.g. they have the WebExtension installed and change to a locale where the
 * application provided engine is (or is not) available.
 */
add_task(async function test_user_environment_changes() {
  await runTestScenario({
    testOpenSearch: false,
    extend: async () => {
      info("Change locale to de");

      await promiseSetLocale("de");
    },
    remove: async () => {
      info("Change locale to en");

      await promiseSetLocale("en");
    },
  });
});

async function runTestScenario({ extend, remove, testOpenSearch = false }) {
  // Setup the test.
  await SearchTestUtils.updateRemoteSettingsConfig(CONFIG_SIMPLE_LOCALE_DE_V2);
  notificationBoxStub.resetHistory();

  info(
    `Install ${
      testOpenSearch ? "OpenSearch" : "WebExtension"
    } based engine and set as default`
  );

  let result = await installThirdPartyEngineAsDefault(testOpenSearch);
  let engine = result.engine;
  // Overwrite the global value of extension.
  extension = result.extension;

  // Set a user defined alias.
  engine.alias = ALIAS;

  // Assert the pre-conditions.
  await assertEngineCorrectlySet({
    expectedId: engine.id,
    expectedAlias: ALIAS,
    appEngineOverriden: false,
  });

  // Make changes and assert them.
  await assertCorrectlySwitchedWhenExtended(extend, testOpenSearch);

  // Prepare for removing engines.
  notificationBoxStub.resetHistory();

  await assertCorrectlySwitchedWhenRemoved(remove, engine.id, testOpenSearch);

  let settingsData = await promiseSettingsData();
  Assert.ok(
    settingsData.engines.every(e => !e._metaData.overriddenBy),
    "Should have cleared the overridden by flag after removal"
  );
}

async function restartSearchService(initSearchService = false) {
  info("Restarting search service.");
  await promiseAfterSettings();
  SearchService.reset();
  if (initSearchService) {
    await SearchService.init();
  }
}

async function simulateExtensionStartup(trySetDefault) {
  let extensionData = {
    ...extension.extension,
    startupReason: "APP_STARTUP",
  };
  if (trySetDefault) {
    await SearchService.maybeSetAndOverrideDefault(extensionData);
  } else {
    await SearchService.addEnginesFromExtension(extensionData);
  }
}

/**
 * Asserts that overrides are handled correctly when a WebExtension is
 * installed, and an application provided engine is added for the user.
 *
 * This is designed to be used prior to assertCorrectlySwitchedWhenRemoved.
 *
 * @param {Function} changeFn
 *   A function that applies the change to cause the application provided
 *   engine to be added for the user.
 * @param {boolean} testOpenSearch
 *   Set to true to test OpenSearch based engines.
 */
async function assertCorrectlySwitchedWhenExtended(
  changeFn,
  testOpenSearch = false
) {
  await changeFn();

  await assertEngineCorrectlySet({
    expectedId: "simple",
    expectedAlias: ALIAS,
    appEngineOverriden: true,
  });
  Assert.ok(
    notificationBoxStub.notCalled,
    "Should not have attempted to display a notification box"
  );

  info("Test restarting search service ensure settings are kept.");
  await restartSearchService(true);
  if (!testOpenSearch) {
    await simulateExtensionStartup(true);
  }

  Assert.ok(
    notificationBoxStub.notCalled,
    "Should not have attempted to display a notification box"
  );
  await assertEngineCorrectlySet({
    expectedId: "simple",
    expectedAlias: ALIAS,
    appEngineOverriden: true,
  });
}

/**
 * Asserts that overrides are handled correctly when a WebExtension is
 * installed and overriding an application provided engine, and then the
 * application provided engine is removed from the user.
 *
 * This is designed to be used after to assertCorrectlySwitchedWhenExtended.
 *
 * @param {Function} changeFn
 *   A function that applies the change to cause the application provided
 *   engine to be removed for the user.
 * @param {string} engineId
 *   The id of the engine.
 * @param {boolean} testOpenSearch
 *   Set to true to test OpenSearch based engines.
 */
async function assertCorrectlySwitchedWhenRemoved(
  changeFn,
  engineId,
  testOpenSearch = false
) {
  await changeFn();

  await assertEngineCorrectlySet({
    expectedId: engineId,
    expectedAlias: ALIAS,
    appEngineOverriden: false,
  });

  info("Test restarting search service to remove application provided engine");

  await restartSearchService(false);

  if (!testOpenSearch) {
    await simulateExtensionStartup(false);
  }

  await SearchService.init();

  await assertEngineCorrectlySet({
    expectedId: engineId,
    expectedAlias: ALIAS,
    appEngineOverriden: false,
  });

  if (testOpenSearch) {
    await SearchService.removeEngine(SearchService.getEngineById(engineId));
  } else {
    await extension.unload();
  }
}

async function assertEngineCorrectlySet({
  expectedAlias = "",
  expectedId,
  appEngineOverriden,
}) {
  let engines = await SearchService.getEngines();
  Assert.equal(
    engines.filter(e => e.name == ENGINE_NAME).length,
    1,
    "Should only be one engine with matching name after changing configuration"
  );

  let defaultEngine = await SearchService.getDefault();
  Assert.equal(
    defaultEngine.id,
    expectedId,
    "Should have kept the third party engine as default"
  );
  Assert.equal(
    decodeURI(defaultEngine.getSubmission("{searchTerms}").uri.spec),
    SEARCH_URL_BASE + SEARCH_URL_PARAMS,
    "Should have used the third party engine's URLs"
  );
  Assert.equal(
    !!defaultEngine.getAttr("overriddenBy"),
    appEngineOverriden,
    "Should have correctly overridden or not."
  );

  Assert.equal(
    defaultEngine.telemetryId,
    appEngineOverriden ? "simple-addon" : "other-Simple Engine",
    "Should set the correct telemetry Id"
  );

  Assert.equal(
    defaultEngine.alias,
    expectedAlias,
    "Should have the correct alias"
  );
}

async function installThirdPartyEngineAsDefault(useOpenSearch) {
  let engine;
  let extension = null;

  if (useOpenSearch) {
    engine = await SearchTestUtils.installOpenSearchEngine({
      url: `${gHttpURL}/sjs/engineMaker.sjs?${JSON.stringify({
        baseURL: SEARCH_URL_BASE,
        queryString: SEARCH_URL_PARAMS,
        name: ENGINE_NAME,
        method: "GET",
      })}`,
    });
  } else {
    extension = await SearchTestUtils.installSearchExtension(
      {
        name: ENGINE_NAME,
        search_url: SEARCH_URL_BASE,
        search_url_get_params: SEARCH_URL_PARAMS,
      },
      { skipUnload: true }
    );
    await extension.awaitStartup();

    engine = SearchService.getEngineById(
      "simpleengine@tests.mozilla.orgdefault"
    );
  }

  await SearchService.setDefault(engine, SearchService.CHANGE_REASON.UNKNOWN);

  return { engine, extension };
}
