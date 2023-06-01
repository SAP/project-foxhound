/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { ExperimentAPI } = ChromeUtils.import(
  "resource://nimbus/ExperimentAPI.jsm"
);
const { ExperimentFakes } = ChromeUtils.import(
  "resource://testing-common/NimbusTestUtils.jsm"
);
const { ExperimentManager } = ChromeUtils.import(
  "resource://nimbus/lib/ExperimentManager.jsm"
);

const EXPERIMENT_VALUE = "experiment-value";
const ROLLOUT_VALUE = "rollout-value";
const ROLLOUT = "rollout";
const EXPERIMENT = "experiment";

const VALUES = {
  [ROLLOUT]: ROLLOUT_VALUE,
  [EXPERIMENT]: EXPERIMENT_VALUE,
};

add_task(async function test_prefs_priority() {
  const pref = "nimbus.testing.testSetString";
  const featureId = "testFeature";

  async function doTest({ settingEnrollments, expectedValue }) {
    info(
      `Enrolling in a rollout and experiment where the ${settingEnrollments.join(
        " and "
      )} set the same pref variable.`
    );
    const enrollmentCleanup = [];

    for (const enrollmentKind of [ROLLOUT, EXPERIMENT]) {
      const config = {
        featureId,
        value: {},
      };

      if (settingEnrollments.includes(enrollmentKind)) {
        config.value.testSetString = VALUES[enrollmentKind];
      }

      enrollmentCleanup.push(
        await ExperimentFakes.enrollWithFeatureConfig(config, {
          isRollout: enrollmentKind === ROLLOUT,
        })
      );
    }

    is(
      NimbusFeatures[featureId].getVariable("testSetString"),
      expectedValue,
      "Expected the variable to match the expected value"
    );

    is(
      Services.prefs.getStringPref(pref),
      expectedValue,
      "Expected the pref to match the expected value"
    );

    for (const cleanup of enrollmentCleanup) {
      await cleanup();
    }

    Services.prefs.deleteBranch(pref);
  }

  for (const settingEnrollments of [
    [ROLLOUT],
    [EXPERIMENT],
    [ROLLOUT, EXPERIMENT],
  ]) {
    const expectedValue = settingEnrollments.includes(EXPERIMENT)
      ? EXPERIMENT_VALUE
      : ROLLOUT_VALUE;

    await doTest({ settingEnrollments, expectedValue });
  }
});
