/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

import {
  CONTEXTUAL_SERVICES_PING_TYPES,
  PartnerLinkAttribution,
} from "resource:///modules/PartnerLinkAttribution.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  QuickSuggest: "resource:///modules/QuickSuggest.sys.mjs",
  SearchUtils: "resource://gre/modules/SearchUtils.sys.mjs",
  TelemetryTestUtils: "resource://testing-common/TelemetryTestUtils.sys.mjs",
  TestUtils: "resource://testing-common/TestUtils.sys.mjs",
  UrlbarPrefs: "resource:///modules/UrlbarPrefs.sys.mjs",
  UrlbarProviderQuickSuggest:
    "resource:///modules/UrlbarProviderQuickSuggest.sys.mjs",
  UrlbarUtils: "resource:///modules/UrlbarUtils.sys.mjs",
  setTimeout: "resource://gre/modules/Timer.sys.mjs",
});

XPCOMUtils.defineLazyModuleGetters(lazy, {
  ExperimentAPI: "resource://nimbus/ExperimentAPI.jsm",
  ExperimentFakes: "resource://testing-common/NimbusTestUtils.jsm",
  NimbusFeatures: "resource://nimbus/ExperimentAPI.jsm",
  sinon: "resource://testing-common/Sinon.jsm",
});

let gTestScope;

// Test utils singletons need special handling. Since they are uninitialized in
// cleanup functions, they must be re-initialized on each new test. That does
// not happen automatically inside system modules like this one because system
// module lifetimes are the app's lifetime, unlike individual browser chrome and
// xpcshell tests.
/* eslint-disable mozilla/valid-lazy */
Object.defineProperty(lazy, "UrlbarTestUtils", {
  get: () => {
    if (!lazy._UrlbarTestUtils) {
      const { UrlbarTestUtils: module } = ChromeUtils.importESModule(
        "resource://testing-common/UrlbarTestUtils.sys.mjs"
      );
      module.init(gTestScope);
      gTestScope.registerCleanupFunction(() => {
        module.uninit();
        // Make sure the utils are re-initialized during the next test.
        lazy._UrlbarTestUtils = null;
      });
      lazy._UrlbarTestUtils = module;
    }
    return lazy._UrlbarTestUtils;
  },
});

// Test utils singletons need special handling. Since they are uninitialized in
// cleanup functions, they must be re-initialized on each new test. That does
// not happen automatically inside system modules like this one because system
// module lifetimes are the app's lifetime, unlike individual browser chrome and
// xpcshell tests.
/* eslint-disable mozilla/valid-lazy */
Object.defineProperty(lazy, "MerinoTestUtils", {
  get: () => {
    if (!lazy._MerinoTestUtils) {
      const { MerinoTestUtils: module } = ChromeUtils.importESModule(
        "resource://testing-common/MerinoTestUtils.sys.mjs"
      );
      module.init(gTestScope);
      gTestScope.registerCleanupFunction(() => {
        // Make sure the utils are re-initialized during the next test.
        lazy._MerinoTestUtils = null;
      });
      lazy._MerinoTestUtils = module;
    }
    return lazy._MerinoTestUtils;
  },
});

const DEFAULT_CONFIG = {
  best_match: {
    blocked_suggestion_ids: [],
    min_search_string_length: 4,
  },
};

const DEFAULT_PING_PAYLOADS = {
  [CONTEXTUAL_SERVICES_PING_TYPES.QS_BLOCK]: {
    advertiser: "testadvertiser",
    block_id: 1,
    context_id: () => actual => !!actual,
    iab_category: "22 - Shopping",
    improve_suggest_experience_checked: false,
    match_type: "firefox-suggest",
    request_id: null,
    source: "remote-settings",
  },
  [CONTEXTUAL_SERVICES_PING_TYPES.QS_SELECTION]: {
    advertiser: "testadvertiser",
    block_id: 1,
    context_id: () => actual => !!actual,
    improve_suggest_experience_checked: false,
    match_type: "firefox-suggest",
    reporting_url: "https://example.com/click",
    request_id: null,
    source: "remote-settings",
  },
  [CONTEXTUAL_SERVICES_PING_TYPES.QS_IMPRESSION]: {
    advertiser: "testadvertiser",
    block_id: 1,
    context_id: () => actual => !!actual,
    improve_suggest_experience_checked: false,
    is_clicked: false,
    match_type: "firefox-suggest",
    reporting_url: "https://example.com/impression",
    request_id: null,
    source: "remote-settings",
  },
};

