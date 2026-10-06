/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/browser/components/preferences/tests/head.js",
  this
);

/**
 * Opens the preferences page on the pane that hosts the download settings,
 * leaving the tab open for the caller to interact with. When the settings
 * redesign is enabled the downloads settings live on their own "downloads"
 * pane; otherwise they are part of the "general" pane.
 *
 * @returns {Promise<void>} Resolves once the pane is loaded.
 */
async function openDownloadsOrPreferencesPane() {
  let expectedPane = SpecialPowers.getBoolPref(
    "browser.settings-redesign.enabled",
    false
  )
    ? "downloads"
    : "general";
  await openPreferencesViaOpenPreferencesAPI(expectedPane, { leaveOpen: true });
}
