/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests for input history related to autofill.

"use strict";

let addToInputHistorySpy;

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.autoFill.adaptiveHistory.enabled", true]],
  });

  await PlacesUtils.bookmarks.eraseEverything();
  await PlacesUtils.history.clear();

  let sandbox = sinon.createSandbox();
  addToInputHistorySpy = sandbox.spy(UrlbarUtils, "addToInputHistory");

  registerCleanupFunction(async () => {
    sandbox.restore();
  });
});

// Input history use count should be bumped when an adaptive history autofill
// result is triggered and picked.
add_task(async function bumped() {
  let input = "exam";
  let tests = [
    // Basic test where the search string = the adaptive history input.
    {
      url: "http://example.com/test",
      searchString: "exam",
    },
    // The history with input "exam" should be bumped, not "example", even
    // though the search string is "example".
    {
      url: "http://example.com/test",
      searchString: "example",
    },
    // The history with URL "http://www.example.com/test" should be bumped, not
    // "http://example.com/test", even though the search string starts with
    // "example".
    {
      url: "http://www.example.com/test",
      searchString: "exam",
    },
  ];

  for (let { url, searchString } of tests) {
    info("Running subtest: " + JSON.stringify({ url, searchString }));

    await PlacesTestUtils.addVisits({
      url,
      transition: PlacesUtils.history.TRANSITION_TYPED,
    });
    await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();
    await UrlbarUtils.addToInputHistory(url, input);
    addToInputHistorySpy.resetHistory();

    let initialUseCount = await getUseCount({ url, input });
    info("Got initial use count: " + initialUseCount);

    await triggerAutofillAndPickResult(searchString, "example.com/test");

    let calls = addToInputHistorySpy.getCalls();
    Assert.equal(
      calls.length,
      1,
      "UrlbarUtils.addToInputHistory() called once"
    );
    Assert.deepEqual(
      calls[0].args,
      [url, input],
      "UrlbarUtils.addToInputHistory() called with expected args"
    );

    Assert.greater(
      await getUseCount({ url, input }),
      initialUseCount,
      "New use count > initial use count"
    );

    if (searchString != input) {
      Assert.strictEqual(
        await getUseCount({ input: searchString }),
        undefined,
        "Search string not present in input history: " + searchString
      );
    }

    await PlacesUtils.history.clear();
    await PlacesTestUtils.clearInputHistory();
    addToInputHistorySpy.resetHistory();
  }
});

// Input history use count should be bumped when an origin autofill result
// is triggered and picked.
add_task(async function bumped_origin() {
  addToInputHistorySpy.resetHistory();

  // Add enough visits to trigger origin autofill.
  let url = "http://example.com/test";
  await PlacesTestUtils.addVisits({
    url,
    transition: PlacesUtils.history.TRANSITION_TYPED,
  });
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  await triggerAutofillAndPickResult("exam", "example.com/");

  // addToInputHistoryWhenReady is fire-and-forget, so wait for the DB write
  // to complete before checking the spy.
  await TestUtils.waitForCondition(
    async () =>
      (await getUseCount({ url: "http://example.com/" })) !== undefined,
    "Origin URL present in input history"
  );

  // Called once or twice depending on whether the origin was already in
  // moz_places when addToInputHistoryWhenReady made its first attempt.
  let calls = addToInputHistorySpy.getCalls();
  Assert.greaterOrEqual(
    calls.length,
    1,
    "UrlbarUtils.addToInputHistory() called at least once"
  );

  Assert.greater(
    await getUseCount({ url: "http://example.com/" }),
    0,
    "URL present in input history: " + url
  );

  await PlacesUtils.history.clear();
  await PlacesTestUtils.clearInputHistory();
  addToInputHistorySpy.resetHistory();
});

// Input history use count should not be bumped when a URL autofill result is
// triggered and picked.
add_task(async function notBumped_url() {
  addToInputHistorySpy.resetHistory();

  let url = "http://example.com/test";
  await PlacesTestUtils.addVisits({
    url,
    transition: PlacesUtils.history.TRANSITION_TYPED,
  });
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  await triggerAutofillAndPickResult("example.com/t", "example.com/test");

  let calls = addToInputHistorySpy.getCalls();
  Assert.equal(calls.length, 0, "UrlbarUtils.addToInputHistory() not called");

  Assert.strictEqual(
    await getUseCount({ url }),
    undefined,
    "URL not present in input history: " + url
  );

  await PlacesUtils.history.clear();
});