// The following properties and methods are copied from the test scope to the
// test utils object so they can be easily accessed. Be careful about assuming a
// particular property will be defined because depending on the scope -- browser
// test or xpcshell test -- some may not be.
const TEST_SCOPE_PROPERTIES = [
  "Assert",
  "EventUtils",
  "info",
  "registerCleanupFunction",
];

/**
 * Test utils for quick suggest.
 */
class _QuickSuggestTestUtils {
  /**
   * Initializes the utils.
   *
   * @param {object} scope
   *   The global JS scope where tests are being run. This allows the instance
   *   to access test helpers like `Assert` that are available in the scope.
   */
  init(scope) {
    if (!scope) {
      throw new Error("QuickSuggestTestUtils() must be called with a scope");
    }
    gTestScope = scope;
    for (let p of TEST_SCOPE_PROPERTIES) {
      this[p] = scope[p];
    }
    // If you add other properties to `this`, null them in `uninit()`.

    Services.telemetry.clearScalars();

    scope.registerCleanupFunction?.(() => this.uninit());
  }

  /**
   * Uninitializes the utils. If they were created with a test scope that
   * defines `registerCleanupFunction()`, you don't need to call this yourself
   * because it will automatically be called as a cleanup function. Otherwise
   * you'll need to call this.
   */
  uninit() {
    gTestScope = null;
    for (let p of TEST_SCOPE_PROPERTIES) {
      this[p] = null;
    }
    Services.telemetry.clearScalars();
  }

  get DEFAULT_CONFIG() {
    // Return a clone so callers can modify it.
    return Cu.cloneInto(DEFAULT_CONFIG, this);
  }

  /**
   * Waits for quick suggest initialization to finish, ensures its data will not
   * be updated again during the test, and also optionally sets it up with mock
   * suggestions.
   *
   * @param {object} options
   *   Options object
   * @param {Array} options.remoteSettingsResults
   *   Array of remote settings result objects. If not given, no suggestions
   *   will be present in remote settings.
   * @param {Array} options.merinoSuggestions
   *   Array of Merino suggestion objects. If given, this function will start
   *   the mock Merino server and set `quicksuggest.dataCollection.enabled` to
   *   true so that `UrlbarProviderQuickSuggest` will fetch suggestions from it.
   *   Otherwise Merino will not serve suggestions, but you can still set up
   *   Merino without using this function by using `MerinoTestUtils` directly.
   * @param {object} options.config
   *   The quick suggest configuration object.
   * @returns {Function}
   *   A cleanup function. You only need to call this function if you're in a
   *   browser chrome test and you did not also call `init`. You can ignore it
   *   otherwise.
   */
  async ensureQuickSuggestInit({
    remoteSettingsResults = null,
    merinoSuggestions = null,
    config = DEFAULT_CONFIG,
  } = {}) {
    this.info?.("ensureQuickSuggestInit calling QuickSuggest.init()");
    lazy.QuickSuggest.init();

    this.info?.("ensureQuickSuggestInit awaiting remoteSettings.readyPromise");
    let { remoteSettings } = lazy.QuickSuggest;
    await remoteSettings.readyPromise;
    this.info?.(
      "ensureQuickSuggestInit done awaiting remoteSettings.readyPromise"
    );

    this.setConfig(config);

    // Set up the remote settings client. Ignore remote settings syncs that
    // occur during the test. Clear its results and add the test results.
    remoteSettings._test_ignoreSettingsSync = true;
    remoteSettings._test_resultsByKeyword.clear();
    if (remoteSettingsResults) {
      this.info?.("ensureQuickSuggestInit adding remote settings results");
      await remoteSettings._test_addResults(remoteSettingsResults);
      this.info?.("ensureQuickSuggestInit done adding remote settings results");
    }

    // Set up Merino.
    if (merinoSuggestions) {
      this.info?.("ensureQuickSuggestInit setting up Merino server");
      await lazy.MerinoTestUtils.server.start();
      lazy.MerinoTestUtils.server.response.body.suggestions = merinoSuggestions;
      lazy.UrlbarPrefs.set("quicksuggest.dataCollection.enabled", true);
      this.info?.("ensureQuickSuggestInit done setting up Merino server");
    }

    let cleanup = async () => {
      this.info?.("ensureQuickSuggestInit starting cleanup");
      this.setConfig(DEFAULT_CONFIG);
      delete remoteSettings._test_ignoreSettingsSync;
      remoteSettings._test_resultsByKeyword.clear();
      if (merinoSuggestions) {
        lazy.UrlbarPrefs.clear("quicksuggest.dataCollection.enabled");
      }
      this.info?.("ensureQuickSuggestInit finished cleanup");
    };
    this.registerCleanupFunction?.(cleanup);

    return cleanup;
  }

