/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

let sandbox;

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/browser/components/urlbar/tests/browser/head-common.js",
  this
);

ChromeUtils.defineESModuleGetters(this, {
  CONTEXTUAL_SERVICES_PING_TYPES:
    "resource:///modules/PartnerLinkAttribution.sys.mjs",
  QuickSuggest: "resource:///modules/QuickSuggest.sys.mjs",
  TelemetryTestUtils: "resource://testing-common/TelemetryTestUtils.sys.mjs",
  UrlbarProviderQuickSuggest:
    "resource:///modules/UrlbarProviderQuickSuggest.sys.mjs",
});

ChromeUtils.defineLazyGetter(this, "QuickSuggestTestUtils", () => {
  const { QuickSuggestTestUtils: module } = ChromeUtils.importESModule(
    "resource://testing-common/QuickSuggestTestUtils.sys.mjs"
  );
  module.init(this);
  return module;
});

ChromeUtils.defineLazyGetter(this, "MerinoTestUtils", () => {
  const { MerinoTestUtils: module } = ChromeUtils.importESModule(
    "resource://testing-common/MerinoTestUtils.sys.mjs"
  );
  module.init(this);
  return module;
});

ChromeUtils.defineLazyGetter(this, "PlacesFrecencyRecalculator", () => {
  return Cc["@mozilla.org/places/frecency-recalculator;1"].getService(
    Ci.nsIObserver
  ).wrappedJSObject;
});

registerCleanupFunction(async () => {
  // Ensure the popup is always closed at the end of each test to avoid
  // interfering with the next test.
  await UrlbarTestUtils.promisePopupClose(window);
});

/**
 * Updates the Top Sites feed.
 *
 * @param {Function} condition
 *   A callback that returns true after Top Sites are successfully updated.
 * @param {boolean} searchShortcuts
 *   True if Top Sites search shortcuts should be enabled.
 */
async function updateTopSites(condition, searchShortcuts = false) {
  // Toggle the pref to clear the feed cache and force an update.
  await SpecialPowers.pushPrefEnv({
    set: [
      [
        "browser.newtabpage.activity-stream.discoverystream.endpointSpocsClear",
        "",
      ],
      ["browser.newtabpage.activity-stream.feeds.system.topsites", false],
      ["browser.newtabpage.activity-stream.feeds.system.topsites", true],
      [
        "browser.newtabpage.activity-stream.improvesearch.topSiteSearchShortcuts",
        searchShortcuts,
      ],
    ],
  });

  // Wait for the feed to be updated.
  await TestUtils.waitForCondition(() => {
    let sites = AboutNewTab.getTopSites();
    return condition(sites);
  }, "Waiting for top sites to be updated");
}

/**
 * Call this in your setup task if you use `doTelemetryTest()`.
 *
 * @param {object} options
 *   Options
 * @param {Array} options.remoteSettingsRecords
 *   See `QuickSuggestTestUtils.ensureQuickSuggestInit()`.
 * @param {Array} options.merinoSuggestions
 *   See `QuickSuggestTestUtils.ensureQuickSuggestInit()`.
 * @param {Array} options.config
 *   See `QuickSuggestTestUtils.ensureQuickSuggestInit()`.
 */
async function setUpTelemetryTest({
  remoteSettingsRecords,
  merinoSuggestions = null,
  config = QuickSuggestTestUtils.DEFAULT_CONFIG,
}) {
  await SpecialPowers.pushPrefEnv({
    set: [
      // Switch-to-tab results can sometimes appear after the test clicks a help
      // button and closes the new tab, which interferes with the expected
      // indexes of quick suggest results, so disable them.
      ["browser.urlbar.suggest.openpage", false],
      // Disable the persisted-search-terms search tip because it can interfere.
      ["browser.urlbar.tipShownCount.searchTip_persist", 999],
    ],
  });

  await PlacesUtils.history.clear();
  await PlacesUtils.bookmarks.eraseEverything();
  await UrlbarTestUtils.formHistory.clear();

  // Add a mock engine so we don't hit the network.
  await SearchTestUtils.installSearchExtension({}, { setAsDefault: true });

  await QuickSuggestTestUtils.ensureQuickSuggestInit({
    remoteSettingsRecords,
    merinoSuggestions,
    config,
  });
}

