/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  IPPEnrollAndEntitleManager:
    "moz-src:///browser/components/ipprotection/IPPEnrollAndEntitleManager.sys.mjs",
  IPPChannelFilter:
    "moz-src:///browser/components/ipprotection/IPPChannelFilter.sys.mjs",
  IPPNetworkUtils:
    "moz-src:///browser/components/ipprotection/IPPNetworkUtils.sys.mjs",
  IPPNetworkErrorObserver:
    "moz-src:///browser/components/ipprotection/IPPNetworkErrorObserver.sys.mjs",
  IPProtectionServerlist:
    "moz-src:///browser/components/ipprotection/IPProtectionServerlist.sys.mjs",
  IPProtectionService:
    "moz-src:///browser/components/ipprotection/IPProtectionService.sys.mjs",
  IPProtectionStates:
    "moz-src:///browser/components/ipprotection/IPProtectionService.sys.mjs",
  IPPStartupCache:
    "moz-src:///browser/components/ipprotection/IPPStartupCache.sys.mjs",
});

ChromeUtils.defineLazyGetter(
  lazy,
  "setTimeout",
  () =>
    ChromeUtils.importESModule("resource://gre/modules/Timer.sys.mjs")
      .setTimeout
);
ChromeUtils.defineLazyGetter(
  lazy,
  "clearTimeout",
  () =>
    ChromeUtils.importESModule("resource://gre/modules/Timer.sys.mjs")
      .clearTimeout
);

import { ERRORS } from "chrome://browser/content/ipprotection/ipprotection-constants.mjs";

const LOG_PREF = "browser.ipProtection.log";

ChromeUtils.defineLazyGetter(lazy, "logConsole", function () {
  return console.createInstance({
    prefix: "IPPProxyManager",
    maxLogLevel: Services.prefs.getBoolPref(LOG_PREF, false) ? "Debug" : "Warn",
  });
});

/**
 * A Type containing the states of the IPPProxyManager.
 *
 * @typedef {"not-ready" | "ready" | "activating" | "active" | "error" | "paused"} IPPProxyState
 * An Object containing instances of the IPPProxyState
 * @typedef {object} IPPProxyStates
 *
 * @property {string} NOT_READY
 *  The proxy is not ready because the main state machine is not in the READY state.
 * @property {string} READY
 *  The proxy is ready to be activated.
 * @property {string} ACTIVE
 *  The proxy is active.
 * @property {string} ERROR
 *  An error occurred while the proxy was active.
 * @property {string} PAUSED
 *  The VPN is paused i.e when the bandwidth limit is reached.
 *
 * Note: If you update this list of states, make sure to update the
 * corresponding documentation in the `docs` folder as well.
 */
export const IPPProxyStates = Object.freeze({
  NOT_READY: "not-ready",
  READY: "ready",
  ACTIVATING: "activating",
  ACTIVE: "active",
  ERROR: "error",
  PAUSED: "paused",
});

/**
 * Schedules a callback to be triggered at a specific timepoint.
 *
 * Allows to schedule callbacks further in the future than setTimeout.
 *
 * @param {Function} callback  - the callback to trigger when the timepoint is reached
 * @param {Temporal.Instant} timepoint - the time to trigger the callback
 * @param {AbortSignal} abortSignal - signal to cancel the scheduled callback
 * @param {object} imports - dependencies for this function, mainly for testing
 */
export async function scheduleCallback(
  callback,
  timepoint,
  abortSignal,
  imports = lazy
) {
  const getNow = imports.getNow || (() => Temporal.Now.instant());
  while (getNow().until(timepoint).total("milliseconds") > 0) {
    const msUntilTrigger = getNow().until(timepoint).total("milliseconds");
    // clamp the timeout to the max allowed by setTimeout
    const clampedMs = Math.min(msUntilTrigger, 2147483647);
    await new Promise(resolve => {
      const timeoutId = imports.setTimeout(resolve, clampedMs);
      abortSignal.addEventListener(
        "abort",
        () => {
          imports.clearTimeout(timeoutId);
          resolve();
        },
        { once: true }
      );
    });
  }
  if (abortSignal.aborted) {
    return;
  }
  callback();
}

/**
 * Manages the proxy connection for the IPProtectionService.
 */
class IPPProxyManagerSingleton extends EventTarget {
  /** @type {IPPProxyState}  */
  #state = IPPProxyStates.NOT_READY;

  #activatingPromise = null;
  #activationAbortController = null;

