/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { BaseAction } = ChromeUtils.import(
  "resource://normandy/actions/BaseAction.jsm"
);
const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  TelemetryEnvironment: "resource://gre/modules/TelemetryEnvironment.sys.mjs",
});
ChromeUtils.defineModuleGetter(
  lazy,
  "PreferenceRollouts",
  "resource://normandy/lib/PreferenceRollouts.jsm"
);
ChromeUtils.defineModuleGetter(
  lazy,
  "PrefUtils",
  "resource://normandy/lib/PrefUtils.jsm"
);
ChromeUtils.defineModuleGetter(
  lazy,
  "ActionSchemas",
  "resource://normandy/actions/schemas/index.js"
);
ChromeUtils.defineModuleGetter(
  lazy,
  "TelemetryEvents",
  "resource://normandy/lib/TelemetryEvents.jsm"
);

var EXPORTED_SYMBOLS = ["PreferenceRollbackAction"];

class PreferenceRollbackAction extends BaseAction {
  get schema() {
    return lazy.ActionSchemas["preference-rollback"];
  }

  async _run(recipe) {
    const { rolloutSlug } = recipe.arguments;
    const rollout = await lazy.PreferenceRollouts.get(rolloutSlug);

    if (lazy.PreferenceRollouts.GRADUATION_SET.has(rolloutSlug)) {
      // graduated rollouts can't be rolled back
      lazy.TelemetryEvents.sendEvent(
        "unenrollFailed",
        "preference_rollback",
        rolloutSlug,
        {
          reason: "in-graduation-set",
          enrollmentId:
            rollout?.enrollmentId ??
            lazy.TelemetryEvents.NO_ENROLLMENT_ID_MARKER,
        }
      );
      throw new Error(
        `Cannot rollback rollout in graduation set "${rolloutSlug}".`
      );
    }

    if (!rollout) {
      this.log.debug(`Rollback ${rolloutSlug} not applicable, skipping`);
      return;
    }

    switch (rollout.state) {
      case lazy.PreferenceRollouts.STATE_ACTIVE: {
        this.log.info(`Rolling back ${rolloutSlug}`);
        rollout.state = lazy.PreferenceRollouts.STATE_ROLLED_BACK;
        for (const { preferenceName, previousValue } of rollout.preferences) {
          lazy.PrefUtils.setPref(preferenceName, previousValue, {
            branch: "default",
          });
        }
        await lazy.PreferenceRollouts.update(rollout);
        lazy.TelemetryEvents.sendEvent(
          "unenroll",
          "preference_rollback",
          rolloutSlug,
          {
            reason: "rollback",
            enrollmentId:
              rollout.enrollmentId ||
              lazy.TelemetryEvents.NO_ENROLLMENT_ID_MARKER,
          }
        );
        lazy.TelemetryEnvironment.setExperimentInactive(rolloutSlug);
        break;
      }
      case lazy.PreferenceRollouts.STATE_ROLLED_BACK: {
        // The rollout has already been rolled back, so nothing to do here.
        break;
      }
      case lazy.PreferenceRollouts.STATE_GRADUATED: {
        // graduated rollouts can't be rolled back
        lazy.TelemetryEvents.sendEvent(
          "unenrollFailed",
          "preference_rollback",
          rolloutSlug,
          {
            reason: "graduated",
            enrollmentId:
              rollout.enrollmentId ||
              lazy.TelemetryEvents.NO_ENROLLMENT_ID_MARKER,
          }
        );
        throw new Error(
          `Cannot rollback already graduated rollout ${rolloutSlug}`
        );
      }
      default: {
        throw new Error(
          `Unexpected state when rolling back ${rolloutSlug}: ${rollout.state}`
        );
      }
    }
  }

  async _finalize() {
    await lazy.PreferenceRollouts.saveStartupPrefs();
  }
}
