/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This module handles the visit extraction data from browsing history
 */

import { PlacesUtils } from "resource://gre/modules/PlacesUtils.sys.mjs";
import { BlockListManager } from "chrome://global/content/ml/Utils.sys.mjs";
import { SensitiveInfoDetector } from "moz-src:///browser/components/aiwindow/models/memories/SensitiveInfoDetector.sys.mjs";

const MS_PER_DAY = 86_400_000;
const MICROS_PER_MS = 1_000;
const MS_PER_SEC = 1_000;
const MICROS_PER_SEC = 1_000_000;
const SECONDS_PER_DAY = 86_400;

// History fetch defaults
const DEFAULT_DAYS = 60;
const DEFAULT_MAX_RESULTS = 3000;

// Sessionization defaults
const DEFAULT_GAP_SEC = 900;
const DEFAULT_MAX_SESSION_SEC = 7200;

// Recency defaults
const DEFAULT_HALFLIFE_DAYS = 14;
const DEFAULT_RECENCY_FLOOR = 0.5;
const DEFAULT_SESSION_WEIGHT = 1.0;

const SEARCH_ENGINE_DOMAINS = [
  "google",
  "bing",
  "duckduckgo",
  "search.brave",
  "yahoo",
  "startpage",
  "ecosia",
  "baidu",
  "yandex",
];

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SEARCH_ENGINE_PATTERN = new RegExp(
  `(^|\\.)(${SEARCH_ENGINE_DOMAINS.map(escapeRe).join("|")})\\.`,
  "i"
);

let _mgr = BlockListManager.initializeFromDefault({ language: "en" });
let _sensitiveInfoDetector = new SensitiveInfoDetector();

/**
 * Fetch recent browsing history from Places (SQL), aggregate by URL,
 * tag "search" vs "history", and attach simple frequency percentiles.
 *
 * This API is designed to support both:
 *   - Initial ("Day 0") backfills over a fixed time window, and
 *   - Incremental reads using a visit_date watermark (`sinceMicros`).
 *
 * Callers can either:
 *   1. Pass `sinceMicros` (microseconds since epoch, Places visit_date-style)
 *      to fetch visits with `visit_date >= sinceMicros`, or
 *   2. Omit `sinceMicros` and let `days` define a relative cutoff window
 *      from "now" (e.g., last 60 days).
 *
 * Typical usage:
 *   - Day 0:   getRecentHistory({ sinceMicros: 0, maxResults: 3000 })
 *              // or: getRecentHistory({ days: 60, maxResults: 3000 })
 *   - Incremental:
 *        const rows = await getRecentHistory({ sinceMicros: lastWatermark });
 *        const nextWatermark = Math.max(...rows.map(r => r.visitDateMicros));
 *
 * NOTE: `visitDateMicros` in the returned objects is the raw Places
 *       visit_date (microseconds since epoch, UTC).
 *
 * @param {object} [opts]
 * @param {number} [opts.sinceMicros=null]
 *        Optional absolute cutoff in microseconds since epoch (Places
 *        visit_date). If provided, this is used directly as the cutoff:
 *        only visits with `visit_date >= sinceMicros` are returned.
 *
 *        This is the recommended way to implement incremental reads:
 *        store the max `visitDateMicros` from the previous run and pass
 *        it (or max + 1) back in as `sinceMicros`.
 *
 * @param {number} [opts.days=DEFAULT_DAYS]
 *        How far back to look if `sinceMicros` is not provided.
 *        The cutoff is computed as:
 *          cutoff = now() - days * MS_PER_DAY
 *
 *        Ignored when `sinceMicros` is non-null.
 *
 * @param {number} [opts.maxResults=DEFAULT_MAX_RESULTS]
 *        Maximum number of rows to return from the SQL query (after
 *        sorting by most recent visit). Note that this caps the number
 *        of visits, not distinct URLs.
 *
 * @returns {Promise<Array<{
 *   url: string,
 *   title: string,
 *   domain: string,
 *   visitDateMicros: number,
 *   frequencyPct: number,
 *   domainFrequencyPct: number,
 *   source: 'history'|'search'
 * }>>}
 */
