/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { buildSessions } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/memories/MemoriesSessions.sys.mjs"
);

const MS = 1_000;
const MICROS_PER_MS = 1_000;

function visit(timestampMs, extra = {}) {
  return {
    source: "history",
    visitDateMicros: timestampMs * MICROS_PER_MS,
    url: "https://example.com/",
    domain: "example.com",
    title: "Example",
    urlHash: 1,
    totalViewTimeMs: 0,
    ...extra,
  };
}

function search(timestampMs, extra = {}) {
  return visit(timestampMs, { source: "search", title: "query", ...extra });
}

function chat(timestampMs, extra = {}) {
  return {
    role: "user",
    content: "hello",
    convId: extra.convId ?? "c1",
    createdDate: timestampMs,
    ...extra,
  };
}

add_task(function test_empty_inputs_return_empty_array() {
  Assert.deepEqual(buildSessions(), [], "no args → []");
  Assert.deepEqual(buildSessions([], []), [], "empty arrays → []");
});

add_task(function test_single_visit_makes_one_session() {
  const t = 1_700_000_000_000;
  const sessions = buildSessions(
    [visit(t, { urlHash: 42, domain: "a.com", title: "A" })],
    []
  );
  Assert.equal(sessions.length, 1, "one session produced");
  const s = sessions[0];
  Assert.equal(s.visit_count, 1);
  Assert.equal(s.search_count, 0);
  Assert.equal(s.chat_count, 0);
  Assert.equal(s.session_start_ms, t);
  Assert.equal(s.session_end_ms, t);
  Assert.deepEqual(s.history_source_ids, [42]);
  Assert.deepEqual(s.conversation_source_ids, []);
  Assert.deepEqual(s.domains, ["a.com"]);
  Assert.deepEqual(s.titles, ["A"]);
});

add_task(function test_visits_within_gap_merge_into_one_session() {
  const t = 1_700_000_000_000;
  const sessions = buildSessions(
    [
      visit(t, { urlHash: 1, domain: "a.com", title: "A" }),
      visit(t + 60 * MS, { urlHash: 2, domain: "b.com", title: "B" }),
      visit(t + 120 * MS, { urlHash: 1, domain: "a.com", title: "A" }),
    ],
    [],
    { gapSec: 900 }
  );
  Assert.equal(sessions.length, 1, "all within gap → 1 session");
  const s = sessions[0];
  Assert.equal(s.visit_count, 3, "raw event count, not dedup");
  Assert.deepEqual(s.history_source_ids.sort(), [1, 2], "urlHashes deduped");
  Assert.deepEqual(s.domains.sort(), ["a.com", "b.com"]);
});

add_task(function test_gap_exceeded_splits_into_two_sessions() {
  const t = 1_700_000_000_000;
  const sessions = buildSessions([visit(t), visit(t + 1000 * MS)], [], {
    gapSec: 900,
  });
  Assert.equal(sessions.length, 2, "gap > 900s → 2 sessions");
  Assert.equal(sessions[0].session_start_ms, t);
  Assert.equal(sessions[1].session_start_ms, t + 1000 * MS);
});

add_task(function test_max_session_length_forces_split() {
  const t = 1_700_000_000_000;
  // Events 1s apart, but max session length = 5s → must split after 5s.
  const history = [];
  for (let i = 0; i < 10; i++) {
    history.push(visit(t + i * MS));
  }
  const sessions = buildSessions(history, [], {
    gapSec: 900,
    maxSessionSec: 5,
  });
  Assert.equal(
    sessions.length,
    2,
    "maxSessionSec forces a split even without a gap"
  );
});

add_task(function test_history_and_chat_merge_in_time_order() {
  const t = 1_700_000_000_000;
  const sessions = buildSessions(
    [visit(t), visit(t + 60 * MS)],
    [chat(t + 30 * MS, { convId: "c-alpha" })],
    { gapSec: 900 }
  );
  Assert.equal(sessions.length, 1, "interleaved events → single session");
  const s = sessions[0];
  Assert.equal(s.visit_count, 2);
  Assert.equal(s.chat_count, 1);
  Assert.deepEqual(s.conversation_source_ids, ["c-alpha"]);
});

add_task(function test_source_ids_are_separated_and_deduped() {
  const t = 1_700_000_000_000;
  const sessions = buildSessions(
    [visit(t, { urlHash: 7 }), visit(t + 10 * MS, { urlHash: 7 })],
    [
      chat(t + 5 * MS, { convId: "c1" }),
      chat(t + 15 * MS, { convId: "c1" }),
      chat(t + 20 * MS, { convId: "c2" }),
    ]
  );
  Assert.equal(sessions.length, 1);
  const s = sessions[0];
  Assert.deepEqual(s.history_source_ids, [7], "duplicate urlHash deduped");
  Assert.deepEqual(
    s.conversation_source_ids.sort(),
    ["c1", "c2"],
    "duplicate convId deduped, both kept"
  );
});

add_task(function test_search_rows_populate_search_queries() {
  const t = 1_700_000_000_000;
  const sessions = buildSessions(
    [search(t, { title: "firefox release notes" }), visit(t + 5 * MS)],
    []
  );
  Assert.equal(sessions.length, 1);
  const s = sessions[0];
  Assert.equal(s.search_count, 1);
  Assert.equal(s.visit_count, 1);
  Assert.deepEqual(s.search_queries, ["firefox release notes"]);
});

add_task(function test_skips_rows_with_invalid_timestamps() {
  const t = 1_700_000_000_000;
  const sessions = buildSessions(
    [
      visit(t),
      { source: "history", visitDateMicros: NaN, urlHash: 99 },
      { source: "history", urlHash: 100 }, // missing visitDateMicros
    ],
    [
      chat(t + 5 * MS, { convId: "c1" }),
      chat(NaN, { convId: "c2" }),
      { role: "user", content: "x", convId: null, createdDate: t + 6 * MS },
    ]
  );
  Assert.equal(sessions.length, 1);
  const s = sessions[0];
  Assert.equal(s.visit_count, 1, "rows with bad timestamps dropped");
  Assert.equal(s.chat_count, 1, "chats missing convId or timestamp dropped");
});
