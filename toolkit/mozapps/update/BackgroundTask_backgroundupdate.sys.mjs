/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { BackgroundUpdate } from "resource://gre/modules/BackgroundUpdate.sys.mjs";
import { DevToolsSocketStatus } from "resource://devtools/shared/security/DevToolsSocketStatus.sys.mjs";

const { ACTION, EXIT_CODE } = BackgroundUpdate;

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";
import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  AppUpdater: "resource://gre/modules/AppUpdater.sys.mjs",
  BackgroundTasksUtils: "resource://gre/modules/BackgroundTasksUtils.sys.mjs",
  ExtensionUtils: "resource://gre/modules/ExtensionUtils.sys.mjs",
  NimbusFeatures: "resource://nimbus/ExperimentAPI.sys.mjs",
  UpdateUtils: "resource://gre/modules/UpdateUtils.sys.mjs",
});

XPCOMUtils.defineLazyServiceGetter(
  lazy,
  "UpdateService",
  "@mozilla.org/updates/update-service;1",
  Ci.nsIApplicationUpdateService
);

ChromeUtils.defineLazyGetter(lazy, "log", () => {
  let { ConsoleAPI } = ChromeUtils.importESModule(
    "resource://gre/modules/Console.sys.mjs"
  );
  let consoleOptions = {
    // tip: set maxLogLevel to "debug" and use log.debug() to create detailed
    // messages during development. See LOG_LEVELS in Console.sys.mjs for details.
    maxLogLevel: "error",
    maxLogLevelPref: "app.update.background.loglevel",
    prefix: "BackgroundUpdate",
  };
  return new ConsoleAPI(consoleOptions);
});

export const backgroundTaskTimeoutSec = Services.prefs.getIntPref(
  "app.update.background.timeoutSec",
  10 * 60
);

function automaticRestartFound(commandLine) {
  return -1 != commandLine.findFlag("automatic-restart", false);
}

/**
 * Verify that pre-conditions to update this installation (both persistent and
 * transient) are fulfilled, and if they are all fulfilled, pump the update
 * loop.
 *
 * This means checking for, downloading, and potentially applying updates.
 *
 * @param   {object} Optional parameters
 *   {boolean} checkOnly
 *     If specified as `true`, checks for updates but does not download them
 *     unless a flag from Balrog specifically overrides this behavior.
 * @returns {any} - Returns AppUpdater status upon update loop exit.
 */
