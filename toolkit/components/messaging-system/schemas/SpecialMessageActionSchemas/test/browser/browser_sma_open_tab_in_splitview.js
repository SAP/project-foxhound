/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_OPEN_TAB_IN_SPLITVIEW() {
  let originalSplitViewPrefValue = Services.prefs.getBoolPref(
    "browser.tabs.splitView.enabled",
    false
  );
  await SMATestUtils.executeAndValidateAction({
    type: "OPEN_TAB_IN_SPLITVIEW",
  });

  let splitView = gBrowser.selectedTab.splitview;
  await BrowserTestUtils.browserLoaded(
    splitView.tabs[1].linkedBrowser,
    false,
    "about:opentabs"
  );
  let openTabsTab = gBrowser.selectedTab.splitview.tabs.find(
    tab => tab?.linkedBrowser?.currentURI?.spec == "about:opentabs"
  );

  ok(
    Services.prefs.getBoolPref("browser.tabs.splitView.enabled", false),
    "Splitview should be enabled"
  );
  ok(splitView, "Selected tab should be part of a splitview");
  ok(openTabsTab, "about:opentabs should be part of the splitview");

  gBrowser.unsplitTabs(splitView);
  Services.prefs.setBoolPref(
    "browser.tabs.splitView.enabled",
    originalSplitViewPrefValue
  );
});
