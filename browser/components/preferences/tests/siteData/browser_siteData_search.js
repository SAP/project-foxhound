/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Driving the prefs search bar with EventUtils.sendString dispatches one event
// per character through the debounced search pipeline, which scans the full
// prefs UI each time. For --verify this needs more time.
requestLongerTimeout(2);

// Regression test for bug 2041077: opening the "Manage Cookies and Site Data"
// dialog from the search-results pane (without first visiting the privacy
// pane) must populate the site list. Before the fix, SiteDataManager.updateSites
// was only triggered by a "paneshown" event on panePrivacy, which the
// search-driven flow bypasses (it dispatches paneshown for paneSearchResults).
add_task(async function test_siteData_dialog_from_search_results() {
  let uri = Services.io.newURI("https://example.com");
  let cv = Services.cookies.add(
    uri.host,
    uri.pathQueryRef,
    "siteDataSearchTest",
    "1",
    false,
    false,
    false,
    Date.now() + 1000 * 60 * 60,
    {},
    Ci.nsICookie.SAMESITE_UNSET,
    Ci.nsICookie.SCHEME_HTTPS
  );
  Assert.equal(cv.result, Ci.nsICookieValidation.eOK);

  // Open prefs on a non-privacy pane so the privacy pane is not the initially
  // shown pane.
  await openPreferencesViaOpenPreferencesAPI("sync", { leaveOpen: true });

  // Drive the real search flow: type a query that matches a setting in the
  // privacy pane. searchFunction calls gotoPref("paneSearchResults"), which
  // dispatches a paneshown event for paneSearchResults rather than
  // panePrivacy. The fix extends privacy.mjs's paneshown listener to also
  // call SiteDataManager.updateSites() on paneSearchResults.
  let query = "cookies";
  let searchCompletedPromise = BrowserTestUtils.waitForEvent(
    gBrowser.contentWindow,
    "PreferencesSearchCompleted",
    evt => evt.detail == query
  );
  EventUtils.sendString(query);
  await searchCompletedPromise;

  // The "Clear data for specific sites" button is rendered in the
  // search-results view since it's a child of the privacy pane.
  await openSiteDataSettingsDialog();
  assertSitesListed(gBrowser.contentDocument, ["example.com"]);

  let dialogClosed = promiseSettingsDialogClose();
  content.gSubDialog._topDialog.close();
  await dialogClosed;

  await SiteDataManager.removeAll();
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});