  /**
   * Clears the current remote settings results and adds a new set of results.
   * This can be used to add remote settings results after
   * `ensureQuickSuggestInit()` has been called.
   *
   * @param {Array} results
   *   Array of remote settings result objects.
   */
  async setRemoteSettingsResults(results) {
    let { remoteSettings } = lazy.QuickSuggest;
    remoteSettings._test_resultsByKeyword.clear();
    await remoteSettings._test_addResults(results);
  }

  /**
   * Sets the quick suggest configuration. You should call this again with
   * `DEFAULT_CONFIG` before your test finishes. See also `withConfig()`.
   *
   * @param {object} config
   *   The config to be applied. See
   *   {@link QuickSuggestRemoteSettingsClient._setConfig}
   */
  setConfig(config) {
    lazy.QuickSuggest.remoteSettings._test_setConfig(config);
  }

  /**
   * Sets the quick suggest configuration, calls your callback, and restores the
   * default configuration.
   *
   * @param {object} options
   *   The options object.
   * @param {object} options.config
   *   The configuration that should be used with the callback
   * @param {Function} options.callback
   *   Will be called with the configuration applied
   *
   * @see {@link setConfig}
   */
  async withConfig({ config, callback }) {
    this.setConfig(config);
    await callback();
    this.setConfig(DEFAULT_CONFIG);
  }

  /**
   * Sets the Firefox Suggest scenario and waits for prefs to be updated.
   *
   * @param {string} scenario
   *   Pass falsey to reset the scenario to the default.
   */
  async setScenario(scenario) {
    // If we try to set the scenario before a previous update has finished,
    // `updateFirefoxSuggestScenario` will bail, so wait.
    await this.waitForScenarioUpdated();
    await lazy.UrlbarPrefs.updateFirefoxSuggestScenario({ scenario });
  }

  /**
   * Waits for any prior scenario update to finish.
   */
  async waitForScenarioUpdated() {
    await lazy.TestUtils.waitForCondition(
      () => !lazy.UrlbarPrefs.updatingFirefoxSuggestScenario,
      "Waiting for updatingFirefoxSuggestScenario to be false"
    );
  }

