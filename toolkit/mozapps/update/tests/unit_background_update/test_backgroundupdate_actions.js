/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * vim: sw=2 ts=2 sts=2 et
 * this source code form is subject to the terms of the mozilla public license,
 * v. 2.0. if a copy of the mpl was not distributed with this file, you can
 * obtain one at http://mozilla.org/mpl/2.0/. */

/**
 * Unit tests that verify that the state machine controlling throttling (not
 * actually updating after not running the browser for a long period) and
 * debouncing (not taking any action at all within a short window) is working as
 * expected.
 *
 * Also unit tests that `runActions` invokes appropriate action methods.
 */

"use strict";

const { Actions, runActions } = ChromeUtils.importESModule(
  "resource://gre/modules/backgroundtasks/BackgroundTask_backgroundupdate.sys.mjs"
);
const { AppUpdater } = ChromeUtils.importESModule(
  "resource://gre/modules/AppUpdater.sys.mjs"
);
const { BackgroundUpdate } = ChromeUtils.importESModule(
  "resource://gre/modules/BackgroundUpdate.sys.mjs"
);
const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

const ACTION = BackgroundUpdate.ACTION;

let ACTIONS_ALL = new Set(Object.values(ACTION));
let ACTIONS_UNTHROTTLED = ACTIONS_ALL.difference(
  new Set([ACTION.UPDATE_CHECK])
);
let ACTIONS_THROTTLED = new Set([
  ACTION.EXPERIMENTER,
  ACTION.SUBMIT_PING,
  ACTION.UPDATE_CHECK,
]);
let ACTIONS_DEBOUNCED = new Set([]);

const HOUR_IN_SECONDS = 60 * 60;
const DAY_IN_SECONDS = 24 * HOUR_IN_SECONDS;

function getLastTaskRunSeconds() {
  return Services.prefs.getIntPref(
    "app.update.background.lastTaskRunSecondsAfterEpoch",
    -1
  );
}

add_setup(async function test_setup() {
  // FOG needs a profile directory to put its data in.
  do_get_profile();

  // We need to initialize it once, otherwise operations will be stuck in the pre-init queue.
  Services.fog.initializeFOG();

  // We're in an xpcshell context, not an actual background task context, so we
  // need to set some background task-specific prefs here for testing.
  Services.prefs.setBoolPref(
    "app.update.background.checkPolicy.throttleEnabled",
    true
  );
  Services.prefs.setIntPref(
    "app.update.background.checkPolicy.throttleAfterDays",
    14
  );
  Services.prefs.setIntPref(
    "app.update.background.checkPolicy.throttleDebouncePeriodInHours",
    24
  );

  // For convenience.
  Services.prefs.setCharPref("app.update.background.loglevel", "debug");
});