/**
 * Main entry point for testing primary telemetry for quick suggest suggestions:
 * impressions, clicks, helps, and blocks. This can be used to declaratively
 * test all primary telemetry for any suggestion type.
 *
 * @param {object} options
 *   Options
 * @param {number} options.index
 *   The expected index of the suggestion in the results list.
 * @param {object} options.suggestion
 *   The suggestion being tested.
 * @param {object} options.impressionOnly
 *   An object describing the expected impression-only telemetry, i.e.,
 *   telemetry recorded when an impression occurs but not a click. It must have
 *   the following properties:
 *     {object} scalars
 *       An object that maps expected scalar names to values.
 *     {object} event
 *       The expected recorded event.
 *     {object} ping
 *       The expected recorded custom telemetry ping. If no ping is expected,
 *       leave this undefined or pass null.
 * @param {object} options.click
 *   An object describing the expected click telemetry. It must have the same
 *   properties as `impressionOnly` except `ping` must be `pings` (plural), an
 *   array of expected pings.
 * @param {Array} options.commands
 *   Each element in this array is an object that describes the expected
 *   telemetry for a result menu command. Each object must have the following
 *   properties:
 *     {string|Array} command
 *       A command name or array; this is passed directly to
 *       `UrlbarTestUtils.openResultMenuAndClickItem()` as the `commandOrArray`
 *       arg, so see its documentation for details.
 *     {object} scalars
 *       An object that maps expected scalar names to values.
 *     {object} event
 *       The expected recorded event.
 *     {Array} pings
 *       A list of expected recorded custom telemetry pings. If no pings are
 *       expected, pass an empty array.
 * @param {string} options.providerName
 *   The name of the provider that is expected to create the UrlbarResult for
 *   the suggestion.
 * @param {Function} options.teardown
 *   If given, this function will be called after each selectable test. If
 *   picking an element causes side effects that need to be cleaned up before
 *   starting the next selectable test, they can be cleaned up here.
 * @param {Function} options.showSuggestion
 *   This function should open the view and show the suggestion.
 */
async function doTelemetryTest({
  index,
  suggestion,
  impressionOnly,
  click,
  commands,
  providerName = UrlbarProviderQuickSuggest.name,
  teardown = null,
  showSuggestion = () =>
    UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      // If the suggestion object is a remote settings result, it will have a
      // `keywords` property. Otherwise the suggestion object must be a Merino
      // suggestion, and the search string doesn't matter in that case because
      // the mock Merino server will be set up to return suggestions regardless.
      value: suggestion.keywords?.[0] || "test",
      fireInputEvent: true,
    }),
}) {
  Services.telemetry.clearScalars();
  Services.telemetry.clearEvents();

  await doImpressionOnlyTest({
    index,
    suggestion,
    providerName,
    showSuggestion,
    expected: impressionOnly,
  });

  await doClickTest({
    suggestion,
    providerName,
    showSuggestion,
    index,
    expected: click,
  });

  for (let command of commands) {
    await doCommandTest({
      suggestion,
      providerName,
      showSuggestion,
      index,
      commandOrArray: command.command,
      expected: command,
    });

    if (teardown) {
      info("Calling teardown");
      await teardown();
      info("Finished teardown");
    }
  }
}

/**
 * Helper for `doTelemetryTest()` that does an impression-only test.
 *
 * @param {object} options
 *   Options
 * @param {number} options.index
 *   The expected index of the suggestion in the results list.
 * @param {object} options.suggestion
 *   The suggestion being tested.
 * @param {string} options.providerName
 *   The name of the provider that is expected to create the UrlbarResult for
 *   the suggestion.
 * @param {object} options.expected
 *   An object describing the expected impression-only telemetry. It must have
 *   the following properties:
 *     {object} scalars
 *       An object that maps expected scalar names to values.
 *     {object} event
 *       The expected recorded event.
 *     {object} ping
 *       The expected recorded custom telemetry ping. If no ping is expected,
 *       leave this undefined or pass null.
 * @param {Function} options.showSuggestion
 *   This function should open the view and show the suggestion.
 */
