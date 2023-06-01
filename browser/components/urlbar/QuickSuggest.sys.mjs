/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  UrlbarPrefs: "resource:///modules/UrlbarPrefs.sys.mjs",
  UrlbarUtils: "resource:///modules/UrlbarUtils.sys.mjs",
});

XPCOMUtils.defineLazyModuleGetters(lazy, {
  BrowserWindowTracker: "resource:///modules/BrowserWindowTracker.jsm",
  NimbusFeatures: "resource://nimbus/ExperimentAPI.jsm",
});

// Quick suggest features. On init, QuickSuggest creates an instance of each and
// keeps it in the `#features` map. See `BaseFeature`.
const FEATURES = {
  BlockedSuggestions:
    "resource:///modules/urlbar/private/BlockedSuggestions.sys.mjs",
  ImpressionCaps: "resource:///modules/urlbar/private/ImpressionCaps.sys.mjs",
  RemoteSettingsClient:
    "resource:///modules/urlbar/private/RemoteSettingsClient.sys.mjs",
  Weather: "resource:///modules/urlbar/private/Weather.sys.mjs",
};

const TIMESTAMP_TEMPLATE = "%YYYYMMDDHH%";
const TIMESTAMP_LENGTH = 10;
const TIMESTAMP_REGEXP = /^\d{10}$/;

const TELEMETRY_EVENT_CATEGORY = "contextservices.quicksuggest";

// Values returned by the onboarding dialog depending on the user's response.
// These values are used in telemetry events, so be careful about changing them.
const ONBOARDING_CHOICE = {
  ACCEPT_2: "accept_2",
  CLOSE_1: "close_1",
  DISMISS_1: "dismiss_1",
  DISMISS_2: "dismiss_2",
  LEARN_MORE_1: "learn_more_1",
  LEARN_MORE_2: "learn_more_2",
  NOT_NOW_2: "not_now_2",
  REJECT_2: "reject_2",
};

const ONBOARDING_URI =
  "chrome://browser/content/urlbar/quicksuggestOnboarding.html";

/**
 * This class manages the quick suggest feature (a.k.a Firefox Suggest) and has
 * related helpers.
 */
class _QuickSuggest {
  /**
   * @returns {string}
   *   The name of the quick suggest telemetry event category.
   */
  get TELEMETRY_EVENT_CATEGORY() {
    return TELEMETRY_EVENT_CATEGORY;
  }

  /**
   * @returns {string}
   *   The timestamp template string used in quick suggest URLs.
   */
  get TIMESTAMP_TEMPLATE() {
    return TIMESTAMP_TEMPLATE;
  }

  /**
   * @returns {number}
   *   The length of the timestamp in quick suggest URLs.
   */
  get TIMESTAMP_LENGTH() {
    return TIMESTAMP_LENGTH;
  }

  /**
   * @returns {string}
   *   The help URL for the Quick Suggest feature.
   */
  get HELP_URL() {
    return (
      Services.urlFormatter.formatURLPref("app.support.baseURL") +
      "firefox-suggest"
    );
  }

  get ONBOARDING_CHOICE() {
    return { ...ONBOARDING_CHOICE };
  }

  get ONBOARDING_URI() {
    return ONBOARDING_URI;
  }

  /**
   * @returns {RemoteSettingsClient}
   *   Quick suggest's remote settings client, which manages configuration and
   *   suggestions stored in remote settings.
   */
  get remoteSettings() {
    return this.#features.RemoteSettingsClient;
  }

  /**
   * @returns {BlockedSuggestions}
   *   The blocked suggestions feature.
   */
  get blockedSuggestions() {
    return this.#features.BlockedSuggestions;
  }

  /**
   * @returns {ImpressionCaps}
   *   The impression caps feature.
   */
  get impressionCaps() {
    return this.#features.ImpressionCaps;
  }

  /**
   * @returns {Weather}
   *   A feature that periodically fetches weather suggestions from Merino.
   */
  get weather() {
    return this.#features.Weather;
  }

