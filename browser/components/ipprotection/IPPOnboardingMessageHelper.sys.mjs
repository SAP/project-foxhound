/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { ONBOARDING_PREF_FLAGS } from "chrome://browser/content/ipprotection/ipprotection-constants.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  IPPProxyManager:
    "moz-src:///browser/components/ipprotection/IPPProxyManager.sys.mjs",
  IPPProxyStates:
    "moz-src:///browser/components/ipprotection/IPPProxyManager.sys.mjs",
});

const ONBOARDING_MESSAGE_MASK_PREF =
  "browser.ipProtection.onboardingMessageMask";
const AUTOSTART_PREF = "browser.ipProtection.autoStartEnabled";
const PERM_NAME = "ipp-vpn";

/**
 * This class handles in-panel continuous onboarding messages, including setting
 * the browser.ipProtection.onboardingMessageMask, a pref that gates messages
 * according to feature (general VPN, autostart, site exceptions) through bit mask
 */
class IPPOnboardingMessageHelper {
  #observingPermChanges = false;
  #autostartPrefObserver = null;

  constructor() {
    this.handleEvent = this.#handleEvent.bind(this);

    // If at least one exception is saved, don't show site exceptions onboarding message
    let savedSites = Services.perms.getAllByTypes([PERM_NAME]);
    if (savedSites.length) {
      this.setOnboardingFlag(ONBOARDING_PREF_FLAGS.EVER_USED_SITE_EXCEPTIONS);
    } else {
      Services.obs.addObserver(this, "perm-changed");
      this.#observingPermChanges = true;
    }

    this.#autostartPrefObserver = () =>
      this.setOnboardingFlag(ONBOARDING_PREF_FLAGS.EVER_TURNED_ON_AUTOSTART);
    Services.prefs.addObserver(AUTOSTART_PREF, this.#autostartPrefObserver);

    let autoStartPref = Services.prefs.getBoolPref(AUTOSTART_PREF, false);
    if (autoStartPref) {
      this.setOnboardingFlag(ONBOARDING_PREF_FLAGS.EVER_TURNED_ON_AUTOSTART);
    }
  }

  init() {
    lazy.IPPProxyManager.addEventListener(
      "IPPProxyManager:StateChanged",
      this.handleEvent
    );
  }

  initOnStartupCompleted() {}

  uninit() {
    if (this.#observingPermChanges) {
      Services.obs.removeObserver(this, "perm-changed");
      this.#observingPermChanges = false;
    }

    if (this.#autostartPrefObserver) {
      Services.prefs.removeObserver(
        AUTOSTART_PREF,
        this.#autostartPrefObserver
      );
      this.#autostartPrefObserver = null;
    }

    lazy.IPPProxyManager.removeEventListener(
      "IPPProxyManager:StateChanged",
      this.handleEvent
    );
  }

  observe(subject, topic, data) {
    if (!subject) {
      return;
    }
    let permission = subject.QueryInterface(Ci.nsIPermission);
    if (
      topic === "perm-changed" &&
      permission.type === PERM_NAME &&
      data === "added"
    ) {
      this.setOnboardingFlag(ONBOARDING_PREF_FLAGS.EVER_USED_SITE_EXCEPTIONS);
    }
  }

  readPrefMask() {
    return Services.prefs.getIntPref(ONBOARDING_MESSAGE_MASK_PREF, 0);
  }

  writeOnboardingTriggerPref(mask) {
    Services.prefs.setIntPref(ONBOARDING_MESSAGE_MASK_PREF, mask);
  }

  setOnboardingFlag(flag) {
    const mask = this.readPrefMask();
    this.writeOnboardingTriggerPref(mask | flag);
  }

  #handleEvent(event) {
    if (
      event.type == "IPPProxyManager:StateChanged" &&
      lazy.IPPProxyManager.state === lazy.IPPProxyStates.ACTIVE
    ) {
      this.setOnboardingFlag(ONBOARDING_PREF_FLAGS.EVER_TURNED_ON_VPN);
    }
  }
}

const IPPOnboardingMessage = new IPPOnboardingMessageHelper();

export { IPPOnboardingMessage };