async function doImpressionOnlyTest({
  index,
  suggestion,
  providerName,
  expected,
  showSuggestion,
}) {
  info("Starting impression-only test");

  Services.telemetry.clearEvents();

  let expectedPings = expected.ping ? [expected.ping] : [];
  let gleanPingCount = watchGleanPings(expectedPings);

  info("Showing suggestion");
  await showSuggestion();

  // Get the suggestion row.
  let row = await validateSuggestionRow(index, suggestion, providerName);
  if (!row) {
    Assert.ok(
      false,
      "Couldn't get suggestion row, stopping impression-only test"
    );
    return;
  }

  // We need to get a different selectable row so we can pick it to trigger
  // impression-only telemetry. For simplicity we'll look for a row that will
  // load a URL when picked. We'll also verify no other rows are from the
  // expected provider.
  let otherRow;
  let rowCount = UrlbarTestUtils.getResultCount(window);
  for (let i = 0; i < rowCount; i++) {
    if (i != index) {
      let r = await UrlbarTestUtils.waitForAutocompleteResultAt(window, i);
      Assert.notEqual(
        r.result.providerName,
        providerName,
        "No other row should be from expected provider: index = " + i
      );
      if (
        !otherRow &&
        (r.result.payload.url ||
          (r.result.type == UrlbarUtils.RESULT_TYPE.SEARCH &&
            (r.result.payload.query || r.result.payload.suggestion))) &&
        r.hasAttribute("row-selectable")
      ) {
        otherRow = r;
      }
    }
  }
  if (!otherRow) {
    Assert.ok(
      false,
      "Couldn't get a different selectable row with a URL, stopping impression-only test"
    );
    return;
  }

  // Pick the different row. Assumptions:
  // * The middle of the row is selectable
  // * Picking the row will load a page
  info("Clicking different row and waiting for view to close");
  let loadPromise = BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);
  await UrlbarTestUtils.promisePopupClose(window, () =>
    EventUtils.synthesizeMouseAtCenter(otherRow, {})
  );

  info("Waiting for page to load after clicking different row");
  await loadPromise;

  // Check telemetry.
  info("Checking scalars. Expected: " + JSON.stringify(expected.scalars));
  QuickSuggestTestUtils.assertScalars(expected.scalars);

  info("Checking events. Expected: " + JSON.stringify([expected.event]));
  QuickSuggestTestUtils.assertEvents([expected.event]);

  Assert.equal(
    expectedPings.length,
    gleanPingCount.value,
    "Submitted one Glean ping per expected ping"
  );

  // Clean up.
  await PlacesUtils.history.clear();
  await UrlbarTestUtils.formHistory.clear();

  info("Finished impression-only test");
}

/**
 * Helper for `doTelemetryTest()` that clicks a suggestion's row and checks
 * telemetry.
 *
 * @param {object} options
 *   Options
 * @param {number} options.index
 *   The expected index of the suggestion in the results list.
 * @param {object} options.suggestion
 *   The suggestion being tested.
 * @param {string} options.providerName
 *   The name of the provider that is expected to create the UrlbarResult for
 *   the suggestion.
 * @param {object} options.expected
 *   An object describing the telemetry that's expected to be recorded when the
 *   selectable element is picked. It must have the following properties:
 *     {object} scalars
 *       An object that maps expected scalar names to values.
 *     {object} event
 *       The expected recorded event.
 *     {Array} pings
 *       A list of expected recorded custom telemetry pings. If no pings are
 *       expected, leave this undefined or pass an empty array.
 * @param {Function} options.showSuggestion
 *   This function should open the view and show the suggestion.
 */
async function doClickTest({
  index,
  suggestion,
  providerName,
  expected,
  showSuggestion,
}) {
  info("Starting click test");

  Services.telemetry.clearEvents();

  let expectedPings = expected.pings ?? [];
  let gleanPingCount = watchGleanPings(expectedPings);

  info("Showing suggestion");
  await showSuggestion();

  let row = await validateSuggestionRow(index, suggestion, providerName);
  if (!row) {
    Assert.ok(false, "Couldn't get suggestion row, stopping click test");
    return;
  }

  // We assume clicking the row will load a page in the current browser.
  let loadPromise = BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);

  info("Clicking row");
  EventUtils.synthesizeMouseAtCenter(row, {});

  info("Waiting for load");
  await loadPromise;
  await TestUtils.waitForTick();

  info("Checking scalars. Expected: " + JSON.stringify(expected.scalars));
  QuickSuggestTestUtils.assertScalars(expected.scalars);

  info("Checking events. Expected: " + JSON.stringify([expected.event]));
  QuickSuggestTestUtils.assertEvents([expected.event]);

  Assert.equal(
    expectedPings.length,
    gleanPingCount.value,
    "Submitted one Glean ping per expected ping"
  );

  await PlacesUtils.history.clear();

  info("Finished click test");
}

