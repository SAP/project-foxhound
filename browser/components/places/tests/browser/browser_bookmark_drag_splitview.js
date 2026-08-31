/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

let currentReduceMotionOverride;

async function addTab(url) {
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, url);
  return tab;
}

add_setup(() => {
  currentReduceMotionOverride = gReduceMotionOverride;
  // Disable tab animations
  gReduceMotionOverride = true;
});

registerCleanupFunction(async function () {
  Services.prefs.clearUserPref("browser.tabs.splitview.hasUsed");
});

add_task(async function test_dragging_splitview_bookmarks_toolbar() {
  // Make sure the bookmarks bar is visible and restore its state on cleanup.
  let toolbar = document.getElementById("PersonalToolbar");
  ok(toolbar, "PersonalToolbar should not be null");

  if (toolbar.collapsed) {
    await promiseSetToolbarVisibility(toolbar, true);
    registerCleanupFunction(function () {
      return promiseSetToolbarVisibility(toolbar, false);
    });
  }

  let [tab1, tab2] = await Promise.all(
    Array.from({ length: 2 }).map((_, index) =>
      addTab(`data:text/plain,tab${index + 1}`)
    )
  );

  let splitview = gBrowser.addTabSplitView([tab1, tab2]);
  Assert.equal(splitview.tabs.length, 2, "Split view has 2 tabs");

  const urls = ["data:text/plain,tab1", "data:text/plain,tab2"];

  let promiseItemAddedNotification = PlacesTestUtils.waitForNotification(
    "bookmark-added",
    events => events.some(({ url }) => url == urls[1])
  );

  EventUtils.startDragSession(window, "move");
  info("Start drag");
  let [result, dataTransfer] = EventUtils.synthesizeDragOver(
    tab1.splitview,
    toolbar,
    null,
    "move",
    window
  );

  is(
    dataTransfer.mozItemCount,
    1,
    "mozItemCount for tabs in a splitview should be 1"
  );

  info("Start drop");
  EventUtils.synthesizeDropAfterDragOver(result, dataTransfer, toolbar);

  // cleanup
  let srcWindowUtils = EventUtils._getDOMWindowUtils(window);
  const srcDragSession = srcWindowUtils.dragSession;
  srcDragSession.endDragSession(true);

  await promiseItemAddedNotification;

  for (let url of urls) {
    let bookmark = await PlacesUtils.bookmarks.fetch({ url });
    Assert.equal(
      typeof bookmark,
      "object",
      "There should be one bookmark per tab in splitview"
    );
  }

  // Cleanup
  await PlacesUtils.bookmarks.eraseEverything();
  BrowserTestUtils.removeTab(tab1);
  BrowserTestUtils.removeTab(tab2);
});
