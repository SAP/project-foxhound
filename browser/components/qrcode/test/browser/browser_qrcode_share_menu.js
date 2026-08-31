/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_URL = "https://example.com/test";

async function openShareMenuAndGetQRItem(window, { expectQRCode = true } = {}) {
  info("Opening the File menu to populate the Share submenu");

  let fileMenuPopup = window.document.getElementById("menu_FilePopup");
  Assert.ok(fileMenuPopup, "File menu popup should exist");

  fileMenuPopup.dispatchEvent(
    new MouseEvent("popupshowing", { bubbles: true })
  );

  let shareMenuItem = fileMenuPopup.querySelector(".share-tab-url-item");
  Assert.ok(shareMenuItem, "Share menu item should exist in File menu");

  let shareSubmenu = shareMenuItem.menupopup;
  Assert.ok(shareSubmenu, "Share submenu should exist");

  shareSubmenu.dispatchEvent(new MouseEvent("popupshowing", { bubbles: true }));

  let qrCodeItem = shareSubmenu.querySelector(".share-qrcode-item");
  if (expectQRCode) {
    Assert.ok(qrCodeItem, "QR Code menu item should exist in Share submenu");
  }

  return { fileMenuPopup, shareSubmenu, qrCodeItem };
}

add_task(async function test_qrcode_share_menu() {
  await BrowserTestUtils.withNewTab(TEST_URL, async _browser => {
    let { qrCodeItem } = await openShareMenuAndGetQRItem(window);

    Assert.ok(
      !qrCodeItem.disabled,
      "QR Code menu item should be enabled for shareable URL"
    );
    Assert.equal(
      qrCodeItem.getAttribute("data-l10n-id"),
      "menu-file-share-qrcode",
      "QR Code menu item should have correct localization ID"
    );
  });
});

add_task(async function test_qrcode_dialog_opens() {
  await BrowserTestUtils.withNewTab(TEST_URL, async browser => {
    info("Testing QR code dialog opening");
    Services.fog.testResetFOG();

    let dialogBox = gBrowser.getTabDialogBox(browser);
    let dialogManager = dialogBox.getTabDialogManager();

    let { qrCodeItem } = await openShareMenuAndGetQRItem(window);

    info("Clicking QR code menu item");
    qrCodeItem.doCommand();

    info("Waiting for subdialog to appear");
    await BrowserTestUtils.waitForCondition(
      () => dialogManager._dialogs.length,
      "Waiting for QR code subdialog"
    );

    let dialog = dialogManager._dialogs[0];
    await dialog._dialogReady;

    Assert.equal(
      Glean.qrcode.opened.testGetValue(),
      1,
      "Opening the QR code dialog should record telemetry"
    );

    let dialogDoc = dialog._frame.contentDocument;

    Assert.equal(
      dialogDoc.documentElement.id,
      "qrcode-dialog",
      "Should open QR code dialog"
    );

    await BrowserTestUtils.waitForCondition(
      () => !dialogDoc.getElementById("success-container").hidden,
      "Waiting for QR code to be displayed"
    );

    let qrImage = dialogDoc.getElementById("qrcode-image");
    Assert.ok(qrImage, "QR code image element should exist");
    Assert.equal(qrImage.localName, "img", "QR code should render in an img");
    Assert.ok(qrImage.src, "QR code image should have a src");

    let urlDisplay = dialogDoc.getElementById("qrcode-url");
    Assert.ok(urlDisplay, "URL display element should exist");
    Assert.equal(
      urlDisplay.textContent,
      TEST_URL,
      "URL should be displayed correctly"
    );

    // Force the dialog into RTL and confirm the URL still resolves to LTR, so
    // its scheme, separators and path aren't reordered (bug 2044674).
    let dialogWin = dialogDoc.defaultView;
    dialogDoc.documentElement.setAttribute("dir", "rtl");
    Assert.equal(
      dialogWin.getComputedStyle(urlDisplay).direction,
      "ltr",
      "URL element should compute as LTR even when the dialog is RTL"
    );
    dialogDoc.documentElement.removeAttribute("dir");

    Assert.ok(
      dialogDoc.getElementById("copy-button"),
      "Copy button should exist"
    );
    Assert.ok(
      dialogDoc.getElementById("save-button"),
      "Save button should exist"
    );
    Assert.ok(
      dialogDoc.getElementById("close-button"),
      "Close button should exist"
    );

    dialog._frame.contentWindow.close();
    info("Dialog test completed");
  });
});

add_task(async function test_qrcode_enter_triggers_copy() {
  await BrowserTestUtils.withNewTab(TEST_URL, async browser => {
    info("Testing that Enter copies the QR code");

    let dialogBox = gBrowser.getTabDialogBox(browser);
    let dialogManager = dialogBox.getTabDialogManager();

    let { qrCodeItem } = await openShareMenuAndGetQRItem(window);
    qrCodeItem.doCommand();

    await BrowserTestUtils.waitForCondition(
      () => dialogManager._dialogs.length,
      "Waiting for QR code subdialog"
    );

    let dialog = dialogManager._dialogs[0];
    await dialog._dialogReady;

    let dialogDoc = dialog._frame.contentDocument;
    let dialogWin = dialog._frame.contentWindow;

    await BrowserTestUtils.waitForCondition(
      () => !dialogDoc.getElementById("success-container").hidden,
      "Waiting for QR code to be displayed"
    );

    await BrowserTestUtils.waitForCondition(
      () => dialogDoc.activeElement?.id === "copy-button",
      "Copy button should be focused on open so native Enter copies"
    );

    let copyCount = 0;
    dialogWin.QRCodeDialog.copyImage = () => {
      copyCount++;
    };

    let pressEnter = target =>
      target.dispatchEvent(
        new dialogWin.KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        })
      );

    info("Enter with no button focused (the macOS case) should copy");
    pressEnter(dialogDoc.getElementById("qrcode-url"));
    Assert.equal(copyCount, 1, "Enter should trigger copy");

    info("Enter on a focused button should defer to its native action");
    pressEnter(dialogDoc.getElementById("save-button"));
    pressEnter(dialogDoc.getElementById("copy-button"));
    pressEnter(dialogDoc.getElementById("close-button"));
    Assert.equal(copyCount, 1, "Enter on a button should not trigger copy");

    dialogWin.close();
  });
});

