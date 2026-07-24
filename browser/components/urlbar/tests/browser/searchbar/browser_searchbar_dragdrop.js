/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";
const TEST_URL = "data:text/html,a test page";
let searchbar;
let openLinkSpy;

add_setup(async function () {
  // Stop search engine loads from hitting the network.
  await SearchTestUtils.updateRemoteSettingsConfig([{ identifier: "engine" }]);
  CustomizableUI.addWidgetToArea("home-button", "nav-bar");
  searchbar = document.getElementById("searchbar-new");

  let sandbox = sinon.createSandbox();
  openLinkSpy = sinon.spy(window, "openTrustedLinkIn");
  registerCleanupFunction(() => {
    CustomizableUI.removeWidgetFromArea("home-button");
    Services.prefs.clearUserPref("browser.engagement.home-button.has-removed");
    sandbox.restore();
    searchbar.handleRevert();
  });
});

/**
 * Simulates a drop on the searchbar input field.
 * The drag source must be something different from the searchbar,
 * so we pick the home button somewhat arbitrarily.
 *
 * @param {object} content
 *   A {type, data} object representing the DND content.
 */
function simulateSearchbarDrop(content) {
  EventUtils.synthesizeDrop(
    document.getElementById("home-button"), // Dragstart element.
    searchbar.inputField, // Drop element.
    [[content]], // Drag data.
    "copy",
    window
  );
}

add_task(async function checkDragURL() {
  searchbar.handleRevert();
  Assert.ok(!searchbar.hasAttribute("usertyping"), "Go button invisible");
  await BrowserTestUtils.withNewTab(TEST_URL, async () => {
    info("Check dragging a normal url onto the searchbar");
    const DRAG_URL = "https://www.example.com/";
    simulateSearchbarDrop({ type: "text/plain", data: DRAG_URL });

    Assert.ok(openLinkSpy.notCalled, "Not navigating");
    Assert.equal(searchbar.value, DRAG_URL, "Inserted value");
    let queryContext = await SearchbarTestUtils.promiseSearchComplete(window);
    Assert.equal(queryContext.searchString, DRAG_URL, "Started query");
    Assert.ok(searchbar.hasAttribute("usertyping"), "Go button visible");
  });
});

add_task(async function checkDragLoadedURL() {
  const DRAG_URL = "https://www.example.com/";
  searchbar.value = "";
  await BrowserTestUtils.withNewTab(DRAG_URL, async () => {
    info("Check dragging the currently loaded url onto the searchbar");
    simulateSearchbarDrop({ type: "text/plain", data: DRAG_URL });

    Assert.ok(openLinkSpy.notCalled, "Not navigating");
    Assert.equal(searchbar.value, DRAG_URL, "Inserted value");
    let queryContext = await SearchbarTestUtils.promiseSearchComplete(window);
    Assert.equal(queryContext.searchString, DRAG_URL, "Started query");
  });
});

add_task(async function checkDragURLLike() {
  searchbar.handleRevert();
  await BrowserTestUtils.withNewTab(TEST_URL, async () => {
    info("Check dragging url-like text onto the searchbar");
    const DRAG_URL = "www.example.com";
    simulateSearchbarDrop({ type: "text/plain", data: DRAG_URL });

    Assert.ok(openLinkSpy.notCalled, "Not navigating");
    Assert.equal(searchbar.value, DRAG_URL, "Didn't add a protocol");
    let queryContext = await SearchbarTestUtils.promiseSearchComplete(window);
    Assert.equal(queryContext.searchString, DRAG_URL, "Started query");
  });
});

add_task(async function checkDragText() {
  searchbar.value = "Something else";
  await BrowserTestUtils.withNewTab(TEST_URL, async () => {
    info("Check dragging a search term onto the search bar");
    const DRAG_TEXT = "foo bar";
    simulateSearchbarDrop({ type: "text/plain", data: DRAG_TEXT });

    Assert.ok(openLinkSpy.notCalled, "Not navigating");
    Assert.equal(searchbar.value, DRAG_TEXT, "Inserted value");
    let queryContext = await SearchbarTestUtils.promiseSearchComplete(window);
    Assert.equal(queryContext.searchString, DRAG_TEXT, "Started query");
  });
});
