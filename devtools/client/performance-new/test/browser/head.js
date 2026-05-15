/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const BackgroundJSM = ChromeUtils.importESModule(
  "resource://devtools/client/performance-new/shared/background.sys.mjs"
);

const PrefsPresets = ChromeUtils.importESModule(
  "resource://devtools/shared/performance-new/prefs-presets.sys.mjs"
);

// Recording already set preferences.
const devtoolsPreferences = Services.prefs.getBranch("devtools");
const alreadySetPreferences = new Set();
for (const pref of devtoolsPreferences.getChildList("")) {
  if (devtoolsPreferences.prefHasUserValue(pref)) {
    alreadySetPreferences.add(pref);
  }
}

// Reset all devtools preferences on test end.
registerCleanupFunction(async () => {
  await SpecialPowers.flushPrefEnv();

  // Reset devtools preferences modified by the test.
  for (const pref of devtoolsPreferences.getChildList("")) {
    if (
      devtoolsPreferences.prefHasUserValue(pref) &&
      !alreadySetPreferences.has(pref)
    ) {
      devtoolsPreferences.clearUserPref(pref);
    }
  }
});

registerCleanupFunction(() => {
  PrefsPresets.revertRecordingSettings();
});

/**
 * Allow tests to use "require".
 */
const { require } = ChromeUtils.importESModule(
  "resource://devtools/shared/loader/Loader.sys.mjs"
);

{
  if (Services.env.get("MOZ_PROFILER_SHUTDOWN")) {
    throw new Error(
      "These tests cannot be run with shutdown profiling as they rely on manipulating " +
        "the state of the profiler."
    );
  }

  if (Services.profiler.IsActive()) {
    if (Services.env.exists("MOZ_PROFILER_STARTUP")) {
      // If the startup profiling environment variable exists, it is likely
      // that tests are being profiled.
      // Stop the profiler before starting profiler tests.
      info(
        "This test starts and stops the profiler and is not compatible " +
          "with the use of MOZ_PROFILER_STARTUP. " +
          "Stopping the profiler before starting the test."
      );
      Services.profiler.StopProfiler();
    } else {
      throw new Error(
        "The profiler must not be active before starting it in a test."
      );
    }
  }
}

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/devtools/client/performance-new/test/browser/helpers.js",
  this
);