export async function getRecentHistory(opts = {}) {
  // If provided, this is a Places visit_date-style cutoff in microseconds
  // When non-null, `days` is ignored and we use `sinceMicros` directly.
  const {
    sinceMicros = null,
    days = DEFAULT_DAYS,
    maxResults = DEFAULT_MAX_RESULTS,
  } = opts;

  // Places stores visit_date in microseconds since epoch.
  let cutoffMicros;
  if (sinceMicros != null) {
    cutoffMicros = Math.max(0, sinceMicros);
  } else {
    cutoffMicros = Math.max(
      0,
      (Date.now() - days * MS_PER_DAY) * MICROS_PER_MS
    );
  }

  const isSearchVisit = urlStr => {
    try {
      const { hostname, pathname, search } = new URL(urlStr);
      const isSearchEngine = SEARCH_ENGINE_PATTERN.test(hostname);
      const looksLikeSearch =
        /search|results|query/i.test(pathname) ||
        /[?&](q|query|p)=/i.test(search);
      return isSearchEngine && looksLikeSearch;
    } catch (e) {
      console.error("isSearchVisit: failed to parse URL", {
        error: String(e),
        urlLength: typeof urlStr === "string" ? urlStr.length : -1,
      });
      return false;
    }
  };

  const SQL = `
    WITH visit_info AS (
      SELECT
        p.id                     AS place_id,
        p.url                    AS url,
        o.host                   AS host,
        p.title                  AS title,
        v.visit_date             AS visit_date,
        p.frecency               AS frecency,
        CASE WHEN o.frecency = -1 THEN 1 ELSE o.frecency END AS domain_frecency
      FROM moz_places p
      JOIN moz_historyvisits v ON v.place_id = p.id
      JOIN moz_origins o       ON p.origin_id = o.id
      WHERE v.visit_date >= :cutoff
        AND p.title IS NOT NULL
        AND p.frecency IS NOT NULL
      ORDER BY v.visit_date DESC
      LIMIT :limit
    ),

    /* Collapse to one row per place to compute percentiles (like your groupby/place_id mean) */
    per_place AS (
      SELECT
        place_id,
        MAX(frecency)         AS frecency,
        MAX(domain_frecency)  AS domain_frecency
      FROM visit_info
      GROUP BY place_id
    ),

    /* Percentiles using window function CUME_DIST() */
    per_place_with_pct AS (
      SELECT
        place_id,
        ROUND(100.0 * CUME_DIST() OVER (ORDER BY frecency), 2) AS frecency_pct,
        ROUND(100.0 * CUME_DIST() OVER (ORDER BY domain_frecency), 2) AS domain_frecency_pct
      FROM per_place
    )

    /* Final rows: original visits + joined percentiles + source label */
    SELECT
      v.url,
      v.host,
      v.title,
      v.visit_date,
      p.frecency_pct,
      p.domain_frecency_pct
    FROM visit_info v
    JOIN per_place_with_pct p USING (place_id)
    ORDER BY v.visit_date DESC
  `;

  try {
    const rows = await PlacesUtils.withConnectionWrapper(
      "smartwindow-getRecentHistory",
      async db => {
        const stmt = await db.execute(SQL, {
          cutoff: cutoffMicros,
          limit: maxResults,
        });

        const out = [];
        for (const row of stmt) {
          const url = row.getResultByName("url");
          const host = row.getResultByName("host");
          const onlyTitle = row.getResultByName("title") || "";
          let title;
          if (onlyTitle) {
            const sanitizedTitle = sanitizeTitle(onlyTitle);
            title = sanitizedTitle + " | " + host;
          } else {
            title = onlyTitle;
          }
          if (
            _mgr.matchAtWordBoundary({ text: title.toLowerCase() }) ||
            _sensitiveInfoDetector.containsSensitiveInfo(title) ||
            _sensitiveInfoDetector.containsSensitiveInfo(url) ||
            _sensitiveInfoDetector.containsSensitiveKeywords(title) ||
            _sensitiveInfoDetector.containsSensitiveKeywords(url)
          ) {
            continue;
          }
          const visitDateMicros = row.getResultByName("visit_date") || 0;
          const frequencyPct = row.getResultByName("frecency_pct") || 0;
          const domainFrequencyPct =
            row.getResultByName("domain_frecency_pct") || 0;

          out.push({
            url,
            domain: host,
            title,
            visitDateMicros,
            frequencyPct,
            domainFrequencyPct,
            source: isSearchVisit(url) ? "search" : "history",
          });
        }
        return out;
      }
    );
    return rows;
  } catch (error) {
    console.error("Failed to fetch Places history via SQL:", error);
    return [];
  }
}