async function attemptBackgroundUpdate({ checkOnly = false } = {}) {
  let SLUG = "attemptBackgroundUpdate";

  lazy.log.debug(
    `${SLUG}: checking for preconditions necessary to update this installation`
  );
  let reasons = await BackgroundUpdate._reasonsToNotUpdateInstallation();

  if (BackgroundUpdate._force()) {
    // We want to allow developers and testers to monkey with the system.
    lazy.log.debug(
      `${SLUG}: app.update.background.force=true, ignoring reasons: ${JSON.stringify(
        reasons
      )}`
    );
    reasons = [];
  }

  reasons.sort();
  for (let reason of reasons) {
    Glean.backgroundUpdate.reasons.add(reason);
  }

  let enabled = !reasons.length;
  if (!enabled) {
    lazy.log.info(
      `${SLUG}: not running background update task: '${JSON.stringify(
        reasons
      )}'`
    );

    return lazy.AppUpdater.STATUS.NEVER_CHECKED;
  }

  let result = new Promise(resolve => {
    let appUpdater = new lazy.AppUpdater();

    let _appUpdaterListener = async (status, progress, progressMax) => {
      let exitUpdateLoop = () => {
        appUpdater.removeListener(_appUpdaterListener);
        appUpdater.stop();
        resolve(status);
      };

      let stringStatus = lazy.AppUpdater.STATUS.debugStringFor(status);
      Glean.backgroundUpdate.states.add(stringStatus);
      Glean.backgroundUpdate.finalState.set(stringStatus);

      if (lazy.AppUpdater.STATUS.isTerminalStatus(status)) {
        lazy.log.debug(
          `${SLUG}: background update transitioned to terminal status ${status}: ${stringStatus}`
        );
        exitUpdateLoop();
      } else if (status == lazy.AppUpdater.STATUS.CHECKING) {
        // The usual initial flow for the Background Update Task is to kick off
        // the update download and immediately exit. For consistency, we are
        // going to enforce this flow. So if we are just now checking for
        // updates, we will limit the updater such that it cannot start staging,
        // even if we immediately download the entire update.
        lazy.log.debug(
          `${SLUG}: This session will be limited to downloading updates only.`
        );
        lazy.UpdateService.onlyDownloadUpdatesThisSession = true;
      } else if (
        status == lazy.AppUpdater.STATUS.DOWNLOADING &&
        (lazy.UpdateService.onlyDownloadUpdatesThisSession ||
          (progress !== undefined && progressMax !== undefined))
      ) {
        // We get a DOWNLOADING callback with no progress or progressMax values
        // when we initially switch to the DOWNLOADING state. But when we get
        // onProgress notifications, progress and progressMax will be defined.
        // Remember to keep in mind that progressMax is a required value that
        // we can count on being meaningful, but it will be set to -1 for BITS
        // transfers that haven't begun yet.
        if (
          lazy.UpdateService.onlyDownloadUpdatesThisSession ||
          progressMax < 0 ||
          progress != progressMax
        ) {
          lazy.log.debug(
            `${SLUG}: Download in progress. Exiting task while download ` +
              `transfers`
          );
          // If the download is still in progress, we don't want the Background
          // Update Task to hang around waiting for it to complete.
          lazy.UpdateService.onlyDownloadUpdatesThisSession = true;
          exitUpdateLoop();
        } else {
          lazy.log.debug(`${SLUG}: Download has completed!`);
        }
      } else if (status == lazy.AppUpdater.STATUS.DOWNLOAD_AND_INSTALL) {
        // This can happen in two situations:
        //  1. This function was called with `checkOnly = true` and we are done
        //     checking.
        //  2. The user turned off automatic updates ("Check for updates but
        //     let me choose to install them") and we didn't update the task for
        //     whatever reason (maybe the global setting was changed from a
        //     different user account and the current user account hasn't run
        //     since).
        // In case (1), we want to take a look at the response to the update
        // check and possibly act on it. In case (2), we should do nothing and
        // wait for user permission.
        let updateAuto = await lazy.UpdateUtils.getAppUpdateAutoEnabled();
        if (!updateAuto || lazy.UpdateService.manualUpdateOnly) {
          lazy.log.debug(`${SLUG}: Need to wait for user permission`);
          exitUpdateLoop();
        } else {
          lazy.log.debug(`${SLUG}: Check completed with checkOnly set`);
          if (appUpdater.update.getProperty("forceBackgroundUpdate") != null) {
            lazy.log.debug(`${SLUG}: forceBackgroundUpdate set`);
            appUpdater.allowUpdateDownload();
          } else {
            lazy.log.debug(`${SLUG}: Update throttled`);
            Glean.backgroundUpdate.throttlingPreventedUpdates.add();
            exitUpdateLoop();
          }
        }
      } else {
        lazy.log.debug(
          `${SLUG}: background update transitioned to status ${status}: ${stringStatus}`
        );
      }
    };
    appUpdater.addListener(_appUpdaterListener);

    appUpdater.check({ checkOnly });
  });

  return result;
}

/**
 * Functions implementing the possible high level actions that the Background
 * Update Task may be performing (depending on prefs, policies, Nimbus
 * configuration, etc).
 */