/**
 * Helper for `doTelemetryTest()` that clicks a result menu command for a
 * suggestion and checks telemetry.
 *
 * @param {object} options
 *   Options
 * @param {number} options.index
 *   The expected index of the suggestion in the results list.
 * @param {object} options.suggestion
 *   The suggestion being tested.
 * @param {string} options.providerName
 *   The name of the provider that is expected to create the UrlbarResult for
 *   the suggestion.
 * @param {string|Array} options.commandOrArray
 *   A command name or array; this is passed directly to
 *  `UrlbarTestUtils.openResultMenuAndClickItem()` as the `commandOrArray` arg,
 *   so see its documentation for details.
 * @param {object} options.expected
 *   An object describing the telemetry that's expected to be recorded when the
 *   selectable element is picked. It must have the following properties:
 *     {object} scalars
 *       An object that maps expected scalar names to values.
 *     {object} event
 *       The expected recorded event.
 *     {Array} pings
 *       A list of expected recorded custom telemetry pings. If no pings are
 *       expected, leave this undefined or pass an empty array.
 * @param {Function} options.showSuggestion
 *   This function should open the view and show the suggestion.
 */
async function doCommandTest({
  index,
  suggestion,
  providerName,
  commandOrArray,
  expected,
  showSuggestion,
}) {
  info("Starting command test: " + JSON.stringify({ commandOrArray }));

  Services.telemetry.clearEvents();

  let expectedPings = expected.pings ?? [];
  let gleanPingCount = watchGleanPings(expectedPings);

  info("Showing suggestion");
  await showSuggestion();

  let row = await validateSuggestionRow(index, suggestion, providerName);
  if (!row) {
    Assert.ok(false, "Couldn't get suggestion row, stopping click test");
    return;
  }

  let command =
    typeof commandOrArray == "string"
      ? commandOrArray
      : commandOrArray[commandOrArray.length - 1];

  let loadPromise;
  if (command == "help") {
    // We assume clicking "help" will load a page in a new tab.
    loadPromise = BrowserTestUtils.waitForNewTab(gBrowser);
  }

  info("Clicking command");
  await UrlbarTestUtils.openResultMenuAndClickItem(window, commandOrArray, {
    resultIndex: index,
    openByMouse: true,
  });

  if (loadPromise) {
    info("Waiting for load");
    await loadPromise;
    await TestUtils.waitForTick();
    if (command == "help") {
      info("Closing help tab");
      BrowserTestUtils.removeTab(gBrowser.selectedTab);
    }
  }

  info("Checking scalars. Expected: " + JSON.stringify(expected.scalars));
  QuickSuggestTestUtils.assertScalars(expected.scalars);

  info("Checking events. Expected: " + JSON.stringify([expected.event]));
  QuickSuggestTestUtils.assertEvents([expected.event]);

  Assert.equal(
    expectedPings.length,
    gleanPingCount.value,
    "Submitted one Glean ping per expected ping"
  );

  if (command == "dismiss") {
    await QuickSuggest.blockedSuggestions.clear();
  }
  await PlacesUtils.history.clear();

  info("Finished command test: " + JSON.stringify({ commandOrArray }));
}

/*
 * Do test the "Manage" result menu item.
 *
 * @param {object} options
 *   Options
 * @param {number} options.index
 *   The index of the suggestion that will be checked in the results list.
 * @param {number} options.input
 *   The input value on the urlbar.
 */