  #pass = null;
  /**@type {import("./GuardianClient.sys.mjs").ProxyUsage | null} */
  #usage = null;
  /**@type {import("./IPPChannelFilter.sys.mjs").IPPChannelFilter | null} */
  #connection = null;
  #networkErrorObserver = null;
  // If this is set, we're awaiting a proxy pass rotation
  #rotateProxyPassPromise = null;
  #activatedAt = 0;

  #rotationTimer = 0;
  #usageRefreshAbortController = null;

  constructor() {
    super();

    this.setErrorState = this.#setErrorState.bind(this);
    this.handleProxyErrorEvent = this.#handleProxyErrorEvent.bind(this);
    this.handleEvent = this.#handleEvent.bind(this);
  }

  init() {
    lazy.IPProtectionService.addEventListener(
      "IPProtectionService:StateChanged",
      this.handleEvent
    );

    if (!this.#usage) {
      this.#usage = lazy.IPPStartupCache.usageInfo;
    }
  }

  initOnStartupCompleted() {}

  uninit() {
    lazy.IPProtectionService.removeEventListener(
      "IPProtectionService:StateChanged",
      this.handleEvent
    );

    if (
      this.#state === IPPProxyStates.ACTIVE ||
      this.#state === IPPProxyStates.ACTIVATING
    ) {
      this.stop(false);
    }
    if (this.#usageRefreshAbortController) {
      this.#usageRefreshAbortController.abort();
      this.#usageRefreshAbortController = null;
    }

    this.#pass = null;
    this.#usage = null;
    this.#connection = null;
  }

  /**
   * Checks if the proxy is active and was activated.
   *
   * @returns {Date}
   */
  get activatedAt() {
    return this.#state === IPPProxyStates.ACTIVE && this.#activatedAt;
  }

