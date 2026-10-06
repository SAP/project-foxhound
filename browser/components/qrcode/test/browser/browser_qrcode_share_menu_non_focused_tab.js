/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_URL = "https://example.com/test";

async function openTabContextMenu(tab) {
  let contextMenu = document.getElementById("tabContextMenu");
  let shown = BrowserTestUtils.waitForPopupEvent(contextMenu, "shown");
  EventUtils.synthesizeMouseAtCenter(tab, { type: "contextmenu" });
  await shown;
  return contextMenu;
}

async function openShareSubmenu(contextMenu) {
  let shareItem = contextMenu.querySelector(".share-tab-url-item");
  Assert.ok(shareItem, "Share menu item should exist in tab context menu");
  shareItem.openMenu(true);
  await BrowserTestUtils.waitForPopupEvent(shareItem.menupopup, "shown");
  return shareItem.menupopup;
}

add_task(async function test_qrcode_focuses_context_tab() {
  let tab1 = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);
  let tab2 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:blank"
  );

  Assert.equal(gBrowser.selectedTab, tab2, "tab2 starts as the selected tab");

  let dialogBox = gBrowser.getTabDialogBox(tab1.linkedBrowser);
  let dialogManager = dialogBox.getTabDialogManager();

  let contextMenu = await openTabContextMenu(tab1);
  let shareSubmenu = await openShareSubmenu(contextMenu);

  let qrCodeItem = shareSubmenu.querySelector(".share-qrcode-item");
  Assert.ok(qrCodeItem, "QR Code menu item should exist in Share submenu");
  Assert.ok(!qrCodeItem.disabled, "QR Code menu item should be enabled");

  let dialogOpened = BrowserTestUtils.waitForEvent(
    dialogManager._dialogStack,
    "dialogopen"
  );
  let popupHidden = BrowserTestUtils.waitForPopupEvent(contextMenu, "hidden");
  qrCodeItem.doCommand();
  contextMenu.hidePopup();
  await popupHidden;

  Assert.equal(
    gBrowser.selectedTab,
    tab1,
    "The right-clicked tab should become selected immediately after Generate QR Code"
  );

  let {
    detail: { dialog },
  } = await dialogOpened;
  await dialog._dialogReady;

  let dialogDoc = dialog._frame.contentDocument;
  Assert.equal(
    dialogDoc.documentElement.id,
    "qrcode-dialog",
    "QR code dialog should open"
  );

  let urlDisplay = dialogDoc.getElementById("qrcode-url");
  Assert.equal(
    urlDisplay.textContent,
    TEST_URL,
    "Dialog should show the right-clicked tab's URL"
  );

  dialog._frame.contentWindow.close();
  BrowserTestUtils.removeTab(tab2);
  BrowserTestUtils.removeTab(tab1);
});

add_task(async function test_qrcode_unloaded_tab() {
  let tab1 = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);
  let tab2 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:blank"
  );

  let waitForDiscarded = BrowserTestUtils.waitForEvent(
    tab1,
    "TabBrowserDiscarded"
  );
  Assert.ok(gBrowser.discardBrowser(tab1), "tab1 should discard");
  await waitForDiscarded;
  Assert.ok(!tab1.linkedPanel, "tab1 is now lazy/unloaded");

  let contextMenu = await openTabContextMenu(tab1);
  let shareSubmenu = await openShareSubmenu(contextMenu);
  let qrCodeItem = shareSubmenu.querySelector(".share-qrcode-item");

  let popupHidden = BrowserTestUtils.waitForPopupEvent(contextMenu, "hidden");
  qrCodeItem.doCommand();
  contextMenu.hidePopup();
  await popupHidden;

  let dialogManager = gBrowser
    .getTabDialogBox(tab1.linkedBrowser)
    .getTabDialogManager();

  await TestUtils.waitForCondition(
    () =>
      dialogManager._dialogs.length && !dialogManager._dialogs[0]._isClosing,
    "QR code dialog should open and stay open for the discarded tab"
  );

  let dialog = dialogManager._dialogs[0];
  await dialog._dialogReady;

  let urlDisplay = dialog._frame.contentDocument.getElementById("qrcode-url");
  Assert.equal(
    urlDisplay.textContent,
    TEST_URL,
    "Dialog should show the discarded tab's URL"
  );

  dialog._frame.contentWindow.close();
  BrowserTestUtils.removeTab(tab2);
  BrowserTestUtils.removeTab(tab1);
});
