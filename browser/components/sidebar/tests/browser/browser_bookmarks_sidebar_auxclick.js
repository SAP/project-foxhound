/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const FIRST_URL = "https://example.com/";
const SECOND_URL = "https://example.org/";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["sidebar.updatedBookmarks.enabled", true]],
  });
});

registerCleanupFunction(async function () {
  await PlacesUtils.bookmarks.eraseEverything();
});

add_task(async function test_auxclick_bookmark_opens_in_new_tab() {
  const bookmark = await PlacesUtils.bookmarks.insert({
    parentGuid: PlacesUtils.bookmarks.toolbarGuid,
    url: FIRST_URL,
    title: "Example Page",
  });

  const { component, contentWindow } = await showBookmarksSidebar();
  const innerList = await expandToolbarFolder(component.bookmarkList);

  await BrowserTestUtils.waitForMutationCondition(
    innerList.shadowRoot,
    { childList: true, subtree: true },
    () => innerList.rowEls.length
  );
  const row = [...innerList.rowEls].find(
    ({ title }) => title === "Example Page"
  );
  Assert.ok(row, "Bookmark row is present.");

  info("Middle-click the bookmark row.");
  const promiseNewTab = BrowserTestUtils.waitForNewTab(gBrowser, FIRST_URL);
  // The row's keyboard focus lives on the listitem host, so its main link is
  // intentionally tabindex="-1". Disable the focusable a11y check around the
  // synthesized click, matching the other sidebar tab-list tests.
  AccessibilityUtils.setEnv({ focusableRule: false });
  EventUtils.synthesizeMouseAtCenter(row, { button: 1 }, contentWindow);
  AccessibilityUtils.resetEnv();
  const tab = await promiseNewTab;
  Assert.equal(gBrowser.selectedTab, tab, "The new tab is active.");

  await PlacesUtils.bookmarks.remove(bookmark);
  SidebarTestUtils.closePanel(window);
  cleanUpExtraTabs();
});

add_task(async function test_auxclick_folder_opens_all_children_in_new_tabs() {
  const folder = await PlacesUtils.bookmarks.insert({
    type: PlacesUtils.bookmarks.TYPE_FOLDER,
    parentGuid: PlacesUtils.bookmarks.toolbarGuid,
    title: "Example Folder",
  });
  await PlacesUtils.bookmarks.insert({
    parentGuid: folder.guid,
    url: FIRST_URL,
    title: "First Page",
  });
  await PlacesUtils.bookmarks.insert({
    parentGuid: folder.guid,
    url: SECOND_URL,
    title: "Second Page",
  });

  const { component, contentWindow } = await showBookmarksSidebar();
  const innerList = await expandToolbarFolder(component.bookmarkList);

  await BrowserTestUtils.waitForMutationCondition(
    innerList.shadowRoot,
    { childList: true, subtree: true },
    () => [...innerList.folderEls].some(({ guid }) => guid === folder.guid)
  );
  const folderDetails = [...innerList.folderEls].find(
    ({ guid }) => guid === folder.guid
  );
  Assert.ok(folderDetails, "Sub-folder is rendered.");
  Assert.ok(!folderDetails.open, "Sub-folder starts collapsed.");

  info("Middle-click the folder summary.");
  const promiseNewTab = BrowserTestUtils.waitForNewTab(gBrowser);
  EventUtils.synthesizeMouseAtCenter(
    folderDetails.querySelector("summary"),
    { button: 1 },
    contentWindow
  );
  await promiseNewTab;

  Assert.equal(gBrowser.tabs.length, 3, "Two new tabs were opened.");
  Assert.ok(
    !folderDetails.open,
    "Middle-click did not toggle the folder open."
  );

  await PlacesUtils.bookmarks.remove(folder);
  SidebarTestUtils.closePanel(window);
  cleanUpExtraTabs();
});