  get logger() {
    if (!this._logger) {
      this._logger = lazy.UrlbarUtils.getLogger({ prefix: "QuickSuggest" });
    }
    return this._logger;
  }

  /**
   * Initializes the quick suggest feature. This must be called before using
   * quick suggest. It's safe to call more than once.
   */
  init() {
    if (Object.keys(this.#features).length) {
      // Already initialized.
      return;
    }

    // Create an instance of each feature and keep it in `#features`.
    for (let [name, uri] of Object.entries(FEATURES)) {
      let { [name]: ctor } = ChromeUtils.importESModule(uri);
      let feature = new ctor();
      this.#features[name] = feature;

      // Update the map from enabling preferences to features.
      let prefs = feature.enablingPreferences;
      if (prefs) {
        for (let p of prefs) {
          let features = this.#featuresByEnablingPrefs.get(p);
          if (!features) {
            features = new Set();
            this.#featuresByEnablingPrefs.set(p, features);
          }
          features.add(feature);
        }
      }
    }

    this._updateFeatureState();
    lazy.NimbusFeatures.urlbar.onUpdate(() => this._updateFeatureState());
    lazy.UrlbarPrefs.addObserver(this);
  }

  /**
   * Called when a urlbar pref changes.
   *
   * @param {string} pref
   *   The name of the pref relative to `browser.urlbar`.
   */
  onPrefChanged(pref) {
    // If any feature's enabling preference changed, update it now.
    let features = this.#featuresByEnablingPrefs.get(pref);
    if (features) {
      for (let f of features) {
        f.update();
      }
    }

    switch (pref) {
      case "quicksuggest.dataCollection.enabled":
        if (!lazy.UrlbarPrefs.updatingFirefoxSuggestScenario) {
          Services.telemetry.recordEvent(
            TELEMETRY_EVENT_CATEGORY,
            "data_collect_toggled",
            lazy.UrlbarPrefs.get(pref) ? "enabled" : "disabled"
          );
        }
        break;
      case "suggest.quicksuggest.nonsponsored":
        if (!lazy.UrlbarPrefs.updatingFirefoxSuggestScenario) {
          Services.telemetry.recordEvent(
            TELEMETRY_EVENT_CATEGORY,
            "enable_toggled",
            lazy.UrlbarPrefs.get(pref) ? "enabled" : "disabled"
          );
        }
        break;
      case "suggest.quicksuggest.sponsored":
        if (!lazy.UrlbarPrefs.updatingFirefoxSuggestScenario) {
          Services.telemetry.recordEvent(
            TELEMETRY_EVENT_CATEGORY,
            "sponsored_toggled",
            lazy.UrlbarPrefs.get(pref) ? "enabled" : "disabled"
          );
        }
        break;
    }
  }

  /**
   * Returns whether a given URL and quick suggest's URL are equivalent. URLs
   * are equivalent if they are identical except for substrings that replaced
   * templates in the original suggestion URL.
   *
   * For example, a suggestion URL from the backing suggestions source might
   * include a timestamp template "%YYYYMMDDHH%" like this:
   *
   *   http://example.com/foo?bar=%YYYYMMDDHH%
   *
   * When a quick suggest result is created from this suggestion URL, it's
   * created with a URL that is a copy of the suggestion URL but with the
   * template replaced with a real timestamp value, like this:
   *
   *   http://example.com/foo?bar=2021111610
   *
   * All URLs created from this single suggestion URL are considered equivalent
   * regardless of their real timestamp values.
   *
   * @param {string} url
   *   The URL to check.
   * @param {UrlbarResult} result
   *   The quick suggest result. Will compare {@link url} to `result.payload.url`
   * @returns {boolean}
   *   Whether `url` is equivalent to `result.payload.url`.
   */
  isURLEquivalentToResultURL(url, result) {
    // If the URLs aren't the same length, they can't be equivalent.
    let resultURL = result.payload.url;
    if (resultURL.length != url.length) {
      return false;
    }

    // If the result URL doesn't have a timestamp, then do a straight string
    // comparison.
    let { urlTimestampIndex } = result.payload;
    if (typeof urlTimestampIndex != "number" || urlTimestampIndex < 0) {
      return resultURL == url;
    }

    // Compare the first parts of the strings before the timestamps.
    if (
      resultURL.substring(0, urlTimestampIndex) !=
      url.substring(0, urlTimestampIndex)
    ) {
      return false;
    }

    // Compare the second parts of the strings after the timestamps.
    let remainderIndex = urlTimestampIndex + TIMESTAMP_LENGTH;
    if (resultURL.substring(remainderIndex) != url.substring(remainderIndex)) {
      return false;
    }

    // Test the timestamp against the regexp.
    let maybeTimestamp = url.substring(
      urlTimestampIndex,
      urlTimestampIndex + TIMESTAMP_LENGTH
    );
    return TIMESTAMP_REGEXP.test(maybeTimestamp);
  }

  /**
   * Some suggestion properties like `url` and `click_url` include template
   * substrings that must be replaced with real values. This method replaces
   * templates with appropriate values in place.
   *
   * @param {object} suggestion
   *   A suggestion object fetched from remote settings or Merino.
   */
  replaceSuggestionTemplates(suggestion) {
    let now = new Date();
    let timestampParts = [
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate(),
      now.getHours(),
    ];
    let timestamp = timestampParts
      .map(n => n.toString().padStart(2, "0"))
      .join("");
    for (let key of ["url", "click_url"]) {
      let value = suggestion[key];
      if (!value) {
        continue;
      }

      let timestampIndex = value.indexOf(TIMESTAMP_TEMPLATE);
      if (timestampIndex >= 0) {
        if (key == "url") {
          suggestion.urlTimestampIndex = timestampIndex;
        }
        // We could use replace() here but we need the timestamp index for
        // `suggestion.urlTimestampIndex`, and since we already have that, avoid
        // another O(n) substring search and manually replace the template with
        // the timestamp.
        suggestion[key] =
          value.substring(0, timestampIndex) +
          timestamp +
          value.substring(timestampIndex + TIMESTAMP_TEMPLATE.length);
      }
    }
  }

  /**
   * Records the Nimbus exposure event if it hasn't already been recorded during
   * the app session. This method actually queues the recording on idle because
   * it's potentially an expensive operation.
   */
  ensureExposureEventRecorded() {
    // `recordExposureEvent()` makes sure only one event is recorded per app
    // session even if it's called many times, but since it may be expensive, we
    // also keep `_recordedExposureEvent`.
    if (!this._recordedExposureEvent) {
      this._recordedExposureEvent = true;
      Services.tm.idleDispatchToMainThread(() =>
        lazy.NimbusFeatures.urlbar.recordExposureEvent({ once: true })
      );
    }
  }

  /**
   * An onboarding dialog can be shown to the users who are enrolled into
   * the QuickSuggest experiments or rollouts. This behavior is controlled
   * by the pref `browser.urlbar.quicksuggest.shouldShowOnboardingDialog`
   * which can be remotely configured by Nimbus.
   *
   * Given that the release may overlap with another onboarding dialog, we may
   * wait for a few restarts before showing the QuickSuggest dialog. This can
   * be remotely configured by Nimbus through
   * `quickSuggestShowOnboardingDialogAfterNRestarts`, the default is 0.
   *
   * @returns {boolean}
   *   True if the dialog was shown and false if not.
   */
  async maybeShowOnboardingDialog() {
    // The call to this method races scenario initialization on startup, and the
    // Nimbus variables we rely on below depend on the scenario, so wait for it
    // to be initialized.
    await lazy.UrlbarPrefs.firefoxSuggestScenarioStartupPromise;

    // If the feature is disabled, the user has already seen the dialog, or the
    // user has already opted in, don't show the onboarding.
    if (
      !lazy.UrlbarPrefs.get("quickSuggestEnabled") ||
      lazy.UrlbarPrefs.get("quicksuggest.showedOnboardingDialog") ||
      lazy.UrlbarPrefs.get("quicksuggest.dataCollection.enabled")
    ) {
      return false;
    }

    // Wait a number of restarts before showing the dialog.
    let restartsSeen = lazy.UrlbarPrefs.get("quicksuggest.seenRestarts");
    if (
      restartsSeen <
      lazy.UrlbarPrefs.get("quickSuggestShowOnboardingDialogAfterNRestarts")
    ) {
      lazy.UrlbarPrefs.set("quicksuggest.seenRestarts", restartsSeen + 1);
      return false;
    }

    let win = lazy.BrowserWindowTracker.getTopWindow();

    // Don't show the dialog on top of about:welcome for new users.
    if (win.gBrowser?.currentURI?.spec == "about:welcome") {
      return false;
    }

    if (lazy.UrlbarPrefs.get("experimentType") === "modal") {
      this.ensureExposureEventRecorded();
    }

    if (!lazy.UrlbarPrefs.get("quickSuggestShouldShowOnboardingDialog")) {
      return false;
    }

    let variationType;
    try {
      // An error happens if the pref is not in user prefs.
      variationType = lazy.UrlbarPrefs.get(
        "quickSuggestOnboardingDialogVariation"
      ).toLowerCase();
    } catch (e) {}

    let params = { choice: undefined, variationType, visitedMain: false };
    await win.gDialogBox.open(ONBOARDING_URI, params);

    lazy.UrlbarPrefs.set("quicksuggest.showedOnboardingDialog", true);
    lazy.UrlbarPrefs.set(
      "quicksuggest.onboardingDialogVersion",
      JSON.stringify({ version: 1, variation: variationType })
    );

    // Record the user's opt-in choice on the user branch. This pref is sticky,
    // so it will retain its user-branch value regardless of what the particular
    // default was at the time.
    let optedIn = params.choice == ONBOARDING_CHOICE.ACCEPT_2;
    lazy.UrlbarPrefs.set("quicksuggest.dataCollection.enabled", optedIn);

    switch (params.choice) {
      case ONBOARDING_CHOICE.LEARN_MORE_1:
      case ONBOARDING_CHOICE.LEARN_MORE_2:
        win.openTrustedLinkIn(this.HELP_URL, "tab", {
          fromChrome: true,
        });
        break;
      case ONBOARDING_CHOICE.ACCEPT_2:
      case ONBOARDING_CHOICE.REJECT_2:
      case ONBOARDING_CHOICE.NOT_NOW_2:
      case ONBOARDING_CHOICE.CLOSE_1:
        // No other action required.
        break;
      default:
        params.choice = params.visitedMain
          ? ONBOARDING_CHOICE.DISMISS_2
          : ONBOARDING_CHOICE.DISMISS_1;
        break;
    }

    lazy.UrlbarPrefs.set("quicksuggest.onboardingDialogChoice", params.choice);

    Services.telemetry.recordEvent(
      "contextservices.quicksuggest",
      "opt_in_dialog",
      params.choice
    );

    return true;
  }

  /**
   * Updates state based on whether quick suggest and its features are enabled.
   */
  _updateFeatureState() {
    // IMPORTANT: This method is a `NimbusFeatures.urlbar.onUpdate()` callback,
    // which means it's called on every change to any pref that is a fallback
    // for a urlbar Nimbus variable.

    // Update features.
    for (let feature of Object.values(this.#features)) {
      feature.update();
    }

    // Update state related to quick suggest as a whole.
    let enabled = lazy.UrlbarPrefs.get("quickSuggestEnabled");
    Services.telemetry.setEventRecordingEnabled(
      TELEMETRY_EVENT_CATEGORY,
      enabled
    );
  }

  // Maps from quick suggest feature class names to feature instances.
  #features = {};

  // Maps from preference names to the `Set` of feature instances they enable.
  #featuresByEnablingPrefs = new Map();
}

export const QuickSuggest = new _QuickSuggest();
