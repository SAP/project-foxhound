/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Cross-source sessionization for memory generation.
 *
 * `buildSessions` merges history visits, searches, and chat messages into a
 * single timestamped event stream and groups them into sessions by gap and
 * maximum session length. A downstream LLM step processes one session at a
 * time, so the model sees browsing context and chat context that occurred
 * together in time as one bundle.
 *
 * Source IDs are tracked separately by sources (`history_source_ids` for
 * `url_hash` values, `conversation_source_ids` for `convId` values) so a
 * revocation hook can match the right kind of ID when the user deletes
 * history or a conversation.
 *
 * This function is pure: it does not read prefs. Callers gate via
 * `MemoriesManager.shouldEnableMemoriesFromSchedulers` and pass `[]` for
 * any disabled source:
 *   - both enabled  → cross-source sessions
 *   - history only  → history-only sessions
 *   - chat only     → chat-only sessions, time-bucketed by message timestamp
 *   - neither       → caller short-circuits before calling
 *
 */

const MS_PER_SEC = 1_000;
const MICROS_PER_MS = 1_000;

const DEFAULT_GAP_SEC = 900;
const DEFAULT_MAX_SESSION_SEC = 7_200;

const KIND_VISIT = "visit";
const KIND_SEARCH = "search";
const KIND_CHAT = "chat";

/**
 * Build per-session bundles from history rows and chat messages.
 *
 * A new session begins when either (a) the gap to the previous event
 * exceeds `gapSec`, or (b) the running session length exceeds
 * `maxSessionSec`. Visits, searches, and chat messages share the same
 * sessionization stream.
 *
 * @param {Array<object>} [history]
 *   Output of `getRecentHistory()`. Each row must carry `visitDateMicros`;
 *   may carry `urlHash`, `source` ("history"|"search"), `url`, `domain`,
 *   `title`, `frequencyPct`, `domainFrequencyPct`. Rows without a finite
 *   `visitDateMicros` are skipped.
 *
 * @param {Array<object>} [chats]
 *   Output of `getRecentChats()`. Each message must carry a finite
 *   `createdDate` (epoch ms number or Date) and a non-null `convId`;
 *   messages missing either are skipped. May carry `role`, `content`,
 *   `pageUrl`, `freshness_score`.
 *
 * @param {object} [opts]
 * @param {number} [opts.gapSec=900]
 *   Max allowed gap between consecutive events within one session, seconds.
 * @param {number} [opts.maxSessionSec=7200]
 *   Max total session length, seconds.
 *
 * @returns {Array<{
 *   session_id: number,
 *   session_start_ms: number,
 *   session_end_ms: number,
 *   visit_count: number,
 *   search_count: number,
 *   chat_count: number,
 *   total_view_time_ms: number,
 *   chats: Array<object>,
 *   history_source_ids: Array<string|number>,
 *   conversation_source_ids: Array<string>,
 *   domains: Array<string>,
 *   titles: Array<string>,
 *   search_queries: Array<string>,
 * }>}
 *   Sessions in ascending start-time order. `history_source_ids`,
 *   `conversation_source_ids`, `domains`, `titles`, and `search_queries`
 *   are deduped. `visit_count` / `search_count` / `chat_count` are raw
 *   event tallies. `chats` keeps the raw user messages.
 */
export function buildSessions(history = [], chats = [], opts = {}) {
  const gapMs = (opts.gapSec ?? DEFAULT_GAP_SEC) * MS_PER_SEC;
  const maxSessionMs =
    (opts.maxSessionSec ?? DEFAULT_MAX_SESSION_SEC) * MS_PER_SEC;

  const events = [];

  for (const row of history) {
    if (!Number.isFinite(row.visitDateMicros)) {
      continue;
    }
    events.push({
      kind: row.source === "search" ? KIND_SEARCH : KIND_VISIT,
      timestampMs: Math.floor(row.visitDateMicros / MICROS_PER_MS),
      row,
    });
  }

  for (const msg of chats) {
    if (msg.convId == null) {
      continue;
    }
    const t = getMessageTimestampMs(msg);
    if (!Number.isFinite(t)) {
      continue;
    }
    events.push({ kind: KIND_CHAT, timestampMs: t, row: msg });
  }

  events.sort((a, b) => a.timestampMs - b.timestampMs);

  const sessions = [];
  let cur = null;

  for (const ev of events) {
    const t = ev.timestampMs;
    const needNew =
      cur === null ||
      t - cur._lastMs > gapMs ||
      t - cur.session_start_ms > maxSessionMs;

    if (needNew) {
      cur = {
        session_id: t,
        session_start_ms: t,
        session_end_ms: t,
        _lastMs: t,
        _urlHashes: new Set(),
        _convIds: new Set(),
        _domains: new Set(),
        _titles: new Set(),
        _queries: new Set(),
        _visitCount: 0,
        _searchCount: 0,
        _totalViewTimeMs: 0,
        chats: [],
      };
      sessions.push(cur);
    }

    const row = ev.row;
    if (ev.kind === KIND_VISIT) {
      cur._visitCount++;
      cur._totalViewTimeMs += row.totalViewTimeMs || 0;
      if (row.title) {
        cur._titles.add(row.title);
      }
      if (row.urlHash != null) {
        cur._urlHashes.add(row.urlHash);
      }
      if (row.domain) {
        cur._domains.add(row.domain);
      }
    } else if (ev.kind === KIND_SEARCH) {
      cur._searchCount++;
      if (row.title) {
        cur._queries.add(row.title);
      }
      if (row.urlHash != null) {
        cur._urlHashes.add(row.urlHash);
      }
      if (row.domain) {
        cur._domains.add(row.domain);
      }
    } else {
      cur.chats.push(row);
      cur._convIds.add(row.convId);
    }

    cur.session_end_ms = t;
    cur._lastMs = t;
  }

  return sessions.map(s => ({
    session_id: s.session_id,
    session_start_ms: s.session_start_ms,
    session_end_ms: s.session_end_ms,
    visit_count: s._visitCount,
    search_count: s._searchCount,
    chat_count: s.chats.length,
    total_view_time_ms: s._totalViewTimeMs,
    chats: s.chats,
    history_source_ids: [...s._urlHashes],
    conversation_source_ids: [...s._convIds],
    domains: [...s._domains],
    titles: [...s._titles],
    search_queries: [...s._queries],
  }));
}

function getMessageTimestampMs(msg) {
  return typeof msg.createdDate === "number"
    ? msg.createdDate
    : (msg.createdDate?.getTime?.() ?? NaN);
}
