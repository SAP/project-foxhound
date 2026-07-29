/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { PrivateBrowsingUtils } from "resource://gre/modules/PrivateBrowsingUtils.sys.mjs";
import { IPPEarlyStartupFilter } from "moz-src:///toolkit/components/ipprotection/IPPEarlyStartupFilter.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  IPProtectionServerlist:
    "moz-src:///toolkit/components/ipprotection/IPProtectionServerlist.sys.mjs",
  IPPProxyManager:
    "moz-src:///toolkit/components/ipprotection/IPPProxyManager.sys.mjs",
  IPPProxyStates:
    "moz-src:///toolkit/components/ipprotection/IPPProxyManager.sys.mjs",
  IPProtectionService:
    "moz-src:///toolkit/components/ipprotection/IPProtectionService.sys.mjs",
  IPProtectionStates:
    "moz-src:///toolkit/components/ipprotection/IPProtectionService.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "logConsole", () =>
  console.createInstance({
    prefix: "IPPAlwaysOn",
    maxLogLevel: Services.prefs.getBoolPref("browser.ipProtection.log", false)
      ? "Debug"
      : "Warn",
  })
);

/**
 * Keeps the proxy connection alive on enterprise builds where the
 * AccessConnector policy is active. Unlike IPPAutoStart, this class:
 *
 *  - Recovers from ERROR states by stopping and restarting immediately.
 *  - Restarts immediately when the proxy stops unexpectedly.
 *  - Switches to a new server when the server list is updated.
 *
 * Because this is policy-driven there is no user-facing toggle; the proxy
 * runs whenever the service is ready and the policy is set.
 */
class IPPAlwaysOnSingleton {
  #initialized = false;
  #shouldBeRunning = false;
  #startPending = false;

  constructor() {
    this.handleServiceEvent = this.#handleServiceEvent.bind(this);
    this.handleProxyEvent = this.#handleProxyEvent.bind(this);
    this.handleServerlistEvent = this.#handleServerlistEvent.bind(this);
  }

  get alwaysOnEnabled() {
    return !!Services.policies.getActivePolicies()?.AccessConnector;
  }

  init() {
    if (this.#initialized || !this.alwaysOnEnabled) {
      lazy.logConsole.debug(
        "init() skipped — initialized:",
        this.#initialized,
        "alwaysOnEnabled:",
        this.alwaysOnEnabled
      );
      return;
    }
    lazy.logConsole.info("Initialized");
    this.#initialized = true;

    lazy.IPProtectionService.addEventListener(
      "IPProtectionService:StateChanged",
      this.handleServiceEvent
    );
    lazy.IPPProxyManager.addEventListener(
      "IPPProxyManager:StateChanged",
      this.handleProxyEvent
    );
    lazy.IPProtectionServerlist.addEventListener(
      "IPProtectionServerlist:ListChanged",
      this.handleServerlistEvent
    );
  }

  initOnStartupCompleted() {}

  uninit() {
    if (!this.#initialized) {
      return;
    }
    this.#initialized = false;
    this.#shouldBeRunning = false;
    this.#startPending = false;

    lazy.IPProtectionService.removeEventListener(
      "IPProtectionService:StateChanged",
      this.handleServiceEvent
    );
    lazy.IPPProxyManager.removeEventListener(
      "IPPProxyManager:StateChanged",
      this.handleProxyEvent
    );
    lazy.IPProtectionServerlist.removeEventListener(
      "IPProtectionServerlist:ListChanged",
      this.handleServerlistEvent
    );
  }

  #tryStart() {
    if (this.#startPending) {
      return;
    }
    if (
      lazy.IPPProxyManager.state === lazy.IPPProxyStates.ACTIVE &&
      lazy.IPPProxyManager.channelFilter()?.proxyInfo
    ) {
      return;
    }
    if (!lazy.IPProtectionServerlist.hasList) {
      return;
    }
    lazy.logConsole.info("Starting proxy");
    this.#startPending = true;
    lazy.IPPProxyManager.start(
      false,
      PrivateBrowsingUtils.permanentPrivateBrowsing
    );
  }

  #handleServiceEvent() {
    const serviceState = lazy.IPProtectionService.state;
    switch (serviceState) {
      case lazy.IPProtectionStates.UNINITIALIZED:
      case lazy.IPProtectionStates.UNAVAILABLE:
      case lazy.IPProtectionStates.UNAUTHENTICATED:
        this.#shouldBeRunning = false;
        this.#startPending = false;
        break;

      case lazy.IPProtectionStates.READY:
        this.#shouldBeRunning = true;
        this.#tryStart();
        break;

      default:
        break;
    }
  }

  #handleProxyEvent() {
    // alwaysOnEnabled flips to false synchronously when the policy is removed,
    // before uninit() runs. Bail out so we don't restart in response to the
    // ACTIVE->READY transition produced by teardown.
    if (!this.#shouldBeRunning || !this.alwaysOnEnabled) {
      return;
    }

    switch (lazy.IPPProxyManager.state) {
      case lazy.IPPProxyStates.ACTIVE:
        this.#startPending = false;
        break;

      case lazy.IPPProxyStates.READY:
        this.#startPending = false;
        this.#tryStart();
        break;

      case lazy.IPPProxyStates.ERROR:
        this.#startPending = false;
        lazy.IPPProxyManager.stop(false).then(
          () => {
            if (this.#shouldBeRunning && this.alwaysOnEnabled) {
              this.#tryStart();
            }
          },
          e => lazy.logConsole.error("Failed to stop proxy:", e)
        );
        break;

      default:
        break;
    }
  }

  #handleServerlistEvent() {
    if (!this.alwaysOnEnabled) {
      return;
    }
    if (!lazy.IPProtectionServerlist.hasList) {
      // Serverlist cleared (e.g. policy removed); stop any active connection.
      const state = lazy.IPPProxyManager.state;
      if (
        state === lazy.IPPProxyStates.ACTIVE ||
        state === lazy.IPPProxyStates.ERROR
      ) {
        lazy.IPPProxyManager.stop(false);
      }
      return;
    }
    const state = lazy.IPPProxyManager.state;
    switch (state) {
      case lazy.IPPProxyStates.ACTIVE: {
        // Hot-swap without dropping the connection.
        lazy.logConsole.debug("Switching to updated server");
        const { error } = lazy.IPPProxyManager.switch();
        if (error) {
          lazy.IPPProxyManager.stop(false).then(
            () => {
              if (this.#shouldBeRunning && this.alwaysOnEnabled) {
                this.#tryStart();
              }
            },
            e => lazy.logConsole.error("Failed to stop proxy:", e)
          );
        }
        break;
      }

      case lazy.IPPProxyStates.ERROR:
        // A fresh server list may resolve the error; stop and restart immediately.
        if (this.#shouldBeRunning) {
          lazy.IPPProxyManager.stop(false).then(
            () => {
              if (this.#shouldBeRunning && this.alwaysOnEnabled) {
                this.#tryStart();
              }
            },
            e => lazy.logConsole.error("Failed to stop proxy:", e)
          );
        }
        break;

      case lazy.IPPProxyStates.READY:
        if (this.#shouldBeRunning && !this.#startPending) {
          this.#tryStart();
        }
        break;

      default:
        break;
    }
  }
}

const IPPAlwaysOn = new IPPAlwaysOnSingleton();

const IPPAlwaysOnHelpers = [
  IPPAlwaysOn,
  new IPPEarlyStartupFilter(() => IPPAlwaysOn.alwaysOnEnabled),
];

export { IPPAlwaysOnHelpers, IPPAlwaysOnSingleton };
