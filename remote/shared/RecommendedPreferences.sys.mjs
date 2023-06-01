/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  Preferences: "resource://gre/modules/Preferences.sys.mjs",

  Log: "chrome://remote/content/shared/Log.sys.mjs",
});

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "useRecommendedPrefs",
  "remote.prefs.recommended",
  false
);

XPCOMUtils.defineLazyGetter(lazy, "logger", () => lazy.Log.get());

// Ensure we are in the parent process.
if (Services.appinfo.processType != Ci.nsIXULRuntime.PROCESS_TYPE_DEFAULT) {
  throw new Error(
    "RecommendedPreferences should only be loaded in the parent process"
  );
}

// ALL CHANGES TO THIS LIST MUST HAVE REVIEW FROM A WEBDRIVER PEER!
//
// Preferences are set for automation on startup, unless
// remote.prefs.recommended has been set to false.
//
// Note: Clients do not always use the latest version of the application. As
// such backward compatibility has to be ensured at least for the last three
// releases.

// INSTRUCTIONS TO ADD A NEW PREFERENCE
//
// Preferences for remote control and automation can be set from several entry
// points:
// - remote/shared/RecommendedPreferences.sys.mjs
// - remote/test/puppeteer/src/node/FirefoxLauncher.ts
// - testing/geckodriver/src/prefs.rs
// - testing/marionette/client/marionette_driver/geckoinstance.py
//
// The preferences in `FirefoxLauncher.ts`, `prefs.rs` and `geckoinstance.py`
// will be applied before the Application starts, and should typically be used
// for preferences which cannot be updated during the lifetime of the Application.
//
// The preferences in `RecommendedPreferences.sys.mjs` are applied after
// the Application has started, which means that the application must apply this
// change dynamically and behave correctly. Note that you can also define
// protocol specific preferences (CDP, WebDriver, ...) which are merged with the
// COMMON_PREFERENCES from `RecommendedPreferences.sys.mjs`.
//
// Additionally, users relying on the Marionette Python client (ie. using
// geckoinstance.py) set `remote.prefs.recommended = false`. This means that
// preferences from `RecommendedPreferences.sys.mjs` are not applied and have to
// be added to the list of preferences in that Python file. Note that there are
// several lists of preferences, either common or specific to a given application
// (Firefox Desktop, Fennec, Thunderbird).
//
// Depending on how users interact with the Remote Agent, they will use different
// combinations of preferences. So it's important to update the preferences files
// so that all users have the proper preferences.
//
// When adding a new preference, follow this guide to decide where to add it:
// - Add the preference to `geckoinstance.py`
// - If the preference has to be set before startup:
//   - Add the preference to `prefs.rs`
//   - Add the preference `FirefoxLauncher.ts`
//   - Create a PR to upstream the change on `FirefoxLauncher.ts` to puppeteer
// - Otherwise, if the preference can be set after startup:
//   - Add the preference to `RecommendedPreferences.sys.mjs`
const COMMON_PREFERENCES = new Map([
  // Make sure Shield doesn't hit the network.
  ["app.normandy.api_url", ""],

  // Disable automatically upgrading Firefox
  //
  // Note: This preference should have already been set by the client when
  // creating the profile. But if not and to absolutely make sure that updates
  // of Firefox aren't downloaded and applied, enforce its presence.
  ["app.update.disabledForTesting", true],

  // Increase the APZ content response timeout in tests to 1 minute.
  // This is to accommodate the fact that test environments tends to be
  // slower than production environments (with the b2g emulator being
  // the slowest of them all), resulting in the production timeout value
  // sometimes being exceeded and causing false-positive test failures.
  //
  // (bug 1176798, bug 1177018, bug 1210465)
  ["apz.content_response_timeout", 60000],

  // Don't show the content blocking introduction panel.
  // We use a larger number than the default 22 to have some buffer
  // This can be removed once Firefox 69 and 68 ESR and are no longer supported.
  ["browser.contentblocking.introCount", 99],

  // Indicate that the download panel has been shown once so that
  // whichever download test runs first doesn't show the popup
  // inconsistently.
  ["browser.download.panel.shown", true],

  // Always display a blank page
  ["browser.newtabpage.enabled", false],

  // Background thumbnails in particular cause grief, and disabling
  // thumbnails in general cannot hurt
  ["browser.pagethumbnails.capturing_disabled", true],

  // Disable safebrowsing components.
  //
  // These should also be set in the profile prior to starting Firefox,
  // as it is picked up at runtime.
  ["browser.safebrowsing.blockedURIs.enabled", false],
  ["browser.safebrowsing.downloads.enabled", false],
  ["browser.safebrowsing.passwords.enabled", false],
  ["browser.safebrowsing.malware.enabled", false],
  ["browser.safebrowsing.phishing.enabled", false],

  // Disable updates to search engines.
  //
  // Should be set in profile.
  ["browser.search.update", false],

  // Do not restore the last open set of tabs if the browser has crashed
  ["browser.sessionstore.resume_from_crash", false],

  // Don't check for the default web browser during startup.
  //
  // These should also be set in the profile prior to starting Firefox,
  // as it is picked up at runtime.
  ["browser.shell.checkDefaultBrowser", false],

  // Disable session restore infobar
  ["browser.startup.couldRestoreSession.count", -1],

  // Do not redirect user when a milstone upgrade of Firefox is detected
  ["browser.startup.homepage_override.mstone", "ignore"],

  // Do not close the window when the last tab gets closed
  ["browser.tabs.closeWindowWithLastTab", false],

  // Do not allow background tabs to be zombified on Android, otherwise for
  // tests that open additional tabs, the test harness tab itself might get
  // unloaded
  ["browser.tabs.disableBackgroundZombification", false],

  // Don't unload tabs when available memory is running low
  ["browser.tabs.unloadOnLowMemory", false],

  // Do not warn when closing all open tabs
  ["browser.tabs.warnOnClose", false],

  // Do not warn when closing all other open tabs
  ["browser.tabs.warnOnCloseOtherTabs", false],

  // Do not warn when multiple tabs will be opened
  ["browser.tabs.warnOnOpen", false],

  // Don't show the Bookmarks Toolbar on any tab (the above pref that
  // disables the New Tab Page ends up showing the toolbar on about:blank).
  ["browser.toolbars.bookmarks.visibility", "never"],

  // Make sure Topsites doesn't hit the network to retrieve tiles from Contile.
  ["browser.topsites.contile.enabled", false],

  // Disable first run splash page on Windows 10
  ["browser.usedOnWindows10.introURL", ""],

  // Disable the UI tour.
  //
  // Should be set in profile.
  ["browser.uitour.enabled", false],

  // Turn off Merino suggestions in the location bar so as not to trigger
  // network connections.
  ["browser.urlbar.merino.endpointURL", ""],

  // Turn off search suggestions in the location bar so as not to trigger
  // network connections.
  ["browser.urlbar.suggest.searches", false],

  // Do not warn on quitting Firefox
  ["browser.warnOnQuit", false],

  // Do not show datareporting policy notifications which can
  // interfere with tests
  [
    "datareporting.healthreport.documentServerURI",
    "http://%(server)s/dummy/healthreport/",
  ],
  ["datareporting.healthreport.logging.consoleEnabled", false],
  ["datareporting.healthreport.service.enabled", false],
  ["datareporting.healthreport.service.firstRun", false],
  ["datareporting.healthreport.uploadEnabled", false],
  ["datareporting.policy.dataSubmissionEnabled", false],
  ["datareporting.policy.dataSubmissionPolicyAccepted", false],
  ["datareporting.policy.dataSubmissionPolicyBypassNotification", true],

  // Disable popup-blocker
  ["dom.disable_open_during_load", false],

  // Enabling the support for File object creation in the content process
  ["dom.file.createInChild", true],

  // Disable the ProcessHangMonitor
  ["dom.ipc.reportProcessHangs", false],

  // Disable slow script dialogues
  ["dom.max_chrome_script_run_time", 0],
  ["dom.max_script_run_time", 0],

  // Disable location change rate limitation
  ["dom.navigation.locationChangeRateLimit.count", 0],

  // DOM Push
  ["dom.push.connection.enabled", false],

  // Screen Orientation API
  ["dom.screenorientation.allow-lock", true],

  // Disable dialog abuse if alerts are triggered too quickly.
  ["dom.successive_dialog_time_limit", 0],

  // Only load extensions from the application and user profile
  // AddonManager.SCOPE_PROFILE + AddonManager.SCOPE_APPLICATION
  //
  // Should be set in profile.
  ["extensions.autoDisableScopes", 0],
  ["extensions.enabledScopes", 5],

  // Disable metadata caching for installed add-ons by default
  ["extensions.getAddons.cache.enabled", false],

  // Disable installing any distribution extensions or add-ons.
  // Should be set in profile.
  ["extensions.installDistroAddons", false],

  // Turn off extension updates so they do not bother tests
  ["extensions.update.enabled", false],
  ["extensions.update.notifyUser", false],

  // Make sure opening about:addons will not hit the network
  ["extensions.getAddons.discovery.api_url", "data:, "],

  // Allow the application to have focus even it runs in the background
  ["focusmanager.testmode", true],

  // Disable useragent updates
  ["general.useragent.updates.enabled", false],

  // Always use network provider for geolocation tests so we bypass the
  // macOS dialog raised by the corelocation provider
  ["geo.provider.testing", true],

  // Do not scan Wifi
  ["geo.wifi.scan", false],

  // Do not prompt with long usernames or passwords in URLs
  ["network.http.phishy-userpass-length", 255],

  // Do not prompt for temporary redirects
  ["network.http.prompt-temp-redirect", false],

  // Do not automatically switch between offline and online
  ["network.manage-offline-status", false],

  // Make sure SNTP requests do not hit the network
  ["network.sntp.pools", "%(server)s"],

  // Privacy and Tracking Protection
  ["privacy.trackingprotection.enabled", false],

  // Don't do network connections for mitm priming
  ["security.certerrors.mitm.priming.enabled", false],

  // Local documents have access to all other local documents,
  // including directory listings
  ["security.fileuri.strict_origin_policy", false],

  // Tests do not wait for the notification button security delay
  ["security.notification_enable_delay", 0],

  // Ensure blocklist updates do not hit the network
  ["services.settings.server", "http://%(server)s/dummy/blocklist/"],

  // Do not automatically fill sign-in forms with known usernames and
  // passwords
  ["signon.autofillForms", false],

  // Disable password capture, so that tests that include forms are not
  // influenced by the presence of the persistent doorhanger notification
  ["signon.rememberSignons", false],

  // Disable first-run welcome page
  ["startup.homepage_welcome_url", "about:blank"],
  ["startup.homepage_welcome_url.additional", ""],

  // Prevent starting into safe mode after application crashes
  ["toolkit.startup.max_resumed_crashes", -1],

  // Disable window occlusion on Windows, which can prevent webdriver commands
  // such as WebDriver:FindElements from working properly (Bug 1802473).
  ["widget.windows.window_occlusion_tracking.enabled", false],
]);

