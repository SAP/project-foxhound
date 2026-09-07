/**
 * This test checks that the Show in Folder context menu item in the
 * bookmarks menu under the app menu reveals and selects the bookmark in
 * its containing folder when the updated bookmarks sidebar is enabled.
 */
"use strict";

const TEST_PARENT_FOLDER = "The Parent Folder";
const TEST_URL = "https://example.com/";
const TEST_TITLE = "Test Bookmark";

let sidebarWasAlreadyOpen = SidebarController.isOpen;

const { CustomizableUITestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/CustomizableUITestUtils.sys.mjs"
);
let gCUITestUtils = new CustomizableUITestUtils(window);

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["sidebar.updatedBookmarks.enabled", true]],
  });
});

add_task(async function menuBookmarkShowInFolderUpdatedSidebar() {
  let parentFolder = await PlacesUtils.bookmarks.insert({
    parentGuid: PlacesUtils.bookmarks.unfiledGuid,
    type: PlacesUtils.bookmarks.TYPE_FOLDER,
    title: TEST_PARENT_FOLDER,
  });
  let bookmark = await PlacesUtils.bookmarks.insert({
    parentGuid: parentFolder.guid,
    url: TEST_URL,
    title: TEST_TITLE,
  });

  // Open app menu and select bookmarks view
  await gCUITestUtils.openMainMenu();
  document.getElementById("appMenu-bookmarks-button").click();
  let bookmarksView = document.getElementById("PanelUI-bookmarks");
  await BrowserTestUtils.waitForEvent(bookmarksView, "ViewShown");

  // Find the test bookmark and open the context menu on it
  let list = document.getElementById("panelMenu_bookmarksMenu");
  let listItem = [...list.children].find(node => node.label == TEST_TITLE);
  let placesContext = document.getElementById("placesContext");
  let contextPromise = BrowserTestUtils.waitForEvent(
    placesContext,
    "popupshown"
  );
  EventUtils.synthesizeMouseAtCenter(listItem, {
    button: 2,
    type: "contextmenu",
  });
  await contextPromise;

  // Select Show in Folder and wait for the sidebar to show up
  let sidebarShownPromise = BrowserTestUtils.waitForEvent(
    window,
    "SidebarShown"
  );
  placesContext.activateItem(
    document.getElementById("placesContext_showInFolder")
  );
  await sidebarShownPromise;

  // The updated bookmarks sidebar uses the sidebar-bookmarks custom element
  // rather than the bookmarks-view tree.
  let sidebar = document.getElementById("sidebar");
  let component;
  await BrowserTestUtils.waitForCondition(() => {
    component = sidebar.contentDocument.querySelector("sidebar-bookmarks");
    return component;
  }, "The sidebar-bookmarks element is present.");
  await component.updateComplete;

  let findRow = bookmarkList => {
    if (!bookmarkList) {
      return null;
    }
    for (const row of bookmarkList.rowEls ?? []) {
      if (row.guid === bookmark.guid) {
        return row;
      }
    }
    for (const details of bookmarkList.folderEls ?? []) {
      const sublist = details.querySelector("sidebar-bookmark-list");
      const found = findRow(sublist);
      if (found) {
        return found;
      }
    }
    return null;
  };

  await BrowserTestUtils.waitForCondition(
    () => findRow(component.bookmarkList),
    "The bookmark row appears in the tree view after Show in Folder."
  );
  let revealedRow = findRow(component.bookmarkList);
  await BrowserTestUtils.waitForCondition(
    () => revealedRow.selected,
    "The bookmark row is selected after Show in Folder."
  );

  Assert.equal(
    revealedRow.guid,
    bookmark.guid,
    "The correct bookmark is revealed in its containing folder."
  );

  // Cleanup
  await PlacesUtils.bookmarks.eraseEverything();
  if (!sidebarWasAlreadyOpen) {
    SidebarController.hide();
  }
  await gCUITestUtils.hideMainMenu();
});