async function testWithActionsToPerform(
  {
    nowSeconds = Math.floor(Date.now() / 1000),
    lastBrowsedDays = 0,
    lastTaskRunHours = 0,
    lastTaskRunUnset = false,
  },
  expectedActions
) {
  info(
    `nowSeconds=${nowSeconds} lastBrowsedDays=${lastBrowsedDays} lastTaskRunHours=${lastTaskRunHours} lastTaskRunUnset=${lastTaskRunUnset}`
  );

  // This should really be `Services.fog.testResetFOG()`. But this works
  // well enough and, currently, Bug 1954203 prevents us from successfully using
  // `testResetFOG`.
  GleanPings.backgroundUpdate.submit();

  let environment = {
    currentDate: 1000 * (nowSeconds - lastBrowsedDays * DAY_IN_SECONDS),
  };

  let prevTaskRunSeconds = getLastTaskRunSeconds();

  try {
    let startingTaskRunSeconds =
      nowSeconds - lastTaskRunHours * HOUR_IN_SECONDS;

    if (!lastTaskRunUnset) {
      Services.prefs.setIntPref(
        "app.update.background.lastTaskRunSecondsAfterEpoch",
        startingTaskRunSeconds
      );
    } else {
      Services.prefs.clearUserPref(
        "app.update.background.lastTaskRunSecondsAfterEpoch"
      );
    }

    let beforeTaskRunSeconds;
    let actions = await BackgroundUpdate.withActionsToPerform(
      { defaultProfileTargetingSnapshot: { environment }, nowSeconds },
      actionSet => {
        beforeTaskRunSeconds = getLastTaskRunSeconds();
        return actionSet;
      }
    );

    Assert.deepEqual(
      Array.from(actions).toSorted(),
      Array.from(expectedActions).toSorted()
    );

    let afterTaskRunSeconds = getLastTaskRunSeconds();

    if (expectedActions.size) {
      Assert.equal(
        afterTaskRunSeconds,
        nowSeconds,
        "Some expected actions, so last task run timestamp changed after task complete callback invoked"
      );
    } else {
      Assert.equal(
        afterTaskRunSeconds,
        beforeTaskRunSeconds,
        "No expected actions, so last task run timestamp not changed when task is debounced"
      );
    }

    Assert.equal(
      Glean.backgroundUpdate.daysSinceLastBrowsed.testGetValue(),
      lastBrowsedDays,
      "`daysSinceLastBrowsed` instrumentation is correct"
    );

    Assert.equal(
      Glean.backgroundUpdate.throttled.testGetValue(),
      !actions.has(ACTION.UPDATE),
      "`throttled` instrumentation is correct"
    );

    Assert.equal(
      Glean.backgroundUpdate.debounced.testGetValue(),
      actions.size ? null : 1,
      "`debounced` instrumentation is correct"
    );
  } finally {
    Services.prefs.setIntPref(
      "app.update.background.lastTaskRunSecondsAfterEpoch",
      prevTaskRunSeconds
    );
  }
}

add_task(async function test_disabled() {
  // Setting in this test is generally `true`, so undo the change after we're done.
  let prev = Services.prefs.getBoolPref(
    "app.update.background.checkPolicy.throttleEnabled",
    false
  );
  try {
    Services.prefs.setBoolPref(
      "app.update.background.checkPolicy.throttleEnabled",
      false
    );

    await testWithActionsToPerform(
      {
        lastBrowsedDays: 100,
        lastTaskRunHours: 0,
      },
      ACTIONS_UNTHROTTLED
    );

    // Test with the task never having run before.
    await testWithActionsToPerform(
      {
        lastBrowsedDays: 100,
        lastTaskRunUnset: true,
      },
      ACTIONS_UNTHROTTLED
    );
  } finally {
    Services.prefs.setBoolPref(
      "app.update.background.checkPolicy.throttleEnabled",
      prev
    );
  }
});

add_task(async function test_all() {
  // Last task run days don't matter, since not throttled.
  await testWithActionsToPerform(
    {
      lastBrowsedDays: 10,
      lastTaskRunHours: 0,
    },
    ACTIONS_UNTHROTTLED
  );

  await testWithActionsToPerform(
    {
      lastBrowsedDays: 10,
      lastTaskRunHours: 23,
    },
    ACTIONS_UNTHROTTLED
  );

  await testWithActionsToPerform(
    {
      lastBrowsedDays: 10,
      lastTaskRunHours: 48,
    },
    ACTIONS_UNTHROTTLED
  );

  // Test the boundary condition.
  await testWithActionsToPerform(
    {
      lastBrowsedDays: 10,
      lastTaskRunHours: 0,
    },
    ACTIONS_UNTHROTTLED
  );

  await testWithActionsToPerform(
    {
      lastBrowsedDays: 10,
      lastTaskRunHours: 23,
    },
    ACTIONS_UNTHROTTLED
  );

  await testWithActionsToPerform(
    {
      lastBrowsedDays: 10,
      lastTaskRunHours: 48,
    },
    ACTIONS_UNTHROTTLED
  );

  // Test with the task never having run before.
  await testWithActionsToPerform(
    {
      lastBrowsedDays: 10,
      lastTaskRunUnset: true,
    },
    ACTIONS_UNTHROTTLED
  );

  // Test the boundary condition.
  await testWithActionsToPerform(
    {
      lastBrowsedDays: 14,
      lastTaskRunHours: 48,
    },
    ACTIONS_UNTHROTTLED
  );
});

