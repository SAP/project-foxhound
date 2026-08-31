/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/* import-globals-from ../../unit/head.js */
/* eslint-disable jsdoc/require-param */

ChromeUtils.defineESModuleGetters(this, {
  Preferences: "resource://gre/modules/Preferences.sys.mjs",
  QuickSuggest: "moz-src:///browser/components/urlbar/QuickSuggest.sys.mjs",
  SearchUtils: "moz-src:///toolkit/components/search/SearchUtils.sys.mjs",
  TelemetryTestUtils: "resource://testing-common/TelemetryTestUtils.sys.mjs",
  UrlbarProviderAutofill:
    "moz-src:///browser/components/urlbar/UrlbarProviderAutofill.sys.mjs",
  UrlbarProviderQuickSuggest:
    "moz-src:///browser/components/urlbar/UrlbarProviderQuickSuggest.sys.mjs",
  UrlbarSearchUtils:
    "moz-src:///browser/components/urlbar/UrlbarSearchUtils.sys.mjs",
});

add_setup(async function setUpQuickSuggestXpcshellTest() {
  // Initializing TelemetryEnvironment in an xpcshell environment requires
  // jumping through a bunch of hoops. Suggest's use of TelemetryEnvironment is
  // tested in browser tests, and there's no other necessary reason to wait for
  // TelemetryEnvironment initialization in xpcshell tests, so just skip it.
  QuickSuggest._testSkipTelemetryEnvironmentInit = true;
});

/**
 * Sets up a test so it can use `doMigrateTest`. The app's region and locale
 * will be set to US and en-US. Use `QuickSuggestTestUtils.withRegionAndLocale`
 * or `setRegionAndLocale` if you need to test migration in a different region
 * or locale.
 */
async function setUpMigrateTest() {
  await UrlbarTestUtils.initNimbusFeature();
  await QuickSuggestTestUtils.setRegionAndLocale({
    region: "US",
    locale: "en-US",
  });
}

/**
 * Tests a single Suggest prefs migration, from one version to the next. Call
 * `setUpMigrateTest` in your setup task before using this. To test migration in
 * a region and locale other than US and en-US, wrap your `doMigrateTest` call
 * in `QuickSuggestTestUtils.withRegionAndLocale`.
 *
 * @param {object} options
 *   The options object.
 * @param {number} options.toVersion
 *   The version to test. Migration from `toVersion - 1` to `toVersion` will be
 *   performed.
 * @param {object} [options.preMigrationUserPrefs]
 *   Prefs to set on the user branch before migration. An object that maps pref
 *   names relative to `browser.urlbar.` to values.
 * @param {object} [options.expectedPostMigrationUserPrefs]
 *   Prefs that are expected to be set on the user branch after migration. An
 *   object that maps pref names relative to `browser.urlbar.` to values. If a
 *   pref is expected to be set on the user branch before migration but cleared
 *   after migration, set its value to `null`.
 */
