/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Checks the local shortcut rows in the engines list of the search pane
 * with the settings redesign enabled.
 */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  UrlbarUtils: "moz-src:///browser/components/urlbar/UrlbarUtils.sys.mjs",
});

add_task(async function test_visible_rows() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.scotchBonnet.enableOverride", true]],
  });
  await openPreferencesViaOpenPreferencesAPI("search", { leaveOpen: true });

  let engines = await SearchService.getVisibleEngines();
  let doc = gBrowser.selectedBrowser.contentDocument;
  let engineList = doc.querySelector("moz-box-group#engineList");

  Assert.equal(
    engineList.children.length,
    engines.length + UrlbarUtils.LOCAL_SEARCH_MODES.length,
    "Expected number of rows"
  );

  for (let row of engineList.children) {
    let rowElem = row.children[0];
    Assert.ok(rowElem.description, "Row shortcut is present");
    Assert.ok(rowElem.label, "l10n label is present");
  }

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});
