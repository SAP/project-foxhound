/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { GeckoViewUtils } from "resource://gre/modules/GeckoViewUtils.sys.mjs";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  EventDispatcher: "resource://gre/modules/Messaging.sys.mjs",
});

const { PREF_STRING, PREF_BOOL, PREF_INT } = Ci.nsIPrefBranch;
const { debug, warn } = GeckoViewUtils.initLogging("GeckoViewPreferences");

/**
 * Make TS definitions available.
 *
 * @typedef {import(".").GeckoPreference} GeckoPreference
 */

export const GeckoViewPreferences = {
  /* eslint-disable complexity */
  onEvent(aEvent, aData, aCallback) {
    debug`onEvent ${aEvent} ${aData}`;

    switch (aEvent) {
      case "GeckoView:Preferences:GetPref": {
        aCallback.onSuccess({
          prefs: aData.prefs.map(pref => this.getPreference(pref)),
        });
        return;
      }
      case "GeckoView:Preferences:SetPref": {
        aCallback.onSuccess({
          prefs: aData.prefs.map(pref => ({
            pref: pref.pref,
            isSet: this.setPreference(
              pref.pref,
              pref.type,
              pref.value,
              pref.branch
            ),
          })),
        });
        return;
      }
      case "GeckoView:Preferences:ClearPref": {
        Services.prefs.clearUserPref(aData.pref);
        aCallback.onSuccess();
        break;
      }
      case "GeckoView:Preferences:RegisterObserver": {
        for (const pref of aData.prefs) {
          Services.prefs.addObserver(pref, this);
        }
        aCallback.onSuccess();
        break;
      }
      case "GeckoView:Preferences:UnregisterObserver": {
        for (const pref of aData.prefs) {
          Services.prefs.removeObserver(pref, this);
        }
        aCallback.onSuccess();
        break;
      }
    }
  },

  /**
   * Gets the preference value from a specific branch given the type.
   *
   * @param {nsIPrefBranch} branch - The object representing the requested branch.
   * @param {long} type - The nsIPrefBranch type of preference. (e.g. PREF_STRING)
   * @param {string} prefName - The name of the preference. (e.g. "some.preference.item")
  //  * @return {string | boolean | number | null } Preference value.
   */
  readBranch(branch, type, prefName) {
    switch (type) {
      case PREF_STRING:
        return branch.getStringPref(prefName);
      case PREF_BOOL:
        return branch.getBoolPref(prefName);
      case PREF_INT:
        return branch.getIntPref(prefName);
      default:
        warn`Attempted to get a preference that doesn't conform to a known type.`;
        return null;
    }
  },
  /**
   * Gets the Gecko preference and associated information.
   *
   * @param {string} prefName - The name of the preference. (e.g. "some.preference.item")
   * @return {GeckoPreference} Information about the preference.
   */
  getPreference(prefName) {
    let pref = {
      pref: prefName,
      type: Services.prefs.getPrefType(prefName),
      defaultValue: null,
      userValue: null,
    };

    if (Services.prefs.prefHasDefaultValue(prefName)) {
      pref.defaultValue = this.readBranch(
        Services.prefs.getDefaultBranch(null),
        pref.type,
        prefName
      );
    }
    if (Services.prefs.prefHasUserValue(prefName)) {
      pref.userValue = this.readBranch(Services.prefs, pref.type, prefName);
    }
    return pref;
  },

  /**
   * Sets the Gecko preference with the associated information.
   *
   * @param {string} pref - The name of the preference. (e.g. "some.preference.item")
   * @param {long} type - The nsIPrefBranch type of preference. (e.g. PREF_STRING)
   * @param {string | integer | boolean} value - The value of the preference. (e.g. "hello-world")
   * @param {"user" | "default"} setBranch - The branch to operate on.
   * @return {boolean} Will return true if the preference set as requested or else false.
   */
  setPreference(pref, type, value, setBranch) {
    const branch =
      setBranch == "user"
        ? Services.prefs
        : Services.prefs.getDefaultBranch(null);
    try {
      switch (type) {
        case PREF_STRING:
          branch.setStringPref(pref, value);
          return true;

        case PREF_BOOL:
          branch.setBoolPref(pref, value);
          return true;

        case PREF_INT:
          branch.setIntPref(pref, value);
          return true;

        default:
          warn`Attempted to set against an unknown type of: ${type}`;
          return false;
      }
    } catch (e) {
      warn`There was an issue with the preference: ${e}`;
      return false;
    }
  },

  /** nsIObserver */
  observe(subject, topic, data) {
    if (topic == "nsPref:changed") {
      lazy.EventDispatcher.instance.sendRequest({
        type: "GeckoView:GeckoPreferences:Change",
        data: this.getPreference(data),
      });
    }
  },

  /** nsISupports */
  QueryInterface: ChromeUtils.generateQI(["nsIObserver"]),
};
