/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  SearchWidgetTracker:
    "moz-src:///browser/components/customizableui/SearchWidgetTracker.sys.mjs",
  TelemetryTestUtils: "resource://testing-common/TelemetryTestUtils.sys.mjs",
});

const SEARCH_BAR_LAST_USED_PREF_NAME = "browser.search.widget.lastUsed";
const WIDGET_ID = "search-container";

add_task(async function checkSearchBarPresent() {
  await gCUITestUtils.addSearchBar();
  Services.prefs.setStringPref(
    SEARCH_BAR_LAST_USED_PREF_NAME,
    new Date("2022").toISOString()
  );

  Assert.ok(
    document.getElementById("searchbar-new"),
    "Search bar should be present in the Nav bar"
  );

  SearchWidgetTracker._removeWidgetIfUnused();
  Assert.ok(
    !document.getElementById("searchbar-new"),
    "Search bar should not be present in the Nav bar"
  );
  Assert.ok(
    !CustomizableUI.getPlacementOfWidget(WIDGET_ID),
    "Should have removed the search bar"
  );

  const keyedScalars = TelemetryTestUtils.getProcessScalars(
    "parent",
    true,
    true
  );
  TelemetryTestUtils.assertKeyedScalar(
    keyedScalars,
    "browser.ui.customized_widgets",
    `${WIDGET_ID}_remove_na_na_auto-unused`,
    1
  );

  Services.prefs.clearUserPref(SEARCH_BAR_LAST_USED_PREF_NAME);
  gCUITestUtils.removeSearchBar();
});
