/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * @typedef {import("./@types/ExperimentManager").RecipeArgs} RecipeArgs
 * @typedef {import("./@types/ExperimentManager").Enrollment} Enrollment
 * @typedef {import("./@types/ExperimentManager").Branch} Branch
 */

const EXPORTED_SYMBOLS = ["ExperimentManager", "_ExperimentManager"];

const { XPCOMUtils } = ChromeUtils.import(
  "resource://gre/modules/XPCOMUtils.jsm"
);
const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

XPCOMUtils.defineLazyModuleGetters(this, {
  ClientEnvironment: "resource://normandy/lib/ClientEnvironment.jsm",
  ExperimentStore:
    "resource://messaging-system/experiments/ExperimentStore.jsm",
  NormandyUtils: "resource://normandy/lib/NormandyUtils.jsm",
  Sampling: "resource://gre/modules/components-utils/Sampling.jsm",
  TelemetryEvents: "resource://normandy/lib/TelemetryEvents.jsm",
  TelemetryEnvironment: "resource://gre/modules/TelemetryEnvironment.jsm",
  FirstStartup: "resource://gre/modules/FirstStartup.jsm",
  Services: "resource://gre/modules/Services.jsm",
});

XPCOMUtils.defineLazyGetter(this, "log", () => {
  const { Logger } = ChromeUtils.import(
    "resource://messaging-system/lib/Logger.jsm"
  );
  return new Logger("ExperimentManager");
});

// This is included with event telemetry e.g. "enroll"
// TODO: Add a new type called "messaging_study"
const EVENT_TELEMETRY_STUDY_TYPE = "preference_study";
// This is used by Telemetry.setExperimentActive
const TELEMETRY_EXPERIMENT_TYPE_PREFIX = "normandy-";
// Also included in telemetry
const DEFAULT_EXPERIMENT_TYPE = "messaging_experiment";
const STUDIES_OPT_OUT_PREF = "app.shield.optoutstudies.enabled";
const EXPOSURE_EVENT_CATEGORY = "normandy";
const EXPOSURE_EVENT_METHOD = "expose";

/**
 * A module for processes Experiment recipes, choosing and storing enrollment state,
 * and sending experiment-related Telemetry.
 */
class _ExperimentManager {
  constructor({ id = "experimentmanager", store } = {}) {
    this.id = id;
    this.store = store || new ExperimentStore();
    this.sessions = new Map();
    this._onExposureEvent = this._onExposureEvent.bind(this);
    Services.prefs.addObserver(STUDIES_OPT_OUT_PREF, this);
  }

  /**
   * Creates a targeting context with following filters:
   *
   *   * `activeExperiments`: an array of slugs of all the active experiments
   *   * `isFirstStartup`: a boolean indicating whether or not the current enrollment
   *      is performed during the first startup
   *
   * @returns {Object} A context object
   * @memberof _ExperimentManager
   */
  createTargetingContext() {
    let context = {
      isFirstStartup: FirstStartup.state === FirstStartup.IN_PROGRESS,
    };
    Object.defineProperty(context, "activeExperiments", {
      get: async () => {
        await this.store.ready();
        return this.store.getAllActive().map(exp => exp.slug);
      },
    });
    return context;
  }

  /**
   * Runs on startup, including before first run
   */
  async onStartup() {
    await this.store.init();
    this.store.on("exposure", this._onExposureEvent);
    const restoredExperiments = this.store.getAllActive();

    for (const experiment of restoredExperiments) {
      this.setExperimentActive(experiment);
    }
  }

  /**
   * Runs every time a Recipe is updated or seen for the first time.
   * @param {RecipeArgs} recipe
   * @param {string} source
   */
  async onRecipe(recipe, source) {
    const { slug, isEnrollmentPaused } = recipe;

    if (!source) {
      throw new Error("When calling onRecipe, you must specify a source.");
    }

    if (!this.sessions.has(source)) {
      this.sessions.set(source, new Set());
    }
    this.sessions.get(source).add(slug);

    if (this.store.has(slug)) {
      this.updateEnrollment(recipe);
    } else if (isEnrollmentPaused) {
      log.debug(`Enrollment is paused for "${slug}"`);
    } else if (!(await this.isInBucketAllocation(recipe.bucketConfig))) {
      log.debug("Client was not enrolled because of the bucket sampling");
    } else {
      await this.enroll(recipe, source);
    }
  }

  /**
   * Runs when the all recipes been processed during an update, including at first run.
   * @param {string} sourceToCheck
   */
  onFinalize(sourceToCheck) {
    if (!sourceToCheck) {
      throw new Error("When calling onFinalize, you must specify a source.");
    }
    const activeExperiments = this.store.getAllActive();

    for (const experiment of activeExperiments) {
      const { slug, source } = experiment;
      if (sourceToCheck !== source) {
        continue;
      }
      if (!this.sessions.get(source)?.has(slug)) {
        log.debug(`Stopping study for recipe ${slug}`);
        try {
          this.unenroll(slug, "recipe-not-seen");
        } catch (err) {
          Cu.reportError(err);
        }
      }
    }

    this.sessions.delete(sourceToCheck);
  }

