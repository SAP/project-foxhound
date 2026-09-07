"use strict";

/* globals window */ // We are running in a document.

// Test the basics of DeferredTask in a window context:
// - Schedules several uses of DeferredTask that should not run at all
// - Schedules final DeferredTask that should run quickly at the end.

const { DeferredTask } = ChromeUtils.importESModule(
  "resource://gre/modules/DeferredTask.sys.mjs"
);

// Sanity checks: tasks that should never run.
const task1 = new DeferredTask(
  () => {
    window.postMessage("arm_and_disarm_should_never_run", "*");
  },
  0,
  0
);
task1.arm();
task1.disarm();

const task2 = new DeferredTask(
  () => {
    window.postMessage("arm_and_finalize_should_never_run", "*");
  },
  0,
  0
);
task2.arm();
task2.disarm();

// Store as variable to make sure that we continue to have a strong reference,
// and that non-running of the callback is not due to GC or something.
// eslint-disable-next-line no-unused-vars
const task3 = new DeferredTask(
  () => {
    window.postMessage("without_arm_should_never_run", "*");
  },
  0,
  0
);

const task4 = new DeferredTask(
  () => {
    // test_DeferredTask_window.js expects this message:
    window.postMessage("arm_and_wait_should_run", "*");
  },
  12,
  34
);
task4.arm();
