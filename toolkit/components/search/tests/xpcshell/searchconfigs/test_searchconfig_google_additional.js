/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Additional tests against the search config for Google related items.
 */

ChromeUtils.defineESModuleGetters(this, {
  NimbusFeatures: "resource://nimbus/ExperimentAPI.sys.mjs",
  SearchService: "moz-src:///toolkit/components/search/SearchService.sys.mjs",
});

const { EnterprisePolicyTesting } = ChromeUtils.importESModule(
  "resource://testing-common/EnterprisePolicyTesting.sys.mjs"
);

let engineSelector;

add_setup(async function () {
  sinon.spy(NimbusFeatures.searchConfiguration, "onUpdate");
  sinon.stub(NimbusFeatures.searchConfiguration, "ready").resolves();

  updateAppInfo({
    name: "firefox",
    ID: "xpcshell@tests.mozilla.org",
    version: "42.0",
    platformVersion: "42.0",
  });

  await maybeSetupConfig();

  engineSelector = new SearchEngineSelector();

  // This is needed to make sure the search settings can be loaded
  // when the search service is initialized.
  do_get_profile();

  registerCleanupFunction(async () => {
    sinon.restore();
  });
});

// We skip this test on ESR as on the ESR channel, we don't set up nimbus
// because we are not using any experiments there - the channel pref is used
// for enterprise, rather than the google_channel_* experiment options.
add_task(
  { skip_if: () => SearchUtils.MODIFIED_APP_CHANNEL == "esr" },
  async function test_searchConfig_google_with_nimbus() {
    let sandbox = sinon.createSandbox();
    // Test a couple of configurations with a preference parameter set up.
    const TEST_DATA = [
      {
        locale: "en-US",
        region: "US",
        expected: "nimbus_us_param",
      },
      {
        locale: "en-US",
        region: "GB",
        expected: "nimbus_row_param",
      },
    ];

    // Call this once to cause ConfigSearchEngine to initialise `ParamPreferenceCache`.
    await getEngines(engineSelector, "default", "default");

    Assert.ok(
      NimbusFeatures.searchConfiguration.onUpdate.called,
      "Should register an update listener for Nimbus experiments"
    );
    // Stub getVariable to populate the cache with our expected data
    sandbox.stub(NimbusFeatures.searchConfiguration, "getVariable").returns([
      { key: "google_channel_us", value: "nimbus_us_param" },
      { key: "google_channel_row", value: "nimbus_row_param" },
    ]);
    // Set the pref cache with Nimbus values
    NimbusFeatures.searchConfiguration.onUpdate.firstCall.args[0]();

    for (const testData of TEST_DATA) {
      info(`Checking region ${testData.region}, locale ${testData.locale}`);
      const { engines } = await getEngines(
        engineSelector,
        testData.region,
        testData.locale
      );

      Assert.equal(engines[0].id, "google", "Should have the correct engine");

      const submission = engines[0].getSubmission("test", URLTYPE_SEARCH_HTML);
      Assert.ok(
        NimbusFeatures.searchConfiguration.ready.called,
        "Should wait for Nimbus to get ready"
      );
      Assert.ok(
        NimbusFeatures.searchConfiguration.getVariable,
        "Should call NimbusFeatures.searchConfiguration.getVariable to populate the cache"
      );
      Assert.ok(
        submission.uri.query
          .split("&")
          .includes("channel=" + testData.expected),
        "Should be including the correct preference parameter for the engine"
      );
    }

    sandbox.restore();
  }
);

async function assertEnterpriseParameter(useEmptyPolicy) {
  // Test a couple of configurations.
  const TEST_DATA = [
    {
      locale: "en-US",
      region: "US",
    },
    {
      locale: "en-US",
      region: "GB",
    },
  ];

  SearchService.reset();
  await EnterprisePolicyTesting.setupPolicyEngineWithJson(
    useEmptyPolicy
      ? {}
      : {
          policies: {
            BlockAboutSupport: true,
          },
        }
  );
  await SearchService.init();

  for (const testData of TEST_DATA) {
    info(`Checking region ${testData.region}, locale ${testData.locale}`);
    const { engines } = await getEngines(
      engineSelector,
      testData.region,
      testData.locale
    );

    Assert.equal(engines[0].id, "google", "Should have the correct engine");

    const submission = engines[0].getSubmission("test", URLTYPE_SEARCH_HTML);
    Assert.ok(
      submission.uri.query.split("&").includes("channel=entpr"),
      "Should be including the correct preference parameter for the engine"
    );
  }
}

// On ESR the channel parameter should always be `entpr`, regardless of if
// enterprise policies are set up or not.
add_task(
  { skip_if: () => SearchUtils.MODIFIED_APP_CHANNEL != "esr" },
  async function test_searchConfig_google_enterprise_on_esr() {
    await assertEnterpriseParameter(true);
  }
);

// If there's a policy set, we should also have the channel=entpr parameter
// set.
add_task(async function test_searchConfig_google_enterprise_policy() {
  await assertEnterpriseParameter(false);
});
