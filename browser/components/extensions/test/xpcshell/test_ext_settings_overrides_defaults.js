/* -*- Mode: indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set sts=2 sw=2 et tw=80: */

"use strict";

const { AddonTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/AddonTestUtils.sys.mjs"
);

const { SearchTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/SearchTestUtils.sys.mjs"
);

const { SearchUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/SearchUtils.sys.mjs"
);

const { RemoteSettings } = ChromeUtils.importESModule(
  "resource://services-settings/remote-settings.sys.mjs"
);

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

const CONFIG_V2 = [
  {
    recordType: "engine",
    identifier: "test",
    base: {
      name: "MozParamsTest",
      urls: {
        search: {
          base: "https://example.com/",
          params: [
            {
              name: "test-0",
              searchAccessPoint: {
                contextmenu: "0",
              },
            },
            {
              name: "test-1",
              searchAccessPoint: {
                searchbar: "1",
              },
            },
            {
              name: "test-2",
              searchAccessPoint: {
                homepage: "2",
              },
            },
            {
              name: "test-3",
              searchAccessPoint: {
                addressbar: "3",
              },
            },
            {
              name: "test-4",
              searchAccessPoint: {
                newtab: "4",
              },
            },
            {
              name: "simple",
              value: "5",
            },
            {
              name: "term",
              value: "{searchTerms}",
            },
            {
              name: "lang",
              value: "{language}",
            },
            {
              name: "prefval",
              experimentConfig: "code",
            },
            {
              name: "experimenter-1",
              experimentConfig: "nimbus-key-1",
            },
            {
              name: "experimenter-2",
              experimentConfig: "nimbus-key-2",
            },
          ],
          searchTermParamName: "q",
        },
      },
    },
    variants: [
      {
        environment: {
          allRegionsAndLocales: true,
        },
      },
    ],
  },
  {
    recordType: "engine",
    identifier: "test2",
    base: {
      name: "MozParamsTest2",
      urls: {
        search: {
          base: "https://example.com/2/",
          params: [
            {
              name: "simple2",
              value: "5",
            },
          ],
          searchTermParamName: "q",
        },
      },
    },
    variants: [
      {
        environment: {
          allRegionsAndLocales: true,
        },
      },
    ],
  },
  {
    recordType: "defaultEngines",
    globalDefault: "test",
    specificDefaults: [],
  },
  {
    recordType: "engineOrders",
    orders: [],
  },
];

const URLTYPE_SUGGEST_JSON = "application/x-suggestions+json";

AddonTestUtils.init(this);
AddonTestUtils.createAppInfo(
  "xpcshell@tests.mozilla.org",
  "XPCShell",
  "42",
  "42"
);

const kSearchEngineURL = "https://example.com/?q={searchTerms}&foo=myparams";
const kSuggestURL = "https://example.com/fake/suggest/";
const kSuggestURLParams = "q={searchTerms}&type=list2";

Services.prefs.setBoolPref("browser.search.log", true);

add_task(async function setup() {
  AddonTestUtils.usePrivilegedSignatures = false;
  AddonTestUtils.overrideCertDB();
  await AddonTestUtils.promiseStartupManager();
  await SearchTestUtils.useTestEngines(
    "data",
    null,
    SearchUtils.newSearchConfigEnabled
      ? CONFIG_V2
      : [
          {
            webExtension: {
              id: "test@search.mozilla.org",
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
              id: "test2@search.mozilla.org",
            },
            appliesTo: [
              {
                included: { everywhere: true },
              },
            ],
          },
        ]
  );
  await Services.search.init();
  registerCleanupFunction(async () => {
    await AddonTestUtils.promiseShutdownManager();
  });
});

function assertEngineParameters({
  name,
  searchURL,
  suggestionURL,
  messageSnippet,
}) {
  let engine = Services.search.getEngineByName(name);
  Assert.ok(engine, `Should have found ${name}`);

  Assert.equal(
    engine.getSubmission("{searchTerms}").uri.spec,
    encodeURI(searchURL),
    `Should have ${messageSnippet} the suggestion url.`
  );
  Assert.equal(
    engine.getSubmission("{searchTerms}", URLTYPE_SUGGEST_JSON)?.uri.spec,
    suggestionURL ? encodeURI(suggestionURL) : suggestionURL,
    `Should ${messageSnippet} the submission URL.`
  );
}

