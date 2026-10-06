/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/* globals promiseSetToolbarVisibility */

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/browser/components/places/tests/browser/head.js",
  this
);

add_setup(async function () {
  let toolbar = document.getElementById("PersonalToolbar");
  if (toolbar.collapsed) {
    await promiseSetToolbarVisibility(toolbar, true);
    registerCleanupFunction(() => promiseSetToolbarVisibility(toolbar, false));
  }

  registerCleanupFunction(async () => {
    await PlacesUtils.bookmarks.eraseEverything();
  });
});

function findToolbarChild(guid) {
  let toolbarItems = document.getElementById("PlacesToolbarItems");
  for (let node of toolbarItems.childNodes) {
    if (node._placesNode?.bookmarkGuid == guid) {
      return node;
    }
  }
  return null;
}

function getShareFolderItem(popup) {
  return popup.querySelector('menuitem[data-l10n-id="places-share-folder2"]');
}

async function openFolderPopup(folderNode) {
  let popup = folderNode.menupopup;
  let popupShown = BrowserTestUtils.waitForEvent(popup, "popupshown");
  EventUtils.synthesizeMouseAtCenter(folderNode, {});
  await popupShown;
  return popup;
}

async function closePopup(popup) {
  let popupHidden = BrowserTestUtils.waitForEvent(popup, "popuphidden");
  popup.hidePopup();
  await popupHidden;
}

/**
 * Bug 2040385: with contentsharing enabled, clicking a bookmarks toolbar
 * folder must continue to open its popup after the last bookmark has been
 * removed from it. The Share Folder menuitem must be cleaned up when the
 * folder empties so the popup retains a visible empty placeholder.
 */
add_task(async function test_folder_panel_opens_after_last_bookmark_removed() {
  let folder = await PlacesUtils.bookmarks.insert({
    parentGuid: PlacesUtils.bookmarks.toolbarGuid,
    type: PlacesUtils.bookmarks.TYPE_FOLDER,
    title: "Test folder",
  });
  let bookmark = await PlacesUtils.bookmarks.insert({
    parentGuid: folder.guid,
    url: "https://example.com/1",
    title: "Example",
  });

  Assert.ok(!(await PlacesToolbarHelper.getIsEmpty()), "Toolbar is not empty");

  let folderNode = findToolbarChild(folder.guid);
  Assert.ok(folderNode, "Folder is on the toolbar");

  // Open the folder popup while it contains one bookmark; the Share Folder
  // menuitem should be present.
  let popup = await openFolderPopup(folderNode);
  Assert.ok(
    getShareFolderItem(popup),
    "Share Folder menuitem present while folder has a bookmark"
  );
  Assert.ok(
    !popup.hasAttribute("emptyplacesresult"),
    "Popup is not in empty state"
  );

  // Move the bookmark out of the folder while the popup is open. This
  // exercises the nodeRemoved path with the popup live - previously this
  // left the popup with the Share Folder menuitem still after _endMarker,
  // which suppressed the empty placeholder and made the next open silently
  // fail.
  await PlacesUtils.bookmarks.update({
    guid: bookmark.guid,
    parentGuid: PlacesUtils.bookmarks.toolbarGuid,
    index: PlacesUtils.bookmarks.DEFAULT_INDEX,
  });

  Assert.ok(
    !getShareFolderItem(popup),
    "Share Folder menuitem removed once folder is empty"
  );
  Assert.ok(
    popup.hasAttribute("emptyplacesresult"),
    "Popup is now in empty state"
  );

  await closePopup(popup);

  // Re-open the folder popup. The regression: before the fix this
  // popupshown event would never fire because the popup contained only
  // its hidden marker menuseparators.
  let popup2 = await openFolderPopup(folderNode);
  Assert.equal(popup2, popup, "Same popup element is reused");
  Assert.ok(
    popup2.hasAttribute("emptyplacesresult"),
    "Empty placeholder is shown on re-open"
  );
  Assert.ok(
    !getShareFolderItem(popup2),
    "Share Folder menuitem stays absent on re-open"
  );

  await closePopup(popup2);
});
