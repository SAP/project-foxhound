/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Test that the Places contextual menu shows the folder options (but with
 * Delete disabled) when right-clicking on the "gutter" (empty/padding area)
 * of an empty folder popup, and shows no context menu at all for a non-empty
 * folder popup.
 */
"use strict";

add_setup(async function () {
  await ensureBookmarksToolbarIsVisibleAndPopulated();
});

add_task(async function test_context_on_menu_gutter() {
  let toolbarFolder = await PlacesUtils.bookmarks.insert({
    parentGuid: PlacesUtils.bookmarks.toolbarGuid,
    type: PlacesUtils.bookmarks.TYPE_FOLDER,
    title: "Folder",
  });

  registerCleanupFunction(() =>
    PlacesUtils.bookmarks.remove(toolbarFolder.guid)
  );

  let toolbarNode = getToolbarNodeForItemGuid(toolbarFolder.guid);
  let popup = toolbarNode.firstElementChild;
  let placesContext = document.getElementById("placesContext");

  info(
    "Empty folder: context menu on gutter should show folder options with Delete disabled."
  );
  let shownPromise = BrowserTestUtils.waitForEvent(popup, "popupshown");
  EventUtils.synthesizeMouseAtCenter(toolbarNode, {}, window);
  await shownPromise;

  let contextShownPromise = BrowserTestUtils.waitForEvent(
    placesContext,
    "popupshown"
  );
  EventUtils.synthesizeMouse(popup, 5, 5, {
    button: 2,
    type: "contextmenu",
  });
  await contextShownPromise;

  let deleteFolder = document.getElementById("placesContext_deleteFolder");
  Assert.ok(
    BrowserTestUtils.isVisible(deleteFolder),
    "Folder options should be visible for empty folder gutter"
  );
  Assert.ok(
    deleteFolder.disabled,
    "Delete should be disabled when right-clicking the gutter, not a specific item"
  );

  let contextHiddenPromise = BrowserTestUtils.waitForEvent(
    placesContext,
    "popuphidden"
  );
  placesContext.hidePopup();
  await contextHiddenPromise;

  // Close the folder popup before reinserting content and reopening.
  let popupHiddenPromise = BrowserTestUtils.waitForEvent(popup, "popuphidden");
  popup.hidePopup();
  await popupHiddenPromise;

  info("Insert a bookmark so the folder is no longer empty.");
  await PlacesUtils.bookmarks.insert({
    parentGuid: toolbarFolder.guid,
    title: "Bookmark",
    url: "about:buildconfig",
  });

  shownPromise = BrowserTestUtils.waitForEvent(popup, "popupshown");
  EventUtils.synthesizeMouseAtCenter(toolbarNode, {}, window);
  await shownPromise;

  // Add a top margin to push the first item down, ensuring (5, 5) relative to
  // the popup lands in the gutter above it rather than on the item itself.
  popup.querySelector("menuitem").style.marginTop = "50px";

  info("Non-empty folder: context menu on gutter should not appear at all.");
  // buildContextMenu returns false, which calls event.preventDefault() on
  // popupshowing synchronously, so the context menu never transitions to
  // "open" state. We can assert immediately after synthesizeMouse.
  EventUtils.synthesizeMouse(popup, 5, 5, {
    button: 2,
    type: "contextmenu",
  });
  Assert.equal(
    placesContext.state,
    "closed",
    "Context menu should not appear when right-clicking gutter of non-empty folder"
  );

  popupHiddenPromise = BrowserTestUtils.waitForEvent(popup, "popuphidden");
  popup.hidePopup();
  await popupHiddenPromise;
});
