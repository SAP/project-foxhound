/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";
import { LogManager } from "resource://gre/modules/LogManager.sys.mjs";
// See Bug 1889052
// eslint-disable-next-line mozilla/use-console-createInstance
import { Log } from "resource://gre/modules/Log.sys.mjs";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  AsyncShutdown: "resource://gre/modules/AsyncShutdown.sys.mjs",
  cancelIdleCallback: "resource://gre/modules/Timer.sys.mjs",
  requestIdleCallback: "resource://gre/modules/Timer.sys.mjs",
});

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "logFlushIntervalSeconds",
  "browser.sessionstore.logFlushIntervalSeconds",
  3600
);

const loggerNames = ["SessionStore"];

export const sessionStoreLogger = Log.repository.getLogger("SessionStore");
sessionStoreLogger.manageLevelFromPref("browser.sessionstore.loglevel");

class SessionLogManager extends LogManager {
  #idleCallbackId = null;
  #startupTime = 0;
  #isStartingUp = true;
  #observers = new Set();

  QueryInterface = ChromeUtils.generateQI([Ci.nsIObserver]);

  constructor(options = {}) {
    super(options);

    Services.obs.addObserver(this, "sessionstore-windows-restored");
    this.#observers.add("sessionstore-windows-restored");

    if (this._fileAppenderChangeTopic) {
      Services.obs.addObserver(this, this._fileAppenderChangeTopic);
      this.#observers.add(this._fileAppenderChangeTopic);
    }

    lazy.AsyncShutdown.profileBeforeChange.addBlocker(
      "SessionLogManager: finalize and flush any logs to disk",
      () => {
        return this.stop();
      }
    );
  }

  get isDebug() {
    return this.level >= Log.Level.Debug;
  }

  getLogFilename(reasonPrefix = "success") {
    if (!this.#startupTime) {
      this.#startupTime = Services.startup.getStartupInfo().main.getTime();
    }
    // For session restore, we want to append to a single success and error log file for each startup
    return super.getLogFilename(reasonPrefix, this.#startupTime);
  }

  async stop() {
    if (this.#observers.has("sessionstore-windows-restored")) {
      Services.obs.removeObserver(this, "sessionstore-windows-restored");
      this.#observers.delete("sessionstore-windows-restored");
      this.#isStartingUp = false;
    }
    if (
      this._fileAppenderChangeTopic &&
      this.#observers.has(this._fileAppenderChangeTopic)
    ) {
      Services.obs.removeObserver(this, this._fileAppenderChangeTopic);
      this.#observers.delete(this._fileAppenderChangeTopic);
    }
    await this.requestLogFlush(true);
    this.finalize();
  }

  observe(subject, topic, _) {
    switch (topic) {
      case "sessionstore-windows-restored":
        // this represents the moment session restore is nominally complete
        // and is a good time to ensure any log messages are flushed to disk
        Services.obs.removeObserver(this, "sessionstore-windows-restored");
        this.#observers.delete("sessionstore-windows-restored");
        this.requestLogFlush();
        this.#isStartingUp = false;
        break;
      case this._fileAppenderChangeTopic: {
        let shouldFlush = false;
        const msSinceLastFlush = Date.now() - this._fileAppender.lastFlushTime;

        if (this._fileAppender.sawError) {
          shouldFlush = true;
        } else if (
          !this.#isStartingUp &&
          msSinceLastFlush / 1000 >= lazy.logFlushIntervalSeconds
        ) {
          // we'll flush when initial startup is complete so ignore appends until then
          shouldFlush = true;
        }
        if (shouldFlush) {
          this.requestLogFlush();
        }
        break;
      }
    }
  }

  async requestLogFlush(immediate = false) {
    if (this.#idleCallbackId && !immediate) {
      return;
    }
    if (this.#idleCallbackId) {
      lazy.cancelIdleCallback(this.#idleCallbackId);
      this.#idleCallbackId = null;
    }
    if (!immediate) {
      await new Promise(resolve => {
        this.#idleCallbackId = lazy.requestIdleCallback(resolve);
      });
      this.#idleCallbackId = null;
    }
    await this.resetFileLog();
  }
}

export const logManager = new SessionLogManager({
  prefRoot: "browser.sessionstore.",
  logNames: loggerNames,
  logFilePrefix: "sessionrestore",
  logFileSubDirectoryEntries: ["sessionstore-logs"],
  testTopicPrefix: "sessionrestore:log-manager:",
  fileAppenderChangeTopic: "sessionrestore-log-file-append",
  overwriteFileOnFlush: false,
});
