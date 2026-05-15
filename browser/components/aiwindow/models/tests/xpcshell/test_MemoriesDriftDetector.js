/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

do_get_profile();
("use strict");

const { MemoriesDriftDetector } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/memories/MemoriesDriftDetector.sys.mjs"
);
const { MemoriesManager } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/memories/MemoriesManager.sys.mjs"
);

add_task(function test_computeDriftTriggerFromBaseline_no_data() {
  const result = MemoriesDriftDetector.computeDriftTriggerFromBaseline(
    [],
    [],
    {}
  );

  Assert.ok(!result.triggered, "No data should not trigger");
  Assert.equal(result.jsThreshold, 0, "JS threshold should be 0 with no data");
  Assert.equal(
    result.surpriseThreshold,
    0,
    "Surprise threshold should be 0 with no data"
  );
  Assert.deepEqual(
    result.triggeredSessionIds,
    [],
    "No triggered sessions without data"
  );
});

add_task(function test_computeDriftTriggerFromBaseline_triggers_on_delta() {
  /** @type {SessionMetric[]} */
  const baselineMetrics = [
    {
      sessionId: "b1",
      jsScore: 0.05,
      avgSurprisal: 2,
      timestampMs: 1,
    },
    {
      sessionId: "b2",
      jsScore: 0.08,
      avgSurprisal: 2.5,
      timestampMs: 2,
    },
    {
      sessionId: "b3",
      jsScore: 0.1,
      avgSurprisal: 3,
      timestampMs: 3,
    },
  ];

  // Make delta fairly "spiky" so it's above baseline thresholds.
  const deltaMetrics = [
    {
      sessionId: "d1",
      jsScore: 0.5,
      avgSurprisal: 6,
      timestampMs: 4,
    },
    {
      sessionId: "d2",
      jsScore: 0.6,
      avgSurprisal: 7,
      timestampMs: 5,
    },
  ];

  const result = MemoriesDriftDetector.computeDriftTriggerFromBaseline(
    baselineMetrics,
    deltaMetrics,
    {
      triggerQuantile: 0.8,
      evalDeltaCount: 2,
    }
  );

  Assert.greater(result.jsThreshold, 0, "JS baseline threshold should be > 0");
  Assert.greater(
    result.surpriseThreshold,
    0,
    "Surprise baseline threshold should be > 0"
  );
  Assert.ok(result.triggered, "High delta metrics should trigger drift");
  Assert.deepEqual(
    result.triggeredSessionIds.sort(),
    ["d1", "d2"],
    "Both delta sessions should be flagged as triggered"
  );
});

add_task(function test_computeDriftTriggerFromBaseline_no_delta() {
  const baselineMetrics = [
    {
      sessionId: "b1",
      jsScore: 0.1,
      avgSurprisal: 3,
      timestampMs: 1,
    },
  ];

  const deltaMetrics = [];

  const result = MemoriesDriftDetector.computeDriftTriggerFromBaseline(
    baselineMetrics,
    deltaMetrics,
    {}
  );

  Assert.ok(!result.triggered, "No delta metrics should not trigger");
  Assert.equal(result.jsThreshold, 0, "JS threshold should be 0 with no data");
  Assert.equal(
    result.surpriseThreshold,
    0,
    "Surprise threshold should be 0 with no data"
  );
  Assert.deepEqual(
    result.triggeredSessionIds,
    [],
    "No triggered sessions without delta metrics"
  );
});

add_task(
  function test_computeDriftTriggerFromBaseline_respects_evalDeltaCount() {
    const baselineMetrics = [
      {
        sessionId: "b1",
        jsScore: 0.05,
        avgSurprisal: 2,
        timestampMs: 1,
      },
      {
        sessionId: "b2",
        jsScore: 0.08,
        avgSurprisal: 2.5,
        timestampMs: 2,
      },
    ];

    // First delta is "spiky", later ones are normal-ish.
    const deltaMetrics = [
      {
        sessionId: "d1",
        jsScore: 0.7,
        avgSurprisal: 8,
        timestampMs: 3,
      },
      {
        sessionId: "d2",
        jsScore: 0.06,
        avgSurprisal: 2.1,
        timestampMs: 4,
      },
      {
        sessionId: "d3",
        jsScore: 0.07,
        avgSurprisal: 2.2,
        timestampMs: 5,
      },
    ];

    const result = MemoriesDriftDetector.computeDriftTriggerFromBaseline(
      baselineMetrics,
      // only d2 and d3 should be evaluated (setting evalDeltaCount = 2)
      deltaMetrics,
      {
        triggerQuantile: 0.8,
        evalDeltaCount: 2,
      }
    );

    Assert.ok(
      !result.triggered,
      "When only the last 2 non-spiky deltas are evaluated, drift should not trigger"
    );
    Assert.deepEqual(
      result.triggeredSessionIds,
      [],
      "No delta sessions should be flagged when only low scores are considered"
    );
  }
);

add_task(function test_computeDriftTriggerFromBaseline_non_spiky_no_trigger() {
  const baselineMetrics = [
    {
      sessionId: "b1",
      jsScore: 0.1,
      avgSurprisal: 3,
      timestampMs: 1,
    },
    {
      sessionId: "b2",
      jsScore: 0.12,
      avgSurprisal: 3.2,
      timestampMs: 2,
    },
    {
      sessionId: "b3",
      jsScore: 0.11,
      avgSurprisal: 3.1,
      timestampMs: 3,
    },
  ];

  const deltaMetrics = [
    {
      sessionId: "d1",
      jsScore: 0.105,
      avgSurprisal: 3.05,
      timestampMs: 4,
    },
    {
      sessionId: "d2",
      jsScore: 0.115,
      avgSurprisal: 3.1,
      timestampMs: 5,
    },
  ];

  const result = MemoriesDriftDetector.computeDriftTriggerFromBaseline(
    baselineMetrics,
    deltaMetrics,
    {
      triggerQuantile: 0.9,
      evalDeltaCount: 2,
    }
  );

  Assert.ok(
    !result.triggered,
    "Delta sessions similar to baseline should not trigger drift"
  );
  Assert.deepEqual(
    result.triggeredSessionIds,
    [],
    "No sessions should be flagged when deltas match baseline distribution"
  );
});

add_task(async function test_computeHistoryDriftAndTrigger_no_prior_memory() {
  const originalGetLastHistoryMemoryTimestamp =
    MemoriesManager.getLastHistoryMemoryTimestamp;

  // Force "no previous memory" so computeHistoryDriftSessionMetrics bails out.
  MemoriesManager.getLastHistoryMemoryTimestamp = async () => null;

  const result = await MemoriesDriftDetector.computeHistoryDriftAndTrigger({});

  dump(`no_prior_memory result = ${JSON.stringify(result)}\n`);

  Assert.ok(
    Array.isArray(result.baselineMetrics),
    "baselineMetrics should be an array"
  );
  Assert.ok(
    Array.isArray(result.deltaMetrics),
    "deltaMetrics should be an array"
  );
  Assert.equal(
    result.baselineMetrics.length,
    0,
    "No baseline metrics when there is no prior memory timestamp"
  );
  Assert.equal(
    result.deltaMetrics.length,
    0,
    "No delta metrics when there is no prior memory timestamp"
  );
  Assert.ok(
    !result.trigger.triggered,
    "Trigger should be false when there is no prior memory"
  );

  // Restore original implementation.
  MemoriesManager.getLastHistoryMemoryTimestamp =
    originalGetLastHistoryMemoryTimestamp;
});