async function doManageTest({ index, input }) {
  await BrowserTestUtils.withNewTab({ gBrowser }, async browser => {
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: input,
    });

    const managePage = "about:preferences#search";
    let onManagePageLoaded = BrowserTestUtils.browserLoaded(
      browser,
      false,
      managePage
    );
    // Click the command.
    await UrlbarTestUtils.openResultMenuAndClickItem(window, "manage", {
      resultIndex: index,
    });
    await onManagePageLoaded;

    Assert.equal(
      browser.currentURI.spec,
      managePage,
      "The manage page is loaded"
    );

    await UrlbarTestUtils.promisePopupClose(window);
  });
}

/**
 * Gets a row in the view, which is assumed to be open, and asserts that it's a
 * particular quick suggest row. If it is, the row is returned. If it's not,
 * null is returned.
 *
 * @param {number} index
 *   The expected index of the quick suggest row.
 * @param {object} suggestion
 *   The expected suggestion.
 * @param {string} providerName
 *   The name of the provider that is expected to create the UrlbarResult for
 *   the suggestion.
 * @returns {Element}
 *   If the row is the expected suggestion, the row element is returned.
 *   Otherwise null is returned.
 */
async function validateSuggestionRow(index, suggestion, providerName) {
  let rowCount = UrlbarTestUtils.getResultCount(window);
  Assert.less(
    index,
    rowCount,
    "Expected suggestion row index should be < row count"
  );
  if (rowCount <= index) {
    return null;
  }

  let row = await UrlbarTestUtils.waitForAutocompleteResultAt(window, index);
  Assert.equal(
    row.result.providerName,
    providerName,
    "Expected suggestion row should be from expected provider"
  );
  Assert.equal(
    row.result.payload.url,
    suggestion.url,
    "The suggestion row should represent the expected suggestion"
  );
  if (
    row.result.providerName != providerName ||
    row.result.payload.url != suggestion.url
  ) {
    return null;
  }

  return row;
}

function watchGleanPings(pings) {
  let countObject = { value: 0 };

  let checkPing = (ping, next) => {
    countObject.value++;
    _assertGleanPing(ping);
    if (next) {
      GleanPings.quickSuggest.testBeforeNextSubmit(next);
    }
  };

  // Build the chain of `testBeforeNextSubmit`s backwards.
  let next = undefined;
  pings
    .slice()
    .reverse()
    .forEach(ping => {
      next = checkPing.bind(null, ping, next);
    });
  if (next) {
    GleanPings.quickSuggest.testBeforeNextSubmit(next);
  }

  return countObject;
}

function _assertGleanPing(ping) {
  Assert.equal(Glean.quickSuggest.pingType.testGetValue(), ping.type);
  const keymap = {
    // present in all pings
    source: Glean.quickSuggest.source,
    match_type: Glean.quickSuggest.matchType,
    position: Glean.quickSuggest.position,
    suggested_index: Glean.quickSuggest.suggestedIndex,
    suggested_index_relative_to_group:
      Glean.quickSuggest.suggestedIndexRelativeToGroup,
    improve_suggest_experience_checked:
      Glean.quickSuggest.improveSuggestExperience,
    block_id: Glean.quickSuggest.blockId,
    advertiser: Glean.quickSuggest.advertiser,
    request_id: Glean.quickSuggest.requestId,
    context_id: Glean.quickSuggest.contextId,
    // impression and click pings
    reporting_url: Glean.quickSuggest.reportingUrl,
    // impression ping
    is_clicked: Glean.quickSuggest.isClicked,
    // block/dismiss ping
    iab_category: Glean.quickSuggest.iabCategory,
  };
  for (let [key, value] of Object.entries(ping.payload)) {
    Assert.ok(key in keymap, `A Glean metric exists for field ${key}`);

    // Merino results may contain empty strings, but Glean will represent these
    // as nulls.
    if (value === "") {
      value = null;
    }

    Assert.equal(
      keymap[key].testGetValue(),
      value ?? null,
      `Glean metric field ${key} should be the expected value`
    );
  }
}

let gAddTasksWithRustSetup;