export var Actions = {
  /**
   * Verify that pre-conditions to update this installation (both persistent and
   * transient) are fulfilled, and if they are all fulfilled, pump the update
   * loop.
   *
   * This means checking for, downloading, and potentially applying updates.
   *
   * @returns {any} - Returns AppUpdater status upon update loop exit.
   */
  async attemptBackgroundUpdate() {
    return attemptBackgroundUpdate();
  },

  /**
   * Verify that pre-conditions to update this installation (both persistent and
   * transient) are fulfilled, and if they are all fulfilled, check for an
   * update but, unless there is a Balrog override, do not install it.
   */
  async checkForUpdate() {
    return attemptBackgroundUpdate({ checkOnly: true });
  },

  /**
   * Maybe submit a "background-update" custom Glean ping.
   *
   * If data reporting upload in general is enabled Glean will submit a ping.  To determine if
   * telemetry is enabled, Glean will look at the relevant pref, which was mirrored from the default
   * profile.  Note that the Firefox policy mechanism will manage this pref, locking it to particular
   * values as appropriate.
   */
  async maybeSubmitBackgroundUpdatePing() {
    let SLUG = "maybeSubmitBackgroundUpdatePing";

    // It should be possible to turn AUSTLMY data into Glean data, but mapping histograms isn't
    // trivial, so we don't do it at this time.  Bug 1703313.

    // Including a reason allows to differentiate pings sent as part of the task
    // and pings queued and sent by Glean on a different schedule.
    GleanPings.backgroundUpdate.submit("backgroundupdate_task");

    lazy.log.info(`${SLUG}: submitted "background-update" ping`);
  },

  async enableNimbusAndFirefoxMessagingSystem(
    commandLine,
    defaultProfileTargetingSnapshot
  ) {
    await lazy.BackgroundTasksUtils.enableNimbus(
      commandLine,
      defaultProfileTargetingSnapshot.environment
    );

    await lazy.BackgroundTasksUtils.enableFirefoxMessagingSystem(
      defaultProfileTargetingSnapshot.environment
    );
  },
};

/**
 * Runs the specified Background Update actions from the `Actions` object,
 * above. May restart the browser upon completion if an update was successfully
 * downloaded and prepared and Nimbus configuration allows it.
 *
 * @param   commandLine {nsICommandLine}
 *          The command line that the browser was launched with.
 * @param   defaultProfileTargetingSnapshot {object}
 *          The snapshotted Firefox Messaging System targeting out of a profile.
 * @param   actionSet {Set<string>}
 *          The actions to perform. The available actions are defined in
 *          `BackgroundUpdate.ACTION`.
 * @returns {integer}
 *          The `EXIT_CODE` value that the Background Update Task should return.
 */