/**
 * Sessionize visits using a gap and max session length.
 * Returns a new array sorted by ascending time and adds:
 *  - session_id
 *  - session_start_ms
 *  - session_start_iso
 *
 * @param {Array<{visitDateMicros:number,title?:string,domain?:string,frequencyPct?:number,domainFrequencyPct?:number,source?:'history'|'search'}>} rows
 * @param {object} [opts]
 * @param {number} [opts.gapSec=900]        Max allowed gap between consecutive visits in a session (seconds)
 * @param {number} [opts.maxSessionSec=7200] Max session duration from first to current visit (seconds)
 * @returns {Array}
 */
export function sessionizeVisits(rows, opts = {}) {
  const GAP_MS = (opts.gapSec ?? DEFAULT_GAP_SEC) * MS_PER_SEC;
  const MAX_SESSION_MS =
    (opts.maxSessionSec ?? DEFAULT_MAX_SESSION_SEC) * MS_PER_SEC;

  // Normalize and keep only visits with a valid timestamp
  const normalized = rows
    // Keep only rows with a valid timestamp
    .filter(row => Number.isFinite(row.visitDateMicros))
    .map(row => ({
      ...row,
      visitTimeMs: Math.floor(row.visitDateMicros / MICROS_PER_MS),
    }))
    .sort((a, b) => a.visitTimeMs - b.visitTimeMs);

  let curStartMs = null;
  let prevMs = null;

  for (const row of normalized) {
    const timeMs = row.visitTimeMs;

    const startNew =
      prevMs === null ||
      timeMs - prevMs > GAP_MS ||
      timeMs - curStartMs > MAX_SESSION_MS;

    if (startNew) {
      curStartMs = timeMs;
    }

    row.session_start_ms = curStartMs;
    row.session_start_iso = new Date(curStartMs).toISOString();
    row.session_id = curStartMs;

    prevMs = timeMs;
  }

  return normalized;
}

/**
 * Build per-session feature records from sessionized rows.
 *
 * Output record shape:
 * {
 *   session_id: number,
 *   title_scores: { [title: string]: number },
 *   domain_scores: { [domain: string]: number },
 *   session_start_time: number | null, // epoch seconds
 *   session_end_time: number | null,   // epoch seconds
 *   search_events: {
 *     session_id: number,
 *     search_count: number,
 *     search_titles: string[],
 *     last_searched: number,           // epoch micros
 *   } | {}
 * }
 *
 * @param {Array} rows  sessionized visits
 * @returns {Array}
 */
