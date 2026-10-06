/*
 * This file contains tests for the Preferences search bar.
 */

add_task(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["cookiebanners.ui.desktop.enabled", false]],
  });
  await openPreferencesViaOpenPreferencesAPI(DEFAULT_PANE, {
    leaveOpen: true,
  });
  await evaluateSearchResults("cookies", ["cookiesAndSiteData2"]);
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

add_task(async function () {
  await openPreferencesViaOpenPreferencesAPI(DEFAULT_PANE, {
    leaveOpen: true,
  });
  await evaluateSearchResults("site data", ["cookiesAndSiteData2"]);
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

add_task(async function () {
  await openPreferencesViaOpenPreferencesAPI(DEFAULT_PANE, {
    leaveOpen: true,
  });
  await evaluateSearchResults("cache", ["cookiesAndSiteData2"]);
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});
