/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const { searchBrowsingHistory } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/SearchBrowsingHistory.sys.mjs"
);

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

let sb;

// setup
add_task(async function setup() {
  sb = sinon.createSandbox();
  registerCleanupFunction(() => {
    sb.restore();
    Services.prefs.clearUserPref("browser.ml.enable");
    Services.prefs.clearUserPref("places.semanticHistory.featureGate");
    Services.prefs.clearUserPref("browser.search.region");
  });

  Services.prefs.setBoolPref("browser.ml.enable", true);
  Services.prefs.setBoolPref("places.semanticHistory.featureGate", true);
  Services.prefs.setCharPref("browser.search.region", "US");

  await PlacesUtils.history.clear();
});

// test: empty searchTerm, no time window
add_task(async function test_basic_history_fetch_and_shape() {
  await PlacesUtils.history.clear();

  const now = Date.now();

  const seeded = [
    {
      url: "https://www.google.com/search?q=firefox+history",
      title: "Google Search: firefox history",
      visits: [{ date: new Date(now - 5 * 60 * 1000) }], // 5 min ago
    },
    {
      url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
      title: "JavaScript | MDN",
      visits: [{ date: new Date(now - 10 * 60 * 1000) }], // 10 min ago
    },
    {
      url: "https://news.ycombinator.com/",
      title: "Hacker News",
      visits: [{ date: new Date(now - 15 * 60 * 1000) }],
    },
    {
      url: "https://search.brave.com/search?q=mozsqlite",
      title: "Brave Search: mozsqlite",
      visits: [{ date: new Date(now - 20 * 60 * 1000) }],
    },
    {
      url: "https://mozilla.org/en-US/",
      title: "Internet for people, not profit — Mozilla",
      visits: [{ date: new Date(now - 25 * 60 * 1000) }],
    },
  ];

  await PlacesUtils.history.insertMany(seeded);

  const allRowsStr = await searchBrowsingHistory({
    searchTerm: "",
    startTs: null,
    endTs: null,
    historyLimit: 15,
  });
  const allRowsObj = JSON.parse(allRowsStr);

  // check count match
  Assert.equal(
    allRowsObj.count,
    seeded.length,
    "Should return all seeded records"
  );

  // check all url match
  const urls = allRowsObj.results.map(r => r.url).sort();
  const expectedUrls = seeded.map(s => s.url).sort();
  Assert.deepEqual(urls, expectedUrls, "Should return all seeded URLs");

  // check title and url match
  const byUrl = new Map(allRowsObj.results.map(r => [r.url, r]));
  for (const { url, title } of seeded) {
    Assert.ok(byUrl.has(url), `Has entry for ${url}`);
    Assert.equal(byUrl.get(url).title, title, `Title matches for ${url}`);
  }

  // check visitDate iso string
  for (const r of allRowsObj.results) {
    Assert.ok(
      !isNaN(Date.parse(r.visitDate)),
      "visitDate is a valid ISO timestamp"
    );
  }
});

// test: startTs only
add_task(async function test_time_range_only_startTs() {
  await PlacesUtils.history.clear();

  const now = Date.now();

  const older = {
    url: "https://example.com/older",
    title: "Older Page",
    visits: [{ date: new Date(now - 60 * 60 * 1000) }], // 60 min ago
  };
  const recent = {
    url: "https://example.com/recent",
    title: "Recent Page",
    visits: [{ date: new Date(now - 5 * 60 * 1000) }], // 5 min ago
  };

  await PlacesUtils.history.insertMany([older, recent]);

  // records after last 10 minutes
  const startTs = new Date(now - 10 * 60 * 1000).toISOString(); // ISO input

  const rowsStr = await searchBrowsingHistory({
    searchTerm: "",
    startTs,
    endTs: null,
    historyLimit: 15,
  });
  const rows = JSON.parse(rowsStr);
  const urls = rows.results.map(r => r.url);

  Assert.ok(
    urls.includes(recent.url),
    "Recent entry should be included when only startTs is set"
  );
  Assert.ok(
    !urls.includes(older.url),
    "Older entry should be excluded when only startTs is set"
  );
});

// test: endTs only
add_task(async function test_time_range_only_endTs() {
  await PlacesUtils.history.clear();

  const now = Date.now();

  const older = {
    url: "https://example.com/older",
    title: "Older Page",
    visits: [{ date: new Date(now - 60 * 60 * 1000) }], // 60 min ago
  };
  const recent = {
    url: "https://example.com/recent",
    title: "Recent Page",
    visits: [{ date: new Date(now - 5 * 60 * 1000) }], // 5 min ago
  };

  await PlacesUtils.history.insertMany([older, recent]);

  // Anything before last 10 minutes
  const endTs = new Date(now - 10 * 60 * 1000).toISOString(); // ISO input

  const rowsStr = await searchBrowsingHistory({
    searchTerm: "",
    startTs: null,
    endTs,
    historyLimit: 15,
  });
  const rows = JSON.parse(rowsStr);
  const urls = rows.results.map(r => r.url);

  Assert.ok(
    urls.includes(older.url),
    "Older entry should be included when only endTs is set"
  );
  Assert.ok(
    !urls.includes(recent.url),
    "Recent entry should be excluded when only endTs is set"
  );
});

