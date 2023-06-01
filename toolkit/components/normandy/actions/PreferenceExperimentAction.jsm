/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { BaseStudyAction } = ChromeUtils.import(
  "resource://normandy/actions/BaseStudyAction.jsm"
);
const lazy = {};
ChromeUtils.defineModuleGetter(
  lazy,
  "Sampling",
  "resource://gre/modules/components-utils/Sampling.jsm"
);
ChromeUtils.defineModuleGetter(
  lazy,
  "ActionSchemas",
  "resource://normandy/actions/schemas/index.js"
);
ChromeUtils.defineModuleGetter(
  lazy,
  "BaseAction",
  "resource://normandy/actions/BaseAction.jsm"
);
ChromeUtils.defineModuleGetter(
  lazy,
  "ClientEnvironment",
  "resource://normandy/lib/ClientEnvironment.jsm"
);
ChromeUtils.defineModuleGetter(
  lazy,
  "PreferenceExperiments",
  "resource://normandy/lib/PreferenceExperiments.jsm"
);

var EXPORTED_SYMBOLS = ["PreferenceExperimentAction"];

/**
 * Enrolls a user in a preference experiment, in which we assign the
 * user to an experiment branch and modify a preference temporarily to
 * measure how it affects Firefox via Telemetry.
 */
class PreferenceExperimentAction extends BaseStudyAction {
  get schema() {
    return lazy.ActionSchemas["multi-preference-experiment"];
  }

  constructor() {
    super();
    this.seenExperimentSlugs = new Set();
  }

  async _processRecipe(recipe, suitability) {
    const {
      branches,
      isHighPopulation,
      isEnrollmentPaused,
      slug,
      userFacingName,
      userFacingDescription,
    } = recipe.arguments || {};

    let experiment;
    // Slug might not exist, because if suitability is ARGUMENTS_INVALID, the
    // arguments is not guaranteed to match the schema.
    if (slug) {
      this.seenExperimentSlugs.add(slug);

      try {
        experiment = await lazy.PreferenceExperiments.get(slug);
      } catch (err) {
        // This is probably that the experiment doesn't exist. If that's not the
        // case, re-throw the error.
        if (!(err instanceof lazy.PreferenceExperiments.NotFoundError)) {
          throw err;
        }
      }
    }

    switch (suitability) {
      case lazy.BaseAction.suitability.SIGNATURE_ERROR: {
        this._considerTemporaryError({ experiment, reason: "signature-error" });
        break;
      }

      case lazy.BaseAction.suitability.CAPABILITIES_MISMATCH: {
        if (experiment && !experiment.expired) {
          await lazy.PreferenceExperiments.stop(slug, {
            resetValue: true,
            reason: "capability-mismatch",
            caller:
              "PreferenceExperimentAction._processRecipe::capabilities_mismatch",
          });
        }
        break;
      }

      case lazy.BaseAction.suitability.FILTER_MATCH: {
        // If we're not in the experiment, try to enroll
        if (!experiment) {
          // Check all preferences that could be used by this experiment.
          // If there's already an active experiment that has set that preference, abort.
          const activeExperiments = await lazy.PreferenceExperiments.getAllActive();
          for (const branch of branches) {
            const conflictingPrefs = Object.keys(branch.preferences).filter(
              preferenceName => {
                return activeExperiments.some(exp =>
                  exp.preferences.hasOwnProperty(preferenceName)
                );
              }
            );
            if (conflictingPrefs.length) {
              throw new Error(
                `Experiment ${slug} ignored; another active experiment is already using the
            ${conflictingPrefs[0]} preference.`
              );
            }
          }

          // Determine if enrollment is currently paused for this experiment.
          if (isEnrollmentPaused) {
            this.log.debug(`Enrollment is paused for experiment "${slug}"`);
            return;
          }

          // Otherwise, enroll!
          const branch = await this.chooseBranch(slug, branches);
          const experimentType = isHighPopulation ? "exp-highpop" : "exp";
          await lazy.PreferenceExperiments.start({
            slug,
            actionName: this.name,
            branch: branch.slug,
            preferences: branch.preferences,
            experimentType,
            userFacingName,
            userFacingDescription,
          });
        } else if (experiment.expired) {
          this.log.debug(`Experiment ${slug} has expired, aborting.`);
        } else {
          experiment.temporaryErrorDeadline = null;
          await lazy.PreferenceExperiments.update(experiment);
          await lazy.PreferenceExperiments.markLastSeen(slug);
        }
        break;
      }

      case lazy.BaseAction.suitability.FILTER_MISMATCH: {
        if (experiment && !experiment.expired) {
          await lazy.PreferenceExperiments.stop(slug, {
            resetValue: true,
            reason: "filter-mismatch",
            caller:
              "PreferenceExperimentAction._processRecipe::filter_mismatch",
          });
        }
        break;
      }

      case lazy.BaseAction.suitability.FILTER_ERROR: {
        this._considerTemporaryError({ experiment, reason: "filter-error" });
        break;
      }

      case lazy.BaseAction.suitability.ARGUMENTS_INVALID: {
        if (experiment && !experiment.expired) {
          await lazy.PreferenceExperiments.stop(slug, {
            resetValue: true,
            reason: "arguments-invalid",
            caller:
              "PreferenceExperimentAction._processRecipe::arguments_invalid",
          });
        }
        break;
      }

      default: {
        throw new Error(`Unknown recipe suitability "${suitability}".`);
      }
    }
  }

