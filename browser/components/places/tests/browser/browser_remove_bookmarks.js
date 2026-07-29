/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 *  Test removing bookmarks from the Bookmarks Toolbar and Library.
 */

const TEST_URL = "about:mozilla";

add_setup(async function () {
  await PlacesUtils.bookmarks.eraseEverything();

  let toolbar = document.getElementById("PersonalToolbar");
  let wasCollapsed = toolbar.collapsed;

  // Uncollapse the personal toolbar if needed.
  if (wasCollapsed) {
    await promiseSetToolbarVisibility(toolbar, true);
  }

  registerCleanupFunction(async () => {
    // Collapse the personal toolbar if needed.
    if (wasCollapsed) {
      await promiseSetToolbarVisibility(toolbar, false);
    }
    await PlacesUtils.bookmarks.eraseEverything();
  });
});

add_task(async function test_remove_bookmark_from_toolbar() {
  let toolbarBookmark = await PlacesUtils.bookmarks.insert({
    parentGuid: PlacesUtils.bookmarks.toolbarGuid,
    title: "Bookmark Title",
    url: TEST_URL,
  });

  let toolbarNode = getToolbarNodeForItemGuid(toolbarBookmark.guid);

  let contextMenu = document.getElementById("placesContext");
  let popupShownPromise = BrowserTestUtils.waitForEvent(
    contextMenu,
    "popupshown"
  );

  EventUtils.synthesizeMouseAtCenter(toolbarNode, {
    button: 2,
    type: "contextmenu",
  });
  await popupShownPromise;

  let contextMenuDeleteBookmark = document.getElementById(
    "placesContext_deleteBookmark"
  );

  let removePromise = PlacesTestUtils.waitForNotification(
    "bookmark-removed",
    events => events.some(event => event.url == TEST_URL)
  );

  contextMenu.activateItem(contextMenuDeleteBookmark, {});

  await removePromise;

  Assert.deepEqual(
    PlacesUtils.bookmarks.fetch({ url: TEST_URL }),
    {},
    "Should have removed the bookmark from the database"
  );
});

add_task(async function test_remove_bookmark_from_library() {
  const uris = [
    "https://example.com/1",
    "https://example.com/2",
    "https://example.com/3",
  ];

  let children = uris.map((uri, index) => {
    return {
      title: `bm${index}`,
      url: uri,
    };
  });

  // Insert bookmarks.
  await PlacesUtils.bookmarks.insertTree({
    guid: PlacesUtils.bookmarks.unfiledGuid,
    children,
  });

  await withLibraryWindow("UnfiledBookmarks", async ({ left, right }) => {
    Assert.equal(
      PlacesUtils.getConcreteItemGuid(left.selectedNode),
      PlacesUtils.bookmarks.unfiledGuid,
      "Should have selected unfiled bookmarks."
    );

    let doc = right.ownerDocument;
    let contextMenu = doc.getElementById("placesContext");
    let contextMenuDeleteBookmark = doc.getElementById(
      "placesContext_deleteBookmark"
    );

    let popupShownPromise = BrowserTestUtils.waitForEvent(
      contextMenu,
      "popupshown"
    );

    right.view.selection.select(0);
    await synthesizeClickOnSelectedTreeCell(right, {
      type: "contextmenu",
      button: 2,
    });

    await popupShownPromise;

    Assert.equal(
      right.result.root.childCount,
      3,
      "Number of bookmarks before removal is right"
    );

    let removePromise = PlacesTestUtils.waitForNotification(
      "bookmark-removed",
      events => events.some(event => event.url == uris[0])
    );
    contextMenu.activateItem(contextMenuDeleteBookmark, {});

    await removePromise;

    Assert.equal(
      right.result.root.childCount,
      2,
      "Should have removed the bookmark from the display"
    );
  });
});
