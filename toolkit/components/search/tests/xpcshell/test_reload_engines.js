/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const CONFIG = [
  {
    // Engine initially default, but the defaults will be changed to engine-pref.
    webExtension: {
      id: "engine@search.mozilla.org",
      name: "Test search engine",
      search_url: "https://www.google.com/search",
      params: [
        {
          name: "q",
          value: "{searchTerms}",
        },
        {
          name: "channel",
          condition: "purpose",
          purpose: "contextmenu",
          value: "rcs",
        },
        {
          name: "channel",
          condition: "purpose",
          purpose: "keyword",
          value: "fflb",
        },
      ],
      suggest_url:
        "https://suggestqueries.google.com/complete/search?output=firefox&client=firefox&hl={moz:locale}&q={searchTerms}",
    },
    appliesTo: [
      {
        included: { everywhere: true },
        default: "yes",
        defaultPrivate: "yes",
      },
      {
        included: { regions: ["FR"] },
        default: "no",
        defaultPrivate: "no",
      },
    ],
  },
  {
    // This will become defaults when region is changed to FR.
    webExtension: {
      id: "engine-pref@search.mozilla.org",
      name: "engine-pref",
      search_url: "https://www.google.com/search",
      params: [
        {
          name: "q",
          value: "{searchTerms}",
        },
        {
          name: "code",
          condition: "pref",
          pref: "code",
        },
        {
          name: "test",
          condition: "pref",
          pref: "test",
        },
      ],
    },
    appliesTo: [
      {
        included: { everywhere: true },
      },
      {
        included: { regions: ["FR"] },
        default: "yes",
        defaultPrivate: "yes",
      },
    ],
  },
  {
    // This engine will get an update when region is changed to FR.
    webExtension: {
      id: "engine-chromeicon@search.mozilla.org",
      name: "engine-chromeicon",
      search_url: "https://www.google.com/search",
      params: [
        {
          name: "q",
          value: "{searchTerms}",
        },
      ],
    },
    appliesTo: [
      {
        included: { everywhere: true },
      },
      {
        included: { regions: ["FR"] },
        extraParams: [
          { name: "c", value: "my-test" },
          { name: "q1", value: "{searchTerms}" },
        ],
      },
    ],
  },
  {
    // This engine will be removed when the region is changed to FR.
    webExtension: {
      id: "engine-rel-searchform-purpose@search.mozilla.org",
      name: "engine-rel-searchform-purpose",
      search_url: "https://www.google.com/search",
      params: [
        {
          name: "q",
          value: "{searchTerms}",
        },
        {
          name: "channel",
          condition: "purpose",
          purpose: "contextmenu",
          value: "rcs",
        },
        {
          name: "channel",
          condition: "purpose",
          purpose: "keyword",
          value: "fflb",
        },
        {
          name: "channel",
          condition: "purpose",
          purpose: "searchbar",
          value: "sb",
        },
      ],
    },
    appliesTo: [
      {
        included: { everywhere: true },
        excluded: { regions: ["FR"] },
      },
    ],
  },
  {
    // This engine will be added when the region is changed to FR.
    webExtension: {
      id: "engine-reordered@search.mozilla.org",
      name: "Test search engine (Reordered)",
      search_url: "https://www.google.com/search",
      params: [
        {
          name: "q",
          value: "{searchTerms}",
        },
        {
          name: "channel",
          condition: "purpose",
          purpose: "contextmenu",
          value: "rcs",
        },
        {
          name: "channel",
          condition: "purpose",
          purpose: "keyword",
          value: "fflb",
        },
      ],
      suggest_url:
        "https://suggestqueries.google.com/complete/search?output=firefox&client=firefox&hl={moz:locale}&q={searchTerms}",
    },
    appliesTo: [
      {
        included: { regions: ["FR"] },
      },
    ],
  },
  {
    // This engine will be re-ordered and have a changed name, when moved to FR.
    webExtension: {
      id: "engine-resourceicon@search.mozilla.org",
      name: "engine-resourceicon",
      search_url: "https://www.google.com/search",
      searchProvider: {
        en: {
          name: "engine-resourceicon",
          search_url: "https://www.google.com/search",
        },
        gd: {
          name: "engine-resourceicon-gd",
          search_url: "https://www.google.com/search",
        },
      },
    },
    appliesTo: [
      {
        included: { everywhere: true },
        excluded: { regions: ["FR"] },
      },
      {
        included: { regions: ["FR"] },
        webExtension: {
          locales: ["gd"],
        },
        orderHint: 30,
      },
    ],
  },
  {
    // This engine has the same name, but still should be replaced correctly.
    webExtension: {
      id: "engine-same-name@search.mozilla.org",
      name: "engine-same-name",
      search_url: "https://www.google.com/search?q={searchTerms}",
      searchProvider: {
        en: {
          name: "engine-same-name",
          search_url: "https://www.google.com/search?q={searchTerms}",
        },
        gd: {
          name: "engine-same-name",
          search_url: "https://www.example.com/search?q={searchTerms}",
        },
      },
    },
    appliesTo: [
      {
        included: { everywhere: true },
        excluded: { regions: ["FR"] },
      },
      {
        included: { regions: ["FR"] },
        webExtension: {
          locales: ["gd"],
        },
      },
    ],
  },
];