  /**
   * Asserts a result is a quick suggest result.
   *
   * @param {object} [options]
   *   The options object.
   * @param {string} options.url
   *   The expected URL. At least one of `url` and `originalUrl` must be given.
   * @param {string} options.originalUrl
   *   The expected original URL (the URL with an unreplaced timestamp
   *   template). At least one of `url` and `originalUrl` must be given.
   * @param {object} options.window
   *   The window that should be used for this assertion
   * @param {number} [options.index]
   *   The expected index of the quick suggest result. Pass -1 to use the index
   *   of the last result.
   * @param {boolean} [options.isSponsored]
   *   Whether the result is expected to be sponsored.
   * @param {boolean} [options.isBestMatch]
   *   Whether the result is expected to be a best match.
   * @returns {result}
   *   The quick suggest result.
   */
  async assertIsQuickSuggest({
    url,
    originalUrl,
    window,
    index = -1,
    isSponsored = true,
    isBestMatch = false,
  } = {}) {
    this.Assert.ok(
      url || originalUrl,
      "At least one of url and originalUrl is specified"
    );

    if (index < 0) {
      let resultCount = lazy.UrlbarTestUtils.getResultCount(window);
      if (isBestMatch) {
        index = 1;
        this.Assert.greater(
          resultCount,
          1,
          "Sanity check: Result count should be > 1"
        );
      } else {
        index = resultCount - 1;
        this.Assert.greater(
          resultCount,
          0,
          "Sanity check: Result count should be > 0"
        );
      }
    }

    let details = await lazy.UrlbarTestUtils.getDetailsOfResultAt(
      window,
      index
    );
    let { result } = details;

    this.info?.(
      `Checking actual result at index ${index}: ` + JSON.stringify(result)
    );

    this.Assert.equal(
      result.providerName,
      "UrlbarProviderQuickSuggest",
      "Result provider name is UrlbarProviderQuickSuggest"
    );
    this.Assert.equal(details.type, lazy.UrlbarUtils.RESULT_TYPE.URL);
    this.Assert.equal(details.isSponsored, isSponsored, "Result isSponsored");
    if (url) {
      this.Assert.equal(details.url, url, "Result URL");
    }
    if (originalUrl) {
      this.Assert.equal(
        result.payload.originalUrl,
        originalUrl,
        "Result original URL"
      );
    }

    this.Assert.equal(!!result.isBestMatch, isBestMatch, "Result isBestMatch");

    let { row } = details.element;

    let sponsoredElement = isBestMatch
      ? row._elements.get("bottom")
      : row._elements.get("action");
    this.Assert.ok(sponsoredElement, "Result sponsored label element exists");
    this.Assert.equal(
      sponsoredElement.textContent,
      isSponsored ? "Sponsored" : "",
      "Result sponsored label"
    );

    this.Assert.equal(
      result.payload.helpUrl,
      lazy.QuickSuggest.HELP_URL,
      "Result helpURL"
    );

    if (lazy.UrlbarPrefs.get("resultMenu")) {
      this.Assert.ok(
        row._buttons.get("menu"),
        "The menu button should be present"
      );
    } else {
      let helpButton = row._buttons.get("help");
      this.Assert.ok(helpButton, "The help button should be present");

      let blockButton = row._buttons.get("block");
      if (!isBestMatch) {
        this.Assert.equal(
          !!blockButton,
          lazy.UrlbarPrefs.get("quickSuggestBlockingEnabled"),
          "The block button is present iff quick suggest blocking is enabled"
        );
      } else {
        this.Assert.equal(
          !!blockButton,
          lazy.UrlbarPrefs.get("bestMatchBlockingEnabled"),
          "The block button is present iff best match blocking is enabled"
        );
      }
    }

    return details;
  }

  /**
   * Asserts a result is not a quick suggest result.
   *
   * @param {object} window
   *   The window that should be used for this assertion
   * @param {number} index
   *   The index of the result.
   */
  async assertIsNotQuickSuggest(window, index) {
    let details = await lazy.UrlbarTestUtils.getDetailsOfResultAt(
      window,
      index
    );
    this.Assert.notEqual(
      details.result.providerName,
      "UrlbarProviderQuickSuggest",
      `Result at index ${index} is not provided by UrlbarProviderQuickSuggest`
    );
  }

  /**
   * Asserts that none of the results are quick suggest results.
   *
   * @param {object} window
   *   The window that should be used for this assertion
   */
  async assertNoQuickSuggestResults(window) {
    for (let i = 0; i < lazy.UrlbarTestUtils.getResultCount(window); i++) {
      await this.assertIsNotQuickSuggest(window, i);
    }
  }

  /**
   * Checks the values of all the quick suggest telemetry scalars.
   *
   * @param {object} expectedIndexesByScalarName
   *   Maps scalar names to the expected 1-based indexes of results. If you
   *   expect a scalar to be incremented, then include it in this object. If you
   *   expect a scalar not to be incremented, don't include it.
   */
  assertScalars(expectedIndexesByScalarName) {
    let scalars = lazy.TelemetryTestUtils.getProcessScalars(
      "parent",
      true,
      true
    );
    for (let scalarName of Object.values(
      lazy.UrlbarProviderQuickSuggest.TELEMETRY_SCALARS
    )) {
      if (scalarName in expectedIndexesByScalarName) {
        lazy.TelemetryTestUtils.assertKeyedScalar(
          scalars,
          scalarName,
          expectedIndexesByScalarName[scalarName],
          1
        );
      } else {
        this.Assert.ok(
          !(scalarName in scalars),
          "Scalar should not be present: " + scalarName
        );
      }
    }
  }

