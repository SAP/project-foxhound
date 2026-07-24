/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * @import { AIFeature } from "chrome://global/content/ml/AIFeature.sys.mjs"
 * @typedef {typeof OnDeviceModelFeatures[keyof typeof OnDeviceModelFeatures]} OnDeviceModelFeaturesEnum
 */

const XPCOMUtils = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
).XPCOMUtils;
const lazy = XPCOMUtils.declareLazy({
  GenAI: "resource:///modules/GenAI.sys.mjs",
  LinkPreview: "moz-src:///browser/components/genai/LinkPreview.sys.mjs",
  PdfJsGuessAltTextFeature: "resource://pdf.js/PdfJsAIFeature.sys.mjs",
  SmartTabGroupingManager:
    "moz-src:///browser/components/tabbrowser/SmartTabGrouping.sys.mjs",
  TranslationsFeature:
    "chrome://global/content/translations/TranslationsFeature.sys.mjs",
});

/**
 * Features that support on-device AI models.
 */
const OnDeviceModelFeatures = Object.freeze({
  TabGroups: "smartTabGroups",
  KeyPoints: "linkPreviewKeyPoints",
  PdfAltText: "pdfjsAltText",
  Translations: "translations",
  SidebarChatbot: "sidebarChatbot",
});

/** @type {Record<OnDeviceModelFeaturesEnum, string[]>} */
const FeaturePrefs = Object.freeze({
  [OnDeviceModelFeatures.PdfAltText]: [
    "pdfjs.enableGuessAltText",
    "pdfjs.enableAltTextModelDownload",
    "pdfjs.enableAltText",
  ],
  [OnDeviceModelFeatures.KeyPoints]: [
    "browser.ml.linkPreview.enabled",
    "browser.ml.linkPreview.optin",
  ],
  [OnDeviceModelFeatures.TabGroups]: [
    "browser.tabs.groups.enabled",
    "browser.tabs.groups.smart.enabled",
    "browser.tabs.groups.smart.userEnabled",
    "browser.tabs.groups.smart.optin",
  ],
  [OnDeviceModelFeatures.Translations]: ["browser.translations.enable"],
  [OnDeviceModelFeatures.SidebarChatbot]: [
    "browser.ml.chat.provider",
    "browser.ml.chat.enabled",
  ],
});

export const OnDeviceModelManager = {
  features: OnDeviceModelFeatures,
  /** @type {Map<OnDeviceModelFeaturesEnum, Set<string>>} */
  prefsByFeature: new Map(),

  init() {
    Services.prefs.addObserver("", this);
    window.addEventListener(
      "unload",
      () => Services.prefs.removeObserver("", this),
      { once: true }
    );

    for (let [feature, prefs] of Object.entries(FeaturePrefs)) {
      this.prefsByFeature.set(
        /** @type {OnDeviceModelFeaturesEnum} */ (feature),
        new Set(prefs)
      );
    }
  },

  /**
   * @param {nsISupports} _
   * @param {string} __
   * @param {string} data
   */
  observe(_, __, data) {
    for (let feature in FeaturePrefs) {
      if (
        this.prefsByFeature
          .get(/** @type {OnDeviceModelFeaturesEnum} */ (feature))
          .has(data)
      ) {
        Services.obs.notifyObservers(
          null,
          "OnDeviceModelManagerChange",
          feature
        );
      }
    }
  },

  /**
   * Get an {@link AIFeature} for a feature id.
   *
   * @param {OnDeviceModelFeaturesEnum} feature
   * @returns {typeof AIFeature}
   */
  getAIFeature(feature) {
    switch (feature) {
      case OnDeviceModelFeatures.KeyPoints:
        // @ts-expect-error: LinkPreview implements more than AIFeature
        return lazy.LinkPreview;
      case OnDeviceModelFeatures.PdfAltText:
        return lazy.PdfJsGuessAltTextFeature;
      case OnDeviceModelFeatures.TabGroups:
        // @ts-expect-error: SmartTabGroupingManager implements more than AIFeature
        return lazy.SmartTabGroupingManager;
      case OnDeviceModelFeatures.Translations:
        return lazy.TranslationsFeature;
      case OnDeviceModelFeatures.SidebarChatbot:
        return lazy.GenAI;
      default:
        throw new Error(`Unknown feature "${feature}"`);
    }
  },

  /**
   * Get the feature pref to store default/available/blocked user selection.
   *
   * @param {OnDeviceModelFeaturesEnum} feature
   */
  getFeaturePref(feature) {
    switch (feature) {
      case OnDeviceModelFeatures.KeyPoints:
        return "browser.ai.control.linkPreviewKeyPoints";
      case OnDeviceModelFeatures.PdfAltText:
        return "browser.ai.control.pdfjsAltText";
      case OnDeviceModelFeatures.TabGroups:
        return "browser.ai.control.smartTabGroups";
      case OnDeviceModelFeatures.Translations:
        return "browser.ai.control.translations";
      case OnDeviceModelFeatures.SidebarChatbot:
        return "browser.ai.control.sidebarChatbot";
      default:
        throw new Error(`Unknown feature "${feature}"`);
    }
  },

  /**
   * Check if a feature is allowed (by policy, locale restrictions, etc).
   *
   * @param {OnDeviceModelFeaturesEnum} feature
   */
  isAllowed(feature) {
    return this.getAIFeature(feature).isAllowed;
  },

  /**
   * Check if a feature is enabled (visible and opted-in).
   *
   * @param {OnDeviceModelFeaturesEnum} feature
   */
  isEnabled(feature) {
    return this.getAIFeature(feature).isEnabled;
  },

  /**
   * Check if a feature is blocked (UI hidden, models removed).
   *
   * @param {OnDeviceModelFeaturesEnum} feature
   */
  isBlocked(feature) {
    return this.getAIFeature(feature).isBlocked;
  },

  /**
   * Check if a feature is managed by enterprise policy.
   *
   * @param {OnDeviceModelFeaturesEnum} feature
   */
  isManagedByPolicy(feature) {
    return this.getAIFeature(feature).isManagedByPolicy;
  },

  /**
   * Reset a feature to its default state.
   *
   * @param {OnDeviceModelFeaturesEnum} feature The feature key to reset.
   */
  async reset(feature) {
    if (this.isManagedByPolicy(feature)) {
      return;
    }
    Services.prefs.clearUserPref(this.getFeaturePref(feature));
    await this.getAIFeature(feature).reset();
  },

  /**
   * Enable a feature (show its UI, parent feature, opt-in).
   *
   * @param {OnDeviceModelFeaturesEnum} feature The feature key to enable.
   */
  async enable(feature) {
    if (this.isManagedByPolicy(feature)) {
      return;
    }
    Services.prefs.setStringPref(this.getFeaturePref(feature), "enabled");
    await this.getAIFeature(feature).enable();
  },

  /**
   * Disable a feature (block it, hide UI, remove models).
   *
   * @param {OnDeviceModelFeaturesEnum} feature The feature key to disable.
   */
  async disable(feature) {
    if (this.isManagedByPolicy(feature)) {
      return;
    }
    Services.prefs.setStringPref(this.getFeaturePref(feature), "blocked");
    await this.getAIFeature(feature).disable();
  },
};

OnDeviceModelManager.init();
