/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { IPPAuthProvider } from "moz-src:///toolkit/components/ipprotection/IPPAuthProvider.sys.mjs";
import { GuardianClient } from "moz-src:///toolkit/components/ipprotection/fxa/GuardianClient.sys.mjs";

const lazy = {};

ChromeUtils.defineLazyGetter(lazy, "fxAccounts", () =>
  ChromeUtils.importESModule(
    "resource://gre/modules/FxAccounts.sys.mjs"
  ).getFxAccountsSingleton()
);
ChromeUtils.defineESModuleGetters(lazy, {
  IPPSignInWatcher:
    "moz-src:///toolkit/components/ipprotection/fxa/IPPSignInWatcher.sys.mjs",
  IPProtectionService:
    "moz-src:///toolkit/components/ipprotection/IPProtectionService.sys.mjs",
  IPPStartupCache:
    "moz-src:///toolkit/components/ipprotection/IPPStartupCache.sys.mjs",
});

/**
 * Base class for FxA-backed IPPAuthProvider implementations.
 * Provides shared OAuth token retrieval, Guardian proxy methods,
 * sign-in watcher access, and entitlement lifecycle management.
 */
export class IPPFxaBaseAuthProvider extends IPPAuthProvider {
  #entitlement = null;
  #signInWatcher = null;
  #guardian = new GuardianClient();

  /**
   * @param {object} [signInWatcher] - Custom sign-in watcher. Defaults to IPPSignInWatcher.
   */
  constructor(signInWatcher = null) {
    super();
    this.#signInWatcher = signInWatcher;
    this.handleEvent = this.#handleEvent.bind(this);
  }

  get guardian() {
    return this.#guardian;
  }

  get signInWatcher() {
    return this.#signInWatcher ?? lazy.IPPSignInWatcher;
  }

  get entitlement() {
    return this.#entitlement;
  }

  /**
   * Updates the stored entitlement and persists it to the startup cache.
   *
   * @param {object|null} entitlement
   */
  _setEntitlement(entitlement) {
    this.#entitlement = entitlement;
    lazy.IPPStartupCache.storeEntitlement(entitlement);
  }

  init() {
    this.#entitlement = lazy.IPPStartupCache.entitlement;
    this.signInWatcher.addEventListener(
      "IPPSignInWatcher:StateChanged",
      this.handleEvent
    );
  }

  initOnStartupCompleted() {
    if (!this.signInWatcher.isSignedIn) {
      return;
    }
    this.updateEntitlement();
  }

  uninit() {
    this.signInWatcher.removeEventListener(
      "IPPSignInWatcher:StateChanged",
      this.handleEvent
    );
    this.#entitlement = null;
  }

  #handleEvent() {
    if (!this.signInWatcher.isSignedIn) {
      this._setEntitlement(null);
      lazy.IPProtectionService.updateState();
      return;
    }
    // Force rechecking the entitlement when sign-in state changes.
    this.updateEntitlement(true);
  }

  // eslint-disable-next-line no-unused-vars
  updateEntitlement(forceRefetch = false) {}

  async getEntitlement() {
    try {
      using tokenHandle = await this.getToken();
      const { status, entitlement, error } =
        await this.guardian.fetchUserInfo(tokenHandle);
      if (error || status != 200) {
        return { error: error || `Status: ${status}` };
      }
      return { entitlement: entitlement ?? null };
    } catch (error) {
      return { error: error.message };
    }
  }

  get hasUpgraded() {
    return this.entitlement?.subscribed ?? false;
  }

  get maxBytes() {
    return this.entitlement?.maxBytes ?? null;
  }

  get limitedBandwidth() {
    return this.entitlement?.limitedBandwidth ?? true;
  }

  /**
   * Retrieves an FxA OAuth token and returns a disposable handle that revokes
   * it on disposal.
   *
   * @param {AbortSignal} [abortSignal]
   * @returns {Promise<{token: string} & Disposable>}
   */
  async getToken(abortSignal = null) {
    let tasks = [
      lazy.fxAccounts.getOAuthToken({
        scope: ["profile", "https://identity.mozilla.com/apps/vpn"],
      }),
    ];
    if (abortSignal) {
      abortSignal.throwIfAborted();
      tasks.push(
        new Promise((_, rej) => {
          abortSignal?.addEventListener("abort", rej, { once: true });
        })
      );
    }
    const token = await Promise.race(tasks);
    if (!token) {
      return null;
    }
    return {
      token,
      [Symbol.dispose]: () => {
        lazy.fxAccounts.removeCachedOAuthToken({ token });
      },
    };
  }

  async fetchProxyPass(abortSignal = null) {
    using tokenHandle = await this.getToken(abortSignal);
    return await this.#guardian.fetchProxyPass(tokenHandle, abortSignal);
  }

  async fetchProxyUsage(abortSignal = null) {
    using tokenHandle = await this.getToken(abortSignal);
    return await this.#guardian.fetchProxyUsage(tokenHandle, abortSignal);
  }

  get excludedUrlPrefs() {
    return [
      "identity.fxaccounts.remote.profile.uri",
      "identity.fxaccounts.auth.uri",
    ];
  }
}