/**
 * Adds two tasks: One with the Rust backend disabled and one with it enabled.
 * The names of the task functions will be the name of the passed-in task
 * function appended with "_rustDisabled" and "_rustEnabled". If the passed-in
 * task doesn't have a name, "anonymousTask" will be used.
 *
 * Call this with the usual `add_task()` arguments. Additionally, an object with
 * the following properties can be specified as any argument:
 *
 * {boolean} skip_if_rust_enabled
 *   If true, a "_rustEnabled" task won't be added. Useful when Rust is enabled
 *   by default but the task doesn't make sense with Rust and you still want to
 *   test some behavior when Rust is disabled.
 *
 * @param {...any} args
 *   The usual `add_task()` arguments.
 */
function add_tasks_with_rust(...args) {
  let skipIfRustEnabled = false;
  let i = args.findIndex(a => a.skip_if_rust_enabled);
  if (i >= 0) {
    skipIfRustEnabled = true;
    args.splice(i, 1);
  }

  let taskFnIndex = args.findIndex(a => typeof a == "function");
  let taskFn = args[taskFnIndex];

  for (let rustEnabled of [false, true]) {
    let newTaskName =
      (taskFn.name || "anonymousTask") +
      (rustEnabled ? "_rustEnabled" : "_rustDisabled");

    if (rustEnabled && skipIfRustEnabled) {
      info(
        "add_tasks_with_rust: Skipping due to skip_if_rust_enabled: " +
          newTaskName
      );
      continue;
    }

    let newTaskFn = async (...taskFnArgs) => {
      info("add_tasks_with_rust: Setting rustEnabled: " + rustEnabled);
      UrlbarPrefs.set("quicksuggest.rustEnabled", rustEnabled);
      info("add_tasks_with_rust: Done setting rustEnabled: " + rustEnabled);

      // The current backend may now start syncing, so wait for it to finish.
      info("add_tasks_with_rust: Forcing sync");
      await QuickSuggestTestUtils.forceSync();
      info("add_tasks_with_rust: Done forcing sync");

      if (gAddTasksWithRustSetup) {
        info("add_tasks_with_rust: Calling setup function");
        await gAddTasksWithRustSetup();
        info("add_tasks_with_rust: Done calling setup function");
      }

      let rv;
      try {
        info(
          "add_tasks_with_rust: Calling original task function: " + taskFn.name
        );
        rv = await taskFn(...taskFnArgs);
      } catch (e) {
        // Clearly report any unusual errors to make them easier to spot and to
        // make the flow of the test clearer. The harness throws NS_ERROR_ABORT
        // when a normal assertion fails, so don't report that.
        if (e.result != Cr.NS_ERROR_ABORT) {
          Assert.ok(
            false,
            "add_tasks_with_rust: The original task function threw an error: " +
              e
          );
        }
        throw e;
      } finally {
        info(
          "add_tasks_with_rust: Done calling original task function: " +
            taskFn.name
        );
        info("add_tasks_with_rust: Clearing rustEnabled");
        UrlbarPrefs.clear("quicksuggest.rustEnabled");
        info("add_tasks_with_rust: Done clearing rustEnabled");

        // The current backend may now start syncing, so wait for it to finish.
        info("add_tasks_with_rust: Forcing sync");
        await QuickSuggestTestUtils.forceSync();
        info("add_tasks_with_rust: Done forcing sync");
      }
      return rv;
    };

    Object.defineProperty(newTaskFn, "name", { value: newTaskName });

    let addTaskArgs = [];
    for (let j = 0; j < args.length; j++) {
      addTaskArgs[j] =
        j == taskFnIndex
          ? newTaskFn
          : Cu.cloneInto(args[j], this, { cloneFunctions: true });
    }
    add_task(...addTaskArgs);
  }
}

/**
 * Registers a setup function that `add_tasks_with_rust()` will await before
 * calling each of your original tasks. Call this at most once in your test file
 * (i.e., in `add_setup()`). This is useful when enabling/disabling Rust has
 * side effects related to your particular test that need to be handled or
 * awaited for each of your tasks. On the other hand, if only one or two of your
 * tasks need special setup, do it directly in those tasks instead of using
 * this. The passed-in `setupFn` is automatically unregistered on cleanup.
 *
 * @param {Function} setupFn
 *   A function that will be awaited before your original tasks are called.
 */
function registerAddTasksWithRustSetup(setupFn) {
  gAddTasksWithRustSetup = setupFn;
  registerCleanupFunction(() => (gAddTasksWithRustSetup = null));
}
