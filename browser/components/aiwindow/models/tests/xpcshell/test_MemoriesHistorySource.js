/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const {
  getRecentHistory,
  sessionizeVisits,
  generateProfileInputs,
  aggregateSessions,
  topkAggregates,
  _sanitizeTitleForTesting,
} = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/memories/MemoriesHistorySource.sys.mjs"
);

/**
 * Create a single visit object for PlacesUtils.history.insertMany.
 *
 * @param {string} url
 * @param {string} title
 * @param {number} baseMs  base timestamp in ms
 * @param {number} offsetMs offset from base in ms (negative = earlier)
 */
function makeVisit(url, title, baseMs, offsetMs = 0) {
  return {
    url,
    title,
    visits: [{ date: new Date(baseMs + offsetMs) }],
  };
}

/**
 * Build a small, fixed set of synthetic sessionized rows for testing
 * generateProfileInputs and aggregateSessions.
 *
 * Shape matches what generateProfileInputs expects: sessionized rows.
 *
 * @param {number} [baseMicros]
 */
function makeSyntheticSessionRows(baseMicros = Date.now() * 1000) {
  return [
    // Session 1: two history visits + one search
    {
      session_id: 1,
      url: "https://example.com/a1",
      title: "Example A1",
      domain: "example.com",
      visitDateMicros: baseMicros,
      frequencyPct: 10,
      domainFrequencyPct: 20,
      source: "history",
    },
    {
      session_id: 1,
      url: "https://example.com/a2",
      title: "Example A2",
      domain: "example.com",
      visitDateMicros: baseMicros + 10_000,
      frequencyPct: 30,
      domainFrequencyPct: 40,
      source: "history",
    },
    {
      session_id: 1,
      url: "https://www.google.com/search?q=test",
      title: "Google search: test",
      domain: "www.google.com",
      visitDateMicros: baseMicros + 20_000,
      frequencyPct: 50,
      domainFrequencyPct: 60,
      source: "search",
    },

    // Session 2: one visit, no search
    {
      session_id: 2,
      url: "https://mozilla.org/",
      title: "Mozilla",
      domain: "mozilla.org",
      visitDateMicros: baseMicros + 1_000_000,
      frequencyPct: 70,
      domainFrequencyPct: 80,
      source: "history",
    },
  ];
}

function assertHistoryRowShape(row, msgPrefix = "") {
  const prefix = msgPrefix ? `${msgPrefix}: ` : "";

  Assert.strictEqual(typeof row.url, "string", `${prefix}url is a string`);
  Assert.ok(row.url.length, `${prefix}url present`);

  Assert.strictEqual(
    typeof row.domain,
    "string",
    `${prefix}domain is a string`
  );
  Assert.ok(row.domain.length, `${prefix}domain present`);

  Assert.strictEqual(typeof row.title, "string", `${prefix}title is a string`);
  Assert.ok(row.title.length, `${prefix}title present`);

  Assert.strictEqual(
    typeof row.frequencyPct,
    "number",
    `${prefix}frequencyPct is a number`
  );
  Assert.strictEqual(
    typeof row.domainFrequencyPct,
    "number",
    `${prefix}domainFrequencyPct is a number`
  );

  Assert.ok(
    row.source === "search" || row.source === "history",
    `${prefix}source labeled`
  );
  Assert.ok(
    row.frequencyPct >= 0 && row.frequencyPct <= 100,
    `${prefix}frequencyPct within 0–100`
  );
  Assert.ok(
    row.domainFrequencyPct >= 0 && row.domainFrequencyPct <= 100,
    `${prefix}domainFrequencyPct within 0–100`
  );

  Assert.strictEqual(
    typeof row.visitDateMicros,
    "number",
    `${prefix}visitDateMicros is a number`
  );
  Assert.ok(
    Number.isFinite(row.visitDateMicros),
    `${prefix}visitDateMicros is finite`
  );
  Assert.greaterOrEqual(
    row.visitDateMicros,
    0,
    `${prefix}visitDateMicros non-negative`
  );
}

