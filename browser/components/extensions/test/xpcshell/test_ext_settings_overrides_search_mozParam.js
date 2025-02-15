/* -*- Mode: indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set sts=2 sw=2 et tw=80: */

"use strict";

const { AddonTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/AddonTestUtils.sys.mjs"
);
const { SearchTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/SearchTestUtils.sys.mjs"
);
const { NimbusFeatures } = ChromeUtils.importESModule(
  "resource://nimbus/ExperimentAPI.sys.mjs"
);
const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);
const { SearchUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/SearchUtils.sys.mjs"
);

AddonTestUtils.init(this);
AddonTestUtils.overrideCertDB();
AddonTestUtils.createAppInfo(
  "xpcshell@tests.mozilla.org",
  "XPCShell",
  "42",
  "42"
);

let { promiseShutdownManager, promiseStartupManager } = AddonTestUtils;

// Note: these lists should be kept in sync with the lists in
// browser/components/extensions/test/xpcshell/data/test/manifest.json
// These params are conditional based on how search is initiated.
const mozParams = [
  {
    name: "test-0",
    condition: "purpose",
    purpose: "contextmenu",
    value: "0",
  },
  { name: "test-1", condition: "purpose", purpose: "searchbar", value: "1" },
  { name: "test-2", condition: "purpose", purpose: "homepage", value: "2" },
  { name: "test-3", condition: "purpose", purpose: "keyword", value: "3" },
  { name: "test-4", condition: "purpose", purpose: "newtab", value: "4" },
];
// These params are always included.
const params = [
  { name: "simple", value: "5" },
  { name: "term", value: "{searchTerms}" },
  { name: "lang", value: "{language}" },
  { name: "locale", value: "{moz:locale}" },
  { name: "prefval", condition: "pref", pref: "code" },
];

const CONFIG = [
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
];
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
              name: "locale",
              value: "{moz:locale}",
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
        environment: { allRegionsAndLocales: true },
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

add_task(async function setup() {
  let readyStub = sinon.stub(NimbusFeatures.search, "ready").resolves();
  let updateStub = sinon.stub(NimbusFeatures.search, "onUpdate");
  await promiseStartupManager();
  await SearchTestUtils.useTestEngines(
    "data",
    null,
    SearchUtils.newSearchConfigEnabled ? CONFIG_V2 : CONFIG
  );
  await Services.search.init();
  registerCleanupFunction(async () => {
    await promiseShutdownManager();
    readyStub.restore();
    updateStub.restore();
  });
});

/* This tests setting moz params. */
add_task(async function test_extension_setting_moz_params() {
  let defaultBranch = Services.prefs.getDefaultBranch("browser.search.");
  defaultBranch.setCharPref("param.code", "good");

  let engine = Services.search.getEngineByName("MozParamsTest");

  let extraParams = [];
  for (let p of params) {
    if (p.condition == "pref") {
      extraParams.push(`${p.name}=good`);
    } else if (p.value == "{searchTerms}") {
      extraParams.push(`${p.name}=test`);
    } else if (p.value == "{language}") {
      extraParams.push(`${p.name}=${Services.locale.requestedLocale || "*"}`);
    } else if (p.value == "{moz:locale}") {
      extraParams.push(`${p.name}=${Services.locale.requestedLocale}`);
    } else {
      extraParams.push(`${p.name}=${p.value}`);
    }
  }
  let paramStr = extraParams.join("&");

  for (let p of mozParams) {
    let expectedURL = engine.getSubmission(
      "test",
      null,
      p.condition == "purpose" ? p.purpose : null
    ).uri.spec;
    equal(
      expectedURL,
      SearchUtils.newSearchConfigEnabled
        ? `https://example.com/?${p.name}=${p.value}&${paramStr}&q=test`
        : `https://example.com/?q=test&${p.name}=${p.value}&${paramStr}`,
      "search url is expected"
    );
  }

  defaultBranch.setCharPref("param.code", "");
});

