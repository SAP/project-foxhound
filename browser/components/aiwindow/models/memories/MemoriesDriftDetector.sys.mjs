/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { PlacesUtils } from "resource://gre/modules/PlacesUtils.sys.mjs";
import { MemoriesManager } from "moz-src:///browser/components/aiwindow/models/memories/MemoriesManager.sys.mjs";
import { sessionizeVisits } from "moz-src:///browser/components/aiwindow/models/memories/MemoriesHistorySource.sys.mjs";

import {
  // How many of the most recent delta sessions to evaluate against thresholds.
  DRIFT_EVAL_DELTA_COUNT as DEFAULT_EVAL_DELTA_COUNT,
  // Quantile of baseline scores used as a threshold (e.g. 0.9 => 90th percentile).
  DRIFT_TRIGGER_QUANTILE as DEFAULT_TRIGGER_QUANTILE,
} from "moz-src:///browser/components/aiwindow/models/memories/MemoriesConstants.sys.mjs";

/**
 * @typedef {object} SessionMetric
 * @property {string|number} sessionId  Unique identifier for the session
 * @property {number} jsScore          Jensen–Shannon divergence for the session
 * @property {number} avgSurprisal     Average surprisal for the session
 * @property {number} [timestampMs]    Optional timestamp for debugging
 */

/**
 * This class detects drift to help decide when to run memories generation.
 *
 * High-level flow for history-based drift:
 *  1. Read last_history_memory_ts via MemoriesManager.getLastHistoryMemoryTimestamp().
 *  2. Use a DRIFT_LOOKBACK_DAYS (e.g. 14 days) lookback prior to that timestamp
 *     to define a baseline window, and include all visits from that lookback to "now".
 *  3. Sessionize visits via sessionizeVisits().
 *  4. Split sessions into:
 *        baseline: session_start_ms < last_history_memory_ts
 *        delta:    session_start_ms >= last_history_memory_ts
 *  5. Build a baseline host distribution from baseline sessions.
 *  6. For BOTH baseline and delta sessions, compute:
 *        - JS divergence vs baseline.
 *        - Average surprisal vs baseline.
 *  7. Use baseline metrics to derive thresholds (e.g. 0.9 quantile),
 *     and compare recent delta sessions to those thresholds to decide a trigger.
 */

// Lookback period before lastHistoryMemoryTS to define the baseline window.
const DRIFT_LOOKBACK_DAYS = 14;
// Cap on how many visits to fetch from Places.
const DRIFT_HISTORY_LIMIT = 5000;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MICROS_PER_MS = 1000;
const EPS = 1e-12;

const DRIFT_HISTORY_SQL = `
  SELECT
    p.id         AS place_id,
    p.url        AS url,
    o.host       AS host,
    p.title      AS title,
    v.visit_date AS visit_date
  FROM moz_places p
  JOIN moz_historyvisits v ON v.place_id = p.id
  JOIN moz_origins o       ON p.origin_id = o.id
  WHERE v.visit_date >= :cutoff
    AND p.title IS NOT NULL
    AND p.frecency IS NOT NULL
    AND o.host IS NOT NULL
    AND length(o.host) > 0
  ORDER BY v.visit_date DESC
  LIMIT :limit
`;

/**
 * Compute the q-quantile of an array of numbers.
 *
 * @param {number[]} values
 * @param {number} quantile in [0, 1], e.g. 0.9
 * @returns {number}
 */
function computeQuantile(values, quantile) {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * quantile;
  const lowerIdx = Math.floor(pos);
  const upperIdx = Math.ceil(pos);

  if (lowerIdx === upperIdx) {
    return sorted[lowerIdx];
  }
  const lower = sorted[lowerIdx];
  const upper = sorted[upperIdx];
  const weight = pos - lowerIdx;
  return lower + weight * (upper - lower);
}

/**
 * Compute KL divergence KL(P || Q).
 *
 * @param {Map<string, number>} p
 * @param {Map<string, number>} q
 * @returns {number}
 */
function klDiv(p, q) {
  let sum = 0;
  for (const [key, pVal] of p.entries()) {
    if (pVal <= 0) {
      continue;
    }
    const qVal = q.get(key) ?? EPS;
    const ratio = pVal / qVal;
    sum += pVal * Math.log(ratio);
  }
  return sum;
}

/**
 * Build a normalized probability distribution (Map) from host to count.
 *
 * @param {Map<string, number>} counts
 * @returns {Map<string, number>}
 */
function normalizeCounts(counts) {
  if (!counts.size) {
    return new Map();
  }
  let total = 0;
  for (const v of counts.values()) {
    total += v;
  }
  const dist = new Map();
  for (const [k, v] of counts.entries()) {
    dist.set(k, v / Math.max(1, total));
  }
  return dist;
}

