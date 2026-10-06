/* Any copyright is dedicated to the Public Domain.
  http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);
const BASE = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  // eslint-disable-next-line @microsoft/sdl/no-insecure-url
  "http://example.com"
);
const TEST_URL = BASE + "file_shareurl.html";

let shareUrlSpy = sinon.spy();

SharingUtils.testOnlyMockUIUtils({
  shareUrl(url, title) {
    shareUrlSpy(url, title);
  },
  QueryInterface: ChromeUtils.generateQI([Ci.nsIWindowsUIUtils]),
});

registerCleanupFunction(function () {
  SharingUtils.testOnlyMockUIUtils(null);
});

/**
 * Test the "Share" submenu in the File menu on Windows.
 * Verifies Copy Link and "Share with Windows" items.
 */
add_task(async function test_file_menu_share() {
  await BrowserTestUtils.withNewTab(TEST_URL, async () => {
    let menu = document.getElementById("menu_FilePopup");
    await simulateMenuOpen(menu);

    await BrowserTestUtils.waitForMutationCondition(
      menu,
      { childList: true },
      () => menu.querySelector(".share-tab-url-item")
    );
    ok(true, "Got Share item");

    let popup = menu.querySelector(".share-tab-url-item").menupopup;
    await simulateMenuOpen(popup);

    info("Test the Copy Link item");
    let copyLinkItem = popup.querySelector(".share-copy-link");
    ok(copyLinkItem, "Copy Link item exists");
    await SimpleTest.promiseClipboardChange(TEST_URL, () =>
      copyLinkItem.doCommand()
    );
    await simulateMenuClosed(popup);
    await simulateMenuClosed(menu);

    info("Test the Share with Windows item");
    await simulateMenuOpen(menu);
    popup = menu.querySelector(".share-tab-url-item").menupopup;
    await simulateMenuOpen(popup);

    let winShareItem = popup.querySelector(".share-windows-item");
    ok(winShareItem, "Share with Windows item exists");
    winShareItem.doCommand();
    ok(shareUrlSpy.calledOnce, "shareUrl called");

    let [url, title] = shareUrlSpy.getCall(0).args;
    is(url, TEST_URL, "Shared correct URL");
    is(title, "Sharing URL", "Shared the correct title.");
    shareUrlSpy.resetHistory();
    await simulateMenuClosed(popup);
    await simulateMenuClosed(menu);
  });
});