  /**
   * Checks quick suggest telemetry events. This is the same as
   * `TelemetryTestUtils.assertEvents()` except it filters in only quick suggest
   * events by default. If you are expecting events that are not in the quick
   * suggest category, use `TelemetryTestUtils.assertEvents()` directly or pass
   * in a filter override for `category`.
   *
   * @param {Array} expectedEvents
   *   List of expected telemetry events.
   * @param {object} filterOverrides
   *   Extra properties to set in the filter object.
   * @param {object} options
   *   The options object to pass to `TelemetryTestUtils.assertEvents()`.
   */
  assertEvents(expectedEvents, filterOverrides = {}, options = undefined) {
    lazy.TelemetryTestUtils.assertEvents(
      expectedEvents,
      {
        category: lazy.QuickSuggest.TELEMETRY_EVENT_CATEGORY,
        ...filterOverrides,
      },
      options
    );
  }

  /**
   * Creates a `sinon.sandbox` and `sinon.spy` that can be used to instrument
   * the quick suggest custom telemetry pings. If `init` was called with a test
   * scope where `registerCleanupFunction` is defined, the sandbox will
   * automically be restored at the end of the test.
   *
   * @returns {object}
   *   An object: { sandbox, spy, spyCleanup }
   *   `spyCleanup` is a cleanup function that should be called if you're in a
   *   browser chrome test and you did not also call `init`, or if you need to
   *   remove the spy before the test ends for some other reason. You can ignore
   *   it otherwise.
   */
  createTelemetryPingSpy() {
    let sandbox = lazy.sinon.createSandbox();
    let spy = sandbox.spy(
      PartnerLinkAttribution._pingCentre,
      "sendStructuredIngestionPing"
    );
    let spyCleanup = () => sandbox.restore();
    this.registerCleanupFunction?.(spyCleanup);
    return { sandbox, spy, spyCleanup };
  }

  /**
   * Asserts that custom telemetry pings are recorded in the order they appear
   * in the given `pings` array and that no other pings are recorded.
   *
   * @param {object} spy
   *   A `sinon.spy` object. See `createTelemetryPingSpy()`. This method resets
   *   the spy before returning.
   * @param {Array} pings
   *   The expected pings in the order they are expected to be recorded. Each
   *   item in this array should be an object: `{ type, payload }`
   *
   *   {string} type
   *     The ping's expected type, one of the `CONTEXTUAL_SERVICES_PING_TYPES`
   *     values.
   *   {object} payload
   *     The ping's expected payload. For convenience, you can leave out
   *     properties whose values are expected to be the default values defined
   *     in `DEFAULT_PING_PAYLOADS`.
   */
  assertPings(spy, pings) {
    let calls = spy.getCalls();
    this.Assert.equal(
      calls.length,
      pings.length,
      "Expected number of ping calls"
    );

    for (let i = 0; i < pings.length; i++) {
      let ping = pings[i];
      this.info?.(
        `Checking ping at index ${i}, expected is: ` + JSON.stringify(ping)
      );

      // Add default properties to the expected payload for any that aren't
      // already defined.
      let { type, payload } = ping;
      let defaultPayload = DEFAULT_PING_PAYLOADS[type];
      this.Assert.ok(
        defaultPayload,
        `Sanity check: Default payload exists for type: ${type}`
      );
      payload = { ...defaultPayload, ...payload };

      // Check the endpoint URL.
      let call = calls[i];
      let endpointURL = call.args[1];
      this.Assert.ok(
        endpointURL.includes(type),
        `Endpoint URL corresponds to the expected ping type: ${type}`
      );

      // Check the payload.
      let actualPayload = call.args[0];
      this._assertPingPayload(actualPayload, payload);
    }

    spy.resetHistory();
  }

  /**
   * Helper for checking contextual services ping payloads.
   *
   * @param {object} actualPayload
   *   The actual payload in the ping.
   * @param {object} expectedPayload
   *   An object describing the expected payload. Non-function values in this
   *   object are checked for equality against the corresponding actual payload
   *   values. Function values are called and passed the corresponding actual
   *   values and should return true if the actual values are correct.
   */
  _assertPingPayload(actualPayload, expectedPayload) {
    this.info?.(
      "Checking ping payload. Actual: " +
        JSON.stringify(actualPayload) +
        " -- Expected (excluding function properties): " +
        JSON.stringify(expectedPayload)
    );

    this.Assert.equal(
      Object.entries(actualPayload).length,
      Object.entries(expectedPayload).length,
      "Payload has expected number of properties"
    );

    for (let [key, expectedValue] of Object.entries(expectedPayload)) {
      let actualValue = actualPayload[key];
      if (typeof expectedValue == "function") {
        this.Assert.ok(expectedValue(actualValue), "Payload property: " + key);
      } else {
        this.Assert.equal(
          actualValue,
          expectedValue,
          "Payload property: " + key
        );
      }
    }
  }