// test: startTs + endTs
add_task(async function test_time_range_start_and_endTs() {
  await PlacesUtils.history.clear();

  const now = Date.now();

  const beforeWindow = {
    url: "https://example.com/before-window",
    title: "Before Window",
    visits: [{ date: new Date(now - 3 * 60 * 60 * 1000) }], // 3h ago
  };
  const inWindow = {
    url: "https://example.com/in-window",
    title: "In Window",
    visits: [{ date: new Date(now - 30 * 60 * 1000) }], // 30 min ago
  };
  const afterWindow = {
    url: "https://example.com/after-window",
    title: "After Window",
    visits: [{ date: new Date(now - 5 * 60 * 1000) }], // 5 min ago
  };

  await PlacesUtils.history.insertMany([beforeWindow, inWindow, afterWindow]);

  // Time window: [45min ago,  15min ago]
  const startTs = new Date(now - 45 * 60 * 1000).toISOString();
  const endTs = new Date(now - 15 * 60 * 1000).toISOString();

  const rowsStr = await searchBrowsingHistory({
    searchTerm: "",
    startTs,
    endTs,
    historyLimit: 15,
  });
  const rows = JSON.parse(rowsStr);
  const urls = rows.results.map(r => r.url);

  Assert.ok(urls.includes(inWindow.url), "In window entry should be included");
  Assert.ok(
    !urls.includes(beforeWindow.url),
    "Before window entry should be excluded"
  );
  Assert.ok(
    !urls.includes(afterWindow.url),
    "After window entry should be excluded"
  );
});

/**
 * Test no results behavior: empty history with and without searchTerm.
 *
 * We don't try to force the semantic here (that would require a
 * running ML engine). Instead we just assert the wrapper's messaging
 * when there are no rows.
 */
add_task(async function test_no_results_messages() {
  await PlacesUtils.history.clear();

  // No search term: time range message.
  let outputStr = await searchBrowsingHistory({
    searchTerm: "",
    startTs: null,
    endTs: null,
    historyLimit: 15,
  });
  let output = JSON.parse(outputStr);

  Assert.equal(output.results.length, 0, "No results when history is empty");
  Assert.ok(
    output.message.includes("requested time range"),
    "Message explains empty time-range search"
  );

  // With search term: search specific message.
  outputStr = await searchBrowsingHistory({
    searchTerm: "mozilla",
    startTs: null,
    endTs: null,
    historyLimit: 15,
  });
  output = JSON.parse(outputStr);

  Assert.equal(output.results.length, 0, "No results for semantic search");
  Assert.ok(
    output.message.includes("mozilla"),
    "Message mentions the search term when there are no matches"
  );
});

// test: non-empty searchTerm falls back to basic history search
// when semantic search is disabled via prefs.
add_task(async function test_basic_text_search_when_semantic_disabled() {
  await PlacesUtils.history.clear();

  const now = Date.now();

  const seeded = [
    {
      url: "https://www.mozilla.org/en-US/",
      title: "Internet for people, not profit — Mozilla",
      visits: [{ date: new Date(now - 5 * 60 * 1000) }], // 5 min ago
    },
    {
      url: "https://example.com/other",
      title: "Some Other Site",
      visits: [{ date: new Date(now - 10 * 60 * 1000) }], // 10 min ago
    },
  ];

  await PlacesUtils.history.insertMany(seeded);

  // Disable semantic search so searchBrowsingHistory must fall back
  // to the basic history search.
  Services.prefs.setBoolPref("browser.ml.enable", false);
  Services.prefs.setBoolPref("places.semanticHistory.featureGate", false);

  const outputStr = await searchBrowsingHistory({
    searchTerm: "mozilla",
    startTs: null,
    endTs: null,
    historyLimit: 15,
  });
  const output = JSON.parse(outputStr);

  Assert.equal(output.searchTerm, "mozilla", "searchTerm match");
  Assert.equal(output.results.length, 1, "One history entry is returned");

  const urls = output.results.map(r => r.url);
  Assert.ok(
    urls.includes("https://www.mozilla.org/en-US/"),
    "Basic history search should find the Mozilla entry"
  );

  // Restore prefs
  Services.prefs.setBoolPref("browser.ml.enable", true);
  Services.prefs.setBoolPref("places.semanticHistory.featureGate", true);
});

// test: region = RO (not supported in semantic search), time range search should still work
add_task(async function test_time_range_search_with_region_ro() {
  await PlacesUtils.history.clear();

  // Switch region to RO for this test.
  Services.prefs.setCharPref("browser.search.region", "RO");

  const now = Date.now();

  const older = {
    url: "https://example.com/older-ro",
    title: "Older RO Page",
    visits: [{ date: new Date(now - 60 * 60 * 1000) }], // 60 min ago
  };
  const inWindow = {
    url: "https://example.com/in-window-ro",
    title: "In Window RO Page",
    visits: [{ date: new Date(now - 30 * 60 * 1000) }], // 30 min ago
  };
  const recent = {
    url: "https://example.com/recent-ro",
    title: "Recent RO Page",
    visits: [{ date: new Date(now - 5 * 60 * 1000) }], // 5 min ago
  };

  await PlacesUtils.history.insertMany([older, inWindow, recent]);

  // Time window: [45min ago, 15min ago]
  const startTs = new Date(now - 45 * 60 * 1000).toISOString();
  const endTs = new Date(now - 15 * 60 * 1000).toISOString();

  const rowsStr = await searchBrowsingHistory({
    searchTerm: "",
    startTs,
    endTs,
    historyLimit: 15,
  });
  const rows = JSON.parse(rowsStr);
  const urls = rows.results.map(r => r.url);

  Assert.ok(
    urls.includes(inWindow.url),
    "In window entry should be included when region is RO"
  );
  Assert.ok(
    !urls.includes(older.url),
    "Older entry should be excluded when region is RO"
  );
  Assert.ok(
    !urls.includes(recent.url),
    "Recent entry should be excluded when region is RO"
  );

  // Restore region pref for other tests.
  Services.prefs.setCharPref("browser.search.region", "US");
});