async function doMigrateTest({
  toVersion,
  preMigrationUserPrefs = {},
  expectedPostMigrationUserPrefs = {},
}) {
  info(
    "Testing migration: " +
      JSON.stringify({
        toVersion,
        preMigrationUserPrefs,
        expectedPostMigrationUserPrefs,
      })
  );

  // Prefs whose user-branch values we should always make sure to check.
  // Includes obsolete prefs since they're relevant to some older migrations.
  let userPrefsToAlwaysCheck = [
    "quicksuggest.dataCollection.enabled",
    "quicksuggest.enabled",
    "suggest.quicksuggest",
    "suggest.quicksuggest.nonsponsored",
    "suggest.quicksuggest.sponsored",
  ];

  let userBranch = new Preferences({
    branch: "browser.urlbar.",
    defaultBranch: false,
  });

  // Set the last-seen migration version to `toVersion - 1`.
  if (toVersion == 1) {
    userBranch.reset("quicksuggest.migrationVersion");
  } else {
    userBranch.set("quicksuggest.migrationVersion", toVersion - 1);
  }

  // Set pre-migration user prefs.
  for (let [name, value] of Object.entries(preMigrationUserPrefs)) {
    userBranch.set(name, value);
  }

  // Record values for prefs in `userPrefsToAlwaysCheck` that weren't just set
  // above, so that we can use them later.
  for (let name of userPrefsToAlwaysCheck) {
    if (!preMigrationUserPrefs.hasOwnProperty(name)) {
      preMigrationUserPrefs[name] = userBranch.isSet(name)
        ? userBranch.get(name)
        : null;
    }
  }

  // The entire set of prefs that should be checked after migration.
  let userPrefsToCheckPostMigration = new Set([
    ...Object.keys(preMigrationUserPrefs),
    ...Object.keys(expectedPostMigrationUserPrefs),
  ]);

  // Reinitialize Suggest and check prefs twice. The first time the migration
  // should happen, and the second time the migration should not happen and
  // all the prefs should stay the same.
  for (let i = 0; i < 2; i++) {
    info(`Reinitializing Suggest, i=${i}`);

    // Reinitialize Suggest, which includes migration.
    await QuickSuggest._test_reset({
      migrationVersion: toVersion,
    });

    for (let name of userPrefsToCheckPostMigration) {
      // The expected value is the expected post-migration value, if any;
      // otherwise it's the pre-migration value.
      let expectedValue = expectedPostMigrationUserPrefs.hasOwnProperty(name)
        ? expectedPostMigrationUserPrefs[name]
        : preMigrationUserPrefs[name];
      if (expectedValue === null) {
        Assert.ok(
          !userBranch.isSet(name),
          "Pref should not have a user value after migration: " + name
        );
      } else {
        Assert.ok(
          userBranch.isSet(name),
          "Pref should have a user value after migration: " + name
        );
        Assert.equal(
          userBranch.get(name),
          expectedValue,
          "Pref should have been set to the expected value after migration: " +
            name
        );
      }
    }

    Assert.equal(
      userBranch.get("quicksuggest.migrationVersion"),
      toVersion,
      "quicksuggest.migrationVersion should be updated after migration"
    );
  }

  // Clean up.
  userBranch.reset("quicksuggest.migrationVersion");
  for (let name of userPrefsToCheckPostMigration) {
    userBranch.reset(name);
  }
}

/**
 * Does a test that dismisses a single result by triggering a command on it.
 *
 * @param {object} options
 *   Options object.
 * @param {SuggestFeature} options.feature
 *   The feature that provides the dismissed result.
 * @param {UrlbarResult} options.result
 *   The result to trigger the command on.
 * @param {string} options.command
 *   The name of the command to trigger. It should dismiss one result.
 * @param {Array} options.queriesForDismissals
 *   Array of objects: `{ query, expectedResults }`
 *   For each object, the test will perform a search with `query` as the search
 *   string. After dismissing the result, the query shouldn't match any results.
 *   After clearing dismissals, the query should match the results in
 *   `expectedResults`. If `expectedResults` is omitted, `[result]` will be
 *   used.
 * @param {Array} options.queriesForOthers
 *   Array of objects: `{ query, expectedResults }`
 *   For each object, the test will perform a search with `query` as the search
 *   string. The query should always match `expectedResults`.
 * @param {string[]} [options.providers]
 *   The providers to query.
 */
async function doDismissOneTest({
  feature,
  result,
  command,
  queriesForDismissals,
  queriesForOthers,
  providers = [UrlbarProviderQuickSuggest.name],
}) {
  await QuickSuggest.clearDismissedSuggestions();
  await QuickSuggestTestUtils.forceSync();
  Assert.ok(
    !(await QuickSuggest.canClearDismissedSuggestions()),
    "Sanity check: canClearDismissedSuggestions should return false initially"
  );

  let changedPromise = TestUtils.topicObserved(
    "quicksuggest-dismissals-changed"
  );

  let actualResult = await getActualResult({
    providers,
    query: queriesForDismissals[0].query,
    expectedResult: result,
  });

  triggerCommand({
    command,
    feature,
    result: actualResult,
    expectedCountsByCall: {
      removeResult: 1,
    },
  });

  info("Awaiting dismissals-changed promise");
  await changedPromise;

  Assert.ok(
    await QuickSuggest.canClearDismissedSuggestions(),
    "canClearDismissedSuggestions should return true after triggering command"
  );
  Assert.ok(
    await QuickSuggest.isResultDismissed(actualResult),
    "The result should be dismissed"
  );

  for (let { query } of queriesForDismissals) {
    info("Doing search for dismissed suggestions: " + JSON.stringify(query));
    await check_results({
      context: createContext(query, {
        providers,
        isPrivate: false,
      }),
      matches: [],
    });
  }

  for (let { query, expectedResults } of queriesForOthers) {
    info(
      "Doing search for non-dismissed suggestions: " + JSON.stringify(query)
    );
    await check_results({
      context: createContext(query, {
        providers,
        isPrivate: false,
      }),
      matches: expectedResults,
    });
  }

  let clearedPromise = TestUtils.topicObserved(
    "quicksuggest-dismissals-cleared"
  );

  info("Clearing dismissals");
  await QuickSuggest.clearDismissedSuggestions();

  // It's not necessary to await this -- awaiting `clearDismissedSuggestions()`
  // is sufficient -- but we do it to make sure the notification is sent.
  info("Awaiting dismissals-cleared promise");
  await clearedPromise;

  Assert.ok(
    !(await QuickSuggest.canClearDismissedSuggestions()),
    "canClearDismissedSuggestions should return false after clearing dismissals"
  );

  for (let { query, expectedResults = [result] } of queriesForDismissals) {
    info("Doing search after clearing dismissals: " + JSON.stringify(query));
    await check_results({
      context: createContext(query, {
        providers,
        isPrivate: false,
      }),
      matches: expectedResults,
    });
  }
}