add_task(async function test_basic_history_fetch_and_shape() {
  await PlacesUtils.history.clear();
  const now = Date.now();

  const seeded = [
    makeVisit(
      "https://www.google.com/search?q=firefox+history",
      "Google Search: firefox history",
      now,
      -5 * 60 * 1000
    ),
    makeVisit(
      "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
      "JavaScript | MDN",
      now,
      -10 * 60 * 1000
    ),
    makeVisit(
      "https://news.ycombinator.com/",
      "Hacker News",
      now,
      -15 * 60 * 1000
    ),
    makeVisit(
      "https://search.brave.com/search?q=mozsqlite",
      "Brave Search: mozsqlite",
      now,
      -20 * 60 * 1000
    ),
    makeVisit(
      "https://mozilla.org/en-US/",
      "Internet for people, not profit — Mozilla",
      now,
      -25 * 60 * 1000
    ),
  ];

  // Insert via high-level API; Places will populate moz_origins/visits.
  await PlacesUtils.history.insertMany(seeded);

  const rows = await getRecentHistory({ days: 1, maxResults: 100 });
  Assert.ok(Array.isArray(rows), "Should return an array");
  Assert.greaterOrEqual(
    rows.length,
    seeded.length,
    "Should return at least seeded rows"
  );

  // Verify required fields & types on a sample.
  for (const [idx, row] of rows.slice(0, 5).entries()) {
    assertHistoryRowShape(row, `row[${idx}]`);
  }

  // Check ordering: newest first by visit_date.
  const copy = rows.map(r => r.visitDateMicros);
  const sorted = [...copy].sort((a, b) => b - a);
  Assert.deepEqual(
    copy.slice(0, 10),
    sorted.slice(0, 10),
    "Rows are ordered by visit date desc"
  );

  // Search-source tagging should catch major engines with query paths.
  const byUrl = new Map(rows.map(r => [r.url, r]));
  Assert.equal(
    byUrl.get(seeded[0].url).source,
    "search",
    "Google search tagged as 'search'"
  );
  Assert.equal(
    byUrl.get(seeded[3].url).source,
    "search",
    "Brave search tagged as 'search'"
  );
  Assert.equal(
    byUrl.get(seeded[1].url).source,
    "history",
    "MDN should be 'history'"
  );
  Assert.equal(
    byUrl.get(seeded[2].url).source,
    "history",
    "Hacker News should be 'history'"
  );
  Assert.equal(
    byUrl.get(seeded[4].url).source,
    "history",
    "Internet for people, not profit — Mozilla"
  );
});

add_task(async function test_maxResults_is_respected() {
  // Create a burst of visits so we can test LIMIT behavior.
  await PlacesUtils.history.clear();

  const base = Date.now();
  const toInsert = [];
  for (let i = 0; i < 50; i++) {
    toInsert.push(
      makeVisit(
        `https://example.com/page-${i}`,
        `Example Page ${i}`,
        base,
        -i * 1000
      )
    );
  }
  await PlacesUtils.history.insertMany(toInsert);

  const rows10 = await getRecentHistory({ days: 1, maxResults: 10 });
  Assert.equal(rows10.length, 10, "maxResults=10 respected");

  const rows5 = await getRecentHistory({ days: 1, maxResults: 5 });
  Assert.equal(rows5.length, 5, "maxResults=5 respected");
});

add_task(async function test_days_cutoff_is_respected() {
  await PlacesUtils.history.clear();

  // One old (2 days), one recent (within 1 hour)
  const now = Date.now();
  await PlacesUtils.history.insertMany([
    makeVisit(
      "https://old.example.com/",
      "Old Visit",
      now,
      -2 * 24 * 60 * 60 * 1000
    ),
    makeVisit(
      "https://recent.example.com/",
      "Recent Visit",
      now,
      -30 * 60 * 1000
    ),
  ]);

  const rows = await getRecentHistory({ days: 1, maxResults: 50 });
  const urls = rows.map(r => r.url);
  Assert.ok(
    urls.includes("https://recent.example.com/"),
    "Recent visit present"
  );
  Assert.ok(
    !urls.includes("https://old.example.com/"),
    "Old visit filtered by days cutoff"
  );
});