export async function runActions(
  commandLine,
  defaultProfileTargetingSnapshot,
  actionSet
) {
  let SLUG = "runActions";

  let result = EXIT_CODE.SUCCESS;

  // In case we have old observations.  This shouldn't happen but tasks do crash
  // or fail with exceptions, so: belt and braces.
  Glean.backgroundUpdate.reasons.set([]);
  Glean.backgroundUpdate.states.set([]);

  let updateStatus = lazy.AppUpdater.STATUS.NEVER_CHECKED;
  let stringStatus = lazy.AppUpdater.STATUS.debugStringFor(updateStatus);
  Glean.backgroundUpdate.states.add(stringStatus);
  Glean.backgroundUpdate.finalState.set(stringStatus);

  if (!actionSet.size) {
    lazy.log.warn(`${SLUG}: no actions to take, exiting immediately`);

    // We're done for this time period.
    Glean.backgroundUpdate.exitCodeSuccess.set(true);
    return EXIT_CODE.SUCCESS;
  }
  // Most likely we will implicitly initialize update at some point, but make
  // sure post update processing gets run, just in case.  We want to do this
  // even when we're not going to check for updates; no sense leaving a pending
  // update in indeterminate state.
  await lazy.UpdateService.init();

  let attemptAutomaticRestart = false;
  let mightUpdate =
    actionSet.has(ACTION.UPDATE) || actionSet.has(ACTION.UPDATE_CHECK);
  try {
    if (mightUpdate) {
      // Return AppUpdater status from attemptBackgroundUpdate() to
      // check if the status is STATUS.READY_FOR_RESTART.
      if (actionSet.has(ACTION.UPDATE)) {
        updateStatus = await Actions.attemptBackgroundUpdate();
      } else {
        updateStatus = await Actions.checkForUpdate();
      }

      lazy.log.info(`${SLUG}: attempted background update`);

      Glean.backgroundUpdate.exitCodeSuccess.set(true);

      // Report an attempted automatic restart.  If a restart loop is occurring
      // then `automaticRestartFound` will be true, and we don't want to restart a
      // second time.
      attemptAutomaticRestart =
        lazy.NimbusFeatures.backgroundUpdateAutomaticRestart.getVariable(
          "enabled"
        ) &&
        updateStatus === lazy.AppUpdater.STATUS.READY_FOR_RESTART &&
        !automaticRestartFound(commandLine);

      if (attemptAutomaticRestart) {
        Glean.backgroundUpdate.automaticRestartAttempted.set(true);
      }
    } else {
      lazy.log.info(`${SLUG}: not attempting background update`);
    }

    if (actionSet.has(ACTION.EXPERIMENTER)) {
      try {
        // Now that we've pumped the update loop (if we are going to pump the
        // update loop), we can start Nimbus and the Firefox Messaging System and
        // see if we should message the user.  This minimizes the risk of
        // messaging impacting the function of the background update system.
        lazy.log.info(
          `${SLUG}: enabling Nimbus and the Firefox Messaging System`
        );

        await Actions.enableNimbusAndFirefoxMessagingSystem(
          commandLine,
          defaultProfileTargetingSnapshot
        );
      } catch (f) {
        // Try to make it easy to witness errors in this system.  We can pass through any exception
        // without disrupting (future) background updates.
        //
        // Most meaningful issues with the Nimbus/experiments system will be reported via Glean
        // events.
        lazy.log.warn(
          `${SLUG}: exception raised from Nimbus/Firefox Messaging System`,
          f
        );
        throw f;
      }
    }
  } catch (e) {
    // TODO: in the future, we might want to classify failures into transient and persistent and
    // backoff the update task in the face of continuous persistent errors.
    lazy.log.error(`${SLUG}: caught exception attempting background update`, e);

    result = EXIT_CODE.EXCEPTION;
    Glean.backgroundUpdate.exitCodeException.set(true);
  } finally {
    if (actionSet.has(ACTION.SUBMIT_PING)) {
      // This is the point to report telemetry, assuming that the default profile's data reporting
      // configuration allows it.
      await Actions.maybeSubmitBackgroundUpdatePing();
    } else {
      lazy.log.info(`${SLUG}: not submitting background update ping`);
    }
  }

  // Avoid shutdown races.  We used to have known races (Bug 1703572, Bug
  // 1700846), so better safe than sorry.
  await lazy.ExtensionUtils.promiseTimeout(1000);

  if (mightUpdate) {
    // If we're in a staged background update, we need to restart Firefox to complete the update.
    lazy.log.debug(
      `${SLUG}: Checking if staged background update is ready for restart`
    );
    if (attemptAutomaticRestart) {
      lazy.log.debug(
        `${SLUG}: Starting Firefox restart after staged background update`
      );

      // We need to restart Firefox with the same arguments to ensure
      // the background update continues from where it was before the restart.
      try {
        Cc["@mozilla.org/updates/update-processor;1"]
          .createInstance(Ci.nsIUpdateProcessor)
          .attemptAutomaticApplicationRestartWithLaunchArgs([
            "-automatic-restart",
          ]);
        lazy.log.debug(`${SLUG}: automatic application restart queued`);
      } catch (e) {
        lazy.log.error(
          `${SLUG}: caught exception; failed to queue automatic application restart`,
          e
        );
      }
    }
  } else {
    lazy.log.debug(
      `${SLUG}: not updating so not checking if background update is ready for restart`
    );
  }

  return result;
}