  /**
   * Bucket configuration specifies a specific percentage of clients that can
   * be enrolled.
   * @param {BucketConfig} bucketConfig
   * @returns {Promise<boolean>}
   */
  isInBucketAllocation(bucketConfig) {
    if (!bucketConfig) {
      log.debug("Cannot enroll if recipe bucketConfig is not set.");
      return false;
    }

    let id;
    if (bucketConfig.randomizationUnit === "normandy_id") {
      id = ClientEnvironment.userId;
    } else {
      // Others not currently supported.
      log.debug(`Invalid randomizationUnit: ${bucketConfig.randomizationUnit}`);
      return false;
    }

    return Sampling.bucketSample(
      [id, bucketConfig.namespace],
      bucketConfig.start,
      bucketConfig.count,
      bucketConfig.total
    );
  }

  /**
   * Start a new experiment by enrolling the users
   *
   * @param {RecipeArgs} recipe
   * @param {string} source
   * @returns {Promise<Enrollment>} The experiment object stored in the data store
   * @rejects {Error}
   * @memberof _ExperimentManager
   */
  async enroll(
    {
      slug,
      branches,
      experimentType = DEFAULT_EXPERIMENT_TYPE,
      userFacingName,
      userFacingDescription,
    },
    source
  ) {
    if (this.store.has(slug)) {
      this.sendFailureTelemetry("enrollFailed", slug, "name-conflict");
      throw new Error(`An experiment with the slug "${slug}" already exists.`);
    }

    const enrollmentId = NormandyUtils.generateUuid();
    const branch = await this.chooseBranch(slug, branches);

    if (
      this.store.hasExperimentForFeature(
        // Extract out only the feature names from the branch
        branch.feature?.featureId
      )
    ) {
      log.debug(
        `Skipping enrollment for "${slug}" because there is an existing experiment for its feature.`
      );
      this.sendFailureTelemetry("enrollFailed", slug, "feature-conflict");
      throw new Error(
        `An experiment with a conflicting feature already exists.`
      );
    }

    /** @type {Enrollment} */
    const experiment = {
      slug,
      branch,
      active: true,
      // Sent first time feature value is used
      exposurePingSent: false,
      enrollmentId,
      experimentType,
      source,
      userFacingName,
      userFacingDescription,
      lastSeen: new Date().toJSON(),
    };

    this.store.addExperiment(experiment);
    this.setExperimentActive(experiment);
    this.sendEnrollmentTelemetry(experiment);

    log.debug(`New experiment started: ${slug}, ${branch.slug}`);

    return experiment;
  }

  /**
   * Update an enrollment that was already set
   *
   * @param {RecipeArgs} recipe
   */
  updateEnrollment(recipe) {
    /** @type Enrollment */
    const experiment = this.store.get(recipe.slug);

    // Don't update experiments that were already unenrolled.
    if (experiment.active === false) {
      log.debug(`Enrollment ${recipe.slug} has expired, aborting.`);
      return;
    }

    // Stay in the same branch, don't re-sample every time.
    const branch = recipe.branches.find(
      branch => branch.slug === experiment.branch.slug
    );

    if (!branch) {
      // Our branch has been removed. Unenroll.
      this.unenroll(recipe.slug, "branch-removed");
    }
  }

  /**
   * Stop an experiment that is currently active
   *
   * @param {string} slug
   * @param {string} reason
   */
  unenroll(slug, reason = "unknown") {
    const experiment = this.store.get(slug);
    if (!experiment) {
      this.sendFailureTelemetry("unenrollFailed", slug, "does-not-exist");
      throw new Error(`Could not find an experiment with the slug "${slug}"`);
    }

    if (!experiment.active) {
      this.sendFailureTelemetry("unenrollFailed", slug, "already-unenrolled");
      throw new Error(
        `Cannot stop experiment "${slug}" because it is already expired`
      );
    }

    this.store.updateExperiment(slug, { active: false });

    TelemetryEnvironment.setExperimentInactive(slug);
    TelemetryEvents.sendEvent("unenroll", EVENT_TELEMETRY_STUDY_TYPE, slug, {
      reason,
      branch: experiment.branch.slug,
      enrollmentId:
        experiment.enrollmentId || TelemetryEvents.NO_ENROLLMENT_ID_MARKER,
    });

    log.debug(`Experiment unenrolled: ${slug}`);
  }

  /**
   * Unenroll from all active studies if user opts out.
   */
  observe(aSubject, aTopic, aPrefName) {
    if (Services.prefs.getBoolPref(STUDIES_OPT_OUT_PREF)) {
      return;
    }
    for (const { slug } of this.store.getAllActive()) {
      this.unenroll(slug, "studies-opt-out");
    }
  }