/**
 * Does a test that dismisses a suggestion type (i.e., all suggestions of a
 * certain type) by triggering a command on a result.
 *
 * @param {object} options
 *   Options object.
 * @param {SuggestFeature} options.feature
 *   The feature that provides the suggestion type.
 * @param {UrlbarResult} options.result
 *   The result to trigger the command on.
 * @param {string} options.command
 *   The name of the command to trigger. It should dismiss all results of a
 *   suggestion type.
 * @param {string} options.pref
 *   The name of the user-controlled pref (relative to `browser.urlbar.`) that
 *   controls the suggestion type. Should be included in
 *   `feature.primaryUserControlledPreferences`.
 * @param {Array} options.queries
 *   Array of objects: `{ query, expectedResults }`
 *   For each object, the test will perform a search with `query` as the search
 *   string. After dismissing the suggestion type, the query shouldn't match any
 *   results. After clearing dismissals, the query should match the results in
 *   `expectedResults`. If `expectedResults` is omitted, `[result]` will be
 *   used.
 * @param {string[]} [options.providers]
 *   The providers to query.
 */
async function doDismissAllTest({
  feature,
  result,
  command,
  pref,
  queries,
  providers = [UrlbarProviderQuickSuggest.name],
}) {
  await QuickSuggest.clearDismissedSuggestions();
  await QuickSuggestTestUtils.forceSync();
  Assert.ok(
    !(await QuickSuggest.canClearDismissedSuggestions()),
    "Sanity check: canClearDismissedSuggestions should return false initially"
  );

  let changedPromise = TestUtils.topicObserved(
    "quicksuggest-dismissals-changed"
  );

  let actualResult = await getActualResult({
    providers,
    query: queries[0].query,
    expectedResult: result,
  });

  triggerCommand({
    command,
    feature,
    result: actualResult,
    expectedCountsByCall: {
      removeResult: 1,
    },
  });

  info("Awaiting dismissals-changed promise");
  await changedPromise;

  Assert.ok(
    await QuickSuggest.canClearDismissedSuggestions(),
    "canClearDismissedSuggestions should return true after triggering command"
  );
  Assert.ok(
    !UrlbarPrefs.get(pref),
    "Pref should be false after triggering command: " + pref
  );

  for (let { query } of queries) {
    info("Doing search after triggering command: " + JSON.stringify(query));
    await check_results({
      context: createContext(query, {
        providers,
        isPrivate: false,
      }),
      matches: [],
    });
  }

  let clearedPromise = TestUtils.topicObserved(
    "quicksuggest-dismissals-cleared"
  );

  info("Clearing dismissals");
  await QuickSuggest.clearDismissedSuggestions();

  // It's not necessary to await this -- awaiting `clearDismissedSuggestions()`
  // is sufficient -- but we do it to make sure the notification is sent.
  info("Awaiting dismissals-cleared promise");
  await clearedPromise;

  Assert.ok(
    !(await QuickSuggest.canClearDismissedSuggestions()),
    "canClearDismissedSuggestions should return false after clearing dismissals"
  );
  Assert.ok(
    UrlbarPrefs.get(pref),
    "Pref should be true after clearing it: " + pref
  );

  // Clearing the pref will trigger a sync, so wait for it.
  await QuickSuggestTestUtils.forceSync();

  for (let { query, expectedResults = [result] } of queries) {
    info("Doing search after clearing dismissals: " + JSON.stringify(query));
    await check_results({
      context: createContext(query, {
        providers,
        isPrivate: false,
      }),
      matches: expectedResults,
    });
  }
}