/**
 * Compute Jensen–Shannon divergence between two distributions P and Q.
 *
 * P and Q are Maps of host to probability.
 *
 * @param {Map<string, number>} p
 * @param {Map<string, number>} q
 * @returns {number}
 */
function jsDivergence(p, q) {
  if (!p.size || !q.size) {
    return 0;
  }
  const m = new Map();
  const allKeys = new Set([...p.keys(), ...q.keys()]);
  for (const key of allKeys) {
    const pv = p.get(key) ?? 0;
    const qv = q.get(key) ?? 0;
    m.set(key, 0.5 * (pv + qv));
  }
  const klPM = klDiv(p, m);
  const klQM = klDiv(q, m);
  return 0.5 * (klPM + klQM);
}

/**
 * Compute average surprisal of a session under a baseline distribution.
 *
 * For each visit host in the session, surprisal = -log2 P_baseline(host).
 * If a host is unseen, a small epsilon is used.
 *
 * @param {string[]} hosts
 * @param {Map<string, number>} baselineDist
 * @returns {number}
 */
function averageSurprisal(hosts, baselineDist) {
  if (!hosts.length || !baselineDist.size) {
    return 0;
  }
  let sum = 0;
  for (const host of hosts) {
    const prob = baselineDist.get(host) ?? EPS;
    sum += -Math.log2(prob);
  }
  return sum / hosts.length;
}

/**
 *
 */
export class MemoriesDriftDetector {
  /**
   * Convenience helper: compute metrics AND a trigger decision in one call.
   *
   * @param {object} [options]
   * @param {number} [options.triggerQuantile]
   * @param {number} [options.evalDeltaCount]
   * @returns {Promise<{
   *   baselineMetrics: SessionMetric[],
   *   deltaMetrics: SessionMetric[],
   *   trigger: {
   *     jsThreshold: number,
   *     surpriseThreshold: number,
   *     triggered: boolean,
   *     triggeredSessionIds: Array<string|number>,
   *   },
   * }>}
   */
  static async computeHistoryDriftAndTrigger(options = {}) {
    const { baselineMetrics, deltaMetrics } =
      await this.computeHistoryDriftSessionMetrics();

    const trigger = this.computeDriftTriggerFromBaseline(
      baselineMetrics,
      deltaMetrics,
      options
    );

    return { baselineMetrics, deltaMetrics, trigger };
  }

  /**
   * Build SessionMetric[] for a group of sessions, given a baseline distribution.
   *
   * @param {Array<{ sessionId: string|number, hosts: string[], startMs: number }>} sessions
   * @param {Map<string, number>} baselineDist
   * @returns {SessionMetric[]}
   */
  static _buildSessionMetricsForGroup(sessions, baselineDist) {
    const metrics = [];

    for (const sess of sessions) {
      const sessionHostCounts = new Map();
      for (const h of sess.hosts) {
        sessionHostCounts.set(h, (sessionHostCounts.get(h) ?? 0) + 1);
      }
      const sessionDist = normalizeCounts(sessionHostCounts);
      const jsScore = jsDivergence(sessionDist, baselineDist);
      const avgSurp = averageSurprisal(sess.hosts, baselineDist);

      metrics.push({
        sessionId: sess.sessionId,
        jsScore,
        avgSurprisal: avgSurp,
        timestampMs: sess.startMs,
      });
    }

    metrics.sort((a, b) => (a.timestampMs ?? 0) - (b.timestampMs ?? 0));
    return metrics;
  }

  /**
   * Trigger computation based on a baseline window and recent delta sessions.
   *
   * @param {SessionMetric[]} baselineMetrics
   * @param {SessionMetric[]} deltaMetrics
   * @param {object} [options]
   * @param {number} [options.triggerQuantile=MemoriesDriftDetector.DEFAULT_TRIGGER_QUANTILE]
   * @param {number} [options.evalDeltaCount=MemoriesDriftDetector.DEFAULT_EVAL_DELTA_COUNT]
   * @returns {{
   *   jsThreshold: number,
   *   surpriseThreshold: number,
   *   triggered: boolean,
   *   triggeredSessionIds: Array<string|number>,
   * }}
   */
  static computeDriftTriggerFromBaseline(
    baselineMetrics,
    deltaMetrics,
    {
      triggerQuantile = DEFAULT_TRIGGER_QUANTILE,
      evalDeltaCount = DEFAULT_EVAL_DELTA_COUNT,
    } = {}
  ) {
    if (
      !Array.isArray(baselineMetrics) ||
      !baselineMetrics.length ||
      !Array.isArray(deltaMetrics) ||
      !deltaMetrics.length
    ) {
      return {
        jsThreshold: 0,
        surpriseThreshold: 0,
        triggered: false,
        triggeredSessionIds: [],
      };
    }

    const jsBase = baselineMetrics.map(m => m.jsScore ?? 0);
    const surpBase = baselineMetrics.map(m => m.avgSurprisal ?? 0);

    const jsThreshold = computeQuantile(jsBase, triggerQuantile);
    const surpriseThreshold = computeQuantile(surpBase, triggerQuantile);

    const evalMetrics =
      deltaMetrics.length > evalDeltaCount
        ? deltaMetrics.slice(-evalDeltaCount)
        : deltaMetrics;

    const triggeredSessionIds = [];
    for (const m of evalMetrics) {
      const jsTriggered = (m.jsScore ?? 0) > jsThreshold;
      const surpTriggered = (m.avgSurprisal ?? 0) > surpriseThreshold;
      if (jsTriggered || surpTriggered) {
        triggeredSessionIds.push(m.sessionId);
      }
    }

    return {
      jsThreshold,
      surpriseThreshold,
      triggered: !!triggeredSessionIds.length,
      triggeredSessionIds,
    };
  }