add_task(function test_sessionizeVisits_basic() {
  const baseMs = Date.now();

  // 3 visits:
  //  - v1 at t
  //  - v2 at t + 1 min (same session)
  //  - v3 at t + 30 min (new session with default 15 min gap)
  const rows = [
    {
      url: "https://example.com/1",
      title: "First",
      domain: "example.com",
      visitDateMicros: (baseMs + 1 * 60 * 1000) * 1000, // v2
    },
    {
      url: "https://example.com/0",
      title: "Zero",
      domain: "example.com",
      visitDateMicros: baseMs * 1000, // v1
    },
    {
      url: "https://example.com/2",
      title: "Second",
      domain: "example.com",
      visitDateMicros: (baseMs + 30 * 60 * 1000) * 1000, // v3
    },
  ];

  const sessionized = sessionizeVisits(rows);

  Assert.equal(sessionized.length, 3, "All rows kept");
  // Sorted ascending by time
  Assert.ok(
    sessionized[0].visitDateMicros <= sessionized[1].visitDateMicros &&
      sessionized[1].visitDateMicros <= sessionized[2].visitDateMicros,
    "Sessionized rows sorted by ascending visit time"
  );

  const [r0, r1, r2] = sessionized;

  // First two within 1 minute -> same session_id
  Assert.strictEqual(
    r0.session_id,
    r1.session_id,
    "First two visits should share a session"
  );

  // Third 30 min later -> different session_id with default 15 min gap
  Assert.notStrictEqual(
    r1.session_id,
    r2.session_id,
    "Third visit should start a new session"
  );

  // Required session fields present
  for (const r of sessionized) {
    Assert.strictEqual(typeof r.session_id, "number", "session_id is a number");
    Assert.strictEqual(
      typeof r.session_start_ms,
      "number",
      "session_start_ms is a number"
    );
    Assert.strictEqual(
      typeof r.session_start_iso,
      "string",
      "session_start_iso is a string"
    );
    // session_start_iso should be a valid ISO string matching session_start_ms
    const parsed = new Date(r.session_start_iso);
    Assert.ok(
      Number.isFinite(parsed.getTime()),
      "session_start_iso parses as a valid Date"
    );
    Assert.equal(
      parsed.toISOString(),
      r.session_start_iso,
      "session_start_iso is in canonical ISO 8601 format"
    );
    // Also ensure ms and iso are consistent
    const fromMs = new Date(r.session_start_ms).toISOString();
    Assert.equal(
      fromMs,
      r.session_start_iso,
      "session_start_iso matches session_start_ms"
    );
  }
});

add_task(async function test_sinceMicros_cutoff_and_overrides_days() {
  await PlacesUtils.history.clear();
  const nowMs = Date.now();

  const early = makeVisit(
    "https://early.example.com/",
    "Early",
    nowMs,
    -60 * 60 * 1000 // 1 hour ago
  );
  const late = makeVisit(
    "https://late.example.com/",
    "Late",
    nowMs,
    -5 * 60 * 1000 // 5 minutes ago
  );

  await PlacesUtils.history.insertMany([early, late]);

  // Get the raw visitDateMicros so we can compute a watermark between them.
  const allRows = await getRecentHistory({ days: 1, maxResults: 10 });
  const byUrl = new Map(allRows.map(r => [r.url, r]));
  const earlyVisit = byUrl.get(early.url);
  const lateVisit = byUrl.get(late.url);

  Assert.ok(earlyVisit && lateVisit, "Both visits present in initial fetch");

  const midMicros =
    (earlyVisit.visitDateMicros + lateVisit.visitDateMicros) / 2;

  // Get visits since midMicros
  const rowsSince = await getRecentHistory({
    sinceMicros: midMicros,
    maxResults: 10,
  });

  const urlsSince = rowsSince.map(r => r.url);
  Assert.ok(
    urlsSince.includes(late.url),
    "Late visit included when sinceMicros is between early and late"
  );
  Assert.ok(
    !urlsSince.includes(early.url),
    "Early visit excluded by sinceMicros cutoff"
  );
});

add_task(function test_sessionizeVisits_empty_and_invalid() {
  // Empty input -> empty output
  let sessionized = sessionizeVisits([]);
  Assert.ok(Array.isArray(sessionized), "Empty input returns array");
  Assert.equal(sessionized.length, 0, "Empty input yields empty output");

  // Non-finite visitDateMicros should be filtered out
  const rows = [
    { url: "https://example.com/a", visitDateMicros: NaN },
    { url: "https://example.com/b", visitDateMicros: Infinity },
    { url: "https://example.com/c", visitDateMicros: -Infinity },
  ];
  sessionized = sessionizeVisits(rows);
  Assert.equal(
    sessionized.length,
    0,
    "Rows with non-finite visitDateMicros are filtered"
  );
});

