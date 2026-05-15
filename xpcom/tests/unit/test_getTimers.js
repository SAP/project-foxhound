/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

const { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs"
);

const timerManager = Cc["@mozilla.org/timer-manager;1"].getService(
  Ci.nsITimerManager
);

function newTimer(name, delay, type) {
  let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
  timer.initWithCallback(
    {
      QueryInterface: ChromeUtils.generateQI(["nsITimerCallback", "nsINamed"]),
      name,
      notify: () => {},
    },
    delay,
    type
  );
  return timer;
}

const ignoredTimers = [
  "BackgroundHangThread_timer", // BHR is Nightly-only, just ignore it.
  "CCGCScheduler::EnsureGCRunner", // GC runner can be scheduled anytime, randomly.
  "IdleMemoryCleanupWantsLaterCheck", // When Worker is used, nsThread::ProcessNextEvent may call MayScheduleIdleMemoryCleanup.
  "dom::IdleGCTimerCallback", // When Worker is used.
  "dom::PeriodicGCTimerCallback", // When Worker is used.
  "IdleRunnableWrapper::SetTimer", // When Worker is used.
];
if (AppConstants.platform == "win") {
  // On Windows there's a 3min timer added at startup to then add an
  // idle observer that finally triggers removing leftover temp files.
  // Ignore that too.
  ignoredTimers.push("nsAnonTempFileRemover");
}
if (
  // Services.profiler is missing on some tier3 platforms where
  // MOZ_GECKO_PROFILER is not set.
  Services.profiler?.IsActive() &&
  !Services.env.exists("MOZ_PROFILER_SHUTDOWN") &&
  Services.env.exists("MOZ_UPLOAD_DIR") &&
  Services.env.exists("MOZ_TEST_TIMEOUT_INTERVAL")
) {
  // Ignore the timer used to upload profiles of test timeouts when running
  // the tests with --profiler.
  ignoredTimers.push("upload_test_timeout_profile");
}

function getTimers() {
  return timerManager
    .getTimers()
    .filter(t => !ignoredTimers.includes(t.name.replace(/\[.*/, "")));
}

function getTimersVerbose() {
  let timers = getTimers();
  for (let timer of timers) {
    // To help with debugging in case of unexpected timers.
    info(`${timer.name}: ${timer.delay}ms, ${timer.type}`);
  }
  return timers;
}

add_task(function test_nsITimerManager_getTimers() {
  Assert.equal(
    getTimersVerbose().length,
    0,
    "there should be no timer at xpcshell startup"
  );

  let timerData = [
    ["t1", 500, Ci.nsITimer.TYPE_ONE_SHOT],
    ["t2", 1500, Ci.nsITimer.TYPE_REPEATING_SLACK],
    ["t3", 2500, Ci.nsITimer.TYPE_REPEATING_PRECISE],
    ["t4", 3500, Ci.nsITimer.TYPE_REPEATING_PRECISE_CAN_SKIP],
    ["t5", 5500, Ci.nsITimer.TYPE_REPEATING_SLACK_LOW_PRIORITY],
    ["t6", 7500, Ci.nsITimer.TYPE_ONE_SHOT_LOW_PRIORITY],
  ];

  info("Add timers one at a time.");
  for (let [name, delay, type] of timerData) {
    let timer = newTimer(name, delay, type);
    let timers = getTimers();
    Assert.equal(timers.length, 1, "there should be only one timer");
    Assert.equal(name, timers[0].name, "the name is correct");
    Assert.equal(delay, timers[0].delay, "the delay is correct");
    Assert.equal(type, timers[0].type, "the type is correct");

    timer.cancel();
    Assert.equal(getTimers().length, 0, "no timer left after cancelling");
  }

  info("Add all timers at once.");
  let timers = [];
  for (let [name, delay, type] of timerData) {
    timers.push(newTimer(name, delay, type));
  }
  while (timers.length) {
    Assert.equal(getTimers().length, timers.length, "correct timer count");
    timers.pop().cancel();
  }
  Assert.equal(getTimers().length, 0, "no timer left after cancelling");
});

add_task(async function test_getTimers_with_active_worker_thread() {
  let worker = new ChromeWorker("resource://test/data/test_timers.worker.js");

  async function queryWorker(cmd, ...args) {
    return new Promise(resolve => {
      // One message at a time; we are not going to send multiple messages.
      worker.addEventListener(
        "message",
        e => {
          Assert.equal(e.data.replyToCmd, cmd, "Got reply from worker");
          resolve(e.data.returnValue);
        },
        { once: true }
      );
      worker.postMessage([cmd, ...args]);
    });
  }

  // A very long timeout that will certainly outlast the test execution.
  const VERY_LONG_TIMEOUT_MS = 3_600_000;

  Assert.equal(getTimersVerbose().length, 0, "no timers before");
  const handle = await queryWorker("do_call_setTimeout", VERY_LONG_TIMEOUT_MS);

  let timers = getTimersVerbose();
  Assert.equal(timers.length, 1, "one timer after?");
  Assert.equal(timers[0].name, "TimeoutExecutor Runnable", "Got timer name");

  // Although we created a timer with 3600000 delay, it is reported as 3599999.
  // As a sanity check, just check that it is close enough. A drift of more
  // than 1 hour would be quite unexpected.
  Assert.less(
    Math.abs(VERY_LONG_TIMEOUT_MS - timers[0].delay),
    60_000,
    `Should match the expected timer delay: ${timers[0].delay}`
  );
  Assert.equal(Ci.nsITimer.TYPE_ONE_SHOT, timers[0].type, "Got timer type");

  await queryWorker("do_call_clearTimeout", handle);

  Assert.equal(getTimersVerbose().length, 0, "no timer left after cancelling");
  worker.terminate();
});