add_task(async function test_throttled() {
  // Test the boundary condition.
  await testWithActionsToPerform(
    {
      lastBrowsedDays: 15,
      lastTaskRunHours: 24,
    },
    ACTIONS_THROTTLED
  );

  // More obvious cases.
  await testWithActionsToPerform(
    {
      lastBrowsedDays: 100,
      lastTaskRunHours: 48,
    },
    ACTIONS_THROTTLED
  );

  await testWithActionsToPerform(
    {
      lastBrowsedDays: 100,
      lastTaskRunHours: 48,
    },
    ACTIONS_THROTTLED
  );
});

add_task(async function test_debounced() {
  await testWithActionsToPerform(
    {
      lastBrowsedDays: 91,
      lastTaskRunHours: 0,
    },
    ACTIONS_DEBOUNCED
  );

  await testWithActionsToPerform(
    {
      lastBrowsedDays: 100,
      lastTaskRunHours: 0,
    },
    ACTIONS_DEBOUNCED
  );

  // Verify to the hour.
  await testWithActionsToPerform(
    {
      lastBrowsedDays: 100,
      lastTaskRunHours: 0,
    },
    ACTIONS_DEBOUNCED
  );

  await testWithActionsToPerform(
    {
      lastBrowsedDays: 100,
      lastTaskRunHours: 12,
    },
    ACTIONS_DEBOUNCED
  );

  await testWithActionsToPerform(
    {
      lastBrowsedDays: 100,
      lastTaskRunHours: 23,
    },
    ACTIONS_DEBOUNCED
  );

  // Boundary condition.
  await testWithActionsToPerform(
    {
      lastBrowsedDays: 100,
      lastTaskRunHours: 24,
    },
    ACTIONS_THROTTLED
  );

  await testWithActionsToPerform(
    {
      lastBrowsedDays: 100,
      lastTaskRunHours: 25,
    },
    ACTIONS_THROTTLED
  );

  // Test with the task never having run before.
  await testWithActionsToPerform(
    {
      lastBrowsedDays: 100,
      lastTaskRunUnset: true,
    },
    ACTIONS_THROTTLED
  );
});

async function testRunActions(actions) {
  let cmdLine = Cu.createCommandLine(
    [],
    null,
    Ci.nsICommandLine.STATE_INITIAL_LAUNCH
  );

  let sandbox = sinon.createSandbox();

  let stubs = {
    [ACTION.EXPERIMENTER]: sandbox
      .stub(Actions, "enableNimbusAndFirefoxMessagingSystem")
      .resolves(null),
    [ACTION.UPDATE]: sandbox
      .stub(Actions, "attemptBackgroundUpdate")
      .resolves(AppUpdater.STATUS.NO_UPDATES_FOUND),
    [ACTION.UPDATE_CHECK]: sandbox
      .stub(Actions, "checkForUpdate")
      .resolves(AppUpdater.STATUS.NO_UPDATES_FOUND),
    [ACTION.SUBMIT_PING]: sandbox
      .stub(Actions, "maybeSubmitBackgroundUpdatePing")
      .returns(null),
  };

  try {
    await runActions(cmdLine, {}, actions);

    for (let action of ACTIONS_ALL) {
      if (actions.has(action)) {
        Assert.ok(stubs[action].calledOnce, `${action} invoked exactly once`);
      } else {
        Assert.ok(!stubs[action].calledOnce, `${action} not invoked`);
      }
    }
  } finally {
    sandbox.restore();
  }
}

add_task(async function test_runActionsUnthrottled() {
  await testRunActions(ACTIONS_UNTHROTTLED);
});

add_task(async function test_runActionsThrottled() {
  await testRunActions(ACTIONS_THROTTLED);
});

add_task(async function test_runActionsDebounced() {
  await testRunActions(ACTIONS_DEBOUNCED);
});