  get networkErrorObserver() {
    if (!this.#networkErrorObserver) {
      this.#networkErrorObserver = new lazy.IPPNetworkErrorObserver();
      this.#networkErrorObserver.addEventListener(
        "proxy-http-error",
        this.handleProxyErrorEvent
      );
    }
    return this.#networkErrorObserver;
  }

  get active() {
    return this.#connection?.active;
  }

  get isolationKey() {
    return this.#connection?.isolationKey;
  }

  get hasValidProxyPass() {
    return !!this.#pass?.isValid();
  }
  /**
   * Gets the current usage info.
   * This will be updated on every new ProxyPass fetch,
   * changes to the usage will be notified via the "IPPProxyManager:UsageChanged" event.
   *
   * @returns {import("./GuardianClient.sys.mjs").ProxyUsage | null}
   */
  get usageInfo() {
    return this.#usage;
  }

  createChannelFilter() {
    if (!this.#connection) {
      this.#connection = lazy.IPPChannelFilter.create();
      this.#connection.start();
    }
  }

  cancelChannelFilter() {
    if (this.#connection) {
      this.#connection.stop();
      this.#connection = null;
    }
  }

  get state() {
    return this.#state;
  }

  /**
   * Start the proxy if the user is eligible.
   *
   * @param {boolean} userAction
   * True if started by user action, false if system action
   * @param {boolean} inPrivateBrowsing
   * True if started from a private browsing window
   * @returns {Promise<{started: boolean, error?: string}>}
   * Started is true if successfully connected, error contains the error message if it fails.
   */
  async start(userAction = true, inPrivateBrowsing = false) {
    if (this.#state === IPPProxyStates.NOT_READY) {
      throw new Error("This method should not be called when not ready");
    }

    if (this.#state === IPPProxyStates.ACTIVATING) {
      if (!this.#activatingPromise) {
        throw new Error(ERRORS.MISSING_PROMISE);
      }

      return this.#activatingPromise;
    }

    if (
      this.#state === IPPProxyStates.NOT_READY ||
      this.#state === IPPProxyStates.ERROR ||
      this.#state === IPPProxyStates.PAUSED
    ) {
      return { started: false };
    }

    this.#activationAbortController = new AbortController();
    const abortSignal = this.#activationAbortController.signal;

    // Abort the activation if it takes more than 30 seconds, or if the user cancels it.
    lazy.setTimeout(
      () => {
        this.#activationAbortController?.abort(ERRORS.TIMEOUT);
      },
      Temporal.Duration.from({ seconds: 30 }).total("milliseconds")
    );

    this.#setState(IPPProxyStates.ACTIVATING);

    const { promise: abortPromise, reject } = Promise.withResolvers();
    abortSignal.addEventListener(
      "abort",
      () => {
        reject(abortSignal.reason);
      },
      { once: true }
    );

    this.#activatingPromise = Promise.race([
      this.#startInternal(abortSignal),
      abortPromise,
    ])
      .then(
        started => {
          if (
            this.#state === IPPProxyStates.ERROR ||
            this.#state === IPPProxyStates.PAUSED
          ) {
            return { started: false };
          }
          // Proxy failed to start but no error was given.
          if (!started) {
            this.updateState();
            return { started: false };
          }
          this.#setState(IPPProxyStates.ACTIVE);
          Glean.ipprotection.started.record({
            userAction,
            inPrivateBrowsing,
          });
          return { started: true };
        },
        error => {
          this.#activationAbortController = null;
          this.cancelChannelFilter();
          this.#setErrorState(error);
          return { started: false, error };
        }
      )
      .finally(() => {
        this.#activatingPromise = null;
        this.#activationAbortController = null;
      });
    return this.#activatingPromise;
  }

  async #startInternal(abortSignal) {
    // Check network status before attempting connection
    if (lazy.IPPNetworkUtils.isOffline) {
      throw ERRORS.NETWORK;
    }

    await lazy.IPProtectionServerlist.maybeFetchList();

    let enrollAndEntitleData;
    if (lazy.IPPEnrollAndEntitleManager.isEnrolling) {
      enrollAndEntitleData =
        await lazy.IPPEnrollAndEntitleManager.waitForEnrollment();
    }
    // If the current account can not be enrolled or is not entitled,
    // the starting the proxy should fail.
    if (!lazy.IPPEnrollAndEntitleManager.isEnrolledAndEntitled) {
      throw enrollAndEntitleData?.error || ERRORS.GENERIC;
    }

    // Check if we aborted before starting the channel filter.
    if (abortSignal?.aborted) {
      return false;
    }

    this.createChannelFilter();

    // If the current proxy pass is valid, no need to re-authenticate.
    // Throws an error if the proxy pass is not available.
    if (this.#pass == null || this.#pass.shouldRotate()) {
      const { pass, usage, error } = await this.#getPassAndUsage(abortSignal);
      if (usage) {
        this.#setUsage(usage);
        if (this.#usage.remaining <= 0) {
          this.#setPausedState();
          return false;
        }
      }

      if (error || !pass) {
        throw ERRORS.PASS_UNAVAILABLE;
      }
      this.#pass = pass;
    }
    this.#schedulePassRotation(this.#pass);

    const location = lazy.IPProtectionServerlist.getDefaultLocation();
    const server = lazy.IPProtectionServerlist.selectServer(location?.city);
    if (!server) {
      throw ERRORS.SERVER_NOT_FOUND;
    }

    lazy.logConsole.debug("Server:", server?.hostname);

    this.#connection.initialize(this.#pass.asBearerToken(), server);

    this.networkErrorObserver.start();
    this.networkErrorObserver.addIsolationKey(this.#connection.isolationKey);

    lazy.logConsole.info("Started");

    if (!!this.#connection?.active && !!this.#connection?.proxyInfo) {
      this.#activatedAt = ChromeUtils.now();
      return true;
    }

    return false;
  }

  /**
   * Stops the proxy.
   *
   * @param {boolean} userAction
   * True if started by user action, false if system action
   */
  async stop(userAction = true) {
    if (this.#state === IPPProxyStates.ACTIVATING) {
      if (!this.#activatingPromise) {
        throw new Error(ERRORS.MISSING_PROMISE);
      }
      if (!this.#activationAbortController) {
        throw new Error(ERRORS.MISSING_ABORT);
      }
      this.#activationAbortController?.abort();
      await this.#activatingPromise.then(() => this.stop(userAction));
      return;
    }

    if (
      this.#state !== IPPProxyStates.PAUSED &&
      this.#state !== IPPProxyStates.ACTIVE &&
      this.#state !== IPPProxyStates.ERROR
    ) {
      return;
    }

    if (this.#connection) {
      this.cancelChannelFilter();

      lazy.clearTimeout(this.#rotationTimer);
      this.#rotationTimer = 0;

      this.networkErrorObserver.stop();
    }

    lazy.logConsole.info("Stopped");

    const sessionLength = this.#activatedAt
      ? ChromeUtils.now() - this.#activatedAt
      : 0;

    Glean.ipprotection.stopped.record({
      userAction,
      duration: String(sessionLength),
    });
    this.updateState();
    if (userAction && this.#state !== IPPProxyStates.PAUSED) {
      this.refreshUsage();
    }
  }

  /**
   * Stop any connections and reset the pass and usage if the user has changed.
   */
  async reset() {
    this.#pass = null;
    this.#usage = null;
    if (this.#usageRefreshAbortController) {
      this.#usageRefreshAbortController.abort();
      this.#usageRefreshAbortController = null;
    }
    lazy.IPPStartupCache.storeUsageInfo(null);
    if (
      this.#state === IPPProxyStates.ACTIVE ||
      this.#state === IPPProxyStates.ACTIVATING ||
      this.#state === IPPProxyStates.PAUSED ||
      this.#state === IPPProxyStates.ERROR
    ) {
      // Stop as a user action to reset userEnabled and record the correct metrics.
      await this.stop(true /* userAction */);
    }
  }

  /**
   * Move to the PAUSED state and close the connection,
   * but leave the channel filter in place if state was ACTIVE.
   *
   * Usage refresh will still be attempted at the reset time.
   */
  #setPausedState() {
    const wasActive = this.#state === IPPProxyStates.ACTIVE;
    this.#pass = null;
    lazy.clearTimeout(this.#rotationTimer);
    this.#rotationTimer = 0;

    if (wasActive) {
      this.#connection?.uninitialize();
    } else {
      this.#connection?.stop();
    }

    Glean.ipprotection.paused.record({
      wasActive,
    });

    this.#setState(IPPProxyStates.PAUSED);
  }

  async #handleEvent(_event) {
    if (lazy.IPProtectionService.state !== lazy.IPProtectionStates.READY) {
      await this.reset();
    }
    this.updateState();
  }

  /**
   * Fetches a new ProxyPass.
   * Throws an error on failures.
   *
   * @param {AbortSignal} [abortSignal=null] - a signal to indicate the fetch should be aborted, will then throw an AbortError
   * @returns {Promise<{pass: ProxyPass | null, usage: ProxyUsage | null, error: string | null}>}
   */
  async #getPassAndUsage(abortSignal = null) {
    let { status, error, pass, usage } =
      await lazy.IPProtectionService.guardian.fetchProxyPass(abortSignal);
    lazy.logConsole.debug("ProxyPass:", {
      status,
      valid: pass?.isValid(),
      error,
    });

    // Handle quota exceeded as a special case - return null pass with usage
    if (status === 429 && error === "quota_exceeded") {
      lazy.logConsole.info("Quota exceeded", {
        usage: usage ? `${usage.remaining} / ${usage.max}` : "unknown",
      });
      return { pass: null, usage, error };
    }

    // All other error cases
    if (error || status != 200) {
      return { error: error || `Status: ${status}` };
    }

    return { pass, usage };
  }

  /**
   * Given a ProxyPass, sets a timer and triggers a rotation when it's about to expire.
   *
   * @param {*} pass
   */
  #schedulePassRotation(pass) {
    if (this.#rotationTimer) {
      lazy.clearTimeout(this.#rotationTimer);
      this.#rotationTimer = 0;
    }

    const now = Temporal.Now.instant();
    const rotationTimePoint = pass.rotationTimePoint;
    let msUntilRotation = now.until(rotationTimePoint).total("milliseconds");
    if (msUntilRotation <= 0) {
      msUntilRotation = 0;
    }

    lazy.logConsole.debug(
      `ProxyPass will rotate in ${now.until(rotationTimePoint).total("minutes")} minutes`
    );
    this.#rotationTimer = lazy.setTimeout(async () => {
      this.#rotationTimer = 0;
      if (!this.#connection?.active) {
        return;
      }
      lazy.logConsole.debug(`Statrting scheduled ProxyPass rotation`);
      let newPass = await this.rotateProxyPass();
      if (newPass) {
        this.#schedulePassRotation(newPass);
      }
    }, msUntilRotation);
  }

  /**
   * Starts a flow to get a new ProxyPass and replace the current one.
   *
   * @returns {Promise<void|ProxyPass>} - Returns a promise that resolves when the rotation is complete or failed.
   * When it's called again while a rotation is in progress, it will return the existing promise.
   */
  async rotateProxyPass() {
    if (this.#rotateProxyPassPromise) {
      return this.#rotateProxyPassPromise;
    }
    let { promise, resolve } = Promise.withResolvers();
    using scopeGuard = new DisposableStack();
    scopeGuard.defer(() => {
      resolve();
      this.#rotateProxyPassPromise = null;
    });
    this.#rotateProxyPassPromise = promise;
    const { pass, usage, error } = await this.#getPassAndUsage();
    if (usage) {
      this.#setUsage(usage);
      if (this.#usage.remaining <= 0) {
        this.#setPausedState();
        return null;
      }
    }

    if (error) {
      this.#setErrorState(error);
      return null;
    }

    if (!pass) {
      lazy.logConsole.debug("Failed to rotate token!");
      return null;
    }
    // Inject the new token in the current connection
    if (this.#connection?.active) {
      this.#connection.replaceAuthToken(pass.asBearerToken());
      this.networkErrorObserver.addIsolationKey(this.#connection.isolationKey);
    }
    lazy.logConsole.debug("Successfully rotated token!");
    this.#pass = pass;
    resolve(pass);
    return promise;
  }

  /**
   * Refreshes the usage info from the server.
   * Can move the state:
   *  Active -> Paused if the usage is exhausted
   *  Not-Ready -> Ready if the service becomes ready and usage is available
   *
   * Will move the state to PAUSED if no usage is available.
   *
   * @return {Promise<void>}
   */
  async refreshUsage() {
    let newUsage;
    try {
      newUsage = await lazy.IPProtectionService.guardian.fetchProxyUsage();
    } catch (error) {
      lazy.logConsole.error("Error refreshing usage:", error);
    }
    if (!newUsage) {
      lazy.logConsole.debug("Failed to refresh usage info!");
      return;
    }
    this.#setUsage(newUsage);
    this.updateState();
  }

  #handleProxyErrorEvent(event) {
    if (!this.#connection?.active) {
      return null;
    }
    const { isolationKey, level, httpStatus } = event.detail;
    if (isolationKey != this.#connection?.isolationKey) {
      // This error does not concern our current connection.
      // This could be due to an old request after a token refresh.
      return null;
    }

    if (httpStatus !== 401) {
      // Envoy returns a 401 if the token is rejected
      // So for now as we only care about rotating tokens we can exit here.
      return null;
    }

    if (level == "error" || this.#pass?.shouldRotate()) {
      // If this is a visible top-level error force a rotation
      return this.rotateProxyPass();
    }
    return null;
  }

  updateState() {
    // State must remain as error until the connection is stopped.
    if (this.#state === IPPProxyStates.ERROR && this.#connection?.active) {
      this.#setState(IPPProxyStates.ERROR);
      return;
    }

    if (lazy.IPProtectionService.state !== lazy.IPProtectionStates.READY) {
      this.#setState(IPPProxyStates.NOT_READY);
      return;
    }

    if (this.#usage && this.#usage.remaining <= 0) {
      this.#setState(IPPProxyStates.PAUSED);
      return;
    }

    // State must remain active if the connection is active.
    if (this.#connection?.active) {
      this.#setState(IPPProxyStates.ACTIVE);
      return;
    }

    this.#setState(IPPProxyStates.READY);
  }

  /**
   * Helper to update the state after an error.
   *
   * @param {string} error - the error message that occurred.
   */
  #setErrorState(error) {
    if (this.#state === IPPProxyStates.ACTIVE) {
      // If the proxy is active, switch to the error state.
      // Stop will need to be called to move out of the error state.
      this.#setState(IPPProxyStates.ERROR);
    } else {
      // Otherwise, update to the previous state.
      this.updateState();
    }

    lazy.logConsole.error(error);
    Glean.ipprotection.error.record({ source: "ProxyManager" });
  }

  /**
   * @param {import("./GuardianClient.sys.mjs").ProxyUsage } usage
   */
  #setUsage(usage) {
    this.#usage = usage;
    const now = Temporal.Now.instant();
    const daysUntilReset = now.until(usage.reset).total("days");
    lazy.logConsole.debug("ProxyUsage:", {
      usage: `${usage.remaining} / ${usage.max}`,
      resetsIn: `${daysUntilReset.toFixed(1)} days`,
    });
    this.#scheduleUsageCheck(usage);
    this.dispatchEvent(
      new CustomEvent("IPPProxyManager:UsageChanged", {
        bubbles: true,
        composed: true,
        detail: {
          usage,
        },
      })
    );
  }

  #scheduleUsageCheck(usage) {
    if (this.#usageRefreshAbortController) {
      this.#usageRefreshAbortController.abort();
      this.#usageRefreshAbortController = null;
    }
    if (usage.remaining > 0) {
      return;
    }
    this.#usageRefreshAbortController = new AbortController();
    scheduleCallback(
      async () => {
        await this.refreshUsage();
      },
      usage.reset,
      this.#usageRefreshAbortController.signal
    );
  }

  /**
   * @param {IPPProxyState} state
   */
  #setState(state) {
    if (state === this.#state) {
      return;
    }

    this.#state = state;

    this.dispatchEvent(
      new CustomEvent("IPPProxyManager:StateChanged", {
        bubbles: true,
        composed: true,
        detail: {
          state,
        },
      })
    );
  }
}

const IPPProxyManager = new IPPProxyManagerSingleton();

export { IPPProxyManager };
