/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  SpecialMessageActions:
    "resource://messaging-system/lib/SpecialMessageActions.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "fxAccounts", () => {
  return ChromeUtils.importESModule(
    "resource://gre/modules/FxAccounts.sys.mjs"
  ).getFxAccountsSingleton();
});

ChromeUtils.defineLazyGetter(lazy, "log", function () {
  return console.createInstance({
    prefix: "AIWindowAccountAuth",
    maxLogLevelPref: Services.prefs.getBoolPref(
      "browser.smartwindow.log",
      false
    )
      ? "Debug"
      : "Warn",
  });
});

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "hasAIWindowToSConsent",
  "browser.smartwindow.tos.consentTime",
  0
);

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "hasFirstrunCompleted",
  "browser.smartwindow.firstrun.hasCompleted",
  false
);

export const AIWindowAccountAuth = {
  get hasToSConsent() {
    return !!lazy.hasAIWindowToSConsent;
  },

  set hasToSConsent(value) {
    const nowSeconds = Math.floor(Date.now() / 1000);

    Services.prefs.setIntPref(
      "browser.smartwindow.tos.consentTime",
      value ? nowSeconds : 0
    );
  },

  async isSignedIn() {
    try {
      const userData = await lazy.fxAccounts.getSignedInUser();
      return !!userData;
    } catch (error) {
      lazy.log.error("Error checking sign-in status:", error);
      return false;
    }
  },

  async canAccessAIWindow() {
    if (!this.hasToSConsent) {
      return false;
    }
    return await this.isSignedIn();
  },

  async promptSignIn(browser) {
    try {
      const data = {
        autoClose: !!lazy.hasFirstrunCompleted,
        entrypoint: "smartwindow",
        extraParams: {
          service: "smartwindow",
        },
      };
      const signedIn = await lazy.SpecialMessageActions.fxaSignInFlow(
        data,
        browser
      );
      if (signedIn) {
        this.hasToSConsent = true;
      }
      return signedIn;
    } catch (error) {
      lazy.log.error("Error prompting sign-in:", error);
      throw error;
    }
  },

  async ensureAIWindowAccess(browser) {
    if (!(await this.canAccessAIWindow())) {
      const signedIn = await this.promptSignIn(browser);
      if (!signedIn) {
        lazy.log.error("User did not sign in successfully.");
        return false;
      }
    }
    return true;
  },
};