/**
 * Does a search, asserts an actual result exists that matches the given result,
 * and returns it.
 *
 * @param {object} options
 *   Options object.
 * @param {SuggestFeature} options.query
 *   The search string.
 * @param {UrlbarResult} options.expectedResult
 *   The expected result.
 * @param {string[]} [options.providers]
 *   The providers to query.
 */
async function getActualResult({
  query,
  expectedResult,
  providers = [UrlbarProviderQuickSuggest.name],
}) {
  info("Doing search to get an actual result: " + JSON.stringify(query));
  let context = createContext(query, {
    providers,
    isPrivate: false,
  });
  await check_results({
    context,
    matches: [expectedResult],
  });

  let actualResult = context.results.find(
    r =>
      r.providerName == UrlbarProviderQuickSuggest.name &&
      r.payload.provider == expectedResult.payload.provider
  );
  Assert.ok(actualResult, "Search should have returned a matching result");

  return actualResult;
}

/**
 * Queries the Rust component directly and checks the returned suggestions. The
 * point is to make sure the Rust backend passes the correct providers to the
 * Rust component depending on the types of enabled suggestions. Assuming the
 * Rust component isn't buggy, it should return suggestions only for the
 * passed-in providers.
 *
 * @param {object} options
 *   Options object
 * @param {string} options.searchString
 *   The search string.
 * @param {Array} options.tests
 *   Array of test objects: `{ prefs, expectedUrls }`
 *
 *   For each object, the given prefs are set, the Rust component is queried
 *   using the given search string, and the URLs of the returned suggestions are
 *   compared to the given expected URLs (order doesn't matter).
 *
 *   {object} prefs
 *     An object mapping pref names (relative to `browser.urlbar`) to values.
 *     These prefs will be set before querying and should be used to enable or
 *     disable particular types of suggestions.
 *   {Array} expectedUrls
 *     An array of the URLs of the suggestions that are expected to be returned.
 *     The order doesn't matter.
 */
async function doRustProvidersTests({ searchString, tests }) {
  for (let { prefs, expectedUrls } of tests) {
    info(
      "Starting Rust providers test: " + JSON.stringify({ prefs, expectedUrls })
    );

    info("Setting prefs and forcing sync");
    for (let [name, value] of Object.entries(prefs)) {
      UrlbarPrefs.set(name, value);
    }
    await QuickSuggestTestUtils.forceSync();

    info("Querying with search string: " + JSON.stringify(searchString));
    let suggestions = await QuickSuggest.rustBackend.query(searchString);
    info("Got suggestions: " + JSON.stringify(suggestions));

    Assert.deepEqual(
      suggestions.map(s => s.url).sort(),
      expectedUrls.sort(),
      "query() should return the expected suggestions (by URL)"
    );

    info("Clearing prefs and forcing sync");
    for (let name of Object.keys(prefs)) {
      UrlbarPrefs.clear(name);
    }
    await QuickSuggestTestUtils.forceSync();
  }
}

/**
 * Test for a feature's telemetry type.
 *
 * @param {object} options
 *   Options object.
 * @param {string} options.feature
 *   The feature name. e.g. "AmpSuggestions"
 * @param {Array} options.tests
 *   Array of test objects: `{ source, expected }`
 *
 *   {object} source
 *     The source of the telemetry type. e.g. "rust"
 *   {Array} expected
 *     The expected result. e.g. "adm_sponsored"
 */
async function doTelemetryTypeTest({ feature, tests }) {
  for (let { source, expected } of tests) {
    Assert.equal(
      QuickSuggest.getFeature(feature).getSuggestionTelemetryType({
        source,
      }),
      expected,
      `Telemetry type should be '${expected}'`
    );
  }
}