  /**
   * Send Telemetry for undesired event
   *
   * @param {string} eventName
   * @param {string} slug
   * @param {string} reason
   */
  sendFailureTelemetry(eventName, slug, reason) {
    TelemetryEvents.sendEvent(eventName, EVENT_TELEMETRY_STUDY_TYPE, slug, {
      reason,
    });
  }

  /**
   *
   * @param {Enrollment} experiment
   */
  sendEnrollmentTelemetry({ slug, branch, experimentType, enrollmentId }) {
    TelemetryEvents.sendEvent("enroll", EVENT_TELEMETRY_STUDY_TYPE, slug, {
      experimentType,
      branch: branch.slug,
      enrollmentId: enrollmentId || TelemetryEvents.NO_ENROLLMENT_ID_MARKER,
    });
  }

  async _onExposureEvent(event, experimentData) {
    await this.store.ready();
    this.store.updateExperiment(experimentData.experimentSlug, {
      exposurePingSent: true,
    });
    // featureId is not validated and might be rejected by recordEvent if not
    // properly defined in Events.yaml. Saving experiment state regardless of
    // the result, no use retrying.
    try {
      Services.telemetry.recordEvent(
        EXPOSURE_EVENT_CATEGORY,
        EXPOSURE_EVENT_METHOD,
        "feature_study",
        experimentData.experimentSlug,
        {
          branchSlug: experimentData.branchSlug,
          featureId: experimentData.featureId,
        }
      );
    } catch (e) {
      Cu.reportError(e);
    }

    log.debug(`Experiment exposure: ${experimentData.experimentSlug}`);
  }

  /**
   * Sets Telemetry when activating an experiment.
   *
   * @param {Enrollment} experiment
   * @memberof _ExperimentManager
   */
  setExperimentActive(experiment) {
    TelemetryEnvironment.setExperimentActive(
      experiment.slug,
      experiment.branch.slug,
      {
        type: `${TELEMETRY_EXPERIMENT_TYPE_PREFIX}${experiment.experimentType}`,
        enrollmentId:
          experiment.enrollmentId || TelemetryEvents.NO_ENROLLMENT_ID_MARKER,
      }
    );
  }

  /**
   * Generate Normandy UserId respective to a branch
   * for a given experiment.
   *
   * @param {string} slug
   * @param {Array<{slug: string; ratio: number}>} branches
   * @param {string} namespace
   * @param {number} start
   * @param {number} count
   * @param {number} total
   * @returns {Promise<{[branchName: string]: string}>} An object where
   * the keys are branch names and the values are user IDs that will enroll
   * a user for that particular branch. Also includes a `notInExperiment` value
   * that will not enroll the user in the experiment
   */
  async generateTestIds({ slug, branches, namespace, start, count, total }) {
    const branchValues = {};

    if (!slug || !namespace) {
      throw new Error(`slug, namespace not in expected format`);
    }

    if (!(start < total && count < total)) {
      throw new Error("Must include start, count, and total as integers");
    }

    if (
      !Array.isArray(branches) ||
      branches.filter(branch => branch.slug && branch.ratio).length !==
        branches.length
    ) {
      throw new Error("branches parameter not in expected format");
    }

    while (Object.keys(branchValues).length < branches.length + 1) {
      const id = NormandyUtils.generateUuid();
      const enrolls = await Sampling.bucketSample(
        [id, namespace],
        start,
        count,
        total
      );
      // Does this id enroll the user in the experiment
      if (enrolls) {
        // Choose a random branch
        const { slug: pickedBranch } = await this.chooseBranch(
          slug,
          branches,
          id
        );

        if (!Object.keys(branchValues).includes(pickedBranch)) {
          branchValues[pickedBranch] = id;
          log.debug(`Found a value for "${pickedBranch}"`);
        }
      } else if (!branchValues.notInExperiment) {
        branchValues.notInExperiment = id;
      }
    }
    return branchValues;
  }

  /**
   * Choose a branch randomly.
   *
   * @param {string} slug
   * @param {Branch[]} branches
   * @returns {Promise<Branch>}
   * @memberof _ExperimentManager
   */
  async chooseBranch(slug, branches, userId = ClientEnvironment.userId) {
    const ratios = branches.map(({ ratio = 1 }) => ratio);

    // It's important that the input be:
    // - Unique per-user (no one is bucketed alike)
    // - Unique per-experiment (bucketing differs across multiple experiments)
    // - Differs from the input used for sampling the recipe (otherwise only
    //   branches that contain the same buckets as the recipe sampling will
    //   receive users)
    const input = `${this.id}-${userId}-${slug}-branch`;

    const index = await Sampling.ratioSample(input, ratios);
    return branches[index];
  }
}

const ExperimentManager = new _ExperimentManager();