// Input history use count should not be bumped when a search result is picked.
add_task(async function notBumped_search() {
  addToInputHistorySpy.resetHistory();

  let extension = await SearchTestUtils.installSearchExtension(
    {},
    { setAsDefault: true, skipUnload: true }
  );
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.urlbar.suggest.searches", true],
      ["browser.urlbar.maxHistoricalSearchSuggestions", 1],
    ],
  });
  await UrlbarTestUtils.formHistory.add(["example search"]);

  await BrowserTestUtils.withNewTab("about:blank", async () => {
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: "example",
      fireInputEvent: true,
    });

    let resultIndex = -1;
    for (let i = 0; i < UrlbarTestUtils.getResultCount(window); i++) {
      let details = await UrlbarTestUtils.getDetailsOfResultAt(window, i);
      if (
        details.type == UrlbarUtils.RESULT_TYPE.SEARCH &&
        !details.result.heuristic
      ) {
        resultIndex = i;
        break;
      }
    }
    Assert.greater(resultIndex, -1, "Found a non-heuristic search result");

    gURLBar.view.selectedRowIndex = resultIndex;
    await UrlbarTestUtils.promisePopupClose(window, () => {
      EventUtils.synthesizeKey("KEY_Enter", {}, window);
    });
  });

  let calls = addToInputHistorySpy.getCalls();
  Assert.equal(calls.length, 0, "UrlbarUtils.addToInputHistory() not called");

  await extension.unload();
  await SpecialPowers.popPrefEnv();
  await UrlbarTestUtils.formHistory.clear();
  addToInputHistorySpy.resetHistory();
});

/**
 * Performs a search and picks the first result.
 *
 * @param {string} searchString
 *   The search string. Assumed to trigger an autofill result.
 * @param {string} autofilledValue
 *   The input's expected value after autofill occurs.
 */
async function triggerAutofillAndPickResult(searchString, autofilledValue) {
  await BrowserTestUtils.withNewTab("about:blank", async () => {
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: searchString,
      fireInputEvent: true,
    });
    let details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
    Assert.ok(details.autofill, "Result is autofill");
    Assert.equal(gURLBar.value, autofilledValue, "gURLBar.value");
    Assert.equal(gURLBar.selectionStart, searchString.length, "selectionStart");
    Assert.equal(gURLBar.selectionEnd, autofilledValue.length, "selectionEnd");

    let loadPromise = BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);
    EventUtils.synthesizeKey("KEY_Enter");
    await loadPromise;
  });
}

/**
 * Gets the use count of an input history record.
 *
 * @param {object} options
 *   Options object.
 * @param {string} [options.url]
 *   The URL of the `moz_places` row corresponding to the record.
 * @param {string} [options.input]
 *   The `input` value in the record.
 * @returns {number}
 *   The use count. If no record exists with the URL and/or input, undefined is
 *   returned.
 */
async function getUseCount({ url = undefined, input = undefined }) {
  return PlacesUtils.withConnectionWrapper("test::getUseCount", async db => {
    let rows;
    if (input && url) {
      rows = await db.executeCached(
        `SELECT i.use_count
           FROM moz_inputhistory i
           JOIN moz_places h ON h.id = i.place_id
           WHERE h.url = :url AND i.input = :input`,
        { url, input }
      );
    } else if (url) {
      rows = await db.executeCached(
        `SELECT i.use_count
           FROM moz_inputhistory i
           JOIN moz_places h ON h.id = i.place_id
           WHERE h.url = :url`,
        { url }
      );
    } else if (input) {
      rows = await db.executeCached(
        `SELECT use_count
           FROM moz_inputhistory i
           WHERE input = :input`,
        { input }
      );
    }
    return rows[0]?.getResultByIndex(0);
  });
}