/**
 * Test whether the results are expected under specified conditions.
 *
 * @param {object} options
 *   Options object.
 *
 * @param {object} options.env
 *   The environment object.
 *
 *   {Array} prefs (optional)
 *     Prefs that will be used as default in entire tests.
 *     e.g. [["suggest.quicksuggest.sponsored", true]]
 *   {Array} remoteSettingRecords (optional)
 *     Dummy records of remote settings that is passed to
 *     QuickSuggestTestUtils.setRemoteSettingsRecords().
 *   {Array} merinoSuggestions (optional)
 *     Dummy merino suggestions that will be used as the Merino mock server
 *     suggestions.
 *   {Array} additionalProvider (optional)
 *     A provider that providers additional suggestions.
 *     e.g.
 *     {
 *       name: "additionalProvider",
 *       results: [new UrlbarResult(...), ...],
 *     }
 *
 * @param {Array} options.tests
 *   Array of test objects.
 *
 *   {string} description (optional)
 *     The description displayed in info() before testing.
 *   {Array} prefs (optional)
 *     Prefs that will be used in this test.
 *   {object} nimbus (optional)
 *     Nimbus variables that will be used in this test.
 *   {Array} histories (optional)
 *     Additional histories that will be passed to PlacesTestUtils.addVisits().
 *   {UrlbarQueryContext} context
 *     The query context that will be passed to check_results().
 *   {object} conditionalPayloadProperties (optional)
 *     The properties that will be passed to check_results().
 *   {Array} expected
 *     The expected results that will be passed to check_results().
 */
async function doResultCheckTest({ env, tests }) {
  // Setup
  for (let [name, value] of env?.prefs ?? []) {
    UrlbarPrefs.set(name, value);
  }

  await QuickSuggestTestUtils.setRemoteSettingsRecords(
    env?.remoteSettingRecords ?? []
  );

  if (env?.merinoSuggestions) {
    await MerinoTestUtils.server.start();
    MerinoTestUtils.server.response.body.suggestions = env.merinoSuggestions;
  }

  let additionalProviderCleanup;
  if (env?.additionalProvider) {
    let provider = new UrlbarTestUtils.TestProvider(env.additionalProvider);
    let providersManager = ProvidersManager.getInstanceForSap("urlbar");
    providersManager.registerProvider(provider);

    additionalProviderCleanup = () => {
      providersManager.unregisterProvider(provider);
    };
  }

  await QuickSuggestTestUtils.forceSync();

  // Test
  for (let {
    description,
    prefs = [],
    nimbus,
    histories,
    context,
    conditionalPayloadProperties,
    expected,
  } of tests) {
    if (description) {
      info(description);
    }
    for (let [name, value] of prefs) {
      UrlbarPrefs.set(name, value);
    }

    let cleanUpNimbus;
    if (nimbus) {
      cleanUpNimbus = await UrlbarTestUtils.initNimbusFeature(nimbus);
    }

    if (histories) {
      await PlacesTestUtils.addVisits(histories);
    }

    await check_results({
      context,
      conditionalPayloadProperties,
      matches: expected,
    });

    for (let [name] of prefs) {
      UrlbarPrefs.clear(name);
    }

    cleanUpNimbus?.();

    if (histories) {
      await PlacesUtils.history.clear();
    }
  }

  // Cleanup.
  for (let [name] of env?.prefs ?? []) {
    UrlbarPrefs.clear(name);
  }
  additionalProviderCleanup?.();
  if (env?.merinoSuggestions) {
    await MerinoTestUtils.server.stop();
  }
}

/**
 * Does show less frequently test.
 *
 * @param {object} options
 *   Options object.
 *
 * @param {object} options.env
 *   The environment object.
 *
 *   {Array} prefs (optional)
 *     Prefs that will be used as default in entire tests.
 *     e.g. [["suggest.quicksuggest.sponsored", true]]
 *   {Array} remoteSettingRecords (optional)
 *     Dummy records of remote settings that is passed to
 *     QuickSuggestTestUtils.setRemoteSettingsRecords().
 *
 * @param {object} options.feature
 *   The feature name want to test.
 *
 * @param {object} options.showLessFrequentlyCountPref
 *   The showLessFrequentlyCount preference name for the feature.
 *   e.g. "amp.showLessFrequentlyCount",
 *
 * @param {object} options.minKeywordLengthPref
 *   The minKeywordLength preference name for the feature.
 *   e.g. "amp.minKeywordLength",
 *
 * @param {Array} options.tests
 *   Array of test objects.
 *
 *   {UrlbarQueryContext} context
 *     The query context that will be passed to check_results().
 *   {number} targetIndex
 *     Index of result that will be executed the command.
 *   {object} before
 *     Expected result before executing the show less frequently command.
 *   {Array} before.results
 *     Expected results.
 *   {object} after
 *     Expected result after executing the show less frequently command.
 *   {Array} after.results
 *     Expected results.
 *   {boolean} after.canShowLessFrequently
 *     Expected canShowLessFrequently pref value.
 *   {Number} after.showLessFrequentlyCount
 *     Expected showLessFrequentlyCount pref value.
 *   {Number} after.minKeywordLength
 *     Expected minKeywordLength pref value.
 */
