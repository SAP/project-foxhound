/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* globals ExtensionAPI, Services, XPCOMUtils */

ChromeUtils.defineESModuleGetters(this, {
  AsyncShutdown: "resource://gre/modules/AsyncShutdown.sys.mjs",
  BrowserWindowTracker: "resource:///modules/BrowserWindowTracker.sys.mjs",
  TalosParentProfiler: "resource://talos-powers/TalosParentProfiler.sys.mjs",
  setTimeout: "resource://gre/modules/Timer.sys.mjs",
});

const MAX_ATTEMPTS = 10;

let gAttempts = 0;
let gPollingDone;
const gPollingPromise = new Promise(resolve => {
  gPollingDone = resolve;
});

this.startup_about_home_paint = class extends ExtensionAPI {
  onStartup() {
    // Hold off shutdown until our telemetry polling has either captured
    // the measurement or given up. Without this blocker, queued
    // idleDispatch callbacks for `checkForTelemetry` can fire during
    // xpcom-shutdown-threads after Glean's dispatcher has already been
    // torn down, causing a Rust panic on `testGetValue`.
    AsyncShutdown.appShutdownConfirmed.addBlocker(
      "startup_about_home_paint addon: capturing measurement",
      () => gPollingPromise
    );
    Services.obs.addObserver(this, "browser-idle-startup-tasks-finished");
  }

  async wait(aMs) {
    return new Promise(resolve => {
      setTimeout(resolve, aMs);
    });
  }

  observe(subject, topic) {
    if (topic == "browser-idle-startup-tasks-finished") {
      this.checkForTelemetry();
    }
  }

  async checkForTelemetry() {
    let measurement =
      Glean.timestamps.aboutHomeTopsitesFirstPaint.testGetValue();
    let win = BrowserWindowTracker.getTopWindow();
    if (!measurement) {
      if (gAttempts == MAX_ATTEMPTS) {
        dump(
          "Failed to get timestamps.about_home_topsites_first_paint metric in time.\n"
        );
        gPollingDone();
        await this.quit();
        return;
      }
      gAttempts++;

      await this.wait(1000);
      ChromeUtils.idleDispatch(() => {
        this.checkForTelemetry();
      });
    } else {
      // Got our measurement.
      dump("__start_report" + measurement + "__end_report\n\n");
      dump("__startTimestamp" + win.performance.now() + "__endTimestamp\n");

      if (Services.env.exists("TPPROFILINGINFO")) {
        let profilingInfo = Services.env.get("TPPROFILINGINFO");
        if (profilingInfo !== null) {
          TalosParentProfiler.initFromObject(JSON.parse(profilingInfo));
          await TalosParentProfiler.finishStartupProfiling();
        }
      }

      gPollingDone();
      await this.quit();
    }
  }

  async quit() {
    for (let domWindow of Services.wm.getEnumerator(null)) {
      domWindow.close();
    }

    try {
      await this.wait(0);
      Services.startup.quit(Services.startup.eForceQuit);
    } catch (e) {
      dump("Force Quit failed: " + e);
    }
  }

  onShutdown() {}
};
