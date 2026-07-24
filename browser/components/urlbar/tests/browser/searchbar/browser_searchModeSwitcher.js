/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const SEARCH_CONFIG = [
  { identifier: "engine1" },
  { identifier: "engine2" },
  { identifier: "engine3" },
];

add_setup(async function setup() {
  // Wait for the search service to make sure icons are available immediately.
  await SearchService.init();
});

// keyword.enabled=false should have no effect on icon and label.
add_task(async function test_keyword_disabled() {
  await SpecialPowers.pushPrefEnv({
    set: [["keyword.enabled", false]],
  });
  let win = await BrowserTestUtils.openNewBrowserWindow();

  // Getting the icon is async, so wait until the icon is set.
  await BrowserTestUtils.waitForCondition(
    async () =>
      SearchbarTestUtils.getSearchModeSwitcherIcon(win) ==
      (await SearchService.defaultEngine.getIconURL())
  );

  Assert.ok(
    true,
    "The search mode switcher should have the default icon " +
      "despite keyword.enabled being false"
  );

  Assert.equal(
    document
      .querySelector("#searchbar-new .searchmode-switcher")
      .getAttribute("data-l10n-id"),
    "urlbar-searchmode-button2",
    "Searchbar has regular l10n id"
  );

  Assert.equal(
    win.document
      .querySelector("#urlbar .searchmode-switcher")
      .getAttribute("data-l10n-id"),
    "urlbar-searchmode-no-keyword",
    "Urlbar has l10n id for keyword disabled"
  );

  await BrowserTestUtils.closeWindow(win);
  await SpecialPowers.popPrefEnv();
});

// Disabling scotch bonnet should have no effect, i.e., the
// search mode switcher on the search bar should work as usual.
add_task(async function test_scotchbonnet_disabled() {
  await SearchTestUtils.updateRemoteSettingsConfig(SEARCH_CONFIG);
  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.scotchBonnet.enableOverride", false]],
  });

  let popup = await SearchbarTestUtils.openSearchModeSwitcher(window);
  Assert.ok(true, "Can still open search mode switcher");
  let popupHidden = SearchbarTestUtils.searchModeSwitcherPopupClosed(window);
  popup.querySelector("menuitem[label=engine2]").click();
  await popupHidden;

  await SearchbarTestUtils.assertSearchMode(window, {
    engineName: "engine2",
    entry: "searchbutton",
    source: 3,
  });
  Assert.ok(true, "Entered search mode");

  document.querySelector("#searchbar-new .searchmode-switcher-close").click();
  await SearchbarTestUtils.assertSearchMode(window, null);
  Assert.ok(true, "Exited search mode");

  await SpecialPowers.popPrefEnv();
});