add_task(function test_sessionizeVisits_custom_gap() {
  const baseMs = Date.now();

  // Two visits 20 minutes apart.
  const rows = [
    {
      url: "https://example.com/0",
      visitDateMicros: baseMs * 1000,
    },
    {
      url: "https://example.com/1",
      visitDateMicros: (baseMs + 20 * 60 * 1000) * 1000,
    },
  ];

  // With a huge gapSec, they should stay in one session.
  const sessionizedLoose = sessionizeVisits(rows, { gapSec: 3600 });
  Assert.equal(
    sessionizedLoose[0].session_id,
    sessionizedLoose[1].session_id,
    "Custom large gap keeps visits in one session"
  );

  // With a tiny gapSec, they should split.
  const sessionizedTight = sessionizeVisits(rows, { gapSec: 60 });
  Assert.notStrictEqual(
    sessionizedTight[0].session_id,
    sessionizedTight[1].session_id,
    "Custom small gap splits sessions"
  );
});

add_task(function test_generateProfileInputs_shapes() {
  const rows = makeSyntheticSessionRows();
  const prepared = generateProfileInputs(rows);

  // session_id set should be preserved
  const originalSessionIds = new Set(rows.map(r => r.session_id));
  const preparedSessionIds = new Set(prepared.map(r => r.session_id));
  Assert.deepEqual(
    [...preparedSessionIds].sort(),
    [...originalSessionIds].sort(),
    "generateProfileInputs preserves session_id set"
  );

  Assert.equal(prepared.length, 2, "Two sessions -> two prepared records");

  const bySession = new Map(prepared.map(r => [r.session_id, r]));
  const sess1 = bySession.get(1);
  const sess2 = bySession.get(2);

  Assert.ok(sess1, "Session 1 present");
  Assert.ok(sess2, "Session 2 present");

  // Session 1: has title/domain scores and search_events
  Assert.greater(
    Object.keys(sess1.title_scores).length,
    0,
    "Session 1 has title_scores"
  );
  Assert.greater(
    Object.keys(sess1.domain_scores).length,
    0,
    "Session 1 has domain_scores"
  );
  Assert.ok(
    sess1.search_events &&
      typeof sess1.search_events.search_count === "number" &&
      Array.isArray(sess1.search_events.search_titles),
    "Session 1 has search_events summary"
  );

  // Session 2: no search events
  Assert.equal(
    Object.keys(sess2.search_events).length,
    0,
    "Session 2 has empty search_events"
  );

  // Start/end times should be normalized to seconds or null
  for (const sess of prepared) {
    Assert.ok(
      sess.session_start_time === null ||
        Number.isFinite(sess.session_start_time),
      "session_start_time is null or finite"
    );
    Assert.ok(
      sess.session_end_time === null || Number.isFinite(sess.session_end_time),
      "session_end_time is null or finite"
    );
  }
});

add_task(function test_generateProfileInputs_search_only_and_missing_scores() {
  const baseMicros = Date.now() * 1000;

  const rows = [
    // Session 1: search-only, with frequency/domainFrequency missing
    {
      session_id: 1,
      url: "https://www.google.com/search?q=onlysearch",
      title: "Google search: onlysearch",
      domain: "www.google.com",
      visitDateMicros: baseMicros,
      source: "search",
      // frequencyPct and domainFrequencyPct intentionally omitted
    },

    // Session 2: one history visit with scores
    {
      session_id: 2,
      url: "https://example.com/",
      title: "Example",
      domain: "example.com",
      visitDateMicros: baseMicros + 1000,
      frequencyPct: 50,
      domainFrequencyPct: 60,
      source: "history",
    },
  ];

  const prepared = generateProfileInputs(rows);
  const bySession = new Map(prepared.map(r => [r.session_id, r]));
  const sess1 = bySession.get(1);
  const sess2 = bySession.get(2);

  // Session 1: no scores because frecency fields missing, but has search_events
  Assert.deepEqual(
    sess1.title_scores,
    {},
    "Search-only session without frecency has empty title_scores"
  );
  Assert.deepEqual(
    sess1.domain_scores,
    {},
    "Search-only session without frecency has empty domain_scores"
  );
  Assert.ok(
    sess1.search_events &&
      sess1.search_events.search_count === 1 &&
      Array.isArray(sess1.search_events.search_titles),
    "Search-only session still has search_events"
  );

  // Session 2: has scores, but no search_events
  Assert.greater(
    Object.keys(sess2.title_scores).length,
    0,
    "History session has title_scores"
  );
  Assert.greater(
    Object.keys(sess2.domain_scores).length,
    0,
    "History session has domain_scores"
  );
  Assert.equal(
    Object.keys(sess2.search_events).length,
    0,
    "History-only session has empty search_events"
  );
});