export function generateProfileInputs(rows) {
  const bySession = new Map();
  for (const row of rows) {
    const sessionId = row.session_id;
    if (!bySession.has(sessionId)) {
      bySession.set(sessionId, []);
    }
    bySession.get(sessionId).push(row);
  }

  // session_id -> { title: frecency_pct }
  const titleScoresBySession = {};
  for (const [sessionId, items] of bySession) {
    const m = {};
    for (const r of items) {
      const title = r.title ?? "";
      const pct = r.frequencyPct;
      if (title && isFiniteNumber(pct)) {
        m[title] = pct;
      }
    }
    if (Object.keys(m).length) {
      titleScoresBySession[sessionId] = m;
    }
  }

  // session_id -> { domain: domain_frecency_pct }
  const domainScoresBySession = {};
  for (const [sessionId, items] of bySession) {
    const m = {};
    for (const r of items) {
      const domain = r.domain ?? r.host ?? "";
      const pct = r.domainFrequencyPct;
      if (domain && isFiniteNumber(pct)) {
        m[domain] = pct;
      }
    }
    if (Object.keys(m).length) {
      domainScoresBySession[sessionId] = m;
    }
  }

  // session_id -> { search_count, search_titles (unique), last_searched }
  const searchSummaryBySession = {};
  for (const [sessionId, items] of bySession) {
    const searchItems = items.filter(r => r.source === "search");
    if (!searchItems.length) {
      continue;
    }
    const search_titles = [
      ...new Set(searchItems.map(r => r.title).filter(Boolean)),
    ];
    const last_searched_raw = Math.max(
      ...searchItems.map(r => Number(r.visitDateMicros) || 0)
    );
    searchSummaryBySession[sessionId] = {
      session_id: sessionId,
      search_count: searchItems.length,
      search_titles,
      last_searched: last_searched_raw,
    };
  }

  // session start/end times
  const sessionTimes = { start_time: {}, end_time: {} };
  for (const [sessionId, items] of bySession) {
    const tsList = items
      .filter(Number.isFinite)
      .map(r => Number(r.visitDateMicros));
    if (tsList.length) {
      sessionTimes.start_time[sessionId] = Math.min(...tsList);
      sessionTimes.end_time[sessionId] = Math.max(...tsList);
    } else {
      sessionTimes.start_time[sessionId] = null;
      sessionTimes.end_time[sessionId] = null;
    }
  }

  // final prepared inputs
  const preparedInputs = [];
  for (const sessionId of bySession.keys()) {
    const rawRecord = {
      session_id: sessionId,
      title_scores: titleScoresBySession[sessionId] || {},
      domain_scores: domainScoresBySession[sessionId] || {},
      session_start_time: normalizeEpochSeconds(
        sessionTimes.start_time[sessionId]
      ),
      session_end_time: normalizeEpochSeconds(sessionTimes.end_time[sessionId]),
      search_events: searchSummaryBySession[sessionId] || {},
    };
    const record = {};
    for (const [key, value] of Object.entries(rawRecord)) {
      if (value !== undefined) {
        record[key] = value;
      }
    }
    preparedInputs.push(record);
  }
  return preparedInputs;
}

/**
 * Aggregate over sessions into three dictionaries:
 *   - agg_domains: domain -> { score, last_seen, num_sessions, session_importance }
 *   - agg_titles:  title  -> { score, last_seen, num_sessions, session_importance }
 *   - agg_searches: session_id -> { search_count, search_titles[], last_searched(sec) }
 *
 * Notes:
 * - "last value wins" semantics for scores (matches your Python loop)
 * - session_importance ~ (#sessions total / #sessions item appears in), rounded 2dp
 *
 * @param {Array} preparedInputs
 * @returns {[Record<string, any>, Record<string, any>, Record<string, any>]}
 */
