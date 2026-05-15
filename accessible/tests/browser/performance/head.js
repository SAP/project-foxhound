/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* exported timeThis */

// Load the shared-head file first.
Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/accessible/tests/browser/shared-head.js",
  this
);

// Load common.js and promisified-events.js from accessible/tests/mochitest/ for
// all tests.
loadScripts(
  { name: "common.js", dir: MOCHITESTS_DIR },
  { name: "promisified-events.js", dir: MOCHITESTS_DIR }
);

// All the A11Y metrics in tools/performance/PerfStats.h.
const ALL_A11Y_PERFSTATS_FEATURES = [
  "A11Y_DoInitialUpdate",
  "A11Y_ProcessQueuedCacheUpdate",
  "A11Y_ContentRemovedNode",
  "A11Y_ContentRemovedAcc",
  "A11Y_PruneOrInsertSubtree",
  "A11Y_ShutdownChildrenInSubtree",
  "A11Y_ShowEvent",
  "A11Y_RecvCache",
  "A11Y_ProcessShowEvent",
  "A11Y_CoalesceEvents",
  "A11Y_CoalesceMutationEvents",
  "A11Y_ProcessHideEvent",
  "A11Y_SendCache",
  "A11Y_WillRefresh",
  "A11Y_AccessibilityServiceInit",
  "A11Y_PlatformShowHideEvent",
];

const LOG_PREFIX = "perfMetrics";

function logToPerfMetrics(stat) {
  info(`${LOG_PREFIX} | ${JSON.stringify(stat)}`);
}

/**
 * Time a function and log how long it took. The given name is included in log
 * messages. All accessibility PerfStats metrics are also captured and logged.
 * This function may only be called once per task, and we are limited to one
 * task per file.
 */
async function timeThis(func) {
  const start = performance.now();
  ChromeUtils.setPerfStatsFeatures(ALL_A11Y_PERFSTATS_FEATURES);
  const journal = {};

  // Run the specified testing task
  await func();

  // Log our total elapsed time
  journal.A11Y_TotalTime = performance.now() - start;

  const stats = JSON.parse(await ChromeUtils.collectPerfStats());
  ChromeUtils.setPerfStatsFeatures([]);
  // Filter stuff out of stats that we don't care about.
  // Filter out the GPU process, since accessibility doesn't do anything there.
  stats.processes = stats.processes.filter(process => process.type != "gpu");
  for (const process of stats.processes) {
    // Because of weird JS -> WebIDL 64 bit number issues, we get metrics here
    // that aren't for accessibility. For example, 1 << 32 also gets us 1 << 0.
    // Filter those out. Also, filter out any metrics with a count of 0.
    process.perfstats.metrics = process.perfstats.metrics.filter(
      metric => metric.metric.startsWith("A11Y_") && metric.count > 0
    );
  }
  // Now that we've filtered metrics, remove any processes that have no metrics left.
  stats.processes = stats.processes.filter(
    process => !!process.perfstats.metrics.length
  );
  // Also, filter out readings for the blank new tab that gets opened before the
  // tab with our test content opens.
  // We may get a reading that isn't attached to any URL; this contains
  // the startup time for the Accessibility Service which we should keep.
  // Our parent process readings have no URL field.
  stats.processes = stats.processes.filter(
    process =>
      process.type == "parent" ||
      !process.urls.length ||
      !process.urls.includes("about:newtab")
  );

  // Because our perfstats measure both occurances and timing, log values separately
  // under different probe names with different units.
  // Also, as the same probes can be triggered in content and parent, append a process
  // indicator to the end of each probe name.
  for (const process of stats.processes) {
    for (const stat of process.perfstats.metrics) {
      journal[stat.metric + "_" + process.type] = stat.time;
      if (stat.count) {
        journal[stat.metric + "_Count_" + process.type] = stat.count;
      }
    }
  }

  logToPerfMetrics(journal);
}
