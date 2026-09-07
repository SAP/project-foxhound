"use strict";

/* globals reportTestResult */ // Defined by test_DeferredTask_window.js
/* globals window */ // We are running in a document.

const { DeferredTask } = ChromeUtils.importESModule(
  "resource://gre/modules/DeferredTask.sys.mjs"
);

const task1 = new DeferredTask(
  () => {
    reportTestResult("all_timeouts_zero");
  },
  0, // No timeout.
  0 // No idle timeout.
);

const task2 = new DeferredTask(
  () => {
    reportTestResult("idle_timeout_only");
  },
  0, // No timeout.
  1 // idle timeout with short deadline
);

const task3 = new DeferredTask(
  () => {
    reportTestResult("timer_only");
  },
  1, // Short timer.
  0 // No idle timeout.
);

const task4 = new DeferredTask(
  () => {
    reportTestResult("all_timeouts_one");
  },
  1, // Short timer.
  1 // Short idle timeout.
);

// Sanity check: verify that DeferredTask can run at least once.
new DeferredTask(
  () => {
    // Now arm the other timers...
    task1.arm();
    task2.arm();
    task3.arm();
    task4.arm();

    reportTestResult("removing_iframe");

    // Remove the iframe embedding this script.
    window.frameElement.remove();
  },
  0,
  0
).arm();