  /**
   * Compute per-session drift metrics (JS divergence and average surprisal)
   * for baseline and delta sessions, based on history around the last
   * history memory timestamp.
   *
   * Baseline window:
   *   [last_history_memory_ts - DRIFT_LOOKBACK_DAYS, last_history_memory_ts)
   * Delta window:
   *   [last_history_memory_ts, now)
   *
   * If there is no prior history memory timestamp, or if there is not enough
   * data to form both baseline and delta, this returns empty arrays.
   *
   * @returns {Promise<{ baselineMetrics: SessionMetric[], deltaMetrics: SessionMetric[] }>}
   */
  static async computeHistoryDriftSessionMetrics() {
    const lastTsMs = await MemoriesManager.getLastHistoryMemoryTimestamp();
    if (!lastTsMs) {
      // No prior memories -> no meaningful baseline yet.
      return { baselineMetrics: [], deltaMetrics: [] };
    }

    const lookbackStartMs = lastTsMs - DRIFT_LOOKBACK_DAYS * MS_PER_DAY;
    const cutoffMicros = Math.max(0, lookbackStartMs) * MICROS_PER_MS;

    /** @type {Array<{ place_id:number, url:string, host:string, title:string, visit_date:number }>} */
    const rows = [];
    await PlacesUtils.withConnectionWrapper(
      "MemoriesDriftDetector:computeHistoryDriftSessionMetrics",
      async db => {
        const stmt = await db.executeCached(DRIFT_HISTORY_SQL, {
          cutoff: cutoffMicros,
          limit: DRIFT_HISTORY_LIMIT,
        });
        for (const row of stmt) {
          rows.push({
            placeId: row.getResultByName("place_id"),
            url: row.getResultByName("url"),
            host: row.getResultByName("host"),
            title: row.getResultByName("title"),
            visitDateMicros: row.getResultByName("visit_date"),
          });
        }
      }
    );

    if (!rows.length) {
      return { baselineMetrics: [], deltaMetrics: [] };
    }

    // You can tune gapSec if you want shorter / longer sessions using opts = { gapSec: 900 }
    const sessionized = sessionizeVisits(rows);

    // Build sessions keyed by session_id.
    /** @type {Map<number, { sessionId: number, hosts: string[], isBaseline: boolean, startMs: number }>} */
    const sessions = new Map();

    for (const row of sessionized) {
      const sessionId = row.session_id;
      const startMs = row.session_start_ms;
      const host = row.host;

      if (!host) {
        continue;
      }

      let sess = sessions.get(sessionId);
      if (!sess) {
        sess = {
          sessionId,
          hosts: [],
          isBaseline: startMs < lastTsMs,
          startMs,
        };
        sessions.set(sessionId, sess);
      }
      sess.hosts.push(host);
    }

    const baselineSessions = [];
    const deltaSessions = [];

    for (const sess of sessions.values()) {
      if (sess.isBaseline) {
        baselineSessions.push(sess);
      } else {
        deltaSessions.push(sess);
      }
    }

    if (!baselineSessions.length || !deltaSessions.length) {
      return { baselineMetrics: [], deltaMetrics: [] };
    }

    // Build baseline host counts.
    const baselineCounts = new Map();
    for (const sess of baselineSessions) {
      for (const h of sess.hosts) {
        baselineCounts.set(h, (baselineCounts.get(h) ?? 0) + 1);
      }
    }

    const baselineDist = normalizeCounts(baselineCounts);
    if (!baselineDist.size) {
      return { baselineMetrics: [], deltaMetrics: [] };
    }

    const baselineMetrics = this._buildSessionMetricsForGroup(
      baselineSessions,
      baselineDist
    );
    const deltaMetrics = this._buildSessionMetricsForGroup(
      deltaSessions,
      baselineDist
    );

    return { baselineMetrics, deltaMetrics };
  }
}