export async function runBackgroundTask(commandLine) {
  let SLUG = "runBackgroundTask";
  lazy.log.error(`${SLUG}: backgroundupdate`);

  // Modify Glean metrics for a successful automatic restart.
  if (automaticRestartFound(commandLine)) {
    Glean.backgroundUpdate.automaticRestartSuccess.set(true);
    lazy.log.debug(`${SLUG}: application automatic restart completed`);
  }

  // Help debugging.  This is a pared down version of
  // `dataProviders.application` in `Troubleshoot.sys.mjs`.  When adding to this
  // debugging data, try to follow the form from that module.
  let data = {
    name: Services.appinfo.name,
    osVersion:
      Services.sysinfo.getProperty("name") +
      " " +
      Services.sysinfo.getProperty("version") +
      " " +
      Services.sysinfo.getProperty("build"),
    version: AppConstants.MOZ_APP_VERSION_DISPLAY,
    buildID: Services.appinfo.appBuildID,
    distributionID: Services.prefs
      .getDefaultBranch("")
      .getCharPref("distribution.id", ""),
    updateChannel: lazy.UpdateUtils.UpdateChannel,
    UpdRootD: Services.dirsvc.get("UpdRootD", Ci.nsIFile).path,
  };
  lazy.log.debug(`${SLUG}: current configuration`, data);

  // Other instances running are a transient precondition (during this invocation).  We'd prefer to
  // check this later, as a reason for not updating, but Glean is not tested in multi-process
  // environments and while its storage (backed by rkv) can in theory support multiple processes, it
  // is not clear that it in fact does support multiple processes.  So we are conservative here.
  // There is a potential time-of-check/time-of-use race condition here, but if process B starts
  // after we pass this test, that process should exit after it gets to this check, avoiding
  // multiple processes using the same Glean storage.  If and when more and longer-running
  // background tasks become common, we may need to be more fine-grained and share just the Glean
  // storage resource.
  lazy.log.debug(`${SLUG}: checking if other instance is running`);
  let syncManager = Cc["@mozilla.org/updates/update-sync-manager;1"].getService(
    Ci.nsIUpdateSyncManager
  );
  if (DevToolsSocketStatus.hasSocketOpened()) {
    lazy.log.warn(
      `${SLUG}: Ignoring the 'multiple instances' check because a DevTools server is listening.`
    );
  } else if (syncManager.isOtherInstanceRunning()) {
    lazy.log.error(`${SLUG}: another instance is running`);
    return EXIT_CODE.OTHER_INSTANCE;
  }

  // Here we mirror specific prefs from the default profile into our temporary profile.  We want to
  // do this early because some of the prefs may impact internals such as log levels.  Generally,
  // however, we want prefs from the default profile to not impact the mechanics of checking for,
  // downloading, and applying updates, since such prefs should be be per-installation prefs, using
  // the mechanisms of Bug 1691486.  Sadly using this mechanism for many relevant prefs (namely
  // `app.update.BITS.enabled` and `app.update.service.enabled`) is difficult: see Bug 1657533.
  //
  // We also read any Nimbus targeting snapshot from the default profile.
  let defaultProfileTargetingSnapshot = {};
  try {
    let defaultProfilePrefs;
    await lazy.BackgroundTasksUtils.withProfileLock(async lock => {
      let predicate = name => {
        return (
          name.startsWith("app.update.") || // For obvious reasons.
          name.startsWith("datareporting.") || // For Glean.
          name.startsWith("logging.") || // For Glean.
          name.startsWith("telemetry.fog.") || // For Glean.
          name.startsWith("app.partner.") || // For our metrics.
          name === "app.shield.optoutstudies.enabled" || // For Nimbus.
          name === "services.settings.server" || // For Remote Settings via Nimbus.
          name === "services.settings.preview_enabled" || // For Remote Settings via Nimbus.
          name === "messaging-system.rsexperimentloader.collection_id" // For Firefox Messaging System.
        );
      };

      defaultProfilePrefs = await lazy.BackgroundTasksUtils.readPreferences(
        predicate,
        lock
      );
      let telemetryClientID =
        await lazy.BackgroundTasksUtils.readTelemetryClientID(lock);
      Glean.backgroundUpdate.clientId.set(telemetryClientID);

      // Read targeting snapshot, collect background update specific telemetry.  Never throws.
      defaultProfileTargetingSnapshot =
        await BackgroundUpdate.readFirefoxMessagingSystemTargetingSnapshot(
          lock
        );
    });

    for (let [name, value] of Object.entries(defaultProfilePrefs)) {
      switch (typeof value) {
        case "boolean":
          Services.prefs.setBoolPref(name, value);
          break;
        case "number":
          Services.prefs.setIntPref(name, value);
          break;
        case "string":
          Services.prefs.setCharPref(name, value);
          break;
        default:
          throw new Error(
            `Pref from default profile with name "${name}" has unrecognized type`
          );
      }
    }
  } catch (e) {
    if (!lazy.BackgroundTasksUtils.hasDefaultProfile()) {
      lazy.log.error(`${SLUG}: caught exception; no default profile exists`, e);
      return EXIT_CODE.DEFAULT_PROFILE_DOES_NOT_EXIST;
    }

    if (e.name == "CannotLockProfileError") {
      lazy.log.error(
        `${SLUG}: caught exception; could not lock default profile`,
        e
      );
      return EXIT_CODE.DEFAULT_PROFILE_CANNOT_BE_LOCKED;
    }

    lazy.log.error(
      `${SLUG}: caught exception reading preferences and telemetry client ID from default profile`,
      e
    );
    return EXIT_CODE.DEFAULT_PROFILE_CANNOT_BE_READ;
  }

  // Now that we have prefs from the default profile, we can configure Firefox-on-Glean.

  // Glean has a preinit queue for metric operations that happen before init, so
  // this is safe.  We want to have these metrics set before the first possible
  // time we might send (built-in) pings.
  await BackgroundUpdate.recordUpdateEnvironment();

  // To help debugging, use the `GLEAN_LOG_PINGS` and `GLEAN_DEBUG_VIEW_TAG`
  // environment variables: see
  // https://mozilla.github.io/glean/book/user/debugging/index.html.
  let gleanRoot = await IOUtils.getDirectory(
    Services.dirsvc.get("UpdRootD", Ci.nsIFile).path,
    "backgroundupdate",
    "datareporting",
    "glean"
  );
  Services.fog.initializeFOG(
    gleanRoot.path,
    "firefox.desktop.background.update",
    /* disableInternalPings */ true
  );

  // For convenience, mirror our loglevel.
  let logLevel = Services.prefs.getCharPref(
    "app.update.background.loglevel",
    "error"
  );
  const logLevelPrefs = [
    "browser.newtabpage.activity-stream.asrouter.debugLogLevel",
    "messaging-system.log",
    "services.settings.loglevel",
    "toolkit.backgroundtasks.loglevel",
  ];
  for (let logLevelPref of logLevelPrefs) {
    lazy.log.info(`${SLUG}: setting ${logLevelPref}=${logLevel}`);
    Services.prefs.setCharPref(logLevelPref, logLevel);
  }

  // The langpack updating mechanism expects the addons manager, but in background task mode, the
  // addons manager is not present.  Since we can't update langpacks from the background task
  // temporary profile, we disable the langpack updating mechanism entirely.  This relies on the
  // default profile being the only profile that schedules the OS-level background task and ensuring
  // the task is not scheduled when langpacks are present.  Non-default profiles that have langpacks
  // installed may experience the issues that motivated Bug 1647443.  If this turns out to be a
  // significant problem in the wild, we could store more information about profiles and their
  // active langpacks to disable background updates in more cases, maybe in per-installation prefs.
  Services.prefs.setBoolPref("app.update.langpack.enabled", false);

  let result = await BackgroundUpdate.withActionsToPerform(
    { defaultProfileTargetingSnapshot },
    actionSet =>
      runActions(commandLine, defaultProfileTargetingSnapshot, actionSet)
  );

  return result;
}