  /**
   * Asserts that URLs in a result's payload have the timestamp template
   * substring replaced with real timestamps.
   *
   * @param {UrlbarResult} result The results to check
   * @param {object} urls
   *   An object that contains the expected payload properties with template
   *   substrings. For example:
   *   ```js
   *   {
   *     url: "http://example.com/foo-%YYYYMMDDHH%",
   *     sponsoredClickUrl: "http://example.com/bar-%YYYYMMDDHH%",
   *   }
   *   ```
   */
  assertTimestampsReplaced(result, urls) {
    let { TIMESTAMP_TEMPLATE, TIMESTAMP_LENGTH } = lazy.QuickSuggest;

    // Parse the timestamp strings from each payload property and save them in
    // `urls[key].timestamp`.
    urls = { ...urls };
    for (let [key, url] of Object.entries(urls)) {
      let index = url.indexOf(TIMESTAMP_TEMPLATE);
      this.Assert.ok(
        index >= 0,
        `Timestamp template ${TIMESTAMP_TEMPLATE} is in URL ${url} for key ${key}`
      );
      let value = result.payload[key];
      this.Assert.ok(value, "Key is in result payload: " + key);
      let timestamp = value.substring(index, index + TIMESTAMP_LENGTH);

      // Set `urls[key]` to an object that's helpful in the logged info message
      // below.
      urls[key] = { url, value, timestamp };
    }

    this.info?.("Parsed timestamps: " + JSON.stringify(urls));

    // Make a set of unique timestamp strings. There should only be one.
    let { timestamp } = Object.values(urls)[0];
    this.Assert.deepEqual(
      [...new Set(Object.values(urls).map(o => o.timestamp))],
      [timestamp],
      "There's only one unique timestamp string"
    );

    // Parse the parts of the timestamp string.
    let year = timestamp.slice(0, -6);
    let month = timestamp.slice(-6, -4);
    let day = timestamp.slice(-4, -2);
    let hour = timestamp.slice(-2);
    let date = new Date(year, month - 1, day, hour);

    // The timestamp should be no more than two hours in the past. Typically it
    // will be the same as the current hour, but since its resolution is in
    // terms of hours and it's possible the test may have crossed over into a
    // new hour as it was running, allow for the previous hour.
    this.Assert.less(
      Date.now() - 2 * 60 * 60 * 1000,
      date.getTime(),
      "Timestamp is within the past two hours"
    );
  }

  /**
   * Calls a callback while enrolled in a mock Nimbus experiment. The experiment
   * is automatically unenrolled and cleaned up after the callback returns.
   *
   * @param {object} options
   *   Options for the mock experiment.
   * @param {Function} options.callback
   *   The callback to call while enrolled in the mock experiment.
   * @param {object} options.options
   *   See {@link enrollExperiment}.
   */
  async withExperiment({ callback, ...options }) {
    let doExperimentCleanup = await this.enrollExperiment(options);
    await callback();
    await doExperimentCleanup();
  }

  /**
   * Enrolls in a mock Nimbus experiment.
   *
   * @param {object} options
   *   Options for the mock experiment.
   * @param {object} [options.valueOverrides]
   *   Values for feature variables.
   * @returns {Promise<Function>}
   *   The experiment cleanup function (async).
   */
  async enrollExperiment({ valueOverrides = {} }) {
    this.info?.("Awaiting ExperimentAPI.ready");
    await lazy.ExperimentAPI.ready();

    // Wait for any prior scenario updates to finish. If updates are ongoing,
    // UrlbarPrefs will ignore the Nimbus update when the experiment is
    // installed. This shouldn't be a problem in practice because in reality
    // scenario updates are triggered only on app startup and Nimbus
    // enrollments, but tests can trigger lots of updates back to back.
    await this.waitForScenarioUpdated();

    let doExperimentCleanup = await lazy.ExperimentFakes.enrollWithFeatureConfig(
      {
        enabled: true,
        featureId: "urlbar",
        value: valueOverrides,
      }
    );

    // Wait for the pref updates triggered by the experiment enrollment.
    this.info?.("Awaiting update after enrolling in experiment");
    await this.waitForScenarioUpdated();

    return async () => {
      this.info?.("Awaiting experiment cleanup");
      await doExperimentCleanup();

      // The same pref updates will be triggered by unenrollment, so wait for
      // them again.
      this.info?.("Awaiting update after unenrolling in experiment");
      await this.waitForScenarioUpdated();
    };
  }

