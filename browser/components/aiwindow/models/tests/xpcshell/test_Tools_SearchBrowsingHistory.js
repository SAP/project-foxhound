/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const { searchBrowsingHistory, stripSearchBrowsingHistoryFields } =
  ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/models/Tools.sys.mjs"
  );

/**
 * searchBrowsingHistory tests
 *
 * Wrapper test: ensures Tools.searchBrowsingHistory() returns a valid JSON
 * structure for time-range browsing history search (empty searchTerm).
 */

add_task(async function test_searchBrowsingHistory_wrapper() {
  const outputStr = await searchBrowsingHistory({
    searchTerm: "",
    startTs: null,
    endTs: null,
    historyLimit: 15,
  });

  const output = JSON.parse(outputStr);

  Assert.equal(output.searchTerm, "", "searchTerm match");
  Assert.ok("results" in output, "results field present");
  Assert.ok(Array.isArray(output.results), "results is an array");

  // No error expected for empty searchTerm path.
  Assert.ok(!("error" in output), "no error field present");

  // Some basic structure sanity checks.
  Assert.ok("count" in output, "count field present");
  Assert.equal(output.count, output.results.length, "count matches results");
});

/**
 * stripSearchBrowsingHistoryFields tests
 */

add_task(function test_stripSearchBrowsingHistoryFields_omits_large_fields() {
  const input = JSON.stringify({
    searchTerm: "firefox",
    count: 6,
    results: [
      {
        title: "Firefox Privacy Notice — Mozilla",
        url: "https://www.mozilla.org/en-US/privacy/firefox/",
        visitDate: "2025-11-28T05:32:33.096Z",
        visitCount: 2,
        relevanceScore: 0.7472805678844452,
        favicon: "page-icon:https://www.mozilla.org/en-US/privacy/firefox/",
        thumbnail: "https://www.mozilla.org/media/img/m24/og.3a69dffad83e.png",
      },
      // no thumbnail
      {
        title: "Planet Mozilla",
        url: "https://planet.mozilla.org/",
        visitDate: "2025-11-28T05:32:37.796Z",
        visitCount: 1,
        relevanceScore: 0.5503441691398621,
        favicon: "page-icon:https://planet.mozilla.org/",
      },
      // fake record: no favicon
      {
        title: "Firefox Privacy Notice — Mozilla 2",
        url: "https://www.mozilla.org/en-US/privacy/firefox/2/",
        visitDate: "2025-11-28T05:32:33.096Z",
        visitCount: 1,
        relevanceScore: 0.54,
        thumbnail: "https://www.mozilla.org/media/img/m24/og.3a69dffad83e.png",
      },
      // fake record: no favicon and no thumbnail
      {
        title: "Planet Mozilla 2",
        url: "https://planet.mozilla.org/2/",
        visitDate: "2025-11-28T05:32:37.796Z",
        visitCount: 1,
        relevanceScore: 0.53,
      },
      {
        title: "Bugzilla Main Page",
        url: "https://bugzilla.mozilla.org/home",
        visitDate: "2025-11-28T05:32:49.807Z",
        visitCount: 1,
        relevanceScore: 0.5060983002185822,
        favicon: "page-icon:https://bugzilla.mozilla.org/home",
        thumbnail:
          "https://bugzilla.mozilla.org/extensions/OpenGraph/web/moz-social-bw-rgb-1200x1200.png",
      },
      {
        title: "Bugzilla Main Page",
        url: "https://bugzilla.mozilla.org/",
        visitDate: "2025-11-28T05:32:49.272Z",
        visitCount: 1,
        relevanceScore: 0.5060983002185822,
        favicon: "page-icon:https://bugzilla.mozilla.org/",
      },
    ],
  });

  const outputStr = stripSearchBrowsingHistoryFields(input);
  const output = JSON.parse(outputStr);

  Assert.equal(
    output.searchTerm,
    "firefox",
    "searchTerm preserved after stripping"
  );
  Assert.equal(output.count, 6, "count preserved");
  Assert.equal(output.results.length, 6, "results length preserved");

  Assert.equal(
    output.results[0].title,
    "Firefox Privacy Notice — Mozilla",
    "title same"
  );
  Assert.equal(
    output.results[0].url,
    "https://www.mozilla.org/en-US/privacy/firefox/",
    "url same"
  );
  Assert.equal(
    output.results[0].visitDate,
    "2025-11-28T05:32:33.096Z",
    "visitDate same"
  );
  Assert.equal(output.results[0].visitCount, 2, "visitCount same");
  Assert.equal(
    output.results[0].relevanceScore,
    0.7472805678844452,
    "relevanceScore same"
  );
  Assert.equal(output.results[0].favicon, undefined, "favicon removed");
  Assert.equal(output.results[0].thumbnail, undefined, "thumbnail removed");

  for (const [idx, r] of output.results.entries()) {
    Assert.ok(!("favicon" in r), `favicon removed for result[${idx}]`);
    Assert.ok(!("thumbnail" in r), `thumbnail removed for result[${idx}]`);
  }
});