async function doShowLessFrequentlyTest({
  feature,
  showLessFrequentlyCountPref,
  minKeywordLengthPref,
  env,
  tests,
}) {
  // Setup
  for (let [name, value] of env?.prefs ?? []) {
    UrlbarPrefs.set(name, value);
  }

  await QuickSuggestTestUtils.setRemoteSettingsRecords(
    env?.remoteSettingRecords ?? []
  );

  UrlbarPrefs.set(showLessFrequentlyCountPref, 0);
  UrlbarPrefs.set(minKeywordLengthPref, 0);

  await QuickSuggestTestUtils.forceSync();

  // Sanity check
  let featureInstance = QuickSuggest.getFeature(feature);
  Assert.equal(featureInstance.canShowLessFrequently, true);
  Assert.equal(featureInstance.showLessFrequentlyCount, 0);

  // Test
  for (let { context, targetIndex, before, after } of tests) {
    await check_results({
      context,
      matches: before.results,
    });

    triggerCommand({
      result: context.results[targetIndex],
      feature: featureInstance,
      command: "show_less_frequently",
      searchString: context.searchString,
    });

    Assert.equal(
      featureInstance.canShowLessFrequently,
      after.canShowLessFrequently
    );
    Assert.equal(
      featureInstance.showLessFrequentlyCount,
      after.showLessFrequentlyCount
    );
    Assert.equal(UrlbarPrefs.get(minKeywordLengthPref), after.minKeywordLength);
    await check_results({
      context,
      matches: after.results,
    });
  }

  for (let [name] of env?.prefs ?? []) {
    UrlbarPrefs.clear(name);
  }

  UrlbarPrefs.clear(showLessFrequentlyCountPref);
  UrlbarPrefs.clear(minKeywordLengthPref);
  await QuickSuggestTestUtils.setConfig(QuickSuggestTestUtils.DEFAULT_CONFIG);
}

/**
 * Does dismiss test.
 *
 * @param {object} options
 *   Options object.
 *
 * @param {object} options.env
 *   The environment object.
 *
 *   {Array} prefs (optional)
 *     Prefs that will be used as default in entire tests.
 *     e.g. [["suggest.quicksuggest.sponsored", true]]
 *   {Array} remoteSettingRecords (optional)
 *     Dummy records of remote settings that is passed to
 *     QuickSuggestTestUtils.setRemoteSettingsRecords().
 *
 * @param {Array} options.tests
 *   Array of test objects.
 *
 *   {UrlbarQueryContext} context
 *     The query context that will be passed to check_results().
 *   {object} conditionalPayloadProperties (optional)
 *     The properties that will be passed to check_results().
 *   {number} targetIndex
 *     Index of result that will be executed the command.
 *   {object} before
 *     Expected result before executing the show less frequently command.
 *   {Array} before.results
 *     Expected results.
 *   {object} after
 *     Expected result after executing the show less frequently command.
 *   {Array} after.results
 *     Expected results.
 */
async function doDismissTest({ env, tests }) {
  // Setup
  for (let [name, value] of env?.prefs ?? []) {
    UrlbarPrefs.set(name, value);
  }

  await QuickSuggestTestUtils.setRemoteSettingsRecords(
    env?.remoteSettingRecords ?? []
  );

  await QuickSuggestTestUtils.forceSync();

  // Test
  for (let {
    context,
    conditionalPayloadProperties,
    targetIndex,
    before,
    after,
  } of tests) {
    await check_results({
      context,
      conditionalPayloadProperties,
      matches: before.results,
    });

    // Dismiss it.
    let target = context.results[targetIndex];
    await QuickSuggest.dismissResult(target);
    Assert.ok(
      await QuickSuggest.isResultDismissed(target),
      "isResultDismissed should return true"
    );
    Assert.ok(
      await QuickSuggest.canClearDismissedSuggestions(),
      "canClearDismissedSuggestions should return true"
    );

    // Do another search. The result shouldn't be added.
    await check_results({
      context,
      conditionalPayloadProperties,
      matches: after.results,
    });

    await QuickSuggest.clearDismissedSuggestions();
    Assert.ok(
      !(await QuickSuggest.isResultDismissed(target)),
      "isResultDismissed should return false"
    );
    Assert.ok(
      !(await QuickSuggest.canClearDismissedSuggestions()),
      "canClearDismissedSuggestions should return false"
    );
  }

  for (let [name] of env?.prefs ?? []) {
    UrlbarPrefs.clear(name);
  }
}