add_task(async function test_qrcode_disabled_for_non_shareable_urls() {
  await BrowserTestUtils.withNewTab("about:blank", async _browser => {
    info("Testing QR code disabled for non-shareable URLs");

    let { qrCodeItem } = await openShareMenuAndGetQRItem(window);

    Assert.ok(
      qrCodeItem.disabled,
      "QR Code menu item should be disabled for about:blank"
    );
  });
});

add_task(async function test_qrcode_dialog_shows_error_on_generation_failure() {
  await BrowserTestUtils.withNewTab(TEST_URL, async browser => {
    info("Testing QR code dialog error state");

    let dialogBox = gBrowser.getTabDialogBox(browser);
    let dialogManager = dialogBox.getTabDialogManager();

    // Open the dialog directly with null qrCodeDataURI to simulate failure.
    dialogBox.open(
      "chrome://browser/content/qrcode/qrcode-dialog.html",
      { features: "resizable=no", allowDuplicateDialogs: false },
      { url: TEST_URL, qrCodeDataURI: null }
    );

    await BrowserTestUtils.waitForCondition(
      () => dialogManager._dialogs.length,
      "Waiting for QR code subdialog"
    );

    let dialog = dialogManager._dialogs[0];
    await dialog._dialogReady;

    let dialogDoc = dialog._frame.contentDocument;

    Assert.ok(
      dialogDoc.getElementById("success-container").hidden,
      "Success container should be hidden on error"
    );

    let feedbackBar = dialogDoc.getElementById("feedback-bar");
    Assert.ok(feedbackBar, "Error message bar should be present");
    Assert.equal(feedbackBar.type, "error", "Message bar should be error type");
    Assert.equal(
      feedbackBar.getAttribute("data-l10n-id"),
      "qrcode-panel-error",
      "Message bar should have correct localization ID"
    );

    dialog._frame.contentWindow.close();
    info("Error state test completed");
  });
});

add_task(async function test_qrcode_disabled_for_multiselect_tabs() {
  let tab1 = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);
  let tab2 = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);

  gBrowser.addToMultiSelectedTabs(tab1);
  gBrowser.addToMultiSelectedTabs(tab2);

  try {
    Assert.equal(
      gBrowser.selectedTabs.length,
      2,
      "Two tabs should be selected"
    );

    let { qrCodeItem } = await openShareMenuAndGetQRItem(window);
    Assert.ok(
      qrCodeItem.disabled,
      "QR Code menu item should be disabled when multiple tabs are selected"
    );
  } finally {
    gBrowser.clearMultiSelectedTabs();
    BrowserTestUtils.removeTab(tab1);
    BrowserTestUtils.removeTab(tab2);
  }
});

add_task(
  // The address bar Share context menu item is only built on macOS.
  { skip_if: () => AppConstants.platform != "macosx" },
  async function test_qrcode_disabled_for_multiselect_tabs_urlbar() {
    let tab1 = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);
    let tab2 = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);

    gBrowser.addToMultiSelectedTabs(tab1);
    gBrowser.addToMultiSelectedTabs(tab2);

    try {
      Assert.equal(
        gBrowser.selectedTabs.length,
        2,
        "Two tabs should be selected"
      );

      let contextMenu = gURLBar.querySelector("moz-input-box").menupopup;
      contextMenu.dispatchEvent(
        new MouseEvent("popupshowing", { bubbles: true })
      );

      let shareItem = contextMenu.querySelector(".share-tab-url-item");
      Assert.ok(
        shareItem,
        "Share menu item should exist in urlbar context menu"
      );

      shareItem.menupopup.dispatchEvent(
        new MouseEvent("popupshowing", { bubbles: true })
      );

      let qrCodeItem = shareItem.menupopup.querySelector(".share-qrcode-item");
      Assert.ok(qrCodeItem, "QR Code menu item should exist in Share submenu");
      Assert.ok(
        qrCodeItem.disabled,
        "QR Code menu item should be disabled when multiple tabs are selected"
      );
    } finally {
      gBrowser.clearMultiSelectedTabs();
      BrowserTestUtils.removeTab(tab1);
      BrowserTestUtils.removeTab(tab2);
    }
  }
);

add_task(async function test_qrcode_hidden_when_pref_disabled() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.shareqrcode.enabled", false]],
  });

  await BrowserTestUtils.withNewTab(TEST_URL, async _browser => {
    let { shareSubmenu } = await openShareMenuAndGetQRItem(window, {
      expectQRCode: false,
    });
    Assert.ok(
      !shareSubmenu.querySelector(".share-qrcode-item"),
      "QR code item should be hidden when the pref is disabled"
    );
  });
});
