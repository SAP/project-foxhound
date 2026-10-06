/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/browser/components/preferences/tests/head.js",
  this
);
Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/browser/components/preferences/tests/aiFeatures/head_smart_window.js",
  this
);

async function withPrefsPane(pane, testFn) {
  await openPreferencesViaOpenPreferencesAPI(pane, { leaveOpen: true });
  let doc = gBrowser.selectedBrowser.contentDocument;
  try {
    await testFn(doc);
  } finally {
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  }
}

/**
 * Navigates to the AI features pane in the preferences window.
 *
 * @param {Document} doc - The preferences document
 * @param {Window} win - The preferences window
 */
async function openAiFeaturePanel(doc, win) {
  const paneLoaded = waitForPaneChange("ai");
  const categoryButton = doc.getElementById("category-ai-features");
  categoryButton.scrollIntoView();
  EventUtils.synthesizeMouseAtCenter(categoryButton, {}, win);
  await paneLoaded;
}

/**
 * Pane name to open a fresh preferences tab on so that a given legacy
 * setting is reachable. Some settings that live on the General pane
 * under legacy chrome move to other panes under the Settings Redesign;
 * use this helper to open prefs directly on the right pane.
 *
 * @param {string} legacyPane - Pane name on legacy chrome (e.g. "general")
 * @param {string} srdPane - Pane name under SRD (e.g. "tabsBrowsing")
 * @returns {string} The pane name appropriate for the current pref state
 */
function srdAwarePane(legacyPane, srdPane) {
  return Services.prefs.getBoolPref("browser.settings-redesign.enabled")
    ? srdPane
    : legacyPane;
}