export function aggregateSessions(preparedInputs) {
  // domain -> { score, last_seen, sessions:Set }
  const domainAgg = Object.create(null);

  // title -> { score, last_seen, sessions:Set }
  const titleAgg = Object.create(null);

  // sid -> { search_count, search_titles:Set, last_searched }
  const searchAgg = Object.create(null);

  const nowSec = Date.now() / 1000;
  const totalSessions = preparedInputs.length;

  for (const session of preparedInputs) {
    const sessionId = session.session_id;
    const startSec = session.session_start_time;
    const endSec = session.session_end_time;
    const lastSeenSec = endSec ?? startSec ?? nowSec;

    // domains
    const domainScores = session.domain_scores || {};
    for (const [domain, scoreVal] of Object.entries(domainScores)) {
      const rec = getOrInit(domainAgg, domain, () => ({
        score: 0.0,
        last_seen: 0,
        sessions: new Set(),
      }));
      rec.score = Number(scoreVal); // last value wins
      rec.last_seen = Math.max(rec.last_seen, lastSeenSec);
      rec.sessions.add(sessionId);
    }

    // titles
    const titleScores = session.title_scores || {};
    for (const [title, scoreVal] of Object.entries(titleScores)) {
      const rec = getOrInit(titleAgg, title, () => ({
        score: 0.0,
        last_seen: 0,
        sessions: new Set(),
      }));
      rec.score = Number(scoreVal); // last value wins
      rec.last_seen = Math.max(rec.last_seen, lastSeenSec);
      rec.sessions.add(sessionId);
    }

    // searches
    const searchEvents = session.search_events || {};
    const { search_count, search_titles, last_searched } = searchEvents;

    const hasSearchContent =
      (search_count && search_count > 0) ||
      (Array.isArray(search_titles) && search_titles.length) ||
      Number.isFinite(last_searched);

    if (hasSearchContent) {
      const rec = getOrInit(searchAgg, sessionId, () => ({
        search_count: 0,
        search_titles: new Set(),
        last_searched: 0.0,
      }));
      rec.search_count += Number(search_count || 0);
      for (const title of search_titles || []) {
        rec.search_titles.add(title);
      }
      rec.last_searched = Math.max(rec.last_searched, toSeconds(last_searched));
    }
  }

  for (const rec of Object.values(domainAgg)) {
    const n = rec.sessions.size;
    rec.num_sessions = n;
    rec.session_importance = n > 0 ? round2(totalSessions / n) : 0.0;
    delete rec.sessions;
  }
  for (const rec of Object.values(titleAgg)) {
    const n = rec.sessions.size;
    rec.num_sessions = n;
    rec.session_importance = n > 0 ? round2(totalSessions / n) : 0.0;
    delete rec.sessions;
  }

  for (const key of Object.keys(searchAgg)) {
    const rec = searchAgg[key];
    rec.search_titles = [...rec.search_titles];
  }

  return [domainAgg, titleAgg, searchAgg];
}

/**
 * Compute top-k domains, titles, and searches from aggregate structures.
 *
 * Input shapes:
 *   aggDomains: {
 *     [domain: string]: {
 *       score: number,
 *       last_seen: number,
 *       num_sessions: number,
 *       session_importance: number,
 *     }
 *   }
 *
 *   aggTitles: {
 *     [title: string]: {
 *       score: number,
 *       last_seen: number,
 *       num_sessions: number,
 *       session_importance: number,
 *     }
 *   }
 *
 *   aggSearches: {
 *     [sessionId: string|number]: {
 *       search_count: number,
 *       search_titles: string[],
 *       last_searched: number,
 *     }
 *   }
 *
 * Output shape:
 *   [
 *     [ [domain, rank], ... ],         // domains, length <= kDomains
 *     [ [title, rank], ... ],          // titles,  length <= kTitles
 *     [ { sid, cnt, q, ls, r }, ... ], // searches, length <= kSearches
 *   ]
 *
 * @param {{[domain: string]: any}} aggDomains
 * @param {{[title: string]: any}} aggTitles
 * @param {{[sessionId: string]: any}} aggSearches
 * @param {object} [options]
 * @param {number} [options.k_domains=30]
 * @param {number} [options.k_titles=60]
 * @param {number} [options.k_searches=10]
 * @param {number} [options.now]  Current time; seconds or ms, normalized internally.
 */
