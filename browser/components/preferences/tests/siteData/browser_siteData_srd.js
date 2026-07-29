/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Regression test for bug 2034243: siteDataSize must leave the "calculating"
// state when browser.settings-redesign.enabled is true.
add_task(async function test_siteDataSize_srd() {
  let updatedPromise = promiseSiteDataManagerSitesUpdated();
  await openPreferencesViaOpenPreferencesAPI("privacy", { leaveOpen: true });
  await updatedPromise;

  let doc = gBrowser.selectedBrowser.contentDocument;
  let siteDataSize = doc.getElementById("siteDataSize");
  isnot(siteDataSize, null, "siteDataSize element should exist in SRD pane");

  let cacheSize = await SiteDataManager.getCacheSize();
  let totalUsage = await SiteDataManager.getTotalUsage();
  let [value, unit] = DownloadUtils.convertByteUnits(totalUsage + cacheSize);

  Assert.deepEqual(
    doc.l10n.getAttributes(siteDataSize),
    {
      id: "sitedata-total-size3",
      args: { value, unit },
    },
    "siteDataSize should show the computed size, not the calculating state"
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});
