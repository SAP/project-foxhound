/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests for policies that have parsing or validation logic

// This test uses this function from toolkit/components/enterprisepolicies/tests/xpcshell/head.js
/*global setupPolicyEngineWithJson */

"use strict";
const { PoliciesPrefTracker } = ChromeUtils.importESModule(
  "resource://testing-common/EnterprisePolicyTesting.sys.mjs"
);
const UpdatePolicyEnforcer = ChromeUtils.importESModule(
  "resource:///modules/UpdatePolicyEnforcer.sys.mjs"
);
const prefName = "app.update.compulsory_restart";

async function withUnsetPref(func) {
  PoliciesPrefTracker.start();
  try {
    await func();
  } finally {
    PoliciesPrefTracker.stop();
  }
}

add_task(async function test_RelaunchRequired_allValid() {
  await withUnsetPref(async () => {
    await setupPolicyEngineWithJson({
      policies: {
        RelaunchRequired: {
          NotificationPeriodHours: 72,
          RestartTimeOfDay: {
            Hour: 18,
            Minute: 30,
          },
        },
      },
    });

    const prefStr = Services.prefs.getStringPref(prefName, null);
    Assert.ok(prefStr);
    const pref = JSON.parse(prefStr);
    Assert.ok(pref);
    Assert.equal(
      pref.NotificationPeriodHours,
      72,
      "Expected notification period to be correct"
    );
    Assert.equal(
      pref.RestartTimeOfDay.Hour,
      18,
      "Expected restart time of day hour to be correct"
    );
    Assert.equal(
      pref.RestartTimeOfDay.Minute,
      30,
      "Expected restart time of day  minute to be correct"
    );
    Assert.ok(Services.prefs.prefIsLocked(prefName));
  });
});

add_task(async function test_RelaunchRequired_defaultNotificationPeriod() {
  await withUnsetPref(async () => {
    await setupPolicyEngineWithJson({
      policies: {
        RelaunchRequired: {
          RestartTimeOfDay: {
            Hour: 18,
            Minute: 30,
          },
        },
      },
    });

    const prefStr = Services.prefs.getStringPref(
      "app.update.compulsory_restart",
      null
    );
    Assert.ok(prefStr);
    const pref = JSON.parse(prefStr);
    Assert.ok(pref);
    Assert.equal(
      pref.NotificationPeriodHours,
      24,
      "Expected notification period to be correct"
    );
    Assert.equal(
      pref.RestartTimeOfDay.Hour,
      18,
      "Expected restart time of day hour to be correct"
    );
    Assert.equal(
      pref.RestartTimeOfDay.Minute,
      30,
      "Expected restart time of day minute to be correct"
    );
    Assert.ok(Services.prefs.prefIsLocked(prefName));
  });
});

add_task(async function test_RelaunchRequired_defaultTimeOfDay() {
  await withUnsetPref(async () => {
    await setupPolicyEngineWithJson({
      policies: {
        RelaunchRequired: {
          NotificationPeriodHours: 72,
        },
      },
    });

    const prefStr = Services.prefs.getStringPref(prefName, null);
    Assert.ok(prefStr);
    const pref = JSON.parse(prefStr);
    Assert.ok(pref);
    Assert.equal(
      pref.NotificationPeriodHours,
      72,
      "Expected notification period to be correct"
    );
    Assert.equal(
      pref.RestartTimeOfDay.Hour,
      12,
      "Expected restart time of day hour to be correct"
    );
    Assert.equal(
      pref.RestartTimeOfDay.Minute,
      0,
      "Expected restart time of day minute to be correct"
    );
    Assert.ok(Services.prefs.prefIsLocked(prefName));
  });
});

add_task(async function test_RelaunchRequired_defaultAll() {
  await withUnsetPref(async () => {
    await setupPolicyEngineWithJson({
      policies: {
        RelaunchRequired: {
          what: "ever",
        },
      },
    });
    const prefStr = Services.prefs.getStringPref(prefName, null);
    Assert.ok(prefStr);
    const pref = JSON.parse(prefStr);
    Assert.ok(pref);
    Assert.equal(
      pref.NotificationPeriodHours,
      24,
      "Expected notification period to be correct"
    );
    Assert.equal(
      pref.RestartTimeOfDay.Hour,
      12,
      "Expected restart time of day hour to be correct"
    );
    Assert.equal(
      pref.RestartTimeOfDay.Minute,
      0,
      "Expected restart time of day minute to be correct"
    );
    Assert.ok(Services.prefs.prefIsLocked(prefName));
  });
});

add_task(async function test_RelaunchRequired_absent() {
  await withUnsetPref(async () => {
    await setupPolicyEngineWithJson({
      policies: {},
    });

    const prefStr = Services.prefs.getStringPref(prefName, null);
    Assert.equal(prefStr, null);
    Assert.equal(Services.prefs.prefIsLocked(prefName), false);
  });
});

add_task(async function test_RelaunchRequired_roundtrip() {
  await withUnsetPref(async () => {
    await setupPolicyEngineWithJson({
      policies: {
        RelaunchRequired: {
          NotificationPeriodHours: 72,
          what: "ever",
          RestartTimeOfDay: {
            Hour: 18,
            Minute: 30,
          },
        },
      },
    });
    const policy = UpdatePolicyEnforcer.getCompulsoryRestartPolicy();
    Assert.equal(policy.NotificationPeriodHours, 72);
    Assert.equal(
      policy.RestartTimeOfDay.Hour,
      18,
      "Expected restart time of day hour to be correct"
    );
    Assert.equal(
      policy.RestartTimeOfDay.Minute,
      30,
      "Expected restart time of day minute to be correct"
    );
  });
});