export function topkAggregates(
  aggDomains,
  aggTitles,
  aggSearches,
  { k_domains = 30, k_titles = 60, k_searches = 10, now = undefined } = {}
) {
  // Normalize `now` to epoch seconds.
  let nowSec;
  if (now == null) {
    nowSec = Date.now() / 1000;
  } else {
    const asNum = Number(now);
    // Heuristic: treat 1e12+ as ms, otherwise seconds.
    nowSec = asNum > 1e12 ? asNum / MS_PER_SEC : asNum;
  }

  // Domains: [{key, rank, num_sessions, last_seen}]
  const domainRanked = Object.entries(aggDomains).map(([domain, info]) => {
    const score = Number(info.score || 0);
    const importance = Number(info.session_importance || 0);
    const lastSeen = Number(info.last_seen || 0);
    const numSessions = Number(info.num_sessions || 0);

    const rank = withRecency(score, importance, lastSeen, { now: nowSec });

    return {
      key: domain,
      rank,
      num_sessions: numSessions,
      last_seen: lastSeen,
    };
  });

  // Titles: [{key, rank, num_sessions, last_seen}]
  const titleRanked = Object.entries(aggTitles).map(([title, info]) => {
    const score = Number(info.score || 0);
    const importance = Number(info.session_importance || 0);
    const lastSeen = Number(info.last_seen || 0);
    const numSessions = Number(info.num_sessions || 0);

    const rank = withRecency(score, importance, lastSeen, { now: nowSec });

    return {
      key: title,
      rank,
      num_sessions: numSessions,
      last_seen: lastSeen,
    };
  });

  // Searches: [{sid, cnt, q, ls, rank}]
  const searchRanked = Object.entries(aggSearches).map(([sidRaw, info]) => {
    const sid = Number.isFinite(Number(sidRaw)) ? Number(sidRaw) : sidRaw;
    const count = Number(info.search_count || 0);
    // `last_searched` is already seconds (aggregateSessions uses toSeconds).
    const lastSearchedSec = Number(info.last_searched || 0);
    const titles = Array.isArray(info.search_titles) ? info.search_titles : [];

    const rank = withRecency(count, 1.0, lastSearchedSec, { now: nowSec });

    return {
      sid,
      cnt: count,
      q: titles,
      ls: lastSearchedSec,
      rank,
    };
  });

  // Sort with tie-breakers
  domainRanked.sort(
    (a, b) =>
      b.rank - a.rank ||
      b.num_sessions - a.num_sessions ||
      b.last_seen - a.last_seen
  );

  titleRanked.sort(
    (a, b) =>
      b.rank - a.rank ||
      b.num_sessions - a.num_sessions ||
      b.last_seen - a.last_seen
  );

  searchRanked.sort((a, b) => b.rank - a.rank || b.cnt - a.cnt || b.ls - a.ls);

  // Trim and emit compact structures
  const domainItems = domainRanked
    .slice(0, k_domains)
    .map(({ key, rank }) => [key, round2(rank)]);

  const titleItems = titleRanked
    .slice(0, k_titles)
    .map(({ key, rank }) => [key, round2(rank)]);

  const searchItems = searchRanked
    .slice(0, k_searches)
    .map(({ sid, cnt, q, ls, rank }) => ({
      sid,
      cnt,
      q,
      ls,
      r: round2(rank),
    }));

  return [domainItems, titleItems, searchItems];
}

/**
 * Blend a base score with session importance and a time-based decay.
 *
 * Intuition:
 *   rank ≈ score * sessionImportance * sessionWeight * recencyFactor
 *
 * where recencyFactor is in [floor, 1], decaying over time with a
 * half-life in days.
 *
 * @param {number} score
 *        Base score (e.g., frecency percentile).
 * @param {number} sessionImportance
 *        Importance derived from how many sessions the item appears in.
 * @param {number} lastSeenSec
 *        Last-seen timestamp (epoch seconds or micros/ms; normalized via toSeconds()).
 * @param {object} [options]
 * @param {number} [options.halfLifeDays=14]
 *        Half-life in days for recency decay; smaller → recency matters more.
 * @param {number} [options.floor=0.5]
 *        Minimum recency factor; keeps a base weight even for very old items.
 * @param {number} [options.sessionWeight=1.0]
 *        Additional multiplier on sessionImportance.
 * @param {number} [options.now]
 *        "Now" timestamp (sec/ms/µs); if omitted, Date.now() is used.
 * @returns {number}
 *        Rounded rank score (2 decimal places).
 */
