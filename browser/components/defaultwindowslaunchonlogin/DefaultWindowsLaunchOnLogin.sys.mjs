/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

export const DEFAULT_WINDOWS_LAUNCH_ON_LOGIN_NIMBUS_FEATURE_ID =
  "defaultWindowsLaunchOnLogin";

export const DEFAULT_WINDOWS_LAUNCH_ON_LOGIN_PREF =
  "browser.startup.windowsLaunchOnLogin.defaultEnabled";

const lazy = XPCOMUtils.declareLazy({
  AppConstants: "resource://gre/modules/AppConstants.sys.mjs",
  ExperimentAPI: "resource://nimbus/ExperimentAPI.sys.mjs",
  WindowsLaunchOnLogin: "resource://gre/modules/WindowsLaunchOnLogin.sys.mjs",
  profileService: {
    service: "@mozilla.org/toolkit/profile-service;1",
    iid: Ci.nsIToolkitProfileService,
  },
});

export var DefaultWindowsLaunchOnLogin = {
  /**
   * `browser-idle-startup` category entry point.
   *
   * This deliberately runs off the startup-critical path. Waiting for Nimbus's
   * first Remote Settings fetch (see `waitForNimbusReady`) forces Remote
   * Settings initialization, which does significant disk I/O; doing that in a
   * pre-UI category regressed Talos startup file-I/O metrics (bug 2050775).
   * The Windows startup apps registry key only matters before the user reboots
   * Windows, so this has ample slack and is dispatched once the browser is
   * idle instead. There is some risk that users could see the option disabled
   * in preferences before we get to enable it, but this is unlikely to be a
   * significant problem and we've accepted that risk.
   *
   * The category manager invokes this with a `jsGlobal` first argument, which
   * we ignore; the real work and its inputs live in `enableOnFirstRunIfNeeded`
   * so they can be driven directly from tests.
   */
  async maybeEnableOnFirstRun() {
    await this.enableOnFirstRunIfNeeded(
      lazy.profileService.isFirstRun,
      lazy.AppConstants.MOZILLA_OFFICIAL
    );
  },

  /**
   * Enable launch-on-login by default unless Nimbus opts the user out.
   *
   * @param {boolean} isFirstRun
   *   True only on a genuine first run (new install + newly created profile).
   * @param {boolean} isOfficialBuild
   *   False for local developer builds, where we skip so `./mach run` doesn't
   *   register every dev's checkout to launch on login.
   */
  async enableOnFirstRunIfNeeded(isFirstRun, isOfficialBuild) {
    if (
      lazy.AppConstants.platform !== "win" ||
      !isOfficialBuild ||
      !isFirstRun
    ) {
      return;
    }

    // Wait for Nimbus's first Remote Settings update so that any enrollment has
    // applied its value before we read the pref below.
    await this.waitForNimbusReady();

    if (
      !Services.prefs.getBoolPref(DEFAULT_WINDOWS_LAUNCH_ON_LOGIN_PREF, false)
    ) {
      return;
    }

    if (!(await lazy.WindowsLaunchOnLogin.getLaunchOnLoginApproved())) {
      return;
    }

    await lazy.WindowsLaunchOnLogin.createLaunchOnLogin();
  },

  /**
   * Wait for Nimbus's first Remote Settings update so enrollment for this
   * feature is knowable.
   */
  async waitForNimbusReady() {
    await lazy.ExperimentAPI.init();
    await lazy.ExperimentAPI._rsLoader.finishedUpdating();
  },
};