export const RecommendedPreferences = {
  alteredPrefs: new Set(),

  isInitialized: false,

  /**
   * Apply the provided map of preferences.
   * They will be automatically reset on application shutdown.
   *
   * @param {Map} preferences
   *     Map of preference key to preference value.
   */
  applyPreferences(preferences) {
    if (!lazy.useRecommendedPrefs) {
      // If remote.prefs.recommended is set to false, do not set any preference
      // here. Needed for our Firefox CI.
      return;
    }

    // Only apply common recommended preferences on first call to
    // applyPreferences.
    if (!this.isInitialized) {
      // Merge common preferences and provided preferences in a single map.
      preferences = new Map([...COMMON_PREFERENCES, ...preferences]);
      Services.obs.addObserver(this, "quit-application");
      this.isInitialized = true;
    }

    for (const [k, v] of preferences) {
      if (!lazy.Preferences.isSet(k)) {
        lazy.logger.debug(`Setting recommended pref ${k} to ${v}`);
        lazy.Preferences.set(k, v);

        // Keep track all the altered preferences to restore them on
        // quit-application.
        this.alteredPrefs.add(k);
      }
    }
  },

  observe(subject, topic) {
    if (topic === "quit-application") {
      Services.obs.removeObserver(this, "quit-application");
      this.restoreAllPreferences();
    }
  },

  /**
   * Restore all the altered preferences.
   */
  restoreAllPreferences() {
    this.restorePreferences(this.alteredPrefs);
    this.isInitialized = false;
  },

  /**
   * Restore provided preferences.
   *
   * @param {Map} preferences
   *     Map of preferences that should be restored.
   */
  restorePreferences(preferences) {
    for (const k of preferences.keys()) {
      lazy.logger.debug(`Resetting recommended pref ${k}`);
      lazy.Preferences.reset(k);
      this.alteredPrefs.delete(k);
    }
  },
};
