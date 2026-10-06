/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests that the search.counts telemetry metrics correctly report the number
 * of installed search engines by type, and counts of disabled/hidden-from-oneoffs
 * engines.
 */

"use strict";

const CONFIG = [
  { identifier: "appDefault" },
  {
    // This engine is restricted to GB so it is not added by default.
    identifier: "userInstallable",
    base: {
      name: "User Installable",
      urls: {
        search: { base: "https://example.net", searchTermParamName: "q" },
      },
    },
    variants: [{ environment: { regions: ["GB"] } }],
  },
];

add_setup(async function () {
  useHttpServer();
  Services.fog.initializeFOG();
  Region._setHomeRegion("US", false);

  // Force settings redesign to false, so that `hideOneOffButton` will correctly
  // work for the time being.
  Services.prefs.setBoolPref("browser.settings-redesign.enabled", false);

  let policies = Cc["@mozilla.org/enterprisepolicies;1"].getService(
    Ci.nsIObserver
  );
  policies.observe(null, "policies-startup", null);

  SearchTestUtils.setRemoteSettingsConfig(CONFIG);
  await SearchService.init();
});

/**
 * Asserts the metrics values.
 *
 * @param {object} expected
 *   All labels not listed in `expected` are asserted to be 0.
 * @param {Record<keyof typeof Glean.searchCounts.totals, number>} [expected.totals]
 * @param {Record<keyof typeof Glean.searchCounts.hiddenEngines, number>} [expected.hidden]
 * @param {string} description
 *   The description used for the asserts.
 */
async function assertCounts(expected, description) {
  const typeLabels = [
    "appProvidedConfig",
    "userInstalledConfig",
    "addon",
    "openSearch",
    "policy",
    "user",
  ];
  for (let label of typeLabels) {
    Assert.equal(
      Glean.searchCounts.totals[label].testGetValue(),
      expected.totals?.[label] ?? 0,
      `${description}: totals.${label}`
    );
  }
  Assert.equal(
    Glean.searchCounts.hiddenEngines.disabled.testGetValue(),
    expected.hidden?.disabled ?? 0,
    `${description}: hiddenEngines.disabled`
  );
  Assert.equal(
    Glean.searchCounts.hiddenEngines.oneOff.testGetValue(),
    expected.hidden?.oneOff ?? 0,
    `${description}: hiddenEngines.oneOff`
  );
}

add_task(async function test_initial_counts() {
  await SearchService.runBackgroundChecks();

  await assertCounts({ totals: { appProvidedConfig: 1 } }, "initial");
});

// setupPolicyEngineWithJson resets and re-initializes the service, so we test
// the policy engine early, before other engines are installed.
add_task(async function test_policy() {
  await setupPolicyEngineWithJson({
    policies: {
      SearchEngines: {
        Add: [
          {
            Name: "policy",
            URLTemplate: "https://example.com/policy?q={searchTerms}",
          },
        ],
      },
    },
  });

  // As the search service has been restarted, manually run the background
  // checks.
  await SearchService.runBackgroundChecks();

  await assertCounts(
    { totals: { appProvidedConfig: 1, policy: 1 } },
    "after policy engine"
  );
});

add_task(async function test_userInstalledConfig() {
  let engine =
    await SearchService.findContextualSearchEngineByHost("example.net");
  Assert.ok(engine, "Should have found the contextual engine");
  await SearchService.addSearchEngine(engine);

  await assertCounts(
    { totals: { appProvidedConfig: 1, policy: 1, userInstalledConfig: 1 } },
    "after userInstalledConfig engine"
  );
});

add_task(async function test_addon() {
  await SearchTestUtils.installSearchExtension({ name: "Addon Engine" });

  await assertCounts(
    {
      totals: {
        appProvidedConfig: 1,
        policy: 1,
        userInstalledConfig: 1,
        addon: 1,
      },
    },
    "after addon engine"
  );
});

add_task(async function test_openSearch() {
  await SearchTestUtils.installOpenSearchEngine({
    url: `${gHttpURL}/opensearch/generic1.xml`,
  });

  await assertCounts(
    {
      totals: {
        appProvidedConfig: 1,
        policy: 1,
        userInstalledConfig: 1,
        addon: 1,
        openSearch: 1,
      },
    },
    "after openSearch engine"
  );
});

add_task(async function test_user() {
  await SearchService.addUserEngine({
    name: "user",
    url: "https://example.com/user?q={searchTerms}",
  });

  await assertCounts(
    {
      totals: {
        appProvidedConfig: 1,
        policy: 1,
        userInstalledConfig: 1,
        addon: 1,
        openSearch: 1,
        user: 1,
      },
    },
    "after user engine"
  );
});

add_task(async function test_hidden_engine_moves_to_disabled() {
  SearchService.getEngineByName("Addon Engine").hidden = true;

  // The addon engine should disappear from its type bucket and appear only in
  // disabled, since hidden engines are excluded from the type counts.
  await assertCounts(
    {
      totals: {
        appProvidedConfig: 1,
        policy: 1,
        userInstalledConfig: 1,
        addon: 0,
        openSearch: 1,
        user: 1,
      },
      hidden: { disabled: 1 },
    },
    "after hiding addon engine"
  );
});

add_task(async function test_hide_one_off_stays_in_type_bucket() {
  SearchService.getEngineByName("user").hideOneOffButton = true;

  // The user engine should remain counted in its type bucket while also
  // incrementing the oneOff hidden count.
  await assertCounts(
    {
      totals: {
        appProvidedConfig: 1,
        policy: 1,
        userInstalledConfig: 1,
        addon: 0,
        openSearch: 1,
        user: 1,
      },
      hidden: { disabled: 1, oneOff: 1 },
    },
    "after hiding user engine from one-offs"
  );
});

add_task(async function test_unhide_returns_to_type_bucket() {
  SearchService.getEngineByName("Addon Engine").hidden = false;

  await assertCounts(
    {
      totals: {
        appProvidedConfig: 1,
        policy: 1,
        userInstalledConfig: 1,
        addon: 1,
        openSearch: 1,
        user: 1,
      },
      hidden: { disabled: 0, oneOff: 1 },
    },
    "after unhiding addon engine"
  );
});

add_task(async function test_remove_engine() {
  await SearchService.removeEngine(SearchService.getEngineByName("user"));

  await assertCounts(
    {
      totals: {
        appProvidedConfig: 1,
        policy: 1,
        userInstalledConfig: 1,
        addon: 1,
        openSearch: 1,
        user: 0,
      },
      hidden: { disabled: 0, oneOff: 0 },
    },
    "after removing user engine"
  );
});