  /**
   * Clears the Nimbus exposure event.
   */
  async clearExposureEvent() {
    // Exposure event recording is queued to the idle thread, so wait for idle
    // before we start so any events from previous tasks will have been recorded
    // and won't interfere with this task.
    await new Promise(resolve => Services.tm.idleDispatchToMainThread(resolve));

    Services.telemetry.clearEvents();
    lazy.NimbusFeatures.urlbar._didSendExposureEvent = false;
    lazy.QuickSuggest._recordedExposureEvent = false;
  }

  /**
   * Asserts the Nimbus exposure event is recorded or not as expected.
   *
   * @param {boolean} expectedRecorded
   *   Whether the event is expected to be recorded.
   */
  async assertExposureEvent(expectedRecorded) {
    this.Assert.equal(
      lazy.QuickSuggest._recordedExposureEvent,
      expectedRecorded,
      "_recordedExposureEvent is correct"
    );

    let filter = {
      category: "normandy",
      method: "expose",
      object: "nimbus_experiment",
    };

    let expectedEvents = [];
    if (expectedRecorded) {
      expectedEvents.push({
        ...filter,
        extra: {
          branchSlug: "control",
          featureId: "urlbar",
        },
      });
    }

    // The event recording is queued to the idle thread when the search starts,
    // so likewise queue the assert to idle instead of doing it immediately.
    await new Promise(resolve => {
      Services.tm.idleDispatchToMainThread(() => {
        lazy.TelemetryTestUtils.assertEvents(expectedEvents, filter);
        resolve();
      });
    });
  }

  /**
   * Sets the app's locales, calls your callback, and resets locales.
   *
   * @param {Array} locales
   *   An array of locale strings. The entire array will be set as the available
   *   locales, and the first locale in the array will be set as the requested
   *   locale.
   * @param {Function} callback
   *  The callback to be called with the {@link locales} set. This function can
   *  be async.
   */
  async withLocales(locales, callback) {
    let promiseChanges = async desiredLocales => {
      this.info?.(
        "Changing locales from " +
          JSON.stringify(Services.locale.requestedLocales) +
          " to " +
          JSON.stringify(desiredLocales)
      );

      if (desiredLocales[0] == Services.locale.requestedLocales[0]) {
        // Nothing happens when the locale doesn't actually change.
        return;
      }

      this.info?.("Waiting for intl:requested-locales-changed");
      await lazy.TestUtils.topicObserved("intl:requested-locales-changed");
      this.info?.("Observed intl:requested-locales-changed");

      // Wait for the search service to reload engines. Otherwise tests can fail
      // in strange ways due to internal search service state during shutdown.
      // It won't always reload engines but it's hard to tell in advance when it
      // won't, so also set a timeout.
      this.info?.("Waiting for TOPIC_SEARCH_SERVICE");
      await Promise.race([
        lazy.TestUtils.topicObserved(
          lazy.SearchUtils.TOPIC_SEARCH_SERVICE,
          (subject, data) => {
            this.info?.("Observed TOPIC_SEARCH_SERVICE with data: " + data);
            return data == "engines-reloaded";
          }
        ),
        new Promise(resolve => {
          lazy.setTimeout(() => {
            this.info?.("Timed out waiting for TOPIC_SEARCH_SERVICE");
            resolve();
          }, 2000);
        }),
      ]);

      this.info?.("Done waiting for locale changes");
    };

    let available = Services.locale.availableLocales;
    let requested = Services.locale.requestedLocales;

    let newRequested = locales.slice(0, 1);
    let promise = promiseChanges(newRequested);
    Services.locale.availableLocales = locales;
    Services.locale.requestedLocales = newRequested;
    await promise;

    this.Assert.equal(
      Services.locale.appLocaleAsBCP47,
      locales[0],
      "App locale is now " + locales[0]
    );

    await callback();

    promise = promiseChanges(requested);
    Services.locale.availableLocales = available;
    Services.locale.requestedLocales = requested;
    await promise;
  }
}

export var QuickSuggestTestUtils = new _QuickSuggestTestUtils();