/**
 * Test the results that Rust backend returns.
 *
 * @param {object} options
 *   Options object.
 *
 * @param {object} options.env
 *   The environment object.
 *
 *   {Array} prefs (optional)
 *     Prefs that will be used as default in entire tests.
 *     e.g. [["suggest.quicksuggest.sponsored", true]]
 *   {Array} remoteSettingRecords (optional)
 *     Dummy records of remote settings that is passed to
 *     QuickSuggestTestUtils.setRemoteSettingsRecords().
 *
 * @param {Array} options.tests
 *   Array of test objects.
 *
 *   {Array} prefs
 *     Prefs that will be used in this test.
 *   {string} input
 *     The input query that will be passed to Rust backend.
 *   {Array} expected
 *     Expected URLs as string array.
 */
async function doRustBackendTest({ env, tests }) {
  // Setup
  for (let [name, value] of env?.prefs ?? []) {
    UrlbarPrefs.set(name, value);
  }
  await QuickSuggestTestUtils.setRemoteSettingsRecords(
    env?.remoteSettingRecords ?? []
  );
  await QuickSuggestTestUtils.forceSync();

  // Test
  for (let { prefs, input, expected } of tests) {
    for (let [name, value] of prefs) {
      UrlbarPrefs.set(name, value);
    }

    let suggestions = await QuickSuggest.rustBackend.query(input);
    Assert.deepEqual(suggestions.map(s => s.url).sort(), expected.sort());

    for (let [name] of prefs) {
      UrlbarPrefs.clear(name);
    }
  }

  for (let [name] of env?.prefs ?? []) {
    UrlbarPrefs.clear(name);
  }
  await QuickSuggestTestUtils.forceSync();
}

/**
 * Simulates performing a command for a feature by calling its `onEngagement()`.
 *
 * @param {object} options
 *   Options object.
 * @param {SuggestFeature} options.feature
 *   The feature whose command will be triggered.
 * @param {string} options.command
 *   The name of the command to trigger.
 * @param {UrlbarResult} options.result
 *   The result that the command will act on.
 * @param {string} options.searchString
 *   The search string to pass to `onEngagement()`.
 * @param {object} options.expectedCountsByCall
 *   If non-null, this should map controller and view method names to the number
 *   of times they should be called in response to the command.
 * @returns {Map}
 *   A map from names of methods on the controller and view to the number of
 *   times they were called.
 */
function triggerCommand({
  feature,
  command,
  result,
  searchString = "",
  expectedCountsByCall = null,
}) {
  info(`Calling ${feature.name}.onEngagement() to trigger command: ${command}`);

  let countsByCall = new Map();
  let addCall = name => {
    if (!countsByCall.has(name)) {
      countsByCall.set(name, 0);
    }
    countsByCall.set(name, countsByCall.get(name) + 1);
  };

  feature.onEngagement(
    // query context
    {},
    // controller
    {
      removeResult() {
        addCall("removeResult");
      },
      input: {
        startQuery() {
          addCall("startQuery");
        },
      },
      view: {
        acknowledgeFeedback() {
          addCall("acknowledgeFeedback");
        },
        invalidateResultMenuCommands() {
          addCall("invalidateResultMenuCommands");
        },
      },
    },
    // details
    { result, selType: command },
    searchString
  );

  if (expectedCountsByCall) {
    for (let [name, expectedCount] of Object.entries(expectedCountsByCall)) {
      Assert.equal(
        countsByCall.get(name) ?? 0,
        expectedCount,
        "Function should have been called the expected number of times: " + name
      );
    }
  }

  return countsByCall;
}