  async _run(recipe) {
    throw new Error("_run shouldn't be called anymore");
  }

  async chooseBranch(slug, branches) {
    const ratios = branches.map(branch => branch.ratio);
    const userId = lazy.ClientEnvironment.userId;

    // It's important that the input be:
    // - Unique per-user (no one is bucketed alike)
    // - Unique per-experiment (bucketing differs across multiple experiments)
    // - Differs from the input used for sampling the recipe (otherwise only
    //   branches that contain the same buckets as the recipe sampling will
    //   receive users)
    const input = `${userId}-${slug}-branch`;

    const index = await lazy.Sampling.ratioSample(input, ratios);
    return branches[index];
  }

  /**
   * End any experiments which we didn't see during this session.
   * This is the "normal" way experiments end, as they are disabled on
   * the server and so we stop seeing them.  This can also happen if
   * the user doesn't match the filter any more.
   */
  async _finalize({ noRecipes } = {}) {
    const activeExperiments = await lazy.PreferenceExperiments.getAllActive();

    if (noRecipes && this.seenExperimentSlugs.size) {
      throw new PreferenceExperimentAction.BadNoRecipesArg();
    }

    return Promise.all(
      activeExperiments.map(experiment => {
        if (this.name != experiment.actionName) {
          // Another action is responsible for cleaning this one
          // up. Leave it alone.
          return null;
        }

        if (noRecipes) {
          return this._considerTemporaryError({
            experiment,
            reason: "no-recipes",
          });
        }

        if (this.seenExperimentSlugs.has(experiment.slug)) {
          return null;
        }

        return lazy.PreferenceExperiments.stop(experiment.slug, {
          resetValue: true,
          reason: "recipe-not-seen",
          caller: "PreferenceExperimentAction._finalize",
        }).catch(e => {
          this.log.warn(`Stopping experiment ${experiment.slug} failed: ${e}`);
        });
      })
    );
  }

  /**
   * Given that a temporary error has occurred for an experiment, check if it
   * should be temporarily ignored, or if the deadline has passed. If the
   * deadline is passed, the experiment will be ended. If this is the first
   * temporary error, a deadline will be generated. Otherwise, nothing will
   * happen.
   *
   * If a temporary deadline exists but cannot be parsed, a new one will be
   * made.
   *
   * The deadline is 7 days from the first time that recipe failed, as
   * reckoned by the client's clock.
   *
   * @param {Object} args
   * @param {Experiment} args.experiment The enrolled experiment to potentially unenroll.
   * @param {String} args.reason If the recipe should end, the reason it is ending.
   */
  async _considerTemporaryError({ experiment, reason }) {
    if (!experiment || experiment.expired) {
      return;
    }

    let now = Date.now(); // milliseconds-since-epoch
    let day = 24 * 60 * 60 * 1000;
    let newDeadline = new Date(now + 7 * day).toJSON();

    if (experiment.temporaryErrorDeadline) {
      let deadline = new Date(experiment.temporaryErrorDeadline);
      // if deadline is an invalid date, set it to one week from now.
      if (isNaN(deadline)) {
        experiment.temporaryErrorDeadline = newDeadline;
        await lazy.PreferenceExperiments.update(experiment);
        return;
      }

      if (now > deadline) {
        await lazy.PreferenceExperiments.stop(experiment.slug, {
          resetValue: true,
          reason,
          caller: "PreferenceExperimentAction._considerTemporaryFailure",
        });
      }
    } else {
      // there is no deadline, so set one
      experiment.temporaryErrorDeadline = newDeadline;
      await lazy.PreferenceExperiments.update(experiment);
    }
  }
}

PreferenceExperimentAction.BadNoRecipesArg = class extends Error {
  message = "noRecipes is true, but some recipes observed";
};
