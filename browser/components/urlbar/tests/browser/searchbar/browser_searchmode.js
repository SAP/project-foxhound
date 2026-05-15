/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests whether search mode works as expected in the new search bar.
 * E.g. there should be a global search mode and it
 * should not be tied to the selected tab.
 */

add_setup(async function () {
  await SearchTestUtils.updateRemoteSettingsConfig([
    { identifier: "engine1" },
    { identifier: "engine2" },
    { identifier: "engine3" },
  ]);
});

add_task(async function searchModeSurvivesTabSwitch() {
  let tab1 = gBrowser.selectedTab;
  let tab2 = await BrowserTestUtils.openNewForegroundTab(gBrowser);

  let popup = await SearchbarTestUtils.openSearchModeSwitcher(window);
  info("Press on the engine1 menu button to enter search mode");
  let popupHidden = SearchbarTestUtils.searchModeSwitcherPopupClosed(window);
  popup.querySelector("menuitem[label=engine1]").click();
  await popupHidden;

  await SearchbarTestUtils.assertSearchMode(window, {
    engineName: "engine1",
    entry: "searchbutton",
    source: 3,
  });

  info("Switching tab. Search mode should not be affected.");
  await BrowserTestUtils.switchTab(gBrowser, tab1);
  await SearchbarTestUtils.assertSearchMode(window, {
    engineName: "engine1",
    entry: "searchbutton",
    source: 3,
  });

  SearchbarTestUtils.exitSearchMode(window);
  gBrowser.removeTab(tab2);
});
