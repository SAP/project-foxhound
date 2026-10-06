/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/browser/components/preferences/tests/head.js",
  this
);

/**
 * Opens the pane that contains permissions settings. With SRD enabled this is
 * the dedicated permissionsData pane; with SRD disabled it is panePrivacy.
 *
 * @param {object} options - Passed to openPreferencesViaOpenPreferencesAPI.
 */
async function openPermissionsPane(options) {
  return openPreferencesViaOpenPreferencesAPI(
    SRD_PREF_VALUE ? "panePermissionsData" : "panePrivacy",
    options
  );
}