function withRecency(
  score,
  sessionImportance,
  lastSeenSec,
  {
    halfLifeDays = DEFAULT_HALFLIFE_DAYS,
    floor = DEFAULT_RECENCY_FLOOR,
    sessionWeight = DEFAULT_SESSION_WEIGHT,
    now = undefined,
  } = {}
) {
  const nowSec = now != null ? toSeconds(now) : Date.now() / 1000;
  const lastSec = toSeconds(lastSeenSec);

  const ageDays = Math.max(0, (nowSec - lastSec) / SECONDS_PER_DAY);
  const decay = Math.pow(0.5, ageDays / halfLifeDays);
  const importanceScore =
    Number(score) * (Number(sessionImportance) * Number(sessionWeight));

  return round2(importanceScore * (floor + (1 - floor) * decay));
}

function isFiniteNumber(n) {
  return typeof n === "number" && Number.isFinite(n);
}

/**
 * Convert epoch microseconds → integer epoch seconds.
 * If value is null/undefined/NaN, returns null.
 *
 * @param {number} micros
 */
function normalizeEpochSeconds(micros) {
  if (!Number.isFinite(micros)) {
    return null;
  }
  return Math.floor(micros / MICROS_PER_SEC);
}

function toSeconds(epochMicrosOrMs) {
  if (!Number.isFinite(epochMicrosOrMs)) {
    return 0;
  }
  const v = Number(epochMicrosOrMs);
  return v > 1e13 ? v / MICROS_PER_SEC : v / MS_PER_SEC;
}

function getOrInit(mapObj, key, initFn) {
  if (!(key in mapObj)) {
    mapObj[key] = initFn();
  }
  return mapObj[key];
}

function round2(x) {
  return Math.round(Number(x) * 100) / 100;
}

/**
 * Sanitize title text to prevent JSON parsing issues in LLM outputs.
 * Removes/replaces characters that commonly cause problems:
 * - Backslashes (replaced with forward slashes)
 * - Control characters (replaced with spaces)
 *
 * @param {string} title - Raw title from Places database
 * @returns {string} - Sanitized title
 */
function sanitizeTitle(title) {
  if (typeof title !== "string") {
    return "";
  }

  return (
    title
      .replace(/\\/g, "/") // Replace backslash with forward slash
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1F\x7F]/g, " ") // Replace control chars (0-31, 127) with space
      .replace(/\s+/g, " ") // Collapse multiple spaces
      .trim()
  );
}

// for tests only
export function _setBlockListManagerForTesting(mgr) {
  _mgr = mgr;
}

export function _sanitizeTitleForTesting(title) {
  return sanitizeTitle(title);
}

/**
 * Return the number of history visits since `days` ago.
 *
 * @param {object} opts
 * @param {number} opts.days - lookback in days (default 60)
 * @returns {Promise<number>} number of visits
 */
export async function countRecentVisits({ days = DEFAULT_DAYS } = {}) {
  const cutoffMicros = Math.max(
    0,
    (Date.now() - days * MS_PER_DAY) * MICROS_PER_MS
  );

  const SQL = `
    SELECT COUNT(*) AS cnt
    FROM moz_historyvisits v
    JOIN moz_places p ON v.place_id = p.id
    WHERE v.visit_date >= :cutoff
      AND p.title IS NOT NULL
      AND p.frecency IS NOT NULL
  `;

  try {
    const result = await PlacesUtils.withConnectionWrapper(
      "smartwindow-countRecentVisits",
      async db => {
        const stmt = await db.execute(SQL, { cutoff: cutoffMicros });
        for (const row of stmt) {
          return row.getResultByName("cnt") || 0;
        }
        return 0;
      }
    );
    return Number(result);
  } catch (e) {
    console.error("countRecentVisits failed", e);
    return 0;
  }
}