add_task(function test_aggregateSessions_basic() {
  const rows = makeSyntheticSessionRows();
  const preparedInputs = generateProfileInputs(rows);

  const [domainAgg, titleAgg, searchAgg] = aggregateSessions(preparedInputs);

  const preparedSessionIds = new Set(preparedInputs.map(p => p.session_id));
  const searchAggIds = new Set(Object.keys(searchAgg).map(id => Number(id)));

  Assert.ok(
    [...searchAggIds].every(id => preparedSessionIds.has(id)),
    "searchAgg keys correspond to prepared session_ids"
  );

  // Domains
  const domainKeys = Object.keys(domainAgg).sort();
  Assert.deepEqual(
    domainKeys,
    ["example.com", "mozilla.org", "www.google.com"].sort(),
    "Domain aggregate keys as expected"
  );

  const exampleDomain = domainAgg["example.com"];
  Assert.ok(exampleDomain, "example.com aggregate present");
  Assert.equal(
    exampleDomain.num_sessions,
    1,
    "example.com appears in one session"
  );
  Assert.greater(
    exampleDomain.session_importance,
    0,
    "example.com has session_importance"
  );
  Assert.greaterOrEqual(
    exampleDomain.last_seen,
    0,
    "example.com last_seen is non-negative"
  );

  const mozillaDomain = domainAgg["mozilla.org"];
  Assert.equal(
    mozillaDomain.num_sessions,
    1,
    "mozilla.org appears in one session"
  );

  const googleDomain = domainAgg["www.google.com"];
  Assert.ok(googleDomain, "www.google.com aggregate present");
  Assert.equal(
    googleDomain.num_sessions,
    1,
    "www.google.com appears in one session"
  );

  // Titles
  Assert.ok(
    Object.prototype.hasOwnProperty.call(titleAgg, "Example A1"),
    "Title Example A1 aggregated"
  );
  Assert.ok(
    Object.prototype.hasOwnProperty.call(titleAgg, "Example A2"),
    "Title Example A2 aggregated"
  );

  const titleA2 = titleAgg["Example A2"];
  Assert.equal(titleA2.num_sessions, 1, "Example A2 appears in one session");

  // Searches
  Assert.ok(
    Object.prototype.hasOwnProperty.call(searchAgg, 1),
    "Search aggregate for session 1 present"
  );
  Assert.ok(
    !Object.prototype.hasOwnProperty.call(searchAgg, 2),
    "No search aggregate for session 2"
  );

  const search1 = searchAgg[1];
  Assert.equal(search1.search_count, 1, "search_count aggregated");
  Assert.deepEqual(
    search1.search_titles.sort(),
    ["Google search: test"].sort(),
    "search_titles aggregated and deduplicated"
  );
  Assert.greater(
    search1.last_searched,
    0,
    "last_searched converted to seconds and > 0"
  );
});

add_task(function test_aggregateSessions_empty() {
  const [domainAgg, titleAgg, searchAgg] = aggregateSessions([]);

  Assert.deepEqual(
    Object.keys(domainAgg),
    [],
    "Empty input -> no domain aggregates"
  );
  Assert.deepEqual(
    Object.keys(titleAgg),
    [],
    "Empty input -> no title aggregates"
  );
  Assert.deepEqual(
    Object.keys(searchAgg),
    [],
    "Empty input -> no search aggregates"
  );
});

