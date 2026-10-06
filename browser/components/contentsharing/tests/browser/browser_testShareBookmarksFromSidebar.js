/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/* globals withSidebarTree, synthesizeClickOnSelectedTreeCell */

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/browser/components/places/tests/browser/head.js",
  this
);

add_setup(function () {
  registerCleanupFunction(async () => {
    await PlacesUtils.bookmarks.eraseEverything();
  });
});

add_task(async function test_shareBookmarkFolderFromSidebar() {
  await withContentSharingMockServer(async server => {
    const folder = await createFolderWithBookmarks("test folder");
    await withSidebarTree("bookmarks", async tree => {
      tree.selectItems([folder.guid]);

      const sidebarDoc = SidebarController.browser.contentDocument;
      const contextMenu = sidebarDoc.getElementById("placesContext");
      let popupShown = BrowserTestUtils.waitForEvent(contextMenu, "popupshown");
      await synthesizeClickOnSelectedTreeCell(tree, { type: "contextmenu" });
      await popupShown;

      const menuitem = sidebarDoc.getElementById("contentsharing_sharefolder");
      Assert.ok(
        BrowserTestUtils.isVisible(menuitem),
        "Share folder menu item is visible in the sidebar context menu"
      );

      let popupHidden = BrowserTestUtils.waitForEvent(
        contextMenu,
        "popuphidden"
      );
      contextMenu.activateItem(menuitem);
      await popupHidden;

      await TestUtils.waitForCondition(
        () => window.gDialogBox.isOpen,
        "Content sharing modal should open after activating share menu item"
      );
      await TestUtils.waitForCondition(
        () => server.requests.length === 1,
        "Mock server should receive exactly one share request"
      );
      const body = server.requests[0].body;
      await assertContentSharingModal(window, {
        share: body,
        error: null,
        warning: null,
        url: server.mockResponse.url,
        isSchemaValid: true,
        isSignedIn: true,
      });
      Assert.equal(body.type, "bookmarks", "Share type is 'bookmarks'");
      Assert.equal(body.links.length, 5, "Share contains 5 links");
    });
  });
  await PlacesUtils.bookmarks.eraseEverything();
});