add_task(async function test_nimbus_params() {
  let sandbox = sinon.createSandbox();
  let stub = sandbox.stub(NimbusFeatures.search, "getVariable");
  // These values should match the nimbusParams below and the data/test/manifest.json
  // search engine configuration
  stub.withArgs("extraParams").returns([
    {
      key: "nimbus-key-1",
      value: "nimbus-value-1",
    },
    {
      key: "nimbus-key-2",
      value: "nimbus-value-2",
    },
  ]);

  Assert.ok(
    NimbusFeatures.search.onUpdate.called,
    "Called to initialize the cache"
  );

  // Populate the cache with the `getVariable` mock values
  NimbusFeatures.search.onUpdate.firstCall.args[0]();

  let engine = Services.search.getEngineByName("MozParamsTest");

  // Note: these lists should be kept in sync with the lists in
  // browser/components/extensions/test/xpcshell/data/test/manifest.json
  // These params are conditional based on how search is initiated.
  const nimbusParams = [
    { name: "experimenter-1", condition: "pref", pref: "nimbus-key-1" },
    { name: "experimenter-2", condition: "pref", pref: "nimbus-key-2" },
  ];
  const experimentCache = {
    "nimbus-key-1": "nimbus-value-1",
    "nimbus-key-2": "nimbus-value-2",
  };

  let extraParams = [];
  for (let p of params) {
    if (p.value == "{searchTerms}") {
      extraParams.push(`${p.name}=test`);
    } else if (p.value == "{language}") {
      extraParams.push(`${p.name}=${Services.locale.requestedLocale || "*"}`);
    } else if (p.value == "{moz:locale}") {
      extraParams.push(`${p.name}=${Services.locale.requestedLocale}`);
    } else if (p.condition !== "pref") {
      // Ignoring pref parameters
      extraParams.push(`${p.name}=${p.value}`);
    }
  }
  for (let p of nimbusParams) {
    if (p.condition == "pref") {
      extraParams.push(`${p.name}=${experimentCache[p.pref]}`);
    }
  }
  let paramStr = extraParams.join("&");
  for (let p of mozParams) {
    let expectedURL = engine.getSubmission(
      "test",
      null,
      p.condition == "purpose" ? p.purpose : null
    ).uri.spec;
    equal(
      expectedURL,
      SearchUtils.newSearchConfigEnabled
        ? `https://example.com/?${p.name}=${p.value}&${paramStr}&q=test`
        : `https://example.com/?q=test&${p.name}=${p.value}&${paramStr}`,
      "search url is expected"
    );
  }

  sandbox.restore();
});

add_task(async function test_extension_setting_moz_params_fail() {
  // Ensure that the test infra does not automatically make
  // this privileged.
  AddonTestUtils.usePrivilegedSignatures = false;
  Services.prefs.setCharPref(
    "extensions.installedDistroAddon.test@mochitest",
    ""
  );

  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      browser_specific_settings: {
        gecko: { id: "test1@mochitest" },
      },
      chrome_settings_overrides: {
        search_provider: {
          name: "MozParamsTest1",
          search_url: "https://example.com/",
          params: [
            {
              name: "testParam",
              condition: "purpose",
              purpose: "contextmenu",
              value: "0",
            },
            { name: "prefval", condition: "pref", pref: "code" },
            { name: "q", value: "{searchTerms}" },
          ],
        },
      },
    },
    useAddonManager: "permanent",
  });
  await extension.startup();
  await AddonTestUtils.waitForSearchProviderStartup(extension);
  equal(
    extension.extension.isPrivileged,
    false,
    "extension is not priviledged"
  );
  let engine = Services.search.getEngineByName("MozParamsTest1");
  let expectedURL = engine.getSubmission("test", null, "contextmenu").uri.spec;
  equal(
    expectedURL,
    "https://example.com/?q=test",
    "engine cannot have conditional or pref params"
  );
  await extension.unload();
});
