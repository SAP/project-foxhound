/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { IPPFxaBaseAuthProvider } from "moz-src:///toolkit/components/ipprotection/fxa/IPPFxaBaseAuthProvider.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  IPProtectionService:
    "moz-src:///toolkit/components/ipprotection/IPProtectionService.sys.mjs",
});

/**
 * FxA implementation of IPPAuthProvider that uses the direct token activation
 * flow by calling Guardian's POST /api/v1/fpn/activate endpoint with the FxA
 * Bearer token.
 */
class IPPFxaActivateAuthProviderSingleton extends IPPFxaBaseAuthProvider {
  #isEnrolling = false;

  get helpers() {
    return [this, this.signInWatcher];
  }

  async updateEntitlement() {
    const { entitlement, error } = await this.getEntitlement();
    if (!error) {
      this._setEntitlement(entitlement ?? null);
    }
    lazy.IPProtectionService.updateState();
  }

  get isReady() {
    return this.signInWatcher.isSignedIn && !!this.entitlement;
  }

  get isEnrolling() {
    return this.#isEnrolling;
  }

  async aboutToStart() {
    return null;
  }

  async checkForUpgrade() {
    using tokenHandle = await this.getToken();
    const { entitlement } = await this.guardian.fetchUserInfo(tokenHandle);
    if (entitlement) {
      this._setEntitlement(entitlement);
      lazy.IPProtectionService.updateState();
      this.dispatchEvent(
        new CustomEvent("IPPAuthProvider:StateChanged", {
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  async enroll() {
    this.#isEnrolling = true;
    this.dispatchEvent(new CustomEvent("IPPAuthProvider:StateChanged"));
    try {
      using tokenHandle = await this.getToken();
      const { ok, entitlement, error } =
        await this.guardian.activate(tokenHandle);
      if (!ok) {
        return { isEnrolledAndEntitled: false, error };
      }
      this._setEntitlement(entitlement ?? null);
      return { isEnrolledAndEntitled: true, error: null };
    } catch (error) {
      return { isEnrolledAndEntitled: false, error: error?.message ?? null };
    } finally {
      this.#isEnrolling = false;
      lazy.IPProtectionService.updateState();
      this.dispatchEvent(new CustomEvent("IPPAuthProvider:StateChanged"));
    }
  }
}

const IPPFxaActivateAuthProvider = new IPPFxaActivateAuthProviderSingleton();

export { IPPFxaActivateAuthProvider, IPPFxaActivateAuthProviderSingleton };
