/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { AIFeature } from "chrome://global/content/ml/AIFeature.sys.mjs";
import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

/**
 * @typedef {object} Lazy
 * @property {typeof console} console
 * @property {typeof import("chrome://global/content/translations/TranslationsUtils.mjs").TranslationsUtils} TranslationsUtils
 * @property {typeof import("chrome://global/content/ml/EngineProcess.sys.mjs").EngineProcess} EngineProcess
 * @property {typeof import("chrome://global/content/translations/TranslationsTelemetry.sys.mjs").TranslationsTelemetry} TranslationsTelemetry
 * @property {boolean} translationsEnabledPref
 */

/** @type {Lazy} */
const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  TranslationsUtils:
    "chrome://global/content/translations/TranslationsUtils.mjs",
  EngineProcess: "chrome://global/content/ml/EngineProcess.sys.mjs",
  TranslationsTelemetry:
    "chrome://global/content/translations/TranslationsTelemetry.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "console", () => {
  return console.createInstance({
    maxLogLevelPref: "browser.translations.logLevel",
    prefix: "Translations",
  });
});

const AI_CONTROL_TRANSLATIONS_PREF = "browser.ai.control.translations";
const TRANSLATIONS_ENABLE_PREF = "browser.translations.enable";

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "translationsEnabledPref",
  TRANSLATIONS_ENABLE_PREF,
  false
);

/**
 * AIFeature implementation for translations.
 */
export class TranslationsFeature extends AIFeature {
  /**
   * Feature identifier for translations.
   *
   * @returns {string}
   */
  static get id() {
    return "translations";
  }

  /**
   * Enables translations via preferences.
   *
   * @returns {Promise<void>}
   */
  static async enable() {
    if (TranslationsFeature.isManagedByPolicy) {
      throw new Error(
        "Cannot enable Translations: controlled by enterprise policy"
      );
    }

    Services.prefs.setStringPref(AI_CONTROL_TRANSLATIONS_PREF, "enabled");
    Services.prefs.setBoolPref(TRANSLATIONS_ENABLE_PREF, true);
    lazy.TranslationsTelemetry.onFeatureEnable();
  }

  /**
   * Disables translations via preferences and removes artifacts.
   *
   * @returns {Promise<void>}
   */
  static async disable() {
    if (TranslationsFeature.isManagedByPolicy) {
      throw new Error(
        "Cannot disable Translations: controlled by enterprise policy"
      );
    }

    Services.prefs.setStringPref(AI_CONTROL_TRANSLATIONS_PREF, "blocked");
    Services.prefs.setBoolPref(TRANSLATIONS_ENABLE_PREF, false);

    await Promise.allSettled([
      lazy.EngineProcess.destroyTranslationsEngine(),
      TranslationsFeature.#deleteAllArtifacts(),
    ]);
    lazy.TranslationsTelemetry.onFeatureDisable();
  }

  /**
   * Resets translations preferences and removes artifacts.
   *
   * @returns {Promise<void>}
   */
  static async reset() {
    if (TranslationsFeature.isManagedByPolicy) {
      throw new Error(
        "Cannot reset Translations: controlled by enterprise policy"
      );
    }

    Services.prefs.clearUserPref(AI_CONTROL_TRANSLATIONS_PREF);
    Services.prefs.clearUserPref(TRANSLATIONS_ENABLE_PREF);

    await Promise.allSettled([
      lazy.EngineProcess.destroyTranslationsEngine(),
      TranslationsFeature.#deleteAllArtifacts(),
    ]);
    lazy.TranslationsTelemetry.onFeatureReset();
  }

  /**
   * Returns true if the Translations feature is enable, otherwise false.
   *
   * @returns {boolean}
   */
  static get isEnabled() {
    return TranslationsFeature.isAllowed && lazy.translationsEnabledPref;
  }

  /**
   * Returns true if the Translations feature is allowed on this system, always true.
   *
   * @returns {boolean}
   */
  static get isAllowed() {
    return true;
  }

  /**
   * Returns true if the Translations feature is blocked, otherwise false.
   *
   * @returns {boolean}
   */
  static get isBlocked() {
    // This could check the browser.ai.control.default and .translations prefs
    // but since the UI is currently shown/hidden based on the
    // browser.translations.enable pref it just checks that.
    return !lazy.translationsEnabledPref;
  }

  /**
   * Returns true if the enabled state of the Translations feature is already
   * managed by an enterprise policy and is therefore immutable, otherwise false.
   *
   * @returns {boolean}
   */
  static get isManagedByPolicy() {
    return (
      Services.prefs.prefIsLocked(TRANSLATIONS_ENABLE_PREF) ||
      Services.prefs.prefIsLocked(AI_CONTROL_TRANSLATIONS_PREF)
    );
  }

  /**
   * Deletes translations artifacts.
   *
   * @returns {Promise<void>}
   */
  static async #deleteAllArtifacts() {
    try {
      await lazy.TranslationsUtils.deleteAllLanguageFiles();
    } catch (error) {
      lazy.console.error(
        "Failed to delete Translations language files.",
        error
      );
    }
  }
}