add_task(async function test_extension_changing_to_app_provided_default() {
  let ext1 = ExtensionTestUtils.loadExtension({
    manifest: {
      icons: {
        16: "foo.ico",
      },
      chrome_settings_overrides: {
        search_provider: {
          is_default: true,
          name: "MozParamsTest2",
          keyword: "MozSearch",
          search_url: kSearchEngineURL,
          suggest_url: kSuggestURL,
          suggest_url_get_params: kSuggestURLParams,
        },
      },
    },
    useAddonManager: "temporary",
  });

  await ext1.startup();
  await AddonTestUtils.waitForSearchProviderStartup(ext1);

  Assert.equal(
    Services.search.defaultEngine.name,
    "MozParamsTest2",
    "Should have switched the default engine."
  );

  assertEngineParameters({
    name: "MozParamsTest2",
    searchURL: SearchUtils.newSearchConfigEnabled
      ? "https://example.com/2/?simple2=5&q={searchTerms}"
      : "https://example.com/2/?q={searchTerms}&simple2=5",
    messageSnippet: "left unchanged",
  });

  let promiseDefaultBrowserChange = SearchTestUtils.promiseSearchNotification(
    "engine-default",
    "browser-search-engine-modified"
  );
  await ext1.unload();
  await promiseDefaultBrowserChange;

  Assert.equal(
    Services.search.defaultEngine.name,
    "MozParamsTest",
    "Should have reverted to the original default engine."
  );
});

add_task(async function test_extension_overriding_app_provided_default() {
  const settings = await RemoteSettings(SearchUtils.SETTINGS_ALLOWLIST_KEY);
  sinon.stub(settings, "get").returns([
    {
      thirdPartyId: "test@thirdparty.example.com",
      overridesId: "test2@search.mozilla.org",
      urls: [
        {
          search_url: "https://example.com/?q={searchTerms}&foo=myparams",
        },
      ],
    },
  ]);

  let ext1 = ExtensionTestUtils.loadExtension({
    manifest: {
      browser_specific_settings: {
        gecko: {
          id: "test@thirdparty.example.com",
        },
      },
      icons: {
        16: "foo.ico",
      },
      chrome_settings_overrides: {
        search_provider: {
          is_default: true,
          name: "MozParamsTest2",
          keyword: "MozSearch",
          search_url: kSearchEngineURL,
          suggest_url: kSuggestURL,
          suggest_url_get_params: kSuggestURLParams,
        },
      },
    },
    useAddonManager: "permanent",
  });

  info("startup");

  await ext1.startup();
  await AddonTestUtils.waitForSearchProviderStartup(ext1);

  Assert.equal(
    Services.search.defaultEngine.name,
    "MozParamsTest2",
    "Should have switched the default engine."
  );
  assertEngineParameters({
    name: "MozParamsTest2",
    searchURL: kSearchEngineURL,
    suggestionURL: `${kSuggestURL}?${kSuggestURLParams}`,
    messageSnippet: "changed",
  });

  info("disable");

  let promiseDefaultBrowserChange = SearchTestUtils.promiseSearchNotification(
    "engine-default",
    "browser-search-engine-modified"
  );
  await ext1.addon.disable();
  await promiseDefaultBrowserChange;

  Assert.equal(
    Services.search.defaultEngine.name,
    "MozParamsTest",
    "Should have reverted to the original default engine."
  );
  assertEngineParameters({
    name: "MozParamsTest2",
    searchURL: SearchUtils.newSearchConfigEnabled
      ? "https://example.com/2/?simple2=5&q={searchTerms}"
      : "https://example.com/2/?q={searchTerms}&simple2=5",
    messageSnippet: "reverted",
  });

  info("enable");

  promiseDefaultBrowserChange = SearchTestUtils.promiseSearchNotification(
    "engine-default",
    "browser-search-engine-modified"
  );
  await ext1.addon.enable();
  await promiseDefaultBrowserChange;

  Assert.equal(
    Services.search.defaultEngine.name,
    "MozParamsTest2",
    "Should have switched the default engine."
  );

  assertEngineParameters({
    name: "MozParamsTest2",
    searchURL: kSearchEngineURL,
    suggestionURL: `${kSuggestURL}?${kSuggestURLParams}`,
    messageSnippet: "changed",
  });

  info("unload");

  promiseDefaultBrowserChange = SearchTestUtils.promiseSearchNotification(
    "engine-default",
    "browser-search-engine-modified"
  );
  await ext1.unload();
  await promiseDefaultBrowserChange;

  Assert.equal(
    Services.search.defaultEngine.name,
    "MozParamsTest",
    "Should have reverted to the original default engine."
  );

  assertEngineParameters({
    name: "MozParamsTest2",
    searchURL: SearchUtils.newSearchConfigEnabled
      ? "https://example.com/2/?simple2=5&q={searchTerms}"
      : "https://example.com/2/?q={searchTerms}&simple2=5",
    messageSnippet: "reverted",
  });
  sinon.restore();
});