const CONFIG_V2 = [
  {
    recordType: "engine",
    identifier: "engine",
    base: {
      name: "Test search engine",
      urls: {
        search: {
          base: "https://www.google.com/search",
          params: [
            {
              name: "channel",
              searchAccessPoint: {
                addressbar: "fflb",
                contextmenu: "rcs",
              },
            },
          ],
          searchTermParamName: "q",
        },
        suggestions: {
          base: "https://suggestqueries.google.com/complete/search?output=firefox&client=firefox&hl={moz:locale}",
          searchTermParamName: "q",
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
    identifier: "engine-pref",
    base: {
      name: "engine-pref",
      urls: {
        search: {
          base: "https://www.google.com/search",
          params: [
            {
              name: "code",
              experimentConfig: "code",
            },
            {
              name: "test",
              experimentConfig: "test",
            },
          ],
          searchTermParamName: "q",
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
    identifier: "engine-chromeicon",
    base: {
      name: "engine-chromeicon",
      urls: {
        search: {
          base: "https://www.google.com/search",
          searchTermParamName: "q",
        },
      },
    },
    variants: [
      {
        environment: { allRegionsAndLocales: true },
      },
      {
        environment: { regions: ["FR"] },
        urls: {
          search: {
            base: "https://www.google.com/search",
            params: [
              {
                name: "c",
                value: "my-test",
              },
            ],
            searchTermParamName: "q1",
          },
        },
      },
    ],
  },
  {
    recordType: "engine",
    identifier: "engine-rel-searchform-purpose",
    base: {
      name: "engine-rel-searchform-purpose",
      urls: {
        search: {
          base: "https://www.google.com/search",
          searchTermParamName: "q",
        },
      },
    },
    variants: [
      {
        environment: { excludedRegions: ["FR"] },
        urls: {
          search: {
            params: [
              {
                name: "channel",
                searchAccessPoint: {
                  addressbar: "fflb",
                  contextmenu: "rcs",
                  searchbar: "sb",
                },
              },
            ],
          },
        },
      },
    ],
  },
  {
    recordType: "engine",
    identifier: "engine-reordered",
    base: {
      name: "Test search engine (Reordered)",
      urls: {
        search: {
          base: "https://www.google.com/search",
          params: [
            {
              name: "channel",
              searchAccessPoint: {
                addressbar: "fflb",
                contextmenu: "rcs",
              },
            },
          ],
          searchTermParamName: "q",
        },
        suggestions: {
          base: "https://suggestqueries.google.com/complete/search?output=firefox&client=firefox&hl={moz:locale}",
          searchTermParamName: "q",
        },
      },
    },
    variants: [
      {
        environment: { regions: ["FR"] },
      },
    ],
  },
  {
    recordType: "engine",
    identifier: "engine-resourceicon",
    base: {
      name: "engine-resourceicon",
      urls: {
        search: {
          base: "https://www.google.com/search",
          searchTermParamName: "q",
        },
      },
    },
    variants: [
      {
        environment: { excludedRegions: ["FR"] },
      },
    ],
  },
  {
    recordType: "engine",
    identifier: "engine-resourceicon-gd",
    base: {
      name: "engine-resourceicon-gd",
      urls: {
        search: {
          base: "https://www.google.com/search",
          searchTermParamName: "q",
        },
      },
    },
    variants: [
      {
        environment: { regions: ["FR"] },
      },
    ],
  },
  {
    recordType: "engine",
    identifier: "engine-same-name",
    base: {
      name: "engine-same-name",
      urls: {
        search: {
          base: "https://www.google.com/search",
          searchTermParamName: "q",
        },
      },
    },
    variants: [
      {
        environment: { excludedRegions: ["FR"] },
      },
    ],
  },
  {
    recordType: "engine",
    identifier: "engine-same-name-gd",
    base: {
      name: "engine-same-name-gd",
      urls: {
        search: {
          base: "https://www.example.com/search",
          searchTermParamName: "q",
        },
      },
    },
    variants: [
      {
        environment: { regions: ["FR"] },
      },
    ],
  },
  {
    recordType: "defaultEngines",
    specificDefaults: [
      {
        default: "engine",
        defaultPrivate: "engine",
        environment: { excludedRegions: ["FR"] },
      },
      {
        default: "engine-pref",
        defaultPrivate: "engine-pref",
        environment: { regions: ["FR"] },
      },
    ],
  },
  {
    recordType: "engineOrders",
    orders: [
      {
        order: ["engine-resourceicon-gd"],
        environment: { regions: ["FR"] },
      },
    ],
  },
];

async function visibleEngines() {
  return (await Services.search.getVisibleEngines()).map(e => e.identifier);
}

add_setup(async function () {
  Services.prefs.setBoolPref("browser.search.separatePrivateDefault", true);
  Services.prefs.setBoolPref(
    SearchUtils.BROWSER_SEARCH_PREF + "separatePrivateDefault.ui.enabled",
    true
  );

  SearchTestUtils.useMockIdleService();
  await SearchTestUtils.useTestEngines(
    "data",
    null,
    SearchUtils.newSearchConfigEnabled ? CONFIG_V2 : CONFIG
  );
  await AddonTestUtils.promiseStartupManager();
});

// This is to verify that the loaded configuration matches what we expect for
// the test.
add_task(async function test_initial_config_correct() {
  Region._setHomeRegion("", false);

  await Services.search.init();

  const installedEngines = await Services.search.getAppProvidedEngines();
  Assert.deepEqual(
    installedEngines.map(e => e.identifier),
    [
      "engine",
      "engine-chromeicon",
      "engine-pref",
      "engine-rel-searchform-purpose",
      "engine-resourceicon",
      "engine-same-name",
    ],
    "Should have the correct list of engines installed."
  );

  Assert.equal(
    (await Services.search.getDefault()).identifier,
    "engine",
    "Should have loaded the expected default engine"
  );

  Assert.equal(
    (await Services.search.getDefaultPrivate()).identifier,
    "engine",
    "Should have loaded the expected private default engine"
  );
});

add_task(async function test_config_updated_engine_changes() {
  // Update the config.
  const reloadObserved =
    SearchTestUtils.promiseSearchNotification("engines-reloaded");
  const defaultEngineChanged = SearchTestUtils.promiseSearchNotification(
    SearchUtils.MODIFIED_TYPE.DEFAULT,
    SearchUtils.TOPIC_ENGINE_MODIFIED
  );
  const defaultPrivateEngineChanged = SearchTestUtils.promiseSearchNotification(
    SearchUtils.MODIFIED_TYPE.DEFAULT_PRIVATE,
    SearchUtils.TOPIC_ENGINE_MODIFIED
  );

  const enginesAdded = [];
  const enginesModified = [];
  const enginesRemoved = [];

  function enginesObs(subject, topic, data) {
    if (data == SearchUtils.MODIFIED_TYPE.ADDED) {
      enginesAdded.push(subject.QueryInterface(Ci.nsISearchEngine).identifier);
    } else if (data == SearchUtils.MODIFIED_TYPE.CHANGED) {
      enginesModified.push(
        subject.QueryInterface(Ci.nsISearchEngine).identifier
      );
    } else if (data == SearchUtils.MODIFIED_TYPE.REMOVED) {
      enginesRemoved.push(subject.QueryInterface(Ci.nsISearchEngine).name);
    }
  }
  Services.obs.addObserver(enginesObs, SearchUtils.TOPIC_ENGINE_MODIFIED);

  Region._setHomeRegion("FR", false);

  await Services.search.wrappedJSObject._maybeReloadEngines();

  await reloadObserved;
  Services.obs.removeObserver(enginesObs, SearchUtils.TOPIC_ENGINE_MODIFIED);

  if (SearchUtils.newSearchConfigEnabled) {
    Assert.deepEqual(
      enginesAdded,
      ["engine-resourceicon-gd", "engine-reordered", "engine-same-name-gd"],
      "Should have added the correct engines"
    );

    Assert.deepEqual(
      enginesModified.sort(),
      ["engine", "engine-chromeicon", "engine-pref"],
      "Should have modified the expected engines"
    );

    Assert.deepEqual(
      enginesRemoved,
      [
        "engine-rel-searchform-purpose",
        "engine-resourceicon",
        "engine-same-name",
      ],
      "Should have removed the expected engine"
    );
  } else {
    Assert.deepEqual(
      enginesAdded,
      ["engine-resourceicon-gd", "engine-reordered"],
      "Should have added the correct engines"
    );

    Assert.deepEqual(
      enginesModified.sort(),
      ["engine", "engine-chromeicon", "engine-pref", "engine-same-name-gd"],
      "Should have modified the expected engines"
    );

    Assert.deepEqual(
      enginesRemoved,
      ["engine-rel-searchform-purpose", "engine-resourceicon"],
      "Should have removed the expected engine"
    );
  }

  const installedEngines = await Services.search.getAppProvidedEngines();

  Assert.deepEqual(
    installedEngines.map(e => e.identifier),
    [
      "engine-pref",
      "engine-resourceicon-gd",
      "engine-chromeicon",
      "engine-same-name-gd",
      "engine",
      "engine-reordered",
    ],
    "Should have the correct list of engines installed in the expected order."
  );

  const newDefault = await defaultEngineChanged;
  Assert.equal(
    newDefault.QueryInterface(Ci.nsISearchEngine).name,
    "engine-pref",
    "Should have correctly notified the new default engine"
  );

  const newDefaultPrivate = await defaultPrivateEngineChanged;
  Assert.equal(
    newDefaultPrivate.QueryInterface(Ci.nsISearchEngine).name,
    "engine-pref",
    "Should have correctly notified the new default private engine"
  );

  const engineWithParams = await Services.search.getEngineByName(
    "engine-chromeicon"
  );
  Assert.equal(
    engineWithParams.getSubmission("test").uri.spec,
    "https://www.google.com/search?c=my-test&q1=test",
    "Should have updated the parameters"
  );

  const engineWithSameName = await Services.search.getEngineByName(
    SearchUtils.newSearchConfigEnabled
      ? "engine-same-name-gd"
      : "engine-same-name"
  );
  Assert.equal(
    engineWithSameName.getSubmission("test").uri.spec,
    "https://www.example.com/search?q=test",
    "Should have correctly switched to the engine of the same name"
  );

  Assert.equal(
    Services.search.wrappedJSObject._settings.getMetaDataAttribute(
      "useSavedOrder"
    ),
    false,
    "Should not have set the useSavedOrder preference"
  );
});

add_task(async function test_user_settings_persist() {
  let reload = SearchTestUtils.promiseSearchNotification("engines-reloaded");
  Region._setHomeRegion("");
  await reload;

  Assert.ok(
    (await visibleEngines()).includes("engine-rel-searchform-purpose"),
    "Rel Searchform engine should be included by default"
  );

  let settingsFileWritten = promiseAfterSettings();
  let engine = await Services.search.getEngineByName(
    "engine-rel-searchform-purpose"
  );
  await Services.search.removeEngine(engine);
  await settingsFileWritten;

  Assert.ok(
    !(await visibleEngines()).includes("engine-rel-searchform-purpose"),
    "Rel Searchform engine has been removed"
  );

  reload = SearchTestUtils.promiseSearchNotification("engines-reloaded");
  Region._setHomeRegion("FR");
  await reload;

  reload = SearchTestUtils.promiseSearchNotification("engines-reloaded");
  Region._setHomeRegion("");
  await reload;

  Assert.ok(
    !(await visibleEngines()).includes("engine-rel-searchform-purpose"),
    "Rel Searchform removal should be remembered"
  );
});
