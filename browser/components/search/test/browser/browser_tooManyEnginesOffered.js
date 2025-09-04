"use strict";

// This test makes sure that when a page offers many search engines,
// a limited number of add-engine items will be shown in the searchbar.

ChromeUtils.defineESModuleGetters(this, {
  OpenSearchManager: "resource:///modules/OpenSearchManager.sys.mjs",
});

const searchPopup = document.getElementById("PopupSearchAutoComplete");

add_setup(async function () {
  await gCUITestUtils.addSearchBar();

  await Services.search.init();
  registerCleanupFunction(() => {
    gCUITestUtils.removeSearchBar();
  });
});

add_task(async function test() {
  let searchbar = document.getElementById("searchbar");

  let rootDir = getRootDirectory(gTestPath);
  let url = rootDir + "tooManyEnginesOffered.html";
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, url);

  // Open the search popup.
  let promise = promiseEvent(searchPopup, "popupshown");
  let promise2 = promiseEvent(searchPopup.oneOffButtons, "rebuild");
  info("Opening search panel");
  searchbar.focus();
  // In TV we may try opening too early, when the searchbar is not ready yet.
  await TestUtils.waitForCondition(
    () => document.getElementById("searchbar").textbox.controller.input,
    "Wait for the searchbar controller to connect"
  );
  EventUtils.synthesizeKey("KEY_ArrowDown");
  await Promise.all([promise, promise2]);

  const addEngineList = OpenSearchManager.getEngines(tab.linkedBrowser);
  Assert.equal(
    addEngineList.length,
    6,
    "Expected number of engines retrieved from web page"
  );

  const displayedAddEngineList =
    searchPopup.oneOffButtons.buttons.querySelectorAll(
      ".searchbar-engine-one-off-add-engine"
    );
  Assert.equal(
    displayedAddEngineList.length,
    searchPopup.oneOffButtons._maxInlineAddEngines,
    "Expected number of engines displayed on popup"
  );

  for (let i = 0; i < displayedAddEngineList.length; i++) {
    const engine = addEngineList[i];
    const item = displayedAddEngineList[i];
    Assert.equal(
      item.getAttribute("engine-name"),
      engine.title,
      "Expected engine is displaying"
    );
  }

  promise = promiseEvent(searchPopup, "popuphidden");
  EventUtils.synthesizeKey("KEY_Escape", {}, searchPopup.ownerGlobal);
  await promise;

  gBrowser.removeCurrentTab();
});