add_task(function test_topkAggregates_recency_and_ranking() {
  const nowSec = Math.floor(Date.now() / 1000);

  // Two domains:
  // - old.com: very old
  // - fresh.com: very recent
  const aggDomains = {
    "old.com": {
      score: 100,
      last_seen: nowSec - 60 * 60 * 24 * 60, // 60 days ago
      num_sessions: 1,
      session_importance: 1,
    },
    "fresh.com": {
      score: 100,
      last_seen: nowSec - 60 * 60, // 1 hour ago
      num_sessions: 1,
      session_importance: 1,
    },
  };

  const [domainItems] = topkAggregates(
    aggDomains,
    {},
    {},
    {
      k_domains: 2,
      k_titles: 0,
      k_searches: 0,
      now: nowSec,
    }
  );

  // Expect fresh.com to outrank old.com due to recency decay.
  const [firstDomain, secondDomain] = domainItems.map(([key]) => key);
  Assert.equal(
    firstDomain,
    "fresh.com",
    "More recent domain outranks older one"
  );
  Assert.equal(secondDomain, "old.com", "Older domain comes second");
});

add_task(function test_sanitizeTitle_basic() {
  // Normal title - should pass through unchanged
  const normal = "Example Page Title";
  Assert.equal(
    _sanitizeTitleForTesting(normal),
    normal,
    "Normal title unchanged"
  );
});

add_task(function test_sanitizeTitle_backslash() {
  // Backslash - primary issue that caused JSON parse failures
  const withBackslash = "Claude's new constitution \\ Anthropic";
  const expected = "Claude's new constitution / Anthropic";
  Assert.equal(
    _sanitizeTitleForTesting(withBackslash),
    expected,
    "Backslash replaced with forward slash"
  );

  // Multiple backslashes
  const multipleBackslashes = "Path\\to\\file\\name.txt";
  const expectedMultiple = "Path/to/file/name.txt";
  Assert.equal(
    _sanitizeTitleForTesting(multipleBackslashes),
    expectedMultiple,
    "Multiple backslashes replaced"
  );

  // Windows path
  const windowsPath = "C:\\Users\\Documents\\file.txt";
  const expectedPath = "C:/Users/Documents/file.txt";
  Assert.equal(
    _sanitizeTitleForTesting(windowsPath),
    expectedPath,
    "Windows path backslashes replaced"
  );
});

add_task(function test_sanitizeTitle_control_characters() {
  // Newline
  const withNewline = "Title\nwith\nnewlines";
  Assert.equal(
    _sanitizeTitleForTesting(withNewline),
    "Title with newlines",
    "Newlines replaced with spaces"
  );

  // Tab
  const withTab = "Title\twith\ttabs";
  Assert.equal(
    _sanitizeTitleForTesting(withTab),
    "Title with tabs",
    "Tabs replaced with spaces"
  );

  // Carriage return
  const withCarriageReturn = "Title\rwith\rCR";
  Assert.equal(
    _sanitizeTitleForTesting(withCarriageReturn),
    "Title with CR",
    "Carriage returns replaced with spaces"
  );

  // Mixed control characters
  const mixed = "Title\n\t\rwith\x00mixed\x1Fcontrols";
  Assert.equal(
    _sanitizeTitleForTesting(mixed),
    "Title with mixed controls",
    "Mixed control characters replaced and collapsed"
  );
});

add_task(function test_sanitizeTitle_multiple_spaces() {
  // Multiple spaces should collapse to single space
  const multipleSpaces = "Title    with    many    spaces";
  Assert.equal(
    _sanitizeTitleForTesting(multipleSpaces),
    "Title with many spaces",
    "Multiple spaces collapsed to single space"
  );

  // Mixed spacing
  const mixedSpacing = "Title  \t\n  with  \r  mixed   spacing";
  Assert.equal(
    _sanitizeTitleForTesting(mixedSpacing),
    "Title with mixed spacing",
    "Mixed spacing collapsed"
  );
});

add_task(function test_sanitizeTitle_whitespace_trim() {
  // Leading whitespace
  const leading = "   Title with leading spaces";
  Assert.equal(
    _sanitizeTitleForTesting(leading),
    "Title with leading spaces",
    "Leading whitespace trimmed"
  );

  // Trailing whitespace
  const trailing = "Title with trailing spaces   ";
  Assert.equal(
    _sanitizeTitleForTesting(trailing),
    "Title with trailing spaces",
    "Trailing whitespace trimmed"
  );

  // Both
  const both = "   Title with both   ";
  Assert.equal(
    _sanitizeTitleForTesting(both),
    "Title with both",
    "Both leading and trailing whitespace trimmed"
  );
});

