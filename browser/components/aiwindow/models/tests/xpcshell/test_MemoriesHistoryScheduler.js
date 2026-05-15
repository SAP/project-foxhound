/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

do_get_profile();
("use strict");

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);
const { MemoriesHistoryScheduler } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/memories/MemoriesHistoryScheduler.sys.mjs"
);
const { MemoriesDriftDetector } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/memories/MemoriesDriftDetector.sys.mjs"
);
const { MemoriesManager } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/memories/MemoriesManager.sys.mjs"
);

const { PREF_GENERATE_MEMORIES } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/memories/MemoriesConstants.sys.mjs"
);

registerCleanupFunction(async () => {
  Services.prefs.clearUserPref(PREF_GENERATE_MEMORIES);
  await PlacesUtils.history.clear();
});

function sleep(ms) {
  return new Promise(resolve => do_timeout(ms, resolve));
}

async function waitForCondition(
  predicate,
  msg,
  intervalMs = 10,
  maxTries = 200
) {
  for (let i = 0; i < maxTries; i++) {
    if (predicate()) {
      return;
    }
    await sleep(intervalMs);
  }
  Assert.ok(false, msg);
}

// First run => maybeInit triggers an immediate run via #init() (no manual tick).
add_task(async function test_scheduler_immediately_runs_on_first_init() {
  Services.prefs.setBoolPref(PREF_GENERATE_MEMORIES, true);

  const generateStub = sinon
    .stub(MemoriesManager, "generateMemoriesFromBrowsingHistory")
    .resolves();

  const lastTsStub = sinon
    .stub(MemoriesManager, "getLastHistoryMemoryTimestamp")
    .resolves(0); // first run

  const countStub = sinon
    .stub(MemoriesManager, "countRecentVisits")
    .resolves(10);

  const enableStub = sinon
    .stub(MemoriesManager, "shouldEnableMemoriesSchedulers")
    .returns(true);

  let scheduler;
  try {
    scheduler = MemoriesHistoryScheduler.maybeInit();
    Assert.ok(scheduler, "Scheduler should be initialized when pref is true");

    await waitForCondition(
      () => generateStub.called,
      "Expected first-run init to trigger generateMemoriesFromBrowsingHistory"
    );

    sinon.assert.calledOnce(generateStub);
  } finally {
    scheduler?.destroy?.();
    generateStub.restore();
    lastTsStub.restore();
    countStub.restore();
    enableStub.restore();
  }
});

// Drift triggers => memories run
add_task(async function test_scheduler_runs_when_drift_triggers() {
  Services.prefs.setBoolPref(PREF_GENERATE_MEMORIES, true);

  const generateStub = sinon
    .stub(MemoriesManager, "generateMemoriesFromBrowsingHistory")
    .resolves();

  const driftStub = sinon
    .stub(MemoriesDriftDetector, "computeHistoryDriftAndTrigger")
    .resolves({
      baselineMetrics: [{ sessionId: 1, jsScore: 0.1, avgSurprisal: 1.0 }],
      deltaMetrics: [{ sessionId: 2, jsScore: 0.9, avgSurprisal: 3.0 }],
      trigger: {
        jsThreshold: 0.5,
        surpriseThreshold: 2.0,
        triggered: true,
        triggeredSessionIds: [2],
      },
    });

  const enableStub = sinon
    .stub(MemoriesManager, "shouldEnableMemoriesSchedulers")
    .returns(true);

  const countStub = sinon
    .stub(MemoriesManager, "countRecentVisits")
    .resolves(10);

  try {
    let scheduler = MemoriesHistoryScheduler.maybeInit();

    // Force pagesVisited above threshold for the test.
    scheduler.setPagesVisitedForTesting(100);

    // Run the interval logic once.
    await scheduler.runNowForTesting();

    sinon.assert.calledOnce(generateStub);
  } finally {
    generateStub.restore();
    driftStub.restore();
    enableStub.restore();
    countStub.restore();
  }
});

// Drift does NOT trigger => memories skipped
add_task(async function test_scheduler_skips_when_drift_not_triggered() {
  Services.prefs.setBoolPref(PREF_GENERATE_MEMORIES, true);

  const generateStub = sinon
    .stub(MemoriesManager, "generateMemoriesFromBrowsingHistory")
    .resolves();

  const driftStub = sinon
    .stub(MemoriesDriftDetector, "computeHistoryDriftAndTrigger")
    .resolves({
      baselineMetrics: [{ sessionId: 1, jsScore: 0.1, avgSurprisal: 1.0 }],
      deltaMetrics: [{ sessionId: 2, jsScore: 0.2, avgSurprisal: 1.2 }],
      trigger: {
        jsThreshold: 0.5,
        surpriseThreshold: 2.0,
        triggered: false,
        triggeredSessionIds: [],
      },
    });

  const lastTsStub = sinon
    .stub(MemoriesManager, "getLastHistoryMemoryTimestamp")
    .resolves(Date.now() - 7 * 60 * 60 * 1000);

  const countStub = sinon
    .stub(MemoriesManager, "countRecentVisits")
    .resolves(10);

  const enableStub = sinon
    .stub(MemoriesManager, "shouldEnableMemoriesSchedulers")
    .returns(true);

  try {
    let scheduler = MemoriesHistoryScheduler.maybeInit();
    scheduler.setPagesVisitedForTesting(100);
    await scheduler.runNowForTesting();
    sinon.assert.notCalled(generateStub);
  } finally {
    generateStub.restore();
    driftStub.restore();
    lastTsStub.restore();
    countStub.restore();
    enableStub.restore();
  }
});

// First run (no previous memories) => memories run even with small history.
add_task(async function test_scheduler_runs_on_first_run_with_small_history() {
  Services.prefs.setBoolPref(PREF_GENERATE_MEMORIES, true);

  const generateStub = sinon
    .stub(MemoriesManager, "generateMemoriesFromBrowsingHistory")
    .resolves();

  const driftStub = sinon
    .stub(MemoriesDriftDetector, "computeHistoryDriftAndTrigger")
    .resolves({
      baselineMetrics: [],
      deltaMetrics: [],
      trigger: {
        jsThreshold: 0,
        surpriseThreshold: 0,
        triggered: false,
        triggeredSessionIds: [],
      },
    });

  const lastTsStub = sinon
    .stub(MemoriesManager, "getLastHistoryMemoryTimestamp")
    .resolves(0);

  const countStub = sinon
    .stub(MemoriesManager, "countRecentVisits")
    .resolves(10);

  const enableStub = sinon
    .stub(MemoriesManager, "shouldEnableMemoriesSchedulers")
    .returns(true);

  try {
    let scheduler = MemoriesHistoryScheduler.maybeInit();
    Assert.ok(scheduler, "Scheduler should be initialized when pref is true");

    // Set a number of pages that is:
    // - below the normal threshold (25), but
    // - high enough for the special first-run threshold (e.g. 15).
    scheduler.setPagesVisitedForTesting(20);

    // Run the interval logic once.
    await scheduler.runNowForTesting();
    sinon.assert.calledOnce(generateStub);
  } finally {
    generateStub.restore();
    driftStub.restore();
    lastTsStub.restore();
    countStub.restore();
    enableStub.restore();
  }
});