add_task(
  function test_stripSearchBrowsingHistoryFields_passthrough_on_empty_results() {
    // empty result
    const noResults = JSON.stringify({
      searchTerm: "test",
      count: 0,
      results: [],
    });

    const outputStr = stripSearchBrowsingHistoryFields(noResults);
    Assert.equal(
      outputStr,
      noResults,
      "When results is empty, function should return original string"
    );

    const withError = JSON.stringify({
      searchTerm: "test",
      error: "something went wrong",
      results: [],
    });

    // no result with error
    const outputErr = stripSearchBrowsingHistoryFields(withError);
    Assert.equal(
      outputErr,
      withError,
      "When error is present, function should return original string"
    );

    const notJSON = "this is not json";
    const outputErrNonJSON = stripSearchBrowsingHistoryFields(notJSON);
    Assert.equal(
      outputErrNonJSON,
      notJSON,
      "Invalid JSON input should be returned unchanged"
    );
  }
);

add_task(
  function test_stripSearchBrowsingHistoryFields_passthrough_on_unexpected_results_structure() {
    // result = null
    const unexpectedResults = null;

    const outputStr = stripSearchBrowsingHistoryFields(unexpectedResults);
    Assert.equal(
      outputStr,
      unexpectedResults,
      "When any other data structure besides JSON (null), return original data"
    );

    // reulst = ""
    const emptyStringResults = "";

    const outputStrEmpty = stripSearchBrowsingHistoryFields(emptyStringResults);
    Assert.equal(
      outputStrEmpty,
      emptyStringResults,
      "When any other data structure besides JSON (''), return original data"
    );

    // result = "abc"
    const nonJSONStringResults = "abc";

    const outputStrNonJSON =
      stripSearchBrowsingHistoryFields(nonJSONStringResults);
    Assert.equal(
      outputStrNonJSON,
      nonJSONStringResults,
      "When any other data structure besides JSON ('abc'), return original data"
    );
  }
);

/**
 * searchBrowsingHistory wrapper robustness tests
 *
 * Ensures wrapper tolerates missing or invalid tool arguments.
 */

// test: tool called with no arguments
add_task(async function test_searchBrowsingHistory_wrapper_no_args() {
  const outputStr = await searchBrowsingHistory();
  const output = JSON.parse(outputStr);

  Assert.ok("searchTerm" in output, "searchTerm field present");
  Assert.ok("results" in output, "results field present");
  Assert.ok(Array.isArray(output.results), "results is an array");

  // Wrapper may legitimately return an error (e.g. semantic DB not initialized).
  Assert.ok(
    "error" in output || "message" in output,
    "error or message present"
  );
});

// test: tool called with undefined
add_task(async function test_searchBrowsingHistory_wrapper_undefined_args() {
  const outputStr = await searchBrowsingHistory(undefined);
  const output = JSON.parse(outputStr);

  Assert.ok("searchTerm" in output, "searchTerm field present");
  Assert.ok("results" in output, "results field present");
  Assert.ok(Array.isArray(output.results), "results is an array");
  Assert.ok(
    "error" in output || "message" in output,
    "error or message present"
  );
});

// test: tool called with null
add_task(async function test_searchBrowsingHistory_wrapper_null_args() {
  const outputStr = await searchBrowsingHistory(null);
  const output = JSON.parse(outputStr);

  Assert.ok("searchTerm" in output, "searchTerm field present");
  Assert.ok("results" in output, "results field present");
  Assert.ok(Array.isArray(output.results), "results is an array");
  Assert.ok(
    "error" in output || "message" in output,
    "error or message present"
  );
});

// test: tool called with non-object (string)
add_task(async function test_searchBrowsingHistory_wrapper_string_args() {
  const outputStr = await searchBrowsingHistory("mozilla");
  const output = JSON.parse(outputStr);

  Assert.ok("searchTerm" in output, "searchTerm field present");
  Assert.ok("results" in output, "results field present");
  Assert.ok(Array.isArray(output.results), "results is an array");
  Assert.ok(
    "error" in output || "message" in output,
    "error or message present"
  );
});

// test: tool called with non-object (number)
add_task(async function test_searchBrowsingHistory_wrapper_number_args() {
  const outputStr = await searchBrowsingHistory(123);
  const output = JSON.parse(outputStr);

  Assert.ok("searchTerm" in output, "searchTerm field present");
  Assert.ok("results" in output, "results field present");
  Assert.ok(Array.isArray(output.results), "results is an array");
  Assert.ok(
    "error" in output || "message" in output,
    "error or message present"
  );
});

// test: tool called with non-object (boolean)
add_task(async function test_searchBrowsingHistory_wrapper_boolean_args() {
  const outputStr = await searchBrowsingHistory(true);
  const output = JSON.parse(outputStr);

  Assert.ok("searchTerm" in output, "searchTerm field present");
  Assert.ok("results" in output, "results field present");
  Assert.ok(Array.isArray(output.results), "results is an array");
  Assert.ok(
    "error" in output || "message" in output,
    "error or message present"
  );
});