add_task(async function test_sensitive_info_filtering() {
  await PlacesUtils.history.clear();
  const now = Date.now();

  const seeded = [
    makeVisit(
      "https://example.com/page",
      "Normal Page Title",
      now,
      -5 * 60 * 1000
    ),
    makeVisit(
      "https://example.com/contact",
      "Contact me at user@example.com",
      now,
      -10 * 60 * 1000
    ),
    makeVisit(
      "https://example.com/phone",
      "Call 555-123-4567 for support",
      now,
      -15 * 60 * 1000
    ),
    makeVisit(
      "https://example.com/user?email=sensitive@test.com",
      "User Profile",
      now,
      -20 * 60 * 1000
    ),
    makeVisit(
      "https://example.com/ssn",
      "SSN: 123-45-6789 on file",
      now,
      -25 * 60 * 1000
    ),
  ];

  await PlacesUtils.history.insertMany(seeded);

  const rows = await getRecentHistory({ days: 1, maxResults: 100 });

  const urls = rows.map(r => r.url);
  const titles = rows.map(r => r.title);

  Assert.ok(
    urls.includes("https://example.com/page"),
    "Normal page without sensitive info included"
  );

  Assert.ok(
    !titles.some(t => t.includes("user@example.com")),
    "Title with email address filtered out"
  );

  Assert.ok(
    !titles.some(t => t.includes("555-123-4567")),
    "Title with phone number filtered out"
  );

  Assert.ok(
    !urls.includes("https://example.com/user?email=sensitive@test.com"),
    "URL with email parameter filtered out"
  );

  Assert.ok(
    !titles.some(t => t.includes("123-45-6789")),
    "Title with SSN filtered out"
  );
});

add_task(async function test_sensitive_keywords_filtering() {
  await PlacesUtils.history.clear();
  const now = Date.now();

  const seeded = [
    makeVisit(
      "https://example.com/normal",
      "Best restaurants in Seattle",
      now,
      -5 * 60 * 1000
    ),
    makeVisit(
      "https://example.com/medical",
      "Cancer treatment options and therapy",
      now,
      -10 * 60 * 1000
    ),
    makeVisit(
      "https://example.com/finance",
      "How to improve credit score and mortgage rates",
      now,
      -15 * 60 * 1000
    ),
    makeVisit(
      "https://example.com/legal",
      "Divorce attorney in California",
      now,
      -20 * 60 * 1000
    ),
    makeVisit(
      "https://example.com/political",
      "Democrat vs Republican policies comparison",
      now,
      -25 * 60 * 1000
    ),
    makeVisit(
      "https://healthcenter.com/pregnancy-test",
      "Normal page title",
      now,
      -30 * 60 * 1000
    ),
  ];

  await PlacesUtils.history.insertMany(seeded);

  const rows = await getRecentHistory({ days: 1, maxResults: 100 });

  const urls = rows.map(r => r.url);
  const titles = rows.map(r => r.title);

  Assert.ok(
    urls.includes("https://example.com/normal"),
    "Normal page without sensitive keywords included"
  );

  Assert.ok(
    !titles.some(t => t.toLowerCase().includes("cancer")),
    "Title with medical keyword (cancer) filtered out"
  );

  Assert.ok(
    !titles.some(t => t.toLowerCase().includes("therapy")),
    "Title with medical keyword (therapy) filtered out"
  );

  Assert.ok(
    !titles.some(t => t.toLowerCase().includes("credit score")),
    "Title with finance keyword (credit score) filtered out"
  );

  Assert.ok(
    !titles.some(t => t.toLowerCase().includes("mortgage")),
    "Title with finance keyword (mortgage) filtered out"
  );

  Assert.ok(
    !titles.some(t => t.toLowerCase().includes("divorce")),
    "Title with legal keyword (divorce) filtered out"
  );

  Assert.ok(
    !titles.some(t => t.toLowerCase().includes("democrat")),
    "Title with political keyword (democrat) filtered out"
  );

  Assert.ok(
    !urls.includes("https://healthcenter.com/pregnancy-test"),
    "URL with sensitive keyword (pregnancy) filtered out"
  );
});
